import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { PrismaClient } from '@prisma/client'
import { productRoutes } from './routes/products'
import { clientRoutes } from './routes/clients'
import { supplierRoutes } from './routes/suppliers'
import { saleRoutes } from './routes/sales'
import { purchaseRoutes } from './routes/purchases'
import { authRoutes } from './routes/auth'
import { reportRoutes } from './routes/reports'
import { userRoutes } from './routes/users'
import { cashRegisterRoutes } from './routes/cashRegister'
import { vehicleRoutes } from './routes/vehicles'
import { taxRoutes } from './routes/taxes'
import { currencyRoutes } from './routes/currencies'
import { creditRoutes } from './routes/credit'
import { exportRoutes } from './routes/exports'
import { imageRoutes } from './routes/images'
import { uploadRoutes } from './routes/upload'
import { permissionRoutes } from './routes/permissions'
import { loyaltyRoutes } from './routes/loyalty'
import { storeConfigRoutes } from './routes/storeConfig'
import { errorHandler } from './middleware/errorHandler'
import { requireAuth } from './middleware/auth'

export function createServer(prisma: PrismaClient) {
  const app = express()

  app.use(helmet())
  app.use(cors({
    origin: process.env.CORS_ORIGIN || ['https://pos-spare-parts.vercel.app', 'http://localhost:5173'],
    credentials: true,
  }))
  app.use(express.json({ limit: '5mb' }))

  app.use('/api/auth', authRoutes(prisma))
  app.get('/api/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`
      res.json({ status: 'ok', db: 'connected' })
    } catch {
      res.json({ status: 'error', db: 'disconnected' })
    }
  })

  app.use('/api', requireAuth(prisma))
  app.use('/api/products', productRoutes(prisma))
  app.use('/api/clients', clientRoutes(prisma))
  app.use('/api/suppliers', supplierRoutes(prisma))
  app.use('/api/sales', saleRoutes(prisma))
  app.use('/api/purchases', purchaseRoutes(prisma))
  app.use('/api/reports', reportRoutes(prisma))
  app.use('/api/users', userRoutes(prisma))
  app.use('/api/cash-register', cashRegisterRoutes(prisma))
  app.use('/api/vehicles', vehicleRoutes(prisma))
  app.use('/api/taxes', taxRoutes(prisma))
  app.use('/api/currencies', currencyRoutes(prisma))
  app.use('/api/credit', creditRoutes(prisma))
  app.use('/api/exports', exportRoutes(prisma))
  app.use('/api/images', imageRoutes(prisma))
  app.use('/api/uploads', uploadRoutes(prisma))
  app.use('/api/permissions', permissionRoutes(prisma))
  app.use('/api/loyalty', loyaltyRoutes(prisma))
  app.use('/api/store-config', storeConfigRoutes(prisma))

  app.use(errorHandler)
  return app
}
