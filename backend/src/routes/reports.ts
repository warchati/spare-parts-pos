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

      const safe = <T>(p: Promise<T>, fallback: T): Promise<T> => p.catch((err) => {
        console.error('Dashboard query failed:', err?.message || err)
        return fallback
      })

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

      const revenueExcludingTax = totalRevenue - totalTax
      const grossProfit = revenueExcludingTax - totalCost

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

      const [totalExpenseResult, expensesByCategory, deductibleTaxResult] = await Promise.all([
        prisma.expense.aggregate({ where: expenseWhere, _sum: { amount: true } }),
        prisma.expense.groupBy({
          by: ['category'],
          where: expenseWhere,
          _sum: { amount: true, taxAmount: true },
          _count: true,
          orderBy: { category: 'asc' },
        }),
        prisma.expense.aggregate({ where: { ...expenseWhere, taxDeductible: true }, _sum: { taxAmount: true } }),
      ])

      const totalExpenses = totalExpenseResult._sum.amount || 0
      const tvaDeducible = deductibleTaxResult._sum.taxAmount || 0
      const tvaDue = totalTax - tvaDeducible
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
          revenueExcludingTax,
          totalCost,
          grossProfit,
          totalExpenses,
          netProfit,
          totalTax,
          tvaDeducible,
          tvaDue,
          profitMargin: revenueExcludingTax > 0 ? (grossProfit / revenueExcludingTax) * 100 : 0,
          netMargin: revenueExcludingTax > 0 ? (netProfit / revenueExcludingTax) * 100 : 0,
        },
        byPaymentMethod: Object.entries(byPaymentMethod).map(([method, total]) => ({ method, total })),
        expensesByCategory: expensesByCategory.map(c => ({
          category: c.category,
          total: c._sum.amount || 0,
          taxAmount: c._sum.taxAmount || 0,
          count: c._count,
        })),
      })
    } catch (e) { next(e) }
  })

  router.get('/analytics', requirePermission(prisma, 'dashboard', 'view'), async (req, res, next) => {
    try {
      const { startDate, endDate } = req.query
      const now = new Date()
      const defaultStart = new Date(now)
      defaultStart.setDate(defaultStart.getDate() - 90)

      const periodStart = startDate ? new Date(startDate as string) : defaultStart
      const periodEnd = endDate ? new Date(endDate as string) : new Date(now)
      periodEnd.setHours(23, 59, 59, 999)

      const salesWhere: any = { status: 'completed', createdAt: { gte: periodStart, lte: periodEnd } }

      const [sales, allProducts, clients] = await Promise.all([
        prisma.sale.findMany({
          where: salesWhere,
          include: { items: true, client: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.product.findMany({ where: { active: true }, select: { id: true, name: true, code: true, category: true, brand: true, buyPrice: true, sellPrice: true, stock: true, minStock: true } }),
        prisma.client.findMany({ select: { id: true, name: true, phone: true, currentBalance: true, creditLimit: true } }),
      ])

      const productStats = new Map<number, { totalQty: number; totalRevenue: number; totalCost: number; timesSold: number; lastSoldAt: Date | null }>()
      for (const p of allProducts) productStats.set(p.id, { totalQty: 0, totalRevenue: 0, totalCost: 0, timesSold: 0, lastSoldAt: null })

      const clientStats = new Map<number, { totalSpent: number; totalSales: number; lastPurchaseAt: Date | null }>()
      const paymentTotals: Record<string, { count: number; total: number }> = {}
      const dailyData: Record<string, { count: number; revenue: number; items: number }> = {}

      for (const sale of sales) {
        const day = sale.createdAt.toISOString().slice(0, 10)
        if (!dailyData[day]) dailyData[day] = { count: 0, revenue: 0, items: 0 }
        dailyData[day].count++
        dailyData[day].revenue += sale.total

        if (!paymentTotals[sale.paymentMethod]) paymentTotals[sale.paymentMethod] = { count: 0, total: 0 }
        paymentTotals[sale.paymentMethod].count++
        paymentTotals[sale.paymentMethod].total += sale.total

        if (sale.clientId) {
          const cs = clientStats.get(sale.clientId) || { totalSpent: 0, totalSales: 0, lastPurchaseAt: null }
          cs.totalSpent += sale.total
          cs.totalSales++
          if (!cs.lastPurchaseAt || sale.createdAt > cs.lastPurchaseAt) cs.lastPurchaseAt = sale.createdAt
          clientStats.set(sale.clientId, cs)
        }

        for (const item of sale.items) {
          dailyData[day].items += item.quantity
          const ps = productStats.get(item.productId)
          if (ps) {
            ps.totalQty += item.quantity
            ps.totalRevenue += item.totalPrice
            ps.totalCost += (item.unitCost || 0) * item.quantity
            ps.timesSold++
            if (!ps.lastSoldAt || sale.createdAt > ps.lastSoldAt) ps.lastSoldAt = sale.createdAt
          }
        }
      }

      const productPerformance = allProducts.map(p => {
        const ps = productStats.get(p.id)!
        return {
          id: p.id, name: p.name, code: p.code, category: p.category, brand: p.brand,
          buyPrice: p.buyPrice, sellPrice: p.sellPrice, stock: p.stock, minStock: p.minStock,
          totalQty: ps.totalQty, totalRevenue: ps.totalRevenue, totalCost: ps.totalCost,
          margin: ps.totalRevenue > 0 ? ((ps.totalRevenue - ps.totalCost) / ps.totalRevenue) * 100 : 0,
          lastSoldAt: ps.lastSoldAt, timesSold: ps.timesSold,
        }
      })

      productPerformance.sort((a, b) => b.totalQty - a.totalQty)

      const clientArr = clients.map(c => {
        const cs = clientStats.get(c.id)
        return {
          id: c.id, name: c.name, phone: c.phone, currentBalance: c.currentBalance, creditLimit: c.creditLimit,
          totalSpent: cs?.totalSpent || 0, totalSales: cs?.totalSales || 0, lastPurchaseAt: cs?.lastPurchaseAt || null,
        }
      })

      const topClients = clientArr.filter(c => c.totalSales > 0).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10)

      const sixtyDaysAgo = new Date(now)
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
      const inactiveClients = clientArr
        .filter(c => c.totalSales > 0 && c.lastPurchaseAt && c.lastPurchaseAt < sixtyDaysAgo)
        .map(c => ({ ...c, daysSince: Math.floor((now.getTime() - new Date(c.lastPurchaseAt!).getTime()) / 86400000) }))
        .sort((a, b) => b.daysSince - a.daysSince)

      const monthlySales: { month: string; revenue: number; count: number; items: number }[] = []
      const monthNames = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
      for (let m = 0; m < 12; m++) {
        const match = Object.entries(dailyData).filter(([d]) => new Date(d).getMonth() === m)
        monthlySales.push({
          month: monthNames[m],
          revenue: match.reduce((s, [, d]) => s + d.revenue, 0),
          count: match.reduce((s, [, d]) => s + d.count, 0),
          items: match.reduce((s, [, d]) => s + d.items, 0),
        })
      }

      const dailyTrend = Object.entries(dailyData).map(([date, d]) => ({ date, ...d })).sort((a, b) => a.date.localeCompare(b.date))

      const inventorySummary = {
        totalProducts: allProducts.length,
        totalValue: allProducts.reduce((s, p) => s + p.stock * p.buyPrice, 0),
        outOfStock: allProducts.filter(p => p.stock <= 0).length,
        lowStock: allProducts.filter(p => p.stock > 0 && p.stock <= p.minStock).length,
        okStock: allProducts.filter(p => p.stock > p.minStock).length,
      }

      const totalRevenue = sales.reduce((s, sale) => s + sale.total, 0)
      const totalItems = sales.reduce((s, sale) => s + sale.items.reduce((i, item) => i + item.quantity, 0), 0)
      const avgTicket = sales.length > 0 ? totalRevenue / sales.length : 0

      res.json({
        kpi: { totalRevenue, totalSales: sales.length, totalItems, avgTicket, productCount: allProducts.length },
        productPerformance,
        topClients,
        inactiveClients,
        paymentDistribution: Object.entries(paymentTotals).map(([method, d]) => ({ method, ...d })),
        dailyTrend,
        monthlySales,
        inventorySummary,
      })
    } catch (e) { next(e) }
  })


  return router
}
