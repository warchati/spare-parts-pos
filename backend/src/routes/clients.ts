import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requirePermission } from '../middleware/auth'

export function clientRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/', async (req, res, next) => {
    try {
      const { q } = req.query
      const where: any = {}

      if (q) {
        where.OR = [
          { name: { contains: q as string, mode: 'insensitive' } },
          { phone: { contains: q as string, mode: 'insensitive' } },
          { document: { contains: q as string, mode: 'insensitive' } },
          { vehicle: { contains: q as string, mode: 'insensitive' } },
        ]
      }

      const clients = await prisma.client.findMany({
        where,
        orderBy: { name: 'asc' },
        include: { _count: { select: { sales: true } } },
      })
      res.json(clients)
    } catch (e) { next(e) }
  })

  router.get('/credit/summary', async (req, res, next) => {
    try {
      const clients = await prisma.client.findMany({
        where: {
          OR: [
            { creditLimit: { gt: 0 } },
            { currentBalance: { gt: 0 } },
          ],
        },
        orderBy: { currentBalance: 'desc' },
      })
      res.json(clients)
    } catch (e) { next(e) }
  })

  router.get('/:id', async (req, res, next) => {
    try {
      const client = await prisma.client.findUnique({
        where: { id: Number(req.params.id) },
        include: {
          sales: { take: 20, orderBy: { createdAt: 'desc' } },
          creditPayments: { orderBy: { createdAt: 'desc' } },
        },
      })
      if (!client) return res.status(404).json({ error: 'Client not found' })
      res.json(client)
    } catch (e) { next(e) }
  })

  router.post('/', requirePermission(prisma, 'clients', 'create'), async (req, res, next) => {
    try {
      const { name, phone, email, document, address, vehicle, creditLimit } = req.body
      if (!name) return res.status(400).json({ error: 'Name is required' })
      const client = await prisma.client.create({
        data: { name, phone, email, document, address, vehicle, creditLimit: creditLimit || 0 },
      })
      res.status(201).json(client)
    } catch (e) { next(e) }
  })

  router.put('/:id', requirePermission(prisma, 'clients', 'edit'), async (req, res, next) => {
    try {
      const { name, phone, email, document, address, vehicle, creditLimit } = req.body
      const data: any = {}
      if (name !== undefined) data.name = name
      if (phone !== undefined) data.phone = phone
      if (email !== undefined) data.email = email
      if (document !== undefined) data.document = document
      if (address !== undefined) data.address = address
      if (vehicle !== undefined) data.vehicle = vehicle
      if (creditLimit !== undefined) data.creditLimit = creditLimit
      const client = await prisma.client.update({
        where: { id: Number(req.params.id) },
        data,
      })
      res.json(client)
    } catch (e) { next(e) }
  })

  return router
}
