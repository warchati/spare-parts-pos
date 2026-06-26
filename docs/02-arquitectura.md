# Arquitectura del Proyecto

```
spare-parts-pos-v2/
├── backend/          # API REST (Express + TypeScript + Prisma)
│   ├── src/
│   │   ├── routes/   # Controladores por módulo
│   │   ├── middleware/ # auth, errorHandler
│   │   └── server.ts  # Entry point Express
│   ├── prisma/
│   │   └── schema.prisma  # Modelo de datos
│   └── .vercel/      # Config Vercel CLI
├── web/              # Frontend (React + Vite + Tailwind)
│   ├── src/
│   │   ├── pages/    # Componentes por página
│   │   ├── contexts/ # AuthContext
│   │   ├── lib/      # api.ts (axios instance)
│   │   └── App.tsx   # Router
│   └── .vercel/
├── mobile/           # App React Native (Expo)
├── shared/           # Tipos TypeScript compartidos
├── .github/workflows/deploy.yml  # CI/CD
└── AGENTS.md         # Contexto para IA
```

## Stack

- **Backend**: Node.js 24, Express 4, Prisma 5, TypeScript 5
- **Frontend**: React 19, Vite 6, Tailwind 4, React Router 7, Axios
- **Mobile**: React Native / Expo (pendiente desarrollo)
- **DB**: PostgreSQL (Neon)
- **Hosting**: Vercel (backend serverless + frontend static)
- **CI/CD**: GitHub Actions → Vercel Deploy

## Flujo de Autenticación

1. Login: `POST /api/auth/login` → bcrypt compare → JWT (24h)
2. Frontend guarda token en `localStorage`
3. Axios interceptor agrega `Authorization: Bearer <token>`
4. Interceptor 401 → logout automático
5. `middleware/auth.ts` verifica JWT en cada request protegido

## Roles y Permisos

- **admin**: Acceso completo
- **supervisor**: Acceso a gestión, sin configuración sensible
- **cashier**: Solo POS, ventas, clientes
- **seller**: POS, clientes, vehículos
