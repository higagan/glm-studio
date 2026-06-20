# GLM Workspace — Data Model

> PostgreSQL schemas for a production AI workspace.
> Structured data in Postgres. File blobs in object storage.

---

## 1. Entities

```
                    ┌──────────┐
                    │  users   │
                    └────┬─────┘
                         │ 1
                    ┌────▼──────────┐
                    │  workspaces   │
                    └────┬──────────┘
                         │ 1
              ┌──────────┼──────────────┐
              │ 1        │ 1            │ 1
        ┌─────▼─────┐ ┌──▼──────┐  ┌───▼────────┐
        │conversations│ │artifacts│  │ gen_jobs   │
        └─────┬─────┘ └──┬──────┘  └───┬────────┘
              │ 1        │ N           │ N
        ┌─────▼─────┐    │          ┌──▼──────────┐
        │ messages  │────┘          │ audit_logs  │
        └─────┬─────┘               └─────────────┘
              │ 1
        ┌─────▼─────┐
        │attachments│
        └─────┬─────┘
              │ 1
        ┌─────▼──────────┐
        │document_content│
        └────────────────┘
```

**Relationship summary:**

| Parent | Child | Cardinality |
|---|---|---|
| users | workspaces | 1 to many |
| workspaces | conversations | 1 to many |
| workspaces | artifacts | 1 to many (artifacts can exist standalone) |
| workspaces | gen_jobs | 1 to many |
| conversations | messages | 1 to many (cascade delete) |
| messages | attachments | 1 to many (cascade delete) |
| attachments | document_content | 1 to 1 (cascade delete) |
| messages | artifacts | 1 to many (artifacts linked to source message) |
| artifacts | artifacts | 1 to many (iterations: parent → versions) |
| users | audit_logs | 1 to many |
| workspaces | audit_logs | 1 to many |

---

## 2. Field Definitions

### 2.1 `users`

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT UNIQUE NOT NULL,
    name            TEXT NOT NULL,
    password_hash   TEXT,                          -- NULL if OAuth-only
    oauth_provider  TEXT,                          -- 'google', 'github', NULL
    oauth_subject   TEXT,                          -- provider-specific ID
    avatar_url      TEXT,
    role            user_role NOT NULL DEFAULT 'member',
    preferences     JSONB NOT NULL DEFAULT '{}',   -- theme, font_size, etc.
    token_budget    INTEGER NOT NULL DEFAULT 100000, -- monthly token budget
    tokens_used     INTEGER NOT NULL DEFAULT 0,    -- current month usage
    last_active_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**`preferences` JSONB shape:**
```json
{
  "theme": "light" | "dark" | "system",
  "font_size": "small" | "medium" | "large",
  "send_on_enter": true,
  "default_model": "glm-5.2:cloud",
  "artifact_auto_open": true
}
```

---

### 2.2 `workspaces`

A workspace is a project space. Each user has at least one (default). Workspaces group conversations, artifacts, and files together.

```sql
CREATE TABLE workspaces (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL DEFAULT 'Default',
    description     TEXT,
    color           TEXT DEFAULT '#d97757',        -- workspace accent color
    icon            TEXT,                            -- emoji or icon name
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    settings        JSONB NOT NULL DEFAULT '{}',     -- workspace-level config
    storage_used    BIGINT NOT NULL DEFAULT 0,      -- bytes used by files
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**`settings` JSONB shape:**
```json
{
  "default_model": "glm-5.2:cloud",
  "system_prompt_override": null,
  "max_file_size_mb": 10,
  "auto_delete_conversations_days": null,
  "artifact_auto_open": true
}
```

---

### 2.3 `conversations`

```sql
CREATE TABLE conversations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title           TEXT NOT NULL DEFAULT 'New Chat',
    title_source    title_source NOT NULL DEFAULT 'auto',  -- auto or manual
    summary         TEXT,                                  -- auto-generated for long convos
    message_count   INTEGER NOT NULL DEFAULT 0,
    token_count     INTEGER NOT NULL DEFAULT 0,            -- cumulative tokens
    is_pinned       BOOLEAN NOT NULL DEFAULT FALSE,
    is_archived     BOOLEAN NOT NULL DEFAULT FALSE,
    last_message_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 2.4 `messages`

