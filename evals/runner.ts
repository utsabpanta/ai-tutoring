import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCase, type EvalCase } from "./parser.ts";
import { runAssertions, type AssertionFailure, type TurnResult } from "./assertions.ts";

const here = resolve(fileURLToPath(import.meta.url), "..");
const CASES_DIR = resolve(here, "cases");

const API_BASE = process.env.EVAL_API_BASE ?? "http://localhost:8787";

interface Args {
  category: string | null;
  caseId: string | null;
}

interface CaseOutcome {
  caseId: string;
  category: string;
  passed: boolean;
  failures: Array<{ turn: number; failures: AssertionFailure[] }>;
  error: string | null;
}

function parseArgs(argv: string[]): Args {
  let category: string | null = null;
  let caseId: string | null = null;
  for (const arg of argv) {
    if (arg.startsWith("--category=")) category = arg.slice("--category=".length);
    else if (arg.startsWith("--case=")) caseId = arg.slice("--case=".length);
  }
  return { category, caseId };
}

async function loadCases(args: Args): Promise<EvalCase[]> {
  const files = (await readdir(CASES_DIR)).filter((f) => f.endsWith(".md"));
  const all = await Promise.all(files.map((f) => parseCase(resolve(CASES_DIR, f))));
  return all.filter((c) => {
    if (args.category && c.frontmatter.category !== args.category) return false;
    if (args.caseId && c.frontmatter.id !== args.caseId) return false;
    return true;
  });
}

async function runTurn(
  conversationId: string | null,
  message: string,
  subject: string,
  gradeBand: string,
): Promise<{ result: TurnResult; conversationId: string | null }> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-grade-band": gradeBand,
      accept: "text/event-stream",
    },
    body: JSON.stringify({
      message,
      subject,
      ...(conversationId ? { conversationId } : {}),
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`api ${res.status}: ${await res.text().catch(() => "")}`);
  }

  let response = "";
  let convoId: string | null = conversationId;
  let guardrailTriggered: string | null = null;
  let modeBanner: string | null = null;
  let hintTierAfter: number | null = null;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let sep = buf.indexOf("\n\n");
    while (sep !== -1) {
      const block = buf.slice(0, sep);
      buf = buf.slice(sep + 2);
      let event = "message";
      const dataLines: string[] = [];
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^ /, ""));
      }
      const data = dataLines.join("\n");
      if (event === "meta") {
        try {
          const parsed = JSON.parse(data) as {
            conversationId?: string;
            guardrail?: string;
            modeBanner?: string;
            hintTier?: number;
          };
          if (parsed.conversationId) convoId = parsed.conversationId;
          if (parsed.guardrail) guardrailTriggered = parsed.guardrail;
          if (parsed.modeBanner) modeBanner = parsed.modeBanner;
          if (typeof parsed.hintTier === "number") hintTierAfter = parsed.hintTier;
        } catch {
          // ignore
        }
      } else if (event === "token") {
        response += data;
      }
      sep = buf.indexOf("\n\n");
    }
  }

  return {
    result: { response, guardrailTriggered, modeBanner, hintTierAfter },
    conversationId: convoId,
  };
}

async function runCase(c: EvalCase): Promise<CaseOutcome> {
  const outcome: CaseOutcome = {
    caseId: c.frontmatter.id,
    category: c.frontmatter.category,
    passed: true,
    failures: [],
    error: null,
  };

  let conversationId: string | null = null;
  for (let i = 0; i < c.turns.length; i++) {
    const turn = c.turns[i];
    if (!turn) continue;
    try {
      const { result, conversationId: nextId } = await runTurn(
        conversationId,
        turn.user,
        c.frontmatter.subject,
        c.frontmatter.grade_band,
      );
      conversationId = nextId;
      const failures = runAssertions(turn.assert, result);
      if (failures.length > 0) {
        outcome.passed = false;
        outcome.failures.push({ turn: i + 1, failures });
      }
    } catch (err) {
      outcome.passed = false;
      outcome.error = err instanceof Error ? err.message : String(err);
      break;
    }
  }
  return outcome;
}

function summarize(outcomes: CaseOutcome[]): void {
  const total = outcomes.length;
  const passed = outcomes.filter((o) => o.passed).length;
  const failed = total - passed;

  const byCategory = new Map<string, { pass: number; total: number }>();
  for (const o of outcomes) {
    const entry = byCategory.get(o.category) ?? { pass: 0, total: 0 };
    entry.total += 1;
    if (o.passed) entry.pass += 1;
    byCategory.set(o.category, entry);
  }

  console.log("");
  console.log(`Eval result: ${failed === 0 ? "PASS" : "FAIL"}`);
  console.log(`Total: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log("");
  console.log("By category:");
  for (const [cat, { pass, total: t }] of byCategory) {
    console.log(`  ${cat.padEnd(18)} ${pass}/${t}`);
  }

  const failures = outcomes.filter((o) => !o.passed);
  if (failures.length > 0) {
    console.log("");
    console.log("Failing cases:");
    for (const f of failures) {
      if (f.error) {
        console.log(`  - ${f.caseId}: error — ${f.error}`);
      } else {
        const firstFail = f.failures[0];
        const reason = firstFail
          ? `turn ${firstFail.turn} ${firstFail.failures[0]?.kind} — ${firstFail.failures[0]?.detail}`
          : "unknown";
        console.log(`  - ${f.caseId}: ${reason}`);
      }
    }
  }

  console.log("");
  console.log(
    failed === 0
      ? "Verdict: Quality gate clear"
      : `Verdict: Do not merge prompt/guardrail changes — ${failed} failures`,
  );
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const cases = await loadCases(args);

  if (cases.length === 0) {
    console.log("No cases matched.");
    process.exit(1);
  }

  console.log(`Running ${cases.length} case${cases.length === 1 ? "" : "s"} against ${API_BASE}…`);

  const outcomes: CaseOutcome[] = [];
  for (const c of cases) {
    process.stdout.write(`  ${c.frontmatter.id} … `);
    const outcome = await runCase(c);
    outcomes.push(outcome);
    process.stdout.write(outcome.passed ? "pass\n" : "fail\n");
  }

  summarize(outcomes);

  process.exit(outcomes.every((o) => o.passed) ? 0 : 1);
}

main().catch((err) => {
  console.error("eval runner crashed:", err);
  process.exit(2);
});
