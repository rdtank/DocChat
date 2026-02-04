import type { Document } from "@/api/documents";
import { deleteDocument, listDocuments, uploadDocument } from "@/api/documents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  MessageSquare,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

function StatusBadge({ status }: { status: Document["status"] }) {
  if (status === "ready")
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border">
        Ready
      </Badge>
    );
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  return <Badge variant="secondary">Processing…</Badge>;
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

  // Initial load — async function defined inside effect per React docs pattern
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">My Documents</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Upload a PDF, TXT, or Markdown file to start chatting
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void refresh()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="h-4 w-4" />
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : docs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No documents yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Upload a file to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.originalName} · {formatBytes(doc.fileSize)}
                  </p>
                </div>
                <StatusBadge status={doc.status} />
                <Button
                  size="sm"
                  disabled={doc.status !== "ready"}
                  onClick={() => navigate(`/documents/${doc.id}/chat`)}
                >
                  <MessageSquare className="h-4 w-4" />
                  Chat
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void handleDelete(doc.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
