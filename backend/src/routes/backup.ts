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
        prisma.user.findMany(),
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
        const del = async (m: { count: () => Promise<number>; deleteMany: () => Promise<{ count: number }> }) => {
          if (await m.count() > 0) await m.deleteMany()
        }

        // 1. Delete children FIRST (tables with FK references to parents)
        await del(tx.saleItem)
        await del(tx.saleReturnItem)
        await del(tx.saleReturn)
        await del(tx.creditPayment)
        await del(tx.purchaseItem)
        await del(tx.cashMovement)
        await del(tx.productImage)
        await del(tx.productVehicle)
        await del(tx.productLocation)
        await del(tx.stockMovement)
        await del(tx.inventoryAdjustmentItem)
        await del(tx.priceHistory)
        await del(tx.inventoryAdjustment)
        await del(tx.userPermission)
        await del(tx.loyaltyTransaction)
        await del(tx.expense)
        await del(tx.auditLog)
        // Now parents are safe to delete
        await del(tx.sale)
        await del(tx.purchaseOrder)
        await del(tx.cashRegister)
        await del(tx.product)
        await del(tx.client)
        await del(tx.supplier)
        await del(tx.vehicle)
        await del(tx.location)
        await del(tx.warehouse)
        await del(tx.user)
        await del(tx.rolePermission)
        await del(tx.tax)
        await del(tx.currency)
        await del(tx.loyaltyConfig)
        await del(tx.storeConfig)
        await del(tx.systemConfig)

        // 2. Insert in dependency order (parents first)
        const ins = async (name: string, m: { createMany: (args: any) => Promise<any> }) => {
          const data = tables[name]
          if (!Array.isArray(data) || data.length === 0) { results[name] = 0; return }
          await m.createMany({ data, skipDuplicates: true })
          results[name] = data.length
        }

        await ins('rolePermissions', tx.rolePermission)
        await ins('taxes', tx.tax)
        await ins('currencies', tx.currency)
        await ins('users', tx.user)
        await ins('userPermissions', tx.userPermission)
        await ins('products', tx.product)
        await ins('clients', tx.client)
        await ins('suppliers', tx.supplier)
        await ins('vehicles', tx.vehicle)
        await ins('warehouses', tx.warehouse)
        await ins('locations', tx.location)
        await ins('productImages', tx.productImage)
        await ins('productVehicles', tx.productVehicle)
        await ins('productLocations', tx.productLocation)
        await ins('cashRegisters', tx.cashRegister)
        await ins('cashMovements', tx.cashMovement)
        await ins('sales', tx.sale)
        await ins('saleItems', tx.saleItem)
        await ins('saleReturns', tx.saleReturn)
        await ins('saleReturnItems', tx.saleReturnItem)
        await ins('purchaseOrders', tx.purchaseOrder)
        await ins('purchaseItems', tx.purchaseItem)
        await ins('creditPayments', tx.creditPayment)
        await ins('expenses', tx.expense)
        await ins('stockMovements', tx.stockMovement)
        await ins('inventoryAdjustments', tx.inventoryAdjustment)
        await ins('inventoryAdjustmentItems', tx.inventoryAdjustmentItem)
        await ins('auditLogs', tx.auditLog)
        await ins('priceHistory', tx.priceHistory)
        await ins('loyaltyConfig', tx.loyaltyConfig)
        await ins('loyaltyTransactions', tx.loyaltyTransaction)
        await ins('storeConfig', tx.storeConfig)
        await ins('systemConfig', tx.systemConfig)
        // 3. Reset auto-increment sequences inside transaction
        const sequenceResets = await tx.$queryRawUnsafe<{relname: string}[]>(`
          SELECT c.relname
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE c.relkind = 'i'
            AND n.nspname = 'public'
            AND c.relname LIKE '%_id_seq'
        `)

        for (const seq of sequenceResets) {
          const tableName = seq.relname.replace('_id_seq', '')
          try {
            await tx.$executeRawUnsafe(`SELECT setval('${seq.relname}', COALESCE((SELECT MAX(id) FROM "${tableName}"), 0) + 1, false)`)
          } catch { /* table might not have id column */ }
        }
      })

      res.json({ success: true, restored: results })
    } catch (e: any) {
      next(e)
    }
  })

  return router
}
