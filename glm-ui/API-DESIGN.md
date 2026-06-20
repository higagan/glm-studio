# GLM Workspace — Backend API Design

> REST + SSE API for a production AI workspace.
> FastAPI backend. Synchronous for reads, streaming for chat, async jobs for heavy processing.

---

## 1. Route Groups

```
/api
├── /auth                    (phase 2 — auth-ready stubs for now)
│   ├── POST   /register
│   ├── POST   /login
│   ├── POST   /refresh
│   └── POST   /logout
│
├── /users
│   ├── GET    /me                    — current user context
│   ├── PATCH  /me                    — update preferences
│   └── GET    /me/usage              — token usage stats
│
├── /workspaces
│   ├── GET    /                      — list workspaces
│   ├── POST   /                      — create workspace
│   ├── GET    /:id                   — get workspace
│   ├── PATCH  /:id                   — update workspace
│   └── DELETE /:id                   — delete workspace
│
├── /conversations
│   ├── GET    /                      — list (paginated, searchable)
│   ├── POST   /                      — create new conversation
│   ├── GET    /:id                   — get conversation + messages
│   ├── PATCH  /:id                   — rename, pin, archive
│   ├── DELETE /:id                   — delete (soft, undo window)
│   └── POST   /:id/summarize         — trigger summary generation (async)
│
├── /messages
│   ├── POST   /                      — send message (returns SSE stream)
│   ├── POST   /stop                  — stop active generation
│   ├── GET    /:id                   — get single message
│   ├── PATCH  /:id                   — edit message
│   ├── DELETE /:id                   — delete message
│   └── POST   /:id/regenerate        — regenerate AI response (returns SSE stream)
│
├── /attachments
│   ├── POST   /                      — upload file (multipart)
│   ├── GET    /:id                   — get file metadata
│   ├── GET    /:id/content           — download original file
│   ├── GET    /:id/preview           — get parsed text content
│   ├── POST   /:id/reparse           — re-trigger parsing (async)
│   └── DELETE /:id                   — delete file
│
├── /artifacts
│   ├── GET    /                      — list artifacts (filterable)
│   ├── POST   /                      — create artifact manually
│   ├── GET    /:id                   — get artifact + content + render hints
│   ├── PATCH  /:id                   — edit artifact content (new version)
│   ├── DELETE /:id                   — delete artifact (soft)
│   ├── POST   /:id/iterate          — regenerate from AI (returns SSE stream)
│   ├── GET    /:id/versions         — list all versions
│   └── GET    /:id/versions/:ver    — get specific version
│
├── /artifacts/:id/render
│   ├── GET    /                      — get rendering hints
│   └── PUT    /                      — update rendering hints
│
├── /artifacts/:id/export
│   ├── POST   /                      — request export (async job)
│   ├── GET    /:jobId                — poll export job status
│   └── GET    /:jobId/download       — download exported file
│
├── /jobs
│   ├── GET    /                      — list jobs (filterable)
│   ├── GET    /:id                   — get job status
│   └── POST   /:id/cancel            — cancel queued/processing job
│
├── /events
│   └── GET    /                      — SSE stream (job notifications, file ready, etc.)
│
└── /health
    ├── GET    /                      — service health
    └── GET    /model                 — Ollama model status
```

---

## 2. Endpoint List

### 2.1 Auth (phase 2 — stubs now)

| Method | Path | Sync/Async | Streams | Purpose |
|---|---|---|---|---|
| POST | `/api/auth/register` | Sync | No | Create account |
| POST | `/api/auth/login` | Sync | No | Login, returns tokens |
| POST | `/api/auth/refresh` | Sync | No | Refresh access token |
| POST | `/api/auth/logout` | Sync | No | Invalidate session |

**Phase 1 behavior:** All endpoints return `{ "user_id": "local", "authenticated": true }`. Single-user mode. No auth middleware active.

---

### 2.2 User Context

| Method | Path | Sync/Async | Streams | Purpose |
|---|---|---|---|---|
| GET | `/api/users/me` | Sync | No | Get current user + preferences |
| PATCH | `/api/users/me` | Sync | No | Update preferences (theme, font_size, etc.) |
| GET | `/api/users/me/usage` | Sync | No | Token usage for current period |

**`GET /api/users/me` response:**
```json
{
  "id": "local",
  "name": "Local User",
  "email": null,
  "preferences": {
    "theme": "dark",
    "font_size": "medium",
    "send_on_enter": true,
    "default_model": "glm-5.2:cloud",
    "artifact_auto_open": true
  },
  "token_budget": 100000,
  "tokens_used": 15420,
  "workspaces": [
    { "id": "ws_abc", "name": "Default", "color": "#d97757", "is_default": true }
  ]
}
```

---

### 2.3 Workspaces

| Method | Path | Sync/Async | Streams | Purpose |
|---|---|---|---|---|
| GET | `/api/workspaces` | Sync | No | List user's workspaces |
| POST | `/api/workspaces` | Sync | No | Create workspace |
| GET | `/api/workspaces/:id` | Sync | No | Get workspace details |
| PATCH | `/api/workspaces/:id` | Sync | No | Update name, color, settings |
| DELETE | `/api/workspaces/:id` | Sync | No | Delete workspace + cascade |

**`POST /api/workspaces` request:**
```json
{
  "name": "Research Project",
  "color": "#2d8a4e",
  "icon": "🔬"
}
```

**`GET /api/workspaces/:id` response:**
```json
{
  "id": "ws_abc",
  "name": "Default",
  "color": "#d97757",
  "icon": null,
  "is_default": true,
  "settings": {
    "default_model": "glm-5.2:cloud",
    "max_file_size_mb": 10,
    "artifact_auto_open": true
  },
  "stats": {
    "conversation_count": 12,
    "artifact_count": 5,
    "storage_used_bytes": 4567890
  },
  "created_at": "2024-06-01T10:00:00Z",
  "updated_at": "2024-06-20T14:30:00Z"
}
```

