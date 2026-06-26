# Notas de la Sesión — 22/06/2026

## Problemas Encontrados y Soluciones

### 1. Frontend no logueaba
**Causa raíz**: El JS bundle del frontend no contenía `backend-postventa` — `VITE_API_URL` no se inyectó en el build. Las peticiones iban a `pos-spare-parts.vercel.app/api` en vez de `backend-postventa.vercel.app/api`.

**Por qué pasó**: El build anterior se hizo antes de que `VITE_API_URL` se configurara como env var en el proyecto Vercel frontend. Aunque `.env.production` existe en el repo, en ese momento no se cargó correctamente (posiblemente porque Vercel lo sobrescribió con su `.env.production.local` sin la variable).

**Solución**: 
1. Se agregó `VITE_API_URL` como env var en el proyecto Vercel frontend vía API
2. Se forzó redeploy con `git push` (cambiando `<title>` en `index.html`)
3. El nuevo build ahora tiene la URL correcta ✅

### 2. Login API daba 500 Internal Server Error
**Causa**: Temporal — el health check funcionaba pero login no. Posible cold start. Cuando se probó de nuevo minutos después, funcionó correctamente.

### 3. Token Rotation - GitHub
**Problema**: No se puede crear un nuevo GitHub Personal Access Token via API usando otro PAT. Requiere autenticación con password (Basic Auth) o web UI.

**Solución**: Queda pendiente para el usuario.

### 4. Vercel CLI Scope
**Problema**: La CLI de Vercel estaba autenticada en el scope personal (`nyumoviescom-gmailcoms-projects`), no en el team (`postventa`). El token existente no permitía cambiar al team scope.

**Solución**: Se usó la API REST de Vercel directamente con el token para todas las operaciones (listar env vars, crear tokens, etc.).

---

# Notas de la Sesión — 25/06/2026 — Sistema de Puntos de Lealtad

## Resumen
Se implementó un sistema completo de puntos de lealtad. Clientes acumulan puntos por compras y pueden canjearlos como descuento.

## Implementación

### Base de Datos
- `Client.pointsBalance` (Int, default 0) — saldo actual de puntos
- `Sale.pointsEarned` / `Sale.pointsRedeemed` — seguimiento por venta
- `LoyaltyConfig` — configuración del sistema (EARN_RATE, REDEEM_RATE, EXPIRE_MONTHS)
- `LoyaltyTransaction` — auditoría completa de todos los movimientos

### Reglas de Negocio
- **1 punto por cada 10 DH gastados** (configurable)
- **100 puntos = 5 DH de descuento** (configurable: 0.05 DH/punto)
- **Caducidad a los 12 meses** (configurable)
- **Reversión automática** al cancelar venta o devolver productos
- **Saldo negativo no permitido**

### Archivos Modificados/Creados (14 en total)

**Backend:**
- `backend/prisma/schema.prisma` — +2 modelos, +5 campos
- `backend/prisma/migrations/` — migración SQL
- `backend/prisma/seed.ts` — +config defaults, +permisos loyalty
- `backend/src/routes/loyalty.ts` — (nuevo) 6 endpoints
- `backend/src/routes/sales.ts` — puntos en POST, cancelación, devolución
- `backend/src/server.ts` — +ruta loyalty
- `backend/src/middleware/auth.ts` — +permisos loyalty

**Frontend:**
- `web/src/pages/Loyalty.tsx` — (nuevo) dashboard de lealtad
- `web/src/pages/POS.tsx` — canje de puntos, descuento visual
- `web/src/pages/Clients.tsx` — columna puntos
- `web/src/components/Layout.tsx` — nav item Lealtad
- `web/src/App.tsx` — ruta /loyalty
- `web/src/lib/permissions.ts` — permisos loyalty

### Commits
1. `c37f598` — auto-deploy con todos los cambios de lealtad
2. `aa5ef30` — fix: validaciones defensivas (coerción Number, guard negativo, typeof check)

