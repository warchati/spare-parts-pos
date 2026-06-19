import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

export function purchaseRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/', async (req, res, next) => {
    try {
      const { start, end, supplierId, status } = req.query
      const where: any = {}

      if (start || end) {
        where.createdAt = {}
        if (start) where.createdAt.gte = new Date(start as string)
        if (end) where.createdAt.lte = new Date(end as string)
      }
      if (supplierId) where.supplierId = Number(supplierId)
      if (status) where.status = status

      const purchases = await prisma.purchaseOrder.findMany({
        where,
        include: { items: true, supplier: true, user: true },
        orderBy: { createdAt: 'desc' },
      })
      res.json(purchases)
    } catch (e) { next(e) }
  })

  router.get('/:id', async (req, res, next) => {
    try {
      const purchase = await prisma.purchaseOrder.findUnique({
        where: { id: Number(req.params.id) },
        include: { items: true, supplier: true, user: true },
      })
      if (!purchase) return res.status(404).json({ error: 'Purchase not found' })
      res.json(purchase)
    } catch (e) { next(e) }
  })

  router.post('/', async (req, res, next) => {
    try {
      const { items, supplierId, userId } = req.body
      const result = await prisma.$transaction(async (tx) => {
        let subtotal = 0
        const purchaseItems = []

        for (const item of items) {
          const product = await tx.product.findUniqueOrThrow({
            where: { id: item.productId },
          })
          const totalCost = item.unitCost * item.quantity
          subtotal += totalCost
          purchaseItems.push({
            productId: product.id,
            productName: product.name,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost,
          })
        }

        const total = subtotal

        const purchase = await tx.purchaseOrder.create({
          data: {
            supplierId,
            userId,
            subtotal,
            total,
            items: { create: purchaseItems },
          },
          include: { items: true, supplier: true },
        })

        return purchase
      })

      res.status(201).json(result)
    } catch (e) { next(e) }
  })

  router.patch('/:id/receive', async (req, res, next) => {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const purchase = await tx.purchaseOrder.findUnique({
          where: { id: Number(req.params.id) },
          include: { items: true },
        })

        if (!purchase) throw new Error('Purchase not found')
        if (purchase.status === 'received') throw new Error('Already received')

        for (const item of purchase.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          })
        }

        return tx.purchaseOrder.update({
          where: { id: Number(req.params.id) },
          data: { status: 'received', receivedAt: new Date() },
          include: { items: true, supplier: true },
        })
      })

      res.json(result)
    } catch (e) { next(e) }
  })

  return router
}
