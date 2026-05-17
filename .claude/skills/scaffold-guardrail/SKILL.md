---
name: scaffold-guardrail
description: User-invokable via /scaffold-guardrail <name>. Generates a skeleton guardrail file, unit test, and three starter eval cases. Do NOT invoke automatically — the user explicitly types /scaffold-guardrail.
---

# /scaffold-guardrail

Usage: `/scaffold-guardrail <name>` (kebab-case)

## What this generates

1. `server/src/guardrails/<name>.ts` — skeleton implementing the `Guardrail` interface.
2. `server/tests/guardrails/<name>.test.ts` — vitest stub with one passing test (the predicate is `pass` by default) and three TODO blocks.
3. `evals/cases/<NN>-<name>-trigger.md` — eval case that should trigger the guardrail.
4. `evals/cases/<NN>-<name>-near-miss.md` — eval case that should NOT trigger but is close.
5. `evals/cases/<NN>-<name>-clean.md` — unrelated control case.

`<NN>` is the next available case number, zero-padded.

The user must then:
- Implement the predicate.
- Wire into `server/src/guardrails/index.ts` (correct phase and priority).
- Fill in the eval case assertions.
- Run `pnpm eval` and confirm the trigger case turns green.

## Skeleton template

```ts
// server/src/guardrails/<name>.ts
import type { Guardrail } from "./types";

export const <camelName>Guardrail: Guardrail = {
  name: "<name>",
  phase: "inbound", // TODO: confirm
  priority: 50,     // TODO: confirm. crisis=0, frustration=10, anti-dump=20.
  async check(ctx) {
    // TODO: implement
    return { action: "pass" };
  },
};
```

Refer to `server/src/guardrails/anti-dump.ts` for a worked example.
