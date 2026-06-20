# Sistema POS - Repuestos de Autos (Spare Parts POS)

Sistema de punto de venta (POS) para tienda de repuestos de autos, con gestión de inventario, clientes, proveedores, ventas y compras.

---

## Tecnologías Utilizadas

| Capa | Tecnología | Versión |
|------|-----------|---------|
| **Backend** | Node.js + Express + TypeScript | Node 24, Express 5, TS 6 |
| **Base de datos** | PostgreSQL (Neon) | PostgreSQL 17 |
| **ORM** | Prisma | 5.22 |
| **Frontend (Web)** | React + Vite + TypeScript + Tailwind CSS | React 19, Vite 8, Tailwind 4 |
| **App Móvil** | React Native (Expo) | Expo 56 |
| **Autenticación** | JWT (token simple, no librería) | - |
| **Testing** | Jest + ts-jest | Jest 30 |
| **Git** | GitHub | - |

---

## Servidores y Servicios

### GitHub
- **URL:** https://github.com/warchati/spare-parts-pos
- **Token:** (configurado en variables de entorno)

### Vercel (Hosting)
- **Token:** (configurado en variables de entorno)

#### Backend (API)
- **URL Producción:** https://spare-parts-pos-backend.vercel.app
- **Health Check:** https://spare-parts-pos-backend.vercel.app/api/health
- **Login:** POST https://spare-parts-pos-backend.vercel.app/api/auth/login
- **Variables de entorno:**
  - `DATABASE_URL` = cadena de conexión a Neon PostgreSQL
  - `JWT_SECRET` = clave secreta para JWT

#### Frontend (Web POS)
- **URL Producción:** https://spare-parts-pos-web.vercel.app
- **Variables de entorno:**
  - `VITE_API_URL` = `https://spare-parts-pos-backend.vercel.app/api`

### Neon (Base de datos PostgreSQL)
- **Host:** ep-empty-tree-aj6afcj9-pooler.c-3.us-east-2.aws.neon.tech
- **Puerto:** 5432
- **Base de datos:** neondb
- **Usuario:** neondb_owner
- **Contraseña:** (configurada en variables de entorno)
- **SSL:** requerido (sslmode=require)
- **Connection String:**
  ```
  postgresql://neondb_owner:npg_JG4cvObBfL7e@ep-empty-tree-aj6afcj9-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require
  ```
- **Dashboard:** https://console.neon.tech (cuenta del usuario)

### Supabase (Base de datos secundaria - no usada en producción)
- **Project Ref:** pzslmfjabfyjzwchaahk
- **Host:** db.pzslmfjabfyjzwchaahk.supabase.co (solo IPv6)
- **Token API:** (configurado en variables de entorno)
- **Dashboard:** https://supabase.com/dashboard/project/pzslmfjabfyjzwchaahk

---

## Usuarios del Sistema

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `admin` | `admin123` | Administrador (acceso completo) |
| `cajero` | `cajero123` | Cajero (solo POS y consultas) |

---

