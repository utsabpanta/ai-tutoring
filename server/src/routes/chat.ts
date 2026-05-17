import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { resolveUser } from "../auth/dev-user.ts";
import { runChat } from "../orchestrator.ts";
import type { LLMProvider } from "../llm/provider.ts";
import { log } from "../logger.ts";

const ChatBody = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(32000),
  subject: z.enum(["math", "science", "writing"]).default("math"),
});

export function chatRoute(provider: LLMProvider): Hono {
  const app = new Hono();

  app.post("/chat", async (c) => {
    const parsed = ChatBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: "invalid request", details: parsed.error.flatten() }, 400);
    }
    const user = resolveUser(c.req.raw.headers);

    log.info("chat start", {
      userId: user.id,
      gradeBand: user.gradeBand,
      subject: parsed.data.subject,
    });

    return streamSSE(c, async (stream) => {
      try {
        for await (const ev of runChat(
          {
            user,
            conversationId: parsed.data.conversationId,
            userMessage: parsed.data.message,
            subject: parsed.data.subject,
          },
          provider,
        )) {
          if (ev.kind === "meta") {
            const { kind: _kind, ...meta } = ev;
            await stream.writeSSE({ event: "meta", data: JSON.stringify(meta) });
          } else if (ev.kind === "token") {
            await stream.writeSSE({ event: "token", data: ev.delta });
          } else if (ev.kind === "done") {
            await stream.writeSSE({ event: "done", data: "" });
          } else if (ev.kind === "error") {
            await stream.writeSSE({ event: "error", data: ev.reason });
          }
        }
      } catch (err) {
        log.error("stream error", { err: String(err) });
        await stream.writeSSE({ event: "error", data: "stream interrupted" });
      }
    });
  });

  return app;
}
