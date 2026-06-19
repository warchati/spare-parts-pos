import { Request, Response, NextFunction } from 'express'

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error(err)
  const message = err.message || 'Internal server error'
  const status = message.includes('Insufficient') ? 400
    : message.includes('not found') ? 404
    : message.includes('Already') ? 400
    : message.includes('Unique constraint') ? 409
    : 500

  res.status(status).json({ error: message })
}