---

### 2.4 Conversations

| Method | Path | Sync/Async | Streams | Purpose |
|---|---|---|---|---|
| GET | `/api/conversations` | Sync | No | List conversations (paginated) |
| POST | `/api/conversations` | Sync | No | Create new conversation |
| GET | `/api/conversations/:id` | Sync | No | Get conversation with all messages |
| PATCH | `/api/conversations/:id` | Sync | No | Rename, pin, archive |
| DELETE | `/api/conversations/:id` | Sync | No | Soft delete (undo window) |
| POST | `/api/conversations/:id/summarize` | Async | No | Trigger summary job |

**`GET /api/conversations` query params:**
```
?workspace_id=ws_abc
&status=active          (active | archived | all)
&page=1
&limit=20
&search=query           (full-text search on title + message content)
&sort=updated           (updated | created | title)
```

**`GET /api/conversations` response:**
```json
{
  "items": [
    {
      "id": "conv_123",
      "title": "Q3 Revenue Analysis",
      "title_source": "auto",
      "message_count": 14,
      "artifact_count": 2,
      "is_pinned": false,
      "is_archived": false,
      "has_draft": false,
      "last_message_at": "2024-06-20T14:30:00Z",
      "created_at": "2024-06-19T09:00:00Z",
      "updated_at": "2024-06-20T14:30:00Z"
    }
  ],
  "total": 12,
  "page": 1,
  "limit": 20,
  "has_more": false
}
```

**`POST /api/conversations` request:**
```json
{
  "workspace_id": "ws_abc",
  "title": "New Chat"           // optional, defaults to "New Chat"
}
```

**`GET /api/conversations/:id` response:**
```json
{
  "id": "conv_123",
  "workspace_id": "ws_abc",
  "title": "Q3 Revenue Analysis",
  "title_source": "auto",
  "summary": null,
  "is_pinned": false,
  "is_archived": false,
  "messages": [
    {
      "id": "msg_001",
      "role": "user",
      "content": "Analyze the Q3 revenue data",
      "attachments": [
        {
          "id": "att_001",
          "filename": "q3_revenue.csv",
          "mime_type": "text/csv",
          "size_bytes": 45678,
          "parse_status": "ready",
          "is_image": false
        }
      ],
      "artifact_ids": [],
      "created_at": "2024-06-20T14:25:00Z"
    },
    {
      "id": "msg_002",
      "role": "assistant",
      "content": "# Q3 Revenue Analysis\n\n## Summary\n\n...",
      "model_name": "glm-5.2:cloud",
      "tokens_in": 450,
      "tokens_out": 320,
      "generation_ms": 4200,
      "attachments": [],
      "artifact_ids": ["art_001", "art_002"],
      "created_at": "2024-06-20T14:25:05Z"
    }
  ],
  "artifacts": [
    {
      "id": "art_001",
      "type": "table",
      "title": "Revenue by Product",
      "version": 1,
      "is_latest": true
    },
    {
      "id": "art_002",
      "type": "chart",
      "title": "Revenue Trend",
      "version": 1,
      "is_latest": true
    }
  ],
  "created_at": "2024-06-20T14:25:00Z",
  "updated_at": "2024-06-20T14:25:05Z"
}
```

**`PATCH /api/conversations/:id` request:**
```json
{
  "title": "Renamed Conversation",     // optional
  "is_pinned": true,                   // optional
  "is_archived": false                  // optional
}
```

**`DELETE /api/conversations/:id` response:**
```json
{
  "id": "conv_123",
  "deleted": true,
  "undo_token": "undo_abc123",         // token to restore within 5s
  "undo_expires_at": "2024-06-20T14:35:05Z"
}
```

---

### 2.5 Messages

| Method | Path | Sync/Async | Streams | Purpose |
|---|---|---|---|---|
| POST | `/api/messages` | Sync→Stream | **Yes (SSE)** | Send message, stream AI response |
| POST | `/api/messages/stop` | Sync | No | Stop active generation |
| GET | `/api/messages/:id` | Sync | No | Get single message |
| PATCH | `/api/messages/:id` | Sync | No | Edit message content |
| DELETE | `/api/messages/:id` | Sync | No | Delete message |
| POST | `/api/messages/:id/regenerate` | Sync→Stream | **Yes (SSE)** | Regenerate AI response |

**`POST /api/messages` request:**
```json
{
  "conversation_id": "conv_123",
  "content": "Analyze this CSV and create a summary report",
  "attachment_ids": ["att_001", "att_002"]    // optional
}
```

**`POST /api/messages` response — SSE stream:**
```
event: message_created
data: {"message_id": "msg_003", "role": "user", "content": "Analyze this CSV..."}

event: generation_started
data: {"message_id": "msg_004", "role": "assistant", "model": "glm-5.2:cloud"}

event: token
data: {"content": "# Q3 "}

event: token
data: {"content": "Revenue "}

event: token
data: {"content": "Analysis\n\n"}

event: thinking
data: {"content": "Let me analyze the CSV data..."}

event: artifact
data: {"artifact_id": "art_003", "type": "report", "title": "Q3 Revenue Analysis", "message_id": "msg_004"}

event: done
data: {"message_id": "msg_004", "conversation_id": "conv_123", "tokens_in": 450, "tokens_out": 320, "generation_ms": 4200}
```

**`POST /api/messages/stop` request:**
```json
{
  "conversation_id": "conv_123"    // optional — stops all for this conversation
}
```

