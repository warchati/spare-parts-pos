const { PrismaClient } = require('@prisma/client')
const { createServer } = require('../dist/server')

const prisma = new PrismaClient()
const app = createServer(prisma)

module.exports = app
