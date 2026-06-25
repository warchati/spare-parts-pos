import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { requirePermission, AuthRequest } from '../middleware/auth'

export function userRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/', requirePermission(prisma, 'users', 'view'), async (req, res, next) => {
    try {
      const users = await prisma.user.findMany({
        select: { id: true, username: true, name: true, email: true, role: true, active: true, createdAt: true, updatedAt: true },
        orderBy: { name: 'asc' },
      })
      res.json(users)
    } catch (e) { next(e) }
  })

  router.get('/:id', requirePermission(prisma, 'users', 'view'), async (req, res, next) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: Number(req.params.id) },
        select: { id: true, username: true, name: true, email: true, role: true, active: true, createdAt: true, updatedAt: true },
      })
      if (!user) return res.status(404).json({ error: 'User not found' })
      res.json(user)
    } catch (e) { next(e) }
  })

  router.post('/', requirePermission(prisma, 'users', 'create'), async (req, res, next) => {
    try {
      const { username, name, email, password, role } = req.body

      const existing = await prisma.user.findUnique({ where: { username } })
      if (existing) return res.status(409).json({ error: 'Username already exists' })

      const hashedPassword = await bcrypt.hash(password, 10)
      const user = await prisma.user.create({
        data: { username, name, email: email || '', password: hashedPassword, role: role || 'cashier' },
        select: { id: true, username: true, name: true, email: true, role: true, active: true },
      })
      res.status(201).json(user)
    } catch (e) { next(e) }
  })

  router.put('/:id', requirePermission(prisma, 'users', 'edit'), async (req: AuthRequest, res, next) => {
    try {
      const { username, name, email, password, role } = req.body
      const data: any = {}
      if (username !== undefined) data.username = username
      if (name !== undefined) data.name = name
      if (email !== undefined) data.email = email
      if (password !== undefined) data.password = await bcrypt.hash(password, 10)
      if (role !== undefined) {
        // Only admins can change roles, prevent self-escalation
        if (req.user!.role !== 'admin') {
          return res.status(403).json({ error: 'Only admins can change roles' })
        }
        if (req.user!.id === Number(req.params.id)) {
          return res.status(400).json({ error: 'Cannot change your own role' })
        }
        data.role = role
      }

      const user = await prisma.user.update({
        where: { id: Number(req.params.id) },
        data,
        select: { id: true, username: true, name: true, email: true, role: true, active: true },
      })
      res.json(user)
    } catch (e) { next(e) }
  })

  router.patch('/:id/status', requirePermission(prisma, 'users', 'edit'), async (req, res, next) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: Number(req.params.id) } })
      if (!user) return res.status(404).json({ error: 'User not found' })

      const updated = await prisma.user.update({
        where: { id: Number(req.params.id) },
        data: { active: !user.active },
        select: { id: true, username: true, name: true, email: true, role: true, active: true },
      })
      res.json(updated)
    } catch (e) { next(e) }
  })

  // Get effective permissions for a user (role + user overrides)
  router.get('/:id/permissions', requirePermission(prisma, 'users', 'view'), async (req, res, next) => {
    try {
      const userId = Number(req.params.id)
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } })
      if (!user) return res.status(404).json({ error: 'User not found' })

      // Get role permissions
      const rolePerms = await prisma.rolePermission.findMany({
        where: { role: user.role },
        select: { module: true, action: true },
      })

      // Get user overrides
      const userPerms = await prisma.userPermission.findMany({
        where: { userId },
        select: { module: true, action: true, granted: true },
      })

      // Build effective permissions: start with role, then apply overrides
      const effective: Record<string, string[]> = {}
      const overrides: Record<string, string[]> = {}

      for (const p of rolePerms) {
        if (!effective[p.module]) effective[p.module] = []
        effective[p.module].push(p.action)
      }

      for (const p of userPerms) {
        if (!overrides[p.module]) overrides[p.module] = []
        overrides[p.module].push(p.action)
        if (p.granted) {
          if (!effective[p.module]) effective[p.module] = []
          if (!effective[p.module].includes(p.action)) effective[p.module].push(p.action)
        } else {
          if (effective[p.module]) {
            effective[p.module] = effective[p.module].filter(a => a !== p.action)
          }
        }
      }

      res.json({ role: user.role, rolePermissions: rolePerms, userOverrides: userPerms, effective })
    } catch (e) { next(e) }
  })

  // Update user-specific permission overrides
  // Body: { permissions: { module: string, action: string, granted: boolean }[] }
  router.put('/:id/permissions', requirePermission(prisma, 'users', 'edit'), async (req, res, next) => {
    try {
      const userId = Number(req.params.id)
      const { permissions } = req.body // Array of { module, action, granted }

      await prisma.$transaction(async (tx) => {
        await tx.userPermission.deleteMany({ where: { userId } })
        for (const p of permissions) {
          await tx.userPermission.create({
            data: { userId, module: p.module, action: p.action, granted: p.granted },
          })
        }
      })

      res.json({ success: true })
    } catch (e) { next(e) }
  })

  router.delete('/:id', requirePermission(prisma, 'users', 'delete'), async (req: AuthRequest, res, next) => {
    try {
      const id = Number(req.params.id)

      // Prevent self-deletion
      if (req.user!.id === id) {
        return res.status(400).json({ error: 'Cannot delete your own account' })
      }

      const [salesCount, purchasesCount] = await Promise.all([
        prisma.sale.count({ where: { userId: id } }),
        prisma.purchaseOrder.count({ where: { userId: id } }),
      ])

      if (salesCount > 0 || purchasesCount > 0) {
        return res.status(400).json({ error: 'Cannot delete user with existing sales or purchases' })
      }

      await prisma.user.delete({ where: { id } })
      res.json({ success: true })
    } catch (e) { next(e) }
  })

  return router
}
