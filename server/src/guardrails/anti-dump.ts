// Anti-dump (G-1.1) — inbound. Catches the student trying to paste a homework
// problem and demanding the answer, before the model sees it.
//
// Pairs with anti-finished-artifact (outbound): together they form layered
// defense against the "do my homework" workflow. Anti-dump intercepts the
// intent; anti-finished-artifact intercepts the model's compliance.
//
// Tuned for the explicit demand patterns ("just tell me the answer", "solve
// this for me", "write my essay"). Subtler dumps (a bare equation with no
// framing) rely on the prompt's Socratic instinct.

import type { Guardrail, GuardrailContext } from "./types.ts";

const ANTI_DUMP_PATTERNS: RegExp[] = [
  // Explicit answer demands
  /\b(?:just\s+)?(?:tell|give|show)\s+me\s+(?:the\s+)?(?:answer|solution|result|response)\b/i,
  /\b(?:answer|solve)\s+(?:this|that|it)\s+for\s+me\b/i,
  /\b(?:just\s+)?(?:do|solve)\s+(?:this|it|that)\s+for\s+me\b/i,
  /\bgive\s+me\s+(?:the\s+)?(?:full\s+|complete\s+|final\s+)?(?:answer|solution|steps?)\b/i,
  /\bwhat'?s\s+the\s+answer\s*(?:to\s+(?:this|that))?[\s.?!]*$/i,
  /\bwhat\s+is\s+the\s+(?:answer|solution|result)\s+to\b/i,

  // Imperative "solve X:" style problem dumps
  /^solve\s*:?\s*[a-z0-9]/i,
  /^calculate\s*:?\s*[a-z0-9(]/i,
  /^evaluate\s*:?\s*[a-z0-9(]/i,
  /^simplify\s*:?\s*[a-z0-9(]/i,

  // Writing-specific demands (caught here so the model never sees them)
  /\bwrite\s+(?:my|the|a|an)\s+(?:essay|paper|paragraph|thesis|introduction|conclusion|story|response)\b/i,
  /\b(?:can\s+you\s+)?write\s+(?:this|it)\s+for\s+me\b/i,
  /\bdo\s+my\s+(?:homework|assignment|essay|paper|project)\b/i,
  /\bgive\s+me\s+(?:a\s+)?(?:thesis|topic\s+sentence|opening|hook|conclusion)\b/i,
];

// Phrases that look like asking but contain explicit student effort. If any
// match, the message is NOT a dump — the student showed work.
const SHOWED_EFFORT_PATTERNS: RegExp[] = [
  /\bi\s+(?:tried|attempted|got|started|think|figured|believe|guess|wrote|came\s+up)\b/i,
  /\bmy\s+(?:answer|guess|attempt|work|approach|thinking|steps?)\b/i,
  /\bi'?m\s+(?:stuck|confused|not\s+sure|unsure|getting)\b/i,
  /\b(?:does|is|am)\s+(?:this|that|it|my\s+(?:answer|work))\s+(?:right|correct|wrong|ok)\b/i,
];

function looksLikeDump(text: string): boolean {
  return ANTI_DUMP_PATTERNS.some((p) => p.test(text));
}

function showedEffort(text: string): boolean {
  return SHOWED_EFFORT_PATTERNS.some((p) => p.test(text));
}

function buildResponse(ctx: GuardrailContext): string {
  if (ctx.subject === "writing") {
    return `I can see what you're asking — but writing it for you is the line I won't cross. You'd be turning in my words, not yours.

What I *can* do: help you find your thesis, sharpen your structure, or work on one sentence at a time.

**Where do you want to start?** Even one sentence of what you're trying to say is enough.`;
  }
  // math / science
  return `I see the problem you're working on. Before I help — **what have you tried so far?**

Even a guess at the first step, or one thing you remember about this kind of problem, tells me where to start. Walk me through your thinking.`;
}

export const antiDumpGuardrail: Guardrail = {
  name: "anti-dump",
  phase: "inbound",
  priority: 30,
  async check(ctx) {
    if (!looksLikeDump(ctx.userMessage)) return { action: "pass" };
    if (showedEffort(ctx.userMessage)) return { action: "pass" };
    return {
      action: "replace",
      message: buildResponse(ctx),
      modeBanner: "Coaching",
    };
  },
};
