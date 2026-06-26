import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requirePermission, AuthRequest } from '../middleware/auth'
import { logAudit } from '../lib/audit'

export function locationRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/', requirePermission(prisma, 'warehouses', 'view'), async (req, res, next) => {
    try {
      const { warehouseId, parentId } = req.query
      const where: any = {}
      if (warehouseId) where.warehouseId = Number(warehouseId)
      if (parentId === 'null') where.parentId = null
      else if (parentId) where.parentId = Number(parentId)

      const locations = await prisma.location.findMany({
        where,
        include: { _count: { select: { children: true, productLocations: true } } },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      })
      res.json(locations)
    } catch (e) { next(e) }
  })

  router.get('/:id', requirePermission(prisma, 'warehouses', 'view'), async (req, res, next) => {
    try {
      const location = await prisma.location.findUnique({
        where: { id: Number(req.params.id) },
        include: {
          warehouse: true,
          parent: true,
          children: { orderBy: { sortOrder: 'asc' } },
          productLocations: {
            include: { product: { select: { id: true, name: true, code: true, stock: true, minStock: true } } },
          },
        },
      })
      if (!location) return res.status(404).json({ error: 'Location not found' })
      res.json(location)
    } catch (e) { next(e) }
  })

  router.post('/', requirePermission(prisma, 'warehouses', 'create'), async (req: AuthRequest, res, next) => {
    try {
      const { warehouseId, parentId, name, code, type, barcode, sortOrder } = req.body
      if (!warehouseId || !name || !code) {
        return res.status(400).json({ error: 'warehouseId, name and code are required' })
      }

      const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } })
      if (!warehouse) return res.status(404).json({ error: 'Warehouse not found' })

      const location = await prisma.location.create({
        data: {
          warehouseId,
          parentId: parentId || null,
          name,
          code,
          type: type || 'BIN',
          barcode: barcode || '',
          sortOrder: sortOrder ?? 0,
        },
      })

      await logAudit(prisma, req, 'CREATE', 'Location', location.id, { name, code, warehouseId })
      res.status(201).json(location)
    } catch (e: any) {
      if (e.code === 'P2002') return res.status(400).json({ error: 'Code already exists in this warehouse' })
      next(e)
    }
  })

  router.put('/:id', requirePermission(prisma, 'warehouses', 'edit'), async (req: AuthRequest, res, next) => {
    try {
      const { name, code, type, barcode, sortOrder, isActive, parentId } = req.body
      const data: any = {}
      if (name !== undefined) data.name = name
      if (code !== undefined) data.code = code
      if (type !== undefined) data.type = type
      if (barcode !== undefined) data.barcode = barcode
      if (sortOrder !== undefined) data.sortOrder = sortOrder
      if (isActive !== undefined) data.isActive = isActive
      if (parentId !== undefined) data.parentId = parentId

      const old = await prisma.location.findUnique({ where: { id: Number(req.params.id) } })
      if (!old) return res.status(404).json({ error: 'Location not found' })

      const location = await prisma.location.update({
        where: { id: Number(req.params.id) },
        data,
      })

      await logAudit(prisma, req, 'UPDATE', 'Location', location.id, { changes: data })
      res.json(location)
    } catch (e: any) {
      if (e.code === 'P2002') return res.status(400).json({ error: 'Code already exists in this warehouse' })
      next(e)
    }
  })

  router.delete('/:id', requirePermission(prisma, 'warehouses', 'delete'), async (req: AuthRequest, res, next) => {
    try {
      const location = await prisma.location.findUnique({
        where: { id: Number(req.params.id) },
        include: { _count: { select: { children: true, productLocations: true } } },
      })
      if (!location) return res.status(404).json({ error: 'Location not found' })
      if ((location as any)._count.children > 0) {
        return res.status(400).json({ error: 'Delete child locations first' })
      }

      await prisma.productLocation.deleteMany({ where: { locationId: Number(req.params.id) } })
      await prisma.location.delete({ where: { id: Number(req.params.id) } })
      await logAudit(prisma, req, 'DELETE', 'Location', Number(req.params.id), { name: location.name })
      res.json({ success: true })
    } catch (e) { next(e) }
  })

  return router
}
