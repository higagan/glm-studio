# Open WebUI Shared Access

## Chinmay's Login Details

**Tunnel URL:** https://safer-celebs-rapids-conducted.trycloudflare.com/

**Email:** chinmay@gmail.com
**Password:** 12345678

## What He Can Access
- **Models Available:** 13 models including kimi-k2.6:cloud (default), mistral-large-3, deepseek-r1:8b, etc.
- **Role:** Admin (needed for models to show up in Open WebUI)
- **He can:** Start chats, switch models, use all features
- **He should ignore:** Models menu, Users menu, Admin settings (extra sidebar items)

## How to Use
1. Open the URL
2. Click "Get Started"
3. Enter email: chinmay@gmail.com
4. Enter password: 12345678
5. Start chatting - kimi-k2.6:cloud is pre-selected
6. To change model: Look for dropdown in top-right corner of chat

## Notes
- The tunnel stays active as long as cloudflared is running on your Mac
- If the URL stops working, restart cloudflared:
  ```bash
  cloudflared tunnel --url http://localhost:3000
  ```
- UI looks slightly busier because admin role shows extra menus - just ignore them and use the chat

## What's Working
✅ Login with email/password
✅ Default model: kimi-k2.6:cloud
✅ Can switch between all available models
✅ All 13 Ollama models accessible

---
Created: 2026-06-17
