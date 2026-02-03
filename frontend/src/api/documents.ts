import { apiFetch } from "./client";

export interface Document {
  id: string;
  ownerId: string;
  title: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  status: "processing" | "ready" | "failed";
  createdAt: string;
  updatedAt: string;
}

export const listDocuments = () =>
  apiFetch<{ documents: Document[] }>("/documents").then((r) => r.documents);

export const getDocument = (id: string) =>
  apiFetch<{ document: Document }>(`/documents/${id}`).then((r) => r.document);

export const uploadDocument = (file: File, title?: string) => {
  const form = new FormData();
  form.append("file", file);
  if (title) form.append("title", title);
  return apiFetch<{ document: Document }>("/documents", {
    method: "POST",
    body: form,
  }).then((r) => r.document);
};

export const deleteDocument = (id: string) =>
  apiFetch<{ message: string }>(`/documents/${id}`, { method: "DELETE" });
