# Comandos Útiles

## Desarrollo Local

```bash
# Backend
cd C:\Users\admin\Desktop\postventa\spare-parts-pos-v2\backend
cp .env.example .env   # Configurar DATABASE_URL + JWT_SECRET
npm install
npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev

# Frontend
cd C:\Users\admin\Desktop\postventa\spare-parts-pos-v2\web
npm install
npm run dev
```

## Deploy (auto via GitHub)

Solo hacer commit y push a `main`:

```bash
cd C:\Users\admin\Desktop\postventa\spare-parts-pos-v2
git add -A
git commit -m "mensaje"
git push origin main
```

GitHub Actions ejecuta `.github/workflows/deploy.yml` que despliega backend y frontend en Vercel.

## Vercel CLI

```bash
# Si necesitas deploy manual desde local:
vercel deploy --prod --cwd=backend
vercel deploy --prod --cwd=web

# NO usar --prebuilt (las env vars no se vinculan)
```

## Prisma

```bash
# Generar cliente Prisma
npx prisma generate

# Ver schema actual
npx prisma studio

# Seed (solo local)
npx tsx prisma/seed.ts
```

## Git

```bash
# Ver historial
git log --oneline -10

# Ver cambios pendientes
git status
git diff
```
