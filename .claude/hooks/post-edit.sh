#!/usr/bin/env bash
# Post-edit hook: runs the relevant test slice when prompts or guardrails change.
# Stays silent and exit-0 for unrelated edits so it never blocks ordinary work.

set -u

input=$(cat)
file_path=$(echo "$input" | /usr/bin/env python3 -c 'import json,sys; d=json.load(sys.stdin); print((d.get("tool_input") or {}).get("file_path",""))' 2>/dev/null)

if [ -z "$file_path" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR" || exit 0

case "$file_path" in
  *"/prompts/"*|*/prompts.*)
    if [ -f "server/package.json" ]; then
      echo "[hook] prompt change detected: running prompt snapshot tests"
      pnpm --filter server exec vitest run prompts 2>&1 | tail -20 || true
    else
      echo "[hook] prompt change detected (tests not yet scaffolded — will run in M1)"
    fi
    ;;
  *"/server/guardrails/"*)
    if [ -f "server/package.json" ]; then
      echo "[hook] guardrail change detected: running guardrail tests"
      pnpm --filter server exec vitest run guardrails 2>&1 | tail -20 || true
    else
      echo "[hook] guardrail change detected (tests not yet scaffolded — will run in M1)"
    fi
    ;;
  *)
    exit 0
    ;;
esac
