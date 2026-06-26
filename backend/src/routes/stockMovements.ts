import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requirePermission } from '../middleware/auth'

export function stockMovementRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/', requirePermission(prisma, 'inventory', 'view'), async (req, res, next) => {
    try {
      const { productId, locationId, type, start, end, limit, offset } = req.query
      const where: any = {}

      if (productId) where.productId = Number(productId)
      if (locationId) where.locationId = Number(locationId)
      if (type) where.type = type
      if (start || end) {
        where.createdAt = {}
        if (start) where.createdAt.gte = new Date(start as string)
        if (end) where.createdAt.lte = new Date(end as string)
      }

      const [movements, total] = await Promise.all([
        prisma.stockMovement.findMany({
          where,
          include: {
            product: { select: { id: true, name: true, code: true } },
            location: { select: { id: true, name: true, code: true } },
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: Number(limit) || 50,
          skip: Number(offset) || 0,
        }),
        prisma.stockMovement.count({ where }),
      ])

      res.json({ movements, total })
    } catch (e) { next(e) }
  })

  router.get('/product/:productId', requirePermission(prisma, 'inventory', 'view'), async (req, res, next) => {
    try {
      const movements = await prisma.stockMovement.findMany({
        where: { productId: Number(req.params.productId) },
        include: {
          location: { select: { id: true, name: true, code: true } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
      res.json(movements)
    } catch (e) { next(e) }
  })

  router.get('/summary', requirePermission(prisma, 'inventory', 'view'), async (_req, res, next) => {
    try {
      const movements = await prisma.stockMovement.groupBy({
        by: ['type'],
        _sum: { quantity: true },
        _count: { type: true },
      })
      res.json(movements)
    } catch (e) { next(e) }
  })

  return router
}
