# Estado Actual - Spare Parts POS v2

Última actualización: 26/06/2026 — Sesión SiteConfig

## ✅ Completado

### Última sesión (26/06) — SiteConfig + Sidebar Dinámico
- [x] **Schema `StoreConfig.description`** — Nuevo campo `description String @default("")` en `prisma/schema.prisma`.
- [x] **Prisma db push ejecutado** — Sincronizado con Neon (producción).
- [x] **Backend `storeConfig.ts` PUT** — Ahora acepta `description` y `logoUrl` (para logo subido a Cloudinary).
- [x] **Frontend `SiteConfig.tsx` (nueva)** — Página profesional con:
  - Nombre del negocio (input)
  - Descripción/Lema (textarea)
  - Logo: upload directo a Cloudinary (unsigned preset `m5vtjzdl`, carpeta `logos/`)
  - Preview en vivo del sidebar
  - Dispara evento `store-changed` al guardar
- [x] **Frontend `Layout.tsx` dinámico**:
  - Carga `storeConfig` al montar (`GET /store-config`)
  - Escucha evento `store-changed` para refrescar sin recargar página
  - Sidebar: logo (img o icono fallback), nombre dinámico, descripción dinámica
  - Header mobile: mismo comportamiento
  - Nav item `/site-config` con icono `Store` (visible solo para admin via `storeConfig:edit`)
- [x] **Frontend `App.tsx`** — Ruta `/site-config` con `PermissionGuard`
- [x] **Builds exitosos** — frontend (vite) + backend (tsc --noEmit)
- [x] **Commit `7ffca8e`** pusheado a `main` → auto-deploy Vercel

### Sesión anterior (25/06 — tercera parte) — Módulo Returns + Permisos Reactivos
- [x] **Nuevo módulo `returns` independiente** — Separado de `sales:view/edit`, con su propio permiso (`returns:view/edit`).
- [x] **Endpoint de devoluciones cambiado** — En `sales.ts`: `sales:view` → `returns:view`, `sales:edit` → `returns:edit` para las rutas de devolución.
- [x] **Backend `auth.ts` actualizado** — Mapa `PERMISSIONS` con módulo `returns` para cada rol:
  - admin/supervisor: `returns: ['view', 'edit']`
  - cashier/seller: `returns: []`
- [x] **Seed actualizado** — `permDefs` incluye `returns` + `permissions: ['edit']` para admin (antes faltaba, causaba que admin perdiera acceso a Permissions).
- [x] **Frontend `Permissions.tsx`** — Tabla de permisos incluye módulo `returns` y `loyalty`.
- [x] **Indicador visual de acciones recomendadas**:
  - Fondo azul claro (`bg-blue-50/40`) para acciones típicas de cada módulo.
  - Opacidad reducida (`opacity-40`) para acciones no aplicables.
  - Leyenda de colores al pie de la tabla.
- [x] **`PermissionGuard` reactivo** — En `App.tsx` usa `permissions` del contexto de Auth directamente (no depende de `_cachedPermissions`).
- [x] **`Layout.tsx` reactivo** — Filtra nav items con `permissions` del contexto de Auth.
- [x] **Backend `/mine` sin merge hardcoded** — Eliminada la fusión con `PERMISSIONS`. `/mine` devuelve exclusivamente registros de DB + overrides de usuario. Admin puede dar o quitar cualquier permiso sin pisoteos del mapa hardcoded.
- [x] **Permisos reactivos en frontend** — Se eliminó `_cachedPermissions` (variable de módulo obsoleta). Ahora `can()` verifica primero `_latestPermissions` (global ref) que se actualiza con cada respuesta de `/mine`.
- [x] **`AuthContext` con auto-refresh**:
  - `visibilitychange`: refresca permisos al volver a la pestaña.
  - Polling 60s: refresca permisos aunque el usuario esté activo.
- [x] **Limpieza de DB** — Registros huérfanos de cashier eliminados (`cashRegister`, `returns` en `RolePermission` y `UserPermission`).
- [x] **Fresh deploy Vercel** — Commit `e97002f` desplegado exitosamente.

