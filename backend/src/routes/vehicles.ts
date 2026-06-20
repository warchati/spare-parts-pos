import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requirePermission } from '../middleware/auth'

export function vehicleRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/', requirePermission(prisma, 'vehicles', 'view'), async (req, res, next) => {
    try {
      const { q } = req.query
      const where: any = {}

      if (q) {
        where.OR = [
          { brand: { contains: q as string } },
          { model: { contains: q as string } },
        ]
      }

      const vehicles = await prisma.vehicle.findMany({
        where,
        orderBy: [{ brand: 'asc' }, { model: 'asc' }],
      })
      res.json(vehicles)
    } catch (e) { next(e) }
  })

  router.get('/brands', requirePermission(prisma, 'vehicles', 'view'), async (_req, res, next) => {
    try {
      const brands = await prisma.vehicle.findMany({
        select: { brand: true },
        distinct: ['brand'],
        orderBy: { brand: 'asc' },
      })
      res.json(brands.map(b => b.brand))
    } catch (e) { next(e) }
  })

  router.get('/:id', requirePermission(prisma, 'vehicles', 'view'), async (req, res, next) => {
    try {
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: Number(req.params.id) },
        include: { products: { include: { product: { include: { images: true } } } } },
      })
      if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' })
      res.json(vehicle)
    } catch (e) { next(e) }
  })

  router.post('/', requirePermission(prisma, 'vehicles', 'create'), async (req, res, next) => {
    try {
      const { brand, model, year } = req.body
      const vehicle = await prisma.vehicle.create({ data: { brand, model, year: year || null } })
      res.status(201).json(vehicle)
    } catch (e) { next(e) }
  })

  router.put('/:id', requirePermission(prisma, 'vehicles', 'edit'), async (req, res, next) => {
    try {
      const { brand, model, year } = req.body
      const vehicle = await prisma.vehicle.update({
        where: { id: Number(req.params.id) },
        data: { brand, model, year: year || null },
      })
      res.json(vehicle)
    } catch (e) { next(e) }
  })

  router.delete('/:id', requirePermission(prisma, 'vehicles', 'delete'), async (req, res, next) => {
    try {
      await prisma.vehicle.delete({ where: { id: Number(req.params.id) } })
      res.json({ success: true })
    } catch (e) { next(e) }
  })

  router.post('/:id/products', requirePermission(prisma, 'vehicles', 'edit'), async (req, res, next) => {
    try {
      const { productId } = req.body
      const link = await prisma.productVehicle.create({
        data: { productId, vehicleId: Number(req.params.id) },
        include: { product: true, vehicle: true },
      })
      res.status(201).json(link)
    } catch (e) { next(e) }
  })

  router.delete('/:id/products/:productId', async (req, res, next) => {
    try {
      const { id, productId } = req.params
      await prisma.productVehicle.deleteMany({
        where: { vehicleId: Number(id), productId: Number(productId) },
      })
      res.json({ success: true })
    } catch (e) { next(e) }
  })

  return router
}
