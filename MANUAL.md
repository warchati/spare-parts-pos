# Manual de Usuario — Sistema POS AutoRepuestos

## Índice
1. [Introducción](#1-introducción)
2. [Acceso al Sistema](#2-acceso-al-sistema)
3. [Panel de Navegación](#3-panel-de-navegación)
4. [POS — Punto de Venta](#4-pos--punto-de-venta)
5. [Productos](#5-productos)
6. [Clientes](#6-clientes)
7. [Proveedores](#7-proveedores)
8. [Ventas](#8-ventas)
9. [Compras](#9-compras)

---

## 1. Introducción

**AutoRepuestos** es un sistema de punto de venta (POS) diseñado para tiendas de repuestos de autos. Permite gestionar el inventario, clientes, proveedores, y registrar ventas y compras de manera rápida y sencilla.

### Ventajas del Sistema
- **Interfaz web:** funciona en cualquier dispositivo con navegador (PC, tablet, celular)
- **Multi-usuario:** soporta varios cajeros y administradores simultáneamente
- **Stock en tiempo real:** el inventario se actualiza automáticamente con cada venta
- **Búsqueda rápida:** encuentra productos por código, nombre, marca o número OEM
- **Nube:** los datos están siempre disponibles, sin necesidad de servidor local
- **Gratuito:** funciona completamente en servicios gratuitos (Vercel + Neon)

---

## 2. Acceso al Sistema

### URL
```
https://web-swart-seven-22.vercel.app
```

### Inicio de Sesión
1. Abre la URL en tu navegador
2. Ingresa tu usuario y contraseña
3. Haz clic en **Ingresar**

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `admin` | `admin123` | Administrador |
| `cajero` | `cajero123` | Cajero |

### Cierre de Sesión
Haz clic en el icono de salida (⏻) en la esquina inferior izquierda del menú lateral.

---

## 3. Panel de Navegación

El menú lateral izquierdo te permite acceder a todas las secciones:

| Icono | Sección | Descripción |
|-------|---------|-------------|
| 🛒 | **POS** | Pantalla principal de ventas |
| 📦 | **Productos** | Gestión del catálogo de repuestos |
| 👥 | **Clientes** | Registro de clientes |
| 🚚 | **Proveedores** | Registro de proveedores |
| 🧾 | **Ventas** | Historial de ventas realizadas |
| 📋 | **Compras** | Órdenes de compra a proveedores |

En la parte inferior del menú se muestra tu nombre y rol.

---

## 4. POS — Punto de Venta

Es la pantalla principal donde se realizan las ventas.

### Realizar una Venta

1. **Buscar producto:** escribe el código, nombre, marca o número OEM en el buscador. Los resultados aparecen automáticamente.
2. **Agregar al carrito:** haz clic en el producto deseado. Se agrega al carrito de la izquierda.
3. **Ajustar cantidad:** usa los botones `+` y `-` para cambiar la cantidad de cada producto.
4. **Seleccionar cliente (opcional):** haz clic en "Cliente general" para buscar y asignar un cliente registrado.
5. **Elegir método de pago:** selecciona entre Efectivo, Tarjeta o Transferencia.
6. **Finalizar venta:** haz clic en **Cobrar**. Se abrirá un resumen. Confirma para completar la venta.

Al confirmar, el stock se descuenta automáticamente y la venta queda registrada en el historial.

### Funcionalidades Clave
- Búsqueda con autocompletado al escribir
- Escáner de código de barras compatible (solo conectar escáner USB)
- Filtro automático: solo muestra productos con stock disponible
- Modal de confirmación antes de finalizar la venta

---

## 5. Productos

Sección para gestionar el catálogo de repuestos.

### Ver Productos
La tabla muestra todos los productos con:
- Código interno
- Nombre
- Marca
- Categoría
- Stock actual
- Precio de costo
- Precio de venta

### Alertas de Stock Bajo
Cuando un producto tiene stock igual o menor al stock mínimo configurado, aparece una alerta amarilla en la parte superior y el número de stock se muestra en rojo.

### Crear Producto
1. Haz clic en **Nuevo Producto**
2. Completa los campos:
   - **Nombre** (obligatorio)
   - **Código** (obligatorio) — código interno del producto
   - **Código de Barras** — para escáner
   - **Marca** — ej: Bosch, Valeo, etc.
   - **Categoría** — ej: Frenos, Motor, Suspensión
   - **Nro OEM** — número original del fabricante
   - **Tipo Vehículo** — ej: Gol, Corolla, etc.
   - **Ubicación** — estante o lugar en el depósito
   - **Precio Compra** — costo del producto
   - **Precio Venta** — precio al público
   - **Stock Actual** — cantidad inicial
   - **Stock Mínimo** — cantidad para alerta de reposición
3. Haz clic en **Guardar**

### Editar Producto
Haz clic en el icono ✏️ (lápiz) junto al producto que deseas modificar.

---

## 6. Clientes

Registro de clientes para asociar ventas y dar seguimiento.

### Campos del Cliente
- Nombre
- Teléfono
- Email
- Dirección
- Documento (DNI/RUC)
- Vehículo (modelo o patente)
- Notas
- Límite de crédito
- Saldo actual

### Crear/Editar Cliente
Usa el botón **Nuevo Cliente** o el icono ✏️ para editar uno existente.

---

## 7. Proveedores

Registro de proveedores para las órdenes de compra.

### Campos del Proveedor
- Nombre
- Contacto (persona de referencia)
- Teléfono
- Email
- Dirección
- Notas

---

## 8. Ventas

Historial completo de todas las ventas realizadas.

### Ver Ventas
La tabla muestra cada venta con:
- Número de venta (#)
- Cliente (o "Consumidor Final")
- Fecha y hora
- Método de pago
- Total
- Estado (Completada / Cancelada / Pendiente)

### Ver Detalle de Venta
Haz clic en cualquier fila de la tabla para ver el detalle completo: productos, cantidades, precios y total.

### Buscar Ventas
Usa el buscador para filtrar por nombre de cliente o producto.

---

## 9. Compras

Gestión de órdenes de compra a proveedores.

### Crear Orden de Compra
1. Haz clic en **Nueva Compra**
2. Selecciona el **proveedor**
3. Busca productos y agrégalos a la orden
4. Ajusta cantidades y costos si es necesario
5. Haz clic en **Crear Orden**

### Recibir Orden de Compra
Cuando llegue la mercadería:
1. Ve a la sección **Compras**
2. En la fila de la orden pendiente, haz clic en **Recibir**
3. El stock de los productos se actualizará automáticamente con las cantidades compradas

### Estados de Compra
- **Pendiente:** orden creada, mercadería no recibida
- **Recibida:** mercadería ingresada al stock
- **Cancelada:** orden anulada

---

## Consejos Útiles

- **Escáner de código de barras:** conecta un escáner USB a la PC. Funciona automáticamente en el campo de búsqueda del POS.
- **Stock inicial:** al dar de alta un producto nuevo, ingresa el stock real que tienes. Luego cada venta lo descontará automáticamente.
- **Ventas sin cliente:** si el cliente es consumidor final, simplemente no selecciones ningún cliente en el POS.
- **Costos y precios:** el precio de compra es para tu control de costos. El precio de venta es lo que se cobra al cliente en el POS.
