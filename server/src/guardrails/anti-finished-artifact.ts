// Outbound guardrail (G-1.2) — catches the model writing finished work the
// student could copy. Tuned for the writing subject (the most dangerous case),
// also fires on "here's a sample/revised/example" intros in any subject.

const HARD_INTRO_PATTERNS: RegExp[] = [
  /\bhere'?s\s+(?:a\s+)?(?:revised|rewritten|edited|polished|sample|example|draft|cleaner|stronger|better|improved)\s+(?:version|essay|paragraph|sentence|draft|piece|introduction|conclusion|thesis|outline)\b/i,
  /\bhere'?s\s+how\s+i'?d\s+(?:write|phrase|put|word|say|approach|structure)\b/i,
  /\bhere'?s\s+(?:the|a)\s+(?:rewrite|revision|edit|polished|cleaned[- ]up)\b/i,
  /\blet\s+me\s+(?:write|draft|rewrite|revise|edit|polish|show\s+you\s+how)\b/i,
  /\b(?:i'?ll|i\s+will)\s+(?:write|draft|rewrite|revise|polish|edit)\s+(?:that|this|it|the\s+essay|the\s+paragraph|the\s+thesis)\b/i,
  /\b(?:revised|rewritten|polished|improved|cleaner)\s+(?:version|draft|essay|paragraph|thesis)\s*[:.]\s*$/im,
  /\*\*(?:revised|rewritten|polished|improved|new)\s+(?:thesis|essay|paragraph|draft|version)\*\*/i,
];

// Looser intro patterns — only suspicious in writing context.
const SOFT_INTRO_PATTERNS: RegExp[] = [
  /\bhere'?s\s+(?:a\s+)?(?:structured|complete|full|finished)\s+(?:approach|outline|essay|response)\b/i,
  /\bfor\s+example\s*[:,]\s*\n[\s\-•*]*"[A-Z]/i, // "For example:\n- "Capital sentence..."
  /\bfor\s+instance\s*[:,]\s*\n[\s\-•*]*"[A-Z]/i,
];

export interface OutboundContext {
  subject: "math" | "science" | "writing";
  accumulated: string;
  tokensSoFar: number;
}

export type OutboundDecision =
  | { action: "pass" }
  | { action: "interrupt"; reason: string; replacement: string };

const REPLACEMENT_WRITING = `That's the line I won't cross — I won't write your essay, your thesis, or even a "sample" sentence for you, because then you'd be turning in my words.

Here's how we can move forward instead:

- **If you're starting from scratch**, tell me the assignment in one sentence. We'll work backwards from there to find what *you* think.
- **If you have a draft**, paste it. I'll point out the single most important thing to fix and ask you to revise it yourself.
- **If you're stuck on one specific sentence**, tell me what you're trying to say in plain words. I'll help you sharpen what you wrote.

Where would you like to start?`;

const REPLACEMENT_GENERIC = `Hold on — I caught myself about to give you a finished answer, which isn't how this works.

Tell me what you've already tried (even if it's just a guess), and we'll work from there.`;

export function checkOutboundFast(ctx: OutboundContext): OutboundDecision {
  const text = ctx.accumulated;

  for (const pattern of HARD_INTRO_PATTERNS) {
    if (pattern.test(text)) {
      return {
        action: "interrupt",
        reason: "anti-finished-artifact",
        replacement: ctx.subject === "writing" ? REPLACEMENT_WRITING : REPLACEMENT_GENERIC,
      };
    }
  }

  if (ctx.subject === "writing") {
    for (const pattern of SOFT_INTRO_PATTERNS) {
      if (pattern.test(text)) {
        return {
          action: "interrupt",
          reason: "anti-finished-artifact",
          replacement: REPLACEMENT_WRITING,
        };
      }
    }
  }

  return { action: "pass" };
}
