export interface EvalCase {
  id: string;
  documentId: string;
  question: string;
  groundTruth?: string; // optional reference answer
}

export interface EvalDataset {
  description?: string;
  cases: EvalCase[];
}

export interface EvalResult {
  id: string;
  question: string;
  answer: string;
  retrievedChunks: number;
  scores: {
    faithfulness: number; // 0-1: answer grounded in context?
    answerRelevancy: number; // 0-1: answer actually addresses the question?
    contextPrecision: number; // 0-1: fraction of retrieved chunks that are relevant?
  };
  latencyMs: number;
  error?: string;
}
