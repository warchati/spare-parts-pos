# URLs y Credenciales

## Producción

| Servicio | URL |
|----------|-----|
| Frontend | https://pos-spare-parts.vercel.app |
| Backend API | https://backend-postventa.vercel.app |
| Health Check | https://backend-postventa.vercel.app/api/health |
| GitHub Repo | https://github.com/warchati/spare-parts-pos |

## Vercel (team: postventa)

| Proyecto | ID | URL Producción |
|----------|----|----------------|
| Backend | `prj_kuuRyUPyElTAEN7xjj0aC8zrbJ7e` | `backend-postventa.vercel.app` |
| Frontend | `prj_ASGlwTyyBu8eADafetUURi6JIK1B` | `pos-spare-parts.vercel.app` |

Team ID: `team_emFEjso4w4GpBnHXldl4bWMm`

## Base de Datos

**Neon PostgreSQL (producción)**
```
URL: postgresql://neondb_owner:npg_JG4cvObBfL7e@ep-empty-tree-aj6afcj9-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require
```

## Cloudinary

| Campo | Valor |
|-------|-------|
| Cloud Name | `vidcanal` |
| Upload Preset (unsigned) | `m5vtjzdl` |
| Carpetas usadas | `expenses/`, `logos/`, `products/` |

Los env vars `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` están seteados en el proyecto Vercel backend.

**Importante**: El upload de archivos desde el frontend usa el unsigned preset (`m5vtjzdl`) directo a Cloudinary vía `fetch` — no pasa por el backend (bypass multer, funciona con Vercel serverless).

## Credenciales de Prueba

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| admin | admin123 | admin |
| cajero | cajero123 | cashier |
| 15198 | 11598545 | supervisor |
| vendedor | vendedor123 | seller |

## Ubicación Local del Proyecto

```
C:\Users\admin\Desktop\postventa\spare-parts-pos-v2
```

## Archivo de Tokens

```
C:\Users\admin\Desktop\postventa\token.xlsx
```
