# GLM Workspace — Smart Answer Rendering Engine

> The system decides how to present each piece of AI output.
> Not everything is a chat bubble. Not everything is an artifact.
> The right format for the right content.

---

## 1. Rendering Rules

### 1.1 Decision Hierarchy

The rendering engine evaluates content top-down. The first match wins. More specific checks come before generic ones.

```
AI response completes (full content available)
        │
        ▼
┌─────────────────────────────────────────────────────┐
│  STEP 1: Artifact detection                         │
│  Is this a substantial deliverable?                 │
│  (code >20 lines, document >500 chars, table >5     │
│  rows, chart spec, slide deck, spreadsheet)         │
│                                                     │
│  YES → Create artifact, open panel (desktop)        │
│  NO  → Continue to Step 2                          │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  STEP 2: Inline content classification              │
│  What dominant content type is this?               │
│                                                     │
│  → Pure prose (no markdown, no structure)          │
│  → Markdown (headings, lists, bold, blockquotes)    │
│  → Rich table (markdown table detected)             │
│  → Code block (fenced code detected)               │
│  → Checklist (list of checkbox items detected)      │
│  → Mixed (multiple types in one response)           │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  STEP 3: Rendering hint generation                   │
│  Backend attaches rendering hints to the message    │
│  Frontend reads hints and renders accordingly       │
└─────────────────────────────────────────────────────┘
```

### 1.2 Artifact Detection Rules

An artifact is created when the content matches ANY of these patterns:

| Pattern | Rule | Artifact type | Why |
|---|---|---|---|
| Code block >20 lines | Fenced code block with >20 lines | `code` | Long code is unreadable inline; needs line numbers, copy, download |
| Markdown document >500 chars with ≥2 headings | `#` or `##` appears ≥2 times, total >500 chars | `document` or `report` | Substantial document deserves its own panel with reading layout |
| Table with >5 rows | Markdown table with header + >5 data rows | `table` | Large tables need sorting, filtering, CSV export |
| Chart spec | JSON with `chart_type` + `data.labels` + `data.datasets` | `chart` | Charts can't render inline; need Chart.js + panel |
| Slide deck markers | Content has `---SLIDE---` delimiters or `## Slide N:` pattern | `slide_deck` | Slides need navigation, full-screen mode |
| Spreadsheet markers | Content has `## Sheet:` + cell references (A1, B2) | `spreadsheet` | Spreadsheets need editable grid |
| Explicit artifact tag | Content contains `<artifact type="report">` | per tag | Model can explicitly request artifact treatment |

**What does NOT trigger an artifact:**
- Short code snippets (<20 lines) — render inline with copy button
- Short markdown answers (<500 chars) — render inline
- Small tables (≤5 rows) — render inline
- Single-level lists — render inline
- Inline code (`like this`) — render inline

### 1.3 Inline Content Classification Rules

When content is NOT an artifact, classify it for inline rendering:

```
Content arrives
        │
        ├── Contains fenced code block (```...```)?
        │   ├── Code block >20 lines → artifact (code)
        │   └── Code block ≤20 lines → render as inline code block
        │
        ├── Contains markdown table (| col | col |)?
        │   ├── Table >5 rows → artifact (table)
        │   └── Table ≤5 rows → render as inline table
        │
        ├── Contains chart JSON spec?
        │   → artifact (chart) — always, never inline
        │
        ├── Contains checklist pattern (- [ ] or - [x])?
        │   → render as interactive checklist
        │
        ├── Contains markdown structure (headings, bold, lists, blockquotes)?
        │   ├── >500 chars + ≥2 headings → artifact (document)
        │   └── else → render as inline markdown
        │
        ├── Contains only plain text (no markdown syntax)?
        │   → render as plain prose with paragraph breaks
        │
        └── Contains mixed content (code + text + table)?
            → render each section with its appropriate type
            → mixed rendering (see section 1.4)
```

### 1.4 Mixed Content Handling

A single AI response often contains multiple content types. The rendering engine splits the response into **sections** and renders each with the appropriate type.

```
AI response:
┌──────────────────────────────────────────────────┐
│ "Here's the analysis you requested."              │ ← prose
│                                                   │
│ "## Summary"                                      │ ← heading
│ "Revenue grew 15% year-over-year..."              │ ← prose
│                                                   │
│ | Product | Revenue | Growth |                    │ ← table (≤5 rows → inline)
│ | Widget A | $45K   | +12%   |                    │
│ | Widget B | $38K   | -5%    |                    │
│                                                   │
│ "Here's the code to reproduce:"                   │ ← prose
│ ```python                                         │ ← code (≤20 lines → inline)
│ def calculate_growth(data):                       │
│     return (data[-1] - data[0]) / data[0]         │
│ ```                                               │
│                                                   │
│ "## Action Items"                                 │ ← heading
│ - [ ] Review Q3 numbers                           │ ← checklist
│ - [ ] Schedule meeting with finance               │
│ - [x] Pull raw data from warehouse                │
└──────────────────────────────────────────────────┘

Rendering result:
┌──────────────────────────────────────────────────┐
│  Here's the analysis you requested.               │  ← prose paragraph
│                                                    │
│  Summary                                           │  ← h2 heading
│  Revenue grew 15% year-over-year...                │  ← prose paragraph
│                                                    │
│  ┌──────────┬─────────┬────────┐                  │  ← inline table
│  │ Product  │ Revenue │ Growth │                  │
│  │ Widget A │ $45K    │ +12%   │                  │
│  │ Widget B │ $38K    │ -5%    │                  │
│  └──────────┴─────────┴────────┘                  │
│                                                    │
│  Here's the code to reproduce:                     │  ← prose paragraph
│  ┌─ python ──────────────────────┐                │  ← inline code block
│  │ def calculate_growth(data):   │                │
│  │     return (data[-1] - ...)    │                │
│  └───────────────────────────────┘                │
│                                                    │
│  Action Items                                      │  ← h2 heading
│  ☐ Review Q3 numbers                               │  ← interactive checklist
│  ☐ Schedule meeting with finance                   │
│  ☑ Pull raw data from warehouse                    │
└──────────────────────────────────────────────────┘
```

