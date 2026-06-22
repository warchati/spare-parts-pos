import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET is required') })()

export function authRoutes(prisma: PrismaClient) {
  const router = Router()

  router.post('/login', async (req, res, next) => {
    try {
      const { username, password } = req.body
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' })
      }

      const user = await prisma.user.findUnique({ where: { username } })

      if (!user || !user.active) {
        return res.status(401).json({ error: 'Invalid credentials' })
      }

      const valid = await bcrypt.compare(password, user.password)
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' })
      }

      const payload = { id: user.id, username: user.username, name: user.name, role: user.role }
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' })

      res.json({
        user: payload,
        token,
      })
    } catch (e) { next(e) }
  })

  return router
}