```sql
CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            message_role NOT NULL,               -- user, assistant, system
    content         TEXT NOT NULL DEFAULT '',             -- display content (markdown/text)
    api_content     TEXT,                                  -- content sent to model (includes file text)
    model_name      TEXT,                                 -- which model generated this (assistant only)
    tokens_in       INTEGER,                              -- input tokens consumed
    tokens_out      INTEGER,                              -- output tokens generated
    generation_ms   INTEGER,                              -- time to generate (ms)
    is_edited       BOOLEAN NOT NULL DEFAULT FALSE,
    parent_message_id UUID REFERENCES messages(id) ON DELETE SET NULL, -- for edit/regenerate chains
    status          message_status NOT NULL DEFAULT 'complete',
    error_code      TEXT,                                 -- if status = 'error'
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Why `content` vs `api_content`:**
- `content` — what the user sees in the UI (clean text, no file dumps).
- `api_content` — what gets sent to the model (includes injected file content, system instructions). This is what makes context reproducible.

---

### 2.5 `attachments`

```sql
CREATE TABLE attachments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id      UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    filename        TEXT NOT NULL,                       -- original filename
    mime_type       TEXT NOT NULL,                       -- validated server-side
    file_extension  TEXT NOT NULL,                       -- '.py', '.csv', etc.
    size_bytes      BIGINT NOT NULL,
    storage_key     TEXT NOT NULL,                       -- object storage path: uploads/{workspace_id}/{id}/{filename}
    storage_backend TEXT NOT NULL DEFAULT 'minio',      -- 'minio', 's3', 'local'
    checksum_sha256 TEXT,                                -- for dedup + integrity
    is_image        BOOLEAN NOT NULL DEFAULT FALSE,
    parse_status    parse_status NOT NULL DEFAULT 'pending',
    parse_error     TEXT,
    parsed_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 2.6 `document_content`

Stores the extracted/parsed content of an attachment. One-to-one with `attachments`.

```sql
CREATE TABLE document_content (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attachment_id   UUID NOT NULL UNIQUE REFERENCES attachments(id) ON DELETE CASCADE,
    content_type    content_type NOT NULL,               -- text, structured, image_ref, unsupported
    raw_text        TEXT,                                 -- full extracted text (if < 1MB)
    text_encoding   TEXT DEFAULT 'utf-8',
    text_char_count INTEGER,
    language        TEXT,                                 -- detected language code ('en', 'es')
    is_chunked      BOOLEAN NOT NULL DEFAULT FALSE,
    chunk_count     INTEGER NOT NULL DEFAULT 0,
    structure       JSONB,                                -- extracted structure (headings, tables, metadata)
    metadata        JSONB NOT NULL DEFAULT '{}',         -- file-specific metadata
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**`structure` JSONB examples by file type:**

```json
// PDF / DOCX
{
  "headings": ["Introduction", "Methodology", "Results"],
  "page_count": 12,
  "has_tables": true,
  "has_images": true
}

// CSV
{
  "columns": ["name", "age", "department"],
  "row_count": 1543,
  "delimiter": ",",
  "has_header": true
}

// JSON
{
  "top_level_keys": ["users", "settings", "metadata"],
  "depth": 4,
  "array_lengths": { "users": 100 }
}

// Code file
{
  "language": "python",
  "line_count": 245,
  "functions": ["main", "process_data", "validate"],
  "imports": ["os", "sys", "pandas"]
}
```

**`metadata` JSONB examples:**
```json
// PDF
{ "author": "Jane Doe", "title": "Q3 Report", "created": "2024-01-15" }

// Image
{ "width": 1920, "height": 1080, "format": "png", "has_alpha": true }

