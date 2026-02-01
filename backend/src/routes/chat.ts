import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { embedText } from "../lib/embeddings";
import { badRequest } from "../lib/errors";
import { streamAnswer } from "../lib/generation";
import { requireAuth } from "../middleware/requireAuth";
import { getDocumentById } from "../services/documentService";
import { findSimilarChunks } from "../services/retrievalService";

const router = Router();
router.use(requireAuth);

// POST /documents/:id/chat
router.post(
  "/:id/chat",
  asyncHandler(async (req, res) => {
    const { question } = req.body as { question?: string };
    if (!question?.trim()) throw badRequest("question is required");

    const doc = await getDocumentById(req.params.id!, req.userId!);
    if (doc.status !== "ready") {
      throw badRequest(
        `Document is not ready for chat (status: ${doc.status})`,
      );
    }

    const queryEmbedding = await embedText(question.trim());
    const similarChunks = await findSimilarChunks(queryEmbedding, doc.id);

    if (similarChunks.length === 0) {
      throw badRequest("No relevant content found in this document");
    }

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const writeEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      writeEvent(
        "sources",
        similarChunks.map((c) => ({
          chunkIndex: c.chunkIndex,
          preview:
            c.content.length > 200 ? c.content.slice(0, 200) + "…" : c.content,
        })),
      );

      // Stream answer tokens
      for await (const token of streamAnswer(question.trim(), similarChunks)) {
        writeEvent("token", token);
      }

      writeEvent("done", {});
    } catch {
      writeEvent("error", { message: "Answer generation failed" });
    } finally {
      res.end();
    }
  }),
);

export default router;
