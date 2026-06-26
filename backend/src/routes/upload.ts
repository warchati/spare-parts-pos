import { Router } from 'express'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import { requireAnyPermission } from '../middleware/auth'
import { PrismaClient } from '@prisma/client'

const storage = multer.memoryStorage()
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export function uploadRoutes(prisma: PrismaClient) {
  const router = Router()

  router.post('/', requireAnyPermission(prisma, 'expenses', ['view', 'edit']), upload.single('file'), async (req: any, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file provided' })

      const result = await new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'expenses', resource_type: 'auto' },
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
