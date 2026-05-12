# 🌿 Spa Lleras - Sistema de Reservas

Sistema interno de gestión de reservas para **Spa Lleras**, ubicado en Parque Lleras, Medellín, Colombia.

> Plataforma web responsive diseñada para optimizar la operación diaria del spa: agendar servicios, gestionar terapeutas y espacios, controlar ventas y propinas, y mantener un historial completo de cada cliente.

---

## 📑 Tabla de Contenidos

1. [Introducción](#1-introducción)
2. [Manual de Usuario](#2-manual-de-usuario)
3. [Estructura Técnica](#3-estructura-técnica)
4. [Roles y Permisos](#4-roles-y-permisos)
5. [Integraciones](#5-integraciones-actuales)
6. [Próximos Pasos](#6-próximos-pasos-recomendados)

---

## 1. Introducción

### 🎯 ¿Para qué sirve?

Spa Lleras Reservations es una aplicación interna que centraliza la operación diaria del spa:

- 📅 **Agenda y reservas** con calendario interactivo en tiempo real
- 💆 **Catálogo de servicios** (masajes, faciales, manicure, combos) con precios en COP y USD
- 👥 **Gestión de clientes** con historial completo
- 🧖 **Administración de terapeutas y recursos** (salas, rooftop)
- 💰 **Reportes de ventas y propinas** por terapeuta y por servicio
- 📝 **Auditoría completa** de todas las acciones (quién creó/canceló/modificó cada reserva)

### 👤 ¿Quién la usa?

| Usuario | Rol | Uso típico |
|---|---|---|
| **Cata** (dueña) | Administrativa | Operación diaria, reportes, gestión de clientes y reservas |
| **Recepción / Staff** | Staff | Agendar reservas, atender clientes, ver disponibilidad |
| **Admin técnico** | Admin | Configuración del sistema, servicios, terapeutas, usuarios |

---

## 2. Manual de Usuario

### 📅 Crear una reserva desde cero

1. Ir a **Reservas** en el menú lateral.
2. Click en **➕ Nueva Reserva**.
3. Buscar o crear el cliente con el **Combobox de Cliente** (si no existe, click en *"Crear nuevo cliente"* — se abre un diálogo rápido sin salir del formulario).
4. Seleccionar **servicio** y **duración** (los precios se autocompletan en COP/USD).
5. Elegir **fecha**, **hora de inicio** (la hora de fin se calcula automáticamente).
6. Asignar **terapeuta principal** (y segundo terapeuta si el servicio requiere 4 manos).
7. Asignar **sala / recurso** (rooftop si aplica).
8. Estado inicial: **Pendiente** o **Confirmada**.
9. Guardar — el sistema valida automáticamente que **no haya doble reserva** del terapeuta o la sala.

> ⚠️ Si hay conflicto, aparece un mensaje claro: *"El terapeuta X ya tiene una reserva de 14:00 a 15:00 ese día"*.

### 🪟 Widget "Espacios Disponibles"

En el **Dashboard**:

- Muestra en tiempo real las **salas libres ahora** y en las próximas franjas.
- Útil para responder rápido a walk-ins: *"¿Tienen disponibilidad ahora?"*
- Se actualiza automáticamente cuando se crean/cancelan reservas (Realtime).

### ✍️ Consentimiento Digital (PC + Tablet)

> 🚧 **Estado: en desarrollo** — la captura de firma digital aún no está activa. Por ahora se imprime el formato físico desde el PDF de consentimiento.

### 💵 Reportes de Ventas y Propinas

1. Ir a **Reportes**.
2. Filtrar por rango de fechas, terapeuta o servicio.
3. Visualizar:
   - 📊 Ventas totales (COP / USD)
   - 💆 Servicios más vendidos
   - 🧖 Ventas por terapeuta (para cálculo de comisiones)
   - 💰 Propinas por terapeuta
4. Exportar a **Excel** o **PDF** (botones en la parte superior).

### 📥 Importar reservas desde Excel

1. Ir a **Reservas** → **Importar**.
2. Descargar la plantilla de ejemplo.
3. Llenar el Excel con: cliente, fecha, hora, servicio, terapeuta, sala, precio.
4. Subir el archivo — se hace **preview** de validación antes de insertar.
5. Confirmar — las reservas se crean en lote (con validación anti-doble-booking).

### 💡 Consejos para uso diario en recepción

- ✅ Mantén la pestaña del **Dashboard** abierta — se actualiza solo (Realtime).
- ✅ Usa siempre el **Combobox de Cliente** (no escribas el nombre suelto) para mantener historial limpio.
- ✅ Si cancelas una reserva, **anota el motivo** — queda en el audit log.
- ✅ Confirma reservas pendientes apenas el cliente confirme por WhatsApp.
- ✅ Revisa **Reportes** los lunes para cerrar la semana anterior.

---

## 3. Estructura Técnica

### 🎨 Frontend

**Stack:**
- ⚛️ **React 18** + **Vite 5** + **TypeScript 5**
- 🎨 **Tailwind CSS v3** + **shadcn/ui** (componentes Radix)
- 🔄 **React Query** (TanStack) para cache y sincronización de datos
- 🛣️ **React Router v6**
- 📋 **react-hook-form** + **Zod** para formularios y validación

**Estructura de carpetas:**

```
src/
├── components/         # UI compartida (formularios, diálogos, widgets)
│   ├── ui/             # Primitivos shadcn
│   └── layout/         # AppLayout, AppSidebar
├── hooks/              # Hooks de datos (useBookings, useClients, useAuth...)
├── pages/              # Una página por ruta
├── lib/                # Utilities (schemas Zod, countries, plantillas)
└── integrations/
    └── supabase/       # Cliente y types autogenerados
```

**Hooks clave:**

| Hook | Propósito |
|---|---|
| `useAuth` | Sesión, rol del usuario, login/logout |
| `useBookings` | CRUD de reservas + invalidación de cache |
| `useClients` | Listar y crear clientes |
| `useServices` / `useTherapists` / `useResources` | Catálogos |
| `useBookingAuditLog` | Historial de cambios por reserva |

**Formularios:**

Todos los formularios críticos usan `react-hook-form` + esquemas **Zod** definidos en `src/lib/schemas.ts`. La validación corre en el cliente antes de enviar, y el servidor revalida con triggers de Postgres.

### 🗄️ Backend (Lovable Cloud)

**Tablas principales:**

| Tabla | Descripción |
|---|---|
| `bookings` | Reservas (fecha, hora, terapeuta, sala, precio, estado, fuente) |
| `booking_items` | Items de la reserva (para combos: masaje + facial) |
| `booking_audit_log` | Log inmutable de toda acción (CREATE/UPDATE/CANCEL/DELETE) |
| `clients` | Clientes (nombre, email, teléfono, notas) |
| `services` + `service_durations` | Catálogo de servicios y sus duraciones/precios |
| `therapists` | Terapeutas con especialidades y disponibilidad |
| `resources` | Salas y rooftop |
| `user_roles` | Roles (admin / administrativa / staff) — separados de auth.users |

**Triggers importantes:**

- 🛡️ **`prevent_double_booking`** — valida en cada INSERT/UPDATE de `bookings`:
  - End time > start time
  - Fecha no pasada
  - Horario laboral 10:00–22:00
  - Terapeuta principal ≠ segundo terapeuta
  - Sin solapamiento con otra reserva activa del mismo terapeuta o sala
- 📜 **`audit_booking_changes`** + **`audit_booking_items_changes`** — registran todos los cambios en `booking_audit_log` con `user_id` y razón opcional.
- ⏱️ **`update_updated_at_column`** — mantiene `updated_at` al día.

**Edge Functions:**

| Función | Propósito | JWT |
|---|---|---|
| `admin-create-user` | Crea usuarios con rol (solo admin) | ✅ Requerido |
| `send-booking-email` | Email transaccional de confirmación al cliente | ✅ Requerido |
| `send-booking-reminders` | Recordatorios 24h antes (cron diario 10:00 AM Bogotá) | ❌ Público |

**Realtime (postgres_changes):**

- 📡 Tabla `bookings` — el calendario y el widget de espacios se actualizan en vivo entre usuarios.

**Row-Level Security (RLS):**

- Todas las tablas tienen RLS activado.
- Catálogos (`services`, `therapists`, `resources`): lectura para autenticados, escritura solo admin.
- Operacional (`bookings`, `clients`, `booking_items`): admin y staff pueden leer/escribir.
- `user_roles`: solo admin puede modificar; lectura para autenticados.
- Función `has_role(user_id, role)` con `SECURITY DEFINER` evita recursión.

---

## 4. Roles y Permisos

| Sección | Admin | Administrativa (Cata) | Staff |
|---|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ |
| Reservas (CRUD) | ✅ | ✅ | ✅ |
| Clientes (ver/crear) | ✅ | ✅ | ✅ |
| Reportes completos | ✅ | ✅ | 👁️ Solo lectura |
| Configuración | ✅ | ✅ (sin integraciones) | ❌ |
| Servicios | ✅ | ❌ | ❌ |
| Terapeutas | ✅ | ❌ | ❌ |
| Recursos / Espacios | ✅ | ✅ | ❌ |
| Usuarios | ✅ | ❌ | ❌ |

> 🔒 La protección es consistente en **3 capas**: Sidebar (oculta items), `ProtectedRoute` (bloquea ruta y redirige al Dashboard con toast), y RLS en backend.

---

## 5. Integraciones Actuales

### ✅ Funcional con backend real

- **Autenticación** (email + password, recuperación de contraseña)
- **CRUD de reservas, clientes, servicios, terapeutas, recursos**
- **Validación anti-doble-booking** (cliente + servidor)
- **Realtime** del calendario entre usuarios
- **Reportes de ventas y propinas** con export Excel/PDF
- **Importación de reservas desde Excel**
- **Audit log** completo
- **Email transaccional** de confirmación (vía edge function)
- **Recordatorios 24h** automáticos (cron diario)

### 🚧 En desarrollo / Próximamente

- **Google Calendar** — sincronización bidireccional
- **WhatsApp Business API** — envío automático de recordatorios y confirmaciones
- **Email/SMTP custom** — actualmente vía Lovable AI Gateway / proveedor por defecto
- **Captura de firma digital** del consentimiento (flujo PC + Tablet)

---

## 6. Próximos Pasos Recomendados

1. 📲 **WhatsApp Business API** — es el canal principal de comunicación con clientes en Medellín.
2. ✍️ **Consentimiento digital con firma** — eliminar el papel en recepción.
3. 📅 **Sincronización Google Calendar** — para que terapeutas vean su agenda en su teléfono.
4. 💳 **Pagos en línea** — link de pago al confirmar la reserva (Wompi / Mercado Pago para COP).
5. 📊 **Dashboard ejecutivo** — gráficos de ocupación, ticket promedio, fidelización.
6. 🌐 **Reservas públicas online** — formulario embebible en spalleras.com.

---

## 🚀 URLs

- **App publicada:** https://spa-lleras-reservas.lovable.app
- **Sitio web:** https://spalleras.com
- **Email:** spallerasmedellin@gmail.com

## 👤 Usuarios iniciales

| Email | Rol |
|---|---|
| spallerasmedellin@gmail.com | Admin |
| cata@spalleras.com | Administrativa |

---

*Documentación generada para el equipo de Spa Lleras — Medellín, Colombia 🇨🇴*
