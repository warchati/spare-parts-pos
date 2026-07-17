import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requirePermission } from '../middleware/auth'

export function currencyRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/', requirePermission(prisma, 'currencies', 'view'), async (req, res, next) => {
    try {
      const currencies = await prisma.currency.findMany({
        orderBy: { code: 'asc' },
      })
      res.json(currencies)
    } catch (e) { next(e) }
  })

  router.get('/:id', requirePermission(prisma, 'currencies', 'view'), async (req, res, next) => {
    try {
      const currency = await prisma.currency.findUnique({
        where: { id: Number(req.params.id) },
      })
      if (!currency) return res.status(404).json({ error: 'Currency not found' })
      res.json(currency)
    } catch (e) { next(e) }
  })

  router.post('/', requirePermission(prisma, 'currencies', 'create'), async (req, res, next) => {
    try {
      const { code, name, symbol, exchangeRate, isBase } = req.body

      if (!code || !name || !symbol) {
        return res.status(400).json({ error: 'code, name, and symbol are required' })
      }
      if (exchangeRate !== undefined && exchangeRate < 0) {
        return res.status(400).json({ error: 'exchangeRate must be non-negative' })
      }

      const existing = await prisma.currency.findUnique({ where: { code } })
      if (existing) return res.status(409).json({ error: 'Currency code already exists' })

      const currency = await prisma.$transaction(async (tx) => {
        if (isBase) {
          await tx.currency.updateMany({
            where: { isBase: true },
            data: { isBase: false },
          })
        }
        return tx.currency.create({
          data: { code, name, symbol, exchangeRate: exchangeRate || 1, isBase: isBase || false },
        })
      })
      res.status(201).json(currency)
    } catch (e) { next(e) }
  })

  router.put('/:id', requirePermission(prisma, 'currencies', 'edit'), async (req, res, next) => {
    try {
      const { code, name, symbol, exchangeRate, isBase, isActive } = req.body

      if (code) {
        const existing = await prisma.currency.findUnique({ where: { code } })
        if (existing && existing.id !== Number(req.params.id)) {
          return res.status(409).json({ error: 'Currency code already exists' })
        }
      }

      const currency = await prisma.$transaction(async (tx) => {
        if (isBase) {
          await tx.currency.updateMany({
            where: { isBase: true, id: { not: Number(req.params.id) } },
            data: { isBase: false },
          })
        }

        const data: any = {}
        if (code !== undefined) data.code = code
        if (name !== undefined) data.name = name
        if (symbol !== undefined) data.symbol = symbol
        if (exchangeRate !== undefined) data.exchangeRate = exchangeRate
        if (isBase !== undefined) data.isBase = isBase
        if (isActive !== undefined) data.isActive = isActive

        return tx.currency.update({
          where: { id: Number(req.params.id) },
          data,
        })
      })
      res.json(currency)
    } catch (e) { next(e) }
  })

  router.delete('/:id', requirePermission(prisma, 'currencies', 'edit'), async (req, res, next) => {
    try {
      await prisma.currency.update({
        where: { id: Number(req.params.id) },
        data: { isActive: false },
      })
      res.json({ success: true })
    } catch (e) { next(e) }
  })

  return router
}
