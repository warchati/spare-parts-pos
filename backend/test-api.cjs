const { PrismaClient } = require('@prisma/client')
const { createServer } = require('./dist/server')
const http = require('http')
const path = require('path')

const PORT = 3999

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port: PORT,
      path: `/api${path}`,
      method,
      headers: { 'Content-Type': 'application/json' },
    }
    const req = http.request(opts, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }) }
        catch { resolve({ status: res.statusCode, body: data }) }
      })
    })
    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

let passed = 0
let failed = 0

function assert(condition, msg) {
  if (condition) {
    console.log(`  PASS: ${msg}`)
    passed++
  } else {
    console.log(`  FAIL: ${msg}`)
    failed++
  }
}

async function main() {
  console.log('\n1. Connecting to SQLite database...')

  const dbUrl = `file:${path.join(__dirname, 'prisma', 'test.db').replace(/\\/g, '/')}`
  const prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } },
  })
  await prisma.$connect()

  console.log('2. Seeding test data...')
  const user = await prisma.user.create({
    data: { username: 'admin', password: 'admin123', name: 'Admin', role: 'admin' },
  })
  const cashier = await prisma.user.create({
    data: { username: 'cajero', password: 'cajero123', name: 'Cajero', role: 'cashier' },
  })
  const client = await prisma.client.create({
    data: { name: 'Juan Perez', phone: '555-1234', vehicle: 'Toyota Corolla 2020' },
  })
  const supplier = await prisma.supplier.create({
    data: { name: 'Autopartes SA', contact: 'Carlos', phone: '555-0001' },
  })
  const p1 = await prisma.product.create({
    data: { code: 'TEST-001', name: 'Pastillas de Freno', brand: 'Bosch', category: 'Frenos', buyPrice: 450, sellPrice: 750, stock: 20, minStock: 5 },
  })
  const p2 = await prisma.product.create({
    data: { code: 'TEST-002', name: 'Filtro de Aceite', brand: 'Mann', category: 'Motor', buyPrice: 120, sellPrice: 250, stock: 50, minStock: 10 },
  })

  console.log('3. Starting server...')

  const app = createServer(prisma)
  const server = app.listen(PORT)
  await new Promise(r => setTimeout(r, 500))

  try {
    console.log('\n4. Running tests...\n')

    // Auth
    let res = await request('POST', '/auth/login', { username: 'admin', password: 'admin123' })
    assert(res.status === 200 && res.body.user?.username === 'admin', 'Login correcto')

    res = await request('POST', '/auth/login', { username: 'admin', password: 'wrong' })
    assert(res.status === 401, 'Login con contraseña incorrecta')

    // Products
    res = await request('GET', '/products')
    assert(res.status === 200 && Array.isArray(res.body), 'Listar productos')

    res = await request('GET', `/products/${p1.id}`)
    assert(res.status === 200 && res.body.name === 'Pastillas de Freno', 'Obtener producto por ID')

    res = await request('POST', '/products', { code: 'TEST-003', name: 'Bujías', brand: 'NGK', sellPrice: 1100, stock: 30 })
    assert(res.status === 201 && res.body.code === 'TEST-003', 'Crear producto')

    res = await request('PUT', `/products/${p1.id}`, { sellPrice: 800 })
    assert(res.status === 200 && res.body.sellPrice === 800, 'Actualizar producto (precio 800)')

    res = await request('GET', '/products/categories/list')
    assert(res.status === 200 && Array.isArray(res.body), 'Listar categorias')

    // Clients
    res = await request('GET', '/clients')
    assert(res.status === 200, 'Listar clientes')

    res = await request('POST', '/clients', { name: 'Maria Garcia', phone: '555-5678' })
    assert(res.status === 201, 'Crear cliente')

    res = await request('GET', '/clients?q=juan')
    assert(res.status === 200 && res.body.length >= 1, 'Buscar cliente por nombre')

    // Suppliers
    res = await request('GET', '/suppliers')
    assert(res.status === 200 && Array.isArray(res.body), 'Listar proveedores')

    res = await request('POST', '/suppliers', { name: 'Repuestos del Sur', contact: 'Ana' })
    assert(res.status === 201, 'Crear proveedor')

    // Sale
    res = await request('POST', '/sales', {
      userId: user.id,
      clientId: client.id,
      items: [
        { productId: p1.id, quantity: 2 },
        { productId: p2.id, quantity: 3 },
      ],
      paymentMethod: 'card',
    })
    assert(res.status === 201, 'Crear venta')
    assert(res.body.total > 0, `Total venta positivo: $${res.body.total}`)
    assert(res.body.items.length === 2, 'Venta con 2 items')
    const saleId = res.body.id

    // Purchase
    res = await request('POST', '/purchases', {
      userId: user.id,
      supplierId: supplier.id,
      items: [{ productId: p1.id, quantity: 10, unitCost: 400 }],
    })
    assert(res.status === 201, 'Crear orden de compra')
    const purchaseId = res.body.id

    // Receive purchase (use the actual purchase ID)
    res = await request('PATCH', `/purchases/${purchaseId}/receive`)
    assert(res.status === 200 && res.body.status === 'received', 'Recibir orden de compra')

    // Stock verification
    res = await request('GET', `/products/${p1.id}`)
    assert(res.status === 200, 'Obtener stock P1')
    assert(res.body.stock === 28, `Stock P1 (20-2+10=28): ${res.body.stock}`)

    res = await request('GET', `/products/${p2.id}`)
    assert(res.status === 200, 'Obtener stock P2')
    assert(res.body.stock === 47, `Stock P2 (50-3=47): ${res.body.stock}`)

    // Reports
    res = await request('GET', '/sales')
    assert(res.status === 200 && Array.isArray(res.body), 'Listar ventas')

    res = await request('GET', '/sales/report/daily')
    assert(res.status === 200 && res.body.totalSales >= 1, 'Reporte diario')

    // Health
    res = await request('GET', '/health')
    assert(res.status === 200 && res.body.status === 'ok', 'Health check')

    console.log(`\n5. Resultados: ${passed} pasaron, ${failed} fallaron`)
  } catch (e) {
    console.error(`\nERROR: ${e.message}`)
    failed++
  } finally {
    await prisma.$disconnect()
    server.close()
    process.exit(failed > 0 ? 1 : 0)
  }
}

main()
