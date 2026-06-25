# Estado Actual del Proyecto

## URLs
- **Frontend**: https://pos-spare-parts.vercel.app
- **Backend**: https://backend-postventa.vercel.app
- **Health**: https://backend-postventa.vercel.app/api/health
- **Repositorio**: https://github.com/warchati/spare-parts-pos (rama: main)
- **DB**: Neon PostgreSQL

## Credenciales
- Admin: admin / admin123
- Cajero: cajero / cajero123

## Commits recientes (nuevo → viejo)
| Commit | Mensaje |
|--------|---------|
| `244e9f3` | fix: guardar tax rate al crear venta para que TVA aparezca en factura |
| `1cafd6d` | fix: barcodes apilados verticalmente (NCF debajo de factura) |
| `330ea7e` | feat: factura profesional con barcodes, configuracion de empresa y logo |
| `6e013f8` | fix: login espera refreshPermissions antes de navegar |
| `e97002f` | fix: permisos reactivos con global ref, visibilitychange y polling 60s |
| `9e52ec3` | ci: retrigger deploy |
| `7317875` | fix: eliminar merge hardcoded de /mine, solo refleja DB |
| `9f4a0dc` | ci: trigger fresh backend deploy |
| `641a532` | fix: permisos reactivos desde contexto + permissions:edit en seed admin |
| `f38e937` | fix: permisos de DB respetados sin merge hardcoded + route guards faltantes |
| `9e3351d` | feat: indicador visual de acciones recomendadas en tabla de permisos |
| `8372a0a` | feat: nuevo módulo returns independiente con gestión desde página de permisos |

## Últimas funcionalidades implementadas (sesión actual)

### 1. Factura Profesional
- Nuevo componente `InvoiceReceipt.tsx` con diseño profesional
- Header: logo (subible por admin), nombre empresa, RNC, dirección, teléfono, email
- Datos: cliente, RNC/doc, vendedor, fecha, hora, método de pago
- Tabla de items: cantidad, descripción, precio unitario, total
- Subtotal, descuento (solo si > 0), TVA con tasa (XX%), descuento puntos, total
- **2 códigos de barras CODE128** (número de factura + NCF) apilados verticalmente
- Estilos `@media print` con tamaño 80mm para impresión térmica
- Modal interactivo con botones "Imprimir" y "Cerrar"

### 2. Integración en POS
- Al completar una venta, se guarda la respuesta del endpoint (con `user` incluido)
- Se abre automáticamente el modal de factura con los datos de la venta
- Se carga la configuración de empresa desde `/api/store-config`

### 3. Integración en Ventas
- Botón "Ver Factura" reemplaza al viejo `window.print()` en el detalle de venta
- Carga configuración de empresa on-demand

### 4. Configuración de Factura (Admin)
- Nueva página `/invoice-config` protegida con permiso `storeConfig: edit`
- Formulario: nombre empresa, RNC, dirección, teléfono, email
- Upload de logo (imagen → data URL → base64 en DB)
- Campo NCF editable (Comprobante Fiscal)
- Solo visible para admin y supervisor

### 5. Almacenamiento en DB
- Nueva tabla `StoreConfig` (singleton, id=1)
- Datos: companyName, rnc, address, phone, email, logoUrl, ncf
- Endpoints: `GET /store-config`, `PUT /store-config`, `POST /store-config/logo`
- Migración `20260625000001_add_store_config` aplicada y registrada

### 7. Fix: TVA no aparecía en factura
- El backend no guardaba el campo `tax` (tasa porcentual) al crear la venta, solo `taxTotal` (monto calculado)
- La factura chequeaba `sale.tax > 0` y como siempre era 0, la línea de TVA no se mostraba
- Fix: se calcula y almacena `taxRate` (tasa efectiva ponderada o tasa del impuesto default) en el campo `tax` de Sale
- Ahora la factura muestra `TVA (XX%)` correctamente para ventas nuevas

### 8. Fix: Barcodes apilados verticalmente
- Cambiado layout de barcodes de `flex justify-center gap-6` (horizontal) a `flex flex-col items-center gap-3` (vertical)
- NCF aparece debajo del número de factura, como en facturas profesionales

### 9. Permisos
- Nuevo módulo `storeConfig` con acciones `view`/`edit`
- Asignado a admin y supervisor
- Seed actualizado con permisos en DB
- Frontend `permissions.ts` actualizado

## Archivos nuevos
| Archivo | Propósito |
|---------|-----------|
| `backend/prisma/migrations/20260625000001_add_store_config/` | Migración StoreConfig |
| `backend/src/routes/storeConfig.ts` | Endpoints de configuración |
| `web/src/pages/InvoiceReceipt.tsx` | Componente factura profesional |
| `web/src/pages/StoreConfig.tsx` | Página admin de configuración |

## Archivos modificados
| Archivo | Cambio |
|---------|--------|
| `backend/prisma/schema.prisma` | + modelo `StoreConfig` |
| `backend/prisma/seed.ts` | + permisos `storeConfig` |
| `backend/src/middleware/auth.ts` | + permiso `storeConfig` |
| `backend/src/routes/sales.ts` | + `user: true` en POST response; + `taxRate` guardado al crear venta |
| `backend/src/server.ts` | + ruta `/api/store-config` |
| `web/package.json` | + dependencia `jsbarcode` |
| `web/package-lock.json` | actualizado |
| `web/src/App.tsx` | + ruta `/invoice-config` |
| `web/src/components/Layout.tsx` | + nav item "Config. Factura" |
| `web/src/lib/permissions.ts` | + módulo `storeConfig` |
| `web/src/pages/POS.tsx` | + modal factura post-venta |
| `web/src/pages/Sales.tsx` | + botón "Ver Factura" |

## Pendientes / Issues conocidos
1. **Imágenes de productos** — Almacenadas como base64 en `ProductImage.url`, no cargan en producción por límites de Vercel (4.5MB respuesta) y navegador (2MB data URL). Pendiente migrar a Vercel Blob Storage.
2. **TVA para cajero** — `taxes: []` para cashier, falta agregar `taxes: ['view']` para que vea TVA en POS.
3. **TVA en ventas viejas** — Ventas creadas antes del fix tienen `tax = 0`, la TVA no se muestra en su factura. Pendiente script de backfill.
4. **Auto-incremento de NCF** — Actualmente el admin lo actualiza manualmente en Config. Factura. Se podría auto-incrementar tras cada venta.
5. **Factura en PDF** — Solo HTML imprimible por ahora. jsPDF ya está instalado si se quiere agregar descarga PDF.
