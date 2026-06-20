# GLM Workspace — Attachment & File Ingestion System

> How files flow from the user's desktop into the AI's context.
> Upload → validate → store → parse → chunk → index → inject into chat.

---

## 1. Upload Lifecycle

### 1.1 Full Flow (UI → Backend → Storage → Worker → DB)

```
USER                    BROWSER              API GATEWAY          FILE SERVICE         OBJECT STORAGE       WORKER              POSTGRES
 │                        │                      │                    │                    │                  │                    │
 │  1. Click paperclip    │                      │                    │                    │                  │                    │
 │  2. Select file        │                      │                    │                    │                  │                    │
 │───────────────────────▶│                      │                    │                    │                  │                    │
 │                        │  3. POST /api/attachments (multipart)      │                    │                  │                    │
 │                        │─────────────────────▶│                    │                    │                  │                    │
 │                        │                      │  4. Auth + rate limit + size check       │                  │                    │
 │                        │                      │───────────────────▶│                    │                  │                    │
 │                        │                      │                    │  5. Validate MIME (magic bytes)        │                    │
 │                        │                      │                    │  6. Compute SHA-256                    │                    │
 │                        │                      │                    │  7. Check dedup (same checksum + workspace?)                  │
 │                        │                      │                    │  8. Upload to object storage           │                    │
 │                        │                      │                    │───────────────────▶│                  │                    │
 │                        │                      │                    │                    │  9. Store blob    │                    │
 │                        │                      │                    │◀───────────────────│                  │                    │
 │                        │                      │                    │ 10. Insert attachment record (status: pending)                  │
 │                        │                      │                    │──────────────────────────────────────────────────────────────▶│
 │                        │                      │                    │ 11. Decide: sync parse or async?                              │
 │                        │                      │                    │    text <500KB → sync (parse now)                             │
 │                        │                      │                    │    text >500KB or binary → queue async job                    │
 │                        │                      │                    │ 12a. SYNC: parse inline, store text_content, status=ready     │
 │                        │                      │                    │      ──────────────────────────────────────────────────────▶│
 │                        │                      │                    │ 12b. ASYNC: create gen_job (type: extract_text, status: queued)│
 │                        │                      │                    │      ──────────────────────────────────────────────────────▶│
 │                        │                      │                    │      Push job to Redis queue                                   │
 │                        │                      │                    │──────────────────────────────────────────────────────────────▶│ (Redis)
 │                        │                      │                    │ 13. Return response to client                                  │
 │                        │                      │◀───────────────────│                    │                  │                    │
 │                        │  14. Response: { id, parse_status, ... }   │                    │                  │                    │
 │                        │◀─────────────────────│                    │                    │                  │                    │
 │  15. Show chip in tray │                      │                    │                    │                  │                    │
 │      (spinner if async)│                      │                    │                    │                  │                    │
 │                        │                      │                    │                    │                  │                    │
 │                        │                      │                    │                    │  16. Worker picks job        │                    │
 │                        │                      │                    │                    │                  │  17. Download from storage     │
 │                        │                      │                    │                    │◀─────────────────│                  │
 │                        │                      │                    │                    │  18. Parse file (extract text, tables, metadata)              │
 │                        │                      │                    │                    │  19. If >10K chars: chunk into segments                       │
 │                        │                      │                    │                    │  20. Store document_content + file_chunks                    │
 │                        │                      │                    │                    │──────────────────────────────────────────────────────────────▶│
 │                        │                      │                    │                    │  21. Update attachment: status=ready                         │
 │                        │                      │                    │                    │──────────────────────────────────────────────────────────────▶│
 │                        │                      │                    │                    │  22. Publish Redis event: file:{id}:ready                    │
 │                        │                      │                    │                    │──────────────────────────────────────────────────────────────▶│ (Redis pub/sub)
 │                        │  23. SSE /api/events → file_ready event   │                    │                  │                    │
 │                        │◀─────────────────────────────────────────────────────────────────────────────────│                    │
 │  24. Chip: spinner → ✓ │                      │                    │                    │                  │                    │
 │      Send button enables│                      │                    │                    │                  │                    │
```

### 1.2 Sync vs Async Decision

```
File arrives at File Service
        │
        ├── Is it an image? (png, jpg, webp, gif)
        │   → SYNC: no text extraction needed. status=ready immediately.
        │   → Store for vision model access. is_image=true.
        │
        ├── Is it a text-based file? (txt, md, csv, json, xml, code files)
        │   ├── Size < 500KB?
        │   │   → SYNC: read file, extract text inline, store text_content.
        │   │   → status=ready in the upload response.
        │   │   → Client sees chip with ✓ immediately.
        │   └── Size > 500KB?
        │       → ASYNC: queue extract_text job.
        │       → status=processing in response.
        │       → Client sees spinner. SSE notifies when ready.
        │
        ├── Is it a structured document? (pdf, docx, xlsx)
        │   → ASYNC: always. These require library-based parsing.
        │   → Queue extract_text job.
        │   → status=processing.
        │
        └── Is it unsupported? (exe, bat, sh, bin, zip, etc.)
            → REJECT: return 415 Unsupported File Type.
            → File never stored. No record created.
```

### 1.3 Client-Side Pre-Upload Validation

Before the file even hits the server, the browser validates:

```typescript
const ALLOWED_TYPES = {
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'text/csv': ['.csv'],
  'application/json': ['.json'],
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  // Code files (text/plain or application/octet-stream, validate by extension)
  'text/x-python': ['.py'],
  'text/javascript': ['.js'],
  'text/typescript': ['.ts'],
  'text/html': ['.html'],
  'text/css': ['.css'],
  'application/xml': ['.xml'],
};

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function validateFile(file: File): { ok: boolean; reason?: string } {
  if (file.size > MAX_SIZE) {
    return { ok: false, reason: `File is too large (max 10MB).` };
  }
  // Check by extension if MIME is generic
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  const allowedExts = ['.txt', '.md', '.csv', '.json', '.xml', '.pdf', '.docx', '.xlsx',
                       '.png', '.jpg', '.jpeg', '.webp', '.gif', '.py', '.js', '.ts',
                       '.html', '.css', '.rs', '.go', '.java', '.rb', '.sh', '.sql', '.yaml', '.yml'];
  if (!allowedExts.includes(ext)) {
    return { ok: false, reason: `.${ext.slice(1)} files are not supported.` };
  }
  return { ok: true };
}
```

