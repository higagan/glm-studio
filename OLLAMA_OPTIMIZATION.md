# Ollama Pro Cost Optimization — Setup Complete

## ✅ What Changed

### 1. Default Model Changed
- **Before**: `kimi-k2.6:cloud` (~$0.002/1K tokens)
- **After**: `minimax-m3:cloud` (~$0.001/1K tokens)
- **Savings**: ~50% on all standard tasks

### 2. Model Router Script
```bash
# Usage: smart-model [task-type] [prompt-length]
~/.openclaw/bin/smart-model simple 500    # → qwen2.5:7b (local, FREE)
~/.openclaw/bin/smart-model coding 2000   # → qwen3-coder:480b (cheap)
~/.openclaw/bin/smart-model medium 1000   # → minimax-m3 (cheap)
~/.openclaw/bin/smart-model complex 5000 # → kimi-k2.6 (premium)
```

### 3. Cost Control Config
Added to `~/.openclaw/openclaw.json`:
- Max weekly calls: 3000 (stays under 5000 limit)
- Shorter timeouts (120s default)
- Prefer local models when possible

### 4. Cron Jobs Updated
All Medibrick cron jobs now use `minimax-m3:cloud`:
| Job | Old Model | New Model | Savings |
|-----|-----------|-----------|---------|
| daily-accelerators | kimi-k2.6 | minimax-m3 | 50% |
| daily-events | kimi-k2.6 | minimax-m3 | 50% |
| weekly-digest | kimi-k2.6 | minimax-m3 | 50% |
| daily-job-apply | kimi-k2.6 | minimax-m3 | 50% |

### 5. Usage Monitor
```bash
~/.openclaw/bin/check-model-usage
# Shows current model, cost comparison, recommendations
```

## 📊 Model Pricing Comparison

| Model | Cost/1K tokens | Use For |
|-------|----------------|---------|
| qwen2.5:7b (local) | **$0** | Simple Q&A, quick tasks |
| llama3.1:8b (local) | **$0** | General tasks, chat |
| qwen3-coder:480b | **$0.0005** | Coding, technical |
| minimax-m3 | **$0.001** | Standard tasks (DEFAULT) |
| kimi-k2.6 | **$0.002** | Complex reasoning only |
| mistral-large-3 | **$0.002** | Premium quality |

## 🎯 When to Use What

| Task Type | Model | Why |
|-----------|-------|-----|
| Quick questions | qwen2.5:7b | Free, fast enough |
| Code help | qwen3-coder | Optimized for code, cheap |
| Job applications | minimax-m3 | Good quality, half price |
| Complex reasoning | kimi-k2.6 | Best quality, but expensive |
| Image/vision | llava:7b | Local, free |

## 🔧 Quick Commands

```bash
# Check current model
openclaw config get agents.defaults.model.primary

# Switch to cheap model for testing
export OPENCLAW_MODEL=ollama/qwen2.5:7b

# Check usage
cat ~/.ollama/logs/server.log | grep "POST.*api/chat" | wc -l

# Monitor costs
~/.openclaw/bin/check-model-usage
```

## 💰 Expected Savings

**Before optimization:**
- Weekly usage: ~4,500 calls (90% of 5,000 limit)
- Mostly kimi-k2.6: ~$9-12/week

**After optimization:**
- Default: minimax-m3 (50% cheaper)
- Simple tasks: local models (FREE)
- Expected: ~$4-6/week (60-70% savings)

## ⚠️ Notes

- kimi-k2.6 is still used as fallback for complex tasks
- Local models don't count toward Ollama Pro usage
- Keep an eye on the weekly reset (Mondays 5:30 AM)
- If you hit limits, switch to local models temporarily

## 📅 Next Actions

1. ✅ Default model changed to minimax-m3
2. ✅ All cron jobs updated
3. ✅ Cost monitoring set up
4. 🔄 Monitor this week's usage to verify savings
5. 🔄 Adjust if needed based on actual savings

---
Last updated: 2026-06-13 18:50 IST
