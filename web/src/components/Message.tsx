import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { MermaidBlock } from "../renderers/MermaidBlock.tsx";
import { ChartBlock } from "../renderers/ChartBlock.tsx";
import { NumberLineBlock } from "../renderers/NumberLineBlock.tsx";

interface Props {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

// Models inconsistently emit LaTeX delimiters. Normalize to the $/$$ form that
// remark-math understands, regardless of which dialect the model picked.
function normalizeMath(s: string): string {
  return s
    .replace(/\\\[([\s\S]*?)\\\]/g, (_m, body) => `\n$$\n${body.trim()}\n$$\n`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_m, body) => `$${body.trim()}$`);
}

export const Message = memo(function Message({ role, content, streaming }: Props) {
  const label = role === "user" ? "You" : "Tutor";
  const rendered = role === "assistant" ? normalizeMath(content) : content;
  const isStreaming = streaming ?? false;
  return (
    <article className={`message message--${role}`} aria-label={`${label} said`}>
      <header className="message__role">{label}</header>
      <div className="message__body">
        {role === "user" ? (
          <p className="message__plain">{rendered}</p>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              a: (props) => <a {...props} target="_blank" rel="noreferrer" />,
              code: ({ className, children, ...props }) => {
                const text = String(children ?? "");
                if (className === "language-mermaid") {
                  return <MermaidBlock code={text} streaming={isStreaming} />;
                }
                if (className === "language-chart") {
                  return <ChartBlock code={text} streaming={isStreaming} />;
                }
                if (className === "language-number-line") {
                  return <NumberLineBlock code={text} streaming={isStreaming} />;
                }
                // Standard inline / code-block path
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
              // Strip <pre> wrapper for our visualization blocks so they sit
              // flush with surrounding text.
              pre: ({ children, ...props }) => {
                const child = Array.isArray(children) ? children[0] : children;
                const cls =
                  (child as { props?: { className?: string } } | undefined)?.props
                    ?.className ?? "";
                if (
                  cls === "language-mermaid" ||
                  cls === "language-chart" ||
                  cls === "language-number-line"
                ) {
                  return <>{children}</>;
                }
                return <pre {...props}>{children}</pre>;
              },
            }}
          >
            {rendered || (isStreaming ? "​" : "")}
          </ReactMarkdown>
        )}
        {isStreaming && <span className="message__cursor" aria-hidden="true" />}
      </div>
    </article>
  );
});
