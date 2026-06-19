import { PrismaClient } from '@prisma/client'
import { createServer } from './server'

const prisma = new PrismaClient()
const app = createServer(prisma)

const PORT = process.env.PORT || 3000

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
}

export default app
