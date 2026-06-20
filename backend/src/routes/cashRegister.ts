import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requirePermission } from '../middleware/auth'

export function cashRegisterRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/', requirePermission(prisma, 'cashRegister', 'movements'), async (req, res, next) => {
    try {
      const registers = await prisma.cashRegister.findMany({
        include: { user: { select: { id: true, username: true, name: true } } },
        orderBy: { openingDate: 'desc' },
      })
      res.json(registers)
    } catch (e) { next(e) }
  })

  router.get('/current', requirePermission(prisma, 'cashRegister', 'movements'), async (req, res, next) => {
    try {
      const register = await prisma.cashRegister.findFirst({
        where: { status: 'open' },
        include: { user: { select: { id: true, username: true, name: true } }, sales: true, movements: true },
      })
      res.json(register)
    } catch (e) { next(e) }
  })

  router.get('/:id', requirePermission(prisma, 'cashRegister', 'movements'), async (req, res, next) => {
    try {
      const register = await prisma.cashRegister.findUnique({
        where: { id: Number(req.params.id) },
        include: { user: { select: { id: true, username: true, name: true } }, sales: true, movements: true },
      })
      if (!register) return res.status(404).json({ error: 'Cash register not found' })
      res.json(register)
    } catch (e) { next(e) }
  })

  router.post('/', requirePermission(prisma, 'cashRegister', 'open'), async (req, res, next) => {
    try {
      const { userId, openingBalance, notes } = req.body

      const openRegister = await prisma.cashRegister.findFirst({ where: { status: 'open' } })
      if (openRegister) return res.status(400).json({ error: 'An open register already exists' })

      const register = await prisma.cashRegister.create({
        data: { userId, openingBalance: openingBalance || 0, notes: notes || '' },
      })
      res.status(201).json(register)
    } catch (e) { next(e) }
  })

  router.patch('/:id/close', requirePermission(prisma, 'cashRegister', 'close'), async (req, res, next) => {
    try {
      const { closingBalance, notes } = req.body
      const register = await prisma.cashRegister.update({
        where: { id: Number(req.params.id) },
        data: { closingBalance, notes: notes || '', closingDate: new Date(), status: 'closed' },
      })
      res.json(register)
    } catch (e) { next(e) }
  })

  router.post('/:id/movements', requirePermission(prisma, 'cashRegister', 'movements'), async (req, res, next) => {
    try {
      const { type, amount, description } = req.body
      const movement = await prisma.cashMovement.create({
        data: {
          cashRegisterId: Number(req.params.id),
          type: type || 'income',
          amount,
          description,
        },
      })
      res.status(201).json(movement)
    } catch (e) { next(e) }
  })

  router.get('/:id/movements', requirePermission(prisma, 'cashRegister', 'movements'), async (req, res, next) => {
    try {
      const movements = await prisma.cashMovement.findMany({
        where: { cashRegisterId: Number(req.params.id) },
        orderBy: { createdAt: 'desc' },
      })
      res.json(movements)
    } catch (e) { next(e) }
  })

  return router
}