### Sesión anterior (25/06 — segunda parte) — Migración + Verificación Lealtad
- [x] **Verificación de migración** — Se confirmó que las tablas `LoyaltyConfig`, `LoyaltyTransaction` y columna `pointsBalance` **ya existían** en Neon (aplicadas por auto-deploy de Vercel).
- [x] **Migración registrada en Prisma** — Se ejecutó `prisma migrate resolve --applied 20260624235043_add_loyalty_system` para que Prisma reconozca la migración. Ahora `prisma migrate status` → "Database schema is up to date!".
- [x] **Endpoint `/api/loyalty/config` verificado** — Responde correctamente (200 con credenciales, 401 sin token).
- [x] **Flujo completo de lealtad probado en producción:**
  - Venta INV-2026-0018: cliente Hassan ganó **181 pts** (78 → 259)
  - Venta INV-2026-0020: canje de **400 pts** (descuento 20 DH), ganó 506 pts
  - Cancelación INV-2026-0020: reversión correcta (506 pts ganados quitados, 400 pts canjeados restaurados)
  - Saldo final Hassan: **422 pts** (correcto)
- [x] **Endpoint de cancelación verificado** — `PATCH /api/sales/:id/cancel` con `cancelReason` en body.

### Sesión anterior — Sistema de Puntos de Lealtad (25/06 — primera parte)
- [x] **Schema DB**: +`Client.pointsBalance`, +`Sale.pointsEarned/Redeemed`, +`LoyaltyConfig`, +`LoyaltyTransaction` con auditoría completa.
- [x] **Migración SQL** generada manualmente para Neon PostgreSQL.
- [x] **Ruta API `/api/loyalty`**: config, clientes con puntos, historial de transacciones, cálculo de canje.
- [x] **Ventas con puntos**: canje de puntos como descuento, ganancia de puntos en cada venta. Todo atómico en transacción.
- [x] **Reversión automática**: cancelación de venta devuelve puntos ganados + restaura puntos canjeados. Devolución parcial revierte proporcionalmente.
- [x] **Página Lealtad** en frontend: tabla de clientes con puntos, historial completo, configuración del sistema.
- [x] **POS modificado**: muestra puntos del cliente, permite canjear, descuento visual en tiempo real.
- [x] **Clientes modificado**: columna "Puntos" con badge.
- [x] **Permisos**: módulo `loyalty` para admin (view/edit/redeem), supervisor/cashier/seller (view/redeem).
- [x] **Seed actualizado**: config por defecto (1 punto cada 10 DH, 100 puntos = 5 DH, caducidad 12 meses).
- [x] **Commit y push** a `main` — GitHub Actions despliega automáticamente.

### Sesiones anteriores
- [x] CORS configurado solo para `pos-spare-parts.vercel.app` + localhost
- [x] Helmet, rate limiting, error handler con mensajes seguros
- [x] Auth con bcrypt + JWT (24h exp)
- [x] Mass assignment eliminado en CRUDs
- [x] Stock atómico con transacciones (sales, cash register)
- [x] Seed con bcrypt (passwords hasheadas)
- [x] Deploy auto via GitHub Actions (Vercel CLI, sin `--prebuilt`)
- [x] DB conectada (Neon PostgreSQL)
- [x] Proyecto frontend renombrado a `pos-spare-parts`

## 🔄 Pendiente

### Mejoras
- [ ] Agregar footer o sidebar con la versión del sistema
- [ ] Pruebas de carga / stress test
- [ ] Backup automático de la DB Neon
- [ ] Tests automatizados (backend + frontend)

### Tokens (opcional)
- [ ] Rotar Supabase/Render tokens — No crítico (ya no se usan), pero están expuestos

## 🔴 Problemas Conocidos
1. Supabase/Render tokens en `render.yaml` y `token.xlsx` (opcional rotar, ya no se usan)
2. El campo del body para canje de puntos es `pointsToRedeem` (no `pointsRedeemed`)
3. El campo del body para cancelación es `cancelReason` (no `reason`), método `PATCH`