**`POST /api/messages/:id/regenerate` request:**
```json
{
  "instruction": "Make it more concise",    // optional override
  "model": "glm-5.2:cloud"                  // optional model override
}
```

**Response:** Same SSE stream format as `POST /api/messages`.

**`PATCH /api/messages/:id` request:**
```json
{
  "content": "Edited message text"
}
```

---

### 2.6 Attachments

| Method | Path | Sync/Async | Streams | Purpose |
|---|---|---|---|---|
| POST | `/api/attachments` | Sync→Async | No | Upload file (multipart) |
| GET | `/api/attachments/:id` | Sync | No | Get file metadata |
| GET | `/api/attachments/:id/content` | Sync | No | Download original file |
| GET | `/api/attachments/:id/preview` | Sync | No | Get parsed text content |
| POST | `/api/attachments/:id/reparse` | Async | No | Re-trigger parsing |
| DELETE | `/api/attachments/:id` | Sync | No | Delete file |

**`POST /api/attachments` request:**
```
Content-Type: multipart/form-data

file: (binary)
conversation_id: conv_123        (form field)
workspace_id: ws_abc             (form field)
```

**`POST /api/attachments` response (immediate):**
```json
{
  "id": "att_001",
  "filename": "q3_revenue.csv",
  "mime_type": "text/csv",
  "size_bytes": 45678,
  "is_image": false,
  "parse_status": "processing",      // "ready" for small text files, "processing" for large/binary
  "parse_job_id": "job_abc",          // present if async parsing queued
  "storage_key": "uploads/ws_abc/att_001/q3_revenue.csv",
  "created_at": "2024-06-20T14:20:00Z"
}
```

**Behavior:**
- **Text files <500KB:** Read synchronously, `parse_status` = `"ready"` in response.
- **Text files >500KB:** Queue async job, `parse_status` = `"processing"`. Client polls or receives SSE.
- **Binary files (PDF, DOCX, XLSX):** Always async. Queue extraction job.
- **Images:** No text extraction. `parse_status` = `"ready"` immediately. Stored for vision models.

**`GET /api/attachments/:id/preview` response:**
```json
{
  "id": "att_001",
  "parse_status": "ready",
  "content_type": "text",
  "raw_text": "Product,Revenue,Growth\nWidget A,45000,12%\n...",
  "text_char_count": 4567,
  "language": "en",
  "is_chunked": false,
  "structure": {
    "columns": ["Product", "Revenue", "Growth"],
    "row_count": 150,
    "delimiter": ",",
    "has_header": true
  },
  "metadata": {}
}
```

**For large/chunked files:**
```json
{
  "id": "att_002",
  "parse_status": "ready",
  "content_type": "structured",
  "raw_text": null,                    // too large, use chunks
  "text_char_count": 125000,
  "is_chunked": true,
  "chunk_count": 63,
  "structure": {
    "headings": ["Introduction", "Methodology", "Results", "Conclusion"],
    "page_count": 24,
    "has_tables": true
  },
  "metadata": {
    "author": "Jane Doe",
    "title": "Annual Report 2024"
  }
}
```

---

### 2.7 Artifacts

| Method | Path | Sync/Async | Streams | Purpose |
|---|---|---|---|---|
| GET | `/api/artifacts` | Sync | No | List artifacts (filterable) |
| POST | `/api/artifacts` | Sync | No | Create artifact manually |
| GET | `/api/artifacts/:id` | Sync | No | Get artifact + content + render hints |
| PATCH | `/api/artifacts/:id` | Sync | No | Edit content (creates new version) |
| DELETE | `/api/artifacts/:id` | Sync | No | Soft delete |
| POST | `/api/artifacts/:id/iterate` | Sync→Stream | **Yes (SSE)** | AI regenerates with feedback |
| GET | `/api/artifacts/:id/versions` | Sync | No | List all versions |
| GET | `/api/artifacts/:id/versions/:ver` | Sync | No | Get specific version |

**`GET /api/artifacts` query params:**
```
?workspace_id=ws_abc
&conversation_id=conv_123       (optional filter)
&type=report                    (optional: code, document, report, table, chart, slide_deck, spreadsheet)
&status=active                  (active, archived, all)
&page=1
&limit=20
&sort=updated
```

**`GET /api/artifacts/:id` response:**
```json
{
  "id": "art_001",
  "workspace_id": "ws_abc",
  "conversation_id": "conv_123",
  "message_id": "msg_002",
  "parent_artifact_id": null,
  "type": "report",
  "title": "Q3 Revenue Analysis",
  "version": 2,
  "is_latest": true,
  "status": "active",
  "content": {
    "markdown": "# Q3 Revenue Analysis\n\n## Summary\n\nTotal revenue: $108K...",
    "word_count": 1250,
    "headings": ["Summary", "Findings", "Recommendations"]
  },
  "render_hints": [
    {
      "id": "hint_001",
      "hint_type": "display_mode",
      "options": {
        "mode": "document",
        "reading_width": "680px",
        "font": "serif",
        "line_height": 1.8
      }
    },
    {
      "id": "hint_002",
      "hint_type": "page_layout",
      "options": {
        "page_size": "A4",
        "margins": "2cm",
        "header": "Q3 Revenue Analysis",
        "footer": "Page {n}"
      }
    }
  ],
  "metadata": {
    "word_count": 1250,
    "heading_count": 3,
    "has_tables": true
  },
  "export_formats": ["pdf", "html", "md"],
  "export_storage_key": null,
  "created_at": "2024-06-20T14:25:05Z",
  "updated_at": "2024-06-20T14:30:00Z"
}
```

