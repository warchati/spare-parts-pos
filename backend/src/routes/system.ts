import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '../middleware/auth'

export function systemRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/status', requireAuth(prisma), async (req, res, next) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Solo administradores' })
      }

      const dbStart = Date.now()
      let dbStatus = 'connected'
      let dbLatency = 0
      try {
        await prisma.$queryRaw`SELECT 1`
        dbLatency = Date.now() - dbStart
      } catch {
        dbStatus = 'disconnected'
        dbLatency = -1
      }

      const [userCount, productCount, saleCount, auditCount] = await Promise.all([
        prisma.user.count(),
        prisma.product.count(),
        prisma.sale.count().catch(() => 0),
        prisma.auditLog.count().catch(() => 0),
      ])

      const recentAudit = await prisma.auditLog.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          entity: true,
          action: true,
          createdAt: true,
          details: true,
        },
      }).catch(() => [])

      const apiBaseUrl = process.env.API_BASE_URL || req.get('origin') || 'unknown'
      const frontendUrl = process.env.FRONTEND_URL || 'unknown'

      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        server: {
          nodeEnv: process.env.NODE_ENV || 'development',
          vercel: !!process.env.VERCEL,
          region: process.env.VERCEL_REGION || 'local',
          apiBaseUrl,
          frontendUrl,
        },
        database: {
          status: dbStatus,
          latencyMs: dbLatency,
        },
        stats: {
          users: userCount,
          products: productCount,
          sales: saleCount,
          auditLogs: auditCount,
        },
        recentAudit,
      })
    } catch (e) { next(e) }
  })

  return router
}
