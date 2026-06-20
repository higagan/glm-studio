# GLM Studio

A single-file web UI for chatting with a local GLM model through Ollama, with a
built-in artifact panel for charts, spreadsheets, slide decks, flashcards, and
documents. No build step — just a static `index.html` and a small Python proxy.

## Features

- **Chat** with streaming replies, copy/edit/regenerate, history, pinning and
  archive (all saved to localStorage)
- **Artifact panel** that auto-detects and renders whatever the model produces —
  charts, spreadsheets, tables, slide decks, flashcards, documents/reports, code
- **Content creator** — a ✨ Create button in the composer with modes for notes,
  study guides, flashcards, slide decks, comparison tables, timelines, charts
  and summaries; each mode steers the model toward a native artifact format
- **Slide decks** with per-slide speaker notes and one-click export to a real,
  editable `.pptx` (with native PowerPoint charts) via PptxGenJS, plus HTML/PDF
- **Flashcards** as a flippable card deck with prev/next/shuffle
- **File & image attachments** — images are auto-downscaled before sending so
  requests stay inside the model's context window
- Dark mode, drag-and-drop uploads, KaTeX math, syntax-highlighted code

## Run locally

```bash
python3 server.py
# open http://localhost:7860
```

Needs Ollama running (default http://localhost:11434) with a model such as
`glm-5.2:cloud` pulled. Set `OLLAMA_HOST` to point elsewhere.

## Run with Docker

```bash
docker-compose up -d
# open http://localhost:7860
```

## Project layout

- `index.html` — the entire UI (HTML/CSS/JS in one file)
- `server.py` — static file server plus an `/api/*` proxy to Ollama
- `Dockerfile`, `compose.yaml` — container setup
- `*.md` — design docs that drove the build

## License

MIT