**`POST /api/artifacts` request (manual creation):**
```json
{
  "workspace_id": "ws_abc",
  "conversation_id": "conv_123",
  "message_id": "msg_002",
  "type": "code",
  "title": "data_processor.py",
  "language": "python",
  "content": {
    "code": "import pandas as pd\ndef process(file):\n    ..."
  }
}
```

**`PATCH /api/artifacts/:id` request (edit → new version):**
```json
{
  "content": {
    "markdown": "# Q3 Revenue Analysis (Revised)\n\n..."
  },
  "title": "Q3 Revenue Analysis — Final"    // optional rename
}
```

**`PATCH` response:**
```json
{
  "id": "art_003",
  "parent_artifact_id": "art_001",
  "version": 3,
  "is_latest": true,
  "content": { "markdown": "..." },
  "previous_version_id": "art_001",
  "previous_version": 2,
  "updated_at": "2024-06-20T14:35:00Z"
}
```

**`POST /api/artifacts/:id/iterate` request:**
```json
{
  "instruction": "Add a section about Q4 projections",
  "conversation_id": "conv_123"
}
```

**Response:** SSE stream (same format as message streaming). When done, a new artifact version is created.

---

### 2.8 Rendering Hints

| Method | Path | Sync/Async | Streams | Purpose |
|---|---|---|---|---|
| GET | `/api/artifacts/:id/render` | Sync | No | Get all rendering hints |
| PUT | `/api/artifacts/:id/render` | Sync | No | Replace all rendering hints |

**`GET /api/artifacts/:id/render` response:**
```json
{
  "artifact_id": "art_001",
  "hints": [
    {
      "id": "hint_001",
      "hint_type": "display_mode",
      "target_selector": null,
      "options": {
        "mode": "document",
        "reading_width": "680px",
        "font": "serif",
        "line_height": 1.8
      },
      "priority": 10
    },
    {
      "id": "hint_002",
      "hint_type": "page_layout",
      "target_selector": null,
      "options": {
        "page_size": "A4",
        "margins": "2cm",
        "header": "Q3 Revenue Analysis",
        "footer": "Page {n}"
      },
      "priority": 5
    }
  ]
}
```

**`PUT /api/artifacts/:id/render` request:**
```json
{
  "hints": [
    {
      "hint_type": "display_mode",
      "options": { "mode": "document", "reading_width": "720px" },
      "priority": 10
    },
    {
      "hint_type": "syntax_theme",
      "target_selector": "pre code",
      "options": { "theme": "github-dark", "show_line_numbers": true },
      "priority": 5
    }
  ]
}
```

---

### 2.9 Exports / Downloads

| Method | Path | Sync/Async | Streams | Purpose |
|---|---|---|---|---|
| POST | `/api/artifacts/:id/export` | Async | No | Request export (queues job) |
| GET | `/api/artifacts/:id/export/:jobId` | Sync | No | Poll job status |
| GET | `/api/artifacts/:id/export/:jobId/download` | Sync | No | Download exported file |

**`POST /api/artifacts/:id/export` request:**
```json
{
  "format": "pdf",           // pdf, html, md, csv, xlsx, png, svg, docx
  "options": {               // format-specific options
    "page_size": "A4",
    "margins": "2cm",
    "include_toc": true
  }
}
```

**`POST` response (immediate):**
```json
{
  "job_id": "job_xyz",
  "status": "queued",
  "artifact_id": "art_001",
  "format": "pdf",
  "estimated_seconds": 8
}
```

**`GET /api/artifacts/:id/export/:jobId` response (polling):**
```json
// While processing:
{
  "job_id": "job_xyz",
  "status": "processing",
  "progress": "rendering",     // queued, rendering, generating, uploading
  "started_at": "2024-06-20T14:30:00Z"
}

// When complete:
{
  "job_id": "job_xyz",
  "status": "complete",
  "progress": "done",
  "download_url": "https://storage.example.com/exports/...",
  "file_size": 245678,
  "expires_at": "2024-06-20T15:30:00Z",
  "completed_at": "2024-06-20T14:30:08Z",
  "duration_ms": 8000
}

// When failed:
{
  "job_id": "job_xyz",
  "status": "failed",
  "error_code": "RENDER_TIMEOUT",
  "error_message": "PDF rendering exceeded 60s timeout",
  "retry_available": true
}
```

**`GET /api/artifacts/:id/export/:jobId/download`:**
- Returns `302 Redirect` to presigned URL, OR
- Returns file directly as `application/pdf` (or appropriate MIME type) with `Content-Disposition: attachment`

**Client-side exports (no server call needed):**

| Format | Artifact types | Method |
|---|---|---|
| `.py`, `.js`, `.rs`, etc. | code | Blob download from content |
| `.md` | document, report | Blob download from content.markdown |
| `.csv` | table | Generate CSV from content.rows |
| `.html` | document, report | Wrap markdown → HTML, download |
| `.png` | chart | Canvas.toDataURL() → download |
| `.svg` | chart | Chart.js toBase64Image() → download |

These are instant, no job needed. The client handles them directly.

---

### 2.10 Generation Jobs

| Method | Path | Sync/Async | Streams | Purpose |
|---|---|---|---|---|
| GET | `/api/jobs` | Sync | No | List jobs (filterable) |
| GET | `/api/jobs/:id` | Sync | No | Get job status + result |
| POST | `/api/jobs/:id/cancel` | Sync | No | Cancel queued/processing job |

**`GET /api/jobs` query params:**
```
?workspace_id=ws_abc
&status=processing           (queued, processing, complete, failed, cancelled, all)
&type=export_pdf             (optional filter by job type)
&entity_type=artifact        (optional)
&page=1
&limit=20
```

