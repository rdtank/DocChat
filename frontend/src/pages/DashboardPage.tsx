import type { Document } from "@/api/documents";
import { deleteDocument, listDocuments, uploadDocument } from "@/api/documents";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  FileText,
  MessageSquare,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

function fileStyle(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf")
    return {
      wrap: "bg-red-50 border border-red-100",
      icon: "text-red-500",
    };
  if (ext === "md")
    return {
      wrap: "bg-blue-50 border border-blue-100",
      icon: "text-blue-500",
    };
  return {
    wrap: "bg-slate-50 border border-slate-100",
    icon: "text-slate-500",
  };
}

function StatusDot({ status }: { status: Document["status"] }) {
  if (status === "ready")
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
        Ready
      </span>
    );
  if (status === "failed")
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-red-500">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
        Failed
      </span>
    );
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 animate-pulse" />
      Processing
    </span>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await listDocuments();
        if (!cancelled) setDocs(data);
      } catch {
        if (!cancelled) setError("Failed to load documents");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!docs.some((d) => d.status === "processing")) return;
    let cancelled = false;
    const id = setTimeout(async () => {
      try {
        const data = await listDocuments();
        if (!cancelled) setDocs(data);
      } catch {
        // silent — next poll will retry
      }
    }, 4000);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [docs]);

  async function refresh() {
    setError("");
    try {
      const data = await listDocuments();
      setDocs(data);
    } catch {
      setError("Failed to load documents");
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const doc = await uploadDocument(file);
      setDocs((prev) => [doc, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteDocument(id);
      setDocs((prev) => prev.filter((d) => d.id !== id));
    } catch {
      setError("Failed to delete document");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Documents</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Upload a PDF, TXT, or Markdown file to start chatting
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="gap-1.5"
          >
            <Upload className="h-3.5 w-3.5" />
            {uploading ? "Uploading…" : "Upload"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt,.md"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/8 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-muted/60 animate-pulse"
            />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-accent/30 transition-all cursor-pointer text-center group"
        >
          <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-violet-100 to-indigo-100 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <Upload className="h-7 w-7 text-violet-500" />
          </div>
          <p className="font-semibold text-base">
            Drop a file or click to upload
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            PDF, TXT, and Markdown supported
          </p>
        </button>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => {
            const style = fileStyle(doc.originalName);
            return (
              <Card
                key={doc.id}
                className="group transition-all duration-200 hover:shadow-md hover:-translate-y-px border-border/70"
              >
                <CardContent className="flex items-center gap-4 py-4">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      style.wrap,
                    )}
                  >
                    <FileText className={cn("h-5 w-5", style.icon)} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {doc.originalName} · {formatBytes(doc.fileSize)}
                    </p>
                  </div>

                  <StatusDot status={doc.status} />

                  <Button
                    size="sm"
                    disabled={doc.status !== "ready"}
                    onClick={() => navigate(`/documents/${doc.id}/chat`)}
                    className="gap-1.5 shrink-0"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Chat
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void handleDelete(doc.id)}
                    className="shrink-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
