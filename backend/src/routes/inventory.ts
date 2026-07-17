import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requirePermission, AuthRequest } from '../middleware/auth'
import { logAudit } from '../lib/audit'

export function inventoryRoutes(prisma: PrismaClient) {
  const router = Router()

  const TYPE_LABELS: Record<string, string> = {
    SALE: 'Venta',
    PURCHASE_RECEIVE: 'Recepción Compra',
    SALE_CANCEL: 'Cancelación Venta',
    RETURN: 'Devolución',
    ADJUSTMENT: 'Ajuste',
    MANUAL: 'Manual',
    TRANSFER: 'Transferencia',
  }

  router.get('/adjustments', requirePermission(prisma, 'inventory', 'view'), async (req, res, next) => {
    try {
      const { warehouseId, status } = req.query
      const where: any = {}
      if (warehouseId) where.warehouseId = Number(warehouseId)
      if (status) where.status = status

      const adjustments = await prisma.inventoryAdjustment.findMany({
        where,
        include: {
          warehouse: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
      res.json(adjustments)
    } catch (e) { next(e) }
  })

  router.get('/adjustments/:id', requirePermission(prisma, 'inventory', 'view'), async (req, res, next) => {
    try {
      const adjustment = await prisma.inventoryAdjustment.findUnique({
        where: { id: Number(req.params.id) },
        include: {
          warehouse: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, code: true, stock: true } },
              location: { select: { id: true, name: true, code: true } },
            },
          },
        },
      })
      if (!adjustment) return res.status(404).json({ error: 'Adjustment not found' })
      res.json(adjustment)
    } catch (e) { next(e) }
  })

  router.post('/adjustments', requirePermission(prisma, 'inventory', 'create'), async (req: AuthRequest, res, next) => {
    try {
      const { type, warehouseId, notes, items } = req.body
      if (!type || !warehouseId) return res.status(400).json({ error: 'type and warehouseId are required' })
      if (!items || items.length === 0) return res.status(400).json({ error: 'At least one item is required' })

      const adjustment = await prisma.inventoryAdjustment.create({
        data: {
          type,
          warehouseId,
          notes: notes || '',
          createdById: req.user!.id,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              locationId: item.locationId,
              expectedQty: item.expectedQty || 0,
              actualQty: item.actualQty || 0,
              difference: (item.actualQty || 0) - (item.expectedQty || 0),
              notes: item.notes || '',
            })),
          },
        },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, code: true } },
              location: { select: { id: true, name: true } },
            },
          },
        },
      })

      await logAudit(prisma, req, 'CREATE', 'InventoryAdjustment', adjustment.id, { type, warehouseId, itemCount: items.length })
      res.status(201).json(adjustment)
    } catch (e) { next(e) }
  })

  router.put('/adjustments/:id/items', requirePermission(prisma, 'inventory', 'edit'), async (req: AuthRequest, res, next) => {
    try {
      const adjustment = await prisma.inventoryAdjustment.findUnique({
        where: { id: Number(req.params.id) },
        select: { id: true, status: true },
      })
      if (!adjustment) return res.status(404).json({ error: 'Adjustment not found' })
      if (adjustment.status !== 'draft') return res.status(400).json({ error: 'Can only edit draft adjustments' })

      const { items } = req.body
      if (!items) return res.status(400).json({ error: 'items are required' })

      const updated = await prisma.$transaction(async (tx) => {
        await tx.inventoryAdjustmentItem.deleteMany({ where: { adjustmentId: Number(req.params.id) } })

        return tx.inventoryAdjustment.update({
        where: { id: Number(req.params.id) },
        data: {
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              locationId: item.locationId,
              expectedQty: item.expectedQty || 0,
              actualQty: item.actualQty || 0,
              difference: (item.actualQty || 0) - (item.expectedQty || 0),
              notes: item.notes || '',
            })),
          },
        },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, code: true } },
              location: { select: { id: true, name: true } },
            },
          },
        },
        })
      })

      await logAudit(prisma, req, 'UPDATE', 'InventoryAdjustment', adjustment.id, { action: 'update_items' })
      res.json(updated)
    } catch (e) { next(e) }
  })

  router.post('/adjustments/:id/submit', requirePermission(prisma, 'inventory', 'edit'), async (req: AuthRequest, res, next) => {
    try {
      const adjustment = await prisma.inventoryAdjustment.findUnique({ where: { id: Number(req.params.id) } })
      if (!adjustment) return res.status(404).json({ error: 'Adjustment not found' })
      if (adjustment.status !== 'draft') return res.status(400).json({ error: 'Can only submit draft adjustments' })

      const updated = await prisma.inventoryAdjustment.update({
        where: { id: Number(req.params.id) },
        data: { status: 'pending' },
      })

      await logAudit(prisma, req, 'UPDATE', 'InventoryAdjustment', adjustment.id, { action: 'submit', status: 'pending' })
      res.json(updated)
    } catch (e) { next(e) }
  })

  router.post('/adjustments/:id/approve', requirePermission(prisma, 'inventory', 'edit'), async (req: AuthRequest, res, next) => {
    try {
      const adjustment = await prisma.inventoryAdjustment.findUnique({
        where: { id: Number(req.params.id) },
        include: { items: true },
      })
      if (!adjustment) return res.status(404).json({ error: 'Adjustment not found' })
      if (adjustment.status !== 'pending') return res.status(400).json({ error: 'Adjustment must be in pending status' })
      if (adjustment.createdById === req.user!.id) {
        return res.status(400).json({ error: 'Cannot approve your own adjustment' })
      }

      await prisma.$transaction(async (tx) => {
        for (const item of adjustment.items) {
          const loc = await tx.productLocation.findUnique({
            where: { productId_locationId: { productId: item.productId, locationId: item.locationId } },
          })

          const beforeLocStock = loc?.stock || 0
          const newLocStock = Math.max(0, item.actualQty)
          const stockDiff = newLocStock - beforeLocStock

          await tx.productLocation.upsert({
            where: { productId_locationId: { productId: item.productId, locationId: item.locationId } },
            update: { stock: newLocStock },
            create: { productId: item.productId, locationId: item.locationId, stock: newLocStock },
          })

          const product = await tx.product.findUnique({ where: { id: item.productId } })
          const beforeStock = product?.stock || 0
          const newTotalStock = Math.max(0, beforeStock + stockDiff)

          await tx.product.update({
            where: { id: item.productId },
            data: { stock: newTotalStock },
          })

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              locationId: item.locationId,
              type: 'ADJUSTMENT',
              quantity: stockDiff,
              beforeStock,
              afterStock: newTotalStock,
              beforeLocStock,
              afterLocStock: newLocStock,
              referenceType: 'InventoryAdjustment',
              referenceId: adjustment.id,
              reason: `Ajuste de inventario: esperado ${item.expectedQty}, real ${item.actualQty}`,
              userId: req.user!.id,
            },
          })
        }

        await tx.inventoryAdjustment.update({
          where: { id: adjustment.id },
          data: {
            status: 'approved',
            approvedById: req.user!.id,
            approvedAt: new Date(),
          },
        })
      })

      await logAudit(prisma, req, 'UPDATE', 'InventoryAdjustment', adjustment.id, { action: 'approve', status: 'approved' })
      res.json({ success: true })
    } catch (e) { next(e) }
  })

  router.post('/adjustments/:id/reject', requirePermission(prisma, 'inventory', 'edit'), async (req: AuthRequest, res, next) => {
    try {
      const adjustment = await prisma.inventoryAdjustment.findUnique({ where: { id: Number(req.params.id) } })
      if (!adjustment) return res.status(404).json({ error: 'Adjustment not found' })
      if (adjustment.status !== 'pending') return res.status(400).json({ error: 'Adjustment must be in pending status' })

      const updated = await prisma.inventoryAdjustment.update({
        where: { id: Number(req.params.id) },
        data: { status: 'rejected' },
      })

      await logAudit(prisma, req, 'UPDATE', 'InventoryAdjustment', adjustment.id, { action: 'reject', status: 'rejected' })
      res.json(updated)
    } catch (e) { next(e) }
  })

  router.get('/types', requirePermission(prisma, 'inventory', 'view'), async (_req, res) => {
    res.json(TYPE_LABELS)
  })

  return router
}