**`GET /api/jobs/:id` response:**
```json
{
  "id": "job_xyz",
  "type": "export_pdf",
  "status": "complete",
  "priority": 0,
  "entity_type": "artifact",
  "entity_id": "art_001",
  "input_params": {
    "artifact_id": "art_001",
    "format": "pdf",
    "page_size": "A4"
  },
  "output_result": {
    "url": "https://storage.example.com/exports/...",
    "file_size": 245678,
    "page_count": 8
  },
  "error_code": null,
  "error_message": null,
  "retry_count": 0,
  "queued_at": "2024-06-20T14:30:00Z",
  "started_at": "2024-06-20T14:30:01Z",
  "completed_at": "2024-06-20T14:30:08Z",
  "duration_ms": 7000,
  "worker_id": "worker-01"
}
```

**`POST /api/jobs/:id/cancel` response:**
```json
{
  "id": "job_xyz",
  "status": "cancelled",
  "cancelled_at": "2024-06-20T14:30:05Z"
}
```

**Cancel behavior:**
- If `queued`: remove from queue immediately. Status → `cancelled`.
- If `processing`: send cancellation signal to worker. Worker checks between stages. Status → `cancelled` (may take a few seconds).
- If `complete` or `failed`: return `409 Conflict` — can't cancel a finished job.

---

### 2.11 Events (SSE notification stream)

| Method | Path | Sync/Async | Streams | Purpose |
|---|---|---|---|---|
| GET | `/api/events` | Persistent | **Yes (SSE)** | Real-time job notifications |

**Purpose:** A persistent SSE connection that the client opens on page load. The server pushes events for:
- File parsing complete
- Export job complete
- Export job failed
- Conversation summary ready
- Any async job status change

**Event format:**
```
event: job_complete
data: {"job_id": "job_xyz", "type": "export_pdf", "entity_id": "art_001", "status": "complete", "download_url": "..."}

event: job_failed
data: {"job_id": "job_abc", "type": "extract_text", "entity_id": "att_002", "error_message": "..."}

event: file_ready
data: {"attachment_id": "att_002", "parse_status": "ready", "chunk_count": 23}

event: heartbeat
data: {"timestamp": "2024-06-20T14:30:00Z"}
```

**Heartbeat:** Server sends a heartbeat every 30 seconds to keep the connection alive. If the client doesn't receive a heartbeat for 60 seconds, it reconnects with exponential backoff (1s, 2s, 4s, 8s, max 30s).

---

### 2.12 Health

| Method | Path | Sync/Async | Streams | Purpose |
|---|---|---|---|---|
| GET | `/api/health` | Sync | No | Service health check |
| GET | `/api/health/model` | Sync | No | Ollama model status |

**`GET /api/health` response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime_seconds": 86400,
  "services": {
    "database": "connected",
    "redis": "connected",
    "object_storage": "connected",
    "ollama": "connected"
  }
}
```

**`GET /api/health/model` response:**
```json
{
  "ollama_running": true,
  "model_loaded": true,
  "model_name": "glm-5.2:cloud",
  "models_available": ["glm-5.2:cloud", "nomic-embed-text"],
  "response_time_ms": 45
}
```

---

## 3. Payload Shape Summary

### Request payloads

| Endpoint | Body shape |
|---|---|
| `POST /conversations` | `{ workspace_id, title? }` |
| `PATCH /conversations/:id` | `{ title?, is_pinned?, is_archived? }` |
| `POST /messages` | `{ conversation_id, content, attachment_ids? }` |
| `POST /messages/:id/regenerate` | `{ instruction?, model? }` |
| `POST /attachments` | multipart: `file`, `conversation_id`, `workspace_id` |
| `POST /artifacts` | `{ workspace_id, conversation_id?, message_id?, type, title, language?, content }` |
| `PATCH /artifacts/:id` | `{ content?, title? }` |
| `POST /artifacts/:id/iterate` | `{ instruction, conversation_id }` |
| `PUT /artifacts/:id/render` | `{ hints: [{ hint_type, options, target_selector?, priority? }] }` |
| `POST /artifacts/:id/export` | `{ format, options? }` |
| `POST /jobs/:id/cancel` | `{}` (empty body) |

### Response payloads

| Endpoint | Response shape |
|---|---|
| `GET /conversations` | `{ items: [...], total, page, limit, has_more }` |
| `GET /conversations/:id` | `{ id, title, messages: [...], artifacts: [...] }` |
| `POST /attachments` | `{ id, filename, mime_type, size_bytes, parse_status, parse_job_id? }` |
| `GET /attachments/:id/preview` | `{ parse_status, content_type, raw_text?, structure?, metadata? }` |
| `GET /artifacts/:id` | `{ id, type, title, version, content, render_hints, export_formats }` |
| `GET /artifacts/:id/versions` | `{ items: [{ id, version, is_latest, created_at }] }` |
| `POST /artifacts/:id/export` | `{ job_id, status, estimated_seconds }` |
| `GET /jobs/:id` | `{ id, type, status, input_params, output_result?, error? }` |
| `GET /health` | `{ status, services: { database, redis, storage, ollama } }` |

### SSE event payloads

| Event | Data shape | When emitted |
|---|---|---|
| `message_created` | `{ message_id, role, content }` | User message persisted |
| `generation_started` | `{ message_id, model }` | AI generation begins |
| `token` | `{ content: string }` | Each streamed token chunk |
| `thinking` | `{ content: string }` | Model thinking/reasoning (if supported) |
| `artifact` | `{ artifact_id, type, title, message_id }` | Artifact detected in response |
| `done` | `{ message_id, conversation_id, tokens_in, tokens_out, generation_ms }` | Generation complete |
| `error` | `{ message_id, error_code, error_message }` | Generation failed |
| `job_complete` | `{ job_id, type, entity_id, status, download_url? }` | Background job finished |
| `job_failed` | `{ job_id, type, entity_id, error_message }` | Background job failed |
| `file_ready` | `{ attachment_id, parse_status, chunk_count? }` | File parsing complete |
| `heartbeat` | `{ timestamp }` | Keep-alive (every 30s) |

---

## 4. Async Job Behavior

### Job lifecycle

```
Client request
    │
    ├── Sync operation (fast, <2s)
    │   → Execute immediately
    │   → Return result
    │
    └── Async operation (slow, >2s)
        │
        ▼
    Create job record (status: queued)
        │
        ├── Return job_id to client immediately
        │
        ▼
    Worker picks up job (status: processing)
        │
        ├── Worker processes
        │   ├── Progress stages published to Redis pub/sub
        │   └── SSE /api/events forwards to client
        │
        ├── Success
        │   → Store result in job record (status: complete)
        │   → Upload output to object storage if file produced
        │   → Publish job_complete event
        │   → Client downloads via presigned URL
        │
        └── Failure
            → Store error in job record (status: failed)
            → If retries < max_retries:
               → Re-queue with exponential backoff (5s, 15s, 45s)
               → status: queued again
            → If retries exhausted:
               → Publish job_failed event
               → Client can retry manually
