import { useEffect, useRef } from "react";

interface Props {
  value: string;
  onChange: (next: string) => void;
  onSend: (text: string) => void;
  disabled: boolean;
}

export function Composer({ value, onChange, onSend, disabled }: Props): JSX.Element {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  function submit(): void {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    onChange("");
  }

  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <textarea
        ref={ref}
        className="composer__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={
          disabled
            ? "Tutor is thinking…"
            : "Ask a question, share what you've tried, or paste an essay."
        }
        rows={1}
        aria-label="Message"
        disabled={disabled}
      />
      <button
        type="submit"
        className="composer__send"
        disabled={disabled || value.trim().length === 0}
        aria-label="Send message"
      >
        Send
      </button>
    </form>
  );
}
