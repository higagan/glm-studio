# GLM Workspace — System Architecture

> Production-ready full-stack architecture for a premium AI workspace.
> Chat to think. Artifacts to ship.

---

## 1. High-Level Architecture

```
                         ┌─────────────────────────────────────────────────────────┐
                         │                    CLIENT (Browser)                      │
                         │                                                         │
                         │   React/TS SPA  ·  Chat UI  ·  Artifact Panel  ·  Composer│
                         │   IndexedDB (conv cache, file blobs)  ·  SSE/WS stream   │
                         └──────────────────────┬──────────────────────────────────┘
                                                │  HTTPS (REST + SSE)
                                                │
                         ┌──────────────────────▼──────────────────────────────────┐
                         │                  API GATEWAY (FastAPI)                    │
                         │                                                         │
                         │   Auth middleware  ·  Rate limiter  ·  Request routing   │
                         │   SSE streaming  ·  File upload handling  ·  CORS         │
                         └──────┬───────────┬───────────┬───────────┬───────────────┘
                                │           │           │           │
                     ┌──────────▼──┐  ┌─────▼─────┐ ┌──▼──────┐ ┌──▼──────────────┐
                     │  Chat       │  │ Artifact  │ │ File    │ │ Conversation     │
                     │  Service    │  │ Service   │ │ Service │ │ Service         │
                     │             │  │           │ │         │ │                 │
                     │ Orchestrates│  │ Renders +  │ │ Uploads │ │ CRUD + search   │
                     │ model calls │  │ exports    │ │ chunks  │ │ on conversations│
                     │ streams SSE │  │ artifacts  │ │ files   │ │                 │
                     └──────┬──────┘  └─────┬─────┘ └──┬──────┘ └──┬──────────────┘
                            │               │          │            │
                     ┌──────▼───────────────▼──────────▼────────────▼──────────────┐
                     │                    DATA LAYER                               │
                     │                                                         │
                     │  PostgreSQL        │  Redis        │  Object Storage      │
                     │  (conversations,   │  (queue,       │  (S3/MinIO:         │
                     │   messages,        │   cache,       │   file uploads,    │
                     │   artifacts,       │   sessions)    │   generated PDFs,  │
                     │   users)           │                │   exports)          │
                     └──────────────────────────────┬─────────────────────────────┘
                                                     │
                     ┌───────────────────────────────▼─────────────────────────────┐
                     │                  BACKGROUND WORKERS                          │
                     │                                                             │
                     │  File Processor   │  PDF Generator  │  Chart Renderer      │
                     │  (extract text,   │  (WeasyPrint/    │  (server-side chart   │
                     │   chunk large     │   Puppeteer)     │   PNG/SVG export)     │
                     │   files)          │                  │                       │
                     └─────────────────────────────────────────────────────────────┘
                                                     │
                     ┌───────────────────────────────▼─────────────────────────────┐
                     │                  MODEL LAYER (Ollama)                        │
                     │                                                             │
                     │  glm-5.2:cloud  ·  embedding model  ·  tool execution       │
                     └─────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Single-page app frontend** — React + TypeScript. All rendering client-side. Server communicates via REST + SSE (Server-Sent Events) for streaming.
2. **Modular monolith backend** — One FastAPI process with clearly separated service modules (chat, artifact, file, conversation). Can be split into microservices later if needed, but start simple.
3. **Background workers for heavy lifting** — File processing, PDF generation, and chart rendering happen in background workers (via Redis queue). The API never blocks on these.
4. **Ollama as the model runtime** — All LLM calls go through Ollama's API. The backend orchestrates but doesn't run models directly.
5. **Object storage for files** — Uploaded files and generated artifacts (PDFs, exports) stored in S3-compatible storage (MinIO for self-hosted, S3 for cloud). Never in the database.
6. **PostgreSQL for structured data** — Conversations, messages, artifact metadata, users. JSONB columns for flexible message content.
7. **Redis for everything ephemeral** — Job queue, session cache, rate limiting, SSE pub/sub for multi-instance streaming.

---

## 2. Core Services

### 2.1 API Gateway (FastAPI)

**Responsibility:** Entry point for all client requests. Auth, rate limiting, routing, SSE streaming.

```
Client → API Gateway → { Chat Service, Artifact Service, File Service, Conversation Service }
```

**Key endpoints:**

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/chat` | Send message, returns SSE stream of tokens |
| POST | `/api/chat/stop` | Stop active generation |
| GET | `/api/conversations` | List conversations (paginated) |
| GET | `/api/conversations/:id` | Get full conversation with messages |
| DELETE | `/api/conversations/:id` | Delete conversation |
| PATCH | `/api/conversations/:id` | Rename conversation |
| POST | `/api/upload` | Upload file (multipart), returns file ID |
| GET | `/api/files/:id` | Download/retrieve file |
| POST | `/api/artifacts` | Create artifact from message content |
| GET | `/api/artifacts/:id` | Get artifact metadata + content |
| POST | `/api/artifacts/:id/export` | Export artifact as PDF/CSV/HTML (queues job) |
| GET | `/api/artifacts/:id/export/:jobId` | Poll export job status |
| GET | `/api/health` | Health check |

