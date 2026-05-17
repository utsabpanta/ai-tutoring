import { Hono } from "hono";
import type { LLMProvider } from "../llm/provider.ts";

export function healthRoute(provider: LLMProvider): Hono {
  const app = new Hono();

  app.get("/health", (c) => c.json({ status: "ok" }));

  app.get("/ready", async (c) => {
    const llmReady = await provider.ready();
    const status = llmReady ? 200 : 503;
    return c.json({ status: llmReady ? "ok" : "degraded", llm: llmReady }, status);
  });

  return app;
}
