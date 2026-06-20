# GLM Workspace — Artifact / Workbench Side Panel

> The panel where AI-generated deliverables come to life.
> Chat is for thinking. The panel is for shipping.

---

## 1. Panel Purpose

The artifact panel is a **dedicated workspace surface** that sits beside the chat. It renders, manages, and exports AI-generated deliverables — reports, code, tables, charts, documents, slides, spreadsheets — as first-class objects with their own lifecycle.

### What the panel IS

- A persistent surface for viewing and interacting with a generated deliverable
- A place to iterate: edit, regenerate, version, and refine without losing the conversation
- An export hub: copy, download, and share the final output
- A reading environment: documents render with proper typography, tables with sorting, charts with interactivity

### What the panel is NOT

- Not a replacement for the chat. The chat is always visible (desktop) or one tap away (mobile).
- Not a modal. It doesn't block interaction with the conversation.
- Not a file manager. It shows one artifact at a time (with tabs if multiple exist).
- Not an editor for the conversation. It edits the artifact, not the messages.

### Design philosophy

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  CHAT (left)              ARTIFACT PANEL (right)            │
│  ─────────                ──────────────────               │
│  Conversation              The work                         │
│  Thinking                  The deliverable                  │
│  Iteration input           Iteration output                 │
│  "Make it shorter" ──────▶ Updated report in panel          │
│                                                             │
│  The chat asks. The panel answers.                          │
│  The chat changes. The panel persists.                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Opening Rules

### 2.1 When Output Stays Inline vs Opens in Panel

| Content characteristic | Inline | Panel | Why |
|---|---|---|---|
| Plain prose answer (<500 chars, no structure) | ✅ | ❌ | Short answers don't need a dedicated surface |
| Markdown with headings/lists (<500 chars or <2 headings) | ✅ | ❌ | Readable in the chat flow |
| Code block ≤20 lines | ✅ | ❌ | Short code is readable inline with copy button |
| Table ≤5 rows, ≤4 columns | ✅ | ❌ | Small tables are glanceable in chat |
| Checklist | ✅ | ❌ | Checklists are actionable inline, no need for panel |
| Code block >20 lines | ✅ preview | ✅ | Long code needs line numbers, full-height view, download |
| Table >5 rows OR >4 columns | ✅ preview | ✅ | Large tables need sorting, filtering, CSV export |
| Chart spec (any size) | ❌ | ✅ | Charts can't render inline; always need panel |
| Document/report >500 chars + ≥2 headings | ✅ preview | ✅ | Substantial documents need reading layout + PDF export |
| Slide deck (any) | ❌ | ✅ | Slides need navigation, full-screen mode |
| Spreadsheet (any) | ❌ | ✅ | Spreadsheets need editable grid |
| Explicit `<artifact>` tag from model | ✅ preview | ✅ | Model explicitly requested artifact treatment |

### 2.2 Auto-Open Rules

```
Artifact detected in AI response
        │
        ├── Desktop (≥1024px)?
        │   ├── Yes → Auto-open panel. Chat stays visible on left.
        │   │        Panel slides in from right (250ms ease).
        │   │        User can close it. Won't re-open for same message
        │   │        unless they click "Open in panel →".
        │   │
        │   └── Panel already open with a different artifact?
        │       → Show tab for new artifact. Don't replace current.
        │       → Tab badge pulses briefly to draw attention.
        │
        └── Mobile/tablet (<1024px)?
            → Do NOT auto-open. Would cover the chat entirely.
            → Show "Open in panel →" button at bottom of message.
            → User taps to open full-screen panel.
            → Back button returns to chat.
```

### 2.3 Manual Open

Users can always open the panel manually:

| Trigger | Action |
|---|---|
| Click "Open in panel →" on any assistant message | Opens panel with that message's artifact(s) |
| Click an artifact in the sidebar "Artifacts" section (phase 2) | Opens panel with that artifact |
| Click a file chip in a message | Opens file preview in panel |
| Keyboard: Cmd+Shift+P | Opens panel with most recent artifact |

### 2.4 Close Rules

| Trigger | Behavior |
|---|---|
| Click ✕ in panel header | Panel slides out. Chat expands to full width. Artifact is NOT deleted. |
| Press Escape | Same as ✕. |
| Click outside panel (on overlay, mobile only) | Same as ✕. |
| Start a new chat | Panel closes. Artifact persists in DB, linked to old conversation. |
| Navigate to different conversation | Panel closes. Reopens if that conversation has artifacts and user clicks one. |

**Closing does NOT delete or unpin.** The artifact is always recoverable via the message's "Open in panel →" button or the artifacts list (phase 2).

### 2.5 Pinned Panel

Users can **pin** the panel so it stays open across conversation switches.

```
Normal mode:
  - Switch conversation → panel closes
  - Must manually reopen

Pinned mode:
  - Switch conversation → panel stays open
  - Shows "No artifact in this conversation" if none exists
  - Or shows the most recent artifact from the new conversation
  - Pin toggle in panel header (📌 icon)
```

