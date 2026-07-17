import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requirePermission, AuthRequest } from '../middleware/auth'
import { logAudit } from '../lib/audit'

export function cashRegisterRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/', requirePermission(prisma, 'cashRegister', 'movements'), async (req, res, next) => {
    try {
      const registers = await prisma.cashRegister.findMany({
        include: {
          user: { select: { id: true, username: true, name: true } },
          sales: { select: { total: true, paymentMethod: true, status: true } },
          movements: { select: { type: true, amount: true, userId: true, createdAt: true, user: { select: { id: true, name: true } } } },
        },
        orderBy: { openingDate: 'desc' },
      })
      const result = registers.map(r => {
        const cashSales = r.sales
          .filter((s: any) => s.paymentMethod === 'cash' && s.status === 'completed')
          .reduce((sum: number, s: any) => sum + s.total, 0)
        const totalIncome = r.movements
          .filter((m: any) => m.type === 'income')
          .reduce((sum: number, m: any) => sum + m.amount, 0)
        const totalExpense = r.movements
          .filter((m: any) => m.type === 'expense')
          .reduce((sum: number, m: any) => sum + m.amount, 0)
        const expectedBalance = r.openingBalance + cashSales + totalIncome - totalExpense
        const difference = r.closingBalance != null ? r.closingBalance - expectedBalance : null
        return { ...r, totalIncome, totalExpense, cashSales, expectedBalance, difference }
      })
      res.json(result)
    } catch (e) { next(e) }
  })

  router.get('/current', requirePermission(prisma, 'cashRegister', 'open'), async (req, res, next) => {
    try {
      const register = await prisma.cashRegister.findFirst({
        where: { status: 'open' },
        include: {
          user: { select: { id: true, username: true, name: true } },
          sales: true,
          movements: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
        },
      })
      res.json(register)
    } catch (e) { next(e) }
  })

  router.get('/:id', requirePermission(prisma, 'cashRegister', 'movements'), async (req, res, next) => {
    try {
      const register = await prisma.cashRegister.findUnique({
        where: { id: Number(req.params.id) },
        include: {
          user: { select: { id: true, username: true, name: true } },
          sales: true,
          movements: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
        },
      })
      if (!register) return res.status(404).json({ error: 'Cash register not found' })
      res.json(register)
    } catch (e) { next(e) }
  })

  router.post('/', requirePermission(prisma, 'cashRegister', 'open'), async (req: AuthRequest, res, next) => {
    try {
      const { openingBalance, notes } = req.body
      const userId = req.user!.id
      if (openingBalance !== undefined && (typeof openingBalance !== 'number' || openingBalance < 0)) {
        return res.status(400).json({ error: 'Opening balance must be a non-negative number' })
      }

      const register = await prisma.$transaction(async (tx) => {
        const openRegister = await tx.cashRegister.findFirst({ where: { status: 'open' } })
        if (openRegister) throw new Error('Already an open register exists')

        return tx.cashRegister.create({
          data: { userId, openingBalance: openingBalance || 0, notes: notes || '' },
        })
      })

      await logAudit(prisma, req as AuthRequest, 'CREATE', 'cashRegister', register.id, { openingBalance: register.openingBalance })
      res.status(201).json(register)
    } catch (e) { next(e) }
  })

  router.patch('/:id/close', requirePermission(prisma, 'cashRegister', 'close'), async (req: AuthRequest, res, next) => {
    try {
      const { closingBalance, notes } = req.body
      const id = Number(req.params.id)

      const register = await prisma.$transaction(async (tx) => {
        const existing = await tx.cashRegister.findUnique({ where: { id } })
        if (!existing) throw new Error('Cash register not found')
        if (existing.status !== 'open') throw new Error('Already closed')

        return tx.cashRegister.update({
          where: { id },
          data: { closingBalance, notes: notes || '', closingDate: new Date(), status: 'closed' },
        })
      })

      await logAudit(prisma, req as AuthRequest, 'UPDATE', 'cashRegister', register.id, { closingBalance: register.closingBalance })
      res.json(register)
    } catch (e) { next(e) }
  })

  router.post('/:id/movements', requirePermission(prisma, 'cashRegister', 'open'), async (req: AuthRequest, res, next) => {
    try {
      const { type, amount, description } = req.body
      const id = Number(req.params.id)

      const allowedTypes = ['income', 'expense']
      if (type && !allowedTypes.includes(type)) {
        return res.status(400).json({ error: `Invalid movement type. Allowed: ${allowedTypes.join(', ')}` })
      }
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: 'Amount must be a positive number' })
      }
      if (!description || !description.trim()) return res.status(400).json({ error: 'Description is required' })

      const movement = await prisma.$transaction(async (tx) => {
        const existing = await tx.cashRegister.findUnique({ where: { id } })
        if (!existing) throw new Error('Cash register not found')
        if (existing.status !== 'open') throw new Error('Already closed')

        return tx.cashMovement.create({
          data: {
            cashRegisterId: id,
            userId: req.user!.id,
            type: type || 'income',
            amount,
            description: description.trim(),
          },
        })
      })

      await logAudit(prisma, req as AuthRequest, 'CREATE', 'cashMovement', movement.id, {
        cashRegisterId: id, type: movement.type, amount: movement.amount, description: movement.description,
      })
      res.status(201).json(movement)
    } catch (e) { next(e) }
  })

  router.get('/:id/movements', requirePermission(prisma, 'cashRegister', 'movements'), async (req, res, next) => {
    try {
      const movements = await prisma.cashMovement.findMany({
        where: { cashRegisterId: Number(req.params.id) },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      })
      res.json(movements)
    } catch (e) { next(e) }
  })

  return router
}
