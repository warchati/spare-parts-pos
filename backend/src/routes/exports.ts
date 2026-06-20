import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requirePermission } from '../middleware/auth'

function toCsv(rows: Record<string, any>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = rows.map(row => headers.map(h => {
    const val = row[h]
    if (val === null || val === undefined) return ''
    const str = String(val)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }).join(','))
  return [headers.join(','), ...lines].join('\n')
}

export function exportRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/products/csv', requirePermission(prisma, 'exports', 'view'), async (req, res, next) => {
    try {
      const products = await prisma.product.findMany({ orderBy: { name: 'asc' } })
      const data = products.map(p => ({
        code: p.code, barcode: p.barcode, name: p.name, description: p.description,
        category: p.category, brand: p.brand, vehicleType: p.vehicleType, oemNumber: p.oemNumber,
        buyPrice: p.buyPrice, sellPrice: p.sellPrice, wholesalePrice: p.wholesalePrice,
        stock: p.stock, minStock: p.minStock, location: p.location, active: p.active,
      }))
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename=products.csv')
      res.send(toCsv(data))
    } catch (e) { next(e) }
  })

  router.get('/clients/csv', requirePermission(prisma, 'exports', 'view'), async (req, res, next) => {
    try {
      const clients = await prisma.client.findMany({ orderBy: { name: 'asc' } })
      const data = clients.map(c => ({
        name: c.name, phone: c.phone, email: c.email, address: c.address,
        document: c.document, vehicle: c.vehicle, notes: c.notes,
        creditLimit: c.creditLimit, currentBalance: c.currentBalance,
      }))
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename=clients.csv')
      res.send(toCsv(data))
    } catch (e) { next(e) }
  })

  router.get('/sales/csv', requirePermission(prisma, 'exports', 'view'), async (req, res, next) => {
    try {
      const { start, end } = req.query
      const where: any = {}
      if (start || end) {
        where.createdAt = {}
        if (start) where.createdAt.gte = new Date(start as string)
        if (end) where.createdAt.lte = new Date(end as string)
      }

      const sales = await prisma.sale.findMany({
        where,
        include: { items: true, client: true },
        orderBy: { createdAt: 'desc' },
      })

      const data = sales.flatMap(s =>
        s.items.map(item => ({
          saleId: s.id, date: s.createdAt.toISOString(),
          client: s.client?.name || 'Walk-in',
          product: item.productName, quantity: item.quantity,
          unitPrice: item.unitPrice, totalPrice: item.totalPrice,
          subtotal: s.subtotal, discount: s.discount, total: s.total,
          paymentMethod: s.paymentMethod, status: s.status,
        }))
      )
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename=sales.csv')
      res.send(toCsv(data))
    } catch (e) { next(e) }
  })

  router.get('/stock/csv', requirePermission(prisma, 'exports', 'view'), async (req, res, next) => {
    try {
      const products = await prisma.product.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
      })
      const data = products.map(p => ({
        code: p.code, name: p.name, category: p.category, brand: p.brand,
        stock: p.stock, minStock: p.minStock,
        status: p.stock <= p.minStock ? 'Low Stock' : p.stock === 0 ? 'Out of Stock' : 'OK',
        location: p.location, sellPrice: p.sellPrice,
      }))
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename=stock.csv')
      res.send(toCsv(data))
    } catch (e) { next(e) }
  })

  return router
}
