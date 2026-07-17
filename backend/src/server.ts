import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
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
import { expenseRoutes } from './routes/expenses'
import { warehouseRoutes } from './routes/warehouses'
import { locationRoutes } from './routes/locations'
import { stockMovementRoutes } from './routes/stockMovements'
import { inventoryRoutes } from './routes/inventory'
import { auditRoutes } from './routes/audit'
import { errorHandler } from './middleware/errorHandler'
import { requireAuth } from './middleware/auth'

export function createServer(prisma: PrismaClient) {
  const app = express()

  app.use(helmet())
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
    : ['https://spare-parts-pos.vercel.app', 'https://pos-spare-parts.vercel.app', 'http://localhost:5173']
  app.use(cors({
    origin: allowedOrigins,
    credentials: true,
  }))
  app.use(express.json({ limit: '2mb' }))

  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' },
  })
  app.use('/api', globalLimiter)

  app.use('/api/auth', authRoutes(prisma))
  app.get('/api/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`
      res.json({ status: 'ok', db: 'connected' })
    } catch {
      res.status(503).json({ status: 'error', db: 'disconnected' })
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
  app.use('/api/expenses', expenseRoutes(prisma))
  app.use('/api/warehouses', warehouseRoutes(prisma))
  app.use('/api/locations', locationRoutes(prisma))
  app.use('/api/stock-movements', stockMovementRoutes(prisma))
  app.use('/api/inventory', inventoryRoutes(prisma))
  app.use('/api/audit', auditRoutes(prisma))

  app.use(errorHandler)
  return app
}
