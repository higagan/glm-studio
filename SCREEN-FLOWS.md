# GLM Workspace — Screen Map & User Flows

> How users move through the product, what they see at each step,
> and where the experience can go wrong.

---

## 1. Screen Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          GLM WORKSPACE SCREEN MAP                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─ AUTH (phase 2) ──────────────────────────────────────────────┐      │
│  │  A1. Login / Signup                                           │      │
│  │  A2. OAuth redirect                                           │      │
│  └───────────────────────────────────────────────────────────────┘      │
│                                                                         │
│  ┌─ ONBOARDING (first-time) ──────────────────────────────────────┐      │
│  │  O1. Welcome screen                                            │      │
│  │  O2. Model connection check                                     │      │
│  │  O3. Workspace setup (name, color)                             │      │
│  └───────────────────────────────────────────────────────────────┘      │
│                                                                         │
│  ┌─ MAIN APP ─────────────────────────────────────────────────────┐     │
│  │                                                               │     │
│  │  SIDEBAR              CHAT COLUMN          ARTIFACT PANEL      │     │
│  │  ┌──────────┐    ┌──────────────────┐   ┌──────────────────┐  │     │
│  │  │ S1. Logo │    │ C1. Welcome      │   │ P1. Empty state   │  │     │
│  │  │ S2. New  │    │ C2. Conversation │   │ P2. Code preview  │  │     │
│  │  │  Chat    │    │ C3. Streaming    │   │ P3. Doc preview   │  │     │
│  │  │ S3. Hist │    │ C4. Error state  │   │ P4. Table preview │  │     │
│  │  │  list    │    │ C5. Composer     │   │ P5. Chart preview │  │     │
│  │  │ S4. Status│   │ C6. Attach tray │   │ P6. Slide preview │  │     │
│  │  └──────────┘    └──────────────────┘   │ P7. Export modal  │  │     │
│  │                                          │ P8. Edit mode    │  │     │
│  │  ┌─ OVERLAYS ─────────────────────┐     │ P9. Error state   │  │     │
│  │  │ D1. File preview modal          │     └──────────────────┘  │     │
│  │  │ D2. Delete confirmation toast   │                          │     │
│  │  │ D3. Settings (phase 2)          │                          │     │
│  │  │ D4. Search (phase 2)            │                          │     │
│  │  └────────────────────────────────┘                          │     │
│  └───────────────────────────────────────────────────────────────┘     │
│                                                                         │
│  ┌─ MOBILE VARIANTS ────────────────────────────────────────────┐      │
│  │  M1. Chat (full screen)                                       │      │
│  │  M2. Sidebar (slide-in left)                                  │      │
│  │  M3. Artifact (slide-in right, full screen)                   │      │
│  │  M4. File picker (native sheet)                                │      │
│  └───────────────────────────────────────────────────────────────┘      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Screen inventory

| ID | Screen | When shown | Key elements |
|---|---|---|---|
| O1 | Welcome / onboarding | First visit, no conversations | Product name, description, 4 suggestion cards |
| O2 | Model connection check | Onboarding step 2 | Status dot, "Connect Ollama" instructions |
| O3 | Workspace setup | First-time setup | Workspace name input, color picker, skip option |
| S1 | Sidebar logo | Always (sidebar open) | Logo badge, product name |
| S2 | New Chat button | Always (sidebar open) | "+ New Chat" button |
| S3 | History list | Always (sidebar open) | Conversation items, grouped by recency, delete on hover |
| S4 | Status footer | Always (sidebar open) | Model status dot + text |
| C1 | Welcome screen | New chat, no messages | Heading, description, suggestion grid |
| C2 | Conversation view | Messages exist | Message bubbles, scrollable |
| C3 | Streaming state | AI is responding | Typing dots → streaming text, stop button |
| C4 | Chat error | Generation fails | Error message in bubble, retry button |
| C5 | Composer | Always (bottom of chat) | Attach button, textarea, send/stop button |
| C6 | Attachment tray | Files attached | File chips with remove buttons |
| P1 | Artifact empty | Panel open, no artifact | Illustration + prompt suggestion |
| P2 | Code preview | Code artifact | Syntax highlighting, line numbers, copy/download |
| P3 | Document preview | Document/report artifact | Rendered markdown, reading layout |
| P4 | Table preview | Table artifact | Sortable grid, CSV export |
| P5 | Chart preview | Chart artifact | Chart.js render, PNG/SVG export |
| P6 | Slide preview | Slide deck artifact | Slide navigation, full-screen mode |
| P7 | Export modal | User clicks download | Format options, generate button |
| P8 | Edit mode | User clicks edit | Textarea overlay, save/cancel |
| P9 | Artifact error | Render fails | Error message, retry, copy raw |
| D1 | File preview modal | Click attachment chip | File content viewer, download |
| D2 | Delete toast | Delete conversation | "Conversation deleted" + Undo (5s) |
| M1–M4 | Mobile variants | <768px viewport | Full-screen versions of above |

