// Crisis routing (G-2.3) — runs at priority 0, before every other guardrail.
//
// Design goals:
//   - Detect distress / self-harm signals with HIGH RECALL.
//     The cost of a false positive (showing care resources to a frustrated
//     student) is far lower than the cost of a false negative (missing a
//     distressed student). Patterns favor recall.
//   - The tutor MUST NOT perform safety assessment ("are you safe?",
//     "do you have a plan?") — that's not its job and is dangerous.
//   - Always point to a trusted adult AND a crisis line.
//   - Stop normal flow (`terminal: true`).
//
// To customize resources for non-US deployments, edit RESPONSE_MESSAGE below.
// A future iteration will move this to env vars / per-region config.

import type { Guardrail } from "./types.ts";

const CRISIS_PATTERNS: RegExp[] = [
  // Direct self-harm or suicide intent
  /\bkill\s+(?:my\s*self|me)\b/i,
  /\bend\s+(?:my\s+)?(?:life|it\s+all)\b/i,
  /\bwant(?:s|ing)?\s+to\s+die\b/i,
  /\b(?:going|gonna)\s+to\s+(?:kill\s+(?:myself|me)|die|end\s+it)\b/i,
  /\bcommit(?:ting)?\s+suicide\b/i,
  /\bsuicid(?:e|al)\b/i,
  /\b(?:cut|hurt|harm)\s+my\s*self\b/i,
  /\b(?:i|i'?m)\s+(?:going\s+)?to\s+(?:hurt|harm)\s+my\s*self\b/i,
  /\bself[-\s]?harm\b/i,

  // Hopelessness with implied risk
  /\bdon'?t\s+(?:even\s+)?want\s+to\s+be\s+(?:here|alive)\b/i,
  /\bdon'?t\s+want\s+to\s+(?:live|exist)\s+anymore\b/i,
  /\bwish\s+(?:i\s+)?(?:was|were)\s+(?:dead|never\s+born)\b/i,
  /\b(?:everyone|they|my\s+(?:family|friends|parents))\s+would\s+be\s+better\s+off\s+without\s+me\b/i,
  /\bbetter\s+off\s+(?:dead|without\s+me)\b/i,
  /\bno\s+(?:point|reason)\s+(?:in\s+|to\s+)?(?:living|being\s+(?:alive|here)|going\s+on)\b/i,
  /\bnothing\s+matters\b/i,
  /\bcan'?t\s+(?:do|take|handle|go\s+on\s+with)\s+(?:this|it|life)\s+anymore\b/i,
  /\b(?:i|i'?m)\s+done\s+with\s+(?:life|everything|being\s+alive)\b/i,
  /\bjust\s+want\s+(?:it|everything|the\s+pain)\s+to\s+(?:stop|end|be\s+over)\b/i,

  // Active danger / specific means
  /\b(?:took|taking|swallowed)\s+(?:a\s+)?(?:bunch\s+of\s+|all\s+(?:my|the)\s+)?pills\b/i,
  /\bgoing\s+to\s+jump\b/i,
  /\bstanding\s+on\s+(?:the\s+)?(?:roof|ledge|bridge)\b/i,
  /\bhave\s+(?:a\s+)?(?:gun|knife|rope)\s+(?:in\s+(?:my\s+)?(?:hand|room)|with\s+me|right\s+now)\b/i,
];

const RESPONSE_MESSAGE = `What you just said is important, and it's bigger than I can help with as a tutor.

Please **reach out to a trusted adult right now** — a parent, teacher, school counselor, or family member. They want to hear from you.

If you need to talk to someone immediately:
- **In the US:** call or text **988** (free, anytime).
- **Outside the US:** search "crisis hotline" plus your country to find a local line.
- **In immediate danger:** call your local emergency number (911 in the US).

You're not alone, and people want to help. I'm going to step back from our work so you can focus on reaching out to one of them.`;

export function detectsCrisis(text: string): boolean {
  return CRISIS_PATTERNS.some((p) => p.test(text));
}

export const crisisGuardrail: Guardrail = {
  name: "crisis",
  phase: "inbound",
  priority: 0,
  async check(ctx) {
    if (!detectsCrisis(ctx.userMessage)) return { action: "pass" };
    return {
      action: "replace",
      message: RESPONSE_MESSAGE,
      modeBanner: "Support resources",
      terminal: true,
    };
  },
};
