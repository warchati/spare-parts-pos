import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

export function productRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/', async (req, res, next) => {
    try {
      const { q, category, brand, active } = req.query
      const where: any = {}

      if (q) {
        where.OR = [
          { name: { contains: q as string } },
          { code: { contains: q as string } },
          { barcode: { contains: q as string } },
          { oemNumber: { contains: q as string } },
        ]
      }
      if (category) where.category = category
      if (brand) where.brand = brand
      if (active !== undefined) where.active = active === 'true'

      const products = await prisma.product.findMany({
        where,
        orderBy: { name: 'asc' },
      })
      res.json(products)
    } catch (e) { next(e) }
  })

  router.get('/:id', async (req, res, next) => {
    try {
      const product = await prisma.product.findUnique({
        where: { id: Number(req.params.id) },
      })
      if (!product) return res.status(404).json({ error: 'Product not found' })
      res.json(product)
    } catch (e) { next(e) }
  })

  router.post('/', async (req, res, next) => {
    try {
      const product = await prisma.product.create({ data: req.body })
      res.status(201).json(product)
    } catch (e) { next(e) }
  })

  router.put('/:id', async (req, res, next) => {
    try {
      const product = await prisma.product.update({
        where: { id: Number(req.params.id) },
        data: req.body,
      })
      res.json(product)
    } catch (e) { next(e) }
  })

  router.patch('/:id/stock', async (req, res, next) => {
    try {
      const { stock } = req.body
      const product = await prisma.product.update({
        where: { id: Number(req.params.id) },
        data: { stock },
      })
      res.json(product)
    } catch (e) { next(e) }
  })

  router.get('/categories/list', async (_req, res, next) => {
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

  router.get('/brands/list', async (_req, res, next) => {
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

  return router
}