## 📐 Arquitectura de Permisos (actual)

### Backend
- **`backend/src/middleware/auth.ts`** — Mapa `PERMISSIONS` hardcoded (usado solo por middleware `hasPermission` como fallback si no hay registro en DB)
- **`backend/src/routes/permissions.ts`** — Endpoints:
  - `GET /roles` — todos los `RolePermission` agrupados por rol
  - `PUT /roles/:role` — reemplaza todos los permisos de un rol
  - `GET /mine` — permisos efectivos del usuario autenticado (solo DB + user overrides, sin merge hardcoded)
- **`backend/src/routes/users.ts`** — Endpoints:
  - `GET /:id/permissions` — permisos de un usuario específico (rol + overrides)
  - `PUT /:id/permissions` — overrides por usuario (`UserPermission`)
- **Tablas DB**: `RolePermission` (rol→módulo→acción), `UserPermission` (usuario→módulo→acción→granted)

### Frontend
- **`web/src/lib/permissions.ts`** — `_latestPermissions` global ref que se actualiza con cada `/mine`. `can()` lo usa primero, cae a hardcoded solo si vacío.
- **`web/src/contexts/AuthContext.tsx`** — `permissions` state + `refreshPermissions()` + visibilitychange + polling 60s.
- **`web/src/App.tsx`** — `PermissionGuard` usa `permissions` del contexto.
- **`web/src/components/Layout.tsx`** — Filtra nav items con `permissions` del contexto.
- **`web/src/pages/Permissions.tsx`** — UI de gestión con indicadores de acciones recomendadas.

### Flujo de reactividad
1. Admin modifica permisos en página Permissions → `PUT /permissions/roles/:role`
2. Cashier (logueado) recibe cambios por:
   - `visibilitychange` — al volver a la pestaña
   - Polling cada 60s — estando activo
3. `refreshPermissions()` → `GET /mine` → `setPermissions()` + `updateLatestPermissions()`
4. `can()` ahora usa `_latestPermissions` actualizado → UI refleja cambios

## 📦 Últimos commits
```
6e013f8 fix: login espera refreshPermissions antes de navegar
e97002f fix: permisos reactivos con global ref, visibilitychange y polling 60s
9e52ec3 ci: retrigger deploy
7317875 fix: eliminar merge hardcoded de /mine, solo refleja DB
9f4a0dc ci: trigger fresh backend deploy
641a532 fix: permisos reactivos desde contexto + permissions:edit en seed admin
f38e937 fix: permisos de DB respetados sin merge hardcoded + route guards faltantes
9e3351d feat: indicador visual de acciones recomendadas en tabla de permisos
8372a0a feat: nuevo módulo returns independiente con gestión desde página de permisos
```

## 🌐 URLs producción
- Frontend: https://pos-spare-parts.vercel.app
- Backend: https://backend-postventa.vercel.app
- Repo: https://github.com/warchati/spare-parts-pos

## 👤 Credenciales prueba
| Usuario | Contraseña | Rol |
|---|---|---|
| admin | admin123 | admin |
| cajero | cajero123 | cashier |
| 15198 | 11598545 | supervisor |
| vendedor | vendedor123 | seller |

## 📁 Archivos clave modificados en esta sesión
- `backend/src/routes/permissions.ts` — `/mine` sin merge hardcoded
- `backend/src/routes/sales.ts` — endpoints returns con `returns:view/edit`
- `backend/src/middleware/auth.ts` — `PERMISSIONS` con módulo `returns`
- `backend/prisma/seed.ts` — `permDefs` con `returns` + `permissions:edit`
- `backend/prisma/migrations/` — migración loyalty
- `web/src/lib/permissions.ts` — `_latestPermissions` + `updateLatestPermissions`
- `web/src/contexts/AuthContext.tsx` — auto-refresh (visibilitychange + polling)
- `web/src/App.tsx` — `PermissionGuard` reactivo con rutas
- `web/src/components/Layout.tsx` — nav reactivo con `permissions`
- `web/src/pages/Permissions.tsx` — acciones recomendadas + colores
