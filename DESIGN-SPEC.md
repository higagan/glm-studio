# GLM Workspace — UX/UI Specification

> A premium AI workspace. Chat to think. Artifacts to ship.

---

## 1. UX Principles

### Calm, not cluttered
- One primary action per screen. Secondary actions are available but never compete visually.
- Generous whitespace. Content breathes. No element touches the edge of another without intent.
- Maximum 5 items in the sidebar nav. If more are needed, group them.

### Chat is the steering wheel
- The conversation is always visible and always primary. Artifacts, previews, and tools are secondary surfaces that never fully obscure the chat.
- The user should never feel "locked out" of the conversation. Every panel can be collapsed or dismissed.

### Artifacts are first-class
- Substantial deliverables (reports, code, tables, documents) are rendered in a dedicated panel — not buried in a message bubble.
- Inline messages are for conversation. The artifact panel is for work.
- Artifacts can be copied, downloaded, edited, and iterated on without leaving the conversation.

### Original identity
- Warm, editorial aesthetic. Cream and terracotta in light mode. Warm charcoal in dark mode.
- Inter for UI text, JetBrains Mono for code. No system fonts.
- Rounded corners (8–24px depending on element). Subtle shadows. No harsh borders.

### Progressive disclosure
- Show the minimum needed. Reveal complexity on demand.
- The composer starts as a single text field. Attachments, formatting options, and tools appear only when relevant.
- The artifact panel is hidden by default. It slides in when the AI generates a deliverable.

### Feedback is constant
- Every action has immediate visual feedback. Streaming text, loading spinners, button states, toast notifications.
- Never leave the user wondering "is this working?"

---

## 2. Layout Structure

### Desktop (≥1024px)

```
┌─────────────┬──────────────────────┬──────────────────────┐
│             │                      │                      │
│  SIDEBAR    │    CHAT COLUMN       │   ARTIFACT PANEL     │
│  (260px)    │    (flex: 1)         │   (480px, collapsible)│
│             │                      │                      │
│  Logo       │  Topbar              │  Artifact toolbar    │
│  New Chat   │  ─────────           │  ─────────           │
│  ─────      │  Messages            │  Preview area        │
│  History    │  (scrollable)        │  (scrollable)        │
│  list       │                      │                      │
│  ─────      │                      │                      │
│  Status     │  ─────────           │  ─────────           │
│             │  Composer            │  Action bar          │
│             │                      │  (copy/download/edit) │
└─────────────┴──────────────────────┴──────────────────────┘
```

- **Three-column layout** when artifact panel is open: sidebar + chat + artifact
- **Two-column layout** when artifact panel is closed: sidebar + chat (chat expands)
- Sidebar can be collapsed to icon-only (48px) or fully hidden
- Artifact panel slides in from the right with a smooth animation (250ms ease)
- Chat column never goes below 420px wide

### Tablet (768px–1023px)

```
┌──────────────────────┬──────────────────────┐
│                      │                      │
│  CHAT COLUMN         │  ARTIFACT PANEL      │
│  (flex: 1)           │  (overlay, 420px)    │
│                      │                      │
│  Topbar [☰] [title]  │  (same as desktop)   │
│  Messages            │                      │
│  Composer            │                      │
└──────────────────────┴──────────────────────┘
```

- Sidebar is a slide-out drawer (overlay, not push)
- Artifact panel is a side overlay that covers ~60% of screen
- Chat is always visible underneath

### Mobile (<768px)

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│                  │     │                  │     │                  │
│  CHAT (full)     │     │  SIDEBAR         │     │  ARTIFACT        │
│                  │     │  (full-screen    │     │  (full-screen    │
│  Topbar [☰]      │     │   slide-in)      │     │   slide-in)      │
│  Messages        │     │                  │     │                  │
│  Composer        │     │  History list    │     │  Preview         │
│  (bottom)        │     │  New Chat        │     │  Actions         │
│                  │     │                  │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

- **One screen at a time.** Chat, sidebar, and artifact panel are each full-screen.
- Sidebar slides in from left with a dimmed overlay behind it.
- Artifact panel slides in from right (full-screen) with a back button.
- Composer is fixed to the bottom, always accessible (thumb zone).
- No horizontal scrolling at any breakpoint.

---

## 3. Key Components

### 3.1 Sidebar

**Purpose:** Navigation, conversation history, model status.

