import { Queue } from "bullmq";
import { redis } from "./redis";

export interface IngestionJobData {
  documentId: string;
  filePath: string;
  mimeType: string;
}

export const ingestionQueue = new Queue<IngestionJobData, void, string>(
  "ingestion",
  {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 },
    },
  },
);
