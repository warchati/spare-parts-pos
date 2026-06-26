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
Responsive + traceability + SiteConfig + sidebar dinámico + (next: lo que pida el usuario).

### Current State (26/06/2026)
- **SiteConfig page** done: name, description, logo (Cloudinary upload), live sidebar preview.
- **Layout.tsx** loads `storeConfig` dynamically + listens for `store-changed` event.
- Nav item `Config. Sitio` at `/site-config`, admin-only (`storeConfig:edit`).
- All previous modules fully functional: responsive sidebar, expenses, audit log, price history, file attachments, tax report with IVA deduction, product images, loyalty points, returns module, reactive permissions.

### Key Architecture
- **Frontend**: React 19 + Vite 6 + Tailwind 4 + React Router 7 + Axios
- **Backend**: Express 4 + TypeScript + Prisma 5 + PostgreSQL (Neon)
- **Deploy**: GitHub Actions → Vercel (push to `main` = auto-deploy)
- **Cloudinary**: `vidcanal`, unsigned preset `m5vtjzdl` — folders: `expenses/`, `logos/`, `products/`
- **DB**: Neon PostgreSQL — `postgresql://neondb_owner:npg_JG4cvObBfL7e@ep-empty-tree-aj6afcj9-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require`
- **Local .env**: points to localhost — switch to Neon URL for `prisma db push` then revert

### Permissions (per `/api/permissions/mine`)
- Reactivo: `_latestPermissions` global ref + `AuthContext` with visibilitychange + polling 60s
- `/mine` returns ONLY DB records + user overrides (no hardcoded merge)
- Permissions page has visual indicators for recommended actions per module

### Credentials
| User | Password | Role |
|------|----------|------|
| admin | admin123 | admin |
| cajero | cajero123 | cashier |
| 15198 | 11598545 | supervisor |
| vendedor | vendedor123 | seller |

### Last commit
`7ffca8e` — "feat: SiteConfig - store name, description, logo with Cloudinary + live sidebar preview" (pushed to main → auto-deploy Vercel)

### Important Notes
- Always run `npm run build` (frontend) and `npx tsc --noEmit` (backend) before committing.
- For schema changes: edit `schema.prisma`, switch `.env` to Neon URL, run `prisma generate && prisma db push`, revert `.env` to localhost.
- For feature permissions: add to `backend/src/middleware/auth.ts` (PERMISSIONS map), `backend/prisma/seed.ts`, `web/src/lib/permissions.ts`.
- Cloudinary uploads go direct browser→Cloudinary (unsigned preset), NOT through backend.
- SiteConfig page is separate from StoreConfig (invoice config).

### Reference files
- Full session notes: `C:\Users\admin\Desktop\postventa\Para continuar\`
- Tokens: `C:\Users\admin\Desktop\postventa\token.xlsx`
