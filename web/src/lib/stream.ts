export type SSEEvent =
  | { event: "meta"; data: string }
  | { event: "token"; data: string }
  | { event: "done"; data: string }
  | { event: "error"; data: string };

export interface StreamOptions {
  url: string;
  body: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export async function* streamSSE(opts: StreamOptions): AsyncGenerator<SSEEvent> {
  const res = await fetch(opts.url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "text/event-stream",
      ...opts.headers,
    },
    body: JSON.stringify(opts.body),
    ...(opts.signal ? { signal: opts.signal } : {}),
  });

  if (!res.ok || !res.body) {
    throw new Error(`stream failed: ${res.status} ${await res.text().catch(() => "")}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      let sep = buf.indexOf("\n\n");
      while (sep !== -1) {
        const block = buf.slice(0, sep);
        buf = buf.slice(sep + 2);
        const parsed = parseBlock(block);
        if (parsed) yield parsed;
        sep = buf.indexOf("\n\n");
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function parseBlock(block: string): SSEEvent | null {
  let eventName = "message";
  const dataLines: string[] = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).replace(/^ /, ""));
    }
  }
  if (eventName !== "meta" && eventName !== "token" && eventName !== "done" && eventName !== "error") {
    return null;
  }
  return { event: eventName, data: dataLines.join("\n") };
}
