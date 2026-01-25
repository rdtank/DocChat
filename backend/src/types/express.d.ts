// Augment Express's Request with the authenticated user set by requireAuth.
declare global {
  namespace Express {
    interface Request {
      userId?: string
      userEmail?: string
    }
  }
}

export {}
