import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requirePermission, AuthRequest } from '../middleware/auth'

export function loyaltyRoutes(prisma: PrismaClient) {
  const router = Router()

  const getConfig = async () => {
    const configs = await prisma.loyaltyConfig.findMany()
    const map: Record<string, string> = {}
    for (const c of configs) map[c.key] = c.value
    return {
      earnRate: Number(map.EARN_RATE || '10'),
      redeemRate: Number(map.REDEEM_RATE || '0.05'),
      expireMonths: Number(map.EXPIRE_MONTHS || '12'),
    }
  }

  router.get('/config', requirePermission(prisma, 'loyalty', 'view'), async (_req, res, next) => {
    try {
      const config = await getConfig()
      res.json(config)
    } catch (e) { next(e) }
  })

  router.put('/config', requirePermission(prisma, 'loyalty', 'edit'), async (req, res, next) => {
    try {
      const { key, value } = req.body
      const allowed = ['EARN_RATE', 'REDEEM_RATE', 'EXPIRE_MONTHS']
      if (!allowed.includes(key)) {
        return res.status(400).json({ error: `Invalid config key. Allowed: ${allowed.join(', ')}` })
      }
      const num = Number(value)
      if (isNaN(num) || num <= 0) {
        return res.status(400).json({ error: 'Value must be a positive number' })
      }
      await prisma.loyaltyConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
      const config = await getConfig()
      res.json(config)
    } catch (e) { next(e) }
  })

  router.get('/clients', requirePermission(prisma, 'loyalty', 'view'), async (req, res, next) => {
    try {
      const { q, sortBy, order } = req.query
      const where: any = {}
      if (q) {
        where.OR = [
          { name: { contains: q as string, mode: 'insensitive' } },
          { phone: { contains: q as string, mode: 'insensitive' } },
          { document: { contains: q as string, mode: 'insensitive' } },
        ]
      }
      const orderBy: any = {}
      if (sortBy === 'points') {
        orderBy.pointsBalance = order === 'asc' ? 'asc' : 'desc'
      } else {
        orderBy.name = 'asc'
      }

      const clients = await prisma.client.findMany({
        where,
        orderBy,
        select: {
          id: true,
          name: true,
          phone: true,
          pointsBalance: true,
          _count: { select: { loyaltyTransactions: true } },
        },
      })
      res.json(clients)
    } catch (e) { next(e) }
  })

  router.get('/clients/:id', requirePermission(prisma, 'loyalty', 'view'), async (req, res, next) => {
    try {
      const client = await prisma.client.findUnique({
        where: { id: Number(req.params.id) },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          pointsBalance: true,
          loyaltyTransactions: {
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: { createdBy: { select: { id: true, name: true } } },
          },
        },
      })
      if (!client) return res.status(404).json({ error: 'Client not found' })
      res.json(client)
    } catch (e) { next(e) }
  })

  router.get('/transactions', requirePermission(prisma, 'loyalty', 'view'), async (req, res, next) => {
    try {
      const { clientId, type, start, end, limit } = req.query
      const where: any = {}
      if (clientId) where.clientId = Number(clientId)
      if (type) where.type = type
      if (start || end) {
        where.createdAt = {}
        if (start) where.createdAt.gte = new Date(start as string)
        if (end) where.createdAt.lte = new Date(end as string)
      }

      const transactions = await prisma.loyaltyTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit) || 100,
        include: {
          client: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      })
      res.json(transactions)
    } catch (e) { next(e) }
  })

  router.post('/calculate', requirePermission(prisma, 'loyalty', 'redeem'), async (req, res, next) => {
    try {
      const { clientId, points } = req.body
      if (!clientId || typeof points !== 'number' || points <= 0) {
        return res.status(400).json({ error: 'clientId and points are required' })
      }

      const config = await getConfig()
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { id: true, pointsBalance: true },
      })
      if (!client) return res.status(404).json({ error: 'Client not found' })
      if (points > client.pointsBalance) {
        return res.status(400).json({ error: `Client only has ${client.pointsBalance} points` })
      }

      const discount = Math.round(points * config.redeemRate * 100) / 100
      res.json({
        clientId: client.id,
        pointsBalance: client.pointsBalance,
        pointsToRedeem: points,
        discount,
        remainingPoints: client.pointsBalance - points,
      })
    } catch (e) { next(e) }
  })

  return router
}
