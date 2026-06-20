# GLM Studio

A clean, fast web interface for the GLM-5.2 model via Ollama.

## Features

- Markdown rendering with tables, code blocks, and headings
- Dark mode toggle
- Chat history persistence (localStorage)
- Docker support
- Auto-start capability

## Run locally

```bash
python3 server.py
# Open http://localhost:7860
```

## Run with Docker

```bash
docker-compose up -d
# Open http://localhost:7860
```

## Requirements

- Ollama running with `glm-5.2:cloud` loaded
- Modern browser

## License

MIT