// Spreadsheet
{ "sheet_names": ["Sheet1", "Sheet2"], "formulas_count": 15 }
```

---

### 2.7 `file_chunks`

For large documents that exceed context limits. Each chunk is a searchable segment.

```sql
CREATE TABLE file_chunks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attachment_id   UUID NOT NULL REFERENCES attachments(id) ON DELETE CASCADE,
    chunk_index     INTEGER NOT NULL,                    -- 0, 1, 2, ...
    content         TEXT NOT NULL,                       -- chunk text
    char_count      INTEGER NOT NULL,
    token_estimate  INTEGER NOT NULL,
    embedding       vector(768),                          -- pgvector, for semantic search
    section_heading TEXT,                                -- heading this chunk falls under
    page_number     INTEGER,                             -- for PDFs
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(attachment_id, chunk_index)
);
```

**Note:** Requires `pgvector` extension. `embedding` is nullable until the embedding worker processes it.

---

### 2.8 `artifacts`

```sql
CREATE TABLE artifacts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    message_id      UUID REFERENCES messages(id) ON DELETE SET NULL,
    parent_artifact_id UUID REFERENCES artifacts(id) ON DELETE SET NULL, -- iteration chain
    type            artifact_type NOT NULL,              -- code, document, table, chart, report, slide_deck, spreadsheet
    title           TEXT NOT NULL DEFAULT 'Untitled',
    language        TEXT,                                 -- for code artifacts: 'python', 'javascript'
    content         JSONB NOT NULL,                       -- raw content (see shapes below)
    render_hints    JSONB NOT NULL DEFAULT '{}',          -- rendering instructions for frontend
    metadata        JSONB NOT NULL DEFAULT '{}',          -- type-specific metadata
    version         INTEGER NOT NULL DEFAULT 1,
    is_latest       BOOLEAN NOT NULL DEFAULT TRUE,        -- false if superseded by a newer version
    export_formats  TEXT[] NOT NULL DEFAULT '{}',        -- ['pdf','html','md','csv','png']
    storage_key     TEXT,                                 -- if exported file exists in object storage
    status          artifact_status NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**`content` JSONB shapes by type:**

```json
// type: "code"
{
  "code": "def hello():\n    print('world')",
  "line_count": 2
}

// type: "document" or "report"
{
  "markdown": "# Q3 Report\n\n## Summary\n\n...",
  "word_count": 1250,
  "headings": ["Summary", "Findings", "Recommendations"]
}

// type: "table"
{
  "columns": [
    { "name": "product", "type": "text" },
    { "name": "revenue", "type": "number" },
    { "name": "growth", "type": "percent" }
  ],
  "rows": [
    { "product": "Widget A", "revenue": 45000, "growth": 0.12 },
    { "product": "Widget B", "revenue": 38000, "growth": -0.05 }
  ],
  "row_count": 2
}

// type: "chart"
{
  "chart_type": "bar",
  "title": "Revenue by Product",
  "data": {
    "labels": ["Widget A", "Widget B", "Widget C"],
    "datasets": [
      { "label": "Revenue", "data": [45000, 38000, 22000] }
    ]
  },
  "options": {
    "responsive": true,
    "scales": { "y": { "beginAtZero": true } }
  }
}

// type: "slide_deck"
{
  "slides": [
    { "layout": "title", "title": "Q3 Review", "subtitle": "2024" },
    { "layout": "bullets", "title": "Highlights", "bullets": ["+15% revenue", "3 new clients"] },
    { "layout": "split", "title": "Comparison", "left": "2023", "right": "2024" }
  ],
  "slide_count": 3
}

// type: "spreadsheet"
{
  "sheets": [
    {
      "name": "Sheet1",
      "cells": {
        "A1": { "value": "Product", "type": "text" },
        "B1": { "value": "Revenue", "type": "text" },
        "A2": { "value": "Widget A", "type": "text" },
        "B2": { "value": 45000, "type": "number", "format": "currency" }
      },
      "max_row": 10,
      "max_col": 5
    }
  ]
}
```

---

### 2.9 `rendering_hints`

Standalone table that tells the frontend how to render a specific artifact or message section. Decouples rendering logic from content storage.

