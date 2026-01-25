import type { NextFunction, Request, Response } from "express";
import { unauthorized } from "../lib/errors";
import { verifyToken } from "../lib/jwt";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(unauthorized("Missing or malformed Authorization header"));
  }

  const token = header.slice("Bearer ".length).trim();
  const payload = verifyToken(token);

  req.userId = payload.sub;
  req.userEmail = payload.email;
  next();
}