**Section splitting algorithm:**
1. Parse the markdown into an AST (using marked.js or similar).
2. Walk the AST top-level nodes.
3. Group consecutive nodes by type: prose blocks, code blocks, tables, lists.
4. Each group becomes a "render section" with a type label.
5. Render each section with its appropriate component.
6. Maintain visual continuity (spacing, no jarring transitions).

---

## 2. Render Type Matrix

### 2.1 Full Matrix

| Content signal | Render type | Inline or panel | Component | Interactive? | Copy? | Download? |
|---|---|---|---|---|---|---|
| Plain text, no markdown | `prose` | Inline | ProseRenderer | No | Yes (select text) | No |
| Headings, bold, lists, blockquotes | `markdown` | Inline | MarkdownRenderer | No | Yes (select text) | No |
| Fenced code ≤20 lines | `code_inline` | Inline | CodeBlock | No | Yes (button) | No |
| Fenced code >20 lines | `code_artifact` | Panel | CodeArtifact | No | Yes (button) | Yes (.py, .js, etc.) |
| Markdown table ≤5 rows | `table_inline` | Inline | TableInline | Sort only | Yes (select) | No |
| Markdown table >5 rows | `table_artifact` | Panel | TableArtifact | Sort, filter, search | Yes (CSV) | Yes (CSV) |
| Chart JSON spec | `chart_artifact` | Panel | ChartArtifact | Hover tooltips | Yes (PNG) | Yes (PNG, SVG) |
| Document >500 chars + ≥2 headings | `document_artifact` | Panel | DocumentArtifact | No | Yes (select) | Yes (PDF, HTML, MD) |
| Checklist (- [ ] items) | `checklist` | Inline | Checklist | Toggle items | No | No |
| Slide deck (---SLIDE---) | `slide_artifact` | Panel | SlideArtifact | Nav, full-screen | No | Yes (PDF, HTML) |
| Spreadsheet (## Sheet: + cells) | `spreadsheet_artifact` | Panel | SpreadsheetArtifact | Edit cells | No | Yes (XLSX, CSV) |
| Mixed (multiple types) | `mixed` | Inline (sections) | MixedRenderer | Per section | Per section | Per section |
| Error message | `error` | Inline | ErrorBlock | Retry button | No | No |
| Loading/streaming | `streaming` | Inline | StreamingIndicator | Stop button | No | No |

### 2.2 Decision Signals

Each render type is triggered by specific signals detected in the content:

#### `prose`
```
Signals:
  - No markdown syntax detected (no #, no **, no |, no ```)
  - Content is plain text with paragraph breaks (\n\n)
  - Length < 2000 chars (longer text usually gets markdown structure)

Example:
  "The revenue for Q3 was $108K, representing a 15% increase
   year-over-year. The main driver was Widget A sales."
```

#### `markdown`
```
Signals:
  - Contains markdown syntax: ##, **, -, >, `inline code`
  - Does NOT meet artifact thresholds (<500 chars or <2 headings)
  - May contain short code blocks (≤20 lines) and small tables (≤5 rows)

Example:
  "## Summary
   Revenue grew **15%** year-over-year.
   - Widget A: $45K
   - Widget B: $38K"
```

#### `code_inline`
```
Signals:
  - Contains fenced code block: ```language ... ```
  - Code block line count ≤ 20
  - No other substantial content (or code is the dominant section)

Example:
  ```python
  def hello():
      print("world")
  ```
```

#### `code_artifact`
```
Signals:
  - Contains fenced code block
  - Code block line count > 20
  - OR model explicitly tags: <artifact type="code">

Example:
  ```python
  import pandas as pd
  import numpy as np
  # ... 50+ lines of code ...
  ```
```

#### `table_inline`
```
Signals:
  - Contains markdown table: | header | header |
  - Row count (excluding header + separator) ≤ 5
  - Table is part of a larger response (not standalone)

Example:
  | Product | Revenue |
  |---------|---------|
  | A       | $45K    |
  | B       | $38K    |
```

#### `table_artifact`
```
Signals:
  - Contains markdown table
  - Row count > 5
  - OR model explicitly tags: <artifact type="table">
  - OR table has >4 columns (wide tables need panel space)

Example:
  | Product | Revenue | Growth | Margin | Region |
  |---------|---------|--------|--------|--------|
  | A       | $45K    | +12%   | 32%    | NA     |
  | B       | $38K    | -5%    | 28%    | EU     |
  ... 20+ rows ...
