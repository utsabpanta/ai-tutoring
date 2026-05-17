import { useCallback, useEffect, useRef, useState } from "react";
import { sendChat } from "./lib/api.ts";
import { Composer } from "./components/Composer.tsx";
import { DevBar } from "./components/DevBar.tsx";
import { MessageList } from "./components/MessageList.tsx";
import { ModeBanner } from "./components/ModeBanner.tsx";

export type GradeBand = "K-2" | "3-5" | "6-8" | "9-12" | "undergrad" | "grad";
export type Subject = "math" | "science" | "writing";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const STORAGE_KEYS = {
  gradeBand: "tutor.gradeBand",
  subject: "tutor.subject",
} as const;

function loadGradeBand(): GradeBand {
  const stored = localStorage.getItem(STORAGE_KEYS.gradeBand);
  if (stored && ["K-2", "3-5", "6-8", "9-12", "undergrad", "grad"].includes(stored)) {
    return stored as GradeBand;
  }
  return "6-8";
}

function loadSubject(): Subject {
  const stored = localStorage.getItem(STORAGE_KEYS.subject);
  if (stored === "math" || stored === "science" || stored === "writing") return stored;
  return "math";
}

export function App(): JSX.Element {
  const [gradeBand, setGradeBandState] = useState<GradeBand>(loadGradeBand);
  const [subject, setSubjectState] = useState<Subject>(loadSubject);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setConversationId(null);
    setStreamingId(null);
    setError(null);
    setDraft("");
  }, []);

  const setGradeBand = useCallback((b: GradeBand) => {
    localStorage.setItem(STORAGE_KEYS.gradeBand, b);
    setGradeBandState(b);
  }, []);

  // Switching subject changes the system prompt entirely — reset the
  // conversation so history doesn't carry over with a mismatched context.
  const setSubject = useCallback(
    (s: Subject) => {
      if (s === subject) return;
      localStorage.setItem(STORAGE_KEYS.subject, s);
      setSubjectState(s);
      reset();
    },
    [subject, reset],
  );

  const send = useCallback(
    async (text: string) => {
      setError(null);
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
      };
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
      };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setStreamingId(assistantMsg.id);

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        const stream = sendChat({
          conversationId,
          message: text,
          subject,
          gradeBand,
          signal: ctrl.signal,
        });
        for await (const ev of stream) {
          if (ev.event === "meta") {
            try {
              const parsed = JSON.parse(ev.data) as { conversationId?: string };
              if (parsed.conversationId) setConversationId(parsed.conversationId);
            } catch {
              // ignore malformed meta
            }
          } else if (ev.event === "token") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsg.id ? { ...m, content: m.content + ev.data } : m,
              ),
            );
          } else if (ev.event === "done") {
            break;
          } else if (ev.event === "error") {
            setError(ev.data || "stream interrupted");
            break;
          }
        }
      } catch (err) {
        if ((err as { name?: string }).name !== "AbortError") {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        setStreamingId(null);
        abortRef.current = null;
      }
    },
    [conversationId, gradeBand, subject],
  );

  return (
    <div className="app">
      <header className="header">
        <h1 className="header__title">Socratic Tutor</h1>
        <span className="header__sub">{subject} · grade {gradeBand}</span>
      </header>
      <DevBar
        gradeBand={gradeBand}
        subject={subject}
        onGradeBand={setGradeBand}
        onSubject={setSubject}
        onReset={reset}
      />
      <MessageList
        messages={messages}
        streamingId={streamingId}
        error={error}
        subject={subject}
        onChipClick={setDraft}
      />
      <ModeBanner mode={mode} />
      <Composer value={draft} onChange={setDraft} onSend={send} disabled={streamingId !== null} />
    </div>
  );
}
