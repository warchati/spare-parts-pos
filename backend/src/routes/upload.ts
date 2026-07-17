import { Router } from 'express'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import { requirePermission, requireAnyPermission } from '../middleware/auth'
import { PrismaClient } from '@prisma/client'

const storage = multer.memoryStorage()
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`File type not allowed. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`))
    }
  },
})

const cloudinaryConfigured = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
} else {
  console.warn('Cloudinary not configured: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are required for file uploads')
}

const FOLDER_PERMISSIONS: Record<string, { module: string; action: string }> = {
  expenses: { module: 'expenses', action: 'edit' },
  products: { module: 'products', action: 'edit' },
  logos: { module: 'storeConfig', action: 'edit' },
}

export function uploadRoutes(prisma: PrismaClient) {
  const router = Router()

  router.post('/', upload.single('file'), async (req: any, res, next) => {
    try {
      if (!cloudinaryConfigured) return res.status(503).json({ error: 'File uploads not configured. Cloudinary environment variables missing.' })
      if (!req.file) return res.status(400).json({ error: 'No file provided' })

      const folder = (req.query.folder as string) || 'general'
      const perm = FOLDER_PERMISSIONS[folder]
      if (perm) {
        const allowed = await import('../middleware/auth').then(m =>
          m.hasPermission(prisma, req.user!.role, perm.module, perm.action, req.user!.id)
        )
        if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })
      }

      const result = await new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder, resource_type: 'auto' },
          (err, result) => {
            if (err) reject(err)
            else resolve(result)
          }
        )
        stream.end(req.file.buffer)
      })

      res.json({ url: result.secure_url, publicId: result.public_id })
    } catch (e) { next(e) }
  })

  router.delete('/:publicId', requireAnyPermission(prisma, 'expenses', ['edit']), async (req: any, res, next) => {
    try {
      await cloudinary.uploader.destroy(req.params.publicId)
      res.json({ success: true })
    } catch (e) { next(e) }
  })

  return router
}