```

#### `chart_artifact`
```
Signals:
  - Content contains JSON with chart structure:
    { "chart_type": "bar"|"line"|"pie"|"scatter", "data": { "labels": [...], "datasets": [...] } }
  - OR model explicitly tags: <artifact type="chart">
  - OR content contains ```chart json block with chart spec

Example:
  ```chart
  {
    "chart_type": "bar",
    "title": "Revenue by Product",
    "data": {
      "labels": ["A", "B", "C"],
      "datasets": [{ "label": "Revenue", "data": [45000, 38000, 22000] }]
    }
  }
  ```
```

#### `document_artifact`
```
Signals:
  - Content is markdown
  - Total character count > 500
  - Contains ≥2 heading markers (# or ##)
  - OR model explicitly tags: <artifact type="report"> or <artifact type="document">

Example:
  # Q3 Revenue Analysis

  ## Summary
  Total revenue reached $108K...

  ## Findings
  - Widget A drove most growth...
  - Widget B declined due to...

  ## Recommendations
  1. Increase Widget A production...
  2. Investigate Widget B decline...
```

#### `checklist`
```
Signals:
  - Contains checkbox markdown: - [ ] or - [x]
  - At least 2 checkbox items
  - Items are part of a list (not isolated)

Example:
  ## Action Items
  - [ ] Review Q3 numbers
  - [ ] Schedule meeting with finance
  - [x] Pull raw data from warehouse
  - [ ] Prepare presentation
```

#### `slide_artifact`
```
Signals:
  - Content contains slide delimiters: ---SLIDE--- or ## Slide N:
  - OR model explicitly tags: <artifact type="slide_deck">
  - Multiple slide sections detected

Example:
  ## Slide 1: Title
  # Q3 Revenue Review
  2024 Annual Report

  ## Slide 2: Highlights
  - +15% revenue growth
  - 3 new enterprise clients

  ## Slide 3: Breakdown
  | Product | Revenue |
  ...
```

#### `spreadsheet_artifact`
```
Signals:
  - Content contains ## Sheet: header
  - Content contains cell references (A1, B2, etc.)
  - OR model explicitly tags: <artifact type="spreadsheet">

Example:
  ## Sheet: Budget
  A1: "Category"    B1: "Amount"   C1: "Status"
  A2: "Marketing"   B2: 5000       C2: "Approved"
  A3: "Engineering" B3: 12000      C3: "Pending"
```

#### `mixed`
```
Signals:
  - Content contains 2+ different content types
  - No single type dominates (>60% of content)
  - Each section is below artifact threshold individually

Example:
  "Here's the summary:"                    ← prose
  | Metric | Value |                        ← table_inline
  |---|---|
  | Revenue | $108K |
  "Code to reproduce:"                      ← prose
  ```python                                 ← code_inline
  print("hello")
  ```
  "- [ ] Review"                            ← checklist
```

---

## 3. Rendering Hint Schema

### 3.1 Hint Object Structure

The backend attaches rendering hints to each message. The frontend reads these hints to decide how to render.

```json
{
  "message_id": "msg_004",
  "render_type": "mixed",
  "sections": [
    {
      "section_id": "sec_0",
      "render_type": "prose",
      "content": "Here's the analysis you requested.",
      "hints": {
        "format": "paragraph",
        "max_width": "768px"
      }
    },
    {
      "section_id": "sec_1",
      "render_type": "markdown",
      "content": "## Summary\n\nRevenue grew **15%**...",
      "hints": {
        "format": "markdown",
        "max_width": "768px",
        "line_height": 1.7
      }
    },
    {
      "section_id": "sec_2",
      "render_type": "table_inline",
      "content": "| Product | Revenue | Growth |\n|---|---|---|\n| A | $45K | +12% |",
      "hints": {
        "format": "table",
        "sortable": true,
        "zebra": true,
        "max_height": "400px",
        "sticky_header": true
      }
    },
    {
      "section_id": "sec_3",
      "render_type": "code_inline",
      "content": "def calculate_growth(data):\n    return (data[-1] - data[0]) / data[0]",
      "hints": {
        "format": "code",
        "language": "python",
        "show_line_numbers": false,
        "max_height": "300px",
        "copy_button": true,
        "theme": "auto"
      }
    },
    {
      "section_id": "sec_4",
      "render_type": "checklist",
      "content": "- [ ] Review Q3 numbers\n- [x] Pull raw data\n- [ ] Schedule meeting",
      "hints": {
        "format": "checklist",
        "interactive": true,
        "persist_state": true
      }
    }
  ],
  "artifacts": [
    {
      "artifact_id": "art_001",
      "type": "document",
      "title": "Q3 Revenue Analysis",
      "auto_open": true,
      "open_in_panel": true,
      "render_hints": {
        "display_mode": "document",
        "reading_width": "680px",
        "font": "serif",
        "line_height": 1.8,
        "page_layout": {
          "page_size": "A4",
          "margins": "2cm",
          "header": "Q3 Revenue Analysis",
          "footer": "Page {n}"
        }
      },
      "export_formats": ["pdf", "html", "md"]
    }
  ]
}
```

### 3.2 Hint Schema Definition

