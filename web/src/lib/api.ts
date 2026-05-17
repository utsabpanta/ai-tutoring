import { streamSSE, type SSEEvent } from "./stream.ts";

const API_BASE = "/api";

export interface SendChatInput {
  conversationId: string | null;
  message: string;
  subject: "math" | "science" | "writing";
  gradeBand: string;
  signal?: AbortSignal;
}

export async function* sendChat(input: SendChatInput): AsyncGenerator<SSEEvent> {
  const opts = {
    url: `${API_BASE}/chat`,
    body: {
      message: input.message,
      subject: input.subject,
      ...(input.conversationId ? { conversationId: input.conversationId } : {}),
    },
    headers: { "x-grade-band": input.gradeBand },
    ...(input.signal ? { signal: input.signal } : {}),
  };
  yield* streamSSE(opts);
}
