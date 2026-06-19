import { PrismaClient } from '@prisma/client'
import { createServer } from './server'

const prisma = new PrismaClient()
const PORT = process.env.PORT || 3000

async function main() {
  const app = createServer(prisma)

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
