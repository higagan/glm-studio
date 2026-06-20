#!/usr/bin/env bash
# Run this on Linux to start GLM Studio.
# Enables browser access to Ollama (OLLAMA_ORIGINS=*), starts Ollama if it
# isn't running, starts the UI server, and opens the browser.
set -u
cd "$(dirname "$0")"
export OLLAMA_ORIGINS="*"

if ! command -v ollama >/dev/null 2>&1; then
  echo "Ollama isn't installed. Grab it from https://ollama.com, then run this again."
  exit 1
fi
if ! curl -s --max-time 2 http://localhost:11434/api/tags >/dev/null 2>&1; then
  echo "Starting Ollama…"
  nohup ollama serve >/tmp/glm-ollama.log 2>&1 &
  sleep 2
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 not found. Install Python 3, then run this again."
  exit 1
fi
if ! curl -s --max-time 2 http://localhost:7860/ >/dev/null 2>&1; then
  echo "Starting GLM Studio at http://localhost:7860 …"
  nohup python3 server.py >/tmp/glm-studio.log 2>&1 &
  sleep 1.5
fi

URL="http://localhost:7860"
echo "Opening $URL …"
if command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL"
elif command -v sensible-browser >/dev/null 2>&1; then sensible-browser "$URL"
else echo "Open $URL in your browser."; fi