import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requirePermission, requireAnyPermission, AuthRequest } from '../middleware/auth'
import { logAudit } from '../lib/audit'

async function getDefaultTaxRate(prisma: PrismaClient) {
  const tax = await prisma.tax.findFirst({ where: { isDefault: true, isActive: true } })
  return tax?.percentage ?? 0
}

function calcTaxAmount(amount: number, rate: number): number {
  if (rate <= 0 || amount <= 0) return 0
  return Math.round((amount * rate / (100 + rate)) * 100) / 100
}

export function expenseRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/', requireAnyPermission(prisma, 'expenses', ['view', 'edit']), async (req, res, next) => {
    try {
      const { start, end, category, q } = req.query
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
          d.setHours(23, 59, 59, 999)
          where.createdAt.lte = d
        }
      }
      if (category) where.category = category
      if (q) where.description = { contains: q as string, mode: 'insensitive' as const }

      const expenses = await prisma.expense.findMany({
        where,
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      })
      res.json(expenses)
    } catch (e) { next(e) }
  })

  router.get('/categories/list', requireAnyPermission(prisma, 'expenses', ['view', 'edit']), async (_req, res, next) => {
    try {
      const categories = await prisma.expense.findMany({
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      })
      res.json(categories.map(c => c.category))
    } catch (e) { next(e) }
  })

  router.get('/summary', requireAnyPermission(prisma, 'expenses', ['view', 'edit']), async (req, res, next) => {
    try {
      const { start, end } = req.query
      const where: any = {}
      if (start || end) {
        where.createdAt = {}
        if (start) where.createdAt.gte = new Date(start as string)
        if (end) {
          const d = new Date(end as string)
          d.setHours(23, 59, 59, 999)
          where.createdAt.lte = d
        }
      }

      const [totalResult, byCategory, totalCount, taxResult] = await Promise.all([
        prisma.expense.aggregate({ where, _sum: { amount: true } }),
        prisma.expense.groupBy({
          by: ['category'],
          where,
          _sum: { amount: true },
          _count: true,
          orderBy: { category: 'asc' },
        }),
        prisma.expense.count({ where }),
        prisma.expense.aggregate({ where, _sum: { taxAmount: true } }),
      ])

      res.json({
        total: totalResult._sum.amount || 0,
        count: totalCount,
        totalTaxAmount: taxResult._sum.taxAmount || 0,
        byCategory: byCategory.map(c => ({
          category: c.category,
          total: c._sum.amount || 0,
          count: c._count,
        })),
      })
    } catch (e) { next(e) }
  })

  router.post('/', requirePermission(prisma, 'expenses', 'edit'), async (req: AuthRequest, res, next) => {
    try {
      const { description, amount, category, paymentMethod, reference, notes, attachmentUrl, taxDeductible } = req.body
      if (!description || amount === undefined) {
        return res.status(400).json({ error: 'Description and amount are required' })
      }

      const rate = await getDefaultTaxRate(prisma)
      const taxAmount = calcTaxAmount(Number(amount), rate)

      const expense = await prisma.$transaction(async (tx) => {
        const result = await tx.expense.create({
          data: {
            description,
            amount: Number(amount),
            category: category || 'other',
            paymentMethod: paymentMethod || 'cash',
            reference: reference || '',
            notes: notes || '',
            attachmentUrl: attachmentUrl || '',
            taxAmount,
            taxDeductible: taxDeductible !== undefined ? taxDeductible : true,
            userId: req.user!.id,
          },
        })

        if ((paymentMethod || 'cash') === 'cash') {
          const openRegister = await tx.cashRegister.findFirst({ where: { status: 'open' } })
          if (openRegister) {
            await tx.cashMovement.create({
              data: {
                cashRegisterId: openRegister.id,
                type: 'expense',
                amount: Number(amount),
                description: `Gasto: ${description}`,
              },
            })
          }
        }

        return result
      })

      await logAudit(prisma, req, 'CREATE', 'Expense', expense.id, { amount, taxAmount, category, description })

      res.status(201).json(expense)
    } catch (e) { next(e) }
  })

  router.put('/:id', requirePermission(prisma, 'expenses', 'edit'), async (req: AuthRequest, res, next) => {
    try {
      const { description, amount, category, paymentMethod, reference, notes, attachmentUrl, taxDeductible } = req.body
      const data: any = {}
      if (description !== undefined) data.description = description
      if (amount !== undefined) data.amount = amount
      if (category !== undefined) data.category = category
      if (paymentMethod !== undefined) data.paymentMethod = paymentMethod
      if (reference !== undefined) data.reference = reference
      if (notes !== undefined) data.notes = notes
      if (attachmentUrl !== undefined) data.attachmentUrl = attachmentUrl
      if (taxDeductible !== undefined) data.taxDeductible = taxDeductible

      if (amount !== undefined) {
        const rate = await getDefaultTaxRate(prisma)
        data.taxAmount = calcTaxAmount(Number(amount), rate)
      }

      const expense = await prisma.expense.update({
        where: { id: Number(req.params.id) },
        data,
      })

      await logAudit(prisma, req, 'UPDATE', 'Expense', expense.id, { changes: data })

      res.json(expense)
    } catch (e) { next(e) }
  })

  router.delete('/:id', requirePermission(prisma, 'expenses', 'edit'), async (req: AuthRequest, res, next) => {
    try {
      const expense = await prisma.expense.findUnique({ where: { id: Number(req.params.id) } })
      if (!expense) return res.status(404).json({ error: 'Expense not found' })

      await prisma.expense.delete({ where: { id: Number(req.params.id) } })

      await logAudit(prisma, req, 'DELETE', 'Expense', expense.id, { description: expense.description })

      res.json({ success: true })
    } catch (e) { next(e) }
  })

  return router
}
