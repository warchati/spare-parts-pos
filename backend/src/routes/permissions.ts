import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requirePermission, PERMISSIONS } from '../middleware/auth'

export function permissionRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/roles', requirePermission(prisma, 'permissions', 'edit'), async (req, res, next) => {
    try {
      const perms = await prisma.rolePermission.findMany({ orderBy: [{ role: 'asc' }, { module: 'asc' }, { action: 'asc' }] })
      const grouped: Record<string, Record<string, string[]>> = {}
      for (const p of perms) {
        if (!grouped[p.role]) grouped[p.role] = {}
        if (!grouped[p.role][p.module]) grouped[p.role][p.module] = []
        grouped[p.role][p.module].push(p.action)
      }
      res.json(grouped)
    } catch (e) { next(e) }
  })

  router.put('/roles/:role', requirePermission(prisma, 'permissions', 'edit'), async (req, res, next) => {
    try {
      const role = req.params.role as string
      const permissions: Record<string, string[]> = req.body.permissions

      await prisma.$transaction(async (tx) => {
        await tx.rolePermission.deleteMany({ where: { role } })
        for (const [mod, actions] of Object.entries(permissions)) {
          for (const action of actions) {
            await tx.rolePermission.create({ data: { role, module: mod, action } })
          }
        }
      })

      res.json({ success: true })
    } catch (e) { next(e) }
  })

  router.get('/mine', async (req: any, res, next) => {
    try {
      if (!req.user) return res.json([])
      const rolePerms = await prisma.rolePermission.findMany({
        where: { role: req.user.role },
        select: { module: true, action: true },
      })
      const userPerms = await prisma.userPermission.findMany({
        where: { userId: req.user.id },
        select: { module: true, action: true, granted: true },
      })

      // Start with DB role permissions
      const permMap = new Map<string, boolean>()
      for (const p of rolePerms) permMap.set(`${p.module}:${p.action}`, true)

      // Only merge hardcoded defaults if role has NO DB records at all
      // (so admin changes via the Permissions page are respected immediately)
      const hardcoded = PERMISSIONS[req.user.role]
      if (rolePerms.length === 0 && hardcoded) {
        for (const [mod, actions] of Object.entries(hardcoded)) {
          for (const action of actions) {
            const key = `${mod}:${action}`
            if (!permMap.has(key)) permMap.set(key, true)
          }
        }
      }

      // Apply user-level overrides (grant/deny)
      for (const p of userPerms) permMap.set(`${p.module}:${p.action}`, p.granted)

      const result: { module: string, action: string }[] = []
      for (const [key, granted] of permMap) {
        if (granted) {
          const [module, action] = key.split(':')
          result.push({ module, action })
        }
      }

      res.json(result)
    } catch (e) { next(e) }
  })

  return router
}
