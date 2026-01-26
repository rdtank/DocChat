import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import type { NewDocument } from "../db/schema";
import { documents } from "../db/schema";
import { notFound } from "../lib/errors";

export async function createDocument(data: NewDocument) {
  const [doc] = await db.insert(documents).values(data).returning();
  return doc!;
}

export async function listDocuments(ownerId: string) {
  return db.query.documents.findMany({
    where: eq(documents.ownerId, ownerId),
    orderBy: [desc(documents.createdAt)],
    columns: {
      id: true,
      ownerId: true,
      title: true,
      originalName: true,
      mimeType: true,
      fileSize: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      filePath: false,
    },
  });
}

export async function getDocumentById(id: string, ownerId: string) {
  const doc = await db.query.documents.findFirst({
    where: and(eq(documents.id, id), eq(documents.ownerId, ownerId)),
  });
  if (!doc) throw notFound("Document not found");
  return doc;
}

export async function deleteDocument(id: string, ownerId: string) {
  const doc = await db.query.documents.findFirst({
    where: and(eq(documents.id, id), eq(documents.ownerId, ownerId)),
  });
  if (!doc) throw notFound("Document not found");

  await db.delete(documents).where(eq(documents.id, id));
  return doc;
}

export async function updateDocumentStatus(
  id: string,
  status: "processing" | "ready" | "failed",
) {
  const [updated] = await db
    .update(documents)
    .set({ status, updatedAt: new Date() })
    .where(eq(documents.id, id))
    .returning({ id: documents.id, status: documents.status });
  return updated;
}
