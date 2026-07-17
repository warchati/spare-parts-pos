import { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error(err)

  let status = 500
  let message = 'Internal server error'

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') { status = 404; message = 'Recurso no encontrado' }
    else if (err.code === 'P2002') { status = 409; message = 'Violación de restricción única' }
    else { status = 500; message = 'Error de base de datos' }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    status = 400; message = 'Datos inválidos'
  } else if ((err as any).status) {
    status = (err as any).status
    message = err.message
  } else if (process.env.NODE_ENV === 'production') {
    status = 500
    message = 'Internal server error'
  } else {
    message = err.message || 'Internal server error'
  }

  res.status(status).json({ error: message })
}