## Endpoints del Backend

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Estado del servidor y DB |
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/register` | Registrar nuevo usuario |
| GET | `/api/products` | Listar productos (query: `?q=&active=true`) |
| POST | `/api/products` | Crear producto |
| PUT | `/api/products/:id` | Actualizar producto |
| PATCH | `/api/products/:id/stock` | Actualizar stock |
| GET | `/api/products/categories/list` | Listar categorías |
| GET | `/api/products/brands/list` | Listar marcas |
| GET | `/api/clients` | Listar clientes |
| POST | `/api/clients` | Crear cliente |
| PUT | `/api/clients/:id` | Actualizar cliente |
| GET | `/api/clients/credit/summary` | Resumen crédito clientes |
| GET | `/api/suppliers` | Listar proveedores |
| POST | `/api/suppliers` | Crear proveedor |
| PUT | `/api/suppliers/:id` | Actualizar proveedor |
| GET | `/api/sales` | Listar ventas |
| POST | `/api/sales` | Crear venta |
| GET | `/api/sales/report/daily` | Reporte diario |
| GET | `/api/sales/report/monthly` | Reporte mensual |
| GET | `/api/purchases` | Listar compras |
| POST | `/api/purchases` | Crear orden de compra |
| PATCH | `/api/purchases/:id/receive` | Recibir orden de compra |
| GET | `/api/reports` | Dashboard completo |
| GET | `/api/reports/sales` | Reporte ventas por fecha |
| GET | `/api/reports/products` | Estadísticas productos |
| GET | `/api/reports/credits` | Reporte créditos |
| GET | `/api/users` | Listar usuarios |
| POST | `/api/users` | Crear usuario |
| PUT | `/api/users/:id` | Actualizar usuario |
| PATCH | `/api/users/:id/status` | Activar/desactivar usuario |
| DELETE | `/api/users/:id` | Eliminar usuario |
| GET | `/api/cash-register` | Listar sesiones de caja |
| GET | `/api/cash-register/current` | Caja actual abierta |
| POST | `/api/cash-register` | Abrir caja |
| PATCH | `/api/cash-register/:id/close` | Cerrar caja |
| POST | `/api/cash-register/:id/movements` | Agregar movimiento |
| GET | `/api/vehicles` | Listar vehículos |
| POST | `/api/vehicles` | Crear vehículo |
| PUT | `/api/vehicles/:id` | Actualizar vehículo |
| DELETE | `/api/vehicles/:id` | Eliminar vehículo |
| POST | `/api/vehicles/:id/products` | Vincular producto a vehículo |
| GET | `/api/vehicle/brands` | Listar marcas de vehículos |
| GET | `/api/credit` | Listar pagos de crédito |
| POST | `/api/credit` | Registrar pago de crédito |
| GET | `/api/credit/clients` | Clientes con crédito |
| GET | `/api/exports/products/csv` | Exportar productos CSV |
| GET | `/api/exports/clients/csv` | Exportar clientes CSV |
| GET | `/api/exports/sales/csv` | Exportar ventas CSV |
| GET | `/api/exports/stock/csv` | Exportar stock CSV |
| GET | `/api/images/product/:productId` | Imágenes de producto |
| POST | `/api/images/product/:productId` | Agregar imagen |

---

## Estructura del Proyecto

```
spare-parts-pos/
├── backend/                 # API REST (Express + TypeScript)
│   ├── api/index.js         # Entry point para Vercel serverless
│   ├── src/
│   │   ├── server.ts        # App Express (rutas, middleware)
│   │   ├── index.ts         # Entry point local
│   │   ├── routes/          # Rutas de la API
│   │   └── middleware/      # Middleware (auth, error handler)
│   ├── prisma/
│   │   ├── schema.prisma    # Schema PostgreSQL (producción)
│   │   ├── schema.sqlite.prisma # Schema SQLite (testing)
│   │   ├── seed.ts          # Datos de prueba
│   │   └── test.db          # Base SQLite local
│   ├── vercel.json          # Config Vercel
│   └── package.json
├── web/                     # Frontend POS (React + Vite)
│   ├── src/
│   │   ├── pages/           # Dashboard, POS, Products, Clients, Suppliers
│   │   │                    # Sales, Purchases, Users, CashRegister
│   │   │                    # Vehicles, CreditPayments
│   │   ├── contexts/        # AuthContext
│   │   ├── components/      # Layout (sidebar + outlet)
│   │   ├── lib/api.ts       # Cliente Axios con JWT
│   │   ├── App.tsx          # Routing (12 rutas protegidas)
│   │   └── main.tsx         # Entry point
│   ├── vercel.json
│   └── package.json
├── mobile/                  # App Móvil (Expo/React Native)
│   ├── src/
│   │   ├── screens/         # Pantallas de la app
│   │   └── lib/             # Cliente API
│   └── package.json
├── shared/                  # Tipos compartidos
│   └── types.ts
├── docker-compose.yml       # PostgreSQL local para desarrollo
├── render.yaml              # Config para deploy en Render (alternativa)
└── setup.bat                # Script de setup local
```

---

## Cómo Ejecutar Localmente

### 1. Base de datos (PostgreSQL local con Docker)
```bash
docker-compose up -d
```

### 2. Backend
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
npm run dev
```
El backend corre en `http://localhost:3000`