**Pin behavior:**
- Pin is per-workspace, not per-conversation.
- When pinned, the panel reserves space even when empty (shows empty state).
- When unpinned, the panel closes when empty or when switching conversations.
- Pin state persists across page reloads (localStorage).

---

## 3. Component Structure

### 3.1 Desktop Layout (≥1024px)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  SIDEBAR    │  CHAT COLUMN              │  ARTIFACT PANEL                  │
│  (260px)    │  (flex: 1, min 420px)    │  (480px, collapsible)             │
│             │                          │                                  │
│  Logo       │  Topbar                  │  ┌──────────────────────────────┐│
│  New Chat   │  [☰] Title    [🌙]       │  │ HEADER                       ││
│  ─────      │  ─────────               │  │ [type icon] Title    [📌][✕] ││
│  History    │  Messages                │  ├──────────────────────────────┤│
│  ─────      │  (scrollable)             │  │ TABS (if multiple artifacts)  ││
│  Status     │                          │  │ [Report] [Table] [Chart]     ││
│             │  ─────────               │  ├──────────────────────────────┤│
│             │  Composer                │  │ TOOLBAR                      ││
│             │  [📎] [input...] [↑]    │  │ [Copy] [Edit] [Regenerate]   ││
│             │                          │  │ [Download ▾] [Versions ▾]     ││
│             │                          │  ├──────────────────────────────┤│
│             │                          │  │                              ││
│             │                          │  │  PREVIEW AREA                ││
│             │                          │  │  (scrollable, type-specific) ││
│             │                          │  │                              ││
│             │                          │  │  Document: reading layout    ││
│             │                          │  │  Code: syntax highlight      ││
│             │                          │  │  Table: interactive grid      ││
│             │                          │  │  Chart: Chart.js render      ││
│             │                          │  │  Slides: slide navigator     ││
│             │                          │  │  Spreadsheet: editable grid   ││
│             │                          │  │                              ││
│             │                          │  ├──────────────────────────────┤│
│             │                          │  │ STATUS BAR                   ││
│             │                          │  │ v3 • Updated 2 min ago       ││
│             │                          │  └──────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Mobile Layout (<1024px)

```
┌──────────────────────────────┐
│  TOPBAR                       │
│  [☰] GLM-5.2      [🌙]        │
├──────────────────────────────┤
│                              │
│  CHAT (full screen)          │
│  Messages                    │
│  ─────────                   │
│  Composer                    │
│                              │
└──────────────────────────────┘

When user taps "Open in panel →":

┌──────────────────────────────┐
│  HEADER                       │
│  [← Back] Title    [📌][✕]   │
├──────────────────────────────┤
│  TABS (if multiple)          │
│  [Report] [Table] [Chart]    │
├──────────────────────────────┤
│  TOOLBAR                      │
│  [Copy] [Edit] [Regen] [↓]   │
├──────────────────────────────┤
│                              │
│  PREVIEW AREA                 │
│  (full screen, scrollable)   │
│                              │
├──────────────────────────────┤
│  STATUS BAR                   │
│  v3 • Updated 2 min ago       │
└──────────────────────────────┘

Swipe right or tap ← Back → returns to chat.
```

### 3.3 Panel Sections

#### Header

```
┌──────────────────────────────────────────────────────────────┐
│  [📄] Q3 Revenue Analysis              [📌] [✕]              │
│  Report • 1,250 words                                         │
└──────────────────────────────────────────────────────────────┘
```

- **Type icon:** 📄 document, 💻 code, 📊 table, 📈 chart, 🎞 slides, 📋 spreadsheet
- **Title:** Artifact title (editable on double-click)
- **Subtitle:** Type label + size info (word count, row count, line count)
- **Pin button:** 📌 (toggles pinned state)
- **Close button:** ✕ (closes panel, artifact persists)

#### Tabs (multiple artifacts in one message)

```
┌──────────────────────────────────────────────────────────────┐
│  [📄 Report] [📊 Table] [📈 Chart]                          │
└──────────────────────────────────────────────────────────────┘
```

- Appears when a single AI response generates multiple artifacts.
- Each tab shows type icon + title (truncated).
- Active tab: accent underline.
- New tab pulses briefly when first added.
- Close button on hover (per tab) — closes that artifact's tab only.

#### Toolbar

```
┌──────────────────────────────────────────────────────────────┐
│  [📋 Copy] [✏️ Edit] [🔄 Regenerate] [⬇ Download ▾] [⏱ v3 ▾]│
└──────────────────────────────────────────────────────────────┘
```

- **Copy:** Copies artifact content to clipboard (raw text/markdown/CSV depending on type).
- **Edit:** Enters edit mode (textarea overlay). Creates new version on save.
- **Regenerate:** Opens composer with pre-filled prompt. AI creates new version.
- **Download:** Dropdown with format options (type-specific).
- **Versions:** Dropdown showing version history. Select to view older version.

**Toolbar visibility by artifact type:**

| Action | Document | Code | Table | Chart | Slides | Spreadsheet |
|---|---|---|---|---|---|---|
| Copy | ✅ | ✅ | ✅ (CSV) | ✅ (PNG) | ✅ | ✅ (CSV) |
| Edit | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Regenerate | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Download | PDF, HTML, MD | .py, .js | CSV, XLSX | PNG, SVG | PDF, HTML | XLSX, CSV |
| Versions | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

