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

      if (!name) return res.status(400).json({ error: 'name is required' })
      if (percentage === undefined || percentage < 0) return res.status(400).json({ error: 'percentage must be a non-negative number' })

      const tax = await prisma.$transaction(async (tx) => {
        if (isDefault) {
          await tx.tax.updateMany({
            where: { isDefault: true },
            data: { isDefault: false },
          })
        }
        return tx.tax.create({
          data: { name, percentage, isDefault: isDefault || false },
        })
      })
      res.status(201).json(tax)
    } catch (e) { next(e) }
  })

  router.put('/:id', requirePermission(prisma, 'taxes', 'edit'), async (req, res, next) => {
    try {
      const { name, percentage, isDefault, isActive } = req.body

      const tax = await prisma.$transaction(async (tx) => {
        if (isDefault) {
          await tx.tax.updateMany({
            where: { isDefault: true, id: { not: Number(req.params.id) } },
            data: { isDefault: false },
          })
        }

        const data: any = {}
        if (name !== undefined) data.name = name
        if (percentage !== undefined) data.percentage = percentage
        if (isDefault !== undefined) data.isDefault = isDefault
        if (isActive !== undefined) data.isActive = isActive

        return tx.tax.update({
          where: { id: Number(req.params.id) },
          data,
        })
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
