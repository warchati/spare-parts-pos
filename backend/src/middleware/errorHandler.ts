import { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error(err)

  let status = 500
  let message = 'Internal server error'

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') { status = 404; message = 'Resource not found' }
    else if (err.code === 'P2002') { status = 409; message = 'Unique constraint violation' }
    else { status = 500; message = 'Database error' }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    status = 400; message = 'Invalid data provided'
  } else if (err.message?.startsWith('Insufficient') || err.message?.startsWith('Already')) {
    status = 400; message = err.message
  }

  res.status(status).json({ error: message })
}