#### Preview Area

Type-specific rendering (see section 3.4 below). Scrollable. Fills remaining panel height.

#### Status Bar

```
┌──────────────────────────────────────────────────────────────┐
│  v3 • Updated 2 min ago • Linked to "Q3 Analysis" chat       │
└──────────────────────────────────────────────────────────────┘
```

- Current version number.
- Last updated time (relative: "2 min ago", "yesterday").
- Source conversation title (clickable — navigates to that conversation).

### 3.4 Preview Area by Type

#### Document / Report Preview

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Q3 Revenue Analysis                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                              │
│  Executive Summary                                           │
│                                                              │
│  Total revenue for Q3 2024 reached $108K, representing       │
│  a 15% year-over-year increase. This growth was driven       │
│  primarily by Widget A, which saw a 12% increase in          │
│  sales volume...                                             │
│                                                              │
│  Methodology                                                │
│                                                              │
│  This analysis covers all product lines across all           │
│  regions...                                                 │
│                                                              │
│  ┌──────────┬─────────┬────────┐                             │
│  │ Product  │ Revenue │ Growth │                             │
│  │ Widget A │ $45K    │ +12%   │                             │
│  │ Widget B │ $38K    │ -5%    │                             │
│  └──────────┴─────────┴────────┘                             │
│                                                              │
│  Recommendations                                             │
│  1. Increase Widget A production capacity                    │
│  2. Investigate Widget B decline                             │
│  ...                                                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

- **Reading layout:** 680px max width, serif font, 1.8 line height.
- **Page-like appearance:** White background, subtle padding (40px).
- **Tables within document:** Render as inline tables (not separate artifacts).
- **Code within document:** Render as inline code blocks.
- **Scroll:** Vertical scroll for long documents.
- **Print mode:** "Download as PDF" triggers print-optimized layout.

#### Code Preview

```
┌──────────────────────────────────────────────────────────────┐
│  python ▼                                    [Copy]           │
├──────────────────────────────────────────────────────────────┤
│  1 │ import pandas as pd                                     │
│  2 │ import numpy as np                                      │
│  3 │                                                          │
│  4 │ def process_csv(file_path: str) -> pd.DataFrame:        │
│  5 │     """Read and clean a CSV file."""                     │
│  6 │     df = pd.read_csv(file_path)                          │
│  7 │     df = df.dropna()                                    │
│  8 │     df.columns = [c.strip().lower() for c in df.columns] │
│  9 │     df = df.drop_duplicates()                           │
│ 10 │     return df                                            │
│ 11 │                                                          │
│ 12 │ def summarize_csv(df: pd.DataFrame) -> dict:            │
│ 13 │     """Generate summary statistics."""                   │
│ 14 │     return {                                             │
│ 15 │         'row_count': len(df),                            │
│ 16 │         'column_count': len(df.columns),                 │
│ 17 │     }                                                    │
└──────────────────────────────────────────────────────────────┘
```

- **Language label:** Top-left, with dropdown to change highlighting.
- **Line numbers:** Always on, monospace, right-aligned, muted.
- **Syntax highlighting:** highlight.js or Prism.
- **Horizontal scroll:** No line wrapping. Long lines scroll.
- **Full height:** Uses all available panel space.
- **Copy button:** Copies raw code (no line numbers).

#### Table Preview

```
┌──────────────────────────────────────────────────────────────┐
│  🔍 Search...                                  [Download CSV] │
├──────┬──────────┬─────────┬────────┬────────┬────────────────┤
│      │ Product  │ Revenue │ Growth │ Margin │ Region         │
│      │ ▲▼       │ ▲▼      │ ▲▼     │ ▲▼    │ ▲▼            │
├──────┼──────────┼─────────┼────────┼────────┼────────────────┤
│  1   │ Widget A │ $45K    │ +12%   │ 32%    │ North America  │
│  2   │ Widget B │ $38K    │ -5%    │ 28%    │ Europe         │
│  3   │ Widget C │ $22K    │ +8%    │ 25%    │ Asia           │
│  4   │ Widget D │ $12K    │ +3%    │ 20%    │ North America  │
│  5   │ Widget E │ $9K     │ -2%    │ 18%    │ Europe         │
│  ... │ ...      │ ...     │ ...    │ ...    │ ...            │
│ 150  │ Widget Z │ $1K     │ +1%   │ 15%    │ Asia           │
└──────┴──────────┴─────────┴────────┴────────┴────────────────┘
```

- **Search bar:** Filters rows by any column (case-insensitive).
- **Sortable columns:** Click header to sort ascending, click again for descending. Active sort: ▲ or ▼ indicator.
- **Sticky header:** Header row stays visible while scrolling.
- **Row numbers:** Left column, muted.
- **Zebra striping:** Alternating row backgrounds for readability.
- **Virtual scrolling:** If >100 rows, only render visible rows + buffer.
- **Column alignment:** Numbers right-aligned, text left-aligned.
- **Cell formatting:** Currency ($45K), percentages (+12%), dates (auto-format).