```

### Which operations are async?

| Operation | Sync/Async | Why | Typical duration |
|---|---|---|---|
| List conversations | Sync | Fast DB query | <100ms |
| Get conversation | Sync | Fast DB query | <200ms |
| Send message | Sync→Stream | Streams tokens, no blocking | 2–30s (streamed) |
| Upload file (small text) | Sync | Read + store <500KB | <1s |
| Upload file (large/binary) | Async | Parsing takes time | 2–30s |
| Parse file text | Async | CPU-intensive (PDF, DOCX) | 2–30s |
| Export PDF | Async | WeasyPrint rendering | 3–15s |
| Export CSV | Sync | Fast, generate from JSON | <1s |
| Export HTML | Sync | Fast, markdown → HTML | <500ms |
| Render chart (PNG) | Async | Server-side canvas render | 1–3s |
| Embed chunks | Async | Calls embedding model | 1–5s per chunk |
| Summarize conversation | Async | Model call | 5–15s |
| Detect artifacts | Sync | Heuristic, runs during stream | <100ms |

### Job priority

| Priority | Job types | Rationale |
|---|---|---|
| **1 (high)** | export_pdf, export_csv (user-initiated) | User is waiting |
| **0 (normal)** | extract_text, chunk_file, render_chart | Background but important |
| **-1 (low)** | embed_chunks, summarize_conversation | Can wait, not blocking UX |

### Job retry policy

| Job type | Max retries | Backoff | Timeout |
|---|---|---|---|
| extract_text | 3 | 5s, 15s, 45s | 120s |
| export_pdf | 2 | 10s, 30s | 60s |
| export_csv | 2 | 5s, 15s | 30s |
| render_chart | 2 | 5s, 15s | 30s |
| embed_chunks | 3 | 5s, 15s, 45s | 30s per chunk |
| summarize_conversation | 2 | 10s, 30s | 60s |

### Client polling vs SSE

**SSE (preferred):** Client opens `/api/events` on page load. Receives `job_complete` / `job_failed` / `file_ready` events. No polling needed.

**Polling (fallback):** If SSE connection fails, client polls `GET /api/jobs/:id` every 2 seconds. Stops polling when status is `complete` or `failed`.

**Implementation:**
```typescript
// Client-side pattern
async function waitForJob(jobId: string): Promise<JobResult> {
  // Try SSE first
  if (eventSourceConnected) {
    return new Promise((resolve) => {
      const handler = (e: MessageEvent) => {
        const data = JSON.parse(e.data);
        if (data.job_id === jobId) {
          eventSource.removeEventListener('job_complete', handler);
          eventSource.removeEventListener('job_failed', handler);
          resolve(data);
        }
      };
      eventSource.addEventListener('job_complete', handler);
      eventSource.addEventListener('job_failed', handler);
    });
  }
  // Fallback: poll
  return pollJobStatus(jobId, 2000);
}
```

---

## 5. Error Handling Patterns

### 5.1 Standard Error Response

All errors return a consistent shape:

```json
{
  "error": {
    "code": "MODEL_NOT_RESPONDING",
    "message": "GLM-5.2 is not responding. Make sure Ollama is running.",
    "details": {
      "ollama_url": "http://localhost:11434",
      "last_error": "Connection refused"
    },
    "retryable": true,
    "retry_after_seconds": 5,
    "request_id": "req_abc123"
  }
}
```

### 5.2 Error Codes

| Code | HTTP Status | When | Retryable | User message |
|---|---|---|---|---|
| `VALIDATION_ERROR` | 400 | Invalid request body/params | No | "Check your input and try again." |
| `UNAUTHORIZED` | 401 | Missing/invalid token (phase 2) | No | "Please log in." |
| `FORBIDDEN` | 403 | No access to resource | No | "You don't have access to this." |
| `NOT_FOUND` | 404 | Resource doesn't exist | No | "This conversation/artifact was not found." |
| `CONFLICT` | 409 | Version conflict, cancel finished job | No | "This resource was modified by another request." |
| `RATE_LIMITED` | 429 | Too many requests | Yes | "Slow down. Try again in {n} seconds." |
| `FILE_TOO_LARGE` | 413 | Upload exceeds size limit | No | "File is too large (max {size}MB)." |
| `UNSUPPORTED_FILE_TYPE` | 415 | MIME type not allowed | No | "This file type is not supported." |
| `MODEL_NOT_RESPONDING` | 502 | Ollama unreachable | Yes | "GLM-5.2 is not responding. Make sure Ollama is running." |
| `MODEL_TIMEOUT` | 504 | Generation exceeded timeout | Yes | "Generation timed out. Try again." |
| `MODEL_ERROR` | 502 | Ollama returned an error | Yes | "GLM-5.2 encountered an error. Try rephrasing." |
| `PARSE_FAILED` | 422 | File text extraction failed | Yes | "Couldn't read this file. Try a different format." |
| `RENDER_FAILED` | 500 | Artifact rendering error | Yes | "Couldn't render this artifact." |
| `EXPORT_FAILED` | 500 | Export job failed | Yes | "Export failed. Try again." |
| `STORAGE_ERROR` | 500 | Object storage unavailable | Yes | "Storage is temporarily unavailable." |
| `DATABASE_ERROR` | 500 | DB query failed | Yes | "Something went wrong. Try again." |
| `QUEUE_FULL` | 503 | Job queue at capacity | Yes | "Server is busy. Try again in a moment." |
| `INTERNAL_ERROR` | 500 | Unhandled exception | Yes | "Something went wrong on our end." |

### 5.3 Retry Patterns

#### Client-side retry (HTTP requests)

```typescript
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        // Don't retry client errors (except rate limit)
        throw new ApiError(await res.json());
      }
      // Server error or rate limit — retry with backoff
      const error = await res.json();
      const delay = error.retry_after_seconds || Math.min(2 ** attempt, 30);
      await sleep(delay * 1000);
      lastError = new ApiError(error);
    } catch (e) {
      lastError = e;
      await sleep(Math.min(2 ** attempt, 30) * 1000);
    }
  }
  throw lastError;
}
```

#### SSE stream retry

```typescript
function connectStream(url: string, handlers: StreamHandlers): void {
  let retryCount = 0;
  let retryDelay = 1000; // start at 1s

  function connect() {
    const es = new EventSource(url);
    es.onopen = () => { retryCount = 0; retryDelay = 1000; };
    es.addEventListener('token', (e) => handlers.onToken(JSON.parse(e.data)));
    es.addEventListener('done', (e) => { es.close(); handlers.onDone(JSON.parse(e.data)); });
    es.addEventListener('error', (e) => {
      es.close();
      if (retryCount < 5) {
        retryCount++;
        setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30000); // exponential backoff, max 30s
      } else {
        handlers.onError({ message: 'Connection lost. Please retry.' });
      }
    });
  }
  connect();
}
```

**Note:** For `POST /api/messages` (which streams via fetch ReadableStream, not EventSource), the retry pattern is different — the client re-POSTs the same message. The server should be idempotent: if the message was already persisted, return the existing response rather than generating again.

#### Server-side retry (background jobs)

```python
# Worker retry logic (RQ/Celery)
@job(retry=3, retry_backoff=True, retry_backoff_max=60, retry_jitter=True)
def extract_text(attachment_id: str):
    attachment = db.get_attachment(attachment_id)
    try:
        text = parse_file(attachment.storage_key)
        db.update_attachment(attachment_id, parse_status='ready', text_content=text)
    except PDFParseError as e:
        raise RetryableError(f"PDF parsing failed: {e}")  # will retry
    except UnsupportedFileError as e:
        db.update_attachment(attachment_id, parse_status='failed', parse_error=str(e))
        raise  # won't retry (non-retryable)
