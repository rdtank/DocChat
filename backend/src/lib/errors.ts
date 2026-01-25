// Lightweight HTTP error so services can throw with a status code,
// and the central error handler maps it to a clean JSON response.
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export const badRequest = (msg: string) => new HttpError(400, msg)
export const unauthorized = (msg = 'Unauthorized') => new HttpError(401, msg)
export const conflict = (msg: string) => new HttpError(409, msg)
export const notFound = (msg = 'Not found') => new HttpError(404, msg)
