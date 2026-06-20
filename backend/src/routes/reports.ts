import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requirePermission } from '../middleware/auth'

export function reportRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/', requirePermission(prisma, 'dashboard', 'view'), async (req, res, next) => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const [todaySales, lowStock, recentSales, activeRegister] = await Promise.all([
        prisma.sale.findMany({
          where: { createdAt: { gte: today, lt: tomorrow }, status: 'completed' },
          include: { items: true },
        }),
        prisma.product.findMany({
          where: { active: true },
          orderBy: { stock: 'asc' },
          take: 50,
        }).then(products => products.filter(p => p.stock <= p.minStock)),
        prisma.sale.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { items: true, client: true, user: true },
        }),
        prisma.cashRegister.findFirst({ where: { status: 'open' }, include: { user: true } }),
      ])

      const topProducts: { productId: number; productName: string; totalQuantity: number }[] = []
      const productMap = new Map<number, { productName: string; totalQuantity: number }>()

      for (const sale of todaySales) {
        for (const item of sale.items) {
          const existing = productMap.get(item.productId)
          if (existing) {
            existing.totalQuantity += item.quantity
          } else {
            productMap.set(item.productId, { productName: item.productName, totalQuantity: item.quantity })
          }
        }
      }

      const sorted = Array.from(productMap.entries())
        .sort((a, b) => b[1].totalQuantity - a[1].totalQuantity)
        .slice(0, 10)
        .map(([productId, data]) => ({ productId, ...data }))

      const byPaymentMethod: Record<string, number> = {}
      for (const sale of todaySales) {
        byPaymentMethod[sale.paymentMethod] = (byPaymentMethod[sale.paymentMethod] || 0) + sale.total
      }

      res.json({
        today: {
          salesCount: todaySales.length,
          revenue: todaySales.reduce((sum, s) => sum + s.total, 0),
          itemsSold: todaySales.reduce((sum, s) => sum + s.items.reduce((i, item) => i + item.quantity, 0), 0),
          byPaymentMethod,
        },
        topProducts: sorted,
        lowStock,
        recentSales,
        activeRegister,
      })
    } catch (e) { next(e) }
  })

  router.get('/sales', requirePermission(prisma, 'dashboard', 'view'), async (req, res, next) => {
    try {
      const { start, end } = req.query
      const where: any = { status: 'completed' }

      if (start || end) {
        where.createdAt = {}
        if (start) where.createdAt.gte = new Date(start as string)
        if (end) where.createdAt.lte = new Date(end as string)
      }

      const sales = await prisma.sale.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'asc' },
      })

      const grouped: Record<string, { count: number; revenue: number; items: number }> = {}
      for (const sale of sales) {
        const day = sale.createdAt.toISOString().slice(0, 10)
        if (!grouped[day]) grouped[day] = { count: 0, revenue: 0, items: 0 }
        grouped[day].count++
        grouped[day].revenue += sale.total
        grouped[day].items += sale.items.reduce((i, item) => i + item.quantity, 0)
      }

      res.json(Object.entries(grouped).map(([date, data]) => ({ date, ...data })))
    } catch (e) { next(e) }
  })

  router.get('/products', requirePermission(prisma, 'dashboard', 'view'), async (req, res, next) => {
    try {
      const [total, active, outOfStock, byCategory] = await Promise.all([
        prisma.product.count(),
        prisma.product.count({ where: { active: true } }),
        prisma.product.count({ where: { active: true, stock: 0 } }),
        prisma.product.groupBy({
          by: ['category'],
          _count: { id: true },
          where: { category: { not: '' } },
          orderBy: { category: 'asc' },
        }),
      ])

      res.json({
        totalProducts: total,
        activeProducts: active,
        outOfStock,
        byCategory: byCategory.map(c => ({ category: c.category, count: c._count.id })),
      })
    } catch (e) { next(e) }
  })

  router.get('/credits', requirePermission(prisma, 'dashboard', 'view'), async (req, res, next) => {
    try {
      const clients = await prisma.client.findMany({
        where: { currentBalance: { gt: 0 } },
        orderBy: { currentBalance: 'desc' },
      })

      const totalOutstanding = clients.reduce((sum, c) => sum + c.currentBalance, 0)

      res.json({
        totalOutstanding,
        clients: clients.map(c => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          creditLimit: c.creditLimit,
          currentBalance: c.currentBalance,
        })),
      })
    } catch (e) { next(e) }
  })

  router.get('/tax-summary', requirePermission(prisma, 'dashboard', 'view'), async (req, res, next) => {
    try {
      const { startDate, endDate } = req.query
      const where: any = { status: 'completed' }

      if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) where.createdAt.gte = new Date(startDate as string)
        if (endDate) {
          const end = new Date(endDate as string)
          end.setHours(23, 59, 59, 999)
          where.createdAt.lte = end
        }
      }

      const sales = await prisma.sale.findMany({
        where,
        include: { items: { include: { product: { select: { buyPrice: true } } } } },
        orderBy: { createdAt: 'desc' },
      })

      let totalRevenue = 0
      let totalCost = 0
      let totalTax = 0
      let totalItems = 0
      const byPaymentMethod: Record<string, number> = {}

      for (const sale of sales) {
        totalRevenue += sale.total
        totalTax += sale.taxTotal || 0

        for (const item of sale.items) {
          totalItems += item.quantity
          const buyPrice = item.product?.buyPrice || 0
          totalCost += buyPrice * item.quantity
        }

        byPaymentMethod[sale.paymentMethod] = (byPaymentMethod[sale.paymentMethod] || 0) + sale.total
      }

      const grossProfit = totalRevenue - totalCost

      res.json({
        period: {
          start: startDate || null,
          end: endDate || null,
        },
        summary: {
          salesCount: sales.length,
          itemsSold: totalItems,
          totalRevenue,
          totalCost,
          grossProfit,
          totalTax,
          profitMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
        },
        byPaymentMethod: Object.entries(byPaymentMethod).map(([method, total]) => ({ method, total })),
      })
    } catch (e) { next(e) }
  })

  return router
}
