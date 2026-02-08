import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env";
import type { RetrievedChunk } from "../services/retrievalService";

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
const MODEL = "gemini-2.5-flash";

async function judge(prompt: string): Promise<number> {
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { responseMimeType: "application/json" },
  });
  const text = res.text ?? "";
  const parsed = JSON.parse(text) as { score?: number };
  const score = parsed.score ?? 0;
  return Math.min(1, Math.max(0, score));
}

export async function scoreFaithfulness(
  context: RetrievedChunk[],
  answer: string,
): Promise<number> {
  const contextText = context
    .map((c, i) => `[${i + 1}] ${c.content}`)
    .join("\n\n");

  return judge(`You are evaluating RAG answer faithfulness.

Context excerpts:
${contextText}

Answer: ${answer}

Is every factual claim in the answer directly supported by the context above?
Respond with JSON only: {"score": <0.0 to 1.0>, "reason": "<one sentence>"}`);
}

export async function scoreAnswerRelevancy(
  question: string,
  answer: string,
): Promise<number> {
  return judge(`You are evaluating whether an answer is relevant to the question.

Question: ${question}
Answer: ${answer}

Does the answer directly address the question? Penalise vague, evasive, or off-topic responses.
Respond with JSON only: {"score": <0.0 to 1.0>, "reason": "<one sentence>"}`);
}

export async function scoreContextPrecision(
  question: string,
  chunks: RetrievedChunk[],
): Promise<number> {
  if (chunks.length === 0) return 0;

  const chunkList = chunks
    .map((c, i) => `[${i + 1}] ${c.content.slice(0, 300)}`)
    .join("\n\n");

  const res = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `You are evaluating retrieval quality for a RAG system.

Question: ${question}

Retrieved chunks:
${chunkList}

For each chunk, decide if it is relevant to answering the question (true/false).
Respond with JSON only: {"relevance": [<bool>, <bool>, ...]}`,
          },
        ],
      },
    ],
    config: { responseMimeType: "application/json" },
  });

  const parsed = JSON.parse(res.text ?? "{}") as { relevance?: boolean[] };
  const relevance = parsed.relevance ?? [];
  const relevant = relevance.filter(Boolean).length;
  return relevant / chunks.length;
}
