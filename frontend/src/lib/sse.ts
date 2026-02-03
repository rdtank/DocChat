const BASE = import.meta.env.VITE_API_URL as string;

export type SseEvent =
  | { event: "sources"; data: { chunkIndex: number; preview: string }[] }
  | { event: "token"; data: string }
  | { event: "done"; data: Record<string, never> }
  | { event: "error"; data: { message: string } };

export async function* streamChat(
  documentId: string,
  question: string,
  signal?: AbortSignal,
): AsyncGenerator<SseEvent> {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}/documents/${documentId}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ question }),
    signal,
  });

  if (!res.ok) {
    throw new Error(`Chat request failed: ${res.status}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";

    for (const raw of blocks) {
      if (!raw.trim()) continue;
      let eventName = "";
      let dataStr = "";
      for (const line of raw.split("\n")) {
        if (line.startsWith("event: ")) eventName = line.slice(7).trim();
        if (line.startsWith("data: ")) dataStr = line.slice(6).trim();
      }
      if (eventName && dataStr) {
        yield { event: eventName, data: JSON.parse(dataStr) } as SseEvent;
      }
    }
  }
}