**Client-side validation is a convenience, not security.** The server re-validates everything.

---

## 2. Parsing Pipeline

### 2.1 Parser Selection

```
File arrives at worker
        │
        ├── Determine file type (by magic bytes, not extension)
        │
        ├── PDF  (.pdf)        → PyMuPDF (fitz)
        ├── DOCX (.docx)        → python-docx
        ├── XLSX (.xlsx)        → openpyxl
        ├── CSV  (.csv)         → Pandas (or csv stdlib for simple)
        ├── TXT  (.txt)         → Direct read (utf-8, fallback latin-1)
        ├── MD   (.md)          → Direct read (it's text)
        ├── JSON (.json)        → Direct read + json.loads for structure
        ├── XML  (.xml)         → BeautifulSoup (strip tags, keep text)
        ├── HTML (.html)        → BeautifulSoup (strip tags, keep text)
        ├── Code (.py, .js...)  → Direct read (it's text)
        ├── PNG  (.png)         → No text extraction. Store for vision.
        ├── JPEG (.jpg)         → No text extraction. Store for vision.
        ├── WEBP (.webp)        → No text extraction. Store for vision.
        └── GIF  (.gif)         → No text extraction. Store for vision.
```

### 2.2 PDF Parsing (PyMuPDF / fitz)

```python
import fitz  # PyMuPDF

def parse_pdf(storage_key: str) -> ParsedDocument:
    doc = fitz.open(stream=download_from_storage(storage_key), filetype="pdf")

    pages = []
    tables = []
    images = []
    headings = []

    for page_num, page in enumerate(doc):
        # 1. Extract plain text
        text = page.get_text("text")  # preserves reading order
        pages.append({
            "page_number": page_num + 1,
            "text": text,
            "char_count": len(text),
        })

        # 2. Extract tables (PyMuPDF has built-in table detection)
        page_tables = page.find_tables()
        for table_idx, table in enumerate(page_tables):
            rows = table.extract()  # list of lists
            if rows and len(rows) > 1:
                tables.append({
                    "page_number": page_num + 1,
                    "table_index": table_idx,
                    "headers": rows[0],
                    "rows": rows[1:],
                    "row_count": len(rows) - 1,
                })

        # 3. Extract images/figures
        page_images = page.get_images(full=True)
        for img_idx, img in enumerate(page_images):
            xref = img[0]
            base_image = doc.extract_image(xref)
            images.append({
                "page_number": page_num + 1,
                "image_index": img_idx,
                "format": base_image["ext"],
                "width": base_image.get("width"),
                "height": base_image.get("height"),
                "storage_key": f"extracted/{attachment_id}/images/p{page_num+1}_img{img_idx}.{base_image['ext']}",
                # Image bytes uploaded to object storage separately
            })

        # 4. Detect headings (font-size heuristic)
        blocks = page.get_text("dict")["blocks"]
        for block in blocks:
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    if span["size"] > 14:  # larger than body text
                        heading_text = span["text"].strip()
                        if heading_text and len(heading_text) < 100:
                            headings.append({
                                "page_number": page_num + 1,
                                "text": heading_text,
                                "font_size": span["size"],
                                "level": "h1" if span["size"] > 18 else "h2",
                            })

    # 5. Extract document metadata
    metadata = doc.metadata or {}
    doc_metadata = {
        "title": metadata.get("title"),
        "author": metadata.get("author"),
        "subject": metadata.get("subject"),
        "creator": metadata.get("creator"),
        "page_count": len(doc),
        "creation_date": metadata.get("creationDate"),
        "modification_date": metadata.get("modDate"),
    }

    # 6. Build full text with page markers
    full_text = ""
    for page in pages:
        full_text += f"\n[Page {page['page_number']}]\n{page['text']}\n"

    return ParsedDocument(
        raw_text=full_text,
        text_char_count=len(full_text),
        pages=pages,
        tables=tables,
        images=images,
        headings=headings,
        metadata=doc_metadata,
    )
```

### 2.3 DOCX Parsing (python-docx)

```python
from docx import Document

def parse_docx(storage_key: str) -> ParsedDocument:
    doc = Document(stream=download_from_storage(storage_key))

    paragraphs = []
    tables = []
    headings = []

    # 1. Extract paragraphs with style info
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue
        style_name = para.style.name if para.style else "Normal"
        if "Heading" in style_name:
            level = style_name.replace("Heading ", "").strip()
            headings.append({
                "text": text,
                "level": f"h{level}" if level.isdigit() else "h2",
                "paragraph_index": len(paragraphs),
            })
        paragraphs.append(text)

    # 2. Extract tables
    for table_idx, table in enumerate(doc.tables):
        rows = []
        for row in table.rows:
            rows.append([cell.text.strip() for cell in row.cells])
        if rows:
            tables.append({
                "table_index": table_idx,
                "headers": rows[0],
                "rows": rows[1:],
                "row_count": len(rows) - 1,
            })

    # 3. Extract images
    images = []
    for rel in doc.part.rels.values():
        if "image" in rel.reltype:
            blob = rel.target_part.blob
            images.append({
                "format": rel.target_part.content_type.split("/")[-1],
                "size_bytes": len(blob),
                "storage_key": f"extracted/{attachment_id}/images/img_{len(images)}.{rel.target_part.content_type.split('/')[-1]}",
            })

    # 4. Extract metadata
    core_props = doc.core_properties
    doc_metadata = {
        "title": core_props.title,
        "author": core_props.author,
        "subject": core_props.subject,
        "created": str(core_props.created) if core_props.created else None,
        "modified": str(core_props.modified) if core_props.modified else None,
        "paragraph_count": len(paragraphs),
    }

    full_text = "\n\n".join(paragraphs)

    return ParsedDocument(
        raw_text=full_text,
        text_char_count=len(full_text),
        pages=[{"page_number": 1, "text": full_text, "char_count": len(full_text)}],
        tables=tables,
        images=images,
        headings=headings,
        metadata=doc_metadata,
    )
```

