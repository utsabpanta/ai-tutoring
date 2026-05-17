---
name: guardrail-author
description: Author or modify guardrail middleware under server/guardrails/. Knows the middleware shape, the LLMProvider boundary, the unit-test structure, and the rule that every guardrail needs an eval case. Invoke when working in server/guardrails/**.
---

# guardrail-author

Use this skill when authoring or editing files under `server/guardrails/`.

## Where guardrails live

```
server/src/guardrails/
├── index.ts            # composes inbound and outbound chains
├── types.ts            # GuardrailResult, GuardrailContext
├── anti-dump.ts        # input
├── anti-finished.ts    # output
├── hint-tier.ts        # both (state machine)
├── frustration.ts      # input
├── crisis.ts           # input — highest priority, short-circuits everything
├── moderation.ts       # input + output, calls Llama Guard via LLMProvider
└── pii-redactor.ts     # input — redacts before logging
```

## Shape

Every guardrail exports:

```ts
export const myGuardrail: Guardrail = {
  name: "my-guardrail",
  phase: "inbound" | "outbound" | "both",
  priority: number,      // lower = runs earlier; crisis = 0
  check(ctx: GuardrailContext): Promise<GuardrailResult>;
};
```

Where `GuardrailResult` is:

```ts
{ action: "pass" }
| { action: "rewrite", message: string, modeBanner?: string }
| { action: "replace", message: string, modeBanner?: string, terminal?: boolean }
| { action: "augment", systemPromptAddendum: string, modeBanner?: string }
```

- **pass** — continue.
- **rewrite** — modify the user input before the model sees it (rare, mostly PII redaction).
- **replace** — short-circuit. The user gets `message` as the assistant response, no model call. `terminal: true` ends the conversation flow (e.g., crisis routing).
- **augment** — add a temporary system prompt addendum for this turn (e.g., "the student is frustrated — be gentle and offer a break").

## Rules

1. **Every new guardrail ships with at least 3 eval cases**: one trigger, one near-miss (does NOT trigger), one clean (unrelated).
2. **No guardrail logs raw user content.** Run through the redactor and log redacted snippets only.
3. **Guardrails compose; they do not nest.** If two guardrails want to fire, the lowest priority wins for `replace`; for `augment` and `rewrite` they stack.
4. **Crisis is priority 0 and always wins.** No other guardrail may short-circuit a crisis-positive input.
5. **Outbound guardrails run on the stream, not after.** They inspect partial output and can interrupt — they cannot wait for the full response (would break NFR-1).
6. **Time budget: ≤200ms p95 inbound (NFR-3).** If a check needs the moderation model, run it in parallel with the heuristics.

## Workflow

1. `pnpm --filter server exec vitest run guardrails -- <name>` — write the unit test first (TDD).
2. Implement the predicate.
3. Wire into `server/src/guardrails/index.ts` at the right phase and priority.
4. Add at least 3 eval cases under `evals/cases/`.
5. `pnpm eval` — must pass before merge.
