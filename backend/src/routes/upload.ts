import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requirePermission } from '../middleware/auth'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_IMAGE_TYPES = ['data:image/jpeg', 'data:image/png', 'data:image/webp', 'data:image/gif', 'data:image/avif']
const ALLOWED_FILE_TYPES = [...ALLOWED_IMAGE_TYPES, 'data:application/pdf']

function validateDataUrl(dataUrl: unknown, allowedPrefixes: string[]): { valid: boolean; error?: string } {
  if (typeof dataUrl !== 'string' || dataUrl.length === 0) {
    return { valid: false, error: 'No file data' }
  }
  const matchesMime = allowedPrefixes.some(p => dataUrl.startsWith(p))
  if (!matchesMime) {
    return { valid: false, error: 'Invalid or unsupported file type' }
  }
  const semicolonIndex = dataUrl.indexOf(';')
  const commaIndex = dataUrl.indexOf(',')
  if (semicolonIndex === -1 || commaIndex === -1 || commaIndex <= semicolonIndex) {
    return { valid: false, error: 'Malformed data URL' }
  }
  const base64 = dataUrl.slice(commaIndex + 1)
  if (base64.length === 0) {
    return { valid: false, error: 'Empty file content' }
  }
  const size = Math.ceil(base64.length * 0.75)
  if (size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File too large (max 5MB)' }
  }
  return { valid: true }
}

export function uploadRoutes(prisma: PrismaClient) {
  const router = Router()

  router.post('/product-image/:productId', requirePermission(prisma, 'products', 'edit'), async (req, res, next) => {
    try {
      const { dataUrl } = req.body
      const validation = validateDataUrl(dataUrl, ALLOWED_IMAGE_TYPES)
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error })
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
      const validation = validateDataUrl(dataUrl, ALLOWED_FILE_TYPES)
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error })
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
