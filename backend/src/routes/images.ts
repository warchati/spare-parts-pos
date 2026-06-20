import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requirePermission } from '../middleware/auth'

export function imageRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/product/:productId', requirePermission(prisma, 'products', 'edit'), async (req, res, next) => {
    try {
      const images = await prisma.productImage.findMany({
        where: { productId: Number(req.params.productId) },
        orderBy: { sortOrder: 'asc' },
      })
      res.json(images)
    } catch (e) { next(e) }
  })

  router.post('/product/:productId', requirePermission(prisma, 'products', 'edit'), async (req, res, next) => {
    try {
      const { url, altText, sortOrder } = req.body
      const image = await prisma.productImage.create({
        data: {
          productId: Number(req.params.productId),
          url,
          altText: altText || '',
          sortOrder: sortOrder || 0,
        },
      })
      res.status(201).json(image)
    } catch (e) { next(e) }
  })

  router.delete('/:id', requirePermission(prisma, 'products', 'edit'), async (req, res, next) => {
    try {
      await prisma.productImage.delete({ where: { id: Number(req.params.id) } })
      res.json({ success: true })
    } catch (e) { next(e) }
  })

  return router
}
