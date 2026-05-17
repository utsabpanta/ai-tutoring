#!/bin/sh
# Boot ollama, pull the configured models if missing, then keep serving.
set -eu

PRIMARY_MODEL="${LLM_MODEL:-qwen2.5:7b-instruct-q4_K_M}"
MODERATION_MODEL_NAME="${MODERATION_MODEL:-llama-guard3:1b}"

ollama serve &
SERVER_PID=$!

# Wait for the server to start responding.
echo "[entry] waiting for ollama server…"
i=0
until ollama list >/dev/null 2>&1; do
  i=$((i + 1))
  if [ $i -gt 60 ]; then
    echo "[entry] ollama did not start within 60s" >&2
    exit 1
  fi
  sleep 1
done

# Pull required models if not already cached.
for model in "$PRIMARY_MODEL" "$MODERATION_MODEL_NAME"; do
  if ollama list | awk '{print $1}' | grep -Fxq "$model"; then
    echo "[entry] $model already pulled"
  else
    echo "[entry] pulling $model (one-time, may take several minutes)…"
    ollama pull "$model"
  fi
done

echo "[entry] ready"
wait "$SERVER_PID"
