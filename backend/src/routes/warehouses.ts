import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requirePermission, AuthRequest } from '../middleware/auth'
import { logAudit } from '../lib/audit'

export function warehouseRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/', requirePermission(prisma, 'warehouses', 'view'), async (_req, res, next) => {
    try {
      const warehouses = await prisma.warehouse.findMany({
        include: { _count: { select: { locations: true } } },
        orderBy: { name: 'asc' },
      })
      res.json(warehouses)
    } catch (e) { next(e) }
  })

  router.get('/:id', requirePermission(prisma, 'warehouses', 'view'), async (req, res, next) => {
    try {
      const warehouse = await prisma.warehouse.findUnique({
        where: { id: Number(req.params.id) },
        include: {
          locations: {
            where: { parentId: null },
            include: { children: { include: { children: { include: { children: { include: { children: true } } } } } } },
            orderBy: { sortOrder: 'asc' },
          },
        },
      })
      if (!warehouse) return res.status(404).json({ error: 'Warehouse not found' })
      res.json(warehouse)
    } catch (e) { next(e) }
  })

  router.post('/', requirePermission(prisma, 'warehouses', 'create'), async (req: AuthRequest, res, next) => {
    try {
      const { name, code, address } = req.body
      if (!name || !code) return res.status(400).json({ error: 'Name and code are required' })

      const warehouse = await prisma.warehouse.create({
        data: { name, code, address: address || '' },
      })

      await logAudit(prisma, req, 'CREATE', 'Warehouse', warehouse.id, { name, code })
      res.status(201).json(warehouse)
    } catch (e: any) {
      if (e.code === 'P2002') return res.status(400).json({ error: 'Code already exists' })
      next(e)
    }
  })

  router.put('/:id', requirePermission(prisma, 'warehouses', 'edit'), async (req: AuthRequest, res, next) => {
    try {
      const { name, code, address, isActive } = req.body
      const data: any = {}
      if (name !== undefined) data.name = name
      if (code !== undefined) data.code = code
      if (address !== undefined) data.address = address
      if (isActive !== undefined) data.isActive = isActive

      const old = await prisma.warehouse.findUnique({ where: { id: Number(req.params.id) } })
      if (!old) return res.status(404).json({ error: 'Warehouse not found' })

      const warehouse = await prisma.warehouse.update({
        where: { id: Number(req.params.id) },
        data,
      })

      await logAudit(prisma, req, 'UPDATE', 'Warehouse', warehouse.id, { changes: data })
      res.json(warehouse)
    } catch (e: any) {
      if (e.code === 'P2002') return res.status(400).json({ error: 'Code already exists' })
      next(e)
    }
  })

  router.delete('/:id', requirePermission(prisma, 'warehouses', 'delete'), async (req: AuthRequest, res, next) => {
    try {
      const warehouse = await prisma.warehouse.findUnique({
        where: { id: Number(req.params.id) },
        include: { _count: { select: { locations: true } } },
      })
      if (!warehouse) return res.status(404).json({ error: 'Warehouse not found' })
      if ((warehouse as any)._count.locations > 0) {
        return res.status(400).json({ error: 'Cannot delete warehouse with existing locations. Remove locations first.' })
      }

      await prisma.warehouse.delete({ where: { id: Number(req.params.id) } })
      await logAudit(prisma, req, 'DELETE', 'Warehouse', Number(req.params.id), { name: warehouse.name })
      res.json({ success: true })
    } catch (e) { next(e) }
  })

  return router
}