**Structure (top to bottom):**
1. **Logo + product name** — 32px rounded logo badge, product name in 16px semibold
2. **New Chat button** — full-width, bordered, with + icon. Hover: subtle background fill.
3. **Conversation list** — scrollable, each item shows:
   - Title (auto-generated, truncated with ellipsis at 40 chars)
   - Active item: filled background, semibold text
   - Hover: delete button appears on the right (trash icon)
   - Grouped by recency: Today, Yesterday, Previous 7 Days, Older (collapsible sections)
4. **Footer** — model status dot + text ("GLM-5.2 ready" / "Model not loaded" / "Ollama offline")

**States:**
- **Empty:** "No conversations yet. Start a new chat." centered, muted text.
- **Loading:** Skeleton shimmer on conversation items.
- **Error:** Status dot turns red, text shows error.

### 3.2 Chat Column

**Purpose:** The primary conversation surface.

**Structure (top to bottom):**
1. **Topbar** — hamburger menu (mobile), conversation title, theme toggle. 48px height, bottom border.
2. **Messages area** — scrollable, max-width 768px centered. Contains:
   - Welcome screen (when empty) or message bubbles
   - Auto-scrolls to bottom on new messages
   - Scroll-to-bottom button appears when scrolled up
3. **Composer** — fixed at bottom, max-width 768px centered. Contains:
   - Attachment tray (collapsible, appears above input when files are attached)
   - Input row: attach button + textarea + send button
   - Hint text below: "GLM-5.2 can make mistakes. Verify important info."

### 3.3 Welcome Screen

**Shown when:** A new conversation is started with no messages.

**Structure:**
- Product name (32px, semibold, centered)
- One-line description (15px, muted)
- Suggestion grid (2 columns on desktop, 1 on mobile) — 4 cards:
  - Each card: icon + title + description
  - Click fills the input and focuses it (does not auto-send)
- Calm, centered, lots of whitespace above (12vh padding on desktop, 8vh on mobile)

### 3.4 Message Bubbles

**User message:**
```
┌──────────────────────────────────────┐
│  [Avatar]  You                        │
│                                        │
│  [attachment chips if any]             │
│                                        │
│  Message text in plain text or         │
│  simple markdown.                      │
└──────────────────────────────────────┘
```

**Assistant message:**
```
┌──────────────────────────────────────┐
│  [Avatar]  GLM-5.2                    │
│                                        │
│  Rich markdown: headings, tables,     │
│  code blocks, lists, blockquotes.      │
│                                        │
│  [Open in panel →] (if artifact       │
│   detected)                           │
└──────────────────────────────────────┘
```

- Avatar: 28px circle. User = terracotta with "You". Assistant = warm gray with "G".
- Role label: 14px semibold, below avatar.
- Message body: 15px, 1.7 line-height, max-width 768px.
- No bubble background — messages are separated by spacing and avatars (like Claude, not like iMessage).
- Timestamps: shown on hover (tooltip), not always visible. Keeps it calm.

**Artifact indicator in message:**
- When the AI response contains a deliverable (code block >20 lines, markdown document >500 chars, table), a subtle button appears at the bottom of the message: "Open in panel →"
- Clicking opens the artifact panel with that content rendered.

### 3.5 Composer

**Purpose:** Text input, file attachment, and send.

**Structure:**
```
┌──────────────────────────────────────────────┐
│  [attachment tray — collapsible]               │
│  📄 report.txt ✕   📄 data.csv ✕              │
├──────────────────────────────────────────────┤
│  [📎]  Reply to GLM-5.2…              [↑ Send] │
├──────────────────────────────────────────────┤
│         GLM-5.2 can make mistakes.            │
└──────────────────────────────────────────────┘
```

- **Container:** White (light) / elevated (dark), 1px border, 24px border-radius, subtle shadow. Focus: border turns accent color.
- **Attach button:** 36px circle, paperclip icon, left side. Hover: background fill.
- **Textarea:** 16px font (prevents iOS zoom), auto-resizes up to 200px, then scrolls internally. Placeholder: "Reply to GLM-5.2…"
- **Send button:** 36px circle, accent background, arrow-up icon. Disabled state: 35% opacity. Enabled when input is non-empty or attachments exist.
- **Attachment tray:** Appears above the input row when files are attached. Each file is a chip: icon + name + ✕ remove. Collapses to zero height when empty.
- **Hint text:** 12px, centered, muted. Always visible.

