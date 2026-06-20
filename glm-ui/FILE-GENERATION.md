# GLM Workspace — File Generation Feature Set

> How the app produces deliverables: notes, reports, PDFs, slides, spreadsheets, charts.
> Chat requests the work. The panel previews it. The user downloads it.

---

## 1. Output Types

### 1.1 Type Overview

| Type | Format(s) | Preview | Download | Generation | Typical time |
|---|---|---|---|---|---|
| **Notes** | Markdown | Inline + panel | .md, .html | AI (instant) | 2–5s |
| **Markdown reports** | Markdown | Inline + panel | .md, .html, .pdf | AI (instant) + server (PDF) | 3–10s |
| **PDF documents** | PDF | Panel (embedded) | .pdf | AI → server render | 5–15s |
| **Slide decks** | JSON spec → HTML slides | Panel (slide nav) | .pdf, .html | AI (instant) + server (PDF) | 5–12s |
| **Spreadsheets** | JSON spec → grid | Panel (editable grid) | .xlsx, .csv | AI (instant) + server (XLSX) | 3–8s |
| **Charts** | JSON spec → Chart.js | Panel (interactive) | .png, .svg | AI (instant) + client (PNG/SVG) | 2–5s |

### 1.2 Type Details

#### Notes
- **What:** Structured markdown notes — meeting notes, study notes, brainstorming, summaries.
- **Structure:** Headings, bullet lists, bold labels, short paragraphs. No tables, no charts.
- **AI prompt pattern:** "Take notes on...", "Summarize this as notes", "Create meeting notes from..."
- **Artifact type:** `document` (subtype: notes — determined by content structure, not a separate type)
- **Export:** Markdown (instant), HTML (instant). No PDF — notes are lightweight.

#### Markdown Reports
- **What:** Structured documents with sections, tables, recommendations, conclusions.
- **Structure:** Title, executive summary, methodology, findings (with tables), recommendations, conclusion.
- **AI prompt pattern:** "Generate a report on...", "Create a Q3 analysis report", "Write a technical report about..."
- **Artifact type:** `report`
- **Export:** Markdown (instant), HTML (instant), PDF (server-side, 5–15s)

#### PDF Documents
- **What:** Print-ready documents with proper page layout, margins, headers/footers, typography.
- **Structure:** Same as markdown reports but rendered with print CSS → WeasyPrint.
- **AI prompt pattern:** "Create a PDF report", "Generate a printable document", or user clicks "Download as PDF" on any report.
- **Artifact type:** `report` (PDF is an export format, not a separate artifact type)
- **Export:** PDF (server-side via WeasyPrint, 5–15s)

#### Slide Decks
- **What:** Presentation slides with title slides, bullet slides, split layouts, chart slides.
- **Structure:** JSON spec with slide array. Each slide has layout type + content fields.
- **AI prompt pattern:** "Create a presentation about...", "Make slides for...", "Generate a pitch deck..."
- **Artifact type:** `slide_deck`
- **Export:** PDF (one slide per page, server-side), HTML (interactive, instant)

#### Spreadsheets
- **What:** Tabular data with multiple sheets, cell formatting, basic formulas.
- **Structure:** JSON spec with sheets array. Each sheet has cells (A1 notation), formats, formulas.
- **AI prompt pattern:** "Create a budget spreadsheet", "Build a financial model", "Make a data table I can edit..."
- **Artifact type:** `spreadsheet`
- **Export:** XLSX (server-side via openpyxl, 3–8s), CSV (instant, per sheet)

#### Charts
- **What:** Visual data representations — bar, line, pie, scatter, doughnut, radar.
- **Structure:** JSON spec with chart_type, title, data (labels + datasets), options.
- **AI prompt pattern:** "Visualize this data", "Create a chart showing...", "Plot revenue over time..."
- **Artifact type:** `chart`
- **Export:** PNG (client-side via Chart.js canvas, instant), SVG (client-side, instant)

---

## 2. Generation Flow

### 2.1 Universal Generation Flow

All output types follow the same core flow, with type-specific variations:

```
USER REQUESTS GENERATION
        │
        ├── Via chat: "Create a Q3 report" / "Make a chart" / "Generate slides"
        ├── Via artifact panel: Click "Regenerate" on existing artifact
        └── Via suggestion card: "Generate a structured report" (welcome screen)
        │
        ▼
┌─────────────────────────────────────────────────────┐
│  CHAT SERVICE                                        │
│  1. Parse user intent → determine output type        │
│  2. Build system prompt with format instructions     │
│  3. Include context: conversation history, files     │
│  4. Call Ollama /api/chat (stream: true)             │
│  5. Stream tokens to client via SSE                  │
│  6. Accumulate full response                         │
│  7. Run artifact detection on full response          │
│  8. If artifact detected:                            │
│     a. Parse content into artifact JSON spec          │
│     b. Create artifact record in DB                  │
│     c. Generate rendering hints                      │
│     d. Emit SSE artifact event                       │
│  9. Emit SSE done event                              │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  CLIENT                                              │
│  10. Render streaming text in chat (progressive)    │
│  11. On artifact event: open panel (desktop)        │
│  12. Render artifact preview by type                │
│  13. Show toolbar with available actions             │
│  14. On done event: finalize render, apply hints    │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  USER REVIEWS PREVIEW                                │
│  15. User reads/views the artifact in panel          │
│  16. User can: edit, regenerate, download, or        │
│      continue chatting to refine                     │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  USER DOWNLOADS                                      │
│  17. User clicks Download → selects format          │
│  18. Client-side formats: instant download           │
│  19. Server-side formats: queue export job           │
│      → Worker renders → presigned URL → download    │
└─────────────────────────────────────────────────────┘
```

### 2.2 Type-Specific Generation Workflows

#### 2.2.1 Notes Generation

