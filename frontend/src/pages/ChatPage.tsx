import type { Document } from "@/api/documents";
import { getDocument } from "@/api/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SseEvent } from "@/lib/sse";
import { streamChat } from "@/lib/sse";
import { cn } from "@/lib/utils";
import { ArrowLeft, BookOpen, FileText, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import { Link, useParams } from "react-router-dom";
import remarkGfm from "remark-gfm";

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

function fileStyle(name: string) {
  const ext = name?.split(".").pop()?.toLowerCase();
  if (ext === "pdf")
    return { wrap: "bg-red-50 border border-red-100", icon: "text-red-400" };
  if (ext === "md")
    return { wrap: "bg-blue-50 border border-blue-100", icon: "text-blue-400" };
  return {
    wrap: "bg-slate-50 border border-slate-100",
    icon: "text-slate-400",
  };
}

const markdownComponents: Components = {
  p: ({ children }) => (
    <p className="my-1 leading-relaxed last:mb-0">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => (
    <ul className="list-disc pl-4 my-1.5 space-y-0.5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-4 my-1.5 space-y-0.5">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-snug">{children}</li>,
  h1: ({ children }) => (
    <h1 className="text-base font-bold mt-3 mb-1 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-sm font-bold mt-2.5 mb-1 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold mt-2 mb-0.5 first:mt-0">{children}</h3>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-foreground/20 pl-3 my-1.5 opacity-75">
      {children}
    </blockquote>
  ),
  pre: ({ children }) => (
    <pre className="bg-black/6 rounded-lg p-3 overflow-x-auto my-2 text-xs font-mono leading-relaxed">
      {children}
    </pre>
  ),
  code: ({ children, className }) => {
    if (className)
      return <code className={cn("font-mono", className)}>{children}</code>;
    return (
      <code className="bg-black/6 rounded px-1.5 py-0.5 font-mono text-[0.82em]">
        {children}
      </code>
    );
  },
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-2 opacity-75 hover:opacity-100"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="border-border/40 my-2" />,
};

function SourceList({ sources }: { sources: Source[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="mt-3 pt-2.5 border-t border-border/30">
      <div className="flex items-center gap-1.5 mb-2">
        <FileText className="w-3 h-3 opacity-40" />
        <span className="text-[10px] uppercase tracking-wider font-semibold opacity-40">
          {sources.length} source{sources.length !== 1 ? "s" : ""} used
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((s, i) => (
          <button
            key={s.chunkIndex}
            onClick={() => setExpanded(expanded === i ? null : i)}
            className={cn(
              "text-[10px] px-2 py-0.5 rounded-full border font-medium transition-all",
              expanded === i
                ? "bg-foreground/10 border-foreground/25 opacity-100"
                : "border-border/50 opacity-50 hover:opacity-80 hover:bg-foreground/5",
            )}
          >
            §{i + 1}
          </button>
        ))}
      </div>
      {expanded !== null && sources[expanded] && (
        <p className="mt-2 text-[11px] leading-snug opacity-55 bg-black/4 rounded-md px-2.5 py-2">
          {sources[expanded].preview}
        </p>
      )}
    </div>
  );
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

  async function handleSend() {
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

  const docStyle = doc ? fileStyle(doc.originalName) : null;

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border/60 mb-4">
        <Link to="/">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        {docStyle && (
          <div
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
              docStyle.wrap,
            )}
          >
            <FileText className={cn("h-4 w-4", docStyle.icon)} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-semibold truncate leading-tight">
            {doc?.title ?? "Loading…"}
          </h1>
          <p className="text-xs text-muted-foreground">{doc?.originalName}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-violet-100 to-indigo-100 flex items-center justify-center mb-4">
              <BookOpen className="h-7 w-7 text-violet-500" />
            </div>
            <p className="font-semibold text-foreground">
              Ask anything about this document
            </p>
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
                "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
                msg.role === "user"
                  ? "bg-linear-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-200"
                  : "bg-muted/80 border border-border/40",
              )}
            >
              {msg.role === "user" ? (
                <p className="whitespace-pre-wrap leading-relaxed">
                  {msg.text}
                </p>
              ) : msg.streaming ? (
                <p className="whitespace-pre-wrap leading-relaxed">
                  {msg.text}
                  <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-current animate-pulse rounded-sm align-[-2px]" />
                </p>
              ) : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {msg.text}
                </ReactMarkdown>
              )}

              {msg.sources && msg.sources.length > 0 && !msg.streaming && (
                <SourceList sources={msg.sources} />
              )}
            </div>
          </div>
        ))}

        {error && (
          <p className="text-sm text-destructive text-center bg-destructive/8 py-2 px-4 rounded-lg">
            {error}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
        className="flex gap-2 pt-4 border-t border-border/60 mt-4"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about this document…"
          disabled={busy}
          className="flex-1 bg-background"
        />
        <Button
          type="submit"
          size="icon"
          disabled={busy || !input.trim()}
          className="shrink-0 bg-linear-to-br from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-sm shadow-violet-200"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
