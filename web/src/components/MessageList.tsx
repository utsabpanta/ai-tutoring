import { useEffect, useRef } from "react";
import type { ChatMessage, Subject } from "../App.tsx";
import { Message } from "./Message.tsx";

interface Props {
  messages: ChatMessage[];
  streamingId: string | null;
  error: string | null;
  subject: Subject;
  onChipClick: (text: string) => void;
}

export function MessageList({
  messages,
  streamingId,
  error,
  subject,
  onChipClick,
}: Props): JSX.Element {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streamingId]);

  if (messages.length === 0 && !error) {
    return (
      <div className="messages">
        <EmptyState subject={subject} onChipClick={onChipClick} />
      </div>
    );
  }

  return (
    <div className="messages">
      {messages.map((m) => (
        <Message
          key={m.id}
          role={m.role}
          content={m.content}
          streaming={m.id === streamingId}
        />
      ))}
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}

const PROMPTS: Record<Subject, { title: string; lede: string; chips: string[] }> = {
  math: {
    title: "What are you working on?",
    lede: "I'll coach you through it — asking questions, never just handing over answers.",
    chips: [
      "How do I add fractions with different denominators?",
      "What's the area of a triangle?",
      "Walk me through factoring x² − 5x + 6.",
      "Show me a number line from −5 to 5 with 3/4 marked on it.",
    ],
  },
  science: {
    title: "What are you working on?",
    lede: "I'll coach you through it — asking questions, never just handing over answers.",
    chips: [
      "Why do plants need sunlight?",
      "Show me a diagram of how photosynthesis works.",
      "What's the difference between an acid and a base?",
      "How does Newton's third law work?",
    ],
  },
  writing: {
    title: "What are you working on?",
    lede: "Whether you're staring at a blank page or revising your fifth draft, I'll coach you through it. I won't write for you — I'll help you find the words.",
    chips: [
      "I have to write an essay but don't know how to start — help me brainstorm.",
      "I have a topic but I'm stuck finding a thesis.",
      "Here's my outline — does the structure work?",
      "Paste your draft and ask: what's the most important thing to fix?",
    ],
  },
};

function EmptyState({
  subject,
  onChipClick,
}: {
  subject: Subject;
  onChipClick: (text: string) => void;
}): JSX.Element {
  const p = PROMPTS[subject];
  return (
    <div className="empty">
      <h2 className="empty__title">{p.title}</h2>
      <p className="empty__lede">{p.lede}</p>
      <ul className="empty__chips">
        {p.chips.map((c) => (
          <li key={c}>
            <button type="button" className="empty__chip" onClick={() => onChipClick(c)}>
              {c}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