**States:**
- **Empty:** Placeholder text, send button disabled.
- **Typing:** Send button enables, textarea grows.
- **Attachments present:** Tray expands, chips appear.
- **Streaming (AI responding):** Send button disabled, shows a stop button (■) instead. Input still editable for queueing next message.
- **Error:** Input border flashes red briefly. Error toast appears above composer.

### 3.6 Artifact / Workbench Panel

**Purpose:** Render, preview, and export AI-generated deliverables.

**Structure:**
```
┌──────────────────────────────────────────────┐
│  [Type icon] Report: Q3 Analysis    [✕ close] │
├──────────────────────────────────────────────┤
│  [Copy] [Download] [Edit] [Regenerate]        │
├──────────────────────────────────────────────┤
│                                                │
│  PREVIEW AREA                                  │
│  (rendered content — scrollable)              │
│                                                │
│  For text: formatted markdown page             │
│  For code: syntax-highlighted, line numbers   │
│  For tables: interactive grid with sort        │
│  For charts: rendered chart with legend        │
│  For PDF: embedded PDF preview                 │
│                                                │
├──────────────────────────────────────────────┤
│  [← Back to chat]                              │
└──────────────────────────────────────────────┘
```

- **Header:** Artifact type icon + title + close button. 48px height, bottom border.
- **Toolbar:** Copy, Download, Edit, Regenerate. Icon buttons with labels on hover (tooltip). Sticky below header.
- **Preview area:** Scrollable, fills remaining space. Content type determines rendering (see section 4).
- **Back button (mobile only):** Full-width at bottom, returns to chat.

**When it opens:**
- Automatically when AI generates a detectable artifact (code block >20 lines, markdown doc >500 chars, table with >5 rows).
- Manually via "Open in panel →" button on any assistant message.
- User can dismiss it; it won't auto-reopen for the same message unless clicked.

**States:**
- **Loading:** Skeleton shimmer in preview area. "Generating…" with subtle pulse.
- **Empty:** "No artifact yet. Ask GLM-5.2 to generate a report, code, or table."
- **Error:** "Couldn't render this artifact. Try regenerating." with retry button.

### 3.7 Attachment Tray

**Purpose:** Show attached files before sending and within messages.

**Pre-send (in composer):**
- Horizontal wrap of chips above the input.
- Each chip: file icon (📄/🖼️) + filename (truncated) + ✕ remove button.
- Chip: 32px height, 8px border-radius, subtle background, 1px border.
- Max 5 visible; if more, show "+N more" and scroll horizontally.

**In message (sent):**
- Same chips but without remove buttons.
- Clicking a chip opens a file preview (text content in a modal, images inline).

**States:**
- **Uploading:** Chip shows a small spinner instead of the file icon.
- **Too large:** Toast: "filename is too large (max 5MB)."
- **Unsupported:** Toast: "filename type is not supported."

---

## 4. Output Rendering by Content Type

### 4.1 Text (plain markdown)

**Inline in message:**
- Rendered markdown: headings (h1=22px, h2=18px, h3=16px), paragraphs (15px, 1.7 line-height), bold, italic, lists, blockquotes.
- One blank line between sections.
- Max-width 768px for readability.

**In artifact panel:**
- Same rendering but in a "document" container with more padding (40px), serif option for reading mode.
- Page-like appearance: white background, subtle shadow, max-width 680px.

### 4.2 Tables

**Inline in message:**
- Rendered as HTML table with header row, zebra striping (subtle), 1px borders.
- Horizontal scroll if wider than container (no layout breakage).
- Max height 400px with scroll if >15 rows; otherwise full height.

**In artifact panel:**
- Interactive grid:
  - Sortable columns (click header to sort asc/desc)
  - Row hover highlight
  - Sticky header row
  - "Copy as CSV" and "Download as CSV" in toolbar
  - Cell editing on double-click (phase 2)
  - Search/filter bar above the table

**Rendering rules:**
- Font size: 14px for table cells, 13px for headers.
- Padding: 10px 14px per cell.
- Numbers right-aligned, text left-aligned.
- Empty cells show a muted dash (—).

### 4.3 Charts

**Inline in message:**
- Not rendered inline. A chart is always an artifact.
- Message shows: "📊 Chart generated — Open in panel →"

**In artifact panel:**
- Rendered using a lightweight charting library (Chart.js or similar).
- Types: bar, line, pie, scatter (auto-detected from data structure or explicitly requested).
- Legend, axis labels, gridlines.
- Toolbar: "Download as PNG", "Download as SVG".
- Interactive: hover shows tooltip with values.

