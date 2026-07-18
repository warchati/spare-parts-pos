import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '../middleware/auth'

export function systemRoutes(prisma: PrismaClient) {
  const router = Router()

  const requireAdmin = async (req: any, res: any, next: any) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores' })
    }
    next()
  }

  router.get('/status', requireAuth(prisma), requireAdmin, async (req, res, next) => {
    try {
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
          metadata: true,
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

  router.get('/config', requireAuth(prisma), requireAdmin, async (_req, res, next) => {
    try {
      const configs = await prisma.systemConfig.findMany()
      const result: Record<string, string> = {}
      configs.forEach(c => { result[c.key] = c.value })
      res.json(result)
    } catch (e) { next(e) }
  })

  router.put('/config', requireAuth(prisma), requireAdmin, async (req, res, next) => {
    try {
      const { key, value } = req.body
      if (!key || typeof value !== 'string') {
        return res.status(400).json({ error: 'key y value son requeridos' })
      }
      await prisma.systemConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
      res.json({ success: true })
    } catch (e) { next(e) }
  })

  return router
}
