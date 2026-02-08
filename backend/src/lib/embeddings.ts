import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env";
import { getCachedEmbedding, setCachedEmbedding } from "./cache";

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

const MODEL = "gemini-embedding-001";
const DIMENSIONS = 768;
const BATCH_SIZE = 100;

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await ai.models.embedContent({
      model: MODEL,
      contents: batch,
      config: { outputDimensionality: DIMENSIONS },
    });
    embeddings.push(...response.embeddings!.map((e) => e.values!));
  }

  return embeddings;
}

export async function embedText(text: string): Promise<number[]> {
  const cached = await getCachedEmbedding(text);
  if (cached) return cached;

  const response = await ai.models.embedContent({
    model: MODEL,
    contents: text,
    config: { outputDimensionality: DIMENSIONS },
  });
  const embedding = response.embeddings![0]!.values!;
  await setCachedEmbedding(text, embedding);
  return embedding;
}