**Rendering rules:**
- Colors: use the product palette (terracotta, warm grays, muted blues/greens).
- Font: Inter, 13px for labels, 11px for axis ticks.
- Responsive: chart resizes with the panel.
- Loading state: "Rendering chart…" with spinner.

### 4.4 Code

**Inline in message:**
- Fenced code block with:
  - Header bar: language label (left) + copy button (right)
  - Syntax highlighting (use highlight.js or Prism)
  - Line numbers (toggleable)
  - Monospace font (JetBrains Mono, 13px)
  - Horizontal scroll for long lines (no wrapping)
- Max height 300px inline; if longer, show "Open in panel →" and truncate with a fade.

**In artifact panel:**
- Full-height code view with:
  - Line numbers always on
  - Syntax highlighting
  - Copy button (copies raw code)
  - Download as file (auto-detects extension from language: .py, .js, .rs, etc.)
  - Edit mode: textarea overlay with monospace font, save updates the artifact

**Rendering rules:**
- Background: slightly different from page background (code-bg variable).
- Border: 1px solid, 10px border-radius.
- Font: JetBrains Mono, 13px, 1.6 line-height.
- No line wrapping. Horizontal scroll only.

### 4.5 Downloadable Files (PDF, DOCX, etc.)

**Inline in message:**
- File card: icon + filename + file size + "Download" button.
- Card: 64px height, 10px border-radius, subtle border, hover: border accent.

**In artifact panel:**
- **PDF:** Embedded `<iframe>` or `<embed>` preview with download button.
- **DOCX/other:** Preview not possible; show file card with download button and "Open externally" note.
- **Generated reports (markdown → PDF):**
  - Render markdown as styled HTML in the preview area.
  - "Download as PDF" triggers browser print with a print-optimized stylesheet (margins, page breaks, typography).
  - Phase 3: server-side PDF generation for consistent output.

**Rendering rules:**
- Download button: accent color, 8px radius, 36px height.
- File size shown in human-readable format (KB, MB).
- Generated files are stored as blobs in memory (or IndexedDB for persistence).

---

## 5. Interaction Rules

### 5.1 Desktop Interactions

| Action | Trigger |
|---|---|
| Send message | Enter (no Shift) or click send button |
| Newline in input | Shift+Enter |
| New chat | Ctrl/Cmd+N or sidebar button |
| Toggle sidebar | Ctrl/Cmd+B or hamburger button |
| Toggle theme | Ctrl/Cmd+Shift+L or theme button |
| Focus input | / (slash) or click input |
| Open artifact panel | Click "Open in panel →" on message |
| Close artifact panel | Click ✕ or press Escape |
| Copy code | Click copy button on code block |
| Stop generation | Click ■ stop button (replaces send during streaming) |
| Scroll to bottom | Click scroll-to-bottom button (appears when scrolled up) |
| Delete conversation | Hover history item → click trash → confirm |

### 5.2 Mobile Interactions

| Action | Trigger |
|---|---|
| Send message | Tap send button (Enter adds newline on mobile keyboards) |
| New chat | Tap ☰ → tap "New Chat" |
| Open sidebar | Tap hamburger button |
| Close sidebar | Tap overlay or swipe left |
| Open artifact | Tap "Open in panel →" |
| Close artifact | Tap back button or swipe right |
| Copy code | Long-press code block → "Copy" in context menu |
| Delete conversation | Swipe left on history item → tap delete |

### 5.3 General Interaction Rules

- **No hover-only interactions.** Every action reachable by tap/click. Hover states are enhancements, not requirements.
- **No double-click required.** All primary actions are single-click/tap.
- **Destructive actions require confirmation.** Delete conversation → toast with "Undo" for 5 seconds (no modal).
- **Streaming is always interruptible.** Stop button is always visible during generation.
- **Auto-scroll is smart.** Scrolls to bottom on new content only if user is already at the bottom. If scrolled up, shows a "new messages ↓" pill.
- **Keyboard navigation.** Tab moves through interactive elements in logical order. Focus rings are visible (2px accent outline).
- **No modals for routine actions.** Use toasts, inline confirmations, or overlays. Modals only for irreversible destructive actions (and even then, prefer undo).

---

## 6. UX Rules for Readability, Hierarchy, Spacing