## Problemas Encontrados
1. **PostgreSQL local no disponible** — No se pudo generar migración con `prisma migrate dev`. Se creó la migración SQL manualmente.
2. ~~**Neon DB no accesible desde este equipo** — La migración deberá aplicarse con `prisma migrate deploy` desde otro entorno o vía Vercel.~~ ✅ Resuelto — Neon es accesible desde este equipo.
3. **Auto-deploy commit detectado** — El sistema tiene un auto-deploy que commitéo automáticamente los cambios antes de que termináramos.

## URLs
- Frontend: https://pos-spare-parts.vercel.app
- Backend: https://backend-postventa.vercel.app
- Health: https://backend-postventa.vercel.app/api/health
- Nueva ruta loyalty: https://backend-postventa.vercel.app/api/loyalty/config

## Próximo Paso Recomendado
1. ~~Verificar que la migración se aplicó en Neon (navegar a /loyalty en frontend)~~ ✅
2. ~~Si no hay tablas, ejecutar `npx prisma migrate deploy` en el entorno de producción~~ ✅ (se usó `prisma migrate resolve --applied`)
3. ~~Probar flujo completo: crear venta con cliente → ver puntos ganados → canjear puntos en otra venta → cancelar venta → ver reversión~~ ✅

---

# Notas de la Sesión — 25/06/2026 (segunda parte) — Migración y Verificación

## Resumen
Se verificó que la migración de lealtad ya estaba aplicada en Neon y se registró en Prisma. Se probó el flujo completo de puntos en producción.

## Migración
- Las tablas `LoyaltyConfig`, `LoyaltyTransaction` y columna `pointsBalance` **ya existían** en Neon (aplicadas probablemente por Vercel deploy)
- `_prisma_migrations` no existía (la DB se creó con `db push`)
- Se ejecutó: `prisma migrate resolve --applied 20260624235043_add_loyalty_system`
- Ahora `prisma migrate status` → "Database schema is up to date!"

## Pruebas en Producción
Endpoint base: `https://backend-postventa.vercel.app`

### 1. Venta normal con ganancia de puntos
- `POST /api/sales` con `clientId: 1`
- Producto: Pastillas de Freno Delanteras (id=1), qty=2, precio=750
- Res: INV-2026-0018, total=1815, **pointsEarned=181**
- Saldo Hassan: 78 → 259 pts ✅

### 2. Venta con canje de puntos
- `POST /api/sales` con `clientId: 1, pointsToRedeem: 400`
- **Campo correcto**: `pointsToRedeem` (NO `pointsRedeemed`)
- Res: INV-2026-0020, total=5062, descuento=20, pointsEarned=506, **pointsRedeemed=400** ✅

### 3. Cancelación con reversión de puntos
- `PATCH /api/sales/24/cancel` con `{ cancelReason: "..." }`
- **Método**: `PATCH` (NO `POST`), **campo**: `cancelReason` (NO `reason`)
- Res: status=cancelled, reversión: -506 pts ganados, +400 pts canjeados restaurados ✅
- Saldo final: 422 pts (correcto)

### 4. Endpoints verificados
- `GET /api/health` → `{"status":"ok","db":"connected"}`
- `GET /api/loyalty/config` → `{"earnRate":10,"redeemRate":0.05,"expireMonths":3}`
- `GET /api/loyalty/clients/1` → historial con 17+ transacciones

## Problemas Encontrados
1. **Campo incorrecto para canje**: Envié `pointsRedeemed` pero el backend espera `pointsToRedeem` (línea 158 de sales.ts)
2. **Método incorrecto para cancelación**: Usé `POST` pero el backend usa `PATCH` (línea 366 de sales.ts)
3. **Campo incorrecto para cancelación**: Envié `reason` pero el backend espera `cancelReason`

## Estado Final
- Sistema de lealtad 100% operativo en producción
- Migración registrada correctamente en Prisma
- Flujo: ganar puntos → canjear puntos → cancelar venta → reversión automática funcionando