```sql
CREATE TABLE rendering_hints (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artifact_id     UUID REFERENCES artifacts(id) ON DELETE CASCADE,
    message_id      UUID REFERENCES messages(id) ON DELETE CASCADE,
    hint_type       hint_type NOT NULL,                  -- display_mode, syntax_theme, table_options, chart_options, page_layout
    target_selector TEXT,                                -- CSS selector or section ID within the content
    options         JSONB NOT NULL DEFAULT '{}',          -- rendering options
    priority        INTEGER NOT NULL DEFAULT 0,           -- higher = applied first
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (artifact_id IS NOT NULL OR message_id IS NOT NULL)
);
```

**`options` JSONB examples by hint_type:**

```json
// hint_type: "display_mode"
{ "mode": "document", "reading_width": "680px", "font": "serif", "line_height": 1.8 }

// hint_type: "syntax_theme"
{ "theme": "github-light", "show_line_numbers": true, "max_height": "400px" }

// hint_type: "table_options"
{ "sortable": true, "filterable": true, "sticky_header": true, "zebra": true, "max_rows_inline": 15 }

// hint_type: "chart_options"
{ "color_palette": ["#d97757", "#6b6b6b", "#2d8a4e", "#c4850e"], "legend_position": "bottom", "animate": true }

// hint_type: "page_layout"
{ "page_size": "A4", "margins": "2cm", "header": "Q3 Report", "footer": "Page {n}" }
```

---

### 2.10 `gen_jobs`

Background jobs for file processing, exports, chart rendering, etc.

```sql
CREATE TABLE gen_jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_type        job_type NOT NULL,                    -- extract_text, export_pdf, export_csv, render_chart, embed_chunks, summarize_conversation
    status          job_status NOT NULL DEFAULT 'queued', -- queued, processing, complete, failed, cancelled
    priority        INTEGER NOT NULL DEFAULT 0,           -- 0=normal, 1=high, -1=low
    entity_type    TEXT NOT NULL,                         -- 'attachment', 'artifact', 'conversation'
    entity_id      UUID NOT NULL,                         -- FK to the entity (polymorphic)
    input_params    JSONB NOT NULL DEFAULT '{}',          -- job-specific parameters
    output_result   JSONB,                                -- result data (URLs, counts, etc.)
    output_storage_key TEXT,                               -- if job produced a file
    error_code      TEXT,
    error_message   TEXT,
    retry_count     INTEGER NOT NULL DEFAULT 0,
    max_retries     INTEGER NOT NULL DEFAULT 3,
    queued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    duration_ms     INTEGER,                               -- completed_at - started_at
    worker_id       TEXT,                                  -- which worker processed this
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**`input_params` JSONB examples:**

```json
// job_type: "extract_text"
{ "attachment_id": "uuid", "force_reparse": false }

// job_type: "export_pdf"
{ "artifact_id": "uuid", "format": "pdf", "page_size": "A4", "include_toc": true }

// job_type: "export_csv"
{ "artifact_id": "uuid", "delimiter": ",", "include_header": true }

// job_type: "render_chart"
{ "artifact_id": "uuid", "output_format": "png", "width": 1200, "height": 600, "dpi": 2 }

// job_type: "embed_chunks"
{ "attachment_id": "uuid", "model": "nomic-embed-text" }

// job_type: "summarize_conversation"
{ "conversation_id": "uuid", "max_tokens": 500 }
```

**`output_result` JSONB examples:**

```json
// export_pdf (complete)
{ "url": "presigned_url", "file_size": 245678, "page_count": 8, "expires_at": "2024-06-21T..." }

// extract_text (complete)
{ "char_count": 45230, "chunk_count": 23, "language": "en", "has_tables": true }