```typescript
interface RenderingHints {
  message_id: string;
  render_type: RenderType;
  sections: RenderSection[];
  artifacts: ArtifactHint[];
}

type RenderType =
  | 'prose'
  | 'markdown'
  | 'code_inline'
  | 'code_artifact'
  | 'table_inline'
  | 'table_artifact'
  | 'chart_artifact'
  | 'document_artifact'
  | 'checklist'
  | 'slide_artifact'
  | 'spreadsheet_artifact'
  | 'mixed'
  | 'error'
  | 'streaming';

interface RenderSection {
  section_id: string;
  render_type: RenderType;
  content: string;              // raw content for this section
  hints: SectionHints;          // type-specific hints
}

interface SectionHints {
  // Common
  format: 'paragraph' | 'markdown' | 'table' | 'code' | 'checklist' | 'chart' | 'document' | 'slides' | 'spreadsheet';
  max_width?: string;          // CSS width
  line_height?: number;

  // Table-specific
  sortable?: boolean;
  filterable?: boolean;
  zebra?: boolean;
  sticky_header?: boolean;
  max_height?: string;
  column_alignments?: ('left' | 'right' | 'center')[];

  // Code-specific
  language?: string;
  show_line_numbers?: boolean;
  copy_button?: boolean;
  theme?: 'auto' | 'github-light' | 'github-dark' | 'monokai';

  // Checklist-specific
  interactive?: boolean;        // can user toggle checkboxes?
  persist_state?: boolean;      // save toggle state to DB?

  // Chart-specific
  chart_type?: 'bar' | 'line' | 'pie' | 'scatter' | 'doughnut' | 'radar';
  color_palette?: string[];
  legend_position?: 'top' | 'bottom' | 'left' | 'right' | 'none';
  animate?: boolean;
  responsive?: boolean;

  // Document-specific
  font?: 'sans' | 'serif' | 'mono';
  page_layout?: {
    page_size: 'A4' | 'Letter' | 'Legal';
    margins: string;
    header?: string;
    footer?: string;
  };
}

interface ArtifactHint {
  artifact_id: string;
  type: ArtifactType;
  title: string;
  auto_open: boolean;          // auto-open panel on desktop
  open_in_panel: boolean;       // show "Open in panel" button
  render_hints: SectionHints;
  export_formats: string[];     // ['pdf', 'html', 'md', 'csv', 'png', 'svg']
}
```

### 3.3 Backend Hint Generation

The backend generates hints during/after streaming using a detection pipeline:

```python
def generate_rendering_hints(content: str, message_id: str) -> RenderingHints:
    """Analyze AI response content and generate rendering hints."""

    # 1. Parse content into sections
    sections = split_into_sections(content)

    # 2. Classify each section
    classified_sections = []
    artifacts = []

    for section in sections:
        render_type = classify_section(section)
        hints = generate_section_hints(render_type, section)

        # Check if section should be an artifact
        if should_be_artifact(render_type, section):
            artifact = create_artifact_from_section(section, render_type, message_id)
            artifacts.append(artifact)
            # Section stays inline as a summary/preview
            hints.open_in_panel = True

        classified_sections.append({
            "section_id": f"sec_{len(classified_sections)}",
            "render_type": render_type,
            "content": section,
            "hints": hints,
        })

    # 3. Determine overall render type
    overall_type = determine_overall_type(classified_sections)

    return RenderingHints(
        message_id=message_id,
        render_type=overall_type,
        sections=classified_sections,
        artifacts=artifacts,
    )


def classify_section(content: str) -> RenderType:
    """Classify a content section into a render type."""

    # Check for chart spec
    if has_chart_spec(content):
        return 'chart_artifact'

    # Check for slide markers
    if has_slide_markers(content):
        return 'slide_artifact'

    # Check for spreadsheet markers
    if has_spreadsheet_markers(content):
        return 'spreadsheet_artifact'

    # Check for explicit artifact tags
    artifact_tag = extract_artifact_tag(content)
    if artifact_tag:
        return f'{artifact_tag}_artifact'

    # Check for code blocks
    code_blocks = extract_code_blocks(content)
    if code_blocks:
        longest = max(code_blocks, key=lambda b: b.line_count)
        if longest.line_count > 20:
            return 'code_artifact'
        return 'code_inline'

    # Check for tables
    tables = extract_tables(content)
    if tables:
        largest = max(tables, key=lambda t: t.row_count)
        if largest.row_count > 5 or largest.column_count > 4:
            return 'table_artifact'
        return 'table_inline'

    # Check for checklists
    if has_checklist(content):
        return 'checklist'

    # Check for markdown structure
    heading_count = count_headings(content)
    char_count = len(content)
    if char_count > 500 and heading_count >= 2:
        return 'document_artifact'
    if has_markdown_syntax(content):
        return 'markdown'

    # Default: plain prose
    return 'prose'


def should_be_artifact(render_type: str, content: str) -> bool:
    """Determine if a section should become an artifact."""
    artifact_types = {
        'code_artifact', 'table_artifact', 'chart_artifact',
        'document_artifact', 'slide_artifact', 'spreadsheet_artifact'
    }
    return render_type in artifact_types


def generate_section_hints(render_type: str, content: str) -> SectionHints:
    """Generate type-specific rendering hints."""

    if render_type in ('code_inline', 'code_artifact'):
        language = detect_language(content)
        line_count = count_lines(content)
        return SectionHints(
            format='code',
            language=language,
            show_line_numbers=line_count > 10,
            copy_button=True,
            max_height='300px' if render_type == 'code_inline' else None,
            theme='auto',
        )

    if render_type in ('table_inline', 'table_artifact'):
        table = extract_tables(content)[0]
        return SectionHints(
            format='table',
            sortable=True,
            filterable=render_type == 'table_artifact',
            zebra=True,
            sticky_header=render_type == 'table_artifact',
            max_height='400px' if table.row_count > 15 else None,
            column_alignments=infer_column_alignments(table),
        )

    if render_type == 'checklist':
        return SectionHints(
            format='checklist',
            interactive=True,
            persist_state=True,
        )

    if render_type == 'chart_artifact':
        spec = parse_chart_spec(content)
        return SectionHints(
            format='chart',
            chart_type=spec.chart_type,
            color_palette=['#d97757', '#6b6b6b', '#2d8a4e', '#c4850e', '#5b7c99'],
            legend_position='bottom',
            animate=True,
            responsive=True,
        )

    if render_type == 'document_artifact':
        return SectionHints(
            format='document',
            reading_width='680px',
            font='serif',
            line_height=1.8,
            page_layout={
                'page_size': 'A4',
                'margins': '2cm',
                'header': extract_title(content),
                'footer': 'Page {n}',
            },
        )

    if render_type == 'markdown':
        return SectionHints(
            format='markdown',
            max_width='768px',
            line_height=1.7,
        )

    # Default: prose
    return SectionHints(
        format='paragraph',
        max_width='768px',
    )
```

