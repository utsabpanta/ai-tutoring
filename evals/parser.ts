import { readFile } from "node:fs/promises";
import yaml from "js-yaml";

export interface Assertion {
  not_contains?: string[];
  contains_any?: string[];
  guardrail_triggered?: string;
  mode_banner_contains?: string;
  hint_tier_after?: number;
}

export interface Turn {
  user: string;
  assert: Assertion;
}

export interface Frontmatter {
  id: string;
  category: string;
  grade_band: string;
  subject: string;
  description?: string;
}

export interface EvalCase {
  file: string;
  frontmatter: Frontmatter;
  turns: Turn[];
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;

export async function parseCase(filePath: string): Promise<EvalCase> {
  const text = await readFile(filePath, "utf8");
  const match = FRONTMATTER_RE.exec(text);
  if (!match) {
    throw new Error(`${filePath}: missing frontmatter`);
  }
  const [, fmRaw, body] = match;
  const frontmatter = yaml.load(fmRaw ?? "") as Frontmatter;

  const turns = parseTurns(body ?? "");

  return { file: filePath, frontmatter, turns };
}

function parseTurns(body: string): Turn[] {
  const turns: Turn[] = [];
  const sections = body.split(/\n##\s+/).slice(1);
  for (const section of sections) {
    const userTag = "**user:**";
    const assertTag = "**assert:**";
    const userIdx = section.indexOf(userTag);
    if (userIdx === -1) continue;
    const assertIdx = section.indexOf(assertTag);
    const userEnd = assertIdx === -1 ? section.length : assertIdx;
    const user = section.slice(userIdx + userTag.length, userEnd).trim();
    const assertYaml =
      assertIdx === -1 ? "" : section.slice(assertIdx + assertTag.length).trim();
    const parsed = (yaml.load(assertYaml) ?? {}) as Assertion | unknown[] | null;
    turns.push({ user, assert: normalizeAssertion(parsed) });
  }
  return turns;
}

function normalizeAssertion(raw: unknown): Assertion {
  if (raw === null || typeof raw !== "object") return {};
  const out: Assertion = {};
  const items = Array.isArray(raw) ? raw : [raw];
  for (const item of items) {
    if (item && typeof item === "object") {
      Object.assign(out, item);
    }
  }
  return out;
}