// render_chart (complete)
{ "url": "presigned_url", "width": 1200, "height": 600, "format": "png" }
```

---

### 2.11 `audit_logs`

Tracks all significant actions for debugging, compliance, and analytics.

```sql
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    workspace_id    UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    action          audit_action NOT NULL,               -- message_sent, file_uploaded, artifact_created, artifact_exported, conversation_deleted, etc.
    entity_type    TEXT,                                  -- 'conversation', 'message', 'artifact', 'attachment', 'job'
    entity_id      UUID,
    details        JSONB NOT NULL DEFAULT '{}',           -- action-specific context
    ip_address     INET,
    user_agent      TEXT,
    request_id     TEXT,                                  -- for tracing
    duration_ms    INTEGER,                               -- how long the action took
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**`details` JSONB examples:**

```json
// action: "message_sent"
{ "conversation_id": "uuid", "message_id": "uuid", "role": "user", "token_count": 150, "has_attachments": true }

// action: "file_uploaded"
{ "attachment_id": "uuid", "filename": "report.pdf", "size_bytes": 245678, "mime_type": "application/pdf" }

// action: "artifact_created"
{ "artifact_id": "uuid", "type": "report", "message_id": "uuid", "auto_detected": true }

// action: "artifact_exported"
{ "artifact_id": "uuid", "format": "pdf", "job_id": "uuid", "file_size": 245678 }

// action: "conversation_deleted"
{ "conversation_id": "uuid", "message_count": 45, "artifact_count": 3 }
```

---

## 3. Relationships (Full SQL)

```sql
-- Users → Workspaces
ALTER TABLE workspaces
    ADD CONSTRAINT fk_workspace_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Workspaces → Conversations
ALTER TABLE conversations
    ADD CONSTRAINT fk_conv_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- Conversations → Messages
ALTER TABLE messages
    ADD CONSTRAINT fk_msg_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

-- Messages → Attachments
ALTER TABLE attachments
    ADD CONSTRAINT fk_att_message FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE;

-- Attachments → Document Content (1:1)
ALTER TABLE document_content
    ADD CONSTRAINT fk_doc_attachment FOREIGN KEY (attachment_id) REFERENCES attachments(id) ON DELETE CASCADE;

-- Attachments → File Chunks (1:many)
ALTER TABLE file_chunks
    ADD CONSTRAINT fk_chunk_attachment FOREIGN KEY (attachment_id) REFERENCES attachments(id) ON DELETE CASCADE;

-- Workspaces → Artifacts
ALTER TABLE artifacts
    ADD CONSTRAINT fk_art_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- Conversations → Artifacts (optional link)
ALTER TABLE artifacts
    ADD CONSTRAINT fk_art_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL;

-- Messages → Artifacts (optional link, source message)
ALTER TABLE artifacts
    ADD CONSTRAINT fk_art_message FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE SET NULL;

-- Artifacts → Artifacts (self-reference for iterations)
ALTER TABLE artifacts
    ADD CONSTRAINT fk_art_parent FOREIGN KEY (parent_artifact_id) REFERENCES artifacts(id) ON DELETE SET NULL;

-- Artifacts → Rendering Hints
ALTER TABLE rendering_hints
    ADD CONSTRAINT fk_hint_artifact FOREIGN KEY (artifact_id) REFERENCES artifacts(id) ON DELETE CASCADE;

-- Messages → Rendering Hints
ALTER TABLE rendering_hints
    ADD CONSTRAINT fk_hint_message FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE;

-- Workspaces → Gen Jobs
ALTER TABLE gen_jobs
    ADD CONSTRAINT fk_job_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- Users → Gen Jobs
ALTER TABLE gen_jobs
    ADD CONSTRAINT fk_job_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Users → Audit Logs
ALTER TABLE audit_logs
    ADD CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Workspaces → Audit Logs
ALTER TABLE audit_logs
    ADD CONSTRAINT fk_audit_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL;
```

### Relationship diagram (text)

```
users (1) ──< workspaces (1) ──< conversations (1) ──< messages (1) ──< attachments (1) ──< document_content (1)
                                    │                      │
                                    │                      └──< artifacts (N)
                                    │                             └──< artifacts (iterations, self-ref)
                                    │                             └──< rendering_hints (N)
                                    │
                                    └──< artifacts (N) ──< rendering_hints (N)

workspaces (1) ──< gen_jobs (N)
workspaces (1) ──< audit_logs (N)
users (1) ──< gen_jobs (N)
users (1) ──< audit_logs (N)
attachments (1) ──< file_chunks (N)
```