### 3.4 Hint Delivery

Hints are delivered to the frontend in two ways:

**During streaming (progressive):**
```
event: token
data: {"content": "# Q3 "}

event: token
data: {"content": "Revenue Analysis\n\n"}

event: render_hint
data: {"section_id": "sec_0", "render_type": "document_artifact", "auto_open": true}

event: done
data: {"message_id": "msg_004", "render_hints": { ... full hint object ... }}
```

**After streaming (complete):**
The full hint object is included in the `done` event. The frontend can also fetch hints via:
```
GET /api/messages/:id  →  response includes render_hints field
```

---

## 4. Fallback Strategy

### 4.1 Fallback Chain

Every render type has a fallback chain. If the preferred render fails, degrade gracefully to the next level.

```
chart_artifact
    │ render fails (Chart.js error, bad spec)
    ▼
table_artifact (if chart has tabular data)
    │ render fails
    ▼
markdown (show raw JSON in code block)
    │ render fails
    ▼
prose (plain text dump of the spec)
    │ render fails
    ▼
error block ("Couldn't render this content. [Copy raw]")
```

```
table_artifact
    │ interactive grid fails (JS error, too many rows)
    ▼
table_inline (static HTML table, no sort/filter)
    │ HTML table fails
    ▼
markdown (show raw markdown table text)
    │ render fails
    ▼
prose (pipe-delimited text)
    │ render fails
    ▼
error block
```

```
code_artifact
    │ syntax highlighting fails (unknown language, highlighter error)
    ▼
code_plain (monospace text, no highlighting)
    │ render fails
    ▼
prose (plain text in a <pre> block)
    │ render fails
    ▼
error block
```

```
document_artifact
    │ markdown rendering fails (malformed markdown, parser error)
    ▼
markdown_basic (strip to basic formatting: headings + paragraphs only)
    │ render fails
    ▼
prose (plain text with line breaks)
    │ render fails
    ▼
error block
```

```
slide_artifact
    │ slide rendering fails (bad slide structure)
    ▼
document_artifact (render as a single document with slide headings)
    │ render fails
    ▼
markdown
    │ render fails
    ▼
prose
```

```
checklist
    │ interactive checklist fails (JS error)
    ▼
markdown_list (static list with ☐/☑ characters)
    │ render fails
    ▼
prose (plain text list)
```

### 4.2 Fallback Implementation

```typescript
function renderSection(section: RenderSection): ReactNode {
  const chain = getFallbackChain(section.render_type);

  for (const renderer of chain) {
    try {
      const result = renderer(section);
      if (result) return result;
    } catch (e) {
      console.warn(`Render fallback: ${renderer.name} failed for ${section.render_type}`, e);
      continue; // try next fallback
    }
  }

  // All fallbacks failed — show error block
  return <ErrorBlock message="Couldn't render this content." onCopy={() => copy(section.content)} />;
}

function getFallbackChain(renderType: RenderType): RenderFunction[] {
  const chains: Record<RenderType, RenderFunction[]> = {
    chart_artifact: [ChartRenderer, TableRenderer, CodeBlockRenderer, ProseRenderer, ErrorRenderer],
    table_artifact: [TableGridRenderer, TableHTMLRenderer, MarkdownRenderer, ProseRenderer, ErrorRenderer],
    table_inline: [TableHTMLRenderer, MarkdownRenderer, ProseRenderer, ErrorRenderer],
    code_artifact: [CodeHighlightRenderer, CodePlainRenderer, ProseRenderer, ErrorRenderer],
    code_inline: [CodeHighlightRenderer, CodePlainRenderer, ProseRenderer, ErrorRenderer],
    document_artifact: [DocumentRenderer, MarkdownBasicRenderer, ProseRenderer, ErrorRenderer],
    slide_artifact: [SlideRenderer, DocumentRenderer, MarkdownRenderer, ProseRenderer, ErrorRenderer],
    spreadsheet_artifact: [SpreadsheetRenderer, TableGridRenderer, MarkdownRenderer, ProseRenderer, ErrorRenderer],
    checklist: [ChecklistRenderer, MarkdownListRenderer, ProseRenderer, ErrorRenderer],
    markdown: [MarkdownRenderer, ProseRenderer, ErrorRenderer],
    prose: [ProseRenderer, ErrorRenderer],
    mixed: [MixedRenderer, MarkdownRenderer, ProseRenderer, ErrorRenderer],
    error: [ErrorRenderer],
    streaming: [StreamingRenderer],
  };
  return chains[renderType] || [ProseRenderer, ErrorRenderer];
}
```

