# Ollama Pro Cloud-First Strategy

## Philosophy
- **Cloud-first**: Use cloud models for everything unless they fail
- **Local as fallback**: Keep 3-4 local models for when cloud DNS fails
- **No compromise on quality**: Use kimi-k2.6 for important tasks, minimax for fast tasks
- **Cost-optimized**: ~$16-20/month actual usage vs $20 subscription

## OpenClaw Config

### Default Model Routing
```json
"agents": {
  "defaults": {
    "model": {
      "primary": "ollama/kimi-k2.6:cloud",
      "fallback": "ollama/minimax-m3:cloud",
      "localFallback": "ollama/qwen2.5:7b"
    }
  }
}
```

### Model Tiers (in OpenClaw config)
| Tier | Models | Use Case |
|------|--------|----------|
| **Tier 1** | `kimi-k2.6:cloud`, `minimax-m3:cloud` | Primary cloud models |
| **Tier 2** | `mistral-large-3:675b-cloud`, `qwen3-coder:480b-cloud`, `glm-5.1:cloud` | Secondary cloud |
| **Tier 3** | `qwen2.5:7b`, `deepseek-r1:8b`, `llama3.1:8b`, `qwen2.5-coder:14b`, `mistral:latest` | Local fallback only |

## Model Tiers

### Tier 1: Cloud (Primary)
| Model | Cost | Use Case | Fallback |
|-------|------|----------|----------|
| `kimi-k2.6:cloud` | $$$ | Complex reasoning, architecture, critical tasks | `qwen2.5:7b` (local) |
| `minimax-m3:cloud` | $ | Fast tasks, scouting, summaries, simple queries | `qwen2.5:7b` (local) |
| `qwen3-coder:480b-cloud` | $$ | Coding tasks when local insufficient | `qwen2.5-coder:14b` (local) |

### Tier 2: Local (Fallback)
| Model | Use Case | When to Use |
|-------|----------|-------------|
| `qwen2.5:7b` | General tasks | Cloud fails or offline |
| `deepseek-r1:8b` | Reasoning | Cloud fails, need reasoning |
| `qwen2.5-coder:14b` | Coding | Cloud fails, need code |
| `llama3.1:8b` | Balanced chat | Cloud fails, general chat |

### Tier 3: Specialized (Keep but rare)
| Model | Use Case |
|-------|----------|
| `qwen-fast:latest` | Ultra-fast drafts |
| `nomic-embed-text:latest` | RAG/embeddings |
| `medgemma:4b` | Medical domain tasks |

## Cron Job Model Assignments

| Job | Primary Model | Fallback | Why |
|-----|-------------|----------|-----|
| `medibrick-daily-accelerators` | `minimax-m3:cloud` | `qwen2.5:7b` | Fast, cheap, scouting |
| `medibrick-daily-events` | `minimax-m3:cloud` | `qwen2.5:7b` | Fast, cheap, scouting |
| `medibrick-evening-catchup` | `kimi-k2.6:cloud` | `minimax-m3:cloud` | Important, need quality |
| `medibrick-weekly-digest` | `minimax-m3:cloud` | `qwen2.5:7b` | Summary task |
| `medibrick-weekly-deep-dive` | `kimi-k2.6:cloud` | `minimax-m3:cloud` | Deep analysis |
| `quizcult-trending-pipeline` | `kimi-k2.6:cloud` | `kimi-k2.6:cloud` | Simple POST task |
| `ollama-weekly-usage-report` | `kimi-k2.6:cloud` | `minimax-m3:cloud` | Analysis |

## Rules
1. Always try cloud first
2. If cloud fails with DNS error → immediately fallback to local
3. For critical tasks (deep-dive, architecture) → use kimi-k2.6 only
4. For scouting/summaries → minimax-m3 (cheaper, faster)
5. Never run job-apply cron with cloud models (too expensive for repetitive tasks)

## Cost Optimization
- Removed 4 redundant local models → Saved ~15GB disk
- Using minimax for 70% of tasks → Lower cost than kimi
- Local fallback prevents re-run costs when cloud fails
- Weekly usage report tracks actual spend vs subscription

## When to Download New Models
Only download if:
1. A task consistently fails with current models
2. New cloud model released with better cost/quality ratio
3. Local fallback insufficient for offline work

## Last Updated
2026-06-14 - Cloud-first strategy implemented, removed 4 local models