```
User: "Take notes on the attached meeting transcript"

Chat Service:
  1. System prompt: "Generate structured notes in markdown.
     Use ## for sections, bullet lists for points, **bold** for key terms.
     Keep concise. No tables, no code blocks."
  2. Include attached file content (meeting transcript).
  3. Call Ollama → stream response.

AI Output:
  ## Meeting Notes — June 20, 2024

  **Attendees:** Jane, John, Sarah

  ## Key Decisions
  - **Budget:** Approved $50K for Q3 marketing
  - **Timeline:** Product launch moved to August 15
  - **Hiring:** Two new engineers to start July 1

  ## Action Items
  - [ ] Jane: Finalize marketing brief by June 25
  - [ ] John: Update project timeline in Jira
  - [x] Sarah: Send offer letters to new hires

  ## Discussion Points
  - **Revenue:** Q2 exceeded target by 12%
  - **Risks:** Supply chain delay for Widget C components

Detection:
  - Has headings (##) → markdown structure
  - Has checklist → checklist section
  - >500 chars + ≥2 headings → document_artifact
  - Content is notes-like (not a formal report) → type: "document"

Panel:
  - Renders as document with reading layout
  - Checklist items are interactive (toggleable)
  - Download: .md (instant), .html (instant)
```

#### 2.2.2 Markdown Report Generation

```
User: "Generate a Q3 revenue analysis report"

Chat Service:
  1. System prompt: "Generate a structured report in markdown.
     Include: # Title, ## Executive Summary, ## Methodology,
     ## Findings (with tables), ## Recommendations, ## Conclusion.
     Use markdown tables for data. Keep sections concise."
  2. Include any attached data files in context.
  3. Call Ollama → stream response.

AI Output:
  # Q3 2024 Revenue Analysis

  ## Executive Summary
  Total revenue reached $108K, a 15% YoY increase...

  ## Methodology
  This analysis covers all product lines...

  ## Findings

  ### Revenue by Product
  | Product | Revenue | Growth | Margin |
  |---------|---------|--------|--------|
  | Widget A | $45K | +12% | 32% |
  | Widget B | $38K | -5% | 28% |
  | Widget C | $22K | +8% | 25% |
  | Widget D | $12K | +3% | 20% |
  | Widget E | $9K | -2% | 18% |

  ### Regional Breakdown
  | Region | Revenue | Share |
  |--------|---------|-------|
  | North America | $65K | 60% |
  | Europe | $28K | 26% |
  | Asia | $15K | 14% |

  ## Recommendations
  1. Increase Widget A production capacity
  2. Investigate Widget B decline
  3. Expand EU marketing budget

  ## Conclusion
  Q3 showed strong overall growth...

Detection:
  - >500 chars + ≥2 headings → document_artifact
  - Contains tables (5 rows, 4 cols → table_artifact for first table)
  - Report structure → type: "report"

Panel:
  - Renders as document with reading layout
  - Tables render inline within the document
  - Download: .md (instant), .html (instant), .pdf (server, 5–15s)
```

#### 2.2.3 PDF Document Generation

PDF is not generated directly by the AI. It's an **export format** for reports/documents.

```
Flow 1: User explicitly requests PDF
  User: "Create a PDF report on Q3 revenue"

  Chat Service:
    1. System prompt: "Generate a structured report in markdown
       suitable for PDF export. Include page breaks (---) between
       major sections. Use print-friendly formatting."
    2. Call Ollama → stream response → detect report artifact.

  Panel:
    3. Shows report preview (markdown rendered).
    4. Toolbar shows "Download as PDF" (highlighted since user asked for PDF).

  User clicks "Download as PDF":
    5. POST /api/artifacts/:id/export { format: "pdf" }
    6. Job queued → WeasyPrint worker.
    7. Worker: markdown → HTML → print CSS → PDF.
    8. Upload PDF to object storage → presigned URL.
    9. Client downloads PDF.

Flow 2: User converts existing report to PDF
  User has a report artifact in panel.
  User clicks "Download as PDF".
  Same steps 5–9 above.
```

**WeasyPrint rendering pipeline:**
```python
def generate_pdf(artifact_id: str, options: dict) -> str:
    artifact = db.get_artifact(artifact_id)
    markdown_content = artifact.content["markdown"]

    # 1. Convert markdown to HTML
    html_body = markdown_to_html(markdown_content)

    # 2. Apply print stylesheet
    html_full = f"""
    <html>
    <head>
    <style>
      {PRINT_CSS}
    </style>
    </head>
    <body>
    {html_body}
    </body>
    </html>
    """

    # 3. Configure page layout
    page_options = {
        "page_size": options.get("page_size", "A4"),
        "margin_top": options.get("margins", "2cm"),
        "margin_bottom": options.get("margins", "2cm"),
        "margin_left": options.get("margins", "2cm"),
        "margin_right": options.get("margins", "2cm"),
    }

    # 4. Add header/footer
    if options.get("header"):
        page_options["header"] = options["header"]
    if options.get("footer"):
        page_options["footer"] = options.get("footer", "Page {page_number}")

    # 5. Render PDF
    pdf_bytes = weasyprint.HTML(string=html_full).write_pdf(**page_options)

    # 6. Upload to storage
    storage_key = f"exports/{artifact.workspace_id}/{artifact_id}/report.pdf"
    upload_to_storage(storage_key, pdf_bytes)

    return storage_key
```

**Print CSS:**
```css
/* Print-optimized stylesheet for PDF generation */
@page {
  size: A4;
  margin: 2cm;
  @bottom-center {
    content: "Page " counter(page) " of " counter(pages);
    font-size: 10px;
    color: #999;
  }
}

body {
  font-family: 'Inter', sans-serif;
  font-size: 11pt;
  line-height: 1.6;
  color: #1a1a1a;
}

h1 { font-size: 20pt; margin-bottom: 12pt; }
h2 { font-size: 16pt; margin-top: 20pt; margin-bottom: 8pt; }
h3 { font-size: 13pt; margin-top: 16pt; margin-bottom: 6pt; }

table {
  width: 100%;
  border-collapse: collapse;
  margin: 12pt 0;
  font-size: 10pt;
}

th {
  background: #f5f4f2;
  padding: 6pt 8pt;
  text-align: left;
  border-bottom: 1pt solid #e0ddd6;
  font-weight: 600;
}

td {
  padding: 6pt 8pt;
  border-bottom: 0.5pt solid #f0eeeb;
}

code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9.5pt;
  background: #f7f6f5;
  padding: 1pt 3pt;
  border-radius: 2pt;
}

pre {
  background: #f7f6f5;
  padding: 10pt;
  border-radius: 4pt;
  font-size: 9.5pt;
  overflow-x: auto;
  white-space: pre-wrap;
}

/* Page break before major sections (optional) */
h2 {
  page-break-before: auto;
  page-break-after: avoid;
}

/* Keep tables together */
table, tr {
  page-break-inside: avoid;
}
```

