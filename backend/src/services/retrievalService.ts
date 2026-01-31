import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { chunks } from "../db/schema";

export interface RetrievedChunk {
  id: string;
  content: string;
  chunkIndex: number;
  distance: number;
}

export async function findSimilarChunks(
  embedding: number[],
  documentId: string,
  topK = 5,
): Promise<RetrievedChunk[]> {
  const vecStr = `[${embedding.join(",")}]`;
  const distanceExpr = sql<number>`(${chunks.embedding} <=> ${sql.raw(`'${vecStr}'::vector`)})`;

  return db
    .select({
      id: chunks.id,
      content: chunks.content,
      chunkIndex: chunks.chunkIndex,
      distance: distanceExpr,
    })
    .from(chunks)
    .where(eq(chunks.documentId, documentId))
    .orderBy(distanceExpr)
    .limit(topK);
}