### 2.4 XLSX Parsing (openpyxl)

```python
from openpyxl import load_workbook

def parse_xlsx(storage_key: str) -> ParsedDocument:
    wb = load_workbook(filename=download_from_storage(storage_key), data_only=True)

    sheets = []
    tables = []
    full_text_parts = []

    for sheet_idx, sheet_name in enumerate(wb.sheetnames):
        ws = wb[sheet_name]

        # 1. Extract all rows
        rows = []
        for row in ws.iter_rows(values_only=True):
            rows.append([str(cell) if cell is not None else "" for cell in row])

        if not rows:
            continue

        # 2. First row is likely headers
        headers = rows[0]
        data_rows = rows[1:]

        # 3. Create table artifact
        tables.append({
            "sheet_name": sheet_name,
            "headers": headers,
            "rows": data_rows,
            "row_count": len(data_rows),
            "column_count": len(headers),
        })

        # 4. Build text representation for AI context
        text = f"[Sheet: {sheet_name}]\n"
        text += ",".join(str(h) for h in headers) + "\n"
        for row in data_rows[:100]:  # limit to 100 rows for text
            text += ",".join(str(c) for c in row) + "\n"
        if len(data_rows) > 100:
            text += f"... ({len(data_rows) - 100} more rows)\n"
        full_text_parts.append(text)

        sheets.append({
            "name": sheet_name,
            "row_count": len(data_rows),
            "column_count": len(headers),
        })

    doc_metadata = {
        "sheet_names": wb.sheetnames,
        "sheet_count": len(wb.sheetnames),
        "total_rows": sum(s["row_count"] for s in sheets),
    }

    full_text = "\n\n".join(full_text_parts)

    return ParsedDocument(
        raw_text=full_text,
        text_char_count=len(full_text),
        pages=[{"page_number": s_idx + 1, "text": full_text_parts[s_idx], "char_count": len(full_text_parts[s_idx])}]
               for s_idx in range(len(full_text_parts))),
        tables=tables,
        images=[],
        headings=[],
        metadata=doc_metadata,
    )
```

### 2.5 CSV Parsing (Pandas)

```python
import pandas as pd
import io

def parse_csv(storage_key: str) -> ParsedDocument:
    content = download_from_storage(storage_key)
    df = pd.read_csv(io.BytesIO(content))

    # 1. Extract column info
    columns = []
    for col in df.columns:
        dtype = str(df[col].dtype)
        col_type = "number" if "int" in dtype or "float" in dtype else "text"
        columns.append({"name": col, "type": col_type, "dtype": dtype})

    # 2. Extract rows (limit for text representation)
    rows = df.head(500).fillna("").values.tolist()
    all_rows = df.values.tolist()

    # 3. Build text for AI context
    text = ",".join(df.columns) + "\n"
    for row in rows[:100]:
        text += ",".join(str(c) for c in row) + "\n"
    if len(rows) > 100:
        text += f"... ({len(all_rows) - 100} more rows)\n"

    # 4. Summary stats
    stats = {}
    for col in df.select_dtypes(include="number").columns:
        stats[col] = {
            "min": float(df[col].min()),
            "max": float(df[col].max()),
            "mean": float(df[col].mean()),
            "median": float(df[col].median()),
        }

    doc_metadata = {
        "columns": [c["name"] for c in columns],
        "row_count": len(df),
        "column_count": len(df.columns),
        "delimiter": ",",
        "has_header": True,
        "numeric_columns": list(df.select_dtypes(include="number").columns),
        "stats": stats,
    }

    return ParsedDocument(
        raw_text=text,
        text_char_count=len(text),
        pages=[{"page_number": 1, "text": text, "char_count": len(text)}],
        tables=[{
            "headers": list(df.columns),
            "rows": all_rows,
            "row_count": len(all_rows),
            "column_count": len(df.columns),
        }],
        images=[],
        headings=[],
        metadata=doc_metadata,
    )
```

### 2.6 Text / Markdown / Code Parsing

```python
def parse_text(storage_key: str, filename: str) -> ParsedDocument:
    content = download_from_storage(storage_key)

    # Try UTF-8, fall back to latin-1
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    # Detect language (simple heuristic)
    language = detect_language(text)

    # For markdown: extract headings
    headings = []
    if filename.endswith(".md"):
        for line in text.split("\n"):
            if line.startswith("#"):
                level = len(line) - len(line.lstrip("#"))
                heading_text = line.lstrip("# ").strip()
                if heading_text:
                    headings.append({"text": heading_text, "level": f"h{min(level, 6)}"})

    # For code: detect language, extract functions/imports
    structure = {}
    if is_code_file(filename):
        ext = filename.split(".")[-1]
        structure = {
            "language": CODE_LANG_MAP.get(ext, "text"),
            "line_count": text.count("\n") + 1,
            "char_count": len(text),
        }
        # Extract function/class names (regex per language)
        structure["functions"] = extract_functions(text, ext)
        structure["imports"] = extract_imports(text, ext)

    return ParsedDocument(
        raw_text=text,
        text_char_count=len(text),
        pages=[{"page_number": 1, "text": text, "char_count": len(text)}],
        tables=[],
        images=[],
        headings=headings,
        metadata=structure,
    )
```

### 2.7 Image Handling

Images are NOT parsed for text. They are stored for vision model access.

```python
def handle_image(storage_key: str, mime_type: str) -> ParsedDocument:
    # Get image dimensions
    from PIL import Image
    img = Image.open(download_from_storage(storage_key))

    return ParsedDocument(
        raw_text=None,                    # no text
        text_char_count=0,
        content_type="image_ref",
        pages=[],
        tables=[],
        images=[{
            "format": mime_type.split("/")[-1],
            "width": img.width,
            "height": img.height,
            "has_alpha": img.mode in ("RGBA", "LA"),
            "storage_key": storage_key,   # original file location
        }],
        headings=[],
        metadata={
            "width": img.width,
            "height": img.height,
            "format": mime_type,
            "mode": img.mode,
        },
    )
```