#### 2.2.4 Slide Deck Generation

```
User: "Create a 5-slide presentation about our Q3 results"

Chat Service:
  1. System prompt: "Generate a slide deck. Output each slide as:
     ## Slide N: [Layout]
     [content based on layout]

     Layouts: title, bullets, split, chart, image, quote

     For title: # Title \n ## Subtitle
     For bullets: ## Heading \n - Point 1 \n - Point 2
     For split: ## Heading \n Left: [text] \n Right: [text]
     For chart: ## Heading \n ```chart { json spec } ```
     For quote: ## Heading \n > Quote text \n — Attribution

     Keep each slide concise. 3-5 bullets max per slide."
  2. Call Ollama → stream response.

AI Output:
  ## Slide 1: Title
  # Q3 2024 Results
  Revenue Growth & Strategic Outlook

  ## Slide 2: Bullets
  ## Key Highlights
  - Revenue: $108K (+15% YoY)
  - New customers: 23 enterprise
  - Product launches: 2
  - Team growth: +5 engineers

  ## Slide 3: Chart
  ## Revenue Trend
  ```chart
  {
    "chart_type": "line",
    "title": "Monthly Revenue 2024",
    "data": {
      "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"],
      "datasets": [{ "label": "Revenue ($K)", "data": [29, 31, 34, 36, 38, 40, 42, 44, 41] }]
    }
  }
  ```

  ## Slide 4: Split
  ## Strengths vs Challenges
  Left: **Strengths**
  - Strong Widget A growth
  - New enterprise clients
  - Improved margins

  Right: **Challenges**
  - Widget B decline
  - Supply chain delays
  - EU market softness

  ## Slide 5: Bullets
  ## Next Steps
  - Increase Widget A production
  - Investigate Widget B decline
  - Expand EU marketing
  - Prepare Q4 forecast

Detection:
  - Has slide markers (## Slide N:) → slide_artifact
  - Contains chart spec within a slide → chart renders inside that slide

Panel:
  - Slide navigator (prev/next, thumbnails)
  - Current slide renders with layout-appropriate styling
  - Chart slides render the chart inline
  - Fullscreen mode for presentation
  - Download: .pdf (server, one slide per page), .html (interactive, instant)
```

**Slide rendering (client-side):**
```typescript
function renderSlide(slide: Slide): ReactNode {
  switch (slide.layout) {
    case 'title':
      return (
        <div className="slide slide-title">
          <h1>{slide.title}</h1>
          <p className="subtitle">{slide.subtitle}</p>
        </div>
      );
    case 'bullets':
      return (
        <div className="slide slide-bullets">
          <h2>{slide.title}</h2>
          <ul>{slide.bullets.map(b => <li>{b}</li>)}</ul>
        </div>
      );
    case 'split':
      return (
        <div className="slide slide-split">
          <h2>{slide.title}</h2>
          <div className="split-content">
            <div className="left">{slide.left}</div>
            <div className="right">{slide.right}</div>
          </div>
        </div>
      );
    case 'chart':
      return (
        <div className="slide slide-chart">
          <h2>{slide.title}</h2>
          <ChartRenderer spec={slide.chartSpec} />
        </div>
      );
    case 'quote':
      return (
        <div className="slide slide-quote">
          <blockquote>{slide.quote}</blockquote>
          <cite>— {slide.attribution}</cite>
        </div>
      );
  }
}
```

**Slide PDF export (server-side):**
```python
def generate_slide_pdf(artifact_id: str, options: dict) -> str:
    artifact = db.get_artifact(artifact_id)
    slides = artifact.content["slides"]

    # Build HTML with one page per slide
    html_slides = ""
    for slide in slides:
        html_slides += f'<div class="slide-page">{render_slide_html(slide)}</div>'

    html_full = f"""
    <html>
    <head>
    <style>
      @page {{ size: landscape; margin: 0; }}
      .slide-page {{
        width: 100%;
        height: 100vh;
        page-break-after: always;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 40px;
        box-sizing: border-box;
      }}
      {SLIDE_CSS}
    </style>
    </head>
    <body>
    {html_slides}
    </body>
    </html>
    """

    pdf_bytes = weasyprint.HTML(string=html_full).write_pdf()
    storage_key = f"exports/{artifact.workspace_id}/{artifact_id}/slides.pdf"
    upload_to_storage(storage_key, pdf_bytes)
    return storage_key
```

#### 2.2.5 Spreadsheet Generation

