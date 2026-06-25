import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requirePermission, AuthRequest } from '../middleware/auth'

export function saleRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/', requirePermission(prisma, 'sales', 'view'), async (req, res, next) => {
    try {
      const { start, end, clientId, status, paymentMethod } = req.query
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
      if (paymentMethod) where.paymentMethod = paymentMethod

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

  router.get('/by-barcode/:barcode', requirePermission(prisma, 'returns', 'view'), async (req, res, next) => {
    try {
      const { barcode } = req.params
      const product = await prisma.product.findFirst({ where: { barcode } })
      if (!product) return res.status(404).json({ error: 'Producto no encontrado con ese código de barras' })

      const sales = await prisma.sale.findMany({
        where: {
          status: 'completed',
          items: { some: { productId: product.id } },
        },
        include: {
          items: { where: { productId: product.id } },
          client: true,
          returns: { include: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })

      res.json({ product, sales })
    } catch (e) { next(e) }
  })

  router.get('/by-invoice/:invoiceNumber', requirePermission(prisma, 'returns', 'view'), async (req, res, next) => {
    try {
      const { invoiceNumber } = req.params
      const sale = await prisma.sale.findFirst({
        where: {
          invoiceNumber,
          status: 'completed',
        },
        include: {
          items: true,
          client: true,
          returns: { include: { items: true } },
        },
      })
      if (!sale) return res.status(404).json({ error: 'Venta no encontrada con ese número de factura' })
      res.json(sale)
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

  const getLoyaltyConfig = async () => {
    const configs = await prisma.loyaltyConfig.findMany()
    const map: Record<string, string> = {}
    for (const c of configs) map[c.key] = c.value
    return {
      earnRate: Number(map.EARN_RATE || '10'),
      redeemRate: Number(map.REDEEM_RATE || '0.05'),
      expireMonths: Number(map.EXPIRE_MONTHS || '12'),
    }
  }

  router.post('/', requirePermission(prisma, 'pos', 'sell'), async (req: AuthRequest, res, next) => {
    try {
      const { items, clientId, discount, paymentMethod, paymentDetails, cashRegisterId, currencyId, pointsToRedeem } = req.body
      const userId = req.user!.id
      const loyaltyConfig = await getLoyaltyConfig()

      const result = await prisma.$transaction(async (tx) => {
        let subtotal = 0
        let taxTotal = 0
        const saleItems = []

        for (const item of items) {
          // Lock the product row to prevent race conditions
          await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${item.productId} FOR UPDATE`

          const product = await tx.product.findUniqueOrThrow({
            where: { id: item.productId },
            include: { tax: true },
          })

          if (product.stock < item.quantity) {
            throw new Error(`Insufficient stock for ${product.name}`)
          }

          await tx.product.update({
            where: { id: product.id },
            data: { stock: { decrement: item.quantity } },
          })

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

        const discountAmount = discount || 0
        const afterDiscount = subtotal - discountAmount

        if (afterDiscount < 0) {
          throw new Error('Discount exceeds subtotal')
        }

        // Recalculate tax on discounted amount (descuento antes de IVA)
        let taxRate = 0
        if (taxTotal > 0 && subtotal > 0) {
          const taxRatio = taxTotal / subtotal
          taxTotal = Math.round(afterDiscount * taxRatio * 100) / 100
          taxRate = Math.round(taxRatio * 10000) / 100
        } else if (taxTotal === 0) {
          const defaultTax = await tx.tax.findFirst({ where: { isDefault: true, isActive: true } })
          if (defaultTax) {
            taxRate = defaultTax.percentage
            taxTotal = afterDiscount * taxRate / 100
          }
        }

        const pointsToRedeemNum = Number(pointsToRedeem) || 0
        let pointsDiscount = 0
        let redeemPoints = 0
        if (pointsToRedeemNum > 0 && clientId) {
          redeemPoints = pointsToRedeemNum
          pointsDiscount = Math.round(redeemPoints * loyaltyConfig.redeemRate * 100) / 100
          const client = await tx.client.findUnique({
            where: { id: clientId },
            select: { pointsBalance: true },
          })
          if (!client || client.pointsBalance < redeemPoints) {
            throw new Error('Insufficient loyalty points')
          }
        }

        const total = afterDiscount + taxTotal - pointsDiscount

        let resolvedCurrencyId = currencyId || null
        if (!resolvedCurrencyId) {
          const baseCurrency = await tx.currency.findFirst({ where: { isBase: true, isActive: true } })
          if (baseCurrency) resolvedCurrencyId = baseCurrency.id
        }

        if (paymentMethod === 'credit' && clientId) {
          const client = await tx.client.findUnique({ where: { id: clientId } })
          if (client && (client.currentBalance + total) > (client.creditLimit || 0)) {
            throw new Error('Credit limit exceeded')
          }
        }

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
            tax: taxRate,
            taxTotal,
            total,
            pointsRedeemed: redeemPoints,
            paymentMethod: paymentMethod || 'cash',
            paymentDetails: paymentDetails || '',
            items: { create: saleItems },
          },
          include: { items: true, client: true, creditPayments: true, currency: true },
        })

        if (clientId) {
          const client = await tx.client.findUnique({
            where: { id: clientId },
            select: { pointsBalance: true },
          })
          const oldBalance = client?.pointsBalance ?? 0
          const pointsEarned = Math.max(0, Math.floor(total / loyaltyConfig.earnRate))
          let runningBalance = oldBalance

          if (pointsEarned > 0) {
            runningBalance += pointsEarned
            const expiresAt = new Date()
            expiresAt.setMonth(expiresAt.getMonth() + loyaltyConfig.expireMonths)
            await tx.loyaltyTransaction.create({
              data: {
                clientId,
                type: 'EARN',
                points: pointsEarned,
                balanceBefore: runningBalance - pointsEarned,
                balanceAfter: runningBalance,
                referenceType: 'SALE',
                referenceId: invoiceNumber,
                description: `Puntos ganados en venta ${invoiceNumber}`,
                createdById: userId,
                expiresAt,
              },
            })
          }

          if (redeemPoints > 0) {
            const redeemBalanceBefore = runningBalance
            runningBalance -= redeemPoints
            await tx.loyaltyTransaction.create({
              data: {
                clientId,
                type: 'REDEEM',
                points: redeemPoints,
                balanceBefore: redeemBalanceBefore,
                balanceAfter: runningBalance,
                referenceType: 'SALE',
                referenceId: invoiceNumber,
                description: `Puntos canjeados: ${pointsDiscount.toFixed(2)} descuento en ${invoiceNumber}`,
                createdById: userId,
              },
            })
          }

          await tx.client.update({
            where: { id: clientId },
            data: { pointsBalance: runningBalance },
          })

          await tx.sale.update({
            where: { id: sale.id },
            data: { pointsEarned },
          })
        }

        return await tx.sale.findUnique({
          where: { id: sale.id },
          include: { items: true, client: true, creditPayments: true, currency: true, user: true },
        })
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

  router.patch('/:id/cancel', requirePermission(prisma, 'sales', 'edit'), async (req: AuthRequest, res, next) => {
    try {
      const { cancelReason } = req.body
      const userId = req.user!.id
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

        // Reverse loyalty points
        if (sale.clientId && (sale.pointsEarned > 0 || sale.pointsRedeemed > 0)) {
          const client = await tx.client.findUnique({
            where: { id: sale.clientId },
            select: { pointsBalance: true },
          })
          const oldBalance = client?.pointsBalance ?? 0
          let runningBalance = oldBalance

          // Reverse earned points: decrement balance
          if (sale.pointsEarned > 0) {
            runningBalance -= sale.pointsEarned
            await tx.loyaltyTransaction.create({
              data: {
                clientId: sale.clientId,
                type: 'REVERSE',
                points: sale.pointsEarned,
                balanceBefore: runningBalance + sale.pointsEarned,
                balanceAfter: runningBalance,
                referenceType: 'CANCELLATION',
                referenceId: sale.invoiceNumber || String(sale.id),
                description: `Reversión de puntos por cancelación de ${sale.invoiceNumber}`,
                createdById: userId,
              },
            })
          }

          // Restore redeemed points: increment balance
          if (sale.pointsRedeemed > 0) {
            runningBalance += sale.pointsRedeemed
            await tx.loyaltyTransaction.create({
              data: {
                clientId: sale.clientId,
                type: 'REVERSE',
                points: sale.pointsRedeemed,
                balanceBefore: runningBalance - sale.pointsRedeemed,
                balanceAfter: runningBalance,
                referenceType: 'CANCELLATION',
                referenceId: sale.invoiceNumber || String(sale.id),
                description: `Restauración de puntos canjeados por cancelación de ${sale.invoiceNumber}`,
                createdById: userId,
              },
            })
          }

          await tx.client.update({
            where: { id: sale.clientId },
            data: { pointsBalance: runningBalance },
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

  router.post('/:id/returns', requirePermission(prisma, 'returns', 'edit'), async (req: AuthRequest, res, next) => {
    try {
      const { items: returnItems, reason } = req.body
      const userId = req.user!.id
      const sale = await prisma.sale.findUnique({
        where: { id: Number(req.params.id) },
        include: { items: true },
      })
      if (!sale) return res.status(404).json({ error: 'Sale not found' })
      if (sale.status !== 'completed') return res.status(400).json({ error: 'Sale is not completed' })

      const loyaltyConfig = await getLoyaltyConfig()
      const result = await prisma.$transaction(async (tx) => {
        const saleReturnItems = []
        let returnSubtotal = 0

        for (const ri of returnItems) {
          const saleItem = sale.items.find(i => i.productId === ri.productId)
          if (!saleItem) throw new Error(`Product ${ri.productId} not found in sale`)
          if (ri.quantity > saleItem.quantity) throw new Error(`Cannot return more than ${saleItem.quantity} of ${saleItem.productName}`)

          await tx.product.update({
            where: { id: ri.productId },
            data: { stock: { increment: ri.quantity } },
          })

          const itemSubtotal = saleItem.unitPrice * ri.quantity
          returnSubtotal += itemSubtotal

          saleReturnItems.push({
            productId: ri.productId,
            productName: saleItem.productName,
            quantity: ri.quantity,
            unitPrice: saleItem.unitPrice,
            subtotal: itemSubtotal,
          })
        }

        const ratio = sale.subtotal > 0 ? returnSubtotal / sale.subtotal : 0

        // Calculate proportional discount
        let discountAllocation = 0
        if (sale.discount > 0 && ratio > 0) {
          discountAllocation = Math.round(sale.discount * ratio * 100) / 100
        }

        // Calculate proportional tax
        let taxAllocation = 0
        if (sale.taxTotal > 0 && ratio > 0) {
          taxAllocation = Math.round(sale.taxTotal * ratio * 100) / 100
        }

        // Calculate proportional points discount and points to restore
        let pointsDiscountAllocation = 0
        let pointsToRestore = 0
        if (sale.clientId && sale.pointsRedeemed > 0 && ratio > 0) {
          pointsToRestore = Math.floor(sale.pointsRedeemed * ratio)
          if (pointsToRestore > 0) {
            pointsDiscountAllocation = Math.round(pointsToRestore * loyaltyConfig.redeemRate * 100) / 100
          }
        }

        const refundTotal = returnSubtotal - discountAllocation + taxAllocation - pointsDiscountAllocation

        if (sale.paymentMethod === 'credit' && sale.clientId) {
          await tx.client.update({
            where: { id: sale.clientId },
            data: { currentBalance: { decrement: refundTotal } },
          })
        }

        // Generate credit note number
        const year = new Date().getFullYear()
        const lastReturn = await tx.saleReturn.findFirst({
          where: { creditNoteNumber: { startsWith: `CN-${year}-` } },
          orderBy: { id: 'desc' },
        })
        let seq = 1
        if (lastReturn?.creditNoteNumber) {
          const parts = lastReturn.creditNoteNumber.split('-')
          seq = Number(parts[parts.length - 1]) + 1
        }
        const creditNoteNumber = `CN-${year}-${String(seq).padStart(4, '0')}`

        // Reverse earned points proportionally
        if (sale.clientId && sale.pointsEarned > 0 && ratio > 0) {
          const pointsToReverse = Math.floor(sale.pointsEarned * ratio)

          if (pointsToReverse > 0) {
            const client = await tx.client.findUnique({
              where: { id: sale.clientId },
              select: { pointsBalance: true },
            })
            const oldBalance = client?.pointsBalance ?? 0
            const newBalance = Math.max(0, oldBalance - pointsToReverse)

            await tx.loyaltyTransaction.create({
              data: {
                clientId: sale.clientId,
                type: 'REVERSE',
                points: pointsToReverse,
                balanceBefore: oldBalance,
                balanceAfter: newBalance,
                referenceType: 'RETURN',
                referenceId: creditNoteNumber,
                description: `Reversión de ${pointsToReverse} puntos ganados por devolución parcial de ${sale.invoiceNumber}`,
                createdById: userId,
              },
            })

            await tx.client.update({
              where: { id: sale.clientId },
              data: { pointsBalance: newBalance },
            })
          }
        }

        // Restore redeemed points proportionally
        if (sale.clientId && pointsToRestore > 0) {
          const client = await tx.client.findUnique({
            where: { id: sale.clientId },
            select: { pointsBalance: true },
          })
          const oldBalance = client?.pointsBalance ?? 0
          const newBalance = oldBalance + pointsToRestore

          await tx.loyaltyTransaction.create({
            data: {
              clientId: sale.clientId,
              type: 'REVERSE',
              points: pointsToRestore,
              balanceBefore: oldBalance,
              balanceAfter: newBalance,
              referenceType: 'RETURN',
              referenceId: creditNoteNumber,
              description: `Restauración de ${pointsToRestore} puntos canjeados por devolución parcial de ${sale.invoiceNumber}`,
              createdById: userId,
            },
          })

          await tx.client.update({
            where: { id: sale.clientId },
            data: { pointsBalance: newBalance },
          })
        }

        const saleReturn = await tx.saleReturn.create({
          data: {
            saleId: sale.id,
            reason: reason || '',
            totalRefund: refundTotal,
            creditNoteNumber,
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
