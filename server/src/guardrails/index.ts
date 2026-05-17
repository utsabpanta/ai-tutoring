import { log } from "../logger.ts";
import { antiDumpGuardrail } from "./anti-dump.ts";
import { crisisGuardrail } from "./crisis.ts";
import { offTopicGuardrail } from "./off-topic.ts";
import type { Guardrail, GuardrailContext, GuardrailTrip } from "./types.ts";

// Order matters only within ties of priority — `sort` is stable and the
// composer iterates in this order. Crisis (priority 0) always runs first
// and short-circuits everything else.
const INBOUND: Guardrail[] = [
  crisisGuardrail,
  offTopicGuardrail,
  antiDumpGuardrail,
].sort((a, b) => a.priority - b.priority);

const OUTBOUND: Guardrail[] = [];

export async function runInbound(ctx: GuardrailContext): Promise<GuardrailTrip | null> {
  for (const guardrail of INBOUND) {
    try {
      const result = await guardrail.check(ctx);
      if (result.action === "replace") {
        log.info("guardrail trip", {
          guardrail: guardrail.name,
          action: result.action,
          conversationId: ctx.conversationId,
          userId: ctx.userId,
        });
        return {
          guardrail: guardrail.name,
          action: "replace",
          message: result.message,
          modeBanner: result.modeBanner,
          terminal: result.terminal ?? false,
        };
      }
    } catch (err) {
      log.error("guardrail crashed", {
        guardrail: guardrail.name,
        err: String(err),
        conversationId: ctx.conversationId,
      });
    }
  }
  return null;
}

export type { Guardrail, GuardrailContext } from "./types.ts";
export { OUTBOUND };