```

**Retry rules:**
- **Retryable:** network errors, timeouts, storage errors, model errors, OOM.
- **Non-retryable:** validation errors, unsupported file types, permission errors, malformed input.
- **Backoff:** exponential with jitter: `delay = min(base * 2^attempt + random(0, 1), max_delay)`.
- **Max retries:** 3 for most jobs, 2 for PDF export (memory-heavy).
- **Dead letter:** After max retries, job status → `failed`. Error stored. Client can manually retry via `POST /api/jobs/:id/retry` (phase 2).

### 5.4 Streaming Error Handling

**During SSE streaming, errors can occur mid-stream.** The server must handle gracefully:

```
event: token
data: {"content": "The revenue for Q3 is "}

event: token
data: {"content": "$108"}

--- network error occurs here ---

event: error
data: {"message_id": "msg_004", "error_code": "MODEL_TIMEOUT", "error_message": "Generation timed out", "partial_content": true}
```

**Client behavior on mid-stream error:**
1. Keep the partial content already rendered (don't clear it).
2. Show an error note at the bottom of the message: "⚠️ Generation interrupted. [Retry]"
3. Retry button re-sends the original user message. The server generates a fresh response.
4. The partial assistant message is marked as `status: stopped` in the DB (not deleted).

**Server behavior on mid-stream error:**
1. Persist whatever was generated so far as the message content with `status: stopped` or `status: error`.
2. Emit `error` SSE event with the partial content flag.
3. Close the stream.
4. Log the error with request_id for tracing.

### 5.5 Idempotency

| Endpoint | Idempotent? | How |
|---|---|---|
| `POST /messages` | Yes | Client sends `Idempotency-Key` header. Server checks if message with that key already exists in the conversation. If so, returns the existing response (or replays the stream). |
| `POST /attachments` | Yes | Checksum (SHA-256) dedup. If a file with the same checksum already exists in the workspace, return the existing attachment. |
| `POST /artifacts/:id/export` | Yes | If an export with the same format + options was completed in the last hour, return the existing download URL instead of re-generating. |
| `POST /jobs/:id/cancel` | Yes | Cancelling an already-cancelled job returns 200 (no-op). |
| `DELETE /conversations/:id` | Yes | Deleting an already-deleted conversation returns 200. |
| `PATCH /messages/:id` | No | Each edit creates a new version. |

**Idempotency-Key header:**
```
POST /api/messages
Idempotency-Key: msg_key_abc123
Content-Type: application/json

