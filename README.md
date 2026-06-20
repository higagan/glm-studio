# GLM Studio

**Run GLM (and any Ollama model) locally, in a web UI that's actually nice to use.**

GLM Studio is a self-hosted web interface for chatting with a local GLM model through
[Ollama](https://ollama.com) — no cloud, no API keys, no monthly bill, nothing leaving
your machine. It works with anything Ollama can run (`glm-5.2:cloud`, `llama3`, `qwen`,
etc.), but it's built around GLM and tuned to make the most of what that family is good at:
long-form, structured, content-shaped output.

### Why this UI

Ollama ships with a basic terminal prompt. That's fine for a quick question, but the
moment you ask a model for something richer — a deck, a chart, a set of flashcards, a
report — raw text in a terminal is the wrong tool. GLM Studio gives that output a real
home:

- **An artifact panel** that detects what the model produced and renders it properly —
  charts plot, spreadsheets become editable grids, slide decks paginate with speaker
  notes, flashcards flip, tables and documents get formatted. You don't read a wall of
  markdown, you get the thing.
- **One-click export to real files** — slide decks to a native, editable `.pptx` (with
  live PowerPoint charts), spreadsheets to `.xlsx`, tables to `.csv`, documents to PDF.
  The model's output becomes a file you can actually hand to someone.
- **A content creator** — pick a target (notes, study guide, flashcards, slide deck,
  comparison table, timeline, chart, summary) and the UI steers the model toward that
  format, so you get a usable artifact instead of a generic essay.
- **A clean, fast, single-file app** — no build step, no frameworks, no `node_modules`.
  One `index.html` plus a ~140-line Python proxy. Clone it, run it, you're in.

Think of it as a lightweight, local-first alternative to a hosted AI writing deck — but
it runs on your laptop, talks to your own model, and exports files you own.

## Quick start

```bash
python3 server.py
# open http://localhost:7860
```

That's it. The server serves the UI and proxies `/api/*` calls to Ollama at
`http://localhost:11434` by default.

You'll need Ollama running with a model pulled, e.g.:

```bash
ollama run glm-5.2:cloud
```

Point at a different Ollama host with the `OLLAMA_HOST` env var:

```bash
OLLAMA_HOST=http://192.168.1.50:11434 python3 server.py
```

## Run with Docker

```bash
docker compose up -d
# open http://localhost:7860
```

The container starts the same proxy and expects Ollama reachable at
`http://host.docker.internal:11434` (override with `OLLAMA_HOST` in `compose.yaml`).

## Settings

Click the gear icon in the top bar to set:

- **Model** — which Ollama model to talk to (default `glm-5.2:cloud`)
- **Custom system prompt** — override the built-in default for steering tone/role

## Features

**Chat**

- Streaming replies, copy / edit / regenerate / retry
- Conversation history, pinning and archive — all stored in `localStorage`, nothing
  leaves the browser except the calls to your Ollama instance
- Drag-and-drop file and image uploads; images are auto-downscaled before being sent so
  requests stay inside the model's context window
- KaTeX-rendered math, syntax-highlighted code blocks

**Artifact panel**

When the model output contains a fenced block or a slide deck, GLM Studio detects it and
renders it in a side panel instead of leaving it as raw text:

| Format | Detected from | Export |
| --- | --- | --- |
| Chart | ` ```chart ` JSON spec | — (rendered inline) |
| Spreadsheet | ` ```spreadsheet ` | `.xlsx` |
| Table | markdown table | `.csv`, markdown |
| Slide deck | `## Slide N: <layout>` | `.pptx` (native charts), HTML, PDF |
| Flashcards | ` ```flashcards ` JSON | `.json`, `.csv` |
| Document / report | prose with headings | markdown, HTML, PDF |
| Code | fenced code block | copy, raw |

**Content creator**

The ✨ button in the composer opens a mode picker that steers the model toward a target
artifact — useful when you want a specific output rather than a free-form answer:

- Notes · Study guide · Flashcards · Slide deck · Comparison table · Timeline · Chart · Summary

**Slide decks**

Slide decks use a small text format (`## Slide N: <layout>` with `title`, `bullets`,
`split`, `chart`, `quote` layouts) plus optional speaker notes via a trailing `Notes:`
line. Export to a real, editable `.pptx` with native PowerPoint charts (bars, lines, pies,
doughnuts) via [PptxGenJS](https://github.com/gitbrent/PptxGenJS) — fully client-side, the
deck never leaves the browser.

## Project layout

```
index.html        # the whole UI — HTML, CSS and JS in one file
server.py         # static file server + /api/* proxy to Ollama
Dockerfile
compose.yaml
*.md              # design docs that drove the build (ARCHITECTURE, DESIGN-SPEC, …)
indian-tv-slides.md, slides.json, view-slides.html   # a sample deck
```

## Troubleshooting

- **`HTTP 400 — prompt is too long`** — the conversation + images exceeded the model's
  context window. Start a new chat, or the downscaler should keep image attachments small.
- **`HTTP 502` / transient 5xx** — the proxy retries once or twice; cloud models
  occasionally hiccup and a retry usually clears it.
- **`model not found, check the model name in Settings`** — the name in Settings doesn't
  match a model Ollama has pulled. Run `ollama list` and copy the exact tag.

## License

MIT — see [LICENSE](LICENSE).