**How images reach the model:**
- When a user attaches an image and sends a message, the chat service:
  1. Retrieves the image from object storage.
  2. Encodes it as base64.
  3. Sends it to Ollama's `/api/chat` endpoint with `images: [base64_string]` in the message.
  4. The model (if vision-capable) processes the image alongside the text prompt.
- If the model is NOT vision-capable, the image is described by filename only: `[Image: filename.png, {width}x{height}]`.

---

## 3. Chunking Strategy

### 3.1 When to Chunk

```
Parsed text ready
        │
        ├── text_char_count < 10,000?
        │   → No chunking. Store full text in document_content.raw_text.
        │   → Inject full text into chat context.
        │
        └── text_char_count > 10,000?
            → Chunk into segments.
            → Store chunks in file_chunks table.
            → Generate embeddings for each chunk (async job).
            → For chat: use semantic search to find relevant chunks.
```

### 3.2 Chunking Algorithm

```python
def chunk_text(text: str, target_chars: int = 2000, overlap: int = 200) -> list[Chunk]:
    """
    Split text into overlapping chunks.

    Strategy:
    1. Try to split on paragraph boundaries (\n\n).
    2. If a paragraph is > target_chars, split on sentence boundaries (. ).
    3. If a sentence is > target_chars, split on character count.
    4. Each chunk overlaps the next by `overlap` chars for context continuity.
    """
    chunks = []
    paragraphs = text.split("\n\n")

    current_chunk = ""
    current_section = ""
    chunk_index = 0

    for para in paragraphs:
        # Track section heading (if paragraph is a heading)
        if para.strip().startswith("#"):
            current_section = para.strip().split("\n")[0].lstrip("# ").strip()

        # If adding this paragraph fits within target
        if len(current_chunk) + len(para) + 2 <= target_chars:
            current_chunk += para + "\n\n"
        else:
            # Save current chunk
            if current_chunk.strip():
                chunks.append(Chunk(
                    chunk_index=chunk_index,
                    content=current_chunk.strip(),
                    char_count=len(current_chunk.strip()),
                    token_estimate=len(current_chunk.strip()) // 4,  # rough estimate
                    section_heading=current_section or None,
                ))
                chunk_index += 1

            # Start new chunk with overlap
            if overlap > 0 and len(current_chunk) > overlap:
                overlap_text = current_chunk[-overlap:]
                current_chunk = overlap_text + "\n\n" + para + "\n\n"
            else:
                current_chunk = para + "\n\n"

    # Don't forget the last chunk
    if current_chunk.strip():
        chunks.append(Chunk(
            chunk_index=chunk_index,
            content=current_chunk.strip(),
            char_count=len(current_chunk.strip()),
            token_estimate=len(current_chunk.strip()) // 4,
            section_heading=current_section or None,
        ))

    return chunks
```

### 3.3 Chunking by File Type

| File type | Chunking strategy | Target size | Overlap |
|---|---|---|---|
| PDF | Split by page, then by paragraph within page | 2000 chars | 200 chars |
| DOCX | Split by heading, then by paragraph | 2000 chars | 200 chars |
| XLSX | One chunk per sheet (if <2000 chars), else split by row ranges | 2000 chars | 50 rows |
| CSV | Split by row ranges (100 rows per chunk) | 2000 chars | 10 rows |
| TXT/MD | Split by heading (MD) or paragraph (TXT) | 2000 chars | 200 chars |
| Code | Split by function/class boundary | 2000 chars | 0 (no overlap for code) |

### 3.4 Embedding Generation

```python
def generate_embeddings(chunks: list[Chunk], model: str = "nomic-embed-text") -> list[Chunk]:
    """
    Call Ollama /api/embeddings for each chunk.
    Batch up to 10 chunks per request for efficiency.
    """
    for chunk in chunks:
        response = requests.post(f"{OLLAMA_HOST}/api/embeddings", json={
            "model": model,
            "prompt": chunk.content,
        })
        chunk.embedding = response.json()["embedding"]
    return chunks
```

**Embedding model:** `nomic-embed-text` (768 dimensions) via Ollama. Stored in `file_chunks.embedding` (pgvector).

---

## 4. Extracted Data Model

### 4.1 What Gets Extracted Per File Type

```
┌──────────┬──────┬────────┬────────┬─────────┬──────────┬───────────────┬──────────┐
│ File     │ Text │ Tables │ Images │ Headings│ Pages    │ Metadata      │ Chunks?  │
├──────────┼──────┼────────┼────────┼─────────┼──────────┼───────────────┼──────────┤
│ PDF      │ ✅   │ ✅     │ ✅     │ ✅      │ ✅ (per  │ title, author │ if >10K  │
│          │      │        │        │ (font)  │  page)   │ page_count    │  chars   │
├──────────┼──────┼────────┼────────┼─────────┼──────────┼───────────────┼──────────┤
│ DOCX     │ ✅   │ ✅     │ ✅     │ ✅      │ ❌       │ title, author │ if >10K  │
│          │      │        │        │ (style) │          │ created date  │  chars   │
├──────────┼──────┼────────┼────────┼─────────┼──────────┼───────────────┼──────────┤
│ XLSX     │ ✅   │ ✅     │ ❌     │ ❌      │ ✅ (per  │ sheet_names   │ if >10K  │
│          │(CSV) │ (per   │        │         │  sheet)  │ row/column    │  chars   │
│          │      │ sheet) │        │         │          │ counts       │          │
├──────────┼──────┼────────┼────────┼─────────┼──────────┼───────────────┼──────────┤
│ CSV      │ ✅   │ ✅     │ ❌     │ ❌      │ ❌       │ columns,      │ if >10K  │
│          │(CSV) │        │        │         │          │ row_count,    │  chars   │
│          │      │        │        │         │          │ stats         │          │
├──────────┼──────┼────────┼────────┼─────────┼──────────┼───────────────┼──────────┤
│ TXT      │ ✅   │ ❌     │ ❌     │ ❌      │ ❌       │ line_count    │ if >10K  │
│          │      │        │        │         │          │ encoding      │  chars   │
├──────────┼──────┼────────┼────────┼─────────┼──────────┼───────────────┼──────────┤
│ MD       │ ✅   │ ❌     │ ❌     │ ✅      │ ❌       │ heading list  │ if >10K  │
│          │      │        │        │ (#)     │          │ word_count    │  chars   │
├──────────┼──────┼────────┼────────┼─────────┼──────────┼───────────────┼──────────┤
│ Code     │ ✅   │ ❌     │ ❌     │ ❌      │ ❌       │ language,     │ if >10K  │
│          │      │        │        │         │          │ functions,   │  chars   │
│          │      │        │        │         │          │ imports       │          │
├──────────┼──────┼────────┼────────┼─────────┼──────────┼───────────────┼──────────┤
│ JSON     │ ✅   │ ❌     │ ❌     │ ❌      │ ❌       │ top-level keys │ if >10K  │
│          │      │        │        │         │          │ depth, array  │  chars   │
│          │      │        │        │         │          │ lengths       │          │
├──────────┼──────┼────────┼────────┼─────────┼──────────┼───────────────┼──────────┤
│ Image    │ ❌   │ ❌     │ ✅     │ ❌      │ ❌       │ width, height │ ❌       │
│          │      │        │        │         │          │ format, mode  │          │
└──────────┴──────┴────────┴────────┴─────────┴──────────┴───────────────┴──────────┘
```