---

## 4. Indexes

### Primary indexes (always create)

```sql
-- Users
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- Workspaces
CREATE INDEX idx_workspaces_user ON workspaces(user_id);
CREATE INDEX idx_workspaces_user_default ON workspaces(user_id) WHERE is_default = TRUE;

-- Conversations
CREATE INDEX idx_conversations_workspace ON conversations(workspace_id, updated_at DESC);
CREATE INDEX idx_conversations_pinned ON conversations(workspace_id, is_pinned, updated_at DESC) WHERE is_archived = FALSE;
CREATE INDEX idx_conversations_archived ON conversations(workspace_id, updated_at DESC) WHERE is_archived = TRUE;

-- Messages
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_conversation_role ON messages(conversation_id, role, created_at);
CREATE INDEX idx_messages_parent ON messages(parent_message_id) WHERE parent_message_id IS NOT NULL;
CREATE INDEX idx_messages_status ON messages(status) WHERE status != 'complete';

-- Attachments
CREATE INDEX idx_attachments_message ON attachments(message_id);
CREATE INDEX idx_attachments_workspace ON attachments(workspace_id, created_at DESC);
CREATE INDEX idx_attachments_parse_status ON attachments(parse_status) WHERE parse_status IN ('pending', 'processing');
CREATE INDEX idx_attachments_checksum ON attachments(checksum_sha256) WHERE checksum_sha256 IS NOT NULL;

-- Document Content
CREATE UNIQUE INDEX idx_doc_content_attachment ON document_content(attachment_id);
CREATE INDEX idx_doc_content_type ON document_content(content_type);

-- File Chunks
CREATE INDEX idx_chunks_attachment ON file_chunks(attachment_id, chunk_index);
CREATE INDEX idx_chunks_embedding ON file_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- Note: ivfflat index created after data is loaded. Use HNSW for larger datasets:
-- CREATE INDEX idx_chunks_embedding ON file_chunks USING hnsw (embedding vector_cosine_ops);

-- Artifacts
CREATE INDEX idx_artifacts_workspace ON artifacts(workspace_id, updated_at DESC);
CREATE INDEX idx_artifacts_conversation ON artifacts(conversation_id) WHERE conversation_id IS NOT NULL;
CREATE INDEX idx_artifacts_message ON artifacts(message_id) WHERE message_id IS NOT NULL;
CREATE INDEX idx_artifacts_parent ON artifacts(parent_artifact_id) WHERE parent_artifact_id IS NOT NULL;
CREATE INDEX idx_artifacts_latest ON artifacts(workspace_id, type, updated_at DESC) WHERE is_latest = TRUE AND status = 'active';
CREATE INDEX idx_artifacts_type ON artifacts(workspace_id, type);

-- Rendering Hints
CREATE INDEX idx_hints_artifact ON rendering_hints(artifact_id) WHERE artifact_id IS NOT NULL;
CREATE INDEX idx_hints_message ON rendering_hints(message_id) WHERE message_id IS NOT NULL;

-- Gen Jobs
CREATE INDEX idx_jobs_status ON gen_jobs(status, priority DESC, queued_at);
CREATE INDEX idx_jobs_entity ON gen_jobs(entity_type, entity_id);
CREATE INDEX idx_jobs_workspace ON gen_jobs(workspace_id, status, created_at DESC);
CREATE INDEX idx_jobs_user ON gen_jobs(user_id, status, created_at DESC);
CREATE INDEX idx_jobs_queued ON gen_jobs(queued_at) WHERE status = 'queued';

-- Audit Logs
CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_workspace ON audit_logs(workspace_id, created_at DESC);
CREATE INDEX idx_audit_action ON audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX idx_audit_request ON audit_logs(request_id) WHERE request_id IS NOT NULL;
```

### Full-text search indexes (phase 2)

