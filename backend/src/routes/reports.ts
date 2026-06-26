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

      const safe = <T>(p: Promise<T>, fallback: T): Promise<T> => p.catch(() => fallback)

      const [todaySales, allSales, lowStock, recentSales, activeRegister] = await Promise.all([
        safe(
          prisma.sale.findMany({
            where: { createdAt: { gte: today, lt: tomorrow }, status: 'completed' },
            include: { items: true },
          }),
          []
        ),
        safe(
          prisma.sale.findMany({
            where: { status: 'completed' },
            include: { items: true },
            orderBy: { createdAt: 'desc' },
          }),
          []
        ),
        safe(
          prisma.product.findMany({
            where: { active: true },
            orderBy: { stock: 'asc' },
            take: 50,
          }).then(products => products.filter(p => p.stock <= p.minStock)),
          []
        ),
        safe(
          prisma.sale.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: { items: true, client: true, user: true },
          }),
          []
        ),
        safe(
          prisma.cashRegister.findFirst({ where: { status: 'open' }, include: { user: true } }),
          null
        ),
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

      const allTimeMap = new Map<number, { productName: string; totalQuantity: number }>()
      for (const sale of allSales) {
        for (const item of sale.items) {
          const existing = allTimeMap.get(item.productId)
          if (existing) {
            existing.totalQuantity += item.quantity
          } else {
            allTimeMap.set(item.productId, { productName: item.productName, totalQuantity: item.quantity })
          }
        }
      }

      const topAllTime = Array.from(allTimeMap.entries())
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
        topAllTime,
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
        if (startDate) {
          const d = new Date(startDate as string)
          if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid startDate' })
          where.createdAt.gte = d
        }
        if (endDate) {
          const d = new Date(endDate as string)
          if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid endDate' })
          d.setHours(23, 59, 59, 999)
          where.createdAt.lte = d
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
          const costPrice = item.unitCost ?? item.product?.buyPrice ?? 0
          totalCost += costPrice * item.quantity
        }

        byPaymentMethod[sale.paymentMethod] = (byPaymentMethod[sale.paymentMethod] || 0) + sale.total
      }

      const grossProfit = totalRevenue - totalCost

      // Aggregate expenses in the same period
      const expenseWhere: any = {}
      if (startDate || endDate) {
        expenseWhere.createdAt = {}
        if (startDate) expenseWhere.createdAt.gte = new Date(startDate as string)
        if (endDate) {
          const d = new Date(endDate as string)
          d.setHours(23, 59, 59, 999)
          expenseWhere.createdAt.lte = d
        }
      }

      const [totalExpenseResult, expensesByCategory] = await Promise.all([
        prisma.expense.aggregate({ where: expenseWhere, _sum: { amount: true } }),
        prisma.expense.groupBy({
          by: ['category'],
          where: expenseWhere,
          _sum: { amount: true },
          _count: true,
          orderBy: { category: 'asc' },
        }),
      ])

      const totalExpenses = totalExpenseResult._sum.amount || 0
      const netProfit = grossProfit - totalExpenses

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
          totalExpenses,
          netProfit,
          totalTax,
          profitMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
          netMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
        },
        byPaymentMethod: Object.entries(byPaymentMethod).map(([method, total]) => ({ method, total })),
        expensesByCategory: expensesByCategory.map(c => ({
          category: c.category,
          total: c._sum.amount || 0,
          count: c._count,
        })),
      })
    } catch (e) { next(e) }
  })


  return router
}