```
User: "Create a budget spreadsheet with categories, amounts, and status"

Chat Service:
  1. System prompt: "Generate a spreadsheet specification in JSON.
     Format:
     ```spreadsheet
     {
       "sheets": [
         {
           "name": "Sheet Name",
           "cells": {
             "A1": { "value": "Header", "type": "text", "format": "bold" },
             "B1": { "value": 5000, "type": "number", "format": "currency" },
             "C1": { "value": "Approved", "type": "text" }
           },
           "max_row": 10,
           "max_col": 5
         }
       ]
     }
     ```
     Use A1 cell notation. Include headers in row 1.
     Set format: 'bold', 'currency', 'percent', 'date' where appropriate."
  2. Call Ollama → stream response.

AI Output:
  ```spreadsheet
  {
    "sheets": [
      {
        "name": "Budget",
        "cells": {
          "A1": { "value": "Category", "type": "text", "format": "bold" },
          "B1": { "value": "Amount", "type": "text", "format": "bold" },
          "C1": { "value": "Status", "type": "text", "format": "bold" },
          "D1": { "value": "Notes", "type": "text", "format": "bold" },
          "A2": { "value": "Marketing", "type": "text" },
          "B2": { "value": 5000, "type": "number", "format": "currency" },
          "C2": { "value": "Approved", "type": "text" },
          "D2": { "value": "Q3 campaign", "type": "text" },
          "A3": { "value": "Engineering", "type": "text" },
          "B3": { "value": 12000, "type": "number", "format": "currency" },
          "C3": { "value": "Pending", "type": "text" },
          "D3": { "value": "Need approval", "type": "text" },
          "A4": { "value": "Operations", "type": "text" },
          "B4": { "value": 8000, "type": "number", "format": "currency" },
          "C4": { "value": "Approved", "type": "text" },
          "A5": { "value": "Research", "type": "text" },
          "B5": { "value": 3000, "type": "number", "format": "currency" },
          "C5": { "value": "Draft", "type": "text" },
          "A6": { "value": "Total", "type": "text", "format": "bold" },
          "B6": { "value": "=SUM(B2:B5)", "type": "formula", "format": "currency" }
        },
        "max_row": 6,
        "max_col": 4
      }
    ]
  }
  ```

Detection:
  - Has spreadsheet JSON spec → spreadsheet_artifact

Panel:
  - Editable grid with A1 notation
  - Cell formatting (bold, currency, percent, date)
  - Formula support (basic: SUM, AVERAGE, COUNT)
  - Sheet tabs if multiple sheets
  - Download: .xlsx (server, 3–8s), .csv (instant, per sheet)
```

**XLSX export (server-side):**
```python
from openpyxl import Workbook
from openpyxl.styles import Font, numbers

def generate_xlsx(artifact_id: str) -> str:
    artifact = db.get_artifact(artifact_id)
    sheets = artifact.content["sheets"]

    wb = Workbook()
    wb.remove(wb.active)  # remove default sheet

    for sheet_spec in sheets:
        ws = wb.create_sheet(title=sheet_spec["name"])

        for cell_ref, cell_data in sheet_spec["cells"].items():
            cell = ws[cell_ref]

            # Set value
            if cell_data["type"] == "formula":
                cell.value = cell_data["value"]  # already has = prefix
            else:
                cell.value = cell_data["value"]

            # Apply formatting
            fmt = cell_data.get("format")
            if fmt == "bold":
                cell.font = Font(bold=True)
            elif fmt == "currency":
                cell.number_format = '$#,##0.00'
            elif fmt == "percent":
                cell.number_format = '0.0%'
            elif fmt == "date":
                cell.number_format = 'YYYY-MM-DD'

    # Upload
    buffer = io.BytesIO()
    wb.save(buffer)
    storage_key = f"exports/{artifact.workspace_id}/{artifact_id}/spreadsheet.xlsx"
    upload_to_storage(storage_key, buffer.getvalue())
    return storage_key
```

#### 2.2.6 Chart Generation

```
User: "Create a bar chart showing revenue by product"

Chat Service:
  1. System prompt: "Generate a chart specification in JSON.
     Format:
     ```chart
     {
       "chart_type": "bar" | "line" | "pie" | "scatter" | "doughnut" | "radar",
       "title": "Chart Title",
       "data": {
         "labels": ["Label1", "Label2", ...],
         "datasets": [
           { "label": "Series Name", "data": [val1, val2, ...] }
         ]
       },
       "options": {
         "responsive": true,
         "scales": { "y": { "beginAtZero": true } }
       }
     }
     ```
     Use the product color palette: #d97757, #6b6b6b, #2d8a4e, #c4850e, #5b7c99."
  2. Call Ollama → stream response.

AI Output:
  ```chart
  {
    "chart_type": "bar",
    "title": "Revenue by Product",
    "data": {
      "labels": ["Widget A", "Widget B", "Widget C", "Widget D", "Widget E"],
      "datasets": [
        {
          "label": "Revenue ($K)",
          "data": [45, 38, 22, 12, 9],
          "backgroundColor": ["#d97757", "#6b6b6b", "#2d8a4e", "#c4850e", "#5b7c99"]
        }
      ]
    },
    "options": {
      "responsive": true,
      "scales": { "y": { "beginAtZero": true } },
      "plugins": { "legend": { "position": "bottom" } }
    }
  }
  ```

Detection:
  - Has chart JSON spec → chart_artifact (always panel)

Panel:
  - Chart.js renders the spec
  - Interactive: hover tooltips, legend toggle
  - Responsive: resizes with panel
  - Download: .png (client-side, instant), .svg (client-side, instant)
```

**Client-side chart PNG export:**
```typescript
function downloadChartPng(chart: Chart, filename: string): void {
  const canvas = chart.canvas;
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png', 1.0); // full quality
  link.click();
}

function downloadChartSvg(chart: Chart, filename: string): void {
  // Chart.js doesn't natively support SVG export
  // Use canvas-to-SVG library or render via SVG-based chart lib
  // Fallback: export as high-res PNG (2x DPI)
  const canvas = chart.canvas;
  const scaledCanvas = document.createElement('canvas');
  scaledCanvas.width = canvas.width * 2;
  scaledCanvas.height = canvas.height * 2;
  const ctx = scaledCanvas.getContext('2d');
  ctx.scale(2, 2);
  ctx.drawImage(canvas, 0, 0);
  const link = document.createElement('a');
  link.download = filename.replace('.svg', '.png');
  link.href = scaledCanvas.toDataURL('image/png', 1.0);
  link.click();
}
```

---

## 3. Preview vs Download Behavior

### 3.1 Preview Behavior

All artifacts are previewed in the panel **before** download. The user never downloads blindly.

| Type | Preview shows | Preview interactivity | Preview fidelity vs download |
|---|---|---|---|
| Notes | Rendered markdown (headings, lists, bold) | Checklist toggle | 100% — markdown is the source |
| Report | Rendered markdown (document layout) | Scroll, select text | 95% — PDF adds page layout, margins, header/footer |
| PDF | Embedded PDF in iframe (after generation) | Scroll, zoom | 100% — PDF is the download |
| Slides | Slide-by-slide navigation | Prev/next, fullscreen, thumbnails | 90% — PDF is landscape, one per page |
| Spreadsheet | Editable grid | Cell edit, sheet tabs | 95% — XLSX adds formula calculation, formatting |
| Chart | Chart.js interactive render | Hover tooltips, legend toggle | 100% — PNG is screenshot of preview |

