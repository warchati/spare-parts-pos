import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requirePermission } from '../middleware/auth'

export function supplierRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/', requirePermission(prisma, 'suppliers', 'view'), async (req, res, next) => {
    try {
      const { q } = req.query
      const where: any = {}

      if (q) {
        where.OR = [
          { name: { contains: q as string, mode: 'insensitive' } },
          { contact: { contains: q as string, mode: 'insensitive' } },
          { phone: { contains: q as string, mode: 'insensitive' } },
        ]
      }

      const suppliers = await prisma.supplier.findMany({
        where,
        orderBy: { name: 'asc' },
      })
      res.json(suppliers)
    } catch (e) { next(e) }
  })

  router.get('/:id', requirePermission(prisma, 'suppliers', 'view'), async (req, res, next) => {
    try {
      const supplier = await prisma.supplier.findUnique({
        where: { id: Number(req.params.id) },
      })
      if (!supplier) return res.status(404).json({ error: 'Supplier not found' })
      res.json(supplier)
    } catch (e) { next(e) }
  })

  router.post('/', requirePermission(prisma, 'suppliers', 'create'), async (req, res, next) => {
    try {
      const { name, contact, phone, email, address } = req.body
      if (!name) return res.status(400).json({ error: 'Name is required' })
      const supplier = await prisma.supplier.create({
        data: { name, contact, phone, email, address },
      })
      res.status(201).json(supplier)
    } catch (e) { next(e) }
  })

  router.put('/:id', requirePermission(prisma, 'suppliers', 'edit'), async (req, res, next) => {
    try {
      const { name, contact, phone, email, address } = req.body
      const data: any = {}
      if (name !== undefined) data.name = name
      if (contact !== undefined) data.contact = contact
      if (phone !== undefined) data.phone = phone
      if (email !== undefined) data.email = email
      if (address !== undefined) data.address = address
      const supplier = await prisma.supplier.update({
        where: { id: Number(req.params.id) },
        data,
      })
      res.json(supplier)
    } catch (e) { next(e) }
  })

  return router
}
