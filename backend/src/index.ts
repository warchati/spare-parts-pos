import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { createServer } from './server'

const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL']
const missing = requiredEnvVars.filter(v => !process.env[v])
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`)
  process.exit(1)
}
if (process.env.JWT_SECRET === 'change-this-in-production') {
  console.error('JWT_SECRET is set to the default placeholder. Please set a strong secret.')
  process.exit(1)
}

const prisma = new PrismaClient()
const app = createServer(prisma)

const PORT = process.env.PORT || 3000

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
}

export default app
