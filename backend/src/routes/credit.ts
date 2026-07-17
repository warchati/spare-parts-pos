import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requirePermission } from '../middleware/auth'

export function creditRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/', requirePermission(prisma, 'credit', 'view'), async (req, res, next) => {
    try {
      const clientId = req.query.clientId ? Number(req.query.clientId) : undefined
      if (clientId) {
        const [payments, sales] = await Promise.all([
          prisma.creditPayment.findMany({
            where: { clientId },
            include: { sale: { include: { items: true } }, client: true },
            orderBy: { createdAt: 'desc' },
          }),
          prisma.sale.findMany({
            where: { clientId, paymentMethod: 'credit' },
            select: { id: true, total: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
          }),
        ])
        return res.json({ payments, sales })
      }
      const payments = await prisma.creditPayment.findMany({
        include: { sale: { include: { items: true } }, client: true },
        orderBy: { createdAt: 'desc' },
      })
      res.json(payments)
    } catch (e) { next(e) }
  })

  router.get('/clients', requirePermission(prisma, 'credit', 'view'), async (req, res, next) => {
    try {
      const clients = await prisma.client.findMany({
        select: { id: true, name: true, phone: true, creditLimit: true, currentBalance: true },
        orderBy: { name: 'asc' },
      })
      res.json(clients)
    } catch (e) { next(e) }
  })

  router.get('/:id', requirePermission(prisma, 'credit', 'view'), async (req, res, next) => {
    try {
      const payment = await prisma.creditPayment.findUnique({
        where: { id: Number(req.params.id) },
        include: { sale: { include: { items: true } }, client: true },
      })
      if (!payment) return res.status(404).json({ error: 'Credit payment not found' })
      res.json(payment)
    } catch (e) { next(e) }
  })

  router.post('/', requirePermission(prisma, 'credit', 'pay'), async (req, res, next) => {
    try {
      const { saleId, clientId, amount, method, notes } = req.body

      if (!saleId) return res.status(400).json({ error: 'saleId is required' })
      if (!amount || amount <= 0) return res.status(400).json({ error: 'amount must be a positive number' })

      const result = await prisma.$transaction(async (tx) => {
        if (clientId) {
          await tx.$queryRaw`SELECT id FROM "Client" WHERE id = ${clientId} FOR UPDATE`
        }

        const payment = await tx.creditPayment.create({
          data: {
            saleId,
            clientId: clientId || null,
            amount,
            method: method || 'cash',
            notes: notes || '',
          },
        })

        if (clientId) {
          const client = await tx.client.findUnique({
            where: { id: clientId },
            select: { currentBalance: true },
          })
          if (!client) throw new Error('Client not found')
          if (client.currentBalance < amount) {
            throw new Error('Payment amount exceeds client balance')
          }
          await tx.client.update({
            where: { id: clientId },
            data: { currentBalance: { decrement: amount } },
          })
        }

        return payment
      })

      res.status(201).json(result)
    } catch (e) { next(e) }
  })

  return router
}
