import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env";
import type { RetrievedChunk } from "../services/retrievalService";

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
const MODEL = "gemini-2.5-flash";

function buildPrompt(question: string, context: RetrievedChunk[]): string {
  const excerpts = context
    .map((c, i) => `[Source ${i + 1}]\n${c.content}`)
    .join("\n\n---\n\n");

  return `You are a helpful document assistant. Answer the question based solely on the document excerpts provided below. If the answer cannot be found in the excerpts, say "I don't have enough information in this document to answer that."
When referencing specific information, cite which excerpt it came from using [Source N] notation.

Document excerpts:
${excerpts}

Question: ${question}`;
}

export async function* streamAnswer(
  question: string,
  context: RetrievedChunk[],
): AsyncGenerator<string> {
  const prompt = buildPrompt(question, context);

  const stream = await ai.models.generateContentStream({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  for await (const chunk of stream) {
    const text = chunk.text;
    if (text) yield text;
  }
}
