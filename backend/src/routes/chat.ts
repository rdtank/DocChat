import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { getCachedAnswer, setCachedAnswer } from "../lib/cache";
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

    const q = question.trim();
    const doc = await getDocumentById(req.params.id!, req.userId!);
    if (doc.status !== "ready") {
      throw badRequest(
        `Document is not ready for chat (status: ${doc.status})`,
      );
    }

    // SSE headers — open before any await so the client can start reading
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const writeEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // Cache hit — replay stored answer without hitting Gemini at all
      const cached = await getCachedAnswer(doc.id, q);
      if (cached) {
        writeEvent("sources", cached.sources);
        writeEvent("token", cached.answer);
        writeEvent("done", {});
        return;
      }

      // Cache miss — full RAG pipeline
      const queryEmbedding = await embedText(q);
      const similarChunks = await findSimilarChunks(queryEmbedding, doc.id);

      if (similarChunks.length === 0) {
        writeEvent("error", {
          message: "No relevant content found in this document",
        });
        return;
      }

      const sources = similarChunks.map((c) => ({
        chunkIndex: c.chunkIndex,
        preview:
          c.content.length > 200 ? c.content.slice(0, 200) + "…" : c.content,
      }));
      writeEvent("sources", sources);

      let fullAnswer = "";
      for await (const token of streamAnswer(q, similarChunks)) {
        writeEvent("token", token);
        fullAnswer += token;
      }

      writeEvent("done", {});

      // Persist to cache after streaming completes
      await setCachedAnswer(doc.id, q, { sources, answer: fullAnswer });
    } catch {
      writeEvent("error", { message: "Answer generation failed" });
    } finally {
      res.end();
    }
  }),
);

export default router;
