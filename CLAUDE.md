# Socratic Tutor — Project Constitution

This file is loaded at every session start. It is the canonical source for principles, architecture, conventions, and commands. Detail lives in skills under `.claude/skills/`.

## The unmistakable rule

> **The eval suite is the canonical quality gate. Prompt or guardrail changes that don't pass `pnpm eval` don't merge.**

Run `pnpm eval` after any change to `prompts/**`, `server/guardrails/**`, or `server/orchestrator.ts`.

## Six guiding principles

1. If a feature could weaken a student's desire to think, it doesn't ship.
2. The tutor never produces a finished homework artifact (essay, completed problem set, working code solution) on first ask. It coaches.
3. Every direct answer the tutor *does* eventually give is the result of an explicit pedagogical decision, not a default.
4. Visual aids exist to externalize the *student's* thinking, not to replace it.
5. Wellbeing > engagement. We optimize for learning outcomes, not time-on-platform.
6. Speed is a learning feature. A laggy tutor breaks the flow of thought; the chat must feel instant.

## v1 scope

- **Subjects:** Math, Science, and Writing (essay coaching). Grades K through graduate.
- **Auth:** Stubbed dev user with a grade-band switcher. Real auth lands in M3.
- **Renderers:** KaTeX (math), Mermaid (diagrams), Recharts (graphs), NumberLine (custom SVG). Coordinate grid + free body diagram are M2.
- **Local-first by default.** No telemetry, no third-party analytics. *Vetted educational embeds* (PhET, OpenStax) are an explicit exception under evaluation — see ATTRIBUTIONS.md once added.
- **License:** MIT for all our code; bundled third-party deps are MIT/Apache-2.0/BSD; educational content (when added) is CC-BY 4.0 with attribution.

## Architecture

```
web/     React + Vite + TS chat UI. KaTeX, Mermaid, Recharts.
server/  Hono + TS API. SSE streaming. Drizzle + SQLite.
         server/guardrails/       middleware that runs on every inbound user message
                                  and every outbound model message
         server/orchestrator.ts   composes prompt, manages hint tier, calls LLMProvider
         server/llm/              LLMProvider interface + OllamaProvider
prompts/ Versioned system prompts: base, per-grade-band, per-subject, per-guardrail
evals/   Eval suite. Each case is a markdown file with frontmatter assertions.
```

The runtime stack is **Node 22 + TypeScript + Hono on the server, React + Vite on the web, SQLite via Drizzle for persistence, Ollama for inference**. One model in v1: `qwen2.5:7b-instruct-q4_K_M`. Moderation: `llama-guard3:1b`.

## Commands

```bash
pnpm install          # install all workspace deps
pnpm dev              # run web + api in parallel (hot reload)
pnpm typecheck        # tsc --noEmit across the workspace
pnpm test             # unit tests (server + web)
pnpm eval             # run the Socratic eval suite — the quality gate
docker compose up     # boot the full stack including Ollama
```

## Coding conventions

- **TypeScript strict mode** everywhere. No `any` (use `unknown` and narrow). No `// @ts-ignore`.
- **No default exports.** Named exports only — easier to grep, easier to refactor.
- **Prompts are code.** They live in `prompts/`, are version-controlled, and are covered by snapshot tests.
- **No comments that restate code.** Comment only when the WHY isn't obvious from the names.
- **Errors never silently swallow.** Every `catch` either re-throws, logs structured, or produces a user-visible fallback (NFR-5).
- **PII never logs raw.** Run user content through the redactor before any log statement (G-2.4).

## How to add a guardrail

1. In Claude Code, run `/scaffold-guardrail <name>` to generate the skeleton.
2. Implement the predicate in `server/src/guardrails/<name>.ts`.
3. Wire it into the inbound or outbound chain in `server/src/guardrails/index.ts`.
4. Add at least three eval cases in `evals/cases/`: one trigger, one near-miss, one clean.
5. `pnpm eval` must pass before merge.

## How to add a renderer

1. In Claude Code, run `/scaffold-renderer <name>` to generate the skeleton.
2. Define the JSON schema in `server/src/renderers/<name>.schema.ts`.
3. Server validates the model's emitted block against the schema before streaming.
4. Implement the React component in `web/src/renderers/<name>.tsx`.
5. Add a snapshot test for both the schema and the component.

## How to add a subject

1. Add the subject taxonomy entry to `server/subjects.ts`.
2. Write `prompts/system.<subject>.md` with the per-subject pedagogy addendum.
3. Add eval cases that exercise the subject's typical homework-dump and hint-progression patterns.

## What I will not do

- I will not generate a complete homework artifact on first ask.
- I will not let a student skip hint tiers without evidence of effort.
- I will not respond to crisis signals with a normal flow — crisis routing always wins.
- I will not optimize for engagement metrics (streaks, notifications, infinite scroll).
- I will not log raw user content. Redactor first, log second.

## Repository layout

What exists today (M0). Paths marked *(M1+)* / *(M2+)* are scheduled but not yet present — don't reference them as if they exist.

```
.
├── CLAUDE.md                  # this file
├── README.md                  # setup + run instructions
├── docker-compose.yml
├── docker/                    # api + web Dockerfiles, ollama entrypoint
├── .env.example
├── package.json               # workspace root
├── pnpm-workspace.yaml
├── server/
│   ├── src/
│   │   ├── index.ts           # Hono app entry
│   │   ├── env.ts             # env config (zod-validated)
│   │   ├── logger.ts          # structured JSON logger
│   │   ├── routes/
│   │   │   ├── chat.ts        # SSE chat endpoint
│   │   │   └── health.ts      # /health, /ready
│   │   ├── llm/               # LLMProvider interface + OllamaProvider
│   │   ├── orchestrator.ts    # composes prompts; will manage hint tier (M1)
│   │   ├── db/                # Drizzle schema + SQLite client
│   │   ├── auth/dev-user.ts   # stub user for v1
│   │   ├── guardrails/        # (M1+) one file per guardrail; index.ts composes
│   │   └── renderers/         # (M2+) per-renderer JSON schemas
│   └── tests/                 # (M1+)
├── web/
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── styles.css
│       ├── components/        # Composer, MessageList, ModeBanner, DevBar
│       ├── renderers/         # (M1+) one component per visual aid
│       └── lib/               # api client + SSE consumer
├── prompts/
│   ├── system.base.md
│   ├── system.<gradeBand>.md  # (M1+)
│   ├── system.<subject>.md    # (M1+)
│   └── guardrails/<n>.md      # (M1+)
├── evals/
│   ├── cases/                 # one markdown file per case
│   ├── parser.ts
│   ├── assertions.ts
│   └── runner.ts
└── .claude/
    ├── settings.json          # hooks
    ├── hooks/post-edit.sh     # path-scoped test runner
    ├── skills/                # auto + user-invocable
    └── agents/                # focused subagents
```
