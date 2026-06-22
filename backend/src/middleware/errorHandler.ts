import { Request, Response, NextFunction } from 'express'

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error(err)

  const msg = err.message || ''
  const status = msg.includes('Insufficient') ? 400
    : msg.includes('not found') ? 404
    : msg.includes('Already') ? 400
    : msg.includes('Unique constraint') ? 409
    : 500

  const safeMessage = status === 500 ? 'Internal server error' : msg
  res.status(status).json({ error: safeMessage })
}
