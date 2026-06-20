# Mejoras Futuras

Lista de funcionalidades que se pueden agregar al sistema para mejorarlo.

---

## Prioridad Alta

### 1. Reporte Diario / Dashboard
- Mostrar resumen de ventas del día (total, cantidad, métodos de pago)
- Gráficos de productos más vendidos
- Alertas de stock bajo en el dashboard principal
- Comparativa con días/semanas anteriores

### 2. Gestión de Crédito
- Registrar ventas a crédito (fiado)
- Control de saldo deudor por cliente
- Reporte de cuentas corrientes
- Historial de pagos parciales

### 3. Impresión de Tickets / Factura
- Impresión de comprobante de venta (ticket térmico)
- Formato de factura simple
- Vista previa antes de imprimir
- Compatibilidad con impresoras térmicas USB

### 4. Gestión de Usuarios
- Alta/baja de usuarios desde el frontend (actualmente solo por seed)
- Roles personalizables (admin, cajero, supervisor, vendedor)
- Registro de actividad por usuario (logs)

---

## Prioridad Media

### 5. Múltiples Precios
- Precio por lista (ej: precio mayorista, minorista, distribuidor)
- Configuración de listas de precios por cliente
- Precios especiales por promociones

### 6. Módulo de Caja
- Apertura y cierre de caja por turno
- Control de efectivo inicial y final
- Arqueo de caja (cuadre diario)
- Registro de gastos y movimientos de caja chica

### 7. Base de Datos de Vehículos
- Catálogo de vehículos por marca, modelo, año
- Asociación de repuestos a vehículos compatibles
- Búsqueda por vehículo para encontrar repuestos

### 8. Escáner de Código de Barras
- Soporte completo para código de barras EAN/CODE128
- Búsqueda instantánea al escanear (sin presionar Enter)
- Etiquetas con código de barras para imprimir

---

## Prioridad Baja

### 9. App Móvil (Expo)
- Completar la app móvil para consulta de stock
- Escáner de código de barras con cámara del celular
- Notificaciones push de stock bajo

### 10. Exportación de Datos
- Exportar productos, clientes, ventas a Excel/CSV
- Reportes contables mensuales
- Respaldo de base de datos programado

### 11. Compras con Lector de Código
- Escanear productos al recibir una orden de compra
- Verificación automática de cantidades recibidas vs pedidas

### 12. Gestión de Imágenes
- Subir fotos de productos
- Vista previa en el POS y catálogo
- Cámara para tomar fotos desde el celular

---

## Técnicas / Deuda Técnica

### 13. Prisma Migrations
- Reemplazar `prisma db push` por `prisma migrate` para tener historial de cambios en la DB
- Versionado del esquema de base de datos

### 14. Tests Automatizados
- Tests de integración para la API
- Tests end-to-end para el POS (Cypress/Playwright)
- CI/CD con GitHub Actions

### 15. Variables de Entorno Seguras
- Mover todos los secretos a variables de entorno de Vercel
- No hardcodear datos sensibles en el código

### 16. Docker Compose para Producción
- Si se quiere migrar a un VPS, tener Docker Compose listo con backend + frontend
- Sustituir Neon por PostgreSQL en Docker si hay servidor propio

### 17. Mejora de Seguridad
- Encriptar tokens JWT con clave más robusta
- Rate limiting en la API
- Validación de datos en el backend (actualmente solo en frontend)
- Registro de usuarios con contraseñas hasheadas (ya implementado con SHA-256 + salt)

### 18. Soporte Multi-Tienda
- Varias sucursales con stock separado
- Transferencia de stock entre sucursales
- Reportes consolidados

---

## Cómo Priorizar

Si se quiere empezar con una mejora:
1. **Reporte Diario** (#1) — da visibilidad del negocio rápidamente
2. **Impresión de Tickets** (#3) — necesario para uso real en mostrador
3. **Gestión de Crédito** (#2) — si se vende fiado a clientes habituales
4. **Múltiples Precios** (#5) — si hay precios mayoristas diferentes
5. **Módulo de Caja** (#6) — para controlar el efectivo diario

---

## Cómo Solicitar una Mejora

1. Abre un issue en GitHub: https://github.com/warchati/spare-parts-pos
2. Describe la funcionalidad deseada
3. El equipo de desarrollo evaluará e implementará