### 3. Frontend
```bash
cd web
npm install
npm run dev
```
El frontend corre en `http://localhost:5173` (el proxy de Vite redirige `/api` a `localhost:3000`)

### 4. App Móvil
```bash
cd mobile
npm install
npx expo start
```

---

## Cómo Hacer Cambios y Desplegar

### 1. Hacer commits y push a GitHub
```bash
cd "C:\Users\admin\Desktop\postventa\spare-parts-pos-v2"
git add -A
git commit -m "descripción de los cambios"
git push origin main
```

### 2. Desplegar Backend en Vercel
Opción A — API (recomendado):
```bash
curl -s -X POST "https://api.vercel.com/v13/deployments?teamId=team_emFEjso4w4GpBnHXldl4bWMm" ^
  -H "Authorization: Bearer <TOKEN_VERCEL>" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"backend\",\"project\":\"backend\",\"target\":\"production\",\"gitSource\":{\"type\":\"github\",\"repoId\":1274132236,\"ref\":\"main\"}}"
```

Opción B — CLI (requiere .vercel/project.json):
```bash
cd backend
npx vercel deploy --prod --token <TOKEN_VERCEL>
```

### 3. Desplegar Frontend en Vercel
```bash
curl -s -X POST "https://api.vercel.com/v13/deployments?teamId=team_emFEjso4w4GpBnHXldl4bWMm" ^
  -H "Authorization: Bearer <TOKEN_VERCEL>" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"web\",\"project\":\"web\",\"target\":\"production\",\"gitSource\":{\"type\":\"github\",\"repoId\":1274132236,\"ref\":\"main\"}}"
```

### 4. Verificar estado del deploy
```bash
# Ver últimos deployments
curl -s "https://api.vercel.com/v6/deployments?teamId=team_emFEjso4w4GpBnHXldl4bWMm&limit=5" ^
  -H "Authorization: Bearer <TOKEN_VERCEL>"
```

### Tokens y claves
Están en `C:\Users\admin\Desktop\postventa\token.xlsx`:
| Servicio | Token |
|----------|-------|
| GitHub | `ghp_...` |
| Vercel | `vcp_...` |
| Supabase | `sbp_...` |
| Render | `rnd_...` |

### URLs de producción
- **Frontend (Web POS):** https://web-swart-seven-22.vercel.app
- **Backend (API):** https://backend-postventa.vercel.app
- **Health Check:** https://backend-postventa.vercel.app/api/health
- **Repositorio:** https://github.com/warchati/spare-parts-pos

### Notas importantes
- Siempre hacer `git push origin main` primero antes de desplegar
- Los tokens NO deben incluirse en commits o archivos públicos
- Si cambia el schema de Prisma, ejecutar `cd backend && npx prisma db push` antes de desplegar
- El VITE_API_URL del frontend apunta a `https://backend-postventa.vercel.app/api`

---

## Notas Importantes

- La base de datos en **Neon** está vinculada a la cuenta del usuario. No expira.
- Si se cambia la contraseña de Neon, actualizar `DATABASE_URL` en las variables de entorno de Vercel.
- El backend usa Prisma v5 (no v7) porque v7 tiene cambios incompatibles en la configuración.
- Las rutas del backend tienen el prefijo `/api/` (ej: `/api/products`, `/api/auth/login`).
- La app móvil (Expo) apunta al backend de producción. Para desarrollo local, cambiar la URL en `mobile/src/lib/`.
- Los tests usan SQLite local (`prisma/schema.sqlite.prisma`), no PostgreSQL.
- Los tokens están en un archivo seguro fuera del repositorio
- **Permisos por rol:** admin (todo), supervisor (casi todo), cashier (solo POS/ver), seller (POS + clientes)
- El frontend oculta menús y botones según el rol del usuario; el backend rechaza acciones no permitidas con 403