---

## 2. User Flows

### Flow 1: First-Time Onboarding

```
User opens app for the first time
        │
        ▼
┌───────────────────┐
│  O1. Welcome      │  "GLM-5.2 — Your AI workspace"
│  screen           │  4 suggestion cards visible
└───────┬───────────┘
        │  User sees suggestions but hasn't clicked
        │
        ▼
┌───────────────────┐
│  O2. Model check  │  Status footer: "GLM-5.2 ready" (green)
│  (automatic)      │  OR "Ollama offline" (red) + instructions
└───────┬───────────┘
        │
        ├── Model ready ──▶ User can chat immediately
        │
        └── Model offline ──▶ Show setup instructions:
                               "1. Install Ollama
                                2. Run: ollama run glm-5.2:cloud
                                3. Refresh this page"
                               Composer is disabled with overlay.
                               User follows steps, refreshes.
        │
        ▼
┌───────────────────┐
│  O3. Workspace    │  "Name your workspace" (default: "Default")
│  setup (optional) │  Color picker (default: terracotta)
│                   │  [Skip] button — most users skip
└───────┬───────────┘
        │
        ▼
   Ready to chat (Flow 2)
```

**Decision points:**
- **Model not running?** → Block the composer. Don't let users type into a void. Show clear, copyable instructions. This is the #1 drop-off point for self-hosted apps.
- **Skip workspace setup?** → Yes, default everything. Don't force configuration on first use.

---

### Flow 2: New Chat

```
User clicks "New Chat" (sidebar) or keyboard shortcut (Cmd+N)
        │
        ▼
┌───────────────────┐
│  C1. Welcome      │  Fresh conversation, no messages
│  screen           │  4 suggestion cards
│                   │  Composer active, placeholder: "Reply to GLM-5.2…"
└───────┬───────────┘
        │
        ├── User clicks a suggestion card
        │   → Text fills the input (does NOT auto-send)
        │   → Input focuses, user can edit before sending
        │
        ├── User types their own message
        │   → Send button activates (accent color)
        │
        └── User attaches a file (Flow 3)
        │
        ▼
   User sends message (Enter or click Send)
        │
        ▼
   Flow 4: Ask question / AI responds
```

**Decision points:**
- **Suggestion click = fill, not send.** Users may want to modify the suggestion. Auto-sending feels aggressive. Filling + focusing gives control.
- **Empty conversation in sidebar.** Show "New Chat" as the title until the first message is sent, then auto-generate a title from that message.

---

### Flow 3: Attach File

```
User clicks paperclip button in composer
        │
        ▼
┌───────────────────────────┐
│  Native file picker       │  OS file dialog opens
│  (browser native)         │  User selects one or more files
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│  C6. Attachment tray      │  Chips appear above input:
│                           │  📄 report.txt ✕
│                           │  📊 data.csv  ✕
│                           │
│                           │  Each chip shows:
│                           │  - File icon (📄 text, 🖼️ image)
│                           │  - Filename (truncated)
│                           │  - Remove (✕) button
│                           │  - Spinner while reading
└───────────┬───────────────┘
            │
            ├── File > 5MB?
            │   → Toast: "report.pdf is too large (max 5MB)"
            │   → File NOT added to tray
            │   → User can try a smaller file
            │
            ├── File type unsupported?
            │   → Toast: ".exe files are not supported"
            │   → File NOT added to tray
            │
            ├── File being read (text file)?
            │   → Chip shows spinner
            │   → FileReader.readAsText completes
            │   → Spinner → file icon, chip ready
            │
            └── File being read (image)?
                → Chip shows spinner
                → FileReader.readAsDataURL completes
                → Spinner → 🖼️ icon, chip ready
            │
            ▼
   Files ready in tray. User can:
   ├── Add more files (click paperclip again)
   ├── Remove a file (click ✕ on chip)
   ├── Type a message (optional — can send with files only)
   └── Send (Enter or click Send)
        │
        ▼
   Flow 4: Ask question on attached file
```

**Decision points:**
- **Multiple files?** Allow it. Show all chips. If >5, show "+N more" and horizontal scroll.
- **No message, just files?** Allow sending. The system prompt handles "analyze this file" context.
- **File still reading when user clicks send?** Two options:
  - **Option A (recommended):** Disable send until all files are read. Show a subtle "Reading files…" hint. Prevents sending incomplete context.
  - **Option B:** Send immediately, inject "[File: name, still processing]" placeholder. Model responds with partial info. Confusing — avoid.

---

### Flow 4: Ask Question on Attached File

