# Spa Lleras - Sistema de Reservas

Sistema interno de gestión de reservas para Spa Lleras, ubicado en Parque Lleras, Medellín, Colombia.

## Funcionalidades

- Gestión de reservas con calendario interactivo en tiempo real
- Catálogo de servicios y duraciones (precios COP/USD)
- Administración de terapeutas, recursos (salas) y clientes
- Autenticación con roles (Admin / Staff)
- Reportes y configuración

## Stack

- React 18 + Vite + TypeScript
- Tailwind CSS + shadcn/ui
- Backend: base de datos, autenticación y funciones serverless gestionadas
- React Query + React Router

## Contacto

- Sitio: https://spalleras.com
- Email: spallerasmedellin@gmail.com

## Usuario Admin Inicial

- **Email:** spallerasmedellin@gmail.com
- **Contraseña:** AdminSpa2026
- **Rol:** Admin

## Datos de Ejemplo

El sistema incluye 10 reservas de ejemplo para pruebas:

- **Hoy y mañana:** Reservas activas para probar el calendario
- **Servicios variados:** Masajes, faciales, manicure, y combos (masaje + facial)
- **Masaje a Cuatro Manos:** Una reserva especial con dos terapeutas
- **Estados:** Pendiente, Confirmada, Cancelada, Completada
- **Fuentes:** WhatsApp, Web, Fresha, Walk-in
- **Clientes internacionales:** USA, UK, España

Las reservas aparecen en el Dashboard, Calendario y Reportes.