{ "conversation_id": "conv_123", "content": "Hello" }
```

Server stores the key with the message. If the same key is received again:
- If the original message is still streaming: reconnect the client to the existing SSE stream.
- If the original message completed: return the completed message (no re-generation).
- If the original message failed: allow retry (new generation).

### 5.6 Rate Limiting

| Scope | Limit | Window | Header |
|---|---|---|---|
| Per user — messages | 20 | 1 minute | `X-RateLimit-Remaining` |
| Per user — file uploads | 5 | 1 minute | `X-RateLimit-Remaining` |
| Per user — exports | 10 | 1 minute | `X-RateLimit-Remaining` |
| Per IP — all requests | 100 | 1 minute | `X-RateLimit-Remaining` |
| Per user — SSE connections | 3 | concurrent | — |

**Rate limit response (429):**
```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many messages. Slow down.",
    "retryable": true,
    "retry_after_seconds": 30
  }
}
```

**Headers on every response:**
```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 1718900000
```

### 5.7 Timeout Configuration

| Operation | Timeout | Behavior on timeout |
|---|---|---|
| HTTP request (non-streaming) | 30s | Return 504 Gateway Timeout |
| SSE stream (chat) | 120s per token | If no token for 120s, emit error event, close stream |
| SSE stream (events) | None (persistent) | Heartbeat every 30s, reconnect on failure |
| File upload | 60s | Return 408 Request Timeout |
| File parsing job | 120s | Job status → failed, retry if attempts remain |
| PDF export job | 60s | Job status → failed, retry if attempts remain |
| Chart render job | 30s | Job status → failed, retry if attempts remain |
| Ollama model call | 120s TTFB | Return 504, "Model is taking too long to respond" |

---

## 6. API Conventions

### 6.1 URL structure
- All API routes prefixed with `/api/`.
- Resource names are plural: `/conversations`, not `/conversation`.
- IDs are UUIDs: `/api/conversations/conv_abc123`.
- Nested resources: `/api/conversations/:id/messages` (but messages are accessed via `/api/messages` directly, with `conversation_id` in the body/query).
- Query params use snake_case: `?workspace_id=`, `?is_archived=`.
- JSON body fields use snake_case: `{ "conversation_id": "..." }`.

### 6.2 Pagination
```
GET /api/conversations?page=1&limit=20

Response:
{
  "items": [...],
  "total": 45,
  "page": 1,
  "limit": 20,
  "has_more": true
}
```

### 6.3 Filtering
```
GET /api/artifacts?type=report&status=active&workspace_id=ws_abc
```

### 6.4 Sorting
```
GET /api/conversations?sort=updated&order=desc
```
Default sort: `updated_at DESC` for most resources.

### 6.5 Versioning
- API version in URL path: `/api/v1/...` (add when breaking changes are needed).
- Phase 1: no version prefix (just `/api/`). Add `v1` when v2 is introduced.

### 6.6 CORS
```
Access-Control-Allow-Origin: <specific origins>
Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type, Idempotency-Key
Access-Control-Max-Age: 86400
```
No wildcard `*` in production. Specific origins only.

### 6.7 Response headers
```
X-Request-Id: req_abc123          (for tracing, include in logs)
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 1718900000
Content-Type: application/json     (or text/event-stream for SSE)
```

---

## 7. Phase 1 vs Phase 2 Endpoints

### Phase 1 (MVP — build these first)

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Health check |
| `GET /api/health/model` | Ollama status |
| `GET /api/users/me` | User context (stub: returns local user) |
| `GET /api/conversations` | List conversations |
| `POST /api/conversations` | Create conversation |
| `GET /api/conversations/:id` | Get conversation with messages |
| `PATCH /api/conversations/:id` | Rename, pin |
| `DELETE /api/conversations/:id` | Delete with undo |
| `POST /api/messages` | Send message (SSE stream) |
| `POST /api/messages/stop` | Stop generation |
| `POST /api/attachments` | Upload file |
| `GET /api/attachments/:id` | File metadata |
| `GET /api/attachments/:id/preview` | Parsed text |
| `GET /api/artifacts/:id` | Get artifact + render hints |
| `PATCH /api/artifacts/:id` | Edit artifact (new version) |
| `GET /api/artifacts/:id/versions` | Version history |
| `POST /api/artifacts/:id/export` | Request PDF export (async) |
| `GET /api/artifacts/:id/export/:jobId` | Poll export status |
| `GET /api/jobs/:id` | Job status |
| `GET /api/events` | SSE notification stream |

### Phase 2 (later)

| Endpoint | Purpose |
|---|---|
| `POST /api/auth/register` | User registration |
| `POST /api/auth/login` | Login |
| `POST /api/auth/refresh` | Token refresh |
| `POST /api/workspaces` | Create workspace |
| `PATCH /api/workspaces/:id` | Update workspace |
| `DELETE /api/workspaces/:id` | Delete workspace |
| `POST /api/conversations/:id/summarize` | Auto-summary |
| `POST /api/messages/:id/regenerate` | Regenerate response |
| `POST /api/attachments/:id/reparse` | Re-parse file |
| `POST /api/artifacts` | Manual artifact creation |
| `POST /api/artifacts/:id/iterate` | AI iteration |
| `PUT /api/artifacts/:id/render` | Update render hints |
| `POST /api/jobs/:id/cancel` | Cancel job |
| `GET /api/jobs` | List jobs |
| `PATCH /api/users/me` | Update preferences |
| `GET /api/users/me/usage` | Token usage |