```
User has attached file(s) + typed a message → clicks Send
        │
        ▼
┌───────────────────────────────┐
│  C2. User message appears     │  Message bubble with:
│  in chat                      │  - Attachment chips (📄 report.txt)
│                               │  - Message text
│                               │  - Avatar (You), timestamp
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│  C3. AI streaming response     │  Typing dots (3 pulsing circles)
│                               │  → Text streams in character by character
│                               │  → Send button becomes Stop (■)
│                               │  → Auto-scroll if user at bottom
│                               │  → "Open in panel →" appears if
│                               │    artifact detected
└───────────────┬───────────────┘
                │
                ├── User waits for completion
                │   → Full response rendered with markdown
                │   → Stop button → Send button
                │   → Conversation saved (sidebar title updates)
                │
                ├── User clicks Stop
                │   → Partial response kept
                │   → "Generation stopped" muted note
                │   → Send button re-enabled
                │
                ├── User scrolls up during streaming
                │   → Auto-scroll pauses
                │   → "New content ↓" pill appears at bottom
                │   → Click pill to jump to latest
                │
                └── Error occurs (model crash, network drop)
                    → Flow 9: Recover from failure
                │
                ▼
┌───────────────────────────────┐
│  Response complete            │  Full markdown rendered:
│                               │  - Headings, paragraphs, lists
│                               │  - Tables (if generated)
│                               │  - Code blocks (if generated)
│                               │  - "Open in panel →" button
│                               │    (if artifact detected)
└───────────────┬───────────────┘
                │
                ├── Response is plain text → stays inline, done
                ├── Response has a table → see Flow 5 (table)
                ├── Response has a chart → see Flow 5 (chart)
                ├── Response has code → see Flow 5 (code)
                └── Response has a document/report → see Flow 6 (artifact)
```

**Decision points:**
- **When to show "Open in panel →"?** Only when content is substantial:
  - Code block >20 lines
  - Markdown document >500 characters with at least 2 headings
  - Table with >5 rows
  - Any chart spec
  Don't show it for short inline answers. It would be noise.
- **Auto-open artifact panel?** Yes, but only on desktop (≥1024px). On mobile, show the button but don't auto-open (would cover the chat). User taps to open full-screen.
- **Title generation timing?** After the first AI response completes, auto-generate the conversation title from the first user message. Update the sidebar item silently. No notification.

---

### Flow 5: Output Shown as Text / Table / Chart / Code

#### 5a. Plain Text Response

```
AI response is text-only (no tables, code, or charts)
        │
        ▼
┌───────────────────────────────┐
│  Inline in message bubble      │  Rendered markdown:
│                               │  - h1/h2/h3 headings
│                               │  - Bold, italic, lists
│                               │  - Blockquotes
│                               │  - Short inline code
│                               │  - No "Open in panel" button
└───────────────────────────────┘
```

**State:**
- **Loading:** Typing dots → streaming text
- **Success:** Full markdown rendered, conversation saved
- **Error:** Error bubble with retry button

#### 5b. Table Response

```
AI response contains a markdown table
        │
        ▼
┌───────────────────────────────┐
│  Inline table in message      │  HTML table:
│                               │  - Header row (bold, muted bg)
│                               │  - Zebra striping
│                               │  - Horizontal scroll if wide
│                               │  - Max height 400px if >15 rows
│                               │  - "Open in panel →" if >5 rows
└───────────────┬───────────────┘
                │
                ├── User clicks "Open in panel →"
                │   → P4. Table preview in artifact panel
                │   → Interactive: sortable columns, sticky header
                │   → Toolbar: Copy as CSV, Download as CSV
                │
                └── User stays inline
                    → Table is readable but not interactive
```

**State:**
- **Loading:** Table area shows skeleton shimmer
- **Success:** Full table rendered, sortable in panel
- **Error:** "Couldn't render table. [Copy raw markdown]"

#### 5c. Chart Response

```
AI response contains chart data (JSON spec or explicit chart request)
        │
        ▼
┌───────────────────────────────┐
│  Inline: chart placeholder    │  "📊 Chart generated"
│                               │  "Open in panel →"
│                               │  (charts are NEVER inline — too complex)
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│  P5. Chart preview in panel   │  Chart.js renders:
│                               │  - Bar/line/pie/scatter
│                               │  - Legend, axes, gridlines
│                               │  - Hover tooltip with values
│                               │  - Toolbar: Download PNG, Download SVG
└───────────────────────────────┘
```

**State:**
- **Loading:** "Rendering chart…" with spinner
- **Success:** Interactive chart with hover tooltips
- **Error:** "Couldn't render chart. [Copy raw data] [Retry]"

#### 5d. Code Response

```
AI response contains a fenced code block
        │
        ▼
┌───────────────────────────────┐
│  Inline code block in message  │  Code block with:
│                               │  - Header: language label + Copy button
│                               │  - Syntax highlighting
│                               │  - Line numbers (toggleable)
│                               │  - Horizontal scroll (no wrapping)
│                               │  - Max 300px height inline
│                               │  - "Open in panel →" if >20 lines
└───────────────┬───────────────┘
                │
                ├── User clicks Copy
                │   → Button text: "Copy" → "Copied!" (1.5s) → "Copy"
                │
                ├── User clicks "Open in panel →"
                │   → P2. Code preview in artifact panel
                │   → Full height, line numbers, syntax highlighting
                │   → Toolbar: Copy, Download (auto-extension), Edit
                │
                └── User stays inline
                    → Code is readable, copyable
```