#### Chart Preview

```
┌──────────────────────────────────────────────────────────────┐
│  Revenue by Product                          [PNG] [SVG]     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  $50K ┤    ██                                                │
│       │    ██                                                │
│  $40K ┤    ██    ██                                          │
│       │    ██    ██                                          │
│  $30K ┤    ██    ██    ██                                    │
│       │    ██    ██    ██                                    │
│  $20K ┤    ██    ██    ██    ██                              │
│       │    ██    ██    ██    ██                              │
│  $10K ┤    ██    ██    ██    ██    ██                        │
│       │    ██    ██    ██    ██    ██                        │
│       └──────────────────────────────────                    │
│        Widget A  B     C     D     E                         │
│                                                              │
│  ● Revenue   ● Growth                                       │
└──────────────────────────────────────────────────────────────┘
```

- **Chart.js render:** Bar, line, pie, scatter, doughnut, radar.
- **Title:** Chart title at top.
- **Legend:** Bottom, with color dots.
- **Hover tooltip:** Shows exact values on hover.
- **Responsive:** Chart resizes with panel width.
- **Export:** PNG (raster) and SVG (vector) download.
- **Color palette:** Product palette (terracotta, warm grays, muted greens/blues).

#### Slide Preview

```
┌──────────────────────────────────────────────────────────────┐
│  ◀  2 / 5  ▶                              [Fullscreen] [PDF] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                                                        │ │
│  │              Q3 Revenue Review                         │ │
│  │              2024 Annual Report                        │ │
│  │                                                        │ │
│  │              ──────────────                            │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  [1] [2] [3] [4] [5]                                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

- **Slide navigation:** Previous/next arrows + slide counter.
- **Slide thumbnails:** Bottom row, clickable to jump.
- **Fullscreen:** Expands slide to fill panel (and browser on mobile).
- **Slide layouts:** Title, bullets, split, image, chart.
- **Export:** PDF (one slide per page) or HTML (interactive).

#### Spreadsheet Preview

```
┌──────────────────────────────────────────────────────────────┐
│  Sheet: Budget ▾                            [XLSX] [CSV]     │
├──────┬────────────┬──────────┬──────────┬────────────────────┤
│      │ A          │ B        │ C        │ D                  │
├──────┼────────────┼──────────┼──────────┼────────────────────┤
│ 1    │ Category   │ Amount   │ Status   │ Notes              │
│ 2    │ Marketing  │ 5000     │ Approved │ Q3 campaign        │
│ 3    │ Engineering│ 12000    │ Pending  │ Need approval      │
│ 4    │ Operations │ 8000     │ Approved │                    │
│ 5    │ Research   │ 3000     │ Draft    │ TBD                │
├──────┴────────────┴──────────┴──────────┴────────────────────┤
│  Sum: 28000                                                  │
└──────────────────────────────────────────────────────────────┘
```

- **Editable cells:** Double-click to edit. Enter to save, Escape to cancel.
- **Sheet tabs:** If multiple sheets, tabs at bottom.
- **Formula bar:** Shows selected cell content (phase 2: basic formulas).
- **Column headers:** A, B, C, ... (Excel-style).
- **Row numbers:** 1, 2, 3, ...
- **Export:** XLSX (preserves formatting) or CSV (flat).

### 3.5 Empty State

When panel is pinned but no artifact exists:

```
┌──────────────────────────────────────────────────────────────┐
│  HEADER (empty)                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                                                              │
│                    📄                                        │
│                                                              │
│              No artifact yet                                 │
│                                                              │
│         Ask GLM-5.2 to generate a report,                     │
│         code snippet, or data table.                         │
│                                                              │
│         Try: "Create a Q3 summary report"                    │
│                                                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 3.6 Loading State

When artifact is being generated (during streaming):

