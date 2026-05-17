import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { eq, asc } from "drizzle-orm";
import { db } from "./db/client.ts";
import { conversations, messages } from "./db/schema.ts";
import type { ChatMessage, LLMProvider } from "./llm/provider.ts";
import type { User } from "./db/schema.ts";
import { runInbound } from "./guardrails/index.ts";
import { checkOutboundFast } from "./guardrails/anti-finished-artifact.ts";
import { log } from "./logger.ts";
import type { GradeBand } from "./env.ts";

const here = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = resolve(here, "../../prompts");

const promptCache = new Map<string, string>();

async function loadPrompt(name: string): Promise<string> {
  const cached = promptCache.get(name);
  if (cached !== undefined) return cached;
  try {
    const text = await readFile(resolve(PROMPTS_DIR, name), "utf8");
    promptCache.set(name, text);
    return text;
  } catch {
    return "";
  }
}

export type Subject = "math" | "science" | "writing";

export interface RunChatInput {
  user: User;
  conversationId: string | undefined;
  userMessage: string;
  subject: Subject;
}

export type StreamEvent =
  | {
      kind: "meta";
      conversationId: string;
      guardrail?: string;
      modeBanner?: string;
      terminal?: boolean;
    }
  | { kind: "token"; delta: string }
  | { kind: "done" }
  | { kind: "error"; reason: string };

export async function* runChat(
  input: RunChatInput,
  provider: LLMProvider,
): AsyncGenerator<StreamEvent> {
  const conversationId =
    input.conversationId ?? createConversation(input.user.id, input.subject);

  const userMsgId = crypto.randomUUID();
  db.insert(messages)
    .values({
      id: userMsgId,
      conversationId,
      role: "user",
      contentMd: input.userMessage,
      contentBlocksJson: null,
      createdAt: new Date(),
    })
    .run();

  yield { kind: "meta", conversationId };

  const history = loadHistory(conversationId);

  const trip = await runInbound({
    userId: input.user.id,
    conversationId,
    gradeBand: input.user.gradeBand as GradeBand,
    subject: input.subject,
    userMessage: input.userMessage,
    history: history.filter((m) => m.role !== "user" || m.content !== input.userMessage),
  });

  if (trip) {
    yield {
      kind: "meta",
      conversationId,
      guardrail: trip.guardrail,
      ...(trip.modeBanner ? { modeBanner: trip.modeBanner } : {}),
      ...(trip.terminal ? { terminal: true } : {}),
    };
    persistAssistant(conversationId, trip.message);
    for (const chunk of chunkMessage(trip.message)) {
      yield { kind: "token", delta: chunk };
    }
    yield { kind: "done" };
    return;
  }

  const systemPrompt = await composeSystemPrompt(input.user.gradeBand, input.subject);
  yield* streamFromModel(
    provider,
    conversationId,
    systemPrompt,
    history,
    input.subject,
  );
}

function createConversation(userId: string, subject: string): string {
  const id = crypto.randomUUID();
  const now = new Date();
  db.insert(conversations)
    .values({
      id,
      userId,
      subject,
      topic: null,
      hintTierState: "{}",
      startedAt: now,
      lastActiveAt: now,
    })
    .run();
  return id;
}

function loadHistory(conversationId: string): ChatMessage[] {
  const rows = db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt))
    .all();
  return rows
    .filter((r) => r.role !== "system")
    .map((r) => ({ role: r.role as "user" | "assistant", content: r.contentMd }));
}

async function composeSystemPrompt(gradeBand: string, subject: string): Promise<string> {
  const parts = await Promise.all([
    loadPrompt("system.base.md"),
    loadPrompt(`system.${gradeBand}.md`),
    loadPrompt(`system.${subject}.md`),
  ]);
  const composed = parts.filter((p) => p.length > 0).join("\n\n");
  if (composed.length === 0) {
    return "You are a Socratic tutor. Ask questions instead of giving answers.";
  }
  return composed;
}

async function* streamFromModel(
  provider: LLMProvider,
  conversationId: string,
  systemPrompt: string,
  history: ChatMessage[],
  subject: Subject,
): AsyncGenerator<StreamEvent> {
  // Buffer the first chunk of tokens so the outbound anti-finished-artifact
  // guardrail can interrupt before the user sees a finished essay/answer.
  // Once we're past the buffer window with no trip, stream as normal.
  const BUFFER_TOKENS = 80; // ~50–60 words; long enough to catch most intros
  const buffered: string[] = [];
  let acc = "";
  let tokensSoFar = 0;
  let bufferReleased = false;
  let interrupted = false;

  try {
    for await (const chunk of provider.chat({ messages: history, systemPrompt })) {
      acc += chunk.delta;
      tokensSoFar += 1;

      // Check guardrail while still buffering (or shortly after).
      if (!interrupted && (tokensSoFar <= BUFFER_TOKENS || tokensSoFar % 20 === 0)) {
        const decision = checkOutboundFast({ subject, accumulated: acc, tokensSoFar });
        if (decision.action === "interrupt") {
          interrupted = true;
          log.info("outbound guardrail trip", {
            guardrail: decision.reason,
            conversationId,
            tokensSoFar,
            bufferReleased,
          });
          // Discard buffered tokens (never sent to user).
          // Emit guardrail meta + replacement message.
          yield {
            kind: "meta",
            conversationId,
            guardrail: decision.reason,
            modeBanner: "Refusing to write for you",
          };
          persistAssistant(conversationId, decision.replacement);
          for (const piece of chunkMessage(decision.replacement)) {
            yield { kind: "token", delta: piece };
          }
          yield { kind: "done" };
          return;
        }
      }

      if (!bufferReleased && tokensSoFar < BUFFER_TOKENS) {
        if (chunk.delta) buffered.push(chunk.delta);
        if (chunk.done) {
          // Stream ended inside the buffer — flush.
          for (const piece of buffered) yield { kind: "token", delta: piece };
          bufferReleased = true;
          yield { kind: "done" };
          break;
        }
        continue;
      }

      // Release buffer the first time we cross the threshold.
      if (!bufferReleased) {
        for (const piece of buffered) yield { kind: "token", delta: piece };
        bufferReleased = true;
      }

      if (chunk.delta) yield { kind: "token", delta: chunk.delta };
      if (chunk.done) {
        yield { kind: "done" };
        break;
      }
    }
  } catch (err) {
    log.error("llm chat error", { err: String(err), conversationId });
    yield { kind: "error", reason: "tutor hit an error" };
    acc += "\n\n_Sorry — the tutor hit an error. Please try again._";
  } finally {
    if (!interrupted) {
      persistAssistant(conversationId, acc);
    }
    db.update(conversations)
      .set({ lastActiveAt: new Date() })
      .where(eq(conversations.id, conversationId))
      .run();
  }
}

function persistAssistant(conversationId: string, content: string): void {
  db.insert(messages)
    .values({
      id: crypto.randomUUID(),
      conversationId,
      role: "assistant",
      contentMd: content,
      contentBlocksJson: null,
      createdAt: new Date(),
    })
    .run();
  db.update(conversations)
    .set({ lastActiveAt: new Date() })
    .where(eq(conversations.id, conversationId))
    .run();
}

// Stream guardrail replacement messages word-by-word so the UI feels live
// rather than instantly dumping a wall of text.
function chunkMessage(message: string): string[] {
  const tokens: string[] = [];
  const words = message.split(/(\s+)/);
  for (const w of words) {
    if (w.length > 0) tokens.push(w);
  }
  return tokens;
}
