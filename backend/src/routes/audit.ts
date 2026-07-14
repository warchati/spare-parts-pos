import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requirePermission } from '../middleware/auth'

export function auditRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/', requirePermission(prisma, 'cashRegister', 'movements'), async (req, res, next) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1)
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50))
      const skip = (page - 1) * limit

      const where: any = {}
      if (req.query.entity) where.entity = String(req.query.entity)
      if (req.query.action) where.action = String(req.query.action)
      if (req.query.userId) where.userId = Number(req.query.userId)
      if (req.query.from || req.query.to) {
        where.createdAt = {}
        if (req.query.from) where.createdAt.gte = new Date(String(req.query.from))
        if (req.query.to) {
          const to = new Date(String(req.query.to))
          to.setHours(23, 59, 59, 999)
          where.createdAt.lte = to
        }
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          include: { user: { select: { id: true, name: true, username: true } } },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.auditLog.count({ where }),
      ])

      res.json({ logs, total, page, totalPages: Math.ceil(total / limit) })
    } catch (e) { next(e) }
  })

  return router
}
