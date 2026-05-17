# Socratic Tutor

An AI tutor that asks questions instead of giving answers. Math, science, and writing (essay coaching). K through graduate school. Runs fully locally — no API keys, no remote model, no telemetry.

Why this exists and the pedagogy behind it: [**AI in EdTech: Teaching, Not Shortcuts**](https://utsabpant.com/blog/ai-in-edtech-teaching-not-shortcuts).

See [`CLAUDE.md`](./CLAUDE.md) for the project constitution and [`architecture.md`](./architecture.md) for the implementation reference.

---

## Setup

> **Pick exactly one of the paths below.** Don't run both — they're alternatives.
>
> - **Local (recommended):** for actually building or running on your own machine. Faster on macOS thanks to Metal acceleration.
> - **Docker:** for showing it off on a clean machine, demos, or Linux deployments.

---

### Local — recommended

**1. Install prereqs** (one-time, skip what you already have):

- Node.js 22+
- pnpm 10 — `corepack enable && corepack prepare pnpm@10.15.1 --activate`
- Ollama (native, not Docker)
  - macOS: `brew install ollama` or [download](https://ollama.com)
  - Linux: `curl -fsSL https://ollama.com/install.sh | sh`

**2. Pull the models** (one-time, ~6GB total):

```bash
ollama pull qwen2.5:7b-instruct-q4_K_M    # ~5GB, ~5 min
ollama pull llama-guard3:1b               # ~700MB, <1 min
```

**3. Install dependencies and configure:**

```bash
cp .env.example .env
pnpm install
```

> The first install builds the `better-sqlite3` native module automatically (allow-listed in the workspace pnpm config). If you ever see `MODULE_NOT_FOUND: better_sqlite3.node`, run `pnpm rebuild better-sqlite3`.

**4. Run it:**

Make sure Ollama is serving in the background (`ollama serve` if it isn't already auto-running). Then in this repo:

```bash
pnpm dev
```

Open <http://localhost:3000>. Done.

---

### Docker — alternative

For when you want a one-command boot on a clean machine and don't care about Metal acceleration.

**Prereq:** Docker Desktop with **at least 8GB allocated** to the VM. (Settings → Resources → Memory.) The 7B model needs ≈5GB resident; with the default 4GB the stack boots and pulls models fine but `/chat` returns the fallback error.

```bash
cp .env.example .env
docker compose up
# → http://localhost:3000
```

The first boot pulls Qwen 2.5 7B (~5GB) and Llama Guard 3 1B (~700MB) into the `ollama-models` volume. This takes 5–15 minutes depending on your connection. Subsequent boots are instant.

> On macOS, Ollama inside Docker runs on CPU only (no Metal). It works, but is noticeably slower than the local path above.

---

## Daily commands (any path)

```bash
pnpm dev               # web + api with hot reload
pnpm typecheck         # tsc across the workspace
pnpm test              # unit tests (vitest; passes with no tests yet)
pnpm eval              # run the Socratic eval suite — the canonical quality gate
```

`pnpm eval` requires the api to be running. Override the default port if needed:

```bash
EVAL_API_BASE=http://localhost:8787 pnpm eval
EVAL_API_BASE=http://localhost:8787 pnpm eval --category=anti-dump
EVAL_API_BASE=http://localhost:8787 pnpm eval --case=01-homework-dump-math
```

---

## Hardware floor

- **Minimum:** 16GB RAM, modern CPU. The 7B model is sluggish without GPU acceleration but works.
- **Recommended:** 16GB+ RAM with Apple Silicon (M-series) or NVIDIA GPU.

---

## License

This project is released under the [MIT License](./LICENSE.md). Bundled third-party libraries retain their own licenses (all permissive — MIT, Apache-2.0, or BSD).

Educational *content* (textbooks, simulations, illustrations) shipped under separate licenses (e.g. CC-BY 4.0) is documented in `ATTRIBUTIONS.md` once added.

## Repository layout

See [`CLAUDE.md`](./CLAUDE.md) for the full layout and architecture. Top-level:

```
server/    Hono + Drizzle + Ollama provider. SSE streaming. Guardrail middleware.
web/       React + Vite chat UI. KaTeX, Mermaid, Recharts, number-line.
prompts/   Versioned system prompts (base + per-subject).
evals/     Socratic-behavior eval suite — the quality gate.
.claude/   Claude Code skills, agents, and hooks for the dev workflow.
docker/    Per-service Dockerfiles + ollama entrypoint script.
```
