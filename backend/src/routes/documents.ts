import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import fs from "fs/promises";
import multer from "multer";
import path from "path";
import { asyncHandler } from "../lib/asyncHandler";
import { invalidateDocAnswers } from "../lib/cache";
import { badRequest } from "../lib/errors";
import { ingestionQueue } from "../lib/queue";
import { requireAuth } from "../middleware/requireAuth";
import {
  createDocument,
  deleteDocument,
  getDocumentById,
  listDocuments,
} from "../services/documentService";
import { isAllowedMimeType } from "../validators/documents";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const uploader = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (isAllowedMimeType(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, TXT, and Markdown files are allowed"));
    }
  },
});

// Wraps multer so its errors become 400 HttpErrors instead of 500s
function singleUpload(field: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    uploader.single(field)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return next(
          badRequest(
            err.code === "LIMIT_FILE_SIZE"
              ? "File too large (max 10 MB)"
              : err.message,
          ),
        );
      }
      if (err instanceof Error) return next(badRequest(err.message));
      next();
    });
  };
}

// Strips the internal file path before sending to the client
function toPublic(doc: { filePath?: string; [key: string]: unknown }) {
  const { filePath: _, ...rest } = doc;
  return rest;
}

const router = Router();

router.use(requireAuth);

// POST /documents — upload a new document
router.post(
  "/",
  singleUpload("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest("No file uploaded");

    const title =
      (req.body.title as string | undefined) ||
      path.basename(req.file.originalname, path.extname(req.file.originalname));

    const doc = await createDocument({
      ownerId: req.userId!,
      title,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      filePath: req.file.path,
      status: "processing",
    });

    await ingestionQueue.add("ingest", {
      documentId: doc.id,
      filePath: req.file.path,
      mimeType: req.file.mimetype,
    });

    res.status(201).json({ document: toPublic(doc) });
  }),
);

// GET /documents — list documents owned by current user
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const docs = await listDocuments(req.userId!);
    res.json({ documents: docs });
  }),
);

// GET /documents/:id — get a single document
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const doc = await getDocumentById(req.params.id!, req.userId!);
    res.json({ document: toPublic(doc) });
  }),
);

// DELETE /documents/:id — delete document + file from disk
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const doc = await deleteDocument(req.params.id!, req.userId!);
    await Promise.all([
      fs.unlink(doc.filePath).catch(() => null),
      invalidateDocAnswers(doc.id),
    ]);
    res.json({ message: "Document deleted" });
  }),
);

export default router;
