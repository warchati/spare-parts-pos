import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requirePermission, AuthRequest } from '../middleware/auth'

export function cashRegisterRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/', requirePermission(prisma, 'cashRegister', 'movements'), async (req, res, next) => {
    try {
      const registers = await prisma.cashRegister.findMany({
        include: {
          user: { select: { id: true, username: true, name: true } },
          sales: { select: { total: true, paymentMethod: true, status: true } },
          movements: { select: { type: true, amount: true } },
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

  router.post('/', requirePermission(prisma, 'cashRegister', 'open'), async (req: AuthRequest, res, next) => {
    try {
      const { openingBalance, notes } = req.body
      const userId = req.user!.id

      const register = await prisma.$transaction(async (tx) => {
        const openRegister = await tx.cashRegister.findFirst({ where: { status: 'open' } })
        if (openRegister) throw new Error('Already an open register exists')

        return tx.cashRegister.create({
          data: { userId, openingBalance: openingBalance || 0, notes: notes || '' },
        })
      })

      res.status(201).json(register)
    } catch (e) { next(e) }
  })

  router.patch('/:id/close', requirePermission(prisma, 'cashRegister', 'close'), async (req, res, next) => {
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
      res.json(register)
    } catch (e) { next(e) }
  })

  router.post('/:id/movements', requirePermission(prisma, 'cashRegister', 'open'), async (req, res, next) => {
    try {
      const { type, amount, description } = req.body
      const id = Number(req.params.id)

      if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' })
      if (!description || !description.trim()) return res.status(400).json({ error: 'Description is required' })

      const movement = await prisma.$transaction(async (tx) => {
        const existing = await tx.cashRegister.findUnique({ where: { id } })
        if (!existing) throw new Error('Cash register not found')
        if (existing.status !== 'open') throw new Error('Already closed')

        return tx.cashMovement.create({
          data: {
            cashRegisterId: id,
            type: type || 'income',
            amount,
            description: description.trim(),
          },
        })
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
