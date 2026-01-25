import type { Request, Response, NextFunction, RequestHandler } from 'express'

// Wraps an async route handler so thrown errors / rejected promises
// are forwarded to Express's error middleware instead of crashing.
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next)
  }
