# GLM Studio

[![License: MIT](https://img.shields.io/badge/License-MIT-d97757?logo=github)](LICENSE)
[![Live demo](https://img.shields.io/badge/Try%20the%20demo-glm--studio-d97757?logo=githubpages&logoColor=white)](https://higagan.github.io/glm-studio/)
[![No build step](https://img.shields.io/badge/build-none-d97757?logo=deno&logoColor=white)](#quick-start)
[![Runs any Ollama model](https://img.shields.io/badge/Ollama-compatible-d97757?logo=ollama&logoColor=white)](#why-this-ui)

**Run GLM (and any Ollama model) locally, in a web UI that's actually nice to use.**

> 🖼️ **Hero screenshot coming.** Capture the app with a slide deck rendered in the
> artifact panel and the **Export → .pptx** button visible — easiest is to run
> `python3 server.py`, open `http://localhost:7860/?demo` (it seeds a sample deck), and
> screenshot. Save it as `docs/screenshot.png` (or `docs/demo.gif` for a short animation),
> then replace this whole block with:
>
> `![GLM Studio — a slide deck rendered in the artifact panel](docs/screenshot.png)`

GLM Studio is a self-hosted web interface for chatting with a local GLM model through
[Ollama](https://ollama.com) — no cloud, no API keys, no monthly bill, nothing leaving
your machine. It works with anything Ollama can run (`glm-5.2:cloud`, `llama3`, `qwen`,
etc.), but it's built around GLM and tuned to make the most of what that family is good at:
long-form, structured, content-shaped output.

## Try it (two ways, no install of this app needed)

**1. In your browser, against your own Ollama.** Open the
[live demo](https://higagan.github.io/glm-studio/), click the gear → **Ollama URL**, and
paste `http://localhost:11434`. The page calls your Ollama directly — nothing in between.
Ollama just needs to allow web pages to reach it, so start it once with CORS on:

```bash
OLLAMA_ORIGINS=* ollama serve
```

(The demo loads with a sample slide deck so you can see the artifact panel render even
before you connect. Works in Chrome/Edge/Firefox; `http://localhost` is allowed from the
HTTPS page. For an Ollama on another machine over plain `http://`, use the launcher below
— the browser blocks cross-machine `http://` from an HTTPS page.)

**2. One click, fully local.** If you've cloned the repo, double-click the launcher for
your OS — it sets `OLLAMA_ORIGINS=*`, starts Ollama and the UI, and opens the browser. No
terminal, no CORS to think about:

- **macOS:** `start.command`
- **Windows:** `start.bat`
- **Linux:** `./start.sh`

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

### How it compares

- **vs the `ollama` terminal prompt** — Ollama's CLI is fine for a one-line question, but
  the moment you ask for a deck, a chart or a report, you're staring at raw text. GLM
  Studio renders that output (charts plot, decks paginate, flashcards flip) and exports
  it to real files.
- **vs Open WebUI** — Open WebUI is a full server app with a database, users and a
  container stack. GLM Studio is one HTML file and ~140 lines of Python. No accounts, no
  Postgres, no Docker required to try it. The trade-off: it's a single-user, single-machine
  tool by design, not a multi-user server.
- **vs a hosted AI deck/writing tool** — no cloud, no API key, no bill, nothing leaves
  your machine. You also own the model and the output files.

## Quick start

Easiest: double-click `start.command` / `start.bat` / `start.sh` (see above) — it does
this for you. Manually:

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

## Examples

A real prompt and what comes back — the repo ships a sample deck
([`indian-tv-slides.md`](indian-tv-slides.md)) you can open in the app, or see rendered in
the [live demo](https://higagan.github.io/glm-studio/).

> **Prompt:** *Make me a slide deck on the evolution of Indian television, from
> Doordarshan to OTT.*

The model returns a `slide_deck` artifact the panel renders straight away — title, bullets,
a chart slide, a split comparison, a quote with speaker notes — and the **Export → .pptx**
button hands you a native PowerPoint file with the chart live and editable.

A second prompt — *"now make flashcards from the key facts"* — returns a `flashcards`
artifact that renders as a flippable card deck you can click through and shuffle, and
export to `.csv` / `.json`.

Other things that work well: *"compare these three phones as a table"*, *"make a study
guide on the French Revolution"*, *"plot quarterly revenue as a bar chart"*.

## Roadmap

A few things worth doing next — feedback and PRs welcome:

- More slide layouts (image, two-column stats, agenda with timings)
- Markdown document export to `.docx`
- Conversation folders / tags
- Streaming artifact rendering (render as the model writes, not only at the end)

## Project layout

```
index.html        # the whole UI — HTML, CSS and JS in one file
server.py         # static file server + /api/* proxy to Ollama
start.command / start.bat / start.sh   # one-click launchers (macOS / Windows / Linux)
Dockerfile
compose.yaml
*.md              # design docs that drove the build (ARCHITECTURE, DESIGN-SPEC, …)
indian-tv-slides.md, slides.json, view-slides.html   # a sample deck
```

## Troubleshooting

- **"Couldn't reach Ollama" on the hosted demo** — Ollama isn't running with browser
  access. Start it with `OLLAMA_ORIGINS=* ollama serve`, then re-test the URL in Settings.
  Works for `http://localhost` in Chrome/Edge/Firefox; for an Ollama on another machine,
  use the local launcher (the browser blocks cross-machine `http://` from an HTTPS page).
- **`HTTP 400 — prompt is too long`** — the conversation + images exceeded the model's
  context window. Start a new chat, or the downscaler should keep image attachments small.
- **`HTTP 502` / transient 5xx** — the proxy retries once or twice; cloud models
  occasionally hiccup and a retry usually clears it.
- **`model not found, check the model name in Settings`** — the name in Settings doesn't
  match a model Ollama has pulled. Run `ollama list` and copy the exact tag.

## License

MIT — see [LICENSE](LICENSE).