**SSE streaming format:**
```
event: token
data: {"content": "Hello"}

event: token
data: {"content": " world"}

event: artifact
data: {"type": "code", "language": "python", "messageId": "msg_123"}

event: done
data: {"messageId": "msg_456", "conversationId": "conv_789"}
```

**Why FastAPI:**
- Native async support for SSE streaming and concurrent model calls.
- Pydantic models for request/response validation.
- Automatic OpenAPI docs for frontend type generation.
- Python ecosystem (Ollama client, WeasyPrint, Pandas all Python-native).

### 2.2 Chat Service

**Responsibility:** Orchestrate model calls, manage streaming, inject context, detect artifacts.

**Flow:**
1. Receive message + conversation ID + optional file IDs from API gateway.
2. Load conversation history from PostgreSQL.
3. Load attached file content from object storage (or cache).
4. Build the message array: system prompt + history + current message (with file content injected).
5. Call Ollama `/api/chat` with `stream: true`.
6. Stream tokens back to the client via SSE.
7. **During streaming**, run artifact detection on accumulated content:
   - Code block >20 lines → code artifact
   - Markdown document >500 chars with headings → document artifact
   - Table with >5 rows → table artifact
   - JSON with chart-like structure → chart artifact
8. When generation completes, persist the full message to PostgreSQL.
9. If artifact detected, persist artifact metadata + content, emit `artifact` SSE event.

**Model orchestration:**
```
Chat Service
    ├── Primary: Ollama /api/chat (glm-5.2:cloud)
    ├── Fallback: Ollama /api/generate (if chat endpoint fails)
    └── Tool calls (phase 2):
        ├── File reader tool (read attached file by ID)
        ├── Web search tool (optional, phase 3)
        └── Code execution tool (optional, phase 3)
```

**Context window management:**
- If conversation + file content exceeds model context limit (e.g., 128K tokens):
  - Truncate older messages (keep last 20 messages + system prompt).
  - Summarize older messages using a smaller/faster model call.
  - For large files: extract and send only relevant chunks (phase 2: semantic search via embeddings).

### 2.3 Artifact Service

**Responsibility:** Store, render, and export artifacts.

**Artifact types:**

| Type | Storage | Preview | Export |
|---|---|---|---|
| `code` | Raw text in PostgreSQL (JSONB) | Syntax-highlighted (highlight.js) | `.py`, `.js`, `.rs`, etc. |
| `document` | Markdown in PostgreSQL | Rendered markdown (marked.js) | PDF, HTML, Markdown |
| `table` | JSON array in PostgreSQL (JSONB) | Interactive grid (client-side) | CSV, XLSX |
| `chart` | JSON spec in PostgreSQL | Chart.js render (client-side) | PNG, SVG |
| `report` | Markdown in PostgreSQL | Styled document preview | PDF (via background job) |