```sql
-- Add tsvector column to messages for full-text search
ALTER TABLE messages ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(content, ''))
    ) STORED;

CREATE INDEX idx_messages_search ON messages USING gin(search_vector);

-- Add tsvector to conversations for title search
ALTER TABLE conversations ADD COLUMN title_search_vector tsvector
    GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(title, ''))
    ) STORED;

CREATE INDEX idx_conversations_search ON conversations USING gin(title_search_vector);
```

### JSONB indexes (for querying artifact content)

```sql
-- Query artifacts by type + content keys
CREATE INDEX idx_artifacts_content_gin ON artifacts USING gin(content);
CREATE INDEX idx_artifacts_metadata_gin ON artifacts USING gin(metadata);

-- Query rendering hints by options
CREATE INDEX idx_hints_options_gin ON rendering_hints USING gin(options);

-- Query gen jobs by input params
CREATE INDEX idx_jobs_input_gin ON gen_jobs USING gin(input_params);
```

---

## 5. Enums

```sql
-- User roles
CREATE TYPE user_role AS ENUM (
    'member',       -- default user
    'admin',        -- workspace admin
    'owner'         -- account owner
);

-- Message roles
CREATE TYPE message_role AS ENUM (
    'system',       -- system prompt
    'user',         -- user message
    'assistant'     -- AI response
);

-- Message status
CREATE TYPE message_status AS ENUM (
    'streaming',    -- currently generating
    'complete',     -- finished successfully
    'stopped',      -- user stopped generation
    'error',        -- generation failed
    'queued'        -- waiting to be sent (offline mode)
);

-- Title source
CREATE TYPE title_source AS ENUM (
    'auto',         -- auto-generated from first message
    'manual',       -- user renamed
    'model'         -- model suggested a title
);

-- Parse status (attachments)
CREATE TYPE parse_status AS ENUM (
    'pending',      -- uploaded, not yet processed
    'processing',   -- worker is extracting text
    'ready',        -- text extraction complete
    'failed',       -- extraction failed
    'unsupported'   -- file type not supported for text extraction
);

-- Content type (document_content)
CREATE TYPE content_type AS ENUM (
    'text',          -- plain text, code, markdown, csv, json
    'structured',    -- PDF, DOCX, XLSX (has structure metadata)
    'image_ref',     -- image file (no text, stored for vision)
    'unsupported'    -- binary/unknown, no extraction attempted
);

-- Artifact types
CREATE TYPE artifact_type AS ENUM (
    'code',          -- source code
    'document',      -- markdown document
    'report',        -- formatted report (markdown + styling)
    'table',         -- tabular data
    'chart',         -- chart visualization
    'slide_deck',    -- presentation slides
    'spreadsheet'    -- editable spreadsheet
);

-- Artifact status
CREATE TYPE artifact_status AS ENUM (
    'active',        -- current, visible in UI
    'archived',      -- hidden but not deleted
    'deleted',       -- soft-deleted
    'draft'          -- being edited, not yet finalized
);

-- Rendering hint types
CREATE TYPE hint_type AS ENUM (
    'display_mode',     -- how to display (document, code, table, chart)
    'syntax_theme',     -- code highlighting theme + options
    'table_options',   -- table rendering options (sort, filter, sticky)
    'chart_options',    -- chart rendering options (colors, legend, animation)
    'page_layout',      -- PDF/print page layout (margins, size, header/footer)
    'custom'            -- custom rendering hint (extensible)
);

-- Job types
CREATE TYPE job_type AS ENUM (
    'extract_text',           -- parse file → document_content
    'chunk_file',             -- split large text → file_chunks
    'embed_chunks',           -- generate embeddings for file_chunks
    'export_pdf',             -- artifact → PDF
    'export_csv',             -- table artifact → CSV
    'export_html',            -- artifact → standalone HTML
    'export_docx',            -- artifact → DOCX
    'render_chart',           -- chart artifact → PNG/SVG
    'summarize_conversation', -- long conversation → summary
    'generate_title',         -- conversation → auto title
    'detect_artifacts'        -- message → artifact detection
);

-- Job status
CREATE TYPE job_status AS ENUM (
    'queued',       -- in queue, waiting for worker
    'processing',   -- worker is executing
    'complete',     -- finished successfully
    'failed',       -- execution failed (after max retries)
    'cancelled'     -- user or system cancelled
);

-- Audit actions
CREATE TYPE audit_action AS ENUM (
    -- Conversation actions
    'conversation_created',
    'conversation_deleted',
    'conversation_renamed',
    'conversation_archived',
    'conversation_restored',
    'conversation_pinned',
    -- Message actions
    'message_sent',
    'message_stopped',
    'message_edited',
    'message_regenerated',
    'message_deleted',
    -- File actions
    'file_uploaded',
    'file_downloaded',
    'file_deleted',
    -- Artifact actions
    'artifact_created',
    'artifact_opened',
    'artifact_exported',
    'artifact_edited',
    'artifact_iterated',
    'artifact_deleted',
    -- Job actions
    'job_created',
    'job_cancelled',
    'job_failed',
    -- Auth actions
    'user_login',
    'user_logout',
    'user_signup',
    'workspace_created',
    'workspace_deleted'
);
```

