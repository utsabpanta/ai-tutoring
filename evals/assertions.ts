import type { Assertion } from "./parser.ts";

export interface AssertionFailure {
  kind: string;
  detail: string;
}

export interface TurnResult {
  response: string;
  guardrailTriggered: string | null;
  modeBanner: string | null;
  hintTierAfter: number | null;
}

export function runAssertions(assertion: Assertion, result: TurnResult): AssertionFailure[] {
  const failures: AssertionFailure[] = [];
  const lower = result.response.toLowerCase();

  if (assertion.not_contains) {
    for (const phrase of assertion.not_contains) {
      if (lower.includes(phrase.toLowerCase())) {
        failures.push({
          kind: "not_contains",
          detail: `response contained forbidden phrase: "${phrase}"`,
        });
      }
    }
  }

  if (assertion.contains_any) {
    const found = assertion.contains_any.some((p) => lower.includes(p.toLowerCase()));
    if (!found) {
      failures.push({
        kind: "contains_any",
        detail: `response missed all of: [${assertion.contains_any.join(", ")}]`,
      });
    }
  }

  if (assertion.guardrail_triggered) {
    if (result.guardrailTriggered !== assertion.guardrail_triggered) {
      failures.push({
        kind: "guardrail_triggered",
        detail: `expected guardrail "${assertion.guardrail_triggered}", got "${result.guardrailTriggered ?? "none"}"`,
      });
    }
  }

  if (assertion.mode_banner_contains) {
    const banner = (result.modeBanner ?? "").toLowerCase();
    if (!banner.includes(assertion.mode_banner_contains.toLowerCase())) {
      failures.push({
        kind: "mode_banner_contains",
        detail: `expected mode banner to contain "${assertion.mode_banner_contains}", got "${result.modeBanner ?? "none"}"`,
      });
    }
  }

  if (assertion.hint_tier_after !== undefined) {
    if (result.hintTierAfter !== assertion.hint_tier_after) {
      failures.push({
        kind: "hint_tier_after",
        detail: `expected hint tier ${assertion.hint_tier_after}, got ${result.hintTierAfter ?? "none"}`,
      });
    }
  }

  return failures;
}