```
┌──────────────────────────────────────────────────────────────┐
│  HEADER (skeleton)                                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Generating…                                                 │
│  ████████████░░░░░░░░░░░░  60%                               │
│                                                              │
│  Rendering content → Applying styles → Generating PDF        │
│                                                              │
│  (skeleton shimmer in preview area)                         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Actions

### 4.1 Open

**Trigger:** Click "Open in panel →" on a message, or auto-open on desktop.

**Behavior:**
1. Panel slides in from right (250ms ease).
2. Chat column shrinks to accommodate (desktop). On mobile, chat is hidden behind panel.
3. Artifact content loads from DB (or is already in memory if just generated).
4. Preview area renders content by type.
5. Toolbar shows available actions for this artifact type.
6. Status bar shows version + last updated.

**If panel is already open with a different artifact:**
- New artifact gets a new tab.
- Active tab switches to the new artifact.
- Old artifact tab remains accessible.

**If panel is already open with the same artifact:**
- No-op. Panel stays as-is.

### 4.2 Close

**Trigger:** Click ✕, press Escape, or click overlay (mobile).

**Behavior:**
1. Panel slides out to right (250ms ease).
2. Chat column expands to full width (desktop). On mobile, chat is revealed.
3. Artifact is NOT deleted. NOT unpinned (if pinned).
4. "Open in panel →" button remains on the message for reopening.
5. If pinned, panel shows empty state instead of closing.

### 4.3 Pin

**Trigger:** Click 📌 in panel header.

**Behavior:**
- **Pin ON:** Panel stays open across conversation switches. Shows empty state if new conversation has no artifacts. Pin icon is filled (📌).
- **Pin OFF:** Panel closes when switching conversations (if current conversation's artifacts aren't in the new one). Pin icon is outline (📌).
- **Persistence:** Pin state saved in localStorage per workspace.
- **Visual:** Pinned panel has a subtle accent border on the left edge.

**Pin use case:** User is working on a report across multiple conversations. They pin the report panel. They switch to a different conversation to pull data. The report stays visible. They copy data from the new conversation into the report via edit mode.

### 4.4 Regenerate

**Trigger:** Click 🔄 Regenerate in toolbar.

**Behavior:**
1. Composer (in chat column) activates with a pre-filled prompt:
   ```
   Regenerate this [type] with the following changes:
   [original prompt that created this artifact]
   ```
2. User can modify the instruction (e.g., "Make it more concise" or "Add a section about Q4 projections").
3. User sends the message.
4. AI generates a new response.
5. If the new response contains an artifact of the same type, a **new version** is created:
   - `parent_artifact_id` links to the original.
   - `version` increments.
   - `is_latest = true` on new version, `is_latest = false` on old.
   - Panel updates to show the new version.
   - Old version accessible via version dropdown.
6. If the new response does NOT contain an artifact (just text), the panel does NOT update. The text response appears in chat. User can try again with a different instruction.

**Regenerate vs Edit:**
- **Regenerate:** AI creates new content. Uses tokens. Produces a fundamentally different version. Good for "make it shorter," "add a section," "change the tone."
- **Edit:** User manually changes content. No AI call. No tokens. Good for fixing typos, adjusting numbers, tweaking wording.

### 4.5 Edit

**Trigger:** Click ✏️ Edit in toolbar.

**Behavior:**
1. Preview area switches to edit mode:
   - **Document/report:** Textarea with markdown. Monospace font for editing. Full content loaded.
   - **Code:** Textarea with monospace font. Line numbers in edit mode.
   - **Slides:** Per-slide text editing (title + body fields).
   - **Spreadsheet:** Cell editing (already interactive, edit mode enables bulk editing).
   - **Table:** Not editable via edit mode (tables are data, not text). Use regenerate to change table content.
   - **Chart:** Not editable via edit mode (charts are visual specs). Use regenerate.
2. Save / Cancel buttons appear at bottom of edit area.
3. **Save:**
   - New version created (same as regenerate — parent link, version increment).
   - Preview updates with new content.
   - Toast: "Artifact updated (v{N})."
   - Old version accessible via version dropdown.
4. **Cancel:**
   - Reverts to original. No changes saved.
   - No version created.

**Edit mode UX:**
```
┌──────────────────────────────────────────────────────────────┐
│  EDITING: Q3 Revenue Analysis                                 │
├──────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐│
│  │ # Q3 Revenue Analysis                                   ││
│  │                                                         ││
│  │ ## Executive Summary                                    ││
│  │                                                         ││
│  │ Total revenue for Q3 2024 reached $108K...             ││
│  │                                                         ││
│  │ ## Methodology                                          ││
│  │ |                                                       ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  [Cancel]                                    [Save as v4]    │
└──────────────────────────────────────────────────────────────┘
```

### 4.6 Download

**Trigger:** Click ⬇ Download ▾ in toolbar.

**Behavior:**
1. Dropdown shows available formats (type-specific):
   - Document: PDF, HTML, Markdown
   - Code: .py/.js/.rs (auto-detected from language)
   - Table: CSV, XLSX
   - Chart: PNG, SVG
   - Slides: PDF, HTML
   - Spreadsheet: XLSX, CSV
2. User selects format.
3. **Client-side formats** (instant):
   - Code, CSV, Markdown, HTML, PNG, SVG
   - Generated in browser, downloaded immediately.
   - No server call needed.
4. **Server-side formats** (async job):
   - PDF, XLSX
   - POST to `/api/artifacts/:id/export` with format.
   - Job queued. Spinner on download button.
   - SSE notification when complete.
   - Browser downloads from presigned URL.
5. **Success:** File downloads. Button shows ✓ for 2 seconds.
6. **Failure:** "Export failed. [Retry]" with error in tooltip.

**Download dropdown:**
```
┌──────────────────────────────┐
│  Download as…                │
│  ─────────────────────       │
│  📄 PDF              (server) │
│  🌐 HTML             (instant)│
│  📝 Markdown         (instant)│
│  ─────────────────────       │
│  Cancel                       │
└──────────────────────────────┘
```

### 4.7 Replace Version

**Trigger:** Select an older version from the version dropdown.

**Behavior:**
1. Version dropdown shows all versions:
   ```
   ┌──────────────────────────────┐
   │  Versions                     │
   │  ─────────────────────       │
   │  ● v3 (current)  2 min ago   │
   │  ○ v2            10 min ago  │
   │  ○ v1            1 hour ago   │
   │  ─────────────────────       │
   │  [Restore v1 as latest]      │