### Typography
- **Font family:** Inter (UI), JetBrains Mono (code). No system fonts.
- **Body text:** 15px, 1.7 line-height, max-width 768px (chat), 680px (documents).
- **Headings:** h1=22px, h2=18px, h3=16px. Semibold. -0.01em letter-spacing.
- **Small text:** 13px (labels, table headers), 12px (hints, timestamps), 11px (code language labels).
- **Input text:** 16px minimum (prevents iOS auto-zoom).

### Spacing
- **Base unit:** 4px. All spacing is multiples of 4.
- **Message spacing:** 24px between message groups (avatar + content).
- **Section spacing:** 24px between h2 sections, 16px between h3 sections.
- **Component padding:** 12–16px for cards, 10–14px for table cells, 8px for chips.
- **Page padding:** 24px (desktop), 16px (mobile) for messages area.
- **Input area padding:** 24px horizontal (desktop), 12px (mobile).

### Visual Hierarchy
1. **Primary:** Chat messages and composer (largest, highest contrast).
2. **Secondary:** Sidebar conversation list, artifact panel content.
3. **Tertiary:** Status bars, hints, timestamps, labels (muted colors).
4. **Action hierarchy:** Send button (filled, accent) > New Chat (bordered) > Copy/Download (ghost) > Delete (ghost, appears on hover).

