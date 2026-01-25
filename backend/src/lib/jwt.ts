import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { unauthorized } from "./errors";

export interface JwtPayload {
  sub: string; // user id
  email: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export function verifyToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded === "string") throw new Error("Unexpected token format");
    return { sub: String(decoded.sub), email: String(decoded.email) };
  } catch {
    throw unauthorized("Invalid or expired token");
  }
}