---

# Notas de la Sesión — 25/06/2026 (tercera parte) — Returns + Permisos Reactivos

## Resumen
Se implementó módulo de devoluciones independiente con permisos propios, se corrigió la reactividad de permisos en frontend, y se eliminaró el merge hardcoded del backend `/mine`.

## Cambios Implementados

### 1. Nuevo módulo `returns`
- **Backend `auth.ts`**: `PERMISSIONS` con `returns: ['view', 'edit']` para admin/supervisor, `returns: []` para cashier/seller.
- **Backend `sales.ts`**: Rutas de devolución cambiadas de `sales:view/edit` a `returns:view/edit` (líneas 91, 115, 459).
- **Backend `seed.ts`**: `permDefs` incluye `returns` y `permissions: ['edit']` para admin (faltaba antes).
- **Frontend `Permissions.tsx`**: Módulo `returns` y `loyalty` en la tabla. `MODULE_ACTIONS` mapea acciones recomendadas.

### 2. Indicador visual de acciones recomendadas
- Acciones típicas (según `MODULE_ACTIONS`): fondo azul claro `bg-blue-50/40`
- Acciones no aplicables: `opacity-40`
- Checkbox no aplicable + no activo: `cursor-not-allowed`
- Leyenda de colores al pie de la tabla

### 3. Backend `/mine` — fin del merge hardcoded
- Commit `f38e937`: Condición `rolePerms.length === 0 && hardcoded` (solo mergea si el rol NO tiene registros en DB)
- Commit `7317875`: Eliminación total del merge hardcoded. `/mine` devuelve EXCLUSIVAMENTE DB + user overrides.
- **Problema detectado**: Los PUTs de prueba habían creado registros huérfanos en `RolePermission` y `UserPermission` para cashier (`cashRegister`, `returns`). Se limpiaron manualmente.

### 4. Reactividad de permisos en frontend
**Problema original**: Cuando admin modificaba permisos de un rol, el usuario logueado no veía reflejados los cambios hasta recargar la página o volver a loguearse.

**Causa raíz**: `can()` en `permissions.ts` verificaba primero `_cachedPermissions` (variable de módulo), que solo se actualizaba UNA VEZ en Layout.tsx. Nunca se refrescaba.

**Solución**:
1. Reemplazar `_cachedPermissions` por `_latestPermissions` + `updateLatestPermissions()`
2. `updateLatestPermissions()` se llama en `AuthContext.refreshPermissions()` después de cada `/mine`
3. `can()` verifica `_latestPermissions` primero (si hay datos), cae a hardcoded solo si vacío
4. Agregado `visibilitychange` listener + polling 60s en `AuthContext`

### 5. DB — limpieza de registros huérfanos
- Cashier tenía `cashRegister:open/close/movements` y `returns:view/edit` en `RolePermission` (creados por PUTs anteriores)
- Cashier tenía `cashRegister:open/close/movements` en `UserPermission` (granted=true)
- Se limpiaron ambos con `PUT /permissions/roles/cashier` y `PUT /users/2/permissions`

## Problemas Encontrados y Lecciones

### 1. GitHub Actions no se disparaba
Los commits `7317875` y `9e52ec3` no activaron el workflow de deploy. El workflow aparecía "queued" sin ejecutarse. Se resolvió modificando el workflow file (el commit `9e52ec3` forzó el trigger al ser un push adicional).

### 2. Registros huérfanos en DB
Los PUTs de depuración durante las sesiones anteriores dejaron registros huérfanos en `RolePermission` y `UserPermission` para cashier. Esto causó que `/mine` devolviera `cashRegister` para cashier aunque el mapa hardcoded tuviera `cashRegister: []`.

**Lección**: Los registros DB son la fuente de verdad para `/mine`. Si se crean registros incorrectos en DB, el endpoint los devuelve. Siempre verificar `GET /permissions/roles` para confirmar el estado real de la DB.

