import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import "../config/env"; // loads dotenv
import { embedText } from "../lib/embeddings";
import { streamAnswer } from "../lib/generation";
import { findSimilarChunks } from "../services/retrievalService";
import {
  scoreAnswerRelevancy,
  scoreContextPrecision,
  scoreFaithfulness,
} from "./metrics";
import type { EvalCase, EvalDataset, EvalResult } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadDataset(filePath?: string): EvalDataset {
  const target = filePath ?? resolve(__dirname, "dataset.json");
  return JSON.parse(readFileSync(target, "utf-8")) as EvalDataset;
}

async function collectAnswer(
  question: string,
  chunks: Awaited<ReturnType<typeof findSimilarChunks>>,
): Promise<string> {
  let answer = "";
  for await (const token of streamAnswer(question, chunks)) {
    answer += token;
  }
  return answer;
}

function fmt(n: number): string {
  return n.toFixed(2);
}

function bar(score: number, width = 20): string {
  const filled = Math.round(score * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

async function runCase(c: EvalCase): Promise<EvalResult> {
  const start = Date.now();
  try {
    const embedding = await embedText(c.question);
    const chunks = await findSimilarChunks(embedding, c.documentId);

    if (chunks.length === 0) {
      return {
        id: c.id,
        question: c.question,
        answer: "",
        retrievedChunks: 0,
        scores: { faithfulness: 0, answerRelevancy: 0, contextPrecision: 0 },
        latencyMs: Date.now() - start,
        error: "No chunks retrieved",
      };
    }

    const answer = await collectAnswer(c.question, chunks);

    const [faithfulness, answerRelevancy, contextPrecision] = await Promise.all(
      [
        scoreFaithfulness(chunks, answer),
        scoreAnswerRelevancy(c.question, answer),
        scoreContextPrecision(c.question, chunks),
      ],
    );

    return {
      id: c.id,
      question: c.question,
      answer,
      retrievedChunks: chunks.length,
      scores: { faithfulness, answerRelevancy, contextPrecision },
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      id: c.id,
      question: c.question,
      answer: "",
      retrievedChunks: 0,
      scores: { faithfulness: 0, answerRelevancy: 0, contextPrecision: 0 },
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function printResult(result: EvalResult, index: number, total: number) {
  const prefix = `[${index + 1}/${total}]`;
  console.log(`\n${prefix} ${result.id}: "${result.question}"`);

  if (result.error) {
    console.log(`  ✗ Error: ${result.error}`);
    return;
  }

  console.log(`  ✓ ${result.retrievedChunks} chunks · ${result.latencyMs}ms`);
  console.log(
    `  Answer preview: ${result.answer.slice(0, 120).replace(/\n/g, " ")}…`,
  );
  console.log(
    `  Faithfulness      ${bar(result.scores.faithfulness)} ${fmt(result.scores.faithfulness)}`,
  );
  console.log(
    `  Answer Relevancy  ${bar(result.scores.answerRelevancy)} ${fmt(result.scores.answerRelevancy)}`,
  );
  console.log(
    `  Context Precision ${bar(result.scores.contextPrecision)} ${fmt(result.scores.contextPrecision)}`,
  );
}

function printSummary(results: EvalResult[]) {
  const successful = results.filter((r) => !r.error);
  const avg = (key: keyof EvalResult["scores"]) =>
    successful.length === 0
      ? 0
      : successful.reduce((s, r) => s + r.scores[key], 0) / successful.length;

  const faith = avg("faithfulness");
  const rel = avg("answerRelevancy");
  const prec = avg("contextPrecision");
  const overall = (faith + rel + prec) / 3;
  const avgLatency =
    results.reduce((s, r) => s + r.latencyMs, 0) / results.length;

  console.log("\n" + "═".repeat(52));
  console.log(" SUMMARY");
  console.log("═".repeat(52));
  console.log(
    `  Cases run:          ${results.length} (${successful.length} passed)`,
  );
  console.log(`  Avg latency:        ${Math.round(avgLatency)}ms`);
  console.log(`  Faithfulness:       ${bar(faith)} ${fmt(faith)}`);
  console.log(`  Answer Relevancy:   ${bar(rel)} ${fmt(rel)}`);
  console.log(`  Context Precision:  ${bar(prec)} ${fmt(prec)}`);
  console.log(`  ─${"─".repeat(49)}`);
  console.log(`  Overall score:      ${bar(overall)} ${fmt(overall)}`);
  console.log("═".repeat(52));
}

async function main() {
  const datasetPath = process.argv[2];
  const dataset = loadDataset(datasetPath);

  console.log("╔══════════════════════════════════════╗");
  console.log("║      DocChat RAG Eval Runner         ║");
  console.log("╚══════════════════════════════════════╝");
  if (dataset.description) console.log(`\n${dataset.description}`);
  console.log(`\nRunning ${dataset.cases.length} test case(s)…`);

  const results: EvalResult[] = [];
  for (let i = 0; i < dataset.cases.length; i++) {
    const result = await runCase(dataset.cases[i]!);
    results.push(result);
    printResult(result, i, dataset.cases.length);
  }

  printSummary(results);
}

main().catch((err) => {
  console.error("Eval runner failed:", err);
  process.exit(1);
});