### 4.3 Fallback Triggers

| Render type | What triggers fallback | Fallback action |
|---|---|---|
| `chart_artifact` | Chart.js throws error, invalid chart spec, missing data | Show table if data is tabular, else show raw JSON |
| `table_artifact` | >10,000 rows (browser can't handle), JS error | Show static HTML table (first 100 rows) |
| `code_artifact` | Unknown language, highlighter library not loaded | Show plain monospace text |
| `document_artifact` | Malformed markdown, XSS attempt detected | Strip to basic paragraphs |
| `slide_artifact` | No slide delimiters found after parsing | Render as document |
| `checklist` | No checkbox items found after parsing | Render as markdown list |
| `spreadsheet_artifact` | Cell references invalid, grid library not loaded | Show as table |
| Any | Total render failure (JS crash, OOM) | Show error block with "Copy raw" button |

### 4.4 Fallback UX Rules

1. **Silent degradation.** The user should not see error messages for fallbacks. If a chart can't render and falls back to a table, the table just appears. No "Chart failed, showing table instead" notification.
2. **Always show content.** Even in the worst case, the raw text is available via "Copy raw." Never show a blank space.
3. **Log fallbacks for debugging.** Console.warn with the render type, fallback level, and error. Not visible to users but visible to developers.
4. **Never crash the page.** Every renderer is wrapped in a try/catch. A single section's failure never breaks the whole message.
5. **Preserve the "Open in panel" option.** Even if inline rendering falls back, the user can still open the artifact panel where a different renderer might succeed (more space, different rendering path).

---

## 5. UX Guardrails

### 5.1 Predictability Rules

| Rule | Why |
|---|---|
| **Same content = same render.** If the AI produces the same table twice, it renders the same way both times. No random switching between inline and panel. | Consistency builds trust. Users learn what to expect. |
| **Artifacts auto-open once per message.** If the user closes the panel, it doesn't re-open for the same message. Clicking "Open in panel" re-opens it. | Respects user intent. They closed it for a reason. |
| **Inline previews are always readable.** Even if the full artifact is in the panel, the inline version shows enough to understand the answer without opening the panel. | User shouldn't be forced to open the panel to read the answer. |
| **Panel content matches inline preview.** The table shown inline is the same table shown in the panel (just with more features). No surprise differences. | Consistency between surfaces. |
| **Checklist state persists.** If a user checks off items, that state survives page reload. | Checklists are actionable; losing state is frustrating. |

### 5.2 Visual Continuity Rules

| Rule | Implementation |
|---|---|
| **No jarring transitions between sections.** Consistent spacing (16px) between all section types in a mixed render. | CSS: `.render-section + .render-section { margin-top: 16px; }` |
| **Code blocks don't break reading flow.** Inline code blocks have the same border radius and background as other elements. No harsh contrast. | Use `--code-bg` and `--code-border` variables consistently. |
| **Tables don't overflow.** Wide tables scroll horizontally within their container. Never break page layout. | `overflow-x: auto` on table wrapper. |
| **Charts have consistent sizing.** All charts fill their container width. Height is proportional (default 300px inline, 400px panel). | `responsive: true, maintainAspectRatio: false` in Chart.js config. |
| **Headings use the same scale everywhere.** h1=22px, h2=18px, h3=16px in both inline and panel rendering. | Shared CSS for `.message-body` and `.artifact-preview`. |

### 5.3 Interaction Guardrails

| Rule | Why |
|---|---|
| **Copy buttons are always available on code blocks.** Even in fallback (plain text) mode. | Code is meant to be copied. |
| **Tables are always sortable (even inline).** Click header to sort. No need to open panel for basic sort. | Sorting is a basic expectation, not an advanced feature. |
| **Checklist toggles are instant.** No loading state, no API call needed for toggle (persist async in background). | Toggles should feel immediate, like native checkboxes. |
| **"Open in panel" is a button, not a link.** It looks like a secondary action (ghost button), not a primary link. | Opening the panel is optional, not required. |
| **Panel close is always one click.** ✕ button, Escape key, or click outside (on overlay). Never trap the user. | Users should never feel stuck in the panel. |

### 5.4 Content Safety Guardrails

| Rule | Implementation |
|---|---|
| **Sanitize all rendered HTML.** DOMPurify on every markdown render. No raw HTML injection. | `DOMPurify.sanitize(marked.parse(content))` |
| **No script execution from AI output.** Strip `<script>` tags, `on*` attributes, `javascript:` URLs. | DOMPurify config: `{ FORBID_TAGS: ['script'], FORBID_ATTR: ['onerror', 'onload', 'onclick'] }` |
| **No iframe injection.** AI output can't embed iframes. | DOMPurify: `{ FORBID_TAGS: ['iframe'] }` |
| **Code blocks are display-only.** Even if code contains HTML, it's rendered as text inside `<code>`, not parsed as HTML. | `escapeHtml()` before rendering inside code blocks. |
| **Chart specs are validated.** Only known chart types (bar, line, pie, scatter, doughnut, radar) are accepted. Unknown types fall back to table. | Validate `chart_type` against allowlist before passing to Chart.js. |
| **Table cell content is escaped.** No HTML in table cells. Only text. | `escapeHtml()` on every cell value. |

### 5.5 Performance Guardrails

| Rule | Why |
|---|---|
| **Virtualize large tables.** If a table has >100 rows, use virtual scrolling (render only visible rows). | DOM with 10,000 rows freezes the browser. |
| **Lazy-load Chart.js.** Only load the chart library when a chart artifact is detected. Don't bundle it for users who never use charts. | Reduces initial page load by ~50KB. |
| **Debounce streaming renders.** During streaming, don't re-render markdown on every token. Batch updates every 100ms. | Re-parsing markdown 50 times/second is wasteful and janky. |
| **Cache rendered HTML.** Once a message is finalized, cache its rendered HTML in memory (and IndexedDB). On reload, inject cached HTML without re-parsing. | Re-parsing 50 messages on page load is slow. |
| **Limit concurrent chart renders.** If a message has 5 charts, render them sequentially, not in parallel. Each chart uses canvas + animation. | 5 simultaneous chart animations cause frame drops. |

### 5.6 Streaming-Specific Guardrails

| Rule | Implementation |
|---|---|
| **Show typing dots before first token.** 3 pulsing dots in the message area. Disappears when first token arrives. | `if (!hasContent) showTypingDots();` |
| **Render markdown progressively.** As tokens arrive, render what's available. Don't wait for the full response. | `updateMessage(msgId, accumulatedContent)` on each token. |
| **Don't finalize until `done` event.** Streaming render is "draft" quality. Final render (with hints, artifacts, code highlighting) happens on `done`. | `onDone: applyRenderingHints(finalContent, hints)`. |
| **Code highlighting on done, not during stream.** Syntax highlighting is expensive. Show plain monospace during streaming, highlight on completion. | `if (streaming) renderPlainCode(); else renderHighlightedCode();` |
| **Tables render on done, not during stream.** A half-streamed table is broken markdown. Show raw text during streaming, render table on completion. | `if (streaming && hasTable) renderAsText(); else renderTable();` |
| **Artifact detection on done, not during stream.** Can't reliably detect artifacts until content is complete. Show inline during streaming, open panel on done. | `onDone: detectArtifacts(fullContent)`. |

---

## 6. Render Type Selection Examples

### Example 1: Short factual answer

```
User: "What is 2+2?"
AI: "2+2 equals 4."

Detection:
  - No markdown syntax → prose
  - <500 chars, no headings → not artifact

Result: render_type = "prose"
  → Plain paragraph, no decoration.
```

### Example 2: Structured explanation

```
User: "Explain how HTTP caching works."
AI: "## How HTTP Caching Works\n\nHTTP caching stores responses...
     \n\n### Cache-Control Header\n\nThe `Cache-Control` header...
     \n\n### ETag Validation\n\nWhen a resource changes..."

Detection:
  - Has markdown (##, ###, `inline code`) → markdown
  - >500 chars + ≥2 headings → document_artifact

Result: render_type = "document_artifact"
  → Inline: rendered markdown (readable summary)
  → Panel: document preview with reading layout + PDF export
  → "Open in panel →" button on inline version
```

### Example 3: Data analysis with table

```
User: "Show me the revenue breakdown."
AI: "Here's the revenue breakdown by product:\n\n
     | Product | Q1 | Q2 | Q3 | Total |\n
     |---------|-----|-----|-----|-------|\n
     | Widget A | $10K | $12K | $15K | $37K |\n
     | Widget B | $8K | $7K | $6K | $21K |\n
     | Widget C | $5K | $6K | $8K | $19K |\n
     | Widget D | $3K | $4K | $5K | $12K |\n
     | Widget E | $2K | $3K | $4K | $9K |\n
     | Widget F | $1K | $2K | $3K | $6K |\n
     | **Total** | **$29K** | **$34K** | **$41K** | **$104K** |"

Detection:
  - Has markdown table → check row count
  - 6 data rows (>5) → table_artifact

Result: render_type = "table_artifact"
  → Inline: static HTML table (readable, scrollable)
  → Panel: interactive grid (sortable, filterable, CSV export)
  → "Open in panel →" button
```

### Example 4: Code solution

```
User: "Write a Python function to process a CSV file."
AI: "Here's a function that reads and processes a CSV:\n\n
     ```python\n
     import pandas as pd\n
     \n
     def process_csv(file_path: str) -> pd.DataFrame:\n
         \"\"\"Read and clean a CSV file.\"\"\"\n
         df = pd.read_csv(file_path)\n
         df = df.dropna()\n
         df.columns = [c.strip().lower() for c in df.columns]\n
         df = df.drop_duplicates()\n
         return df\n
     \n
     def summarize_csv(df: pd.DataFrame) -> dict:\n
         \"\"\"Generate summary statistics.\"\"\"\n
         return {\n
             'row_count': len(df),\n
             'column_count': len(df.columns),\n
             'numeric_columns': list(df.select_dtypes('number').columns),\n
             'missing_values': df.isnull().sum().to_dict(),\n
         }\n
     \n
     # Usage\n
     df = process_csv('data.csv')\n
     summary = summarize_csv(df)\n
     print(summary)\n
     ```"

Detection:
  - Has fenced code block → check line count
  - 18 lines → ≤20 → code_inline (NOT artifact)

Result: render_type = "code_inline"
  → Inline code block with syntax highlighting
  → Copy button
  → No panel needed (short enough to read inline)
```

### Example 5: Complex analysis with chart

```
User: "Analyze the sales data and visualize the trend."
AI: "## Sales Trend Analysis\n\n
     Revenue has grown steadily over Q1-Q3...\n\n
     ```chart\n
     {\n
       "chart_type": "line",\n
       "title": "Monthly Revenue 2024",\n
       "data": {\n
         "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"],\n
         "datasets": [{\n
           "label": "Revenue ($K)",\n
           "data": [29, 31, 34, 36, 38, 40, 42, 44, 41]\n
         }]\n
       }\n
     }\n
     ```\n\n
     Key insight: Revenue peaked in August at $44K..."

Detection:
  - Has chart JSON spec → chart_artifact (always panel)
  - Also has markdown text around it → mixed

Result: render_type = "mixed"
  Sections:
    1. "markdown" — "## Sales Trend Analysis" + prose
    2. "chart_artifact" — chart spec → panel
    3. "markdown" — "Key insight: Revenue peaked..."
  → Chart auto-opens in panel (desktop)
  → Text renders inline
```

