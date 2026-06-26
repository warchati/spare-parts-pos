import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requirePermission, AuthRequest } from '../middleware/auth'

export function purchaseRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/', requirePermission(prisma, 'purchases', 'view'), async (req, res, next) => {
    try {
      const { start, end, supplierId, status } = req.query
      const where: any = {}

      if (start || end) {
        where.createdAt = {}
        if (start) {
          const d = new Date(start as string)
          if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid start date' })
          where.createdAt.gte = d
        }
        if (end) {
          const d = new Date(end as string)
          if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid end date' })
          where.createdAt.lte = d
        }
      }
      if (supplierId) where.supplierId = Number(supplierId)
      if (status) where.status = status

      const purchases = await prisma.purchaseOrder.findMany({
        where,
        include: { items: true, supplier: true, user: true },
        orderBy: { createdAt: 'desc' },
      })
      res.json(purchases.map(p => ({ ...p, invoiceFile: p.invoiceFile || undefined })))
    } catch (e) { next(e) }
  })

  router.get('/:id', requirePermission(prisma, 'purchases', 'view'), async (req, res, next) => {
    try {
      const purchase = await prisma.purchaseOrder.findUnique({
        where: { id: Number(req.params.id) },
        include: { items: true, supplier: true, user: true },
      })
      if (!purchase) return res.status(404).json({ error: 'Purchase not found' })
      res.json({ ...purchase, invoiceFile: purchase.invoiceFile || undefined })
    } catch (e) { next(e) }
  })

  router.post('/', requirePermission(prisma, 'purchases', 'create'), async (req: AuthRequest, res, next) => {
    try {
      const { items, supplierId } = req.body
      const userId = req.user!.id
      const result = await prisma.$transaction(async (tx) => {
        let subtotal = 0
        const purchaseItems = []

        for (const item of items) {
          const product = await tx.product.findUniqueOrThrow({
            where: { id: item.productId },
          })
          const totalCost = item.unitCost * item.quantity
          subtotal += totalCost
          purchaseItems.push({
            productId: product.id,
            productName: product.name,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost,
          })
        }

        const total = subtotal

        const purchase = await tx.purchaseOrder.create({
          data: {
            supplierId,
            userId,
            subtotal,
            total,
            items: { create: purchaseItems },
          },
          include: { items: true, supplier: true },
        })

        return purchase
      })

      res.status(201).json(result)
    } catch (e) { next(e) }
  })

  router.patch('/:id/receive', requirePermission(prisma, 'purchases', 'receive'), async (req: AuthRequest, res, next) => {
    try {
      const userId = req.user!.id
      const result = await prisma.$transaction(async (tx) => {
        const purchase = await tx.purchaseOrder.findUnique({
          where: { id: Number(req.params.id) },
          include: { items: true },
        })

        if (!purchase) throw new Error('Purchase not found')
        if (purchase.status === 'received') throw new Error('Already received')

        for (const item of purchase.items) {
          const product = await tx.product.findUniqueOrThrow({
            where: { id: item.productId },
          })
          const beforeStock = product.stock
          const afterStock = beforeStock + item.quantity
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          })
          let beforeLocStock = 0
          let afterLocStock = 0
          if (product.defaultLocationId) {
            const pl = await tx.productLocation.findUnique({
              where: {
                productId_locationId: { productId: item.productId, locationId: product.defaultLocationId },
              },
            })
            beforeLocStock = pl?.stock ?? 0
            afterLocStock = beforeLocStock + item.quantity
            if (pl) {
              await tx.productLocation.update({ where: { id: pl.id }, data: { stock: afterLocStock } })
            } else {
              await tx.productLocation.create({
                data: { productId: item.productId, locationId: product.defaultLocationId, stock: afterLocStock },
              })
            }
          }
          await tx.stockMovement.create({
            data: {
              productId: item.productId, locationId: product.defaultLocationId, type: 'PURCHASE_RECEIVE',
              quantity: item.quantity, beforeStock, afterStock,
              beforeLocStock, afterLocStock, referenceType: 'PurchaseOrder',
              referenceId: purchase.id, reason: `Recepción de compra #${purchase.id}`, userId,
            },
          })
        }

        return tx.purchaseOrder.update({
          where: { id: Number(req.params.id) },
          data: { status: 'received', receivedAt: new Date() },
          include: { items: true, supplier: true },
        })
      })

      res.json(result)
    } catch (e) { next(e) }
  })

  return router
}
