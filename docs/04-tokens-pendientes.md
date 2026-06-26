# Tokens a Rotar

Fuente: `C:\Users\admin\Desktop\postventa\token.xlsx`

## Estado Actual

| Servicio | Token | Estado |
|----------|-------|--------|
| **Vercel** (usado en GitHub Actions) | ✅ **Rotado** — Nuevo token seteado en `secrets.VERCEL_TOKEN` |
| **Vercel** (warchati) | ✅ **Revocado** |
| **GitHub** | ✅ **Rotado** — Configurado en remote URL (ver `token.xlsx`) |
| **Supabase** | `sbp_61c3be21...` | ❌ No se usa más (DB en Neon) — Rotar opcional |
| **Render** | `rnd_6Wdy415...` | ❌ No se usa más (deploy en Vercel) — Rotar opcional |

## Cómo Rotar GitHub Token

1. Ir a https://github.com/settings/tokens
2. Crear nuevo **Fine-grained token** o **Classic token**
   - Classic: scopes `repo`, `workflow`
3. Copiar el nuevo token
4. Actualizar en GitHub Actions si es necesario:
   - Ir a https://github.com/warchati/spare-parts-pos/settings/secrets/actions
   - El secreto `VERCEL_TOKEN` ya fue actualizado. Si el GitHub token se usa para otro secreto como `GH_TOKEN`, actualizarlo ahí.
5. Revocar el token viejo desde la misma página de GitHub
6. Actualizar `C:\Users\admin\Desktop\postventa\token.xlsx`

## Notas

- El token de Vercel nuevo ya está configurado en `secrets.VERCEL_TOKEN` de GitHub Actions
- Los tokens de Supabase y Render ya no son necesarios (producción usa Neon + Vercel)
- El archivo `render.yaml` contiene la URL hardcodeada de Supabase — se puede eliminar o ignorar
