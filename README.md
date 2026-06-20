# GLM Studio

A single-file web UI for talking to a local GLM model through [Ollama](https://ollama.com),
with a built-in artifact panel that renders whatever the model produces — charts,
spreadsheets, slide decks, flashcards, tables, documents and code. No build step, no
frameworks, no `node_modules`. Just one `index.html` and a small Python proxy.

It started as a way to play with `glm-5.2:cloud` and grew into a lightweight content tool:
ask for a slide deck and get a real `.pptx`, ask for flashcards and get a flippable deck,
ask for a chart and get it rendered inline.

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