### 4.2 document_content Record (Post-Extraction)

```json
{
  "id": "doc_abc",
  "attachment_id": "att_001",
  "content_type": "structured",
  "raw_text": "[Page 1]\nIntroduction\n\nThis report covers Q3 2024...",
  "text_encoding": "utf-8",
  "text_char_count": 45230,
  "language": "en",
  "is_chunked": true,
  "chunk_count": 23,
  "structure": {
    "headings": [
      { "text": "Introduction", "level": "h1", "page_number": 1 },
      { "text": "Methodology", "level": "h2", "page_number": 3 },
      { "text": "Results", "level": "h2", "page_number": 7 }
    ],
    "page_count": 12,
    "has_tables": true,
    "has_images": true,
    "tables": [
      {
        "page_number": 5,
        "table_index": 0,
        "headers": ["Product", "Revenue", "Growth"],
        "rows": [["Widget A", "45000", "12%"]],
        "row_count": 8
      }
    ],
    "images": [
      {
        "page_number": 2,
        "image_index": 0,
        "format": "png",
        "width": 800,
        "height": 600,
        "storage_key": "extracted/att_001/images/p2_img0.png"
      }
    ]
  },
  "metadata": {
    "title": "Q3 2024 Annual Report",
    "author": "Jane Doe",
    "page_count": 12,
    "creation_date": "2024-01-15"
  }
}
```

### 4.3 file_chunks Records

```json
[
  {
    "id": "chunk_001",
    "attachment_id": "att_001",
    "chunk_index": 0,
    "content": "[Page 1]\nIntroduction\n\nThis report covers Q3 2024 performance...",
    "char_count": 1850,
    "token_estimate": 462,
    "embedding": [0.012, -0.034, ...],  // 768-dim vector
    "section_heading": "Introduction",
    "page_number": 1
  },
  {
    "id": "chunk_002",
    "attachment_id": "att_001",
    "chunk_index": 1,
    "content": "...overlap from previous... Methodology\n\nWe used...",
    "char_count": 1920,
    "token_estimate": 480,
    "embedding": [0.008, -0.041, ...],
    "section_heading": "Methodology",
    "page_number": 3
  }
]
```

---

## 5. How Parsed Content Becomes Queryable in Chat

### 5.1 Small Files (<10K chars) — Full Injection

When the user sends a message with an attached small file, the **entire file content** is injected into the prompt:

```python
def build_message_with_attachments(user_text: str, attachments: list[Attachment]) -> str:
    file_parts = []
    for att in attachments:
        doc = get_document_content(att.id)

        if att.is_image:
            # Images are sent separately via Ollama's images field
            file_parts.append(f"[Image: {att.filename}]")
        elif doc and doc.raw_text:
            # Inject full text
            file_parts.append(f"""
--- Attached File: {att.filename} ---
Type: {att.mime_type}
Characters: {doc.text_char_count}
{structure_summary(doc)}

{doc.raw_text}
--- End of File: {att.filename} ---""")
        else:
            file_parts.append(f"[File: {att.filename} — content not yet available]")

    return user_text + "\n" + "\n".join(file_parts)
```

**Result sent to Ollama:**
```
Analyze this CSV and create a summary report

--- Attached File: q3_revenue.csv ---
Type: text/csv
Characters: 4567
Structure: 150 rows, 3 columns (Product, Revenue, Growth)

Product,Revenue,Growth
Widget A,45000,12%
Widget B,38000,-5%
...
--- End of File: q3_revenue.csv ---
```

### 5.2 Large Files (>10K chars) — Semantic Search + Context Injection

When the file is too large to fit in context, use **retrieval-augmented generation (RAG)**:

```python
def build_message_with_large_file(user_text: str, attachment: Attachment) -> str:
    # 1. Embed the user's question
    question_embedding = ollama_embed(user_text)

    # 2. Find top-K most relevant chunks
    chunks = db.query("""
        SELECT id, content, section_heading, page_number,
               embedding <=> :query_vec AS distance
        FROM file_chunks
        WHERE attachment_id = :att_id
        ORDER BY embedding <=> :query_vec
        LIMIT 5
    """, query_vec=question_embedding, att_id=attachment.id)

    # 3. Build context from relevant chunks
    chunk_text = "\n\n".join([
        f"[{c.section_heading or 'Section'}, Page {c.page_number or '?'}]\n{c.content}"
        for c in chunks
    ])

    # 4. Include file summary
    doc = get_document_content(attachment.id)
    summary = f"File: {attachment.filename}, {doc.text_char_count} chars, {doc.chunk_count} sections"

    return f"""{user_text}

--- Context from {attachment.filename} ---
{summary}

Most relevant sections:
{chunk_text}
--- End of context ---"""
```

