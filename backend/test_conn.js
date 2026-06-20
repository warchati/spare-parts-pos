const { PrismaClient } = require('@prisma/client')
async function main() {
  const url = process.env.DATABASE_URL
  console.log('Testing:', url?.substring(0, 80) + '...')
  const prisma = new PrismaClient({ datasources: { db: { url } } })
  try {
    const r = await prisma.$queryRaw`SELECT 1 as ok`
    console.log('OK:', JSON.stringify(r))
  } catch(e) {
    console.log('ERROR:', String(e).substring(0, 500))
  }
  await prisma.$disconnect()
}
main()