### Color Usage
- **Accent (terracotta #d97757):** Primary actions only — send button, active states, links, focus rings. Never for decoration.
- **Success (green):** Status dots, confirmation toasts.
- **Warning (amber):** Model not loaded, file too large.
- **Error (red):** Connection errors, failed generation. Used sparingly.
- **Muted text:** Secondary information. Never use opacity below 0.5 for text — use the tertiary color variable instead.

---

## 7. Edge States

### Loading States
| Context | What the user sees |
|---|---|
| AI responding (streaming) | Typing dots in message bubble → streaming text appears character by character. Send button becomes stop button. |
| Artifact generating | Skeleton shimmer in artifact panel. "Generating…" label with subtle pulse. |
| File uploading | Spinner in attachment chip replacing file icon. |
| Conversation loading | Skeleton shimmer on history items. |
| Ollama connecting | Status dot pulses amber. "Connecting…" text. |

### Empty States
| Context | What the user sees |
|---|---|
| No conversations | Sidebar: "No conversations yet. Start a new chat." centered, muted. |
| New chat (no messages) | Welcome screen with product name, description, 4 suggestion cards. |
| No artifacts yet | Artifact panel: "No artifact yet. Ask GLM-5.2 to generate a report, code, or table." with example prompt suggestion. |
| Search with no results | "No conversations match 'query'." with clear-search button. |

### Error States
| Context | What the user sees |
|---|---|
| Ollama not running | Status dot red. "Ollama offline. Start Ollama to chat." Composer disabled with overlay message. |
| Model not loaded | Status dot amber. "Model not loaded. Run: ollama run glm-5.2:cloud" |
| Generation failed | Message bubble: "⚠️ Generation failed: [error]. [Retry]" Retry button re-sends the last message. |
| File too large | Toast: "filename is too large (max 5MB)." File not attached. |
| File unsupported | Toast: "filename type is not supported." |
| Network error | Toast: "Connection lost. Reconnecting…" Auto-retry after 3s. |
| Artifact render failed | Artifact panel: "Couldn't render this artifact. [Retry] [Copy raw]" |

### Upload States
| Context | What the user sees |
|---|---|
| File selected | Chip appears in attachment tray with spinner. |
| File read complete | Spinner replaced with file icon. Chip is ready. |
| File too large | Chip does not appear. Toast notification. |
| Multiple files | Chips wrap horizontally. "+N more" if >5. |
| Image file | Chip shows 🖼️ icon. In message: image rendered inline (max 400px width). |

### Generation States
| Context | What the user sees |
|---|---|
| Before first token | Typing dots (3 pulsing circles) in assistant message bubble. |
| Streaming text | Text appears progressively. Auto-scroll if at bottom. |
| Thinking/reasoning | (If model supports) Collapsible "Thinking process" section above the response. Muted, 12px, monospace. |
| Artifact detected | "Open in panel →" button appears at bottom of message. Panel auto-opens. |
| Generation complete | Stop button reverts to send button. Message finalized. Save indicator: subtle "Saved" flash in sidebar. |
| Stopped by user | Partial response is kept. "Generation stopped." muted note at bottom of message. |

---

## 8. Accessibility Notes

### Visual
- **Color contrast:** Minimum 4.5:1 for body text, 3:1 for large text (18px+). Verified against both light and dark themes.
- **Don't rely on color alone:** Status indicators use color + icon + text. Error states have icons, not just red borders.
- **Focus rings:** 2px accent-colored outline on all interactive elements. Never remove focus outlines globally.
- **Dark mode:** Not just inverted colors. Warm dark palette (#1f1e1d background, not pure black). Reduced contrast for comfort.

### Keyboard
- **Full keyboard navigation:** Every action reachable without a mouse. Tab order: sidebar → topbar → messages → composer → artifact panel.
- **Escape key:** Closes artifact panel, sidebar, and any overlay. Universal "go back."
- **Enter:** Sends message (desktop). Shift+Enter for newline.
- **Tab trapping:** Modals and overlays trap focus. Escape releases.
- **Skip links:** "Skip to main content" link appears on first Tab press.

### Screen Readers
- **ARIA labels:** All icon-only buttons have `aria-label`. Example: attach button → "Attach file", send button → "Send message".
- **Live regions:** Streaming responses use `aria-live="polite"` so screen readers announce new content without interrupting.
- **Role attributes:** Sidebar = `role="navigation"`, messages = `role="log"`, artifact panel = `role="region" aria-label="Artifact preview"`.
- **Status announcements:** "GLM-5.2 is responding…", "Generation complete", "Error: model not loaded" announced via `aria-live`.
- **Table semantics:** Use proper `<th scope="col">`, `<caption>`, and `summary` attributes for data tables.

### Motor
- **Tap targets:** Minimum 44×44px on mobile. 36×36px on desktop (with 8px spacing between).
- **No hover-only actions.** Delete buttons, tooltips, and "Open in panel" are all accessible by tap/click.
- **No tiny scroll targets.** Scrollbars are 6px visually but the hit area is 16px.
- **No time-based interactions.** No content disappears after a timeout. No auto-advancing carousels.

### Cognitive
- **Consistent patterns.** Same action = same button in the same place across all screens. Send is always bottom-right. New chat is always top of sidebar.
- **Clear language.** No jargon in UI text. "Reply to GLM-5.2…" not "Enter your prompt." "New Chat" not "Initialize Session."
- **Undo over confirm.** Delete → toast with "Undo" for 5 seconds. No "Are you sure?" modals for routine actions.
- **Predictable layout.** Sidebar is always left. Composer is always bottom. Artifact is always right. Never rearrange the layout between screens.

---

## 9. Dark / Light Mode

### Light Mode
- Background: `#f9f9f7` (warm cream, not pure white)
- Elevated surfaces: `#ffffff`
- Sidebar: `#f0eee9` (slightly darker than main)
- Text primary: `#1a1a1a`
- Text secondary: `#6b6b6b`
- Border: `#e0ddd6`
- Accent: `#d97757` (terracotta)

### Dark Mode
- Background: `#1f1e1d` (warm charcoal, not pure black)
- Elevated surfaces: `#2a2928`
- Sidebar: `#1a1918` (slightly darker than main)
- Text primary: `#f5f3ef` (warm white, not pure white)
- Text secondary: `#b8b3aa`
- Border: `#3a3835`
- Accent: `#d97757` (same terracotta — works on both)

### Toggle
- Button in topbar (sun/moon icon).
- Preference stored in localStorage.
- Defaults to system preference (`prefers-color-scheme`).
- Smooth transition: 200ms color change on all elements. No flash of wrong theme on load (set theme before first paint via inline script).

---

## 10. Component Reference

| Component | Light | Dark | Size | Radius |
|---|---|---|---|---|
| Send button | accent bg, white icon | same | 36×36 | 50% (circle) |
| Attach button | transparent, gray icon | same | 36×36 | 50% (circle) |
| New Chat button | transparent, 1px border | same | full width, 40px | 10px |
| Input container | white, 1px border | elevated, 1px border | max 768px | 24px |
| Message avatar | accent / gray bg | same | 28×28 | 50% (circle) |
| Code block | code-bg, 1px border | same | full width | 10px |
| Table | white, 1px borders | elevated, 1px borders | full width | 8px |
| Suggestion card | white, 1px border | elevated, 1px border | auto | 12px |
| Attachment chip | sidebar bg, 1px border | same | auto, 32px | 8px |
| History item | transparent → hover bg | same | full width, 36px | 8px |
| Artifact panel | elevated bg | same | 480px desktop, full mobile | 0 (flush right) |
| Toast | elevated, 1px border, shadow | same | auto, 44px | 10px |