### 5.3 Tables — Structured Injection

When a file contains tables, inject them in a structured format the model can understand:

```python
def format_tables_for_context(tables: list[Table]) -> str:
    parts = []
    for table in tables:
        header = " | ".join(str(h) for h in table["headers"])
        separator = " | ".join("---" for _ in table["headers"])
        rows = [" | ".join(str(c) for c in row) for row in table["rows"][:20]]  # limit rows
        markdown_table = f"\n{header}\n{separator}\n" + "\n".join(rows)
        if len(table["rows"]) > 20:
            markdown_table += f"\n... ({len(table['rows']) - 20} more rows)"
        parts.append(markdown_table)
    return "\n".join(parts)
```

### 5.4 Images — Vision Model Injection

```python
def build_chat_request_with_images(user_text: str, attachments: list[Attachment]) -> dict:
    images = []
    text_parts = [user_text]

    for att in attachments:
        if att.is_image:
            # Download image, encode as base64
            image_bytes = download_from_storage(att.storage_key)
            image_b64 = base64.b64encode(image_bytes).decode()
            images.append(image_b64)
        else:
            # Inject text content (see 5.1/5.2)
            text_parts.append(build_file_injection(att))

    return {
        "model": "glm-5.2:cloud",
        "messages": [
            { "role": "system", "content": SYSTEM_PROMPT },
            { "role": "user", "content": "\n".join(text_parts), "images": images if images else None }
        ],
        "stream": True
    }
```

### 5.5 Context Budget Management

```
Total context budget: 128,000 tokens (glm-5.2:cloud)

Allocation:
  - System prompt:        ~500 tokens
  - Conversation history:  ~50,000 tokens (last 20 messages)
  - File content:          ~70,000 tokens (remaining budget)
  - User message:          ~2,000 tokens
  - Response space:        ~5,000 tokens

If file content > 70K tokens:
  → Use RAG (semantic search) to select relevant chunks
  → Inject only top-5 chunks (~10K tokens)
  → Include file summary + structure metadata

If file content < 70K tokens:
  → Inject full text
  → No chunking needed for this message
```

---

## 6. Error Handling

### 6.1 Upload Errors

| Error | When | HTTP | User sees |
|---|---|---|---|
| `FILE_TOO_LARGE` | Size > 10MB | 413 | Toast: "filename is too large (max 10MB)." |
| `UNSUPPORTED_FILE_TYPE` | Extension/MIME not allowed | 415 | Toast: ".exe files are not supported." |
| `MIME_MISMATCH` | Extension says .pdf but magic bytes say .txt | 415 | Toast: "This file appears to be a text file, not a PDF." |
| `UPLOAD_FAILED` | Object storage error | 500 | Toast: "Upload failed. [Retry]" |
| `DUPLICATE_FILE` | Same checksum exists in workspace | 200 | Returns existing attachment (not an error — dedup) |
| `VIRUS_DETECTED` | ClamAV scan positive (phase 2) | 422 | Toast: "This file contains a threat and was rejected." |

### 6.2 Parse Errors

| Error | When | Behavior | Recovery |
|---|---|---|---|
| `PARSE_TIMEOUT` | Parsing > 120s | Job status → failed, retry 3x | Auto-retry with backoff |
| `CORRUPT_PDF` | PyMuPDF can't open file | Job status → failed (non-retryable) | User sees: "Couldn't read this PDF. It may be corrupted." |
| `CORRUPT_DOCX` | python-docx can't open | Job status → failed (non-retryable) | User sees: "Couldn't read this DOCX. It may be corrupted." |
| `CORRUPT_XLSX` | openpyxl can't open | Job status → failed (non-retryable) | User sees: "Couldn't read this spreadsheet." |
| `ENCODING_ERROR` | Can't decode text file | Fall back to latin-1, log warning | Silent recovery (text may have garbled chars) |
| `PASSWORD_PROTECTED` | PDF/DOCX is encrypted | Job status → failed (non-retryable) | User sees: "This file is password-protected. Remove the password and try again." |
| `EMPTY_FILE` | File has 0 bytes or no extractable text | status → ready, text_content = "" | User sees: "This file appears to be empty." |
| `PARTIAL_PARSE` | Some pages/sections parsed, some failed | status → ready with partial content + parse_warning | User sees: "⚠️ Partially parsed. Some sections may be missing." |
| `OOM_KILLED` | Worker runs out of memory (huge PDF) | Job status → failed, retry with smaller batch | Auto-retry with page-batch mode |

### 6.3 Partial Parse Failure Handling

```python
def parse_pdf_with_recovery(storage_key: str) -> ParsedDocument:
    doc = fitz.open(stream=download_from_storage(storage_key))
    pages = []
    errors = []

    for page_num, page in enumerate(doc):
        try:
            text = page.get_text("text")
            pages.append({"page_number": page_num + 1, "text": text, "char_count": len(text)})
        except Exception as e:
            errors.append({"page_number": page_num + 1, "error": str(e)})
            pages.append({"page_number": page_num + 1, "text": "", "char_count": 0, "error": str(e)})
            continue  # don't fail the whole document

    full_text = "\n".join(p["text"] for p in pages if p["text"])

    return ParsedDocument(
        raw_text=full_text,
        text_char_count=len(full_text),
        pages=pages,
        parse_warnings=errors if errors else None,
        status="ready" if not errors else "ready_with_warnings",
    )
```

**Client behavior for partial parse:**
- Attachment chip shows ⚠️ (warning, not error).
- Tooltip: "Partially parsed. 2 of 12 pages had issues."
- File content is still injected into chat (what was successfully parsed).
- User can choose to proceed or remove the file.

### 6.4 Large File Behavior

| File size | Behavior |
|---|---|
| < 500KB (text) | Sync parse. Full text in response. |
| 500KB – 5MB (text) | Async parse. Full text stored in document_content. |
| 5MB – 10MB (text) | Async parse. Text chunked. Chunks stored in file_chunks. |
| < 10MB (PDF/DOCX) | Async parse. Text extracted + chunked if >10K chars. |
| > 10MB | **Rejected at upload.** Max file size is 10MB. |

