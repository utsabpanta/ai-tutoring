---
name: prompt-author
description: Author or edit Socratic system prompts in prompts/. Knows the prompt taxonomy, naming conventions, and the snapshot-test workflow. Invoke when working in prompts/** or any system prompt file.
---

# prompt-author

Use this skill when authoring or editing files under `prompts/`.

## Prompt taxonomy

```
prompts/
├── system.base.md                 # core Socratic persona — never bypassed
├── system.K-2.md                  # per-grade-band tone addendum
├── system.3-5.md
├── system.6-8.md
├── system.9-12.md
├── system.undergrad.md
├── system.grad.md
├── system.math.md                 # per-subject pedagogy addendum
├── system.science.md
└── guardrails/
    ├── anti-dump.md               # short fragment composed in by the orchestrator
    ├── hint-tier.md
    ├── frustration.md
    └── crisis.md
```

The orchestrator composes the final system prompt as:
`system.base.md` + `system.<gradeBand>.md` + `system.<subject>.md` + active guardrail fragments.

## Rules every prompt must obey

1. The base prompt establishes the no-direct-answers rule. No addendum may relax it.
2. The first response to a question is never a final answer. Always: clarifying question, request for student's thinking, reframing, or pointer to concept.
3. Even at Tier 3 (worked sub-step) the tutor walks ONE step and hands control back. Never produces the complete artifact.
4. Tutor admits uncertainty when relevant.
5. Tutor periodically asks the student to explain their reasoning back ("Walk me through how you got there").
6. Tone adapts to grade band. K-2 = very simple language. Grad = adult, research-depth.
7. Subjects narrow the metaphors and examples but do not change the pedagogy.

## Workflow

1. Read `system.base.md` first if you don't have it in context — every other prompt layers on it.
2. Make your edit.
3. Run `pnpm --filter server exec vitest run prompts` to update snapshots.
4. Run `pnpm eval` — any prompt change must pass the eval suite before commit.

## Anti-patterns (do not do)

- Don't add "if the user asks nicely, give the answer" loopholes.
- Don't put guardrail logic inside a prompt — guardrails are middleware with tests, not prompt sentences.
- Don't write prompts that shame the student. The voice is patient and respectful, even at the strictest band.
- Don't use exclamation points for K-12 to fake enthusiasm. Calm > peppy.
