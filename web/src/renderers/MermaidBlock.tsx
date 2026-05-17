import { useEffect, useState } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "base",
  securityLevel: "strict",
  fontFamily:
    "'Iowan Old Style', 'Charter', 'Georgia', 'Source Serif Pro', 'Times New Roman', serif",
  themeVariables: {
    background: "#fbfaf6",
    primaryColor: "#f4f1ea",
    primaryTextColor: "#18181b",
    primaryBorderColor: "#c8c0ad",
    lineColor: "#45464d",
    secondaryColor: "#e3e7ef",
    tertiaryColor: "#f4f1ea",
    fontSize: "15px",
  },
});

let counter = 0;

const SUB_SUP: Record<string, string> = {
  "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4",
  "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9",
  "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4",
  "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
};

// Mermaid is finicky about (), |, <, >, # inside [...] node labels and chokes on
// Unicode subscripts/superscripts. The model knows English better than Mermaid
// syntax, so we normalize before render rather than relying on the prompt alone.
function sanitizeMermaid(code: string): string {
  let s = code.replace(/[₀-₉⁰-⁹]/g, (c) => SUB_SUP[c] ?? c);
  s = s.replace(/\[([^\]]+)\]/g, (whole, content: string) => {
    const trimmed = content.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) return whole;
    if (/[()|<>#&;]/.test(trimmed)) {
      return `["${trimmed.replace(/"/g, "'")}"]`;
    }
    return whole;
  });
  return s;
}

interface Props {
  code: string;
  streaming: boolean;
}

export function MermaidBlock({ code, streaming }: Props): JSX.Element {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (streaming) return;
    let cancelled = false;
    setError(null);
    const id = `mermaid-${++counter}`;
    const sanitized = sanitizeMermaid(code.trim());
    mermaid
      .render(id, sanitized)
      .then((result) => {
        if (!cancelled) setSvg(result.svg);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [code, streaming]);

  if (streaming) {
    return <div className="viz viz--loading">Drawing diagram…</div>;
  }
  if (error) {
    return (
      <div className="viz viz--error">
        <div className="viz__label">Diagram couldn't render</div>
        <pre>{code}</pre>
      </div>
    );
  }
  if (!svg) {
    return <div className="viz viz--loading">Rendering…</div>;
  }
  return <div className="viz viz--mermaid" dangerouslySetInnerHTML={{ __html: svg }} />;
}
