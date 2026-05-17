import { env } from "../env.ts";
import { log } from "../logger.ts";
import type { ChatOptions, LLMProvider, ModerationResult, TokenChunk } from "./provider.ts";

interface OllamaChatLine {
  message?: { role: string; content: string };
  done: boolean;
  done_reason?: string;
}

export class OllamaProvider implements LLMProvider {
  constructor(
    private readonly host: string = env.OLLAMA_HOST,
    private readonly model: string = env.LLM_MODEL,
    private readonly moderationModel: string = env.MODERATION_MODEL,
  ) {}

  async ready(): Promise<boolean> {
    try {
      const res = await fetch(`${this.host}/api/tags`, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) return false;
      const body = (await res.json()) as { models?: Array<{ name: string }> };
      const names = new Set((body.models ?? []).map((m) => m.name));
      return names.has(this.model);
    } catch (err) {
      log.warn("ollama.ready check failed", { err: String(err) });
      return false;
    }
  }

  async *chat(opts: ChatOptions): AsyncIterable<TokenChunk> {
    const messages = [
      { role: "system", content: opts.systemPrompt },
      ...opts.messages,
    ];

    const res = await fetch(`${this.host}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: true,
        options: {
          temperature: opts.temperature ?? 0.7,
          num_predict: opts.maxTokens ?? 1024,
        },
      }),
      signal: opts.signal ?? AbortSignal.timeout(env.LLM_TIMEOUT_MS),
    });

    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => "");
      throw new Error(`ollama chat failed: ${res.status} ${body}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx = buf.indexOf("\n");
        while (idx !== -1) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (line.length > 0) {
            const parsed = JSON.parse(line) as OllamaChatLine;
            const delta = parsed.message?.content ?? "";
            yield { delta, done: parsed.done };
            if (parsed.done) return;
          }
          idx = buf.indexOf("\n");
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async moderate(text: string): Promise<ModerationResult> {
    const res = await fetch(`${this.host}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: this.moderationModel,
        messages: [{ role: "user", content: text }],
        stream: false,
      }),
      signal: AbortSignal.timeout(env.GUARDRAIL_TIMEOUT_MS),
    });
    if (!res.ok) {
      log.warn("moderation call failed", { status: res.status });
      return { flagged: false, categories: [] };
    }
    const body = (await res.json()) as { message?: { content?: string } };
    const content = body.message?.content?.trim().toLowerCase() ?? "";
    const flagged = content.startsWith("unsafe");
    const categories = flagged
      ? content
          .split("\n")
          .slice(1)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    return { flagged, categories };
  }
}
