import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requirePermission } from '../middleware/auth'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export function uploadRoutes(prisma: PrismaClient) {
  const router = Router()

  router.post('/product-image/:productId', requirePermission(prisma, 'products', 'edit'), async (req, res, next) => {
    try {
      const { dataUrl } = req.body
      if (!dataUrl || !dataUrl.startsWith('data:image')) {
        return res.status(400).json({ error: 'Invalid image data' })
      }

      const size = Buffer.byteLength(dataUrl, 'utf-8')
      if (size > MAX_FILE_SIZE) {
        return res.status(400).json({ error: 'Image too large (max 5MB)' })
      }

      const image = await prisma.productImage.create({
        data: {
          productId: Number(req.params.productId),
          url: dataUrl,
          altText: req.body.altText || '',
          sortOrder: req.body.sortOrder || 0,
        },
      })
      res.status(201).json(image)
    } catch (e) { next(e) }
  })

  router.post('/purchase-invoice/:purchaseId', requirePermission(prisma, 'purchases', 'edit'), async (req, res, next) => {
    try {
      const { dataUrl } = req.body
      if (!dataUrl) return res.status(400).json({ error: 'No file data' })

      const size = Buffer.byteLength(dataUrl, 'utf-8')
      if (size > MAX_FILE_SIZE) {
        return res.status(400).json({ error: 'File too large (max 5MB)' })
      }

      const purchase = await prisma.purchaseOrder.update({
        where: { id: Number(req.params.purchaseId) },
        data: { invoiceFile: dataUrl },
      })
      res.json(purchase)
    } catch (e) { next(e) }
  })

  router.get('/purchase-invoice/:purchaseId', requirePermission(prisma, 'purchases', 'view'), async (req, res, next) => {
    try {
      const purchase = await prisma.purchaseOrder.findUnique({
        where: { id: Number(req.params.purchaseId) },
        select: { invoiceFile: true },
      })
      if (!purchase) return res.status(404).json({ error: 'Purchase not found' })
      res.json({ dataUrl: purchase.invoiceFile })
    } catch (e) { next(e) }
  })

  return router
}
