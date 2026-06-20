# Model Switching Guide

## Available Models

| Model | Best For | Command |
|-------|----------|---------|
| **kimi-k2.6:cloud** | General chat, web UI, multi-step tasks | `openclaw model kimi-k2.6:cloud` |
| **glm-5:cloud** | Coding, debugging, long agent tasks | `openclaw model glm-5:cloud` |
| **qwen2.5:7b** | Local, fast, private | `openclaw model qwen2.5:7b` |
| **gemma3:1b** | Ultra-fast, simple tasks | `openclaw model gemma3:1b` |

## Quick Switch

```bash
# For general chat / web UI (Claude-like)
openclaw model kimi-k2.6:cloud

# For coding / complex tasks (Claude Opus-like)
openclaw model glm-5:cloud

# For local / offline
openclaw model qwen2.5:7b
```

## Setup
Both cloud models are pulled via Ollama Pro. No local RAM needed.

| Task | Recommended |
|------|-------------|
| Daily chat, reasoning | **Kimi K2.6** |
| Coding, debugging | **GLM 5** |
| Quick local tasks | **Qwen 2.5 7B** |

## Current Default
Check: `openclaw config get defaultModel`
Set: `openclaw config set defaultModel kimi-k2.6:cloud`
