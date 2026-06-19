import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import { productRoutes } from './routes/products'
import { clientRoutes } from './routes/clients'
import { supplierRoutes } from './routes/suppliers'
import { saleRoutes } from './routes/sales'
import { purchaseRoutes } from './routes/purchases'
import { authRoutes } from './routes/auth'
import { errorHandler } from './middleware/errorHandler'

export function createServer(prisma: PrismaClient) {
  const app = express()

  app.use(cors())
  app.use(express.json())

  app.use('/api/auth', authRoutes(prisma))
  app.use('/api/products', productRoutes(prisma))
  app.use('/api/clients', clientRoutes(prisma))
  app.use('/api/suppliers', supplierRoutes(prisma))
  app.use('/api/sales', saleRoutes(prisma))
  app.use('/api/purchases', purchaseRoutes(prisma))

  app.get('/api/health', async (_req, res) => {
    const dnsInfo: any = {}
    try {
      const dns = require('dns')
      await new Promise<void>((resolve, reject) => {
        dns.resolve4('db.pzslmfjabfyjzwchaahk.supabase.co', (err: any, addresses: any) => {
          dnsInfo.v4 = err ? err.message : addresses
          resolve()
        })
      })
      await new Promise<void>((resolve, reject) => {
        dns.resolve6('db.pzslmfjabfyjzwchaahk.supabase.co', (err: any, addresses: any) => {
          dnsInfo.v6 = err ? err.message : addresses
          resolve()
        })
      })
    } catch (e: any) { dnsInfo.error = e.message }
    try {
      await prisma.$queryRaw`SELECT 1`
      res.json({ status: 'ok', db: 'connected', dns: dnsInfo })
    } catch (e: any) {
      res.json({ status: 'ok', db: 'error', message: e.message, dbUrl: process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'), dns: dnsInfo })
    }
  })

  app.use(errorHandler)

  return app
}
