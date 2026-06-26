import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requirePermission } from '../middleware/auth'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ['data:image/jpeg', 'data:image/png', 'data:image/webp', 'data:image/gif', 'data:image/avif']

function validateImageDataUrl(dataUrl: unknown): { valid: boolean; error?: string } {
  if (typeof dataUrl !== 'string' || dataUrl.length === 0) {
    return { valid: false, error: 'No file data' }
  }
  const matchesMime = ALLOWED_IMAGE_TYPES.some(p => dataUrl.startsWith(p))
  if (!matchesMime) {
    return { valid: false, error: 'Invalid or unsupported file type' }
  }
  const commaIndex = dataUrl.indexOf(',')
  if (commaIndex === -1) {
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

export function storeConfigRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/', async (req, res, next) => {
    try {
      let config = await prisma.storeConfig.findUnique({ where: { id: 1 } })
      if (!config) {
        config = await prisma.storeConfig.create({
          data: {
            id: 1,
            companyName: 'AutoRepuestos',
            rnc: '000-00000-0',
            address: 'Calle Principal #123',
            phone: '809-000-0000',
            email: 'info@autorepuestos.com',
            ncf: 'B01-00000001',
          },
        })
      }
      res.json(config)
    } catch (e) { next(e) }
  })

  router.put('/', requirePermission(prisma, 'storeConfig', 'edit'), async (req, res, next) => {
    try {
      const { companyName, description, rnc, address, phone, email, ncf, logoUrl } = req.body
      const config = await prisma.storeConfig.upsert({
        where: { id: 1 },
        update: { companyName, description, rnc, address, phone, email, ncf, ...(logoUrl !== undefined && { logoUrl }) },
        create: { id: 1, companyName, description, rnc, address, phone, email, ncf, ...(logoUrl !== undefined && { logoUrl }) },
      })
      res.json(config)
    } catch (e) { next(e) }
  })

  router.post('/logo', requirePermission(prisma, 'storeConfig', 'edit'), async (req, res, next) => {
    try {
      const { dataUrl } = req.body
      const validation = validateImageDataUrl(dataUrl)
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error })
      }
      const config = await prisma.storeConfig.upsert({
        where: { id: 1 },
        update: { logoUrl: dataUrl },
        create: { id: 1, logoUrl: dataUrl },
      })
      res.json(config)
    } catch (e) { next(e) }
  })

  return router
}
