import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'

const JWT_SECRET = process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET is required') })()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos' },
  standardHeaders: true,
  legacyHeaders: false,
})

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000
const failedAttempts = new Map<string, { count: number; lockedUntil: number }>()

export function authRoutes(prisma: PrismaClient) {
  const router = Router()

  router.post('/login', loginLimiter, async (req, res, next) => {
    try {
      const { username, password } = req.body
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' })
      }

      const lock = failedAttempts.get(username)
      if (lock && lock.lockedUntil > Date.now()) {
        const remaining = Math.ceil((lock.lockedUntil - Date.now()) / 60000)
        return res.status(429).json({ error: `Cuenta bloqueada. Intenta de nuevo en ${remaining} minutos` })
      }

      const user = await prisma.user.findUnique({ where: { username } })

      if (!user || !user.active) {
        return res.status(401).json({ error: 'Invalid credentials' })
      }

      const valid = await bcrypt.compare(password, user.password)
      if (!valid) {
        const entry = failedAttempts.get(username) || { count: 0, lockedUntil: 0 }
        entry.count++
        if (entry.count >= MAX_FAILED_ATTEMPTS) {
          entry.lockedUntil = Date.now() + LOCKOUT_DURATION
          entry.count = 0
        }
        failedAttempts.set(username, entry)
        return res.status(401).json({ error: 'Invalid credentials' })
      }

      failedAttempts.delete(username)

      const payload = { id: user.id, username: user.username, name: user.name, role: user.role }
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' })

      res.json({
        user: payload,
        token,
      })
    } catch (e) { next(e) }
  })

  router.post('/logout', (_req, res) => {
    res.json({ success: true })
  })

  return router
}