### Example 6: Action plan with checklist

```
User: "Create an action plan for launching our new product."
AI: "## Product Launch Action Plan\n\n
     ### Phase 1: Preparation (Weeks 1-2)\n
     - [ ] Finalize product specifications\n
     - [ ] Complete market research\n
     - [ ] Set pricing strategy\n
     - [ ] Create marketing brief\n\n
     ### Phase 2: Development (Weeks 3-6)\n
     - [ ] Build MVP\n
     - [ ] Internal testing\n
     - [ ] Beta user recruitment\n
     - [x] Secure development resources\n\n
     ### Phase 3: Launch (Weeks 7-8)\n
     - [ ] Marketing campaign kickoff\n
     - [ ] Press release distribution\n
     - [ ] Monitor initial feedback"

Detection:
  - Has checklist items (- [ ] and - [x]) → checklist
  - Has headings (##, ###) → markdown structure
  - >500 chars + ≥2 headings → could be document_artifact
  - BUT: dominant content is checklist → render as interactive checklist within markdown

Result: render_type = "mixed"
  Sections:
    1. "markdown" — "## Product Launch Action Plan" heading
    2. "checklist" — Phase 1 items (interactive)
    3. "markdown" — "### Phase 2" heading
    4. "checklist" — Phase 2 items (interactive)
    5. "markdown" — "### Phase 3" heading
    6. "checklist" — Phase 3 items (interactive)
  → Checkboxes are toggleable
  → State persists across page reloads
  → No artifact panel needed (checklists are inline)
```

