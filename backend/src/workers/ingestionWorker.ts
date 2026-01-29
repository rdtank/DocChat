import { Worker } from "bullmq";
import fs from "fs/promises";
import { createRequire } from "module";
import { db } from "../db";
import { chunks } from "../db/schema";
import { chunkText } from "../lib/chunker";
import { embedTexts } from "../lib/embeddings";
import type { IngestionJobData } from "../lib/queue";
import { redis } from "../lib/redis";
import { updateDocumentStatus } from "../services/documentService";

const require = createRequire(import.meta.url);

const pdfParse = require("pdf-parse") as (
  buffer: Buffer,
) => Promise<{ text: string }>;

async function extractText(
  filePath: string,
  mimeType: string,
): Promise<string> {
  const buffer = await fs.readFile(filePath);

  if (mimeType === "application/pdf") {
    const parsed = await pdfParse(buffer);
    return parsed.text;
  }

  // text/plain and text/markdown
  return buffer.toString("utf-8");
}

async function processDocument(data: IngestionJobData): Promise<void> {
  const { documentId, filePath, mimeType } = data;

  const rawText = await extractText(filePath, mimeType);
  if (!rawText.trim()) throw new Error("Document produced no extractable text");

  const textChunks = chunkText(rawText);
  if (textChunks.length === 0) throw new Error("No chunks produced");

  const embeddings = await embedTexts(textChunks);

  // Insert all chunks in one batch
  await db.insert(chunks).values(
    textChunks.map((content, i) => ({
      documentId,
      content,
      chunkIndex: i,
      embedding: embeddings[i],
    })),
  );

  await updateDocumentStatus(documentId, "ready");
}

export function startIngestionWorker() {
  const worker = new Worker<IngestionJobData>(
    "ingestion",
    async (job) => {
      console.log(`[worker] Processing document ${job.data.documentId}`);
      await processDocument(job.data);
      console.log(`[worker] Done: ${job.data.documentId}`);
    },
    {
      connection: redis,
      concurrency: 3,
    },
  );

  worker.on("failed", async (job, err) => {
    console.error(`[worker] Job ${job?.id} failed:`, err.message);
    if (job?.data.documentId) {
      await updateDocumentStatus(job.data.documentId, "failed").catch(
        () => null,
      );
    }
  });

  return worker;
}
