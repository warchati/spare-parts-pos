import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requirePermission } from '../middleware/auth'

export function creditRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/', requirePermission(prisma, 'credit', 'view'), async (req, res, next) => {
    try {
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

      const result = await prisma.$transaction(async (tx) => {
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
