import type { Document } from "@/api/documents";
import { getDocument } from "@/api/documents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SseEvent } from "@/lib/sse";
import { streamChat } from "@/lib/sse";
import { cn } from "@/lib/utils";
import { ArrowLeft, BookOpen, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

interface Source {
  chunkIndex: number;
  preview: string;
}

interface Message {
  role: "user" | "assistant";
  text: string;
  sources?: Source[];
  streaming?: boolean;
}

export function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<Document | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!id) return;
    getDocument(id)
      .then(setDoc)
      .catch(() => setError("Document not found"));
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy || !id) return;

    const question = input.trim();
    setInput("");
    setError("");
    setBusy(true);

    setMessages((prev) => [...prev, { role: "user", text: question }]);

    const assistantIdx = messages.length + 1;
    setMessages((prev) => [
      ...prev,
      { role: "assistant", text: "", streaming: true },
    ]);

    abortRef.current = new AbortController();

    try {
      let sources: Source[] | undefined;

      for await (const event of streamChat(
        id,
        question,
        abortRef.current.signal,
      )) {
        const e = event as SseEvent;
        if (e.event === "sources") {
          sources = e.data;
          setMessages((prev) =>
            prev.map((m, i) => (i === assistantIdx ? { ...m, sources } : m)),
          );
        } else if (e.event === "token") {
          setMessages((prev) =>
            prev.map((m, i) =>
              i === assistantIdx ? { ...m, text: m.text + e.data } : m,
            ),
          );
        } else if (e.event === "error") {
          setError(e.data.message);
        }
      }

      setMessages((prev) =>
        prev.map((m, i) =>
          i === assistantIdx ? { ...m, streaming: false } : m,
        ),
      );
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError("Connection lost. Please try again.");
      }
      setMessages((prev) =>
        prev.map((m, i) =>
          i === assistantIdx ? { ...m, streaming: false } : m,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b mb-4">
        <Link to="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="min-w-0">
          <h1 className="font-semibold truncate">{doc?.title ?? "Loading…"}</h1>
          <p className="text-xs text-muted-foreground">{doc?.originalName}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <BookOpen className="h-10 w-10 mb-3" />
            <p className="font-medium">Ask anything about this document</p>
            <p className="text-sm mt-1">
              I&apos;ll answer based on the document content
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex",
              msg.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-xl px-4 py-3 text-sm",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted",
              )}
            >
              <p className="whitespace-pre-wrap">
                {msg.text}
                {msg.streaming && (
                  <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-current animate-pulse rounded-sm" />
                )}
              </p>

              {msg.sources && msg.sources.length > 0 && !msg.streaming && (
                <div className="mt-3 pt-3 border-t border-border/40 space-y-1.5">
                  <p className="text-xs font-medium opacity-70">Sources used</p>
                  {msg.sources.map((s) => (
                    <details
                      key={s.chunkIndex}
                      className="text-xs opacity-70 cursor-pointer"
                    >
                      <summary className="hover:opacity-100">
                        <Badge variant="outline" className="text-[10px] mr-1">
                          {s.chunkIndex + 1}
                        </Badge>
                        {s.preview.slice(0, 60)}…
                      </summary>
                      <p className="mt-1 pl-4 opacity-80">{s.preview}</p>
                    </details>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2 pt-4 border-t mt-4">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about this document…"
          disabled={busy}
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={busy || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
