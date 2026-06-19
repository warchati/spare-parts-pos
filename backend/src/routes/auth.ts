import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

export function authRoutes(prisma: PrismaClient) {
  const router = Router()

  router.post('/login', async (req, res, next) => {
    try {
      const { username, password } = req.body
      const user = await prisma.user.findUnique({ where: { username } })

      if (!user || user.password !== password || !user.active) {
        return res.status(401).json({ error: 'Invalid credentials' })
      }

      res.json({
        user: { id: user.id, username: user.username, name: user.name, role: user.role },
        token: Buffer.from(`${user.id}:${Date.now()}`).toString('base64'),
      })
    } catch (e) { next(e) }
  })

  router.post('/register', async (req, res, next) => {
    try {
      const { username, password, name, role } = req.body
      const user = await prisma.user.create({
        data: { username, password, name, role: role || 'cashier' },
      })
      res.status(201).json({ id: user.id, username: user.username, name: user.name, role: user.role })
    } catch (e) { next(e) }
  })

  return router
}
