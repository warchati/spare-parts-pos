import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requirePermission, AuthRequest } from '../middleware/auth'

export function saleRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/', requirePermission(prisma, 'sales', 'view'), async (req, res, next) => {
    try {
      const { start, end, clientId, status } = req.query
      const where: any = {}

      if (start || end) {
        where.createdAt = {}
        if (start) {
          const d = new Date(start as string)
          if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid start date' })
          where.createdAt.gte = d
        }
        if (end) {
          const d = new Date(end as string)
          if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid end date' })
          where.createdAt.lte = d
        }
      }
      if (clientId) where.clientId = Number(clientId)
      if (status) where.status = status

      const sales = await prisma.sale.findMany({
        where,
        include: { items: true, client: true, user: true, creditPayments: true, returns: { include: { items: true } }, currency: true },
        orderBy: { createdAt: 'desc' },
      })
      res.json(sales)
    } catch (e) { next(e) }
  })

  router.get('/report/monthly', requirePermission(prisma, 'sales', 'view'), async (req, res, next) => {
    try {
      const year = new Date().getFullYear()
      const monthlyData = []
      for (let month = 0; month < 12; month++) {
        const start = new Date(year, month, 1)
        const end = new Date(year, month + 1, 1)
        const result = await prisma.sale.aggregate({
          where: { createdAt: { gte: start, lt: end }, status: 'completed' },
          _sum: { total: true },
          _count: true,
        })
        monthlyData.push({
          month: start.toLocaleString('es', { month: 'long' }),
          revenue: result._sum.total || 0,
          count: result._count,
        })
      }
      res.json(monthlyData)
    } catch (e) { next(e) }
  })

  router.get('/report/daily', requirePermission(prisma, 'sales', 'view'), async (req, res, next) => {
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

  router.get('/:id', requirePermission(prisma, 'sales', 'view'), async (req, res, next) => {
    try {
      const sale = await prisma.sale.findUnique({
        where: { id: Number(req.params.id) },
        include: { items: true, client: true, user: true, creditPayments: true, returns: { include: { items: true } }, currency: true },
      })
      if (!sale) return res.status(404).json({ error: 'Sale not found' })
      res.json(sale)
    } catch (e) { next(e) }
  })

  router.post('/', requirePermission(prisma, 'pos', 'sell'), async (req: AuthRequest, res, next) => {
    try {
      const { items, clientId, discount, paymentMethod, paymentDetails, cashRegisterId, currencyId } = req.body
      const userId = req.user!.id

      const result = await prisma.$transaction(async (tx) => {
        let subtotal = 0
        let taxTotal = 0
        const saleItems = []

        for (const item of items) {
          const product = await tx.product.findUniqueOrThrow({
            where: { id: item.productId },
            include: { tax: true },
          })

          // Atomic stock check + decrement using conditional update
          const updated = await tx.product.updateMany({
            where: { id: product.id, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          })
          if (updated.count === 0) {
            throw new Error(`Insufficient stock for ${product.name}`)
          }

          const totalPrice = product.sellPrice * item.quantity
          subtotal += totalPrice

          if (product.tax) {
            taxTotal += totalPrice * product.tax.percentage / 100
          }

          saleItems.push({
            productId: product.id,
            productName: product.name,
            quantity: item.quantity,
            unitPrice: product.sellPrice,
            totalPrice,
          })
        }

        if (taxTotal === 0) {
          const defaultTax = await tx.tax.findFirst({ where: { isDefault: true, isActive: true } })
          if (defaultTax) {
            taxTotal = subtotal * defaultTax.percentage / 100
          }
        }

        const total = subtotal - (discount || 0) + taxTotal

        let resolvedCurrencyId = currencyId || null
        if (!resolvedCurrencyId) {
          const baseCurrency = await tx.currency.findFirst({ where: { isBase: true, isActive: true } })
          if (baseCurrency) resolvedCurrencyId = baseCurrency.id
        }

        // Credit limit check before creating sale
        if (paymentMethod === 'credit' && clientId) {
          const client = await tx.client.findUnique({ where: { id: clientId } })
          if (client && (client.currentBalance + total) > (client.creditLimit || 0)) {
            throw new Error('Credit limit exceeded')
          }
        }

        // Generate invoice number using atomic sequence
        const lastSale = await tx.sale.findFirst({
          where: { invoiceNumber: { startsWith: `INV-${new Date().getFullYear()}-` } },
          orderBy: { id: 'desc' },
        })
        const year = new Date().getFullYear()
        let seq = 1
        if (lastSale?.invoiceNumber) {
          const parts = lastSale.invoiceNumber.split('-')
          seq = Number(parts[parts.length - 1]) + 1
        }
        const invoiceNumber = `INV-${year}-${String(seq).padStart(4, '0')}`

        if (paymentMethod === 'credit' && clientId) {
          await tx.client.update({
            where: { id: clientId },
            data: { currentBalance: { increment: total } },
          })
        }

        const sale = await tx.sale.create({
          data: {
            clientId: clientId || null,
            userId,
            cashRegisterId: cashRegisterId || null,
            currencyId: resolvedCurrencyId,
            invoiceNumber,
            subtotal,
            discount: discount || 0,
            taxTotal,
            total,
            paymentMethod: paymentMethod || 'cash',
            paymentDetails: paymentDetails || '',
            items: { create: saleItems },
          },
          include: { items: true, client: true, creditPayments: true, currency: true },
        })

        return sale
      })

      res.status(201).json(result)
    } catch (e) { next(e) }
  })

  router.patch('/:id/status', requirePermission(prisma, 'sales', 'edit'), async (req, res, next) => {
    try {
      const { status } = req.body
      const sale = await prisma.sale.update({
        where: { id: Number(req.params.id) },
        data: { status },
      })
      res.json(sale)
    } catch (e) { next(e) }
  })

  router.patch('/:id/cancel', requirePermission(prisma, 'sales', 'edit'), async (req, res, next) => {
    try {
      const { cancelReason } = req.body
      const sale = await prisma.sale.findUnique({
        where: { id: Number(req.params.id) },
        include: { items: true },
      })
      if (!sale) return res.status(404).json({ error: 'Sale not found' })
      if (sale.status !== 'completed') return res.status(400).json({ error: 'Sale is not completed' })

      const result = await prisma.$transaction(async (tx) => {
        for (const item of sale.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          })
        }

        if (sale.paymentMethod === 'credit' && sale.clientId) {
          await tx.client.update({
            where: { id: sale.clientId },
            data: { currentBalance: { decrement: sale.total } },
          })
        }

        const updated = await tx.sale.update({
          where: { id: sale.id },
          data: {
            status: 'cancelled',
            cancelledAt: new Date(),
            cancelReason: cancelReason || '',
          },
          include: { items: true, client: true, creditPayments: true, returns: { include: { items: true } } },
        })
        return updated
      })

      res.json(result)
    } catch (e) { next(e) }
  })

  router.post('/:id/returns', requirePermission(prisma, 'sales', 'edit'), async (req, res, next) => {
    try {
      const { items: returnItems, reason } = req.body
      const sale = await prisma.sale.findUnique({
        where: { id: Number(req.params.id) },
        include: { items: true },
      })
      if (!sale) return res.status(404).json({ error: 'Sale not found' })
      if (sale.status !== 'completed') return res.status(400).json({ error: 'Sale is not completed' })

      const result = await prisma.$transaction(async (tx) => {
        const saleReturnItems = []

        for (const ri of returnItems) {
          const saleItem = sale.items.find(i => i.productId === ri.productId)
          if (!saleItem) throw new Error(`Product ${ri.productId} not found in sale`)

          await tx.product.update({
            where: { id: ri.productId },
            data: { stock: { increment: ri.quantity } },
          })

          saleReturnItems.push({
            productId: ri.productId,
            productName: saleItem.productName,
            quantity: ri.quantity,
            unitPrice: saleItem.unitPrice,
            subtotal: saleItem.unitPrice * ri.quantity,
          })
        }

        const returnSubtotal = saleReturnItems.reduce((s, i) => s + i.subtotal, 0)

        if (sale.paymentMethod === 'credit' && sale.clientId) {
          await tx.client.update({
            where: { id: sale.clientId },
            data: { currentBalance: { decrement: returnSubtotal } },
          })
        }

        const saleReturn = await tx.saleReturn.create({
          data: {
            saleId: sale.id,
            reason: reason || '',
            items: { create: saleReturnItems },
          },
          include: { items: true },
        })
        return saleReturn
      })

      res.status(201).json(result)
    } catch (e) { next(e) }
  })

  return router
}