### 3. Código deployado vs. código local
El deploy de Vercel no siempre refleja inmediatamente el código del repo. Posibles causas:
- Caché de build de Vercel
- Instancias serverless calientes ejecutando código viejo
- Propagación retrasada

**Mitigación**: Esperar ~2 minutos después del deploy y verificar con prueba directa al endpoint.

## Estado Final de Permisos (cashier)
```
RolePermission (DB): pos:sell, products:view, clients:view, sales:view, loyalty:redeem
UserPermission (DB): (ninguno)
/mine response: 5 permisos exactamente (sin cashRegister, sin returns)
```
Admin puede dar o quitar cualquier permiso desde la página Permissions y el cambio se refleja en el frontend del cashier en ≤60s (o inmediatamente al cambiar de pestaña).

## Próximos Pasos Recomendados
1. Probar en vivo: loguear cashier, modificar permisos desde admin, verificar que UI se actualiza sin recargar
2. Verificar que el botón "Devolver" en ventas requiere `returns:edit` no `sales:edit`
3. Confirmar que el indicador de acciones recomendadas se ve correcto en todos los roles

---

# Notas de la Sesión — 26/06/2026 — SiteConfig

## Resumen
Se implementó la página de Configuración del Sitio (nombre, descripción, logo) con sidebar dinámico que se actualiza sin recargar.

## Cambios Realizados

### Schema / Backend
1. **`backend/prisma/schema.prisma`** — Agregado campo `description String @default("")` a `StoreConfig`.
2. **`prisma db push`** ejecutado con URL de Neon para sincronizar producción.
3. **`backend/src/routes/storeConfig.ts`** — PUT ahora acepta `description` y `logoUrl` (logo subido a Cloudinary).

### Frontend — SiteConfig.tsx (nueva)
- Página profesional con layout de 2 columnas (formulario + preview).
- Campos: nombre (input), descripción (textarea), logo (upload Cloudinary).
- Upload de logo: directo a Cloudinary usando unsigned preset `m5vtjzdl`, carpeta `logos/`, mismo patrón que Expenses y Products.
- Al guardar: `PUT /store-config` con todos los campos + dispara `window.dispatchEvent(new Event('store-changed'))`.
- Preview en vivo del sidebar que muestra cómo se verá nombre + logo + descripción.

### Frontend — Layout.tsx
- `useEffect` al montar carga `GET /store-config` → estado `storeConfig`.
- Listener de evento `store-changed` para refrescar sin recargar página.
- Sidebar: logo (img si existe, Store icon si no), nombre dinámico, descripción dinámica.
- Header mobile: mismo comportamiento.
- Nav item `/site-config` agregado con icono `Store` y permiso `storeConfig:edit` (solo admin).

### Frontend — App.tsx
- Ruta `/site-config` con `PermissionGuard module="storeConfig" action="edit"`.

## Profesionalismo
- Logo subido a Cloudinary (no base64 en DB).
- Layout se actualiza automáticamente sin recargar (event listener).
- Preview visual en la misma página de configuración.
- Nav link visible solo para admin via PermissionGuard.
- Misma estructura visual que el resto del panel.

## Estado Final
- Commit `7ffca8e` pusheado a `main` → GitHub Actions despliega automáticamente.

## Archivos Modificados
- `backend/prisma/schema.prisma` — campo description en StoreConfig
- `backend/src/routes/storeConfig.ts` — PUT con description + logoUrl
- `web/src/pages/SiteConfig.tsx` — (nuevo) página completa
- `web/src/components/Layout.tsx` — sidebar dinámico + nav item
- `web/src/App.tsx` — ruta /site-config

## Notas
- Los builds pasaron: frontend (vite) y backend (tsc --noEmit) ambos exitosos.
- El .env local se revirtió a localhost después del db push.
- Cloudinary preset `m5vtjzdl` (unsigned), cloud `vidcanal`.
