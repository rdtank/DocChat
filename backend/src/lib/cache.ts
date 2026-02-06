import { createHash } from "crypto";
import Redis from "ioredis";
import { env } from "../config/env";

const client = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
});
client.on("error", () => {}); // keep cache failures transparent

const EMBED_TTL = 86_400; // 24 h
const RAG_TTL = 3_600; // 1 h

function hash(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 40);
}

export async function getCachedEmbedding(
  text: string,
): Promise<number[] | null> {
  try {
    const val = await client.get(`embed:${hash(text)}`);
    return val ? (JSON.parse(val) as number[]) : null;
  } catch {
    return null;
  }
}

export async function setCachedEmbedding(
  text: string,
  embedding: number[],
): Promise<void> {
  try {
    await client.set(
      `embed:${hash(text)}`,
      JSON.stringify(embedding),
      "EX",
      EMBED_TTL,
    );
  } catch {}
}

export interface CachedAnswer {
  sources: { chunkIndex: number; preview: string }[];
  answer: string;
}

export async function getCachedAnswer(
  docId: string,
  question: string,
): Promise<CachedAnswer | null> {
  try {
    const val = await client.get(`rag:${docId}:${hash(question)}`);
    return val ? (JSON.parse(val) as CachedAnswer) : null;
  } catch {
    return null;
  }
}

export async function setCachedAnswer(
  docId: string,
  question: string,
  data: CachedAnswer,
): Promise<void> {
  try {
    await client.set(
      `rag:${docId}:${hash(question)}`,
      JSON.stringify(data),
      "EX",
      RAG_TTL,
    );
  } catch {}
}

export async function invalidateDocAnswers(docId: string): Promise<void> {
  try {
    const keys = await client.keys(`rag:${docId}:*`);
    if (keys.length > 0) await client.del(...keys);
  } catch {}
}
