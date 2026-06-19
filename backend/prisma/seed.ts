import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: 'admin123',
      name: 'Administrador',
      role: 'admin',
    },
  })

  const cajero = await prisma.user.upsert({
    where: { username: 'cajero' },
    update: {},
    create: {
      username: 'cajero',
      password: 'cajero123',
      name: 'Cajero',
      role: 'cashier',
    },
  })

  const proveedor1 = await prisma.supplier.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Autopartes Central S.A.',
      contact: 'Carlos López',
      phone: '555-0100',
      email: 'carlos@autopartescentral.com',
      address: 'Av. Principal 1234',
    },
  })

  const proveedor2 = await prisma.supplier.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'Repuestos del Sur',
      contact: 'María García',
      phone: '555-0200',
      email: 'maria@repuestosdelsur.com',
      address: 'Calle Secundaria 567',
    },
  })

  const products = [
    { code: 'FRENO-001', name: 'Pastillas de Freno Delanteras', brand: 'Bosch', category: 'Frenos', vehicleType: 'Sedán', buyPrice: 450, sellPrice: 750, stock: 20, minStock: 5 },
    { code: 'FRENO-002', name: 'Discos de Freno Traseros', brand: 'Bosch', category: 'Frenos', vehicleType: 'Sedán', buyPrice: 800, sellPrice: 1350, stock: 15, minStock: 3 },
    { code: 'MOTOR-001', name: 'Filtro de Aceite', brand: 'Mann', category: 'Motor', vehicleType: 'Universal', buyPrice: 120, sellPrice: 250, stock: 50, minStock: 10 },
    { code: 'MOTOR-002', name: 'Bujías (Juego x4)', brand: 'NGK', category: 'Motor', vehicleType: 'Universal', buyPrice: 600, sellPrice: 1100, stock: 30, minStock: 5 },
    { code: 'SUSP-001', name: 'Amortiguador Delantero', brand: 'Monroe', category: 'Suspensión', vehicleType: 'SUV', buyPrice: 2500, sellPrice: 4200, stock: 8, minStock: 2 },
    { code: 'SUSP-002', name: 'Amortiguador Trasero', brand: 'Monroe', category: 'Suspensión', vehicleType: 'SUV', buyPrice: 2300, sellPrice: 3900, stock: 10, minStock: 2 },
    { code: 'ELEC-001', name: 'Batería 12V 60Ah', brand: 'Moura', category: 'Eléctrico', vehicleType: 'Universal', buyPrice: 3500, sellPrice: 5500, stock: 12, minStock: 3 },
    { code: 'ELEC-002', name: 'Alternador 120A', brand: 'Bosch', category: 'Eléctrico', vehicleType: 'Sedán', buyPrice: 4500, sellPrice: 7200, stock: 5, minStock: 2 },
    { code: 'TRANS-001', name: 'Aceite de Transmisión 1L', brand: 'Castrol', category: 'Transmisión', vehicleType: 'Universal', buyPrice: 350, sellPrice: 650, stock: 40, minStock: 10 },
    { code: 'TRANS-002', name: 'Kit Embrague Completo', brand: 'Valeo', category: 'Transmisión', vehicleType: 'Sedán', buyPrice: 5800, sellPrice: 9500, stock: 6, minStock: 2 },
  ]

  for (const product of products) {
    await prisma.product.upsert({
      where: { code: product.code },
      update: {},
      create: product,
    })
  }

  console.log('Seed completed!')
  console.log(`Admin: admin / admin123`)
  console.log(`Cajero: cajero / cajero123`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
