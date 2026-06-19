import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

export function clientRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/', async (req, res, next) => {
    try {
      const { q } = req.query
      const where: any = {}

      if (q) {
        where.OR = [
          { name: { contains: q as string } },
          { phone: { contains: q as string } },
          { document: { contains: q as string } },
          { vehicle: { contains: q as string } },
        ]
      }

      const clients = await prisma.client.findMany({
        where,
        orderBy: { name: 'asc' },
      })
      res.json(clients)
    } catch (e) { next(e) }
  })

  router.get('/:id', async (req, res, next) => {
    try {
      const client = await prisma.client.findUnique({
        where: { id: Number(req.params.id) },
        include: { sales: { take: 20, orderBy: { createdAt: 'desc' } } },
      })
      if (!client) return res.status(404).json({ error: 'Client not found' })
      res.json(client)
    } catch (e) { next(e) }
  })

  router.post('/', async (req, res, next) => {
    try {
      const client = await prisma.client.create({ data: req.body })
      res.status(201).json(client)
    } catch (e) { next(e) }
  })

  router.put('/:id', async (req, res, next) => {
    try {
      const client = await prisma.client.update({
        where: { id: Number(req.params.id) },
        data: req.body,
      })
      res.json(client)
    } catch (e) { next(e) }
  })

  return router
}