### 3.2 Download Behavior

| Format | Method | Speed | Where generated | Quality |
|---|---|---|---|---|
| .md | Client-side Blob | Instant | Browser | Raw markdown text |
| .html | Client-side Blob | Instant | Browser | Styled HTML (standalone page) |
| .csv | Client-side Blob | Instant | Browser | Raw CSV from table/spreadsheet data |
| .png | Client-side canvas.toDataURL | Instant | Browser | Raster, 2x DPI for retina |
| .svg | Client-side canvas conversion | Instant | Browser | Vector (or high-res PNG fallback) |
| .py/.js/etc | Client-side Blob | Instant | Browser | Raw code text |
| .pdf | Server-side (WeasyPrint) | 5–15s | Worker | Print-quality, A4, margins, header/footer |
| .xlsx | Server-side (openpyxl) | 3–8s | Worker | Formulas, formatting, multiple sheets |

### 3.3 Download Flow

```
User clicks "Download" in toolbar
        │
        ▼
┌──────────────────────────────────────────┐
│  Format dropdown appears                 │
│  ─────────────────────                  │
│  📄 PDF              (server, ~8s)     │
│  🌐 HTML             (instant)          │
│  📝 Markdown         (instant)          │
└──────────────────────┬───────────────────┘
                       │
                       ├── Instant format (.md, .html, .csv, .png, .code)
                       │   → Generate Blob in browser
                       │   → Create download link
                       │   → Browser downloads file
                       │   → Button shows ✓ for 2s
                       │   → Done (no server call)
                       │
                       └── Server format (.pdf, .xlsx)
                           → POST /api/artifacts/:id/export { format }
                           → Response: { job_id, status: "queued", estimated_seconds }
                           → Button shows spinner + "Generating…"
                           │
                           ▼
                       ┌──────────────────────────────┐
                       │  Worker processes job        │
                       │  1. Fetch artifact content    │
                       │  2. Render (WeasyPrint/openpyxl)│
                       │  3. Upload to object storage   │
                       │  4. Generate presigned URL     │
                       │  5. Update job: complete       │
                       │  6. Publish SSE event          │
                       └──────────────┬───────────────┘
                                      │
                                      ▼
                       ┌──────────────────────────────┐
                       │  Client receives notification │
                       │  (SSE event or poll)          │
                       │  → Browser downloads from URL │
                       │  → Button shows ✓ for 2s      │
                       │  → Toast: "report.pdf ready"  │
                       └──────────────────────────────┘
```

### 3.4 HTML Export (Standalone)

