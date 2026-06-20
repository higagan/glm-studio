@echo off
REM Double-click this file on Windows to start GLM Studio.
REM Enables browser access to Ollama, starts Ollama if needed, starts the UI
REM server, and opens the browser.
cd /d "%~dp0"
set OLLAMA_ORIGINS=*

curl -s -m 2 http://localhost:11434/api/tags >nul 2>&1
if errorlevel 1 (
  echo Starting Ollama...
  start "" ollama serve
  timeout /t 2 /nobreak >nul
)

curl -s -m 2 http://localhost:7860/ >nul 2>&1
if errorlevel 1 (
  echo Starting GLM Studio at http://localhost:7860 ...
  start "" python server.py
  timeout /t 1 /nobreak >nul
)

echo Opening http://localhost:7860 ...
start http://localhost:7860