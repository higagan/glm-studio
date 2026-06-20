#!/usr/bin/env bash
# Double-click this file on macOS to start GLM Studio.
# It enables browser access to Ollama (OLLAMA_ORIGINS=*), starts Ollama if it
# isn't running, starts the UI server, and opens the browser. No terminal needed.
set -u
cd "$(dirname "$0")"
export OLLAMA_ORIGINS="*"

if ! command -v ollama >/dev/null 2>&1; then
  echo "Ollama isn't installed. Grab it from https://ollama.com, then run this again."
  read -p "Press Enter to close this window…"
  exit 1
fi
if ! curl -s --max-time 2 http://localhost:11434/api/tags >/dev/null 2>&1; then
  echo "Starting Ollama…"
  nohup ollama serve >/tmp/glm-ollama.log 2>&1 &
  sleep 2
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 not found. Install Python 3 from https://www.python.org, then run this again."
  read -p "Press Enter to close this window…"
  exit 1
fi
if ! curl -s --max-time 2 http://localhost:7860/ >/dev/null 2>&1; then
  echo "Starting GLM Studio at http://localhost:7860 …"
  nohup python3 server.py >/tmp/glm-studio.log 2>&1 &
  sleep 1.5
fi

echo "Opening http://localhost:7860 in your browser…"
open "http://localhost:7860"