**Memory-safe parsing for large PDFs:**

```python
def parse_large_pdf(storage_key: str, attachment_id: str):
    """Parse PDF in page batches to avoid OOM."""
    doc = fitz.open(stream=download_from_storage(storage_key))
    total_pages = len(doc)
    batch_size = 50  # pages per batch

    all_chunks = []

    for start in range(0, total_pages, batch_size):
        end = min(start + batch_size, total_pages)
        batch_text = ""

        for page_num in range(start, end):
            page = doc[page_num]
            batch_text += f"\n[Page {page_num + 1}]\n{page.get_text('text')}\n"

        # Chunk this batch
        chunks = chunk_text(batch_text, target_chars=2000, overlap=200)
        for chunk in chunks:
            chunk.attachment_id = attachment_id
        all_chunks.extend(chunks)

        # Free memory between batches
        del batch_text

    # Store all chunks
    db.bulk_insert_file_chunks(all_chunks)

    # Generate embeddings (async, separate job)
    queue_job("embed_chunks", {"attachment_id": attachment_id})
```

### 6.5 Unsupported File Handling

```
File arrives at server
        │
        ├── Extension in allowlist?
        │   ├── Yes → proceed
        │   └── No → return 415, "This file type is not supported."
        │
        ├── Magic bytes match extension?
        │   ├── Yes → proceed
        │   └── No → return 415, "File content doesn't match extension."
        │
        ├── File is password-protected?
        │   ├── Yes → return 422, "Password-protected files are not supported."
        │   └── No → proceed
        │
        ├── File is empty (0 bytes)?
        │   ├── Yes → return 422, "This file is empty."
        │   └── No → proceed
        │
        └── File is a zip/archive?
            ├── Yes → return 415, "Archive files are not supported. Extract and upload individual files."
            └── No → proceed with parsing
```

**Explicitly unsupported:**
- Executables: `.exe`, `.bat`, `.sh`, `.cmd`, `.app`
- Archives: `.zip`, `.tar`, `.gz`, `.rar`, `.7z`
- System files: `.dll`, `.so`, `.dylib`, `.bin`
- Disk images: `.dmg`, `.iso`, `.img`
- Other: `.sqlite`, `.db` (binary database files)

---

## 7. Performance Notes

### 7.1 Timing Benchmarks

| Operation | File size | Typical time | Max time |
|---|---|---|---|
| Upload (network) | 1MB | 0.5s | 5s |
| Upload (network) | 10MB | 3s | 15s |
| Sync parse (text) | 100KB | 50ms | 200ms |
| Sync parse (text) | 500KB | 200ms | 1s |
| Async parse (PDF) | 1MB / 10 pages | 2s | 10s |
| Async parse (PDF) | 5MB / 50 pages | 8s | 30s |
| Async parse (PDF) | 10MB / 200 pages | 20s | 60s |
| Async parse (DOCX) | 1MB | 1s | 5s |
| Async parse (XLSX) | 1MB | 2s | 10s |
| Async parse (CSV) | 1MB | 500ms | 2s |
| Chunking | 50K chars | 100ms | 500ms |
| Chunking | 500K chars | 1s | 3s |
| Embedding (per chunk) | 2K chars | 200ms | 1s |
| Embedding (50 chunks) | — | 10s | 30s |
| Semantic search | — | 50ms | 200ms |

### 7.2 Optimization Strategies

**Upload optimization:**
- **Presigned PUT URLs:** Client uploads directly to object storage, bypassing the API server. Reduces API server bandwidth and latency.
  ```
  1. Client: POST /api/attachments/presign { filename, mime_type, size }
  2. Server: returns { presigned_url, attachment_id }
  3. Client: PUT presigned_url (file bytes)
  4. Client: POST /api/attachments/confirm { attachment_id }
  5. Server: verifies upload, creates record, queues parse job
  ```
- **Chunked upload:** For files >5MB, use multipart upload to S3/MinIO. Resumable if network drops.

**Parse optimization:**
- **Batch page parsing:** For large PDFs, parse in batches of 50 pages to avoid OOM.
- **Lazy table extraction:** Only extract tables if the user asks about them or if the file is small. For large PDFs, skip table extraction in the initial parse and do it on-demand.
- **Cache parsed content:** Once parsed, the result is cached in `document_content`. Re-parsing only happens on explicit `reparse` request.

**Embedding optimization:**
- **Batch embedding:** Send 10 chunks per Ollama `/api/embeddings` call (if the API supports batching). Otherwise, parallelize with `asyncio.gather`.
- **Lazy embedding:** Only generate embeddings when the file is first used in a chat message (not on upload). Saves compute for files that are uploaded but never referenced.
- **Embedding cache:** If a chunk's content hasn't changed (same checksum), reuse the existing embedding.

**Context injection optimization:**
- **Pre-compute injection text:** When a file is attached to a message, pre-compute the injection text once and cache it. Don't re-read the file on every message in the conversation.
- **Truncate smartly:** If injecting full text would exceed context budget, inject: file summary + structure metadata + top-5 relevant chunks (via semantic search).
- **Compress tables:** For large tables, inject column headers + first 20 rows + summary stats. Don't inject all 10,000 rows.

### 7.3 Worker Sizing

| Worker type | Concurrency | CPU | Memory | Reason |
|---|---|---|---|---|
| file_processor | 4 | 2 cores | 2GB | PDF parsing is CPU-bound, can spike memory |
| pdf_generator | 2 | 1 core | 4GB | WeasyPrint is memory-heavy |
| embed_worker | 4 | 1 core | 1GB | I/O-bound (calls Ollama), low memory |
| chart_renderer | 2 | 1 core | 2GB | Canvas rendering needs memory |

**Auto-scaling rule:** If queue depth > 10 jobs for > 30 seconds, spin up an additional worker. Scale down when queue is empty for 5 minutes.

### 7.4 Storage Cleanup