│  Cancel                        │
   └──────────────────────────────┘
   ```
2. Selecting an older version shows it in the preview area (read-only).
3. Status bar shows: "Viewing v1 (historical)".
4. **Restore as latest:** Creates a new version (v4) with the content of the selected version. The old version's content is "promoted" to latest. This is NOT the same as undoing — it creates a new version that happens to have the same content.
5. **Why restore creates a new version:** Preserves the full history. If you restore v1, you get v1's content as v4. v2 and v3 still exist. This way, no work is ever lost.

---

## 5. Versioning Behavior

### 5.1 Version Lifecycle

```
v1 created (initial AI response)
  │
  ├── User edits → v2 created (parent: v1, is_latest: true on v2, false on v1)
  │
  ├── User regenerates → v3 created (parent: v1, is_latest: true on v3, false on v2)
  │
  ├── User edits v3 → v4 created (parent: v3, is_latest: true on v4, false on v3)
  │
  └── User restores v1 → v5 created (parent: v1, content = v1's content, is_latest: true on v5)

Version tree:
  v1 ──┬── v2 (edit)
       ├── v3 (regenerate) ── v4 (edit)
       └── v5 (restore of v1)

All versions are preserved. is_latest = true only on v5.
```

### 5.2 Version Record

Each version is a separate artifact record linked via `parent_artifact_id`:

```json
{
  "id": "art_004",
  "workspace_id": "ws_abc",
  "conversation_id": "conv_123",
  "message_id": "msg_006",
  "parent_artifact_id": "art_001",
  "type": "report",
  "title": "Q3 Revenue Analysis",
  "content": { "markdown": "# Q3 Revenue Analysis (Revised)..." },
  "version": 4,
  "is_latest": true,
  "created_at": "2024-06-20T14:35:00Z"
}
```

### 5.3 Version Display

**Version dropdown (in toolbar):**
```
v3 ▾
```

Click to expand:
```
┌──────────────────────────────────────┐
│  Version History                      │
│  ──────────────────────────────       │
│  ● v3 (current)     2 min ago        │
│    Edited by user                     │
│                                      │
│  ○ v2               10 min ago        │
│    Regenerated by AI                  │
│                                      │
│  ○ v1               1 hour ago        │
│    Initial generation                 │
│  ──────────────────────────────       │
│  [Restore v1 as latest]               │
└──────────────────────────────────────┘
```

- **Current version:** ● (filled circle), bold.
- **Historical versions:** ○ (empty circle), muted.
- **Version metadata:** Version number, relative time, how it was created (AI generated, user edited, restored).
- **Restore:** Creates new version with selected version's content.

### 5.4 Iterative Refinement Workflow

The panel is designed for **long iterative sessions** where the user refines an artifact over many rounds:

```
Round 1: User asks "Create a Q3 report"
  → AI generates report → v1 in panel

Round 2: User says "Add a section about regional breakdown"
  → AI regenerates → v2 in panel (v1 preserved)

Round 3: User edits v2 manually (fixes a number)
  → v3 in panel (v2 preserved)

Round 4: User says "Make the executive summary shorter"
  → AI regenerates → v4 in panel (v3 preserved)

Round 5: User views v1 to compare with v4
  → Selects v1 from dropdown → reads v1
  → Switches back to v4 (current)

Round 6: User downloads v4 as PDF
  → Export job → PDF downloaded
```

**Key principles for long sessions:**
1. **Never lose a version.** Every edit, regenerate, and restore creates a new version. Old versions are never deleted (unless the artifact itself is deleted).
2. **Fast switching.** Version dropdown is instant. No loading spinner for switching between versions (content is in memory or cached).
3. **Context preserved.** The chat shows the full history of requests. The panel shows the evolution of the artifact. Together, they tell the complete story.
4. **No "save" button needed.** Versions are auto-saved on every edit/regenerate. The user never worries about losing work.
5. **Compare versions (phase 2).** Side-by-side diff view showing what changed between versions. Optional — not needed for MVP.

### 5.5 Version Limits

| Scenario | Behavior |
|---|---|
| <20 versions | All versions shown in dropdown. |
| 20–50 versions | Dropdown shows last 20. "Show all (N)" expands. |
| >50 versions | Dropdown shows last 20. Older versions collapsed by date group. "Show more" loads in batches. |
| >100 versions | Consider auto-archiving versions older than 30 days that aren't the latest. (Phase 2: cleanup job.) |

**Storage note:** Each version stores its full content in JSONB. For large artifacts (e.g., 50K-char reports), 100 versions = 5MB in PostgreSQL. Acceptable. If storage becomes a concern, store diffs instead of full content (phase 3).

---

## 6. Panel State Management

### 6.1 State Variables

```typescript
interface PanelState {
  isOpen: boolean;
  isPinned: boolean;
  activeArtifactId: string | null;
  tabs: ArtifactTab[];           // open artifact tabs
  activeTabId: string | null;
  viewMode: 'preview' | 'edit';
  viewingVersion: number | null; // null = latest, N = historical
  exportJobId: string | null;     // active export job
  exportStatus: 'idle' | 'processing' | 'complete' | 'failed';
}

interface ArtifactTab {
  artifactId: string;
  type: ArtifactType;
  title: string;
  messageId: string;             // source message
  conversationId: string;
}
```

### 6.2 State Transitions

```
CLOSED ──open──▶ OPEN (preview, latest version)
  │                  │
  │                  ├──edit──▶ OPEN (edit mode)
  │                  │             │
  │                  │             ├──save──▶ OPEN (preview, new version)
  │                  │             └──cancel──▶ OPEN (preview, latest)
  │                  │
  │                  ├──select version──▶ OPEN (preview, historical version)
  │                  │                       │
  │                  │                       ├──restore──▶ OPEN (preview, new latest)
  │                  │                       └──back to latest──▶ OPEN (preview, latest)
  │                  │
  │                  ├──regenerate──▶ OPEN (preview, loading) ──done──▶ OPEN (preview, new version)
  │                  │
  │                  ├──download──▶ OPEN (preview, exporting) ──done──▶ OPEN (preview, latest)
  │                  │
  │                  ├──pin──▶ OPEN (pinned)
  │                  │
  │                  └──close──▶ CLOSED
  │
  └──pinned + no artifact──▶ OPEN (empty state)
```

### 6.3 Persistence

| State | Where stored | Survives reload? |
|---|---|---|
| isOpen | In-memory (Zustand) | No — panel closed on reload |
| isPinned | localStorage | Yes |
| activeArtifactId | In-memory | No |
| tabs | In-memory | No |
| viewMode | In-memory | No |
| viewingVersion | In-memory | No |
| Artifact versions | PostgreSQL | Yes |
| Artifact content | PostgreSQL | Yes |

**On page reload:**
- Panel starts closed (even if pinned).
- If pinned, panel opens with empty state (or last-viewed artifact if we add that to localStorage in phase 2).
- All artifact versions are in the DB, accessible via message "Open in panel →" buttons.

---

## 7. Multi-Tab Behavior

### 7.1 When Tabs Appear

Tabs appear when a single AI response generates **multiple artifacts**. For example:

```
User: "Analyze the CSV and create a report with a table and chart."

AI response contains:
  1. Markdown report (document_artifact)
  2. Data table (table_artifact)
  3. Revenue chart (chart_artifact)

Panel opens with 3 tabs:
  [📄 Report] [📊 Table] [📈 Chart]
```

### 7.2 Tab Behavior

| Action | Behavior |
|---|---|
| Click tab | Switches active artifact. Preview updates. |
| New artifact generated | New tab added. Active tab switches to new. New tab pulses briefly. |
| Close tab (✕ on hover) | Tab removed. If it was active, switch to previous tab. If no tabs left, panel shows empty state (if pinned) or closes. |
| Close panel (✕ in header) | All tabs cleared. Panel closes. |
| Switch conversation | All tabs cleared (unless pinned). |

### 7.3 Tab Limits

| Scenario | Behavior |
|---|---|
| 1–5 tabs | All visible. No scrolling. |
| 6–10 tabs | Horizontal scroll. Active tab always in view. |
| >10 tabs | Show first 5 + "More (N)" dropdown. |

---

## 8. Keyboard Shortcuts

| Shortcut | Action | Context |
|---|---|---|
| `Cmd/Ctrl + Shift + P` | Open panel with most recent artifact | Global |
| `Escape` | Close panel (or exit edit mode if editing) | Panel open |
| `Cmd/Ctrl + S` | Save edit (when in edit mode) | Edit mode |
| `Cmd/Ctrl + Shift + R` | Regenerate current artifact | Panel open |
| `Cmd/Ctrl + Shift + C` | Copy artifact content | Panel open |
| `Cmd/Ctrl + Shift + D` | Download (opens format dropdown) | Panel open |
| `Cmd/Ctrl + Shift + V` | Open version dropdown | Panel open |
| `←` / `→` | Switch tabs (if multiple) | Panel open, multiple tabs |
| `↑` / `↓` | Navigate slides (slide artifact) | Slide preview |

---

## 9. Long Session UX

### 9.1 Preventing Fatigue

| Concern | Solution |
|---|---|
| Panel takes too much screen space over time | Default 480px width. User can drag to resize (min 320px, max 600px). Resize persists per workspace. |
| Too many versions clutter the dropdown | Group by date (Today, Yesterday, Earlier). Show count, not full list, for old groups. |
| Chat gets squished with panel open | Chat min-width 420px. If screen <900px total, panel becomes overlay (not push). |
| User loses track of which conversation an artifact belongs to | Status bar shows source conversation title (clickable). |
| Editing large documents is slow | Edit mode uses a lightweight textarea (no live preview). Preview renders on save. |
| Regenerate takes too long | Show progress in chat (streaming). Panel shows "Generating…" with skeleton. User can continue chatting while it generates. |

### 9.2 Cross-Conversation Workflow

With pin enabled:

```
Conversation A: "Q3 Analysis"
  → Generates report artifact
  → Panel pinned with report

User switches to Conversation B: "Q4 Planning"
  → Panel stays open (pinned)
  → Shows report from Conversation A
  → Status bar: "From: Q3 Analysis" (clickable)
  → User can reference the Q3 report while planning Q4
  → User can edit the report (creates new version in Conversation A's context)
  → Or user can copy data from Conversation B into the report via edit

User switches to Conversation C: "New Chat"
  → Panel stays open (pinned)
  → Shows report (still from Conversation A)
  → User can ask questions in Conversation C while referencing the report
```

### 9.3 Artifact Discovery (Phase 2)

When a user has many artifacts across many conversations:

```
SIDEBAR (phase 2 addition):
  ┌──────────────────────┐
  │  GLM-5.2             │
  │  + New Chat          │
  │  ─────────           │
  │  RECENT              │
  │  Q3 Analysis         │
  │  Q4 Planning         │
  │  Code Review         │
  │  ─────────           │
  │  ARTIFACTS           │
  │  📄 Q3 Report (v4)  │  ← click to open in panel
  │  💻 data_processor   │
  │  📊 Revenue Table    │
  │  📈 Growth Chart     │
  │  ─────────           │
  │  ● GLM-5.2 ready     │
  └──────────────────────┘
```

- Artifacts section in sidebar lists all artifacts in the workspace.
- Filterable by type (phase 2).
- Clicking opens the panel with that artifact.
- Shows current version number and last updated time.

---

## 10. Panel Sizing

### 10.1 Desktop Width

| State | Width | Chat width |
|---|---|---|
| Panel closed | 0 | Full available |
| Panel open (default) | 480px | Available - 480px |
| Panel open (resized) | 320–600px (user choice) | Available - panel width |
| Panel open (overlay mode, <900px screen) | 60% of screen | 100% (panel overlays) |

### 10.2 Resize Handle

```
┌──────────────────┬──┬──────────────────────┐
│  CHAT            │::│  ARTIFACT PANEL       │
│                  │::│                       │
│                  │::│                       │
│                  │::│                       │
└──────────────────┴──┴──────────────────────┘
                   ↑
              Resize handle (4px, cursor: col-resize)
              Drag left/right to adjust panel width
```

- 4px wide handle between chat and panel.
- `cursor: col-resize` on hover.
- Drag to resize. Min 320px, max 600px.
- Width saved to localStorage per workspace.
- Double-click handle resets to default (480px).

### 10.3 Mobile Full-Screen

On mobile, panel is always full-screen:
- Slides in from right (300ms ease).
- Covers entire viewport.
- Back button at top-left.
- Swipe right to dismiss (gesture).
- No resize handle.

---

## 11. Accessibility

| Concern | Implementation |
|---|---|
| Panel is keyboard navigable | Tab moves through: header → tabs → toolbar → preview → status bar. |
| Screen reader announces panel | `role="region" aria-label="Artifact preview: [title]"` on panel container. |
| Active tab announced | `aria-selected="true"` on active tab, `role="tab"`. |
| Edit mode announced | `aria-label` changes to "Editing: [title]" when entering edit mode. |
| Version change announced | `aria-live="polite"` on status bar: "Viewing version 2 of 4." |
| Loading state announced | `aria-live="polite"`: "Generating artifact…" |
| Close button accessible | `aria-label="Close panel"` on ✕ button. |
| Pin button accessible | `aria-label="Pin panel"` / `aria-label="Unpin panel"` with `aria-pressed`. |
| Keyboard trap prevention | Escape always closes panel (or exits edit mode). Tab wraps within panel when open. |
| Focus management | When panel opens, focus moves to panel header. When panel closes, focus returns to the "Open in panel" button that triggered it. |
| Color contrast | All toolbar buttons meet 4.5:1 contrast. Status bar text meets 4.5:1. |

---

## 12. Summary: Panel Behavior Reference

| Action | Trigger | Effect on panel | Effect on chat | Version created? |
|---|---|---|---|---|
| Open | Click "Open in panel →" or auto-detect | Slides in, renders artifact | Shrinks (desktop) / hidden (mobile) | No |
| Close | ✕, Escape, overlay click | Slides out | Expands (desktop) / revealed (mobile) | No |
| Pin | Click 📌 | Stays open across conversations | No change | No |
| Unpin | Click 📌 again | Closes on conversation switch | No change | No |
| Switch tab | Click tab | Shows different artifact | No change | No |
| Close tab | ✕ on tab | Removes tab | No change | No |
| Edit | Click ✏️ | Switches to edit mode | No change | No (until save) |
| Save edit | Click Save | New version, preview updates | No change | Yes (new version) |
| Cancel edit | Click Cancel | Reverts to preview | No change | No |
| Regenerate | Click 🔄 | Loading → new version | Composer pre-fills prompt | Yes (new version) |
| Download | Click ⬇ + format | Spinner → file downloads | No change | No |
| View version | Select from dropdown | Shows historical version (read-only) | No change | No |
| Restore version | Click "Restore as latest" | New version with old content | No change | Yes (new version) |
| New artifact generated | AI response with artifact | New tab added, switches to it | No change | Yes (initial version) |