When downloading as HTML, the file is a **standalone** page that works offline:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Q3 Revenue Analysis</title>
  <style>
    /* Inline all CSS — no external dependencies */
    body { font-family: 'Inter', sans-serif; max-width: 780px;
           margin: 40px auto; padding: 0 20px; line-height: 1.7; color: #1a1a1a; }
    h1 { font-size: 28px; }
    h2 { font-size: 22px; margin-top: 32px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th { background: #f5f4f2; padding: 10px 14px; text-align: left; font-weight: 600; }
    td { padding: 10px 14px; border-bottom: 1px solid #f0eeeb; }
    code { font-family: monospace; background: #f7f6f5; padding: 2px 6px; border-radius: 4px; }
    /* ... more styles ... */
  </style>
</head>
<body>
  <h1>Q3 Revenue Analysis</h1>
  <h2>Executive Summary</h2>
  <p>Total revenue reached $108K...</p>
  <!-- ... full rendered HTML ... -->
</body>
</html>
```

---

## 4. Job States

### 4.1 Generation Job States (for AI generation)

AI generation is **streaming**, not a background job. The "job" is the SSE stream itself.

| State | When | Client shows |
|---|---|---|
| `pending` | Message received, before first Ollama call | Typing dots |
| `streaming` | Tokens arriving from Ollama | Progressive text render |
| `detecting` | Stream complete, running artifact detection | Brief pause (<500ms), then artifact event |
| `complete` | Artifact created, hints generated, message persisted | Final render + panel opens |
| `stopped` | User clicked Stop | Partial content + "Generation stopped" |
| `error` | Ollama error, network error, timeout | Error bubble + Retry button |

### 4.2 Export Job States (for file downloads)

| State | When | Client shows | Duration |
|---|---|---|---|
| `queued` | Export requested, job in Redis queue | Spinner + "Queued…" | <1s typically |
| `processing` | Worker picked up job, rendering | Spinner + "Generating PDF…" | 3–15s |
| `complete` | File generated, uploaded to storage | ✓ + auto-download | — |
| `failed` | Rendering error, timeout, OOM | "Export failed. [Retry]" | — |
| `cancelled` | User cancelled (phase 2) | "Export cancelled" | — |

### 4.3 Export Job Record

```json
{
  "id": "job_xyz",
  "type": "export_pdf",
  "status": "complete",
  "entity_type": "artifact",
  "entity_id": "art_001",
  "input_params": {
    "artifact_id": "art_001",
    "format": "pdf",
    "page_size": "A4",
    "margins": "2cm",
    "include_toc": true,
    "header": "Q3 Revenue Analysis",
    "footer": "Page {n}"
  },
  "output_result": {
    "file_size": 245678,
    "page_count": 8,
    "download_url": "https://storage.example.com/exports/...",
    "expires_at": "2024-06-20T15:30:00Z"
  },
  "error_code": null,
  "error_message": null,
  "retry_count": 0,
  "max_retries": 2,
  "queued_at": "2024-06-20T14:30:00Z",
  "started_at": "2024-06-20T14:30:01Z",
  "completed_at": "2024-06-20T14:30:08Z",
  "duration_ms": 7000,
  "worker_id": "pdf-worker-01"
}
```

### 4.4 Export Job Progress Stages

For server-side exports, the worker reports progress stages:

| Stage | What's happening | Client shows |
|---|---|---|
| `queued` | Job in Redis queue | "Queued…" |
| `fetching` | Worker downloading artifact content from DB | "Preparing…" |
| `rendering` | Converting markdown → HTML (PDF) or building workbook (XLSX) | "Rendering content…" |
| `styling` | Applying print CSS / cell formatting | "Applying styles…" |
| `generating` | WeasyPrint producing PDF / openpyxl producing XLSX | "Generating PDF…" |
| `uploading` | Uploading result to object storage | "Finishing up…" |
| `complete` | Done, presigned URL ready | ✓ + download |

**Progress reporting via SSE:**
```
event: job_progress
data: {"job_id": "job_xyz", "stage": "rendering", "progress_percent": 40}

event: job_progress
data: {"job_id": "job_xyz", "stage": "generating", "progress_percent": 70}

event: job_complete
data: {"job_id": "job_xyz", "download_url": "...", "file_size": 245678}
```

### 4.5 Export Job Metadata

Each generated file has metadata stored with the job:

| Field | Purpose |
|---|---|
| `file_size` | Display to user before download |
| `page_count` | For PDFs — show "8 pages" |
| `sheet_count` | For XLSX — show "3 sheets" |
| `slide_count` | For slide PDFs — show "5 slides" |
| `download_url` | Presigned URL (1-hour expiry) |
| `expires_at` | When the presigned URL expires |
| `duration_ms` | How long generation took (for analytics) |

---

## 5. Editing / Regeneration Flows

### 5.1 Edit Flow (Manual Changes)

```
User clicks "Edit" in panel toolbar
        │
        ▼
┌──────────────────────────────────────────┐
│  Panel switches to edit mode              │
│                                           │
│  Document/Report:                         │
│  → Textarea with raw markdown             │
│  → Monospace font for editing             │
│  → Full content loaded                    │
│  → Save / Cancel buttons at bottom        │
│                                           │
│  Code:                                    │
│  → Textarea with raw code                 │
│  → Line numbers in edit mode              │
│  → Language label shown                   │
│                                           │
│  Slides:                                  │
│  → Per-slide editing (title + body)      │
│  → Add/remove slide buttons              │
│  → Reorder slides (drag handle)           │
│                                           │
│  Spreadsheet:                             │
│  → Already interactive — edit mode adds   │
│    bulk edit (select range, type to fill)  │
│                                           │
│  Table:                                   │
│  → Not editable via edit mode             │
│  → Use regenerate to change table data    │
│                                           │
│  Chart:                                   │
│  → Not editable via edit mode             │
│  → Use regenerate to change chart spec    │
└──────────────────────┬───────────────────┘
                       │
                       ├── User clicks Save
                       │   → New version created (version +1)
                       │   → is_latest = true on new version
                       │   → is_latest = false on previous
                       │   → Panel updates with new content
                       │   → Toast: "Artifact updated (v{N})"
                       │   → Old version accessible via dropdown
                       │
                       └── User clicks Cancel
                           → Reverts to original
                           → No version created
```

### 5.2 Regenerate Flow (AI Creates New Version)

```
User clicks "Regenerate" in panel toolbar
        │
        ▼
┌──────────────────────────────────────────┐
│  Composer activates with pre-filled prompt │
│                                           │
│  "Regenerate this [type] with changes:    │
│   [original prompt that created it]"      │
│                                           │
│  User can modify:                         │
│  - "Make it more concise"                 │
│  - "Add a section about Q4 projections"   │
│  - "Change the tone to be more formal"    │
│  - "Use the data from the attached file"  │
│                                           │
│  User sends (Enter or click Send)         │
└──────────────────────┬───────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────┐
│  Chat Service processes regeneration      │
│                                           │
│  1. Load original artifact content        │
│  2. Build context:                        │
│     - System prompt with format rules      │
│     - Original artifact content           │
│     - User's modification instruction      │
│     - Conversation history                 │
│  3. Call Ollama → stream response         │
│  4. Detect artifact in new response       │
│  5. Create new version:                   │
│     - parent_artifact_id = original       │
│     - version = original.version + 1      │
│     - is_latest = true                    │
│  6. Panel updates to new version          │
└──────────────────────────────────────────┘
```

**Regeneration context:**
```python
def build_regeneration_context(artifact: Artifact, instruction: str, conversation: Conversation) -> list:
    return [
        {"role": "system", "content": FORMAT_PROMPTS[artifact.type]},
        {"role": "user", "content": f"Here is the current {artifact.type}:\n\n{artifact.content_markdown}"},
        {"role": "assistant", "content": artifact.content_markdown},
        {"role": "user", "content": f"Regenerate with these changes: {instruction}"},
    ]
```

### 5.3 Iterative Refinement Example

```
Round 1: "Create a Q3 revenue report"
  → v1: Full report with 5 sections, 2 tables

Round 2: Regenerate — "Add a section about customer satisfaction"
  → v2: 6 sections, 2 tables, new satisfaction section

Round 3: Edit — Fix a typo in the executive summary
  → v3: Same as v2 but with corrected typo

Round 4: Regenerate — "Make the executive summary shorter and add a key metrics table at the top"
  → v4: Shorter summary, new metrics table, 7 sections total

Round 5: Download v4 as PDF
  → PDF generated, 8 pages, downloaded

Round 6: View v1 to compare
  → Select v1 from version dropdown
  → Read original version
  → Switch back to v4 (current)

Round 7: Restore v1 as latest (user prefers the original structure)
  → v5 created with v1's content
  → v5 is now latest
  → v4 still accessible in history
```

---

## 6. UX Considerations

### 6.1 Requesting Generation from Chat

**Natural language triggers:**

| User says | Output type | Detection |
|---|---|---|
| "Take notes on..." / "Summarize as notes" | Notes (document) | Keyword: "notes" |
| "Create a report" / "Generate a report" / "Write a report" | Report | Keyword: "report" |
| "Make a PDF" / "Create a PDF document" | Report → PDF export | Keyword: "pdf" |
| "Create a presentation" / "Make slides" / "Generate a pitch deck" | Slide deck | Keywords: "presentation", "slides", "deck" |
| "Create a spreadsheet" / "Build a financial model" / "Make a budget table" | Spreadsheet | Keywords: "spreadsheet", "budget", "model" |
| "Create a chart" / "Visualize this data" / "Plot revenue" / "Make a graph" | Chart | Keywords: "chart", "visualize", "plot", "graph" |

**System prompt augmentation:**
When a generation keyword is detected, the system prompt is augmented with format-specific instructions:

```python
FORMAT_PROMPTS = {
    "report": """Generate a structured report in markdown.
        Include: # Title, ## Executive Summary, ## Methodology,
        ## Findings (with markdown tables), ## Recommendations, ## Conclusion.
        Use markdown tables for data. Keep sections concise (2-4 paragraphs each).""",

    "notes": """Generate structured notes in markdown.
        Use ## for sections, bullet lists for points, **bold** for key terms.
        Keep concise. No tables, no code blocks. Include action items as checkboxes.""",

    "slides": """Generate a slide deck. Output each slide as:
        ## Slide N: [Layout]
        Use layouts: title, bullets, split, chart, quote.
        Keep each slide concise. 3-5 bullets max per slide.""",

    "spreadsheet": """Generate a spreadsheet specification in JSON.
        Use A1 cell notation. Include headers in row 1.
        Set format: 'bold', 'currency', 'percent', 'date' where appropriate.
        Wrap in ```spreadsheet json block.""",

    "chart": """Generate a chart specification in JSON.
        Include chart_type, title, data (labels + datasets), options.
        Use color palette: #d97757, #6b6b6b, #2d8a4e, #c4850e, #5b7c99.
        Wrap in ```chart json block.""",

    "pdf": """Generate a structured report in markdown suitable for PDF export.
        Include page breaks (---) between major sections.
        Use print-friendly formatting.""",
}
```

### 6.2 Requesting Generation from Artifact Panel

From an existing artifact, the user can:

| Action | What happens |
|---|---|
| Click "Regenerate" | Composer pre-fills with original prompt + "Regenerate with changes:" |
| Click "Edit" | Direct content editing (no AI call) |
| Click "Download" | Export current version to file |
| Select older version → "Restore" | Old content becomes new latest version |
| Continue chatting in the chat column | New messages can reference the artifact ("update the report to include...") |

### 6.3 Preview Fidelity

The preview should be as close to the final download as possible:

| Type | Preview | Download | Fidelity gap |
|---|---|---|---|
| Notes | Rendered markdown | .md file | None — markdown is the source |
| Notes | Rendered markdown | .html file | Minimal — HTML adds standalone page wrapper |
| Report | Rendered markdown | .pdf file | Small — PDF adds page layout, margins, header/footer, page breaks |
| Report | Rendered markdown | .html file | Minimal — HTML adds standalone page wrapper |
| Slides | Slide-by-slide render | .pdf file | Small — PDF is landscape, one slide per page |
| Slides | Slide-by-slide render | .html file | None — HTML is the same render |
| Spreadsheet | Editable grid | .xlsx file | Small — XLSX adds formula calculation, cell formatting |
| Spreadsheet | Editable grid | .csv file | None — CSV is raw data |
| Chart | Chart.js render | .png file | None — PNG is screenshot of canvas |
| Chart | Chart.js render | .svg file | Minimal — SVG is vector version of same render |

**Rule:** If there's a fidelity gap, show a note in the download dropdown: "PDF includes page numbers and margins not shown in preview."

### 6.4 Download Feedback

| State | What user sees |
|---|---|
| Instant download (client-side) | Button clicks → file downloads immediately → ✓ for 2s |
| Server-side download starts | Button shows spinner + "Generating PDF…" |
| Server-side download progress | "Rendering content… 40%" (progress stages via SSE) |
| Server-side download complete | File auto-downloads → ✓ for 2s → toast: "report.pdf ready" |
| Server-side download fails | "Export failed. [Retry]" — error detail in tooltip |
| User navigates away during generation | Toast on return: "Your PDF is ready. [Download]" |

### 6.5 File Naming

Generated files use a clean, descriptive naming convention:

| Type | Filename pattern | Example |
|---|---|---|
| Notes | `{title}.md` | `Meeting Notes June 20.md` |
| Report (MD) | `{title}.md` | `Q3 Revenue Analysis.md` |
| Report (HTML) | `{title}.html` | `Q3 Revenue Analysis.html` |
| Report (PDF) | `{title}.pdf` | `Q3 Revenue Analysis.pdf` |
| Slides (PDF) | `{title}.pdf` | `Q3 Results Presentation.pdf` |
| Slides (HTML) | `{title}.html` | `Q3 Results Presentation.html` |
| Spreadsheet (XLSX) | `{title}.xlsx` | `Budget 2024.xlsx` |
| Spreadsheet (CSV) | `{sheet_name}.csv` | `Budget.csv` |
| Chart (PNG) | `{title}.png` | `Revenue by Product.png` |
| Chart (SVG) | `{title}.svg` | `Revenue by Product.svg` |
| Code | `{filename}.{ext}` | `data_processor.py` |

**Title sanitization:** Spaces preserved (not replaced with dashes). Special characters removed. Max 60 chars. If no title, use artifact type: "Untitled Report.pdf".

### 6.6 Regeneration UX

When regenerating, the user should understand what's happening:

```
┌──────────────────────────────────────────────────────────────┐
│  CHAT COLUMN                          ARTIFACT PANEL           │
│                                       │                       │
│  User: "Regenerate with:             │  ┌──────────────────┐ │
│  Add Q4 projections section"         │  │ Generating…      │ │
│                                      │  │ ████████░░ 80%   │ │
│  GLM-5.2: Regenerating report...    │  │                  │ │
│  [streaming new content...]          │  │ (skeleton        │ │
│                                      │  │  shimmer)        │ │
│                                      │  └──────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

- Chat shows the regeneration request and streaming response.
- Panel shows loading state (skeleton shimmer).
- When streaming completes, panel updates with new version.
- Old version is accessible via version dropdown.
- Toast: "Report updated to v2."

### 6.7 Error Recovery

| Error | What user sees | Recovery |
|---|---|---|
| AI generation fails | Error bubble in chat: "Generation failed. [Retry]" | Click Retry → re-sends the message |
| AI produces wrong format | Content renders as fallback (prose instead of chart) | User can regenerate with clearer instruction |
| PDF export fails | "Export failed. [Retry]" in download button | Click Retry → re-queues export job |
| XLSX export fails | "Export failed. [Retry]" | Click Retry → re-queues export job |
| Chart spec invalid | Chart falls back to table → falls back to code block → falls back to prose | User can regenerate with clearer instruction |
| Spreadsheet spec invalid | Falls back to table → falls back to markdown | User can regenerate |
| Slide parsing fails | Falls back to document render | User can regenerate |
| Download URL expired | "Download link expired. [Regenerate]" | Click → re-queues export job |

### 6.8 Long Session Considerations

| Concern | Solution |
|---|---|
| User generates many versions | Version dropdown groups by date. Old versions collapsed. |
| User has many artifacts across conversations | Artifacts section in sidebar (phase 2). Searchable. |
| Export jobs pile up | Auto-cleanup: export files deleted from storage after 30 days. Job records after 30 days. |
| User forgets which conversation an artifact belongs to | Status bar in panel shows source conversation (clickable). |
| User wants to reuse a previous format | "Duplicate artifact" action (phase 2) — copies artifact to new conversation as starting point. |
| Large reports take long to render in edit mode | Edit mode uses lightweight textarea. Preview renders on save only. |
| User wants to export all artifacts | "Export all" action (phase 2) — zip file with all artifacts in their native formats. |

---

## 7. Format-Specific System Prompts

### 7.1 Report Prompt

```
You are generating a structured report. Follow this format exactly:

# [Report Title]

## Executive Summary
[2-3 paragraph overview of key findings]

## Methodology
[1-2 paragraphs explaining approach and data sources]

## Findings
### [Finding Category 1]
[Analysis with supporting data]

| Metric | Value | Change |
|--------|-------|--------|
| ... | ... | ... |

### [Finding Category 2]
[Analysis with supporting data]

## Recommendations
1. [Actionable recommendation with rationale]
2. [Actionable recommendation with rationale]

## Conclusion
[1-2 paragraph summary]

Rules:
- Use markdown tables for all structured data
- Keep paragraphs to 2-4 sentences
- Use **bold** for key metrics and terms
- Numbers should include units ($45K, +12%, 1,250 users)
- Every section must have substantive content (no placeholder text)
```

### 7.2 Slide Deck Prompt

```
You are generating a slide deck presentation. Follow this format:

## Slide 1: title
# [Presentation Title]
[Subtitle line]

## Slide 2: bullets
## [Slide Heading]
- [Concise point 1]
- [Concise point 2]
- [Concise point 3]
- [Concise point 4]

## Slide 3: chart
## [Slide Heading]
```chart
{ chart JSON spec }
```

## Slide 4: split
## [Slide Heading]
Left: **[Label]**
- [Point 1]
- [Point 2]

Right: **[Label]**
- [Point 1]
- [Point 2]

## Slide 5: quote
## [Slide Heading]
> "[Quote text]"
— [Attribution]

Rules:
- 3-5 bullets max per slide
- Each slide must have a clear purpose
- Use chart slides for data visualization
- Keep text minimal — slides are for key points, not paragraphs
- Include a title slide and a closing/next-steps slide
```

### 7.3 Spreadsheet Prompt

```
You are generating a spreadsheet specification. Output JSON in a ```spreadsheet block:

```spreadsheet
{
  "sheets": [
    {
      "name": "Sheet Name",
      "cells": {
        "A1": { "value": "Header", "type": "text", "format": "bold" },
        "B1": { "value": 5000, "type": "number", "format": "currency" },
        "C1": { "value": "Approved", "type": "text" },
        "B6": { "value": "=SUM(B2:B5)", "type": "formula", "format": "currency" }
      },
      "max_row": 6,
      "max_col": 4
    }
  ]
}
```

Rules:
- Row 1 is always headers (bold format)
- Use A1 cell notation
- Types: "text", "number", "formula"
- Formats: "bold", "currency", "percent", "date"
- Formulas start with = (e.g., =SUM(B2:B5), =AVERAGE(C2:C10))
- Include totals row where appropriate
- Keep sheets focused — one topic per sheet
```

### 7.4 Chart Prompt

```
You are generating a chart specification. Output JSON in a ```chart block:

```chart
{
  "chart_type": "bar",
  "title": "Chart Title",
  "data": {
    "labels": ["Label1", "Label2", "Label3"],
    "datasets": [
      {
        "label": "Series Name",
        "data": [val1, val2, val3],
        "backgroundColor": ["#d97757", "#6b6b6b", "#2d8a4e"]
      }
    ]
  },
  "options": {
    "responsive": true,
    "scales": { "y": { "beginAtZero": true } },
    "plugins": { "legend": { "position": "bottom" } }
  }
}
```

Rules:
- chart_type must be one of: bar, line, pie, scatter, doughnut, radar
- labels and data arrays must be the same length
- Use the color palette: #d97757, #6b6b6b, #2d8a4e, #c4850e, #5b7c99
- Include a descriptive title
- Set beginAtZero: true for bar charts
- For pie/doughnut: no scales needed
- Keep data concise — max 20 data points per series
```

---

## 8. Summary: Generation Quick Reference

| User wants | Says | AI outputs | Panel shows | Download formats |
|---|---|---|---|---|
| Notes | "Take notes on..." | Markdown with headings + lists + checkboxes | Document preview, interactive checklist | .md, .html |
| Report | "Create a report..." | Markdown with sections + tables | Document preview, reading layout | .md, .html, .pdf |
| PDF | "Make a PDF..." or click Download → PDF | Markdown report → WeasyPrint → PDF | Document preview → embedded PDF | .pdf |
| Slides | "Create a presentation..." | Slide spec (## Slide N: layout) | Slide navigator, fullscreen | .pdf, .html |
| Spreadsheet | "Create a spreadsheet..." | JSON spec (cells, formats, formulas) | Editable grid, sheet tabs | .xlsx, .csv |
| Chart | "Create a chart..." / "Visualize..." | JSON spec (chart_type, data, options) | Chart.js interactive render | .png, .svg |

**The golden rule:** Every generated output is previewed in the panel before download. The user never downloads blindly. The preview is as close to the final file as possible.