### Example 7: Full report (document artifact)

```
User: "Generate a Q3 analysis report."
AI: "# Q3 2024 Revenue Analysis\n\n
     ## Executive Summary\n\n
     Total revenue for Q3 2024 reached $108K, representing
     a 15% year-over-year increase...\n\n
     ## Methodology\n\n
     This analysis covers all product lines...\n\n
     ## Findings\n\n
     ### Revenue by Product\n\n
     Widget A drove the majority of growth...\n\n
     | Product | Revenue | Growth |\n
     |---------|---------|--------|\n
     | A | $45K | +12% |\n
     | B | $38K | -5% |\n\n
     ### Regional Breakdown\n\n
     North America accounted for 60%...\n\n
     ## Recommendations\n\n
     1. Increase Widget A production capacity\n
     2. Investigate Widget B decline\n
     3. Expand EU marketing budget\n\n
     ## Conclusion\n\n
     Q3 showed strong overall growth..."

Detection:
  - >500 chars → check
  - ≥2 headings (##, ###) → check
  - Contains a small table (2 rows) → table_inline within document
  - Overall: document_artifact

Result: render_type = "document_artifact"
  → Panel: rendered as a document with reading layout (serif, 680px width)
  → Inline: rendered markdown (readable summary)
  → Panel toolbar: Copy, Download as PDF, Download as HTML, Download as MD
  → The small table inside renders as table_inline within the document
  → "Open in panel →" button on inline version
```

---

## 7. Summary: When to Use What

```
Content arrives
    │
    ├── Is it a chart spec? → chart_artifact (always panel)
    ├── Is it a slide deck? → slide_artifact (always panel)
    ├── Is it a spreadsheet? → spreadsheet_artifact (always panel)
    ├── Is it code >20 lines? → code_artifact (panel + inline preview)
    ├── Is it a table >5 rows? → table_artifact (panel + inline preview)
    ├── Is it a document >500 chars + ≥2 headings? → document_artifact (panel + inline preview)
    ├── Is it a checklist? → checklist (inline, interactive)
    ├── Is it code ≤20 lines? → code_inline (inline, copy button)
    ├── Is it a table ≤5 rows? → table_inline (inline, sortable)
    ├── Is it markdown with structure? → markdown (inline)
    ├── Is it plain text? → prose (inline, paragraph)
    └── Is it multiple types? → mixed (inline sections, each with own type)
```

**The golden rule:** Default to the richest format the content supports, but always have a readable inline version. The user should never be forced to open the panel to understand the answer.