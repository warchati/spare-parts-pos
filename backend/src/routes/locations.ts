import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requirePermission, AuthRequest } from '../middleware/auth'
import { logAudit } from '../lib/audit'

export function locationRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/', requirePermission(prisma, 'warehouses', 'view'), async (req, res, next) => {
    try {
      const { warehouseId, parentId, q } = req.query
      const where: any = {}
      if (warehouseId) where.warehouseId = Number(warehouseId)
      if (parentId === 'null') where.parentId = null
      else if (parentId) where.parentId = Number(parentId)
      if (q) where.OR = [{ name: { contains: q as string, mode: 'insensitive' } }, { code: { contains: q as string, mode: 'insensitive' } }]

      const locations = await prisma.location.findMany({
        where,
        include: { _count: { select: { children: true, productLocations: true } }, warehouse: { select: { name: true } } },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      })
      res.json(locations)
    } catch (e) { next(e) }
  })

  router.get('/all', requirePermission(prisma, 'warehouses', 'view'), async (req, res, next) => {
    try {
      const { warehouseId } = req.query
      const where: any = {}
      if (warehouseId) where.warehouseId = Number(warehouseId)

      const locations = await prisma.location.findMany({
        where,
        select: { id: true, name: true, code: true, type: true, warehouseId: true, parentId: true, sortOrder: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      })
      res.json(locations)
    } catch (e) { next(e) }
  })

  router.get('/export', requirePermission(prisma, 'warehouses', 'view'), async (req, res, next) => {
    try {
      const where: any = {}
      if (req.query.warehouseId) where.warehouseId = Number(req.query.warehouseId)
      const locations = await prisma.location.findMany({
        where,
        include: { warehouse: { select: { name: true } }, parent: { select: { name: true } } },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      })
      const esc = (v: string) => `"${(v || '').replace(/"/g, '""')}"`
      const header = 'Warehouse,Code,Nombre,Tipo,Barcode,Padre,Orden,Activo'
      const rows = locations.map(l => [esc(l.warehouse.name), esc(l.code), esc(l.name), esc(l.type), esc(l.barcode), esc(l.parent?.name || ''), l.sortOrder, l.isActive].join(','))
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', 'attachment; filename=ubicaciones.csv')
      res.send('\uFEFF' + header + '\n' + rows.join('\n'))
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

  router.get('/:id/stock', requirePermission(prisma, 'warehouses', 'view'), async (req, res, next) => {
    try {
      const productLocations = await prisma.productLocation.findMany({
        where: { locationId: Number(req.params.id) },
        include: { product: { select: { id: true, name: true, code: true, stock: true } } },
      })
      const totalStock = productLocations.reduce((sum, pl) => sum + pl.stock, 0)
      res.json({ totalStock, productCount: productLocations.length, products: productLocations })
    } catch (e) { next(e) }
  })

  router.post('/', requirePermission(prisma, 'warehouses', 'create'), async (req: AuthRequest, res, next) => {
    try {
      const { warehouseId, parentId, name, code, type, barcode, sortOrder, isActive } = req.body
      if (!warehouseId || !name || !code) {
        return res.status(400).json({ error: 'warehouseId, name and code are required' })
      }

      const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } })
      if (!warehouse) return res.status(404).json({ error: 'Warehouse not found' })

      if (parentId) {
        const parent = await prisma.location.findUnique({ where: { id: parentId } })
        if (!parent) return res.status(400).json({ error: 'Parent location not found' })
        if (parent.warehouseId !== warehouseId) return res.status(400).json({ error: 'Parent must belong to the same warehouse' })
      }

      const location = await prisma.location.create({
        data: {
          warehouseId,
          parentId: parentId || null,
          name,
          code,
          type: type || 'BIN',
          barcode: barcode || '',
          sortOrder: sortOrder ?? 0,
          isActive: isActive !== undefined ? isActive : true,
        },
      })

      await logAudit(prisma, req, 'CREATE', 'Location', location.id, { name, code, warehouseId })
      res.status(201).json(location)
    } catch (e: any) {
      if (e.code === 'P2002') return res.status(400).json({ error: 'Code already exists in this warehouse' })
      next(e)
    }
  })

  router.post('/import', requirePermission(prisma, 'warehouses', 'create'), async (req: AuthRequest, res, next) => {
    try {
      const { rows } = req.body
      if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: 'rows array is required' })

      const results = { created: 0, errors: [] as string[] }
      const codeToId = new Map<string, number>()

      for (const row of rows) {
        try {
          const warehouse = await prisma.warehouse.findFirst({ where: { name: { equals: row.warehouse, mode: 'insensitive' } } })
          if (!warehouse) { results.errors.push(`${row.code}: almacén "${row.warehouse}" no encontrado`); continue }

          const existing = await prisma.location.findFirst({ where: { warehouseId: warehouse.id, code: row.code } })
          if (existing) { results.errors.push(`${row.code}: ya existe en ${row.warehouse}`); continue }

          const parentKey = row.parent ? `${warehouse.id}-${row.parent}` : null
          const parentId = parentKey ? codeToId.get(parentKey) || null : null

          const location = await prisma.location.create({
            data: {
              warehouseId: warehouse.id,
              parentId,
              name: row.name,
              code: row.code,
              type: row.type || 'BIN',
              barcode: row.barcode || '',
              sortOrder: row.sortOrder ?? 0,
            },
          })

          codeToId.set(`${warehouse.id}-${row.code}`, location.id)
          results.created++
        } catch (e: any) {
          results.errors.push(`${row.code}: ${e.message}`)
        }
      }

      if (results.created > 0) await logAudit(prisma, req, 'CREATE', 'Location', 0, { import: true, created: results.created, errors: results.errors.length })
      res.json(results)
    } catch (e) { next(e) }
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
      if (parentId !== undefined) data.parentId = parentId || null

      const old = await prisma.location.findUnique({ where: { id: Number(req.params.id) } })
      if (!old) return res.status(404).json({ error: 'Location not found' })

      if (parentId && parentId !== old.parentId) {
        if (parentId === Number(req.params.id)) return res.status(400).json({ error: 'Cannot be its own parent' })
        const parent = await prisma.location.findUnique({ where: { id: parentId } })
        if (!parent) return res.status(400).json({ error: 'Parent location not found' })
        if (parent.warehouseId !== old.warehouseId) return res.status(400).json({ error: 'Parent must belong to the same warehouse' })

        let current = parent
        const visited = new Set<number>([Number(req.params.id)])
        while (current) {
          if (visited.has(current.id)) return res.status(400).json({ error: 'Circular hierarchy detected' })
          visited.add(current.id)
          current = current.parentId ? await prisma.location.findUnique({ where: { id: current.parentId } }) as any : null as any
        }
      }

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
      if ((location as any)._count.children > 0) return res.status(400).json({ error: 'Delete child locations first' })
      if ((location as any)._count.productLocations > 0) {
        const hasStock = await prisma.productLocation.findFirst({ where: { locationId: Number(req.params.id), stock: { gt: 0 } } })
        if (hasStock) return res.status(400).json({ error: 'Cannot delete: location has stock. Transfer stock first.' })
      }

      await prisma.product.updateMany({ where: { defaultLocationId: Number(req.params.id) }, data: { defaultLocationId: null } })
      await prisma.productLocation.deleteMany({ where: { locationId: Number(req.params.id) } })
      await prisma.location.delete({ where: { id: Number(req.params.id) } })
      await logAudit(prisma, req, 'DELETE', 'Location', Number(req.params.id), { name: location.name })
      res.json({ success: true })
    } catch (e) { next(e) }
  })

  return router
}
