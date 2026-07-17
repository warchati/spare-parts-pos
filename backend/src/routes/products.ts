import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requirePermission, AuthRequest } from '../middleware/auth'
import { logAudit } from '../lib/audit'

export function productRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/', requirePermission(prisma, 'products', 'view'), async (req, res, next) => {
    try {
      const { q, category, brand, active } = req.query
      const where: any = {}

      if (q) {
        where.OR = [
          { name: { contains: q as string, mode: 'insensitive' } },
          { code: { contains: q as string, mode: 'insensitive' } },
          { barcode: { contains: q as string, mode: 'insensitive' } },
          { oemNumber: { contains: q as string, mode: 'insensitive' } },
        ]
      }
      if (category) where.category = category
      if (brand) where.brand = brand
      if (active !== undefined) where.active = active === 'true'

      const products = await prisma.product.findMany({
        where,
        include: { images: true, defaultLocation: true },
        orderBy: { name: 'asc' },
      })
      res.json(products)
    } catch (e) { next(e) }
  })

  router.get('/categories/list', requirePermission(prisma, 'products', 'view'), async (_req, res, next) => {
    try {
      const categories = await prisma.product.findMany({
        select: { category: true },
        distinct: ['category'],
        where: { category: { not: '' } },
        orderBy: { category: 'asc' },
      })
      res.json(categories.map(c => c.category))
    } catch (e) { next(e) }
  })

  router.get('/brands/list', requirePermission(prisma, 'products', 'view'), async (_req, res, next) => {
    try {
      const brands = await prisma.product.findMany({
        select: { brand: true },
        distinct: ['brand'],
        where: { brand: { not: '' } },
        orderBy: { brand: 'asc' },
      })
      res.json(brands.map(b => b.brand))
    } catch (e) { next(e) }
  })

  router.get('/:id', requirePermission(prisma, 'products', 'view'), async (req, res, next) => {
    try {
      const product = await prisma.product.findUnique({
        where: { id: Number(req.params.id) },
        include: { images: true, defaultLocation: true },
      })
      if (!product) return res.status(404).json({ error: 'Product not found' })
      res.json(product)
    } catch (e) { next(e) }
  })

  router.post('/', requirePermission(prisma, 'products', 'create'), async (req: AuthRequest, res, next) => {
    try {
      const { code, barcode, name, description, category, brand, vehicleType, oemNumber, buyPrice, sellPrice, wholesalePrice, minStock, location, taxId, active, defaultLocationId } = req.body
      if (!code || !name) return res.status(400).json({ error: 'Code and name are required' })
      if (buyPrice !== undefined && (typeof buyPrice !== 'number' || buyPrice < 0)) {
        return res.status(400).json({ error: 'buyPrice must be a non-negative number' })
      }
      if (sellPrice !== undefined && (typeof sellPrice !== 'number' || sellPrice < 0)) {
        return res.status(400).json({ error: 'sellPrice must be a non-negative number' })
      }
      if (wholesalePrice !== undefined && (typeof wholesalePrice !== 'number' || wholesalePrice < 0)) {
        return res.status(400).json({ error: 'wholesalePrice must be a non-negative number' })
      }

      const product = await prisma.product.create({
        data: { code, barcode, name, description, category, brand, vehicleType, oemNumber, buyPrice, sellPrice, wholesalePrice, minStock: minStock ?? 0, location, taxId: taxId || null, active: active ?? true, defaultLocationId: defaultLocationId > 0 ? defaultLocationId : null },
      })

      if (defaultLocationId > 0) {
        await prisma.productLocation.upsert({
          where: { productId_locationId: { productId: product.id, locationId: defaultLocationId } },
          update: { stock: product.stock },
          create: { productId: product.id, locationId: defaultLocationId, stock: product.stock },
        })
      }

      await logAudit(prisma, req, 'CREATE', 'Product', product.id, { name: product.name, code: product.code })

      res.status(201).json(product)
    } catch (e) { next(e) }
  })

  router.put('/:id', requirePermission(prisma, 'products', 'edit'), async (req: AuthRequest, res, next) => {
    try {
      const { code, barcode, name, description, category, brand, vehicleType, oemNumber, buyPrice, sellPrice, wholesalePrice, minStock, location, taxId, active, defaultLocationId } = req.body
      const data: any = {}
      if (code !== undefined) data.code = code
      if (barcode !== undefined) data.barcode = barcode
      if (name !== undefined) data.name = name
      if (description !== undefined) data.description = description
      if (category !== undefined) data.category = category
      if (brand !== undefined) data.brand = brand
      if (vehicleType !== undefined) data.vehicleType = vehicleType
      if (oemNumber !== undefined) data.oemNumber = oemNumber
      if (buyPrice !== undefined) data.buyPrice = buyPrice
      if (sellPrice !== undefined) data.sellPrice = sellPrice
      if (wholesalePrice !== undefined) data.wholesalePrice = wholesalePrice
      if (minStock !== undefined) data.minStock = minStock
      if (location !== undefined) data.location = location
      if (taxId !== undefined) data.taxId = taxId
      if (active !== undefined) data.active = active
      if (defaultLocationId !== undefined) data.defaultLocationId = defaultLocationId > 0 ? defaultLocationId : null

      const old = await prisma.product.findUnique({ where: { id: Number(req.params.id) } })
      if (!old) return res.status(404).json({ error: 'Product not found' })

      const product = await prisma.product.update({
        where: { id: Number(req.params.id) },
        data,
      })

      if (defaultLocationId !== undefined && defaultLocationId > 0) {
        await prisma.productLocation.upsert({
          where: { productId_locationId: { productId: product.id, locationId: defaultLocationId } },
          update: { stock: product.stock },
          create: { productId: product.id, locationId: defaultLocationId, stock: product.stock },
        })
      }

      const priceFields = ['buyPrice', 'sellPrice', 'wholesalePrice'] as const
      for (const field of priceFields) {
        if (data[field] !== undefined && data[field] !== (old as any)[field]) {
          await prisma.priceHistory.create({
            data: {
              productId: product.id,
              field,
              oldValue: (old as any)[field] || 0,
              newValue: data[field],
              changedById: req.user?.id || null,
            },
          })
        }
      }

      await logAudit(prisma, req, 'UPDATE', 'Product', product.id, { changes: data })

      res.json(product)
    } catch (e) { next(e) }
  })

  router.patch('/:id/stock', requirePermission(prisma, 'products', 'edit'), async (req, res, next) => {
    try {
      const { stock } = req.body
      if (typeof stock !== 'number' || stock < 0 || !Number.isInteger(stock)) {
        return res.status(400).json({ error: 'Stock must be a non-negative integer' })
      }
      const product = await prisma.product.update({
        where: { id: Number(req.params.id) },
        data: { stock },
      })
      res.json(product)
    } catch (e) { next(e) }
  })

  return router
}
