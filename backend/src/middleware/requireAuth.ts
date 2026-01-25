import type { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../lib/jwt'
import { unauthorized } from '../lib/errors'

// Protects routes: expects an `Authorization: Bearer <token>` header,
// verifies the JWT, and attaches the user id/email to the request.
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return next(unauthorized('Missing or malformed Authorization header'))
  }

  const token = header.slice('Bearer '.length).trim()
  const payload = verifyToken(token) // throws HttpError(401) if invalid

  req.userId = payload.sub
  req.userEmail = payload.email
  next()
}