| Data | Location | Retention | Cleanup trigger |
|---|---|---|---|
| Original file blob | Object storage | Until attachment deleted | Cascade on conversation/message delete |
| Extracted images | Object storage | Until attachment deleted | Cascade |
| Exported files | Object storage | 30 days | Lifecycle policy or job cleanup |
| document_content | PostgreSQL | Until attachment deleted | Cascade |
| file_chunks | PostgreSQL | Until attachment deleted | Cascade |
| Temp parse files | Worker filesystem | 1 hour | Worker cleanup after job completes |

### 7.5 Monitoring

| Metric | Alert threshold |
|---|---|
| Parse job queue depth | > 20 jobs waiting |
| Parse job failure rate | > 5% of jobs |
| Average parse time (PDF) | > 30s |
| Average parse time (DOCX) | > 10s |
| Worker memory usage | > 80% |
| Object storage errors | > 1% of operations |
| Embedding generation failures | > 2% |

---

## 8. Status Tracking Summary

### 8.1 Attachment Status Flow

```
┌─────────┐  upload complete  ┌─────────────┐  parse starts  ┌─────────────┐
│ pending │─────────────────▶│ processing  │──────────────▶│ processing  │
└─────────┘                  └─────────────┘               └──────┬──────┘
                                                                   │
                                                    ┌──────────────┼──────────────┐
                                                    │              │              │
                                               parse succeeds  parse fails   partial parse
                                                    │              │              │
                                                    ▼              ▼              ▼
                                              ┌─────────┐  ┌─────────┐  ┌───────────────┐
                                              │  ready  │  │ failed  │  │ ready (warn)  │
                                              └─────────┘  └─────────┘  └───────────────┘
                                                                   │
                                                              user retries
                                                                   │
                                                                   ▼
                                                           ┌─────────────┐
                                                           │ processing  │ (re-parse)
                                                           └─────────────┘
```

### 8.2 Client-Side Status Display

| Status | Chip appearance | Send button | Tooltip |
|---|---|---|---|
| `pending` | Spinner + filename | Disabled | "Uploading…" |
| `processing` | Spinner + filename | Disabled | "Reading file…" |
| `ready` | ✓ icon + filename | Enabled | "Ready — content will be sent to GLM-5.2" |
| `ready` (with warnings) | ⚠️ icon + filename | Enabled | "Partially parsed. Some sections may be missing." |
| `failed` | ⚠️ red + filename | Enabled (file excluded) | "Couldn't read this file. [Remove] [Retry]" |

### 8.3 SSE Events for Status Changes

```
event: file_uploading
data: {"attachment_id": "att_001", "filename": "report.pdf", "status": "pending"}

event: file_processing
data: {"attachment_id": "att_001", "status": "processing", "parse_job_id": "job_abc"}

event: file_ready
data: {"attachment_id": "att_001", "status": "ready", "char_count": 45230, "chunk_count": 23, "has_tables": true}

event: file_ready_with_warnings
data: {"attachment_id": "att_001", "status": "ready", "warnings": [{"page": 5, "error": "Table extraction failed"}], "char_count": 42000}

event: file_failed
data: {"attachment_id": "att_001", "status": "failed", "error_code": "CORRUPT_PDF", "error_message": "File appears to be corrupted"}
```

---

## 9. File Type Support Matrix

| Extension | MIME type | Parse method | Sync/Async | Text | Tables | Images | Chunks | Notes |
|---|---|---|---|---|---|---|---|---|
| `.pdf` | application/pdf | PyMuPDF | Async | ✅ | ✅ | ✅ | if >10K | Password-protected rejected |
| `.docx` | application/vnd...wordprocessingml | python-docx | Async | ✅ | ✅ | ✅ | if >10K | .doc (old format) not supported |
| `.xlsx` | application/vnd...spreadsheetml | openpyxl | Async | ✅ | ✅ | ❌ | if >10K | One table per sheet |
| `.csv` | text/csv | Pandas | Sync <500KB / Async >500KB | ✅ | ✅ | ❌ | if >10K | Auto-detect delimiter |
| `.txt` | text/plain | Direct read | Sync <500KB / Async >500KB | ✅ | ❌ | ❌ | if >10K | UTF-8 + latin-1 fallback |
| `.md` | text/markdown | Direct read | Sync <500KB / Async >500KB | ✅ | ❌ | ❌ | if >10K | Headings extracted |
| `.json` | application/json | Direct read + parse | Sync <500KB / Async >500KB | ✅ | ❌ | ❌ | if >10K | Structure metadata |
| `.xml` | application/xml | BeautifulSoup | Sync <500KB / Async >500KB | ✅ | ❌ | ❌ | if >10K | Tags stripped |
| `.html` | text/html | BeautifulSoup | Sync <500KB / Async >500KB | ✅ | ❌ | ❌ | if >10K | Tags stripped |
| `.py` | text/x-python | Direct read | Sync | ✅ | ❌ | ❌ | if >10K | Functions/imports extracted |
| `.js` | text/javascript | Direct read | Sync | ✅ | ❌ | ❌ | if >10K | Functions/imports extracted |
| `.ts` | text/typescript | Direct read | Sync | ✅ | ❌ | ❌ | if >10K | Functions/imports extracted |
| `.rs` | text/rust | Direct read | Sync | ✅ | ❌ | ❌ | if >10K | Functions/imports extracted |
| `.go` | text/go | Direct read | Sync | ✅ | ❌ | ❌ | if >10K | Functions/imports extracted |
| `.java` | text/java | Direct read | Sync | ✅ | ❌ | ❌ | if >10K | Functions/imports extracted |
| `.sql` | application/sql | Direct read | Sync | ✅ | ❌ | ❌ | if >10K | — |
| `.yaml` | text/yaml | Direct read | Sync | ✅ | ❌ | ❌ | if >10K | — |
| `.png` | image/png | PIL (metadata only) | Sync | ❌ | ❌ | ✅ | ❌ | Sent to vision model |
| `.jpg` | image/jpeg | PIL (metadata only) | Sync | ❌ | ❌ | ✅ | ❌ | Sent to vision model |
| `.webp` | image/webp | PIL (metadata only) | Sync | ❌ | ❌ | ✅ | ❌ | Sent to vision model |
| `.gif` | image/gif | PIL (metadata only) | Sync | ❌ | ❌ | ✅ | ❌ | First frame only |