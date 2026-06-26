# Project: Spare Parts POS v2

## Location
C:\Users\admin\Desktop\postventa\spare-parts-pos-v2

## Repositorio GitHub
https://github.com/warchati/spare-parts-pos
- Rama: main
- Token en token.xlsx

## Tokens (ver token.xlsx)
C:\Users\admin\Desktop\postventa\token.xlsx

## Vercel (producción)
- Team ID: team_emFEjso4w4GpBnHXldl4bWMm
- Backend project ID: prj_kuuRyUPyElTAEN7xjj0aC8zrbJ7e
- Frontend project ID: prj_ASGlwTyyBu8eADafetUURi6JIK1B
- Repo ID: 1274132236
- URLs:
  - Frontend: https://pos-spare-parts.vercel.app
  - Backend: https://backend-postventa.vercel.app
  - Health: https://backend-postventa.vercel.app/api/health
- Notas:
  - Antes: `vercel build` + `vercel deploy --prebuilt` → DB caída (env vars no se vinculan con prebuilt)
  - Ahora: `vercel deploy --prod` (sin --prebuilt) → Vercel rebuilds online → env vars funcionan correctamente
  - Frontend renombrado de spare-parts-pos-web a pos-spare-parts para alias más limpio

## Deploy commands
Ver README.md sección "Cómo Hacer Cambios y Desplegar"

## Flujo para subir cambios (auto-deploy)
1. git add -A && git commit -m "mensaje" && git push origin main
2. ✅ GitHub Actions despliega automáticamente backend y frontend en Vercel

## Base de datos
- Neon PostgreSQL (producción): `postgresql://neondb_owner:npg_JG4cvObBfL7e@ep-empty-tree-aj6afcj9-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require`
- Supabase (secundaria)
- Prisma ORM
- .env local apunta a localhost; para cambios de schema usar la URL de Neon directamente

## Estructura
- backend/ - API Express + TypeScript
- web/ - Frontend React + Vite + Tailwind
- mobile/ - App Expo React Native
- shared/ - Tipos compartidos

## Session History

### Goal
Make the site fully responsive and add professional traceability features (expenses, audit log, price history).

### Constraints & Preferences
- All responsive changes must be CSS/layout only — zero impact on logic, APIs, state, routing, or data.
- New traceability features must be additive only — no changes to existing sales/purchases/inventory flows.

### Done (Sprint 1 — Responsive)
- **Sidebar responsive**: Layout.tsx — hamburger menu (+ overlay) in mobile, fixed sidebar in lg+; useState(false) toggle; sticky top bar with store name.
- **POS apilable**: flex-col lg:flex-row; right panel w-full lg:w-80; price column w-20 lg:w-24 text-sm lg:text-base.
- **Table scroll horizontal**: overflow-x-auto + min-w[N]px en Sales, Clients, Products, Suppliers, Purchases, Users, Vehicles, CreditPayments, Taxes, Currencies, Loyalty (clients + history), Permissions, TaxReport.
- **Headers con flex-wrap**: Sales, Clients, Products, Suppliers, Purchases, Users, Vehicles, Permissions.
- **Tabs/roles scroll**: Permissions.tsx + Loyalty.tsx tabs → overflow-x-auto pb-1.
- **Grids responsive**: CreditPayments → `grid-cols-1 sm:grid-cols-3`; StoreConfig → `flex-col md:flex-row`, inputs `grid-cols-1 sm:grid-cols-2` (both instances).
- **Build**: npm run build exits 0; commit c3bf278 pushed to main → auto-deploy Vercel.

### Done (Sprint 2 — Traceability)
- **Schema models added**: Expense, AuditLog, PriceHistory; unitCost Float? on SaleItem.
- **Opposite relations added**: User model → expenses[], auditLogs[], priceHistoryChanges[]; Product model → priceHistories[].
- **Backend lib/audit.ts**: helper logAudit() — creates AuditLog record, never fails the request.
- **Backend routes/expenses.ts**: CRUD + categories list + summary endpoint; uses requirePermission(expenses, edit), requireAnyPermission(expenses, [view, edit]), calls logAudit.
- **Backend routes/products.ts**: POST/UPDATE now call logAudit; UPDATE tracks buyPrice/sellPrice/wholesalePrice changes → PriceHistory.
- **Backend routes/sales.ts**: sale creation now persists unitCost: product.buyPrice in each SaleItem.
- **Backend routes/reports.ts**: uses item.unitCost ?? item.product?.buyPrice ?? 0 for cost calculation.
- **Backend middleware/auth.ts**: added expenses: ['view', 'edit'] to admin, expenses: ['view'] to supervisor, expenses: [] to cashier/seller.
- **Backend server.ts**: registered app.use('/api/expenses', expenseRoutes(prisma)).
- **Backend prisma/seed.ts**: added expenses to all four role permission maps.
- **Prisma generate + db push**: executed with Neon URL — schema synced to production DB.
- **Frontend Expenses.tsx**: full page with CRUD table, form modal, category filter, date range, summary cards, permission-gated actions.
- **Frontend Layout.tsx**: nav item for /expenses with TrendingDown icon.
- **Frontend App.tsx**: route for /expenses with PermissionGuard.
- **Frontend permissions.ts**: expenses: ['view', 'edit'] for admin, ['view'] for supervisor, [] for cashier/seller.
- **Frontend Permissions.tsx**: expenses added to MODULES / MODULE_LABELS / MODULE_ACTIONS.
- **Frontend Users.tsx**: expenses added to MODULES / MODULE_LABELS.
- **Builds exit 0**: both frontend (vite) and backend (tsc --noEmit).
- **Commit a9afff7** pushed to main → auto-deploy Vercel.

### Key Decisions
- Sidebar uses translate-x + overlay instead of a CSS-only peer-checked approach because React Router NavLink needs programmatic close on navigate.
- Audit logging is a fire-and-forget helper, not Express middleware, to keep route handlers clean and avoid accidentally blocking responses if audit DB write fails.
- unitCost nullable on SaleItem (backward-compatible: existing rows stay null, reports fallback to current product.buyPrice).
- PriceHistory logged per-field (one row per changed price field) for granular cost tracking.
