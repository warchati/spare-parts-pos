import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requirePermission } from '../middleware/auth'

export function backupRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/export', requireAuth(prisma), requirePermission(prisma, 'storeConfig', 'edit'), async (_req, res, next) => {
    try {
      const [
        users, rolePermissions, userPermissions,
        products, productImages, taxes, currencies,
        clients, suppliers, vehicles, productVehicles,
        warehouses, locations, productLocations,
        sales, saleItems, saleReturns, saleReturnItems,
        purchaseOrders, purchaseItems,
        cashRegisters, cashMovements,
        creditPayments, expenses,
        stockMovements, inventoryAdjustments, inventoryAdjustmentItems,
        auditLogs, priceHistory,
        loyaltyConfig, loyaltyTransactions,
        storeConfig, systemConfig,
      ] = await Promise.all([
        prisma.user.findMany({ select: { id: true, username: true, name: true, role: true, active: true, createdAt: true } }),
        prisma.rolePermission.findMany(),
        prisma.userPermission.findMany(),
        prisma.product.findMany(),
        prisma.productImage.findMany(),
        prisma.tax.findMany(),
        prisma.currency.findMany(),
        prisma.client.findMany(),
        prisma.supplier.findMany(),
        prisma.vehicle.findMany(),
        prisma.productVehicle.findMany(),
        prisma.warehouse.findMany(),
        prisma.location.findMany(),
        prisma.productLocation.findMany(),
        prisma.sale.findMany(),
        prisma.saleItem.findMany(),
        prisma.saleReturn.findMany(),
        prisma.saleReturnItem.findMany(),
        prisma.purchaseOrder.findMany(),
        prisma.purchaseItem.findMany(),
        prisma.cashRegister.findMany(),
        prisma.cashMovement.findMany(),
        prisma.creditPayment.findMany(),
        prisma.expense.findMany(),
        prisma.stockMovement.findMany(),
        prisma.inventoryAdjustment.findMany(),
        prisma.inventoryAdjustmentItem.findMany(),
        prisma.auditLog.findMany(),
        prisma.priceHistory.findMany(),
        prisma.loyaltyConfig.findMany(),
        prisma.loyaltyTransaction.findMany(),
        prisma.storeConfig.findMany(),
        prisma.systemConfig.findMany(),
      ])

      const backup = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        source: 'spare-parts-pos',
        tables: {
          users, rolePermissions, userPermissions,
          products, productImages, taxes, currencies,
          clients, suppliers, vehicles, productVehicles,
          warehouses, locations, productLocations,
          sales, saleItems, saleReturns, saleReturnItems,
          purchaseOrders, purchaseItems,
          cashRegisters, cashMovements,
          creditPayments, expenses,
          stockMovements, inventoryAdjustments, inventoryAdjustmentItems,
          auditLogs, priceHistory,
          loyaltyConfig, loyaltyTransactions,
          storeConfig, systemConfig,
        },
        stats: {
          users: users.length,
          products: products.length,
          clients: clients.length,
          sales: sales.length,
          vehicles: vehicles.length,
        },
      }

      const json = JSON.stringify(backup, null, 2)
      const date = new Date().toISOString().slice(0, 10)
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', `attachment; filename="backup-spare-parts-${date}.json"`)
      res.send(json)
    } catch (e) { next(e) }
  })

  router.post('/import', requireAuth(prisma), requirePermission(prisma, 'storeConfig', 'edit'), async (req, res, next) => {
    try {
      const { tables, confirm } = req.body
      if (!tables || typeof tables !== 'object') {
        return res.status(400).json({ error: 'Datos de backup inválidos' })
      }
      if (confirm !== true) {
        return res.status(400).json({ error: 'Debes enviar confirm: true para restaurar' })
      }

      const results: Record<string, number> = {}

      await prisma.$transaction(async (tx) => {
        const order: [string, any][] = [
          ['taxes', tx.tax],
          ['currencies', tx.currency],
          ['users', tx.user],
          ['rolePermissions', tx.rolePermission],
          ['userPermissions', tx.userPermission],
          ['products', tx.product],
          ['productImages', tx.productImage],
          ['clients', tx.client],
          ['suppliers', tx.supplier],
          ['vehicles', tx.vehicle],
          ['productVehicles', tx.productVehicle],
          ['warehouses', tx.warehouse],
          ['locations', tx.location],
          ['productLocations', tx.productLocation],
          ['cashRegisters', tx.cashRegister],
          ['cashMovements', tx.cashMovement],
          ['sales', tx.sale],
          ['saleItems', tx.saleItem],
          ['saleReturns', tx.saleReturn],
          ['saleReturnItems', tx.saleReturnItem],
          ['purchaseOrders', tx.purchaseOrder],
          ['purchaseItems', tx.purchaseItem],
          ['creditPayments', tx.creditPayment],
          ['expenses', tx.expense],
          ['stockMovements', tx.stockMovement],
          ['inventoryAdjustments', tx.inventoryAdjustment],
          ['inventoryAdjustmentItems', tx.inventoryAdjustmentItem],
          ['auditLogs', tx.auditLog],
          ['priceHistory', tx.priceHistory],
          ['loyaltyConfig', tx.loyaltyConfig],
          ['loyaltyTransactions', tx.loyaltyTransaction],
          ['storeConfig', tx.storeConfig],
          ['systemConfig', tx.systemConfig],
        ]

        for (const [tableName, model] of order) {
          const data = tables[tableName]
          if (!Array.isArray(data)) continue
          const count = await model.count()
          if (count > 0) await model.deleteMany()
          if (data.length > 0) await model.createMany({ data, skipDuplicates: true })
          results[tableName] = data.length
        }
      })

      res.json({ success: true, restored: results })
    } catch (e: any) {
      next(e)
    }
  })

  return router
}
