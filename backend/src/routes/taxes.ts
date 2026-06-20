import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requirePermission } from '../middleware/auth'

export function taxRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/', requirePermission(prisma, 'taxes', 'view'), async (req, res, next) => {
    try {
      const taxes = await prisma.tax.findMany({
        orderBy: { name: 'asc' },
      })
      res.json(taxes)
    } catch (e) { next(e) }
  })

  router.get('/:id', requirePermission(prisma, 'taxes', 'view'), async (req, res, next) => {
    try {
      const tax = await prisma.tax.findUnique({
        where: { id: Number(req.params.id) },
      })
      if (!tax) return res.status(404).json({ error: 'Tax not found' })
      res.json(tax)
    } catch (e) { next(e) }
  })

  router.post('/', requirePermission(prisma, 'taxes', 'create'), async (req, res, next) => {
    try {
      const { name, percentage, isDefault } = req.body

      if (isDefault) {
        await prisma.tax.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        })
      }

      const tax = await prisma.tax.create({
        data: { name, percentage, isDefault: isDefault || false },
      })
      res.status(201).json(tax)
    } catch (e) { next(e) }
  })

  router.put('/:id', requirePermission(prisma, 'taxes', 'edit'), async (req, res, next) => {
    try {
      const { name, percentage, isDefault, isActive } = req.body

      if (isDefault) {
        await prisma.tax.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        })
      }

      const data: any = {}
      if (name !== undefined) data.name = name
      if (percentage !== undefined) data.percentage = percentage
      if (isDefault !== undefined) data.isDefault = isDefault
      if (isActive !== undefined) data.isActive = isActive

      const tax = await prisma.tax.update({
        where: { id: Number(req.params.id) },
        data,
      })
      res.json(tax)
    } catch (e) { next(e) }
  })

  router.delete('/:id', requirePermission(prisma, 'taxes', 'edit'), async (req, res, next) => {
    try {
      await prisma.tax.update({
        where: { id: Number(req.params.id) },
        data: { isActive: false },
      })
      res.json({ success: true })
    } catch (e) { next(e) }
  })

  return router
}
