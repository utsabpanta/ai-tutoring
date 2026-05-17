import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./env.ts";
import { initSchema } from "./db/client.ts";
import { ensureDevUser } from "./auth/dev-user.ts";
import { OllamaProvider } from "./llm/ollama.ts";
import { chatRoute } from "./routes/chat.ts";
import { healthRoute } from "./routes/health.ts";
import { log } from "./logger.ts";

initSchema();
ensureDevUser();

const provider = new OllamaProvider();

const app = new Hono();

app.use(
  "*",
  cors({
    origin: env.WEB_ORIGIN,
    allowHeaders: ["content-type", "x-grade-band"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
);

app.route("/", healthRoute(provider));
app.route("/", chatRoute(provider));

serve({ fetch: app.fetch, port: env.API_PORT }, (info) => {
  log.info("server listening", { port: info.port, model: env.LLM_MODEL });
});
