import { Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET is required') })()

export interface AuthRequest extends Request {
  user?: { id: number; username: string; name: string; role: string }
}

const ROLE_HIERARCHY: Record<string, number> = { admin: 100, supervisor: 50, cashier: 10, seller: 10 }

export const PERMISSIONS: Record<string, Record<string, string[]>> = {
  admin: {
    pos: ['sell'],
    products: ['view', 'create', 'edit'],
    clients: ['view', 'create', 'edit'],
    suppliers: ['view', 'create', 'edit'],
    sales: ['view', 'edit'],
    purchases: ['view', 'create', 'receive'],
    dashboard: ['view'],
    cashRegister: ['open', 'close', 'movements'],
    users: ['view', 'create', 'edit', 'delete'],
    vehicles: ['view', 'create', 'edit', 'delete'],
    credit: ['view', 'pay'],
    exports: ['view'],
    taxes: ['create', 'edit', 'view'],
    currencies: ['create', 'edit', 'view'],
    permissions: ['edit'],
    returns: ['view', 'edit'],
    loyalty: ['view', 'edit', 'redeem'],
    storeConfig: ['view', 'edit'],
    expenses: ['view', 'edit'],
  },
  supervisor: {
    pos: ['sell'],
    products: ['view', 'create', 'edit'],
    clients: ['view', 'create', 'edit'],
    suppliers: ['view', 'create', 'edit'],
    sales: ['view', 'edit'],
    purchases: ['view', 'create', 'receive'],
    dashboard: ['view'],
    cashRegister: ['open', 'close', 'movements'],
    users: [],
    vehicles: ['view', 'create', 'edit', 'delete'],
    credit: ['view', 'pay'],
    exports: ['view'],
    taxes: ['view'],
    currencies: ['view'],
    permissions: [],
    returns: ['view', 'edit'],
    loyalty: ['view', 'redeem'],
    storeConfig: [],
    expenses: ['view'],
  },
  cashier: {
    pos: ['sell'],
    products: ['view'],
    clients: ['view'],
    suppliers: [],
    sales: ['view'],
    purchases: [],
    dashboard: [],
    cashRegister: [],
    users: [],
    vehicles: [],
    credit: [],
    exports: [],
    taxes: [],
    currencies: [],
    permissions: [],
    returns: [],
    loyalty: ['redeem'],
    expenses: [],
  },
  seller: {
    pos: ['sell'],
    products: ['view'],
    clients: ['view', 'create', 'edit'],
    suppliers: [],
    sales: ['view'],
    purchases: [],
    dashboard: [],
    cashRegister: [],
    users: [],
    vehicles: [],
    credit: ['view'],
    exports: [],
    taxes: [],
    currencies: [],
    returns: [],
    loyalty: ['view', 'redeem'],
    storeConfig: [],
    expenses: [],
  },
}

export async function hasPermission(prisma: PrismaClient, role: string, module: string, action: string, userId?: number): Promise<boolean> {
  if (userId) {
    try {
      const userPerm = await prisma.userPermission.findUnique({
        where: { userId_module_action: { userId, module, action } },
      })
      if (userPerm) return userPerm.granted
    } catch {
      // ignore DB error, fall through to role check
    }
  }

  try {
    const perm = await prisma.rolePermission.findUnique({
      where: { role_module_action: { role, module, action } },
    })
    if (perm) return true
  } catch {
    // ignore DB error, fall through to hardcoded map
  }

  const rolePerms = PERMISSIONS[role]
  if (!rolePerms) return false
  const perm = rolePerms[module]
  if (!perm) return false
  return perm.includes(action)
}

export function requireAuth(prisma: PrismaClient) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' })
      }

      const token = authHeader.slice(7)

      let decoded: any
      try {
        decoded = jwt.verify(token, JWT_SECRET)
      } catch {
        return res.status(401).json({ error: 'Invalid or expired token' })
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, username: true, name: true, role: true, active: true },
      })

      if (!user || !user.active) {
        return res.status(401).json({ error: 'User not found or inactive' })
      }

      req.user = user
      next()
    } catch {
      return res.status(401).json({ error: 'Authentication failed' })
    }
  }
}

export function requirePermission(prisma: PrismaClient, module: string, action: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const allowed = await hasPermission(prisma, req.user.role, module, action, req.user.id)
    if (!allowed) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    next()
  }
}

export function requireAnyPermission(prisma: PrismaClient, module: string, actions: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    for (const action of actions) {
      const allowed = await hasPermission(prisma, req.user.role, module, action, req.user.id)
      if (allowed) return next()
    }

    return res.status(403).json({ error: 'Insufficient permissions' })
  }
}
