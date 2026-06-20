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

  const iva = await prisma.tax.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'IVA 21%', percentage: 21, isDefault: true },
  })

  const dh = await prisma.currency.upsert({
    where: { code: 'DH' },
    update: {},
    create: { code: 'DH', name: 'Dírham Marroquí', symbol: 'DH', exchangeRate: 1, isBase: true },
  })
  await prisma.currency.upsert({
    where: { code: 'SAR' },
    update: {},
    create: { code: 'SAR', name: 'Riyal Saudí', symbol: '﷼', exchangeRate: 0.37, isBase: false },
  })
  await prisma.currency.upsert({
    where: { code: 'EUR' },
    update: {},
    create: { code: 'EUR', name: 'Euro', symbol: '€', exchangeRate: 10.6, isBase: false },
  })
  await prisma.currency.upsert({
    where: { code: 'USD' },
    update: {},
    create: { code: 'USD', name: 'Dólar', symbol: '$', exchangeRate: 9.8, isBase: false },
  })

  const roles = ['admin', 'supervisor', 'cashier', 'seller']
  const permDefs: Record<string, Record<string, string[]>> = {
    admin: {
      pos: ['sell'],
      products: ['view', 'create', 'edit'],
      clients: ['view', 'create', 'edit'],
      suppliers: ['view', 'create', 'edit'],
      sales: ['view'],
      purchases: ['view', 'create', 'receive'],
      dashboard: ['view'],
      cashRegister: ['open', 'close', 'movements'],
      users: ['view', 'create', 'edit', 'delete'],
      vehicles: ['view', 'create', 'edit', 'delete'],
      credit: ['view', 'pay'],
      exports: ['view'],
      taxes: ['create', 'edit', 'view'],
      currencies: ['create', 'edit', 'view'],
    },
    supervisor: {
      pos: ['sell'],
      products: ['view', 'create', 'edit'],
      clients: ['view', 'create', 'edit'],
      suppliers: ['view', 'create', 'edit'],
      sales: ['view'],
      purchases: ['view', 'create', 'receive'],
      dashboard: ['view'],
      cashRegister: ['open', 'close', 'movements'],
      users: [],
      vehicles: ['view', 'create', 'edit', 'delete'],
      credit: ['view', 'pay'],
      exports: ['view'],
      taxes: ['view'],
      currencies: ['view'],
    },
    cashier: {
      pos: ['sell'],
      products: ['view'],
      clients: ['view'],
      suppliers: [],
      sales: ['view'],
      purchases: [],
      dashboard: [],
      cashRegister: [],
      users: [],
      vehicles: [],
      credit: [],
      exports: [],
      taxes: [],
      currencies: [],
    },
    seller: {
      pos: ['sell'],
      products: ['view'],
      clients: ['view', 'create', 'edit'],
      suppliers: [],
      sales: ['view'],
      purchases: [],
      dashboard: [],
      cashRegister: [],
      users: [],
      vehicles: [],
      credit: ['view'],
      exports: [],
      taxes: [],
      currencies: [],
    },
  }

  for (const [role, modules] of Object.entries(permDefs)) {
    for (const [module, actions] of Object.entries(modules)) {
      for (const action of actions) {
        await prisma.rolePermission.upsert({
          where: { role_module_action: { role, module, action } },
          update: {},
          create: { role, module, action },
        })
      }
    }
  }

  console.log('Seed completed!')
  console.log(`Admin: admin / admin123`)
  console.log(`Cajero: cajero / cajero123`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