---

## 6. Practical Notes

### Object storage mapping

| DB entity | Object storage | What's stored where |
|---|---|---|
| `attachments` | `uploads/{workspace_id}/{attachment_id}/{filename}` | Original file blob |
| `gen_jobs` (export) | `exports/{workspace_id}/{artifact_id}/{format}/{filename}` | Generated PDF/CSV/PNG |
| `gen_jobs` (chart) | `charts/{workspace_id}/{artifact_id}/{format}/{filename}` | Rendered chart image |

**Rule:** Postgres stores metadata + text content. Object storage stores binary blobs. Never store file bytes in Postgres.

### Partitioning strategy (at scale)

When `messages` exceeds ~10M rows:

```sql
-- Partition messages by conversation_id hash
CREATE TABLE messages (
    -- ... same fields ...
) PARTITION BY HASH (conversation_id);

CREATE TABLE messages_p0 PARTITION OF messages FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE messages_p1 PARTITION OF messages FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE messages_p2 PARTITION OF messages FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE messages_p3 PARTITION OF messages FOR VALUES WITH (MODULUS 4, REMAINDER 3);
```

When `audit_logs` exceeds ~50M rows, partition by month:

```sql
CREATE TABLE audit_logs (
    -- ... same fields ...
) PARTITION BY RANGE (created_at);

CREATE TABLE audit_logs_2024_06 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-06-01') TO ('2024-07-01');
```

### Soft deletes

- **Conversations:** `is_archived = TRUE` (restorable). Hard delete via cascade.
- **Artifacts:** `status = 'deleted'` (restorable). Hard delete via cascade when conversation is deleted.
- **Messages:** No soft delete. Deleted with conversation (cascade).
- **Audit logs:** Never deleted. Retention policy via partitioning (drop old partitions).

### Data retention

| Entity | Retention | Reason |
|---|---|---|
| conversations | Until user deletes | User data |
| messages | Until conversation deleted | Cascade |
| attachments | Until conversation deleted | Cascade |
| document_content | Until attachment deleted | Cascade |
| file_chunks | Until attachment deleted | Cascade |
| artifacts | Until workspace deleted | User data |
| gen_jobs | 30 days after completion | Debugging + analytics |
| audit_logs | 90 days (partition drop) | Compliance + debugging |
| object storage temp | 24 hours | Cleanup via lifecycle policy |
| object storage exports | 30 days | User can re-export |

### Migration-ready DDL

All tables use:
- `UUID PRIMARY KEY DEFAULT gen_random_uuid()` — no sequential IDs, safe for distributed systems.
- `TIMESTAMPTZ` for all timestamps — never use `TIMESTAMP` without timezone.
- `JSONB` for flexible fields — never use `JSON` (text-based, slower).
- `ON DELETE CASCADE` for child tables — no orphaned records.
- `ON DELETE SET NULL` for optional references — artifacts survive message deletion.
- `CHECK` constraints where business logic applies — e.g., rendering_hints must reference an artifact OR message.