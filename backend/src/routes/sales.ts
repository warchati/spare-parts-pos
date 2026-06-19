import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

export function saleRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/', async (req, res, next) => {
    try {
      const { start, end, clientId, status } = req.query
      const where: any = {}

      if (start || end) {
        where.createdAt = {}
        if (start) where.createdAt.gte = new Date(start as string)
        if (end) where.createdAt.lte = new Date(end as string)
      }
      if (clientId) where.clientId = Number(clientId)
      if (status) where.status = status

      const sales = await prisma.sale.findMany({
        where,
        include: { items: true, client: true, user: true },
        orderBy: { createdAt: 'desc' },
      })
      res.json(sales)
    } catch (e) { next(e) }
  })

  router.get('/:id', async (req, res, next) => {
    try {
      const sale = await prisma.sale.findUnique({
        where: { id: Number(req.params.id) },
        include: { items: true, client: true, user: true },
      })
      if (!sale) return res.status(404).json({ error: 'Sale not found' })
      res.json(sale)
    } catch (e) { next(e) }
  })

  router.post('/', async (req, res, next) => {
    try {
      const { items, clientId, userId, discount, paymentMethod, paymentDetails } = req.body

      const result = await prisma.$transaction(async (tx) => {
        let subtotal = 0
        const saleItems = []

        for (const item of items) {
          const product = await tx.product.findUniqueOrThrow({
            where: { id: item.productId },
          })

          if (product.stock < item.quantity) {
            throw new Error(`Insufficient stock for ${product.name}`)
          }

          const totalPrice = product.sellPrice * item.quantity
          subtotal += totalPrice

          saleItems.push({
            productId: product.id,
            productName: product.name,
            quantity: item.quantity,
            unitPrice: product.sellPrice,
            totalPrice,
          })

          await tx.product.update({
            where: { id: product.id },
            data: { stock: { decrement: item.quantity } },
          })
        }

        const tax = 0
        const total = subtotal - (discount || 0) + tax

        const sale = await tx.sale.create({
          data: {
            clientId: clientId || null,
            userId,
            subtotal,
            discount: discount || 0,
            tax,
            total,
            paymentMethod: paymentMethod || 'cash',
            paymentDetails: paymentDetails || '',
            items: { create: saleItems },
          },
          include: { items: true, client: true },
        })

        return sale
      })

      res.status(201).json(result)
    } catch (e) { next(e) }
  })

  router.patch('/:id/status', async (req, res, next) => {
    try {
      const { status } = req.body
      const sale = await prisma.sale.update({
        where: { id: Number(req.params.id) },
        data: { status },
      })
      res.json(sale)
    } catch (e) { next(e) }
  })

  router.get('/report/daily', async (req, res, next) => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const sales = await prisma.sale.findMany({
        where: {
          createdAt: { gte: today, lt: tomorrow },
          status: 'completed',
        },
        include: { items: true },
      })

      const summary = {
        totalSales: sales.length,
        totalRevenue: sales.reduce((sum, s) => sum + s.total, 0),
        totalItems: sales.reduce((sum, s) => sum + s.items.reduce((i, item) => i + item.quantity, 0), 0),
        byPaymentMethod: {} as Record<string, number>,
      }

      for (const sale of sales) {
        summary.byPaymentMethod[sale.paymentMethod] = (summary.byPaymentMethod[sale.paymentMethod] || 0) + sale.total
      }

      res.json(summary)
    } catch (e) { next(e) }
  })

  return router
}