**Artifact record schema:**
```sql
CREATE TABLE artifacts (
    id          UUID PRIMARY KEY,
    conversation_id  UUID REFERENCES conversations(id),
    message_id       UUID REFERENCES messages(id),
    type        TEXT NOT NULL,        -- code, document, table, chart, report
    title       TEXT,
    language    TEXT,                  -- for code artifacts
    content     JSONB NOT NULL,        -- raw content (text, JSON, spec)
    metadata    JSONB DEFAULT '{}',   -- extra info (row count, chart type, etc.)
    version     INTEGER DEFAULT 1,     -- iteration tracking
    parent_id   UUID REFERENCES artifacts(id), -- for iterations
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

**Export flow:**
1. Client requests export (e.g., "Download as PDF").
2. Artifact service validates request, creates a job in Redis queue.
3. Background worker picks up the job, generates the file (see Background Jobs).
4. Worker uploads result to object storage, stores URL in job record.
5. Client polls job status or receives SSE notification.
6. Client downloads from the presigned URL.

### 2.4 File Service

**Responsibility:** Handle file uploads, storage, text extraction, chunking.

**Upload flow:**
1. Client uploads file via multipart form to `/api/upload`.
2. File service validates: type, size (max 10MB for production), virus scan (phase 2).
3. File is stored in object storage with a UUID filename.
4. File metadata is saved to PostgreSQL:
   ```sql
   CREATE TABLE files (
       id            UUID PRIMARY KEY,
       user_id       UUID REFERENCES users(id),
       conversation_id UUID REFERENCES conversations(id),
       filename      TEXT NOT NULL,
       mime_type     TEXT NOT NULL,
       size_bytes    BIGINT NOT NULL,
       storage_key   TEXT NOT NULL,     -- S3/MinIO key
       text_content  TEXT,               -- extracted text (for small files)
       text_extracted BOOLEAN DEFAULT FALSE,
       chunk_count   INTEGER DEFAULT 0,
       status        TEXT DEFAULT 'uploaded', -- uploaded, processing, ready, error
       created_at    TIMESTAMPTZ DEFAULT NOW()
   );
   ```
5. If file is text-based and <500KB: extract text synchronously, store in `text_content`.
6. If file is large or binary (PDF, DOCX): queue a background job for text extraction.
7. Return file ID to client immediately. Client can start chatting; file content is injected when ready.

**Supported file types:**

| Type | Extraction method | Sync/Async |
|---|---|---|
| .txt, .md, .csv, .json, .xml | Direct read | Sync (<500KB), Async (>500KB) |
| .py, .js, .ts, .rs, .go, .java | Direct read | Sync |
| .pdf | PyMuPDF (fitz) | Async |
| .docx | python-docx | Async |
| .xlsx | openpyxl | Async |
| .png, .jpg, .webp | No text extraction; stored for vision models | Sync |
| .html | BeautifulSoup (strip tags) | Async |

### 2.5 Conversation Service

**Responsibility:** CRUD operations on conversations, search, pagination.

**Schema:**
```sql
CREATE TABLE conversations (
    id          UUID PRIMARY KEY,
    user_id     UUID REFERENCES users(id),
    title       TEXT NOT NULL DEFAULT 'New Chat',
    message_count INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
    id              UUID PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL,          -- user, assistant, system
    content         TEXT NOT NULL,           -- display content (text only)
    api_content     TEXT,                    -- content sent to model (includes file text)
    file_ids        UUID[] DEFAULT '{}',     -- attached file IDs
    artifact_ids    UUID[] DEFAULT '{}',     -- generated artifact IDs
    tokens_in       INTEGER,                 -- input tokens
    tokens_out      INTEGER,                 -- output tokens
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_conversations_user ON conversations(user_id, updated_at DESC);
```

**Search (phase 2):**
- Full-text search on message content using PostgreSQL `tsvector` + `GIN` index.
- Or: embed each message using Ollama's embedding model, store in `pgvector`, search by semantic similarity.

---

## 3. Request Lifecycle

### 3.1 Chat Message (with file attachment)

```
User types message + attaches file → clicks Send

  ┌─ Client ──────────────────────────────────────────────────────────┐
  │ 1. If new file: POST /api/upload (multipart)                       │
  │    → receives file_id                                             │
  │ 2. POST /api/chat { conversationId, message, fileIds: [file_id] } │
  │ 3. Open SSE connection, listen for events                         │
  └───────────────────────────────────────────────────────────────────┘
                              │
  ┌─ API Gateway ─────────────▼────────────────────────────────────────┐
  │ 4. Validate auth, rate limit                                       │
  │ 5. Route to Chat Service                                           │
  └───────────────────────────────────────────────────────────────────┘
                              │
  ┌─ Chat Service ────────────▼────────────────────────────────────────┐
  │ 6. Load conversation history from PostgreSQL                      │
  │ 7. Load file metadata from PostgreSQL                              │
  │ 8. If file text_content is ready: inject into message              │
  │    If file still processing: inject "[File: name, processing…]"   │
  │ 9. Build messages array: [system_prompt, ...history, user_message]│
  │ 10. Call Ollama /api/chat with stream=true                         │
  │ 11. For each token chunk from Ollama:                               │
  │     → emit SSE event: { type: "token", content: chunk }            │
  │     → accumulate into full_content                                  │
  │ 12. Run artifact detection on full_content:                        │
  │     → if code block >20 lines: create artifact record              │
  │     → emit SSE event: { type: "artifact", artifactId, type }      │
  │ 13. Persist user message + assistant message to PostgreSQL        │
  │ 14. Persist artifact records (if any)                              │
  │ 15. Emit SSE event: { type: "done", messageId, conversationId }  │
  │ 16. Close SSE stream                                               │
  └───────────────────────────────────────────────────────────────────┘
                              │
  ┌─ Client ─────────────────▼────────────────────────────────────────┐
  │ 17. Render streaming tokens in message bubble                      │
  │ 18. On artifact event: open artifact panel, fetch artifact content│
  │ 19. On done event: re-enable composer, mark conversation saved    │
  │ 20. Cache conversation in IndexedDB for offline access             │
  └───────────────────────────────────────────────────────────────────┘
```

### 3.2 File Upload (large file)

```
User attaches 2MB PDF → clicks Send

  ┌─ Client ──────────────────────────────────────────────────────────┐
  │ 1. POST /api/upload (multipart, file=report.pdf)                  │
  └───────────────────────────────────────────────────────────────────┘
                              │
  ┌─ File Service ────────────▼───────────────────────────────────────┐
  │ 2. Validate: type=application/pdf, size=2MB (OK)                  │
  │ 3. Upload to object storage: files/{uuid}/report.pdf             │
  │ 4. Insert file record: status='processing'                       │
  │ 5. Queue background job: { type: 'extract_text', fileId }        │
  │ 6. Return { fileId, status: 'processing' } to client              │
  └───────────────────────────────────────────────────────────────────┘
                              │
  ┌─ Background Worker ───────▼───────────────────────────────────────┐
  │ 7. Download file from object storage                               │
  │ 8. Extract text via PyMuPDF                                        │
  │ 9. If text >10K chars: chunk into 2K-char segments                  │
  │ 10. Store text_content (or chunks) in PostgreSQL                  │
  │ 11. Update file record: status='ready', chunk_count=N             │
  │ 12. Publish Redis event: file:{fileId}:ready                      │
  └───────────────────────────────────────────────────────────────────┘
                              │
  ┌─ Client ───────────────────────────────────────────────────────────┐
  │ 12. Polls GET /api/files/:id every 2s OR receives SSE notification│
  │ 13. When status='ready': file chip shows ✓, can send message      │
  └───────────────────────────────────────────────────────────────────┘
```

### 3.3 Artifact Export (PDF)

```
User clicks "Download as PDF" on a report artifact

  ┌─ Client ──────────────────────────────────────────────────────────┐
  │ 1. POST /api/artifacts/:id/export { format: 'pdf' }               │
  │ 2. Receives { jobId, status: 'queued' }                            │
  │ 3. Shows "Generating PDF…" spinner in artifact panel               │
  └───────────────────────────────────────────────────────────────────┘
                              │
  ┌─ Artifact Service ────────▼───────────────────────────────────────┐
  │ 4. Create job in Redis queue: { type: 'export_pdf', artifactId }   │
  │ 5. Return jobId to client                                          │
  └───────────────────────────────────────────────────────────────────┘
                              │
  ┌─ PDF Worker ──────────────▼───────────────────────────────────────┐
  │ 6. Fetch artifact content from PostgreSQL                          │
  │ 7. Convert markdown → styled HTML (Python markdown lib)           │
  │ 8. Apply print CSS (margins, page breaks, typography)              │
  │ 9. Render HTML → PDF via WeasyPrint (or Puppeteer)                │
  │ 10. Upload PDF to object storage: exports/{uuid}/report.pdf       │
  │ 11. Update job: status='complete', url=presigned_url               │
  │ 12. Publish Redis event: export:{jobId}:complete                  │
  └───────────────────────────────────────────────────────────────────┘
                              │
  ┌─ Client ───────────────────────────────────────────────────────────┐
  │ 13. Receives SSE notification (or polls GET /api/artifacts/:id/export/:jobId) │
  │ 14. Downloads PDF from presigned URL                               │
  │ 15. Spinner → "Download" button with checkmark                     │
  └───────────────────────────────────────────────────────────────────┘
```

---

## 4. Background Jobs

### Job Queue Architecture

```
┌─────────────┐     ┌───────────┐     ┌──────────────────────────┐
│  Producers   │────▶│  Redis    │────▶│  Workers (N processes)   │
│  (API services)│  │  Queue    │     │                          │
└─────────────┘     └───────────┘     │  Worker types:            │
                                      │  - file_processor         │
                                      │  - pdf_generator          │
                                      │  - chart_renderer         │
                                      │  - embedding_worker       │
                                      └──────────────────────────┘
```

**Implementation:** Redis + RQ (Redis Queue) or Celery with Redis broker. RQ is simpler for a modular monolith. Celery if you need more features (scheduled jobs, task chaining).

### Job Types

| Job | Trigger | Worker | Output | Typical time |
|---|---|---|---|---|
| `extract_text` | File upload (large/binary) | file_processor | Text in PostgreSQL | 2–30s |
| `chunk_file` | After text extraction (if >10K chars) | file_processor | Chunks in PostgreSQL | 1–5s |
| `export_pdf` | User clicks "Download as PDF" | pdf_generator | PDF in object storage | 3–10s |
| `export_csv` | User clicks "Download as CSV" (table) | file_processor | CSV in object storage | <1s |
| `render_chart` | Chart artifact created | chart_renderer | PNG/SVG in object storage | 1–3s |
| `embed_message` | New message persisted | embedding_worker | Vector in pgvector | <1s |
| `summarize_conversation` | Conversation >50 messages | chat_service (low priority) | Summary in PostgreSQL | 5–15s |

### Worker Configuration

```python
# file_processor worker (handles text extraction + chunking)
# Concurrency: 4 workers (CPU-bound for PDF parsing)
# Timeout: 120s per job
# Retry: 3 attempts with exponential backoff

# pdf_generator worker (handles PDF/HTML export)
# Concurrency: 2 workers (memory-heavy, WeasyPrint/Puppeteer)
# Timeout: 60s per job
# Retry: 2 attempts

# chart_renderer worker (handles server-side chart rendering)
# Concurrency: 2 workers
# Timeout: 30s per job
# Retry: 2 attempts

# embedding_worker (handles semantic indexing)
# Concurrency: 4 workers (I/O-bound, calls Ollama)
# Timeout: 30s per job
# Retry: 3 attempts
```

### Job Status Tracking

```sql
CREATE TABLE jobs (
    id          UUID PRIMARY KEY,
    type        TEXT NOT NULL,          -- extract_text, export_pdf, etc.
    status      TEXT DEFAULT 'queued',  -- queued, processing, complete, failed
    entity_type TEXT,                   -- file, artifact
    entity_id   UUID,
    result_url  TEXT,                   -- presigned URL for downloads
    error       TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
```

**Client notification:** Workers publish completion events to Redis pub/sub. The API gateway subscribes and forwards to clients via SSE on a dedicated channel: `/api/events` (a persistent SSE connection for job notifications).

---

## 5. Model Orchestration

### 5.1 Primary Chat Flow

```
Chat Service
    │
    ├── 1. Build context (system prompt + history + current message + file content)
    │
    ├── 2. Token count check
    │      ├── If total tokens < context_limit: send full context
    │      └── If total tokens > context_limit:
    │           ├── Truncate: keep system prompt + last 20 messages
    │           └── If still too large: summarize older messages (separate model call)
    │
    ├── 3. Call Ollama /api/chat
    │      ├── model: "glm-5.2:cloud"
    │      ├── messages: [...context]
    │      ├── stream: true
    │      └── options: { temperature: 0.7, top_p: 0.9 }
    │
    ├── 4. Stream response tokens to client via SSE
    │
    ├── 5. Artifact detection (post-stream or during stream)
    │      ├── Regex/heuristic detection on accumulated content
    │      └── If detected: create artifact record, emit SSE event
    │
    └── 6. Persist message + artifacts
```

### 5.2 Tool Workflows (Phase 2)

```
User: "Analyze the attached CSV and create a summary report"

Chat Service
    │
    ├── 1. Model responds with tool call: { tool: "read_file", args: { file_id } }
    │
    ├── 2. Chat service executes tool:
    │      ├── Load file from storage
    │      ├── Parse CSV with Pandas
    │      ├── Return summary stats to model
    │      └── Feed result back to model as tool response
    │
    ├── 3. Model generates report based on tool output
    │
    └── 4. Report detected as artifact → rendered in panel
```

**Tool registry (phase 2):**

| Tool | Purpose | Implementation |
|---|---|---|
| `read_file` | Read attached file content | File service call |
| `search_files` | Semantic search across all user files | pgvector query |
| `generate_chart` | Create a chart from data | Chart spec → Chart.js |
| `create_table` | Format data as a table | JSON → table artifact |
| `web_search` | Search the web (optional) | External API (SearXNG, Brave) |

### 5.3 Model Configuration

```yaml
# config/models.yaml
primary:
  name: "glm-5.2:cloud"
  endpoint: "http://localhost:11434/api/chat"
  context_window: 128000
  max_tokens: 4096
  temperature: 0.7

embedding:
  name: "nomic-embed-text"  # or whatever Ollama supports
  endpoint: "http://localhost:11434/api/embeddings"
  dimensions: 768

fallback:
  name: "glm-5.2:cloud"  # same model, different params
  temperature: 0.3       # more focused for summarization
```

---

## 6. Storage Architecture

### 6.1 PostgreSQL

**Purpose:** All structured data — users, conversations, messages, artifacts, files metadata, jobs.

**Key tables:**
- `users` — id, email, name, created_at (phase 2: auth)
- `conversations` — id, user_id, title, message_count, timestamps
- `messages` — id, conversation_id, role, content, api_content, file_ids, artifact_ids, tokens, timestamp
- `artifacts` — id, conversation_id, message_id, type, title, language, content (JSONB), metadata, version, parent_id, timestamps
- `files` — id, user_id, conversation_id, filename, mime_type, size, storage_key, text_content, status, timestamps
- `jobs` — id, type, status, entity_type, entity_id, result_url, error, timestamps
- `file_chunks` — id, file_id, chunk_index, content, embedding (vector) (phase 2: semantic search)

**Optimizations:**
- JSONB GIN index on `artifacts.content` for querying by type/metadata.
- `tsvector` column on `messages.content` with GIN index for full-text search.
- `pgvector` extension for embedding-based semantic search (phase 2).
- Partition `messages` by conversation_id if scale requires (100K+ conversations).
- Read replicas for conversation listing and search queries.

### 6.2 Redis

**Purpose:** Job queue, cache, sessions, rate limiting, SSE pub/sub.

**Key uses:**

| Use | Key pattern | TTL |
|---|---|---|
| Job queue | `rq:queue:{queue_name}` | Persistent |
| Job status | `job:{jobId}` | 24h |
| Session cache | `session:{userId}` | 7 days |
| Rate limit | `rate:{userId}:{endpoint}` | 1–60s |
| Conversation cache | `conv:{conversationId}` | 5 min |
| File content cache | `file_content:{fileId}` | 10 min |
| SSE pub/sub | `events:{userId}` | Persistent |
| Active streams | `stream:{userId}:{conversationId}` | Stream duration |

### 6.3 Object Storage (S3 / MinIO)

**Purpose:** File uploads, generated exports, chart images.

**Bucket structure:**
```
glm-workspace/
├── uploads/
│   └── {userId}/
│       └── {fileId}/
│           └── {original_filename}
├── exports/
│   └── {userId}/
│       └── {artifactId}/
│           ├── report.pdf
│           ├── data.csv
│           └── chart.png
└── temp/
    └── (auto-deleted after 24h)
```

**Access:** Presigned URLs with 1-hour expiry for downloads. Direct upload from client via presigned PUT URL (offloads upload bandwidth from API server).

**Lifecycle rules:**
- `temp/` — delete after 24 hours.
- `exports/` — delete after 30 days (or keep if user saves to conversation).
- `uploads/` — keep until conversation is deleted, then cascade delete.

---

## 7. Frontend Architecture

### 7.1 Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | React 18 + TypeScript | Component model, ecosystem, type safety |
| Build | Vite | Fast dev server, simple config, HMR |
| State | Zustand | Lightweight, no boilerplate, good for chat state |
| Data fetching | TanStack Query | Caching, polling, optimistic updates |
| Streaming | EventSource API (SSE) | Native browser support, no WebSocket complexity |
| Markdown | marked + DOMPurify | Fast parsing + XSS sanitization |
| Code highlighting | highlight.js | Lightweight, 190+ languages |
| Charts | Chart.js | Lightweight, responsive, canvas-based |
| PDF export (client) | browser print API | Phase 1: no server needed |
| Tables | TanStack Table | Sortable, virtualized, headless |
| File storage | IndexedDB (idb-keyval) | Offline conversation cache, file blob storage |
| Icons | Lucide React | Clean, consistent, tree-shakeable |

### 7.2 State Management

```typescript
// stores/chatStore.ts (Zustand)
interface ChatStore {
  conversations: Conversation[]
  activeConversation: Conversation | null
  messages: Message[]
  isStreaming: boolean
  artifacts: Artifact[]
  activeArtifact: Artifact | null
  pendingAttachments: Attachment[]

  sendMessage: (text: string, fileIds: string[]) => Promise<void>
  stopGeneration: () => void
  newChat: () => void
  loadConversation: (id: string) => Promise<void>
  openArtifact: (id: string) => void
  closeArtifact: () => void
}
```

### 7.3 SSE Handling

```typescript
// hooks/useChatStream.ts
function useChatStream() {
  const eventSource = useRef<EventSource | null>(null)

  const stream = (conversationId: string, message: string, fileIds: string[]) => {
    // POST to /api/chat, then connect to SSE endpoint
    // Or: use fetch with ReadableStream for POST + SSE in one request
    const es = new EventSource(`/api/chat/stream?conversationId=${conversationId}&message=${encodeURIComponent(message)}`)
    // Better: use fetch with streaming response body (POST + stream in one request)
  }
}
```

**Note:** `EventSource` only supports GET. For POST + streaming, use `fetch()` with `ReadableStream` response body (already implemented in current code). This is the recommended approach.

### 7.4 Offline Support

- **IndexedDB cache:** All conversations cached locally. User can read past conversations offline.
- **Optimistic UI:** Messages appear immediately, synced when connection returns.
- **File caching:** Attached file blobs stored in IndexedDB. Can be re-sent without re-uploading.
- **Service worker (phase 2):** Cache static assets, enable PWA install.

---

## 8. Security Considerations

### 8.1 Authentication & Authorization (Phase 2)

| Concern | Solution |
|---|---|
| User auth | JWT (access + refresh tokens). Access token 15min, refresh 7 days. |
| Token storage | httpOnly cookies for refresh token. In-memory for access token. |
| Session management | Redis-backed session store. Invalidate on logout. |
| API auth | Bearer token in Authorization header. Middleware validates on every request. |
| WebSocket/SSE auth | Token passed as query param on connection (validated server-side). |

**Phase 1 (current):** No auth. Single-user, self-hosted. Add auth when going multi-user.

### 8.2 Input Validation

| Concern | Solution |
|---|---|
| SQL injection | SQLAlchemy ORM with parameterized queries. No raw SQL. |
| XSS in AI output | DOMPurify sanitizes all rendered markdown. Allowlist of safe HTML tags. |
| XSS in user input | User messages rendered as plain text (not markdown) in their bubbles. |
| File upload validation | Check MIME type server-side (not just extension). Magic number validation. |
| File size limits | 10MB max upload. Enforced at API gateway (reject before processing). |
| Prompt injection | System prompt includes guardrails. File content is wrapped in delimiters. Model output is sanitized before rendering. |
| Rate limiting | Per-user: 20 messages/min, 5 file uploads/min. Per-IP: 100 req/min. Redis-based sliding window. |

### 8.3 File Security

| Concern | Solution |
|---|---|
| Malicious files | ClamAV scan on upload (phase 2). Reject executables (.exe, .bat, .sh). |
| Path traversal | UUID-based storage keys. Never use user-supplied filenames in storage paths. |
| File access control | Presigned URLs with short expiry (1 hour). URLs are user-scoped. |
| Large file DoS | Size limit enforced before upload completes. Streaming upload with early rejection. |
| MIME type spoofing | Validate actual file content (magic bytes), not just Content-Type header. |

### 8.4 Model Security

| Concern | Solution |
|---|---|
| Prompt injection via files | File content wrapped: `--- Attached File: {name} ---\n{content}\n--- End ---`. System prompt instructs model to treat file content as data, not instructions. |
| Data leakage | No conversation data sent to external services (Ollama runs locally). |
| Model access | Ollama bound to localhost only. Not exposed to network. |
| Token limits | Max 4096 output tokens per response. Prevents runaway generation. |
| Cost control (cloud model) | Per-user token budget. Track tokens_in + tokens_out per message. Alert at 80% budget. |

### 8.5 Infrastructure Security

| Concern | Solution |
|---|---|
| HTTPS | TLS termination at reverse proxy (Caddy/Nginx). Auto-cert via Let's Encrypt. |
| CORS | Strict origin allowlist. No wildcard in production. |
| Secrets | Environment variables / .env file (never in code). Use Vault for production. |
| Database | Connection pooling (pgBouncer). Encrypted at rest. Daily backups. |
| Redis | Require password. Bind to localhost. No external access. |
| Object storage | MinIO with access keys. Bucket policies restrict to authenticated users. |
| Logging | No sensitive data in logs. Redact file contents, message texts in error logs. |

---

## 9. Scaling Considerations

### 9.1 Vertical vs Horizontal

| Component | Scale how | Why |
|---|---|---|
| API Gateway | Horizontal (stateless) | No session state. Load balance across instances. |
| Chat Service | Horizontal (stateless) | SSE streams are per-request. Any instance can handle. |
| File Service | Horizontal (stateless) | Uploads go to object storage, not local disk. |
| Background Workers | Horizontal (add more) | Queue-based. Add workers as queue depth grows. |
| PostgreSQL | Vertical first, read replicas later | CPU/RAM bound. Add read replicas for search/listing. |
| Redis | Vertical (single instance) | In-memory. Scale up RAM. Redis Cluster for HA (phase 3). |
| Ollama | Vertical (GPU-bound) | One model instance per GPU. Add GPUs for parallelism. |
| Object Storage | Horizontal (S3/MinIO) | Infinite scale by design. |

### 9.2 Bottlenecks & Mitigations

| Bottleneck | Symptom | Mitigation |
|---|---|---|
| **Ollama model calls** | Slow responses, queue buildup | Connection pool to Ollama. Limit concurrent model calls (semaphore). Queue excess requests. Add GPU instances. |
| **SSE connections** | Too many open connections | Max 5 concurrent SSE per user. Close idle streams after 5 min. Use Redis pub/sub for multi-instance. |
| **Large file processing** | Worker queue backlog | Prioritize jobs (user-initiated > background). Auto-scale workers based on queue depth. Timeout stale jobs. |
| **PostgreSQL writes** | Write contention on messages | Batch inserts. Write-behind cache (Redis buffer → bulk insert). Partition by conversation. |
| **PDF generation** | Memory spikes (WeasyPrint) | Limit concurrent PDF jobs (2 workers). Process in temp directory. Clean up after. |
| **Object storage bandwidth** | Slow downloads | CDN for public exports. Presigned URLs offload from API. Client-side caching. |

### 9.3 Scaling Path

```
Phase 1 (1–10 users, self-hosted):
  - Single FastAPI process (uvicorn, 4 workers)
  - Single PostgreSQL instance
  - Single Redis instance
  - Single Ollama instance (1 GPU)
  - MinIO for object storage
  - All on one machine / Docker Compose

Phase 2 (10–100 users):
  - FastAPI behind load balancer (2–4 instances)
  - PostgreSQL + 1 read replica
  - Redis (larger instance)
  - Ollama (2 GPU instances, round-robin)
  - MinIO (or S3)
  - Separate worker machine(s)
  - Docker Compose or single-node Kubernetes

Phase 3 (100–1000 users):
  - Kubernetes cluster
  - PostgreSQL primary + 2 read replicas + PgBouncer
  - Redis Cluster (3 nodes)
  - Ollama auto-scaling group (GPU instances)
  - S3 for object storage
  - Dedicated worker nodes (auto-scaled)
  - CDN for static assets + public exports
  - Monitoring: Prometheus + Grafana
  - Tracing: OpenTelemetry → Jaeger
```

### 9.4 Monitoring & Observability

| Signal | Tool | Alert on |
|---|---|---|
| API latency | Prometheus + Grafana | p95 > 2s for non-streaming, > 500ms TTFB for streaming |
| Error rate | Sentry | > 1% of requests |
| Queue depth | Redis exporter | > 50 jobs waiting > 30s |
| Ollama health | Custom probe | Model not responding, GPU OOM |
| DB connections | pgBouncer stats | > 80% pool utilization |
| Disk usage | Node exporter | > 85% on any volume |
| SSE connections | Custom metric | > 1000 concurrent per instance |

---

## 10. Deployment Architecture

### Phase 1: Docker Compose (current + backend)

```yaml
# docker-compose.yml
services:
  app:          # FastAPI + static frontend
  worker:       # Background workers (same image, different command)
  postgres:     # Database
  redis:        # Queue + cache
  minio:        # Object storage
  ollama:       # Model runtime (GPU)
```

### Phase 2: Single-node Kubernetes (K3s)

```
  K3s cluster
  ├── Ingress (Caddy/Traefik)
  ├── FastAPI deployment (2 replicas)
  ├── Worker deployment (2 replicas)
  ├── PostgreSQL (StatefulSet)
  ├── Redis (StatefulSet)
  ├── MinIO (StatefulSet)
  └── Ollama (StatefulSet, GPU)
```

### Phase 3: Multi-node Kubernetes

```
  Managed Kubernetes (EKS/GKE)
  ├── Ingress controller + cert manager
  ├── FastAPI (HPA: 2–10 pods, CPU-based)
  ├── Workers (HPA: 2–10 pods, queue-depth-based)
  ├── PostgreSQL (managed RDS/CloudSQL)
  ├── Redis (managed ElastiCache/Memorystore)
  ├── S3 (managed)
  ├── Ollama (GPU node group, auto-scaling)
  └── Monitoring stack (Prometheus, Grafana, Sentry)
```

---

## 11. Technology Summary

| Layer | Technology | Status |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | Phase 1 (migrate from current HTML) |
| Backend | FastAPI (Python 3.12) | Phase 1 (new) |
| Database | PostgreSQL 16 + pgvector | Phase 1 |
| Cache/Queue | Redis 7 + RQ | Phase 1 |
| Object Storage | MinIO (self-hosted) / S3 (cloud) | Phase 1 |
| Model Runtime | Ollama (glm-5.2:cloud) | Phase 1 (existing) |
| PDF Generation | WeasyPrint | Phase 1 |
| File Processing | PyMuPDF, python-docx, openpyxl, Pandas | Phase 1 |
| Reverse Proxy | Caddy (auto-HTTPS) | Phase 2 |
| Container | Docker + Docker Compose | Phase 1 (existing) |
| Orchestration | K3s → EKS/GKE | Phase 2–3 |
| Monitoring | Prometheus + Grafana + Sentry | Phase 2 |
| Auth | JWT + httpOnly cookies | Phase 2 |