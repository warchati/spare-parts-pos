import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'

const JWT_SECRET = process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET is required') })()
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET
const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL

const ACCESS_EXPIRY = '15m'
const REFRESH_EXPIRY = '7d'
const ACCESS_MAX_AGE = 15 * 60 * 1000
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000

const cookieOpts = (maxAge: number) => ({
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'strict' as const : 'lax' as const,
  path: '/',
  maxAge,
})

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
      const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRY })
      const refreshToken = jwt.sign({ id: user.id }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY })

      res.cookie('token', accessToken, cookieOpts(ACCESS_MAX_AGE))
      res.cookie('refreshToken', refreshToken, cookieOpts(REFRESH_MAX_AGE))

      res.json({ user: payload })
    } catch (e) { next(e) }
  })

  router.post('/refresh', async (req, res, next) => {
    try {
      const refreshToken = req.cookies?.refreshToken
      if (!refreshToken) {
        return res.status(401).json({ error: 'No refresh token' })
      }

      let decoded: any
      try {
        decoded = jwt.verify(refreshToken, REFRESH_SECRET)
      } catch {
        return res.status(401).json({ error: 'Invalid refresh token' })
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, username: true, name: true, role: true, active: true },
      })

      if (!user || !user.active) {
        return res.status(401).json({ error: 'User not found or inactive' })
      }

      const payload = { id: user.id, username: user.username, name: user.name, role: user.role }
      const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRY })

      res.cookie('token', accessToken, cookieOpts(ACCESS_MAX_AGE))

      res.json({ user: payload })
    } catch (e) { next(e) }
  })

  router.post('/logout', (_req, res) => {
    res.clearCookie('token', { path: '/' })
    res.clearCookie('refreshToken', { path: '/' })
    res.json({ success: true })
  })

  return router
}