**State:**
- **Loading:** Code area shows skeleton shimmer
- **Success:** Syntax-highlighted code with copy button
- **Error:** "Couldn't highlight code. [Copy raw]"

---

### Flow 6: Create Artifact

```
AI response completes. Artifact detection runs on full content.
        │
        ├── No artifact detected → done (stays inline)
        │
        └── Artifact detected (code >20 lines, document >500 chars, table >5 rows, chart)
            │
            ▼
┌───────────────────────────────┐
│  Backend creates artifact     │  - Artifact record in DB
│  record                       │  - Content stored in JSONB
│                               │  - Rendering hints generated
│                               │  - SSE event emitted to client
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│  Client receives artifact     │  Desktop: panel auto-opens
│  event                        │  Mobile: "Open in panel →" button
│                               │  (no auto-open)
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│  Artifact panel opens         │  Header: type icon + title + close
│                               │  Toolbar: Copy, Download, Edit, Regenerate
│                               │  Preview area: rendered content
└───────────────────────────────┘
```

**Decision points:**
- **Auto-open vs manual?** Desktop: auto-open (panel is side-by-side, doesn't hide chat). Mobile: don't auto-open (would cover chat). Show the button, let user choose.
- **Multiple artifacts in one response?** If the AI generates a report with an embedded table AND a chart, create separate artifacts. Show tabs in the artifact panel: "Report | Table | Chart". User switches between them.
- **Artifact title?** Auto-generate from content: first heading for documents, filename pattern for code ("solution.py"), "Data Table" for tables, chart title for charts. User can rename.

---

### Flow 7: Preview Artifact

```
Artifact panel is open with content rendered
        │
        ▼
┌───────────────────────────────┐
│  P2-P6. Preview area          │  Content rendered by type:
│                               │
│  Code:    syntax-highlighted  │  - Line numbers
│           full height          │  - Horizontal scroll
│                               │  - Copy button in toolbar
│                               │
│  Document: rendered markdown  │  - Reading layout (680px width)
│           page-like           │  - Headings, tables, lists
│                               │  - "Download as PDF" in toolbar
│                               │
│  Table:   interactive grid     │  - Sortable columns (click header)
│                               │  - Sticky header
│                               │  - Row hover highlight
│                               │  - "Download as CSV" in toolbar
│                               │
│  Chart:   Chart.js render     │  - Legend, axes, gridlines
│                               │  - Hover → tooltip
│                               │  - "Download as PNG/SVG" in toolbar
│                               │
│  Slides:  slide preview        │  - Current slide + navigation
│                               │  - Prev/Next buttons
│                               │  - Full-screen toggle
│                               │  - "Download as PDF" in toolbar
└───────────────┬───────────────┘
                │
                ├── User clicks Copy → content copied to clipboard
                ├── User clicks Download → Flow 8
                ├── User clicks Edit → Flow 7b (edit mode)
                ├── User clicks Regenerate → Flow 7c (regenerate)
                ├── User clicks Close (✕) → panel slides out, chat expands
                └── User continues chatting → panel stays open (desktop)
                    or user taps Back (mobile) → returns to chat
```

#### Flow 7b: Edit Artifact

```
User clicks Edit in artifact toolbar
        │
        ▼
┌───────────────────────────────┐
│  P8. Edit mode                │  Textarea overlay:
│                               │  - Monospace font for code
│                               │  - Full content in textarea
│                               │  - Save / Cancel buttons
│                               │  - Original preview dimmed behind
└───────────────┬───────────────┘
                │
                ├── User clicks Save
                │   → New artifact version created (version +1)
                │   → is_latest = true on new, false on old
                │   → Preview updates with new content
                │   → Toast: "Artifact updated"
                │
                └── User clicks Cancel
                    → Reverts to original, no changes saved
```

#### Flow 7c: Regenerate Artifact

```
User clicks Regenerate in artifact toolbar
        │
        ▼
┌───────────────────────────────┐
│  Composer pre-fills with      │  "Regenerate this artifact with
│  regeneration prompt           │   the following changes:"
│                               │  Textarea shows: "Regenerate:
│                               │   [original prompt that created it]"
│                               │  User can modify the prompt
└───────────────┬───────────────┘
                │
                ▼
   User sends → new AI response → new artifact version
   (same conversation, linked via parent_artifact_id)
```

**Decision points:**
- **Edit vs Regenerate?** Edit = user manually changes the output (fast, no AI call). Regenerate = ask AI to produce a new version (slower, uses tokens). Both create a new version. Make the distinction clear in the UI.
- **Version history?** Show a version dropdown: "v3 (current) ▾" → lists v2, v1. User can view old versions. Old versions are read-only.

---

### Flow 8: Download File

```
User clicks Download in artifact toolbar
        │
        ▼
┌───────────────────────────────┐
│  P7. Export options            │  Format options based on artifact type:
│                               │
│  Code:     .py / .js / .rs     │  (auto-detected from language)
│  Document: PDF / HTML / MD     │
│  Table:    CSV / XLSX          │
│  Chart:    PNG / SVG           │
│  Slides:   PDF / HTML          │
│  Spreadsheet: XLSX / CSV       │
│                               │  User selects format
│                               │  [Download] button
└───────────────┬───────────────┘
                │
                ├── Simple export (code, CSV, MD, HTML, PNG, SVG)
                │   → Generated client-side, instant download
                │   → No server call needed
                │   → Browser downloads file immediately
                │
                └── Complex export (PDF, XLSX)
                    → POST /api/artifacts/:id/export
                    → Job queued
                    → "Generating PDF…" spinner
                    → Background worker renders
                    → Presigned URL returned
                    → Browser downloads from URL
                    │
                    ├── Success → file downloads, spinner → checkmark
                    │
                    └── Job fails → "Export failed. [Retry]"
```

**State:**
- **Loading:** Spinner in download button, "Generating…"
- **Success:** File downloads, button shows ✓ for 2 seconds
- **Error:** "Export failed. [Retry]" with error detail in tooltip

**Decision points:**
- **Client-side vs server-side?** Code, CSV, markdown, HTML, PNG, SVG → client-side (instant, no server load). PDF, XLSX → server-side (needs WeasyPrint/openpyxl). This split keeps the server light for most exports.
- **Where does the file save?** Browser default download location. Don't try to control this — users have their preferences.

---

### Flow 9: Recover from Failure

```
Something goes wrong during a chat session
        │
        ├── Model not responding (Ollama crashed)
        │   │
        │   ▼
        │   ┌───────────────────────────────┐
        │   │  C4. Error in message bubble   │  "⚠️ Generation failed:
        │   │                               │   Model not responding"
        │   │                               │  [Retry] button
        │   └───────────────┬───────────────┘
        │                   │
        │                   ├── User clicks Retry
        │   │   → Re-sends the last user message
        │   │   → New streaming attempt
        │   │   → If still failing after 3 retries:
        │   │     "Ollama seems to be offline.
        │   │      Start it with: ollama run glm-5.2:cloud"
        │   │     [Copy command] button
        │   │
        │   └── User navigates away
        │       → Partial response (if any) is saved
        │       → Conversation is preserved
        │       → User can retry later
        │
        ├── Network error during streaming
        │   │
        │   ▼
        │   ┌───────────────────────────────┐
        │   │  Stream interrupted             │  Partial text is kept
        │   │                               │  "Connection lost.
        │   │                               │   [Continue] [Retry]"
        │   └───────────────────────────────┘
        │   │
        │   ├── Continue → resumes from where it stopped (if possible)
        │   └── Retry → re-sends the message, starts fresh
        │
        ├── File upload fails
        │   │
        │   ▼
        │   ┌───────────────────────────────┐
        │   │  Toast notification            │  "Failed to upload
        │   │                               │   report.pdf. [Retry]"
        │   └───────────────────────────────┘
        │   │
        │   └── User clicks Retry → re-attempts upload
        │
        ├── File parsing fails (background job)
        │   │
        │   ▼
        │   ┌───────────────────────────────┐
        │   │  Attachment chip shows error   │  Chip turns red:
        │   │                               │  📄 report.pdf ⚠️
        │   │                               │  Tooltip: "Couldn't read file"
        │   │                               │  User can still send message
        │   │                               │  without file content
        │   └───────────────────────────────┘
        │
        ├── Artifact rendering fails
        │   │
        │   ▼
        │   ┌───────────────────────────────┐
        │   │  P9. Artifact error state      │  "Couldn't render this artifact"
        │   │                               │  [Retry] [Copy raw content]
        │   └───────────────────────────────┘
        │
        ├── Export job fails
        │   │
        │   ▼
        │   ┌───────────────────────────────┐
        │   │  Export button shows error     │  "Export failed. [Retry]"
        │   │                               │  Error detail in tooltip
        │   └───────────────────────────────┘
        │
        └── Conversation data corrupted (rare)
            │
            ▼
            ┌───────────────────────────────┐
            │  Chat shows recovery message   │  "This conversation
            │                               │   couldn't be loaded."
            │                               │  [Load from cache] [Delete]
            └───────────────────────────────┘
```

**Recovery principles:**
1. **Never lose user input.** If generation fails, the user's message is preserved. They can retry without retyping.
2. **Never lose partial work.** If streaming interrupts, keep whatever was generated. Don't discard it.
3. **Always offer a next action.** Every error state has at least one button (Retry, Copy raw, Continue, Delete).
4. **Explain what happened in plain language.** "Model not responding" not "HTTP 502: upstream timeout."
5. **Don't blame the user.** "Something went wrong on our end" not "You did something wrong."

---

## 3. State Transitions

### 3.1 Conversation States

```
                    ┌─────────────┐
                    │   empty      │  New chat, no messages
                    └──────┬──────┘
                           │ first message sent
                           ▼
                    ┌─────────────┐
                    │  active     │  Has messages, user is chatting
                    └──────┬──────┘
                           │ user archives
                           ▼
                    ┌─────────────┐
                    │  archived    │  Hidden from default list
                    └──────┬──────┘
                           │ user restores
                           ▼
                    ┌─────────────┐
                    │  active     │  ← shown again
                    └──────┬──────┘
                           │ user deletes
                           ▼
                    ┌─────────────┐
                    │  deleted     │  Toast with Undo (5s)
                    └─────────────┘
                           │ undo window expires
                           ▼
                      [removed from DB]
```

### 3.2 Message States

```
    ┌──────────┐  user sends   ┌───────────┐  tokens arrive  ┌───────────┐
    │  queued   │──────────────▶│ streaming │───────────────▶│ complete  │
    └──────────┘               └─────┬─────┘                └───────────┘
                                     │
                          ┌──────────┼──────────┐
                          │          │          │
                     user stops   error      network drop
                          │          │          │
                          ▼          ▼          ▼
                    ┌──────────┐ ┌────────┐ ┌──────────┐
                    │ stopped  │ │ error  │ │ error    │
                    └──────────┘ └────────┘ └──────────┘
                                       │          │
                                  retry │     retry │
                                       ▼          ▼
                                 ┌───────────┐
                                 │ streaming │ (re-attempt)
                                 └───────────┘
```

### 3.3 Attachment States

```
    ┌──────────┐  file selected   ┌───────────┐  read complete  ┌──────────┐
    │ pending  │────────────────▶│ reading   │───────────────▶│  ready   │
    └──────────┘                 └─────┬─────┘                └──────────┘
                                       │
                                  read fails
                                       │
                                       ▼
                                 ┌──────────┐
                                 │  failed  │  chip shows ⚠️
                                 └──────────┘
```

### 3.4 Artifact States

```
    ┌──────────┐  detected in    ┌───────────┐  user edits   ┌──────────────┐
    │  draft   │  AI response   │  active    │─────────────▶│  active (v2) │
    └──────────┘───────────────▶└───────────┘               └──────────────┘
                                     │
                              user archives
                                     │
                                     ▼
                              ┌──────────┐
                              │ archived │  hidden, restorable
                              └──────────┘
                                     │
                              user deletes
                                     │
                                     ▼
                              ┌──────────┐
                              │ deleted  │  soft-deleted
                              └──────────┘
```

### 3.5 Job States

```
    ┌──────────┐  worker picks   ┌─────────────┐  job succeeds  ┌──────────┐
    │  queued  │────────────────▶│ processing  │───────────────▶│ complete │
    └──────────┘                 └─────┬───────┘                └──────────┘
                                       │
                          ┌────────────┼────────────┐
                          │            │            │
                     job fails     user cancels   timeout
                          │            │            │
                          ▼            ▼            ▼
                    ┌──────────┐ ┌───────────┐ ┌──────────┐
                    │  failed  │ │cancelled │ │  failed  │
                    └─────┬────┘ └───────────┘ └──────────┘
                          │
                    retries < max?
                          │
                    yes  │     no
                          ▼      ▼
                    ┌───────────┐ ┌──────────┐
                    │  queued   │ │  failed  │ (permanent)
                    │ (retry)   │ └──────────┘
                    └───────────┘
```

### 3.6 Composer States

```
    ┌──────────────┐  user types   ┌──────────────┐  user sends   ┌──────────────┐
    │   empty      │─────────────▶│   typing     │─────────────▶│  disabled     │
    │ (placeholder)│              │ (send active)│              │ (streaming)   │
    └──────────────┘              └──────┬──────┘              └───────┬──────┘
          ▲                              │                             │
          │                        user clears                  AI done / stopped
          │                              │                             │
          │                              ▼                             ▼
          │                        ┌──────────────┐            ┌──────────────┐
          │                        │   empty      │            │   empty      │
          │                        └──────────────┘            └──────────────┘
          │                                                          │
          └──────────────────────────────────────────────────────────┘

    Special states:
    ┌──────────────┐  Ollama offline    ┌──────────────┐  file reading
    │  blocked     │◀─────────────────│  reading     │
    │ (overlay msg)│                   │ (send waits) │
    └──────────────┘                   └──────────────┘
```

---

## 4. UX Risks

### Risk 1: User doesn't know Ollama is offline

**Scenario:** User opens the app, types a message, clicks send, and nothing happens. They think the app is broken.

**Why it happens:** Ollama isn't running, but the composer looks normal. The error only appears after the user tries to send.

**Mitigation:**
- Check Ollama status on page load (`/api/tags`).
- If offline: disable the composer with a visible overlay: "Ollama is not running. Start it with `ollama run glm-5.2:cloud`" + a Copy button.
- Status dot in sidebar footer is always visible (green = ready, amber = model not loaded, red = offline).
- Re-check status every 30 seconds. Auto-re-enable composer when Ollama comes back.

**Severity:** High — this is the #1 reason users abandon self-hosted AI tools.

---

### Risk 2: User sends a file but the AI doesn't "see" it

**Scenario:** User attaches a PDF, sends "summarize this," and the AI says "I don't see any file."

**Why it happens:**
- File is still being parsed (background job not complete).
- File content wasn't injected into the prompt correctly.
- File is an image and the model doesn't support vision.

**Mitigation:**
- **Don't let users send until files are ready.** Disable send button while attachment chips show spinners. Show "Reading files…" hint.
- **Show parse status on the chip.** Spinner = reading, checkmark = ready, ⚠️ = failed.
- **If file parse failed,** let the user know before they send: chip turns red, tooltip explains. They can remove it and try another file.
- **For images,** check if the model supports vision before sending. If not, show: "This model can't process images. The image will be described by filename only."
- **Always inject file content** into `api_content`, not `content`. Verify in the backend that file text is present before calling the model.

**Severity:** High — broken file attachment destroys trust in the product.

---

### Risk 3: Artifact panel covers the chat on mobile

**Scenario:** On mobile, the artifact panel opens full-screen. User forgets they're in a conversation and can't get back.

**Why it happens:** Full-screen overlay with no obvious way back.

**Mitigation:**
- **Always show a back button** at the bottom of the artifact panel on mobile: "← Back to chat"
- **Don't auto-open artifacts on mobile.** Show "Open in panel →" button in the message. User chooses to open.
- **Swipe right to close** (gesture) in addition to the back button.
- **Preserve scroll position.** When user returns to chat, they're at the same spot they left.

**Severity:** Medium — annoying but not data-loss.

---

### Risk 4: User can't tell if the AI is still generating or frozen

**Scenario:** Streaming is slow (model is thinking). User sees partial text and isn't sure if it's still going or stuck.

**Why it happens:** No visual indicator of progress during long pauses between tokens.

**Mitigation:**
- **Keep the typing dots visible** alongside streaming text. Dots pulse in the message header area while streaming is active.
- **Show elapsed time.** "Generating… 12s" in a subtle label near the stop button.
- **Stop button is always visible** during streaming. If the user thinks it's stuck, they can stop it.
- **Heartbeat.** If no tokens arrive for 10 seconds, show "Still thinking…" in a subtle pulse. Don't show an error — models can have long pauses.

**Severity:** Medium — users may stop generation prematurely out of frustration.

---

### Risk 5: User accidentally deletes a conversation

**Scenario:** User hovers a conversation in the sidebar, clicks the trash icon, and it's gone.

**Why it happens:** Delete is one click, no confirmation.

**Mitigation:**
- **Undo toast for 5 seconds.** "Conversation deleted. [Undo]" — clicking Undo restores it immediately.
- **Don't use a confirmation modal.** Modals interrupt flow and feel heavy. Undo is calmer and faster.
- **If the user navigates away** during the 5-second window, the delete is permanent. That's acceptable — they chose to leave.
- **Soft delete first.** Mark as deleted in DB. Hard delete after 24 hours (cron job). Allows recovery even after undo window if needed.

**Severity:** Low — undo covers most cases.

---

### Risk 6: User doesn't understand the difference between Edit and Regenerate

**Scenario:** User wants to change the AI's output. They see "Edit" and "Regenerate" and don't know which to use.

**Why it happens:** Both modify the artifact, but in fundamentally different ways.

**Mitigation:**
- **Clear labels with descriptions on hover.**
  - Edit: "Manually change the content. No AI call needed."
  - Regenerate: "Ask GLM-5.2 to create a new version. Uses tokens."
- **Different visual weight.** Edit = ghost button (secondary). Regenerate = accent-bordered button (primary, but not filled).
- **Edit opens a textarea** (immediate, obvious). Regenerate opens the composer with a pre-filled prompt (also obvious). The different entry points make the distinction clear.

**Severity:** Low — users learn quickly, but tooltips help the first time.

---

### Risk 7: Long conversations become slow to load

**Scenario:** User has a 200-message conversation. Opening it takes 5+ seconds. Scrolling is janky.

**Why it happens:** All messages loaded at once, all rendered as DOM nodes.

**Mitigation:**
- **Virtualize the message list.** Only render messages in the viewport + 5 above/below. Use `react-window` or `@tanstack/virtual`.
- **Paginate on load.** Load last 50 messages first. Show "Load earlier messages" button at top. Or infinite scroll upward.
- **Lazy-render markdown.** Messages above the fold render markdown. Messages far from viewport render as plain text until scrolled to.
- **Cache rendered HTML.** Store rendered HTML alongside raw markdown in IndexedDB. On reload, inject HTML directly without re-parsing markdown.

**Severity:** Medium — affects power users who have long conversations.

---

### Risk 8: User attaches a file and doesn't know what happens next

**Scenario:** User clicks the paperclip, selects a file, and sees a chip. But they don't know if they need to type a message or just hit send.

**Why it happens:** The attachment tray doesn't explain what the AI will do with the file.

**Mitigation:**
- **Placeholder changes when files are attached.** Without files: "Reply to GLM-5.2…" With files: "Ask about report.txt…" (uses the first filename).
- **Send is enabled with files only** (no text required). The system prompt handles "analyze this file" context.
- **If user sends with files but no text,** the AI responds with a summary/analysis of the file. Don't make the user type "please analyze this file."
- **Tooltip on the chip:** "report.txt — 2.4 KB, text file. Content will be sent to GLM-5.2."

**Severity:** Low — most users figure it out, but the dynamic placeholder is a nice touch.

---

### Risk 9: Export takes too long and user thinks it failed

**Scenario:** User clicks "Download as PDF." Spinner appears. 10 seconds pass. User thinks it's broken and clicks away.

**Why it happens:** PDF generation via WeasyPrint can take 5–15 seconds for complex documents. No progress indication.

**Mitigation:**
- **Show estimated time.** "Generating PDF… usually takes 5–10 seconds"
- **Progress stages.** "Rendering content → Applying styles → Generating PDF → Uploading"
- **Don't block the UI.** User can continue chatting while export runs. When it's done, a toast appears: "Report.pdf is ready. [Download]"
- **If >30 seconds,** show a warning: "This is taking longer than usual. You can continue working — we'll notify you when it's ready."

**Severity:** Medium — perceived performance matters more than actual performance.

---

### Risk 10: User switches conversations and loses their draft

**Scenario:** User is typing a long message in conversation A. They click conversation B in the sidebar. Their draft is gone.

**Why it happens:** No draft persistence. Switching conversations clears the input.

**Mitigation:**
- **Save drafts per conversation.** Store the current input text in `conversation_id → draft` map (in-memory or localStorage). When user returns to conversation A, the draft is restored.
- **Also save pending attachments.** If user attached a file but hasn't sent, keep it with the draft.
- **Show a dot indicator** on conversation items that have unsent drafts. Subtle — a small dot next to the title.
- **Clear draft on send.** Once sent, the draft is gone (it's now a message).

**Severity:** Medium — frustrating for users who multitask.

---

### Risk 11: User doesn't realize artifacts are saved

**Scenario:** User generates a report, views it in the panel, closes the panel, and can't find it again.

**Why it happens:** Artifacts are linked to messages, but there's no obvious "artifacts" view.

**Mitigation:**
- **"Open in panel →" button persists on the message.** Even after closing the panel, the button is still there on the assistant message. User can reopen.
- **Artifacts tab in sidebar (phase 2).** A dedicated view showing all artifacts in the workspace, filterable by type. "All Reports | All Code | All Tables"
- **Artifact count on conversation.** In the sidebar, show a small badge if a conversation has artifacts: "Q3 Analysis • 2 artifacts"
- **Search (phase 2).** Full-text search includes artifact content. Searching "revenue" finds the report artifact that mentions it.

**Severity:** Low for MVP (button persists), medium for long-term usage.

---

### Risk 12: Mobile keyboard covers the input

**Scenario:** On mobile, user taps the input. Keyboard slides up and covers the input field. User can't see what they're typing.

**Why it happens:** Mobile browsers handle viewport differently when the keyboard appears.

**Mitigation:**
- **Use `dvh` units** (dynamic viewport height) instead of `vh` for the main container. `dvh` adjusts when the keyboard appears.
- **Input area is `position: fixed` at the bottom.** When keyboard appears, the input stays visible above the keyboard.
- **Test on iOS Safari and Android Chrome.** They handle this differently. iOS Safari is the most problematic.
- **Scroll the messages area** to keep the latest message visible above the input when keyboard opens.

**Severity:** High for mobile users — makes the app unusable on mobile if not handled.

---

## 5. Flow Quick Reference

| Flow | Trigger | End state | Key screens |
|---|---|---|---|
| Onboarding | First visit | Ready to chat | O1 → O2 → O3 |
| New chat | Click "New Chat" / Cmd+N | Welcome screen | S2 → C1 |
| Attach file | Click paperclip | File chips in tray | C5 → C6 |
| Ask on file | Send with attachments | AI response | C6 → C2 → C3 |
| Text output | AI responds with text | Inline markdown | C3 → C2 |
| Table output | AI generates table | Table inline + panel option | C3 → C2 → P4 |
| Chart output | AI generates chart | Chart in panel | C3 → P5 |
| Code output | AI generates code | Code inline + panel option | C3 → C2 → P2 |
| Create artifact | Artifact detected | Panel opens | C3 → P2-P6 |
| Preview artifact | Click "Open in panel" | Panel shows content | P2-P6 |
| Edit artifact | Click Edit | New version saved | P8 → P2-P6 |
| Regenerate | Click Regenerate | New AI version | P8 → C5 → C3 → P2-P6 |
| Download | Click Download | File saved to device | P7 → browser download |
| Recover failure | Error occurs | Retry or graceful exit | C4 / P9 → retry |