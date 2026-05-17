---
name: eval
description: User-invokable via /eval. Runs the Socratic-behavior eval suite via the eval-runner subagent in a forked context, reports pass/fail per category. Do NOT invoke automatically — the user explicitly types /eval.
---

# /eval

Run the full Socratic eval suite.

## Behavior

When the user types `/eval`, delegate to the `eval-runner` subagent so the eval output (which can be hundreds of lines of model responses) does not pollute the main context.

```
Agent({
  subagent_type: "eval-runner",
  description: "Run Socratic eval suite",
  prompt: "Run `pnpm eval` and report a pass/fail summary per category. Include the count of passing and failing cases, the names of any failing cases, and a one-line reason per failure. Do not paste full model outputs."
})
```

Optional args:
- `/eval <category>` → filter to one category (e.g., `/eval anti-dump`)
- `/eval --case=<id>` → run a single case

The subagent returns a compact summary. Surface that to the user verbatim, plus a one-line judgment ("Quality gate clear" / "N failures — do not merge prompt or guardrail changes").

## Why this is delegated

Eval runs may take 1–3 minutes (5–25 cases × ~5s/turn). Streaming all that into the main context would cost cache and clutter your view of the actual work. The subagent absorbs the noise and reports the verdict.
