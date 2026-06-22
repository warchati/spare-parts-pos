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
  - Frontend: pendiente (próximo deploy generará URL nueva)
  - Backend: https://backend-postventa.vercel.app
  - Health: https://backend-postventa.vercel.app/api/health

## Deploy commands
Ver README.md sección "Cómo Hacer Cambios y Desplegar"

## Flujo para subir cambios (auto-deploy)
1. git add -A && git commit -m "mensaje" && git push origin main
2. ✅ GitHub Actions despliega automáticamente backend y frontend en Vercel

## Base de datos
- Neon PostgreSQL (producción)
- Supabase (secundaria)
- Prisma ORM

## Estructura
- backend/ - API Express + TypeScript
- web/ - Frontend React + Vite + Tailwind
- mobile/ - App Expo React Native
- shared/ - Tipos compartidos
