import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requirePermission } from '../middleware/auth'
import ExcelJS from 'exceljs'

async function sendXlsx(res: any, rows: any[][], filename: string) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Datos')

  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri]
    const xlRow = ws.addRow(row.map(cell => cell ?? ''))
    if (ri === 0) {
      xlRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } }
      xlRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    }
  }

  ws.columns.forEach((col: any) => {
    let maxLen = 10
    col.eachCell?.((cell: any) => { if (cell.value) maxLen = Math.max(maxLen, String(cell.value).length) })
    col.width = Math.min(maxLen + 3, 40)
  })

  const buf = await wb.xlsx.writeBuffer()
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`)
  res.send(Buffer.from(buf))
}

export function exportRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/products/csv', requirePermission(prisma, 'exports', 'view'), async (req, res, next) => {
    try {
      const products = await prisma.product.findMany({ orderBy: { name: 'asc' } })
      const rows = [
        ['Código', 'Código Barras', 'Nombre', 'Descripción', 'Categoría', 'Marca', 'Tipo Vehículo', 'Nº OEM', 'Precio Compra', 'Precio Venta', 'Precio Mayorista', 'Stock', 'Stock Mínimo', 'Ubicación', 'Activo'],
        ...products.map(p => [p.code, p.barcode, p.name, p.description, p.category, p.brand, p.vehicleType, p.oemNumber, p.buyPrice, p.sellPrice, p.wholesalePrice, p.stock, p.minStock, p.location, p.active ? 'Sí' : 'No']),
      ]
      await sendXlsx(res, rows, 'productos.xlsx')
    } catch (e) { next(e) }
  })

  router.get('/sales/csv', requirePermission(prisma, 'exports', 'view'), async (req, res, next) => {
    try {
      const { start, end } = req.query
      const where: any = {}
      if (start || end) {
        where.createdAt = {}
        if (start) where.createdAt.gte = new Date(start as string)
        if (end) where.createdAt.lte = new Date(end as string)
      }

      const sales = await prisma.sale.findMany({
        where,
        include: { items: true, client: true },
        orderBy: { createdAt: 'desc' },
      })

      const rows = [
        ['Venta Nº', 'Fecha', 'Cliente', 'Producto', 'Cantidad', 'Precio Unitario', 'Total', 'Subtotal', 'Descuento', 'Total Venta', 'Método Pago', 'Estado'],
        ...sales.flatMap(s =>
          s.items.map(item => [
            s.id, new Date(s.createdAt).toLocaleDateString('es-ES'),
            s.client?.name || 'Consumidor Final',
            item.productName, item.quantity, item.unitPrice, item.totalPrice,
            s.subtotal, s.discount, s.total,
            s.paymentMethod === 'cash' ? 'Efectivo' : s.paymentMethod === 'card' ? 'Tarjeta' : s.paymentMethod === 'transfer' ? 'Transferencia' : 'Crédito',
            s.status === 'completed' ? 'Completada' : s.status === 'cancelled' ? 'Cancelada' : 'Pendiente',
          ])
        ),
      ]
      await sendXlsx(res, rows, 'ventas.xlsx')
    } catch (e) { next(e) }
  })

  router.get('/stock/csv', requirePermission(prisma, 'exports', 'view'), async (req, res, next) => {
    try {
      const products = await prisma.product.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
      })

      const rows = [
        ['Código', 'Nombre', 'Categoría', 'Marca', 'Stock', 'Stock Mínimo', 'Estado', 'Ubicación', 'Precio Venta'],
        ...products.map(p => [
          p.code, p.name, p.category, p.brand, p.stock, p.minStock,
          p.stock <= p.minStock ? 'Stock Bajo' : p.stock === 0 ? 'Sin Stock' : 'OK',
          p.location, p.sellPrice,
        ]),
      ]
      await sendXlsx(res, rows, 'stock.xlsx')
    } catch (e) { next(e) }
  })

  return router
}
