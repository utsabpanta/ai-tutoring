import type { GradeBand } from "../env.ts";
import type { ChatMessage } from "../llm/provider.ts";

export type Subject = "math" | "science" | "writing";

export interface GuardrailContext {
  userId: string;
  conversationId: string;
  gradeBand: GradeBand;
  subject: Subject;
  userMessage: string;
  history: ChatMessage[];
}

export type GuardrailAction =
  | { action: "pass" }
  | {
      action: "replace";
      message: string;
      modeBanner?: string;
      terminal?: boolean;
    };

export interface Guardrail {
  name: string;
  phase: "inbound" | "outbound";
  /** Lower runs earlier. Crisis = 0; frustration = 10; off-topic = 20; anti-dump = 30. */
  priority: number;
  check(ctx: GuardrailContext): Promise<GuardrailAction>;
}

export interface GuardrailTrip {
  guardrail: string;
  action: "replace";
  message: string;
  modeBanner: string | undefined;
  terminal: boolean;
}
