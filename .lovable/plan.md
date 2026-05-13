## Sistema de Horarios de Terapeutas

Construir gestión completa de horarios laborales por terapeuta, con horario base semanal + excepciones por fecha, integrado con el widget de disponibilidad y validaciones al crear reservas.

---

### 1. Base de datos (migration)

**Nueva tabla `therapist_schedules`** (horario base semanal):
- `id`, `therapist_id` (FK lógico), `day_of_week` (0=Dom .. 6=Sáb), `is_day_off` (bool), `start_time` (time, nullable), `end_time` (time, nullable)
- Unique (`therapist_id`, `day_of_week`)
- RLS: SELECT autenticados; INSERT/UPDATE/DELETE solo `admin` o `administrativa`

**Nueva tabla `therapist_schedule_exceptions`** (excepciones por fecha):
- `id`, `therapist_id`, `exception_date` (date), `is_day_off` (bool), `start_time` (time, nullable), `end_time` (time, nullable), `notes` (text)
- Unique (`therapist_id`, `exception_date`)
- Mismas RLS.

**Trigger en `bookings`** (extiende `prevent_double_booking` con función nueva `validate_booking_within_schedule`):
- Si la terapeuta principal o secundaria tiene horario configurado para ese día (excepción → base), la reserva debe caer dentro de [start_time, end_time] y no ser día libre.
- Si no hay horario configurado, no bloquea (compatibilidad).

**Función helper `get_therapist_schedule(therapist_id, date)`** (security definer): devuelve `(is_working, start_time, end_time)` resolviendo excepción → base.

---

### 2. Hooks y tipos (frontend)

- `src/hooks/useTherapistSchedules.ts`: queries + mutations para horario base.
- `src/hooks/useScheduleExceptions.ts`: queries + mutations para excepciones.
- Helper `src/lib/scheduleUtils.ts`:
  - `resolveScheduleForDate(baseSchedules, exceptions, date)` → `{ isWorking, startTime, endTime }`
  - `isWithinSchedule(schedule, time)` para validación cliente.

---

### 3. UI: Página `/horarios`

Nueva ruta `/horarios` (solo `admin` + `administrativa`), añadida al `AppSidebar` con icono `CalendarClock`.

**`src/pages/HorariosPage.tsx`**:
- Lista de terapeutas (cards) con resumen de horario semanal (badges por día con horario o "Libre").
- Botón "Editar horario" por cada terapeuta abre un dialog.

**`src/components/TherapistScheduleDialog.tsx`**:
- Tab "Horario base": 7 filas (Lun→Dom) con switch "Día libre" + inputs `time` start/end.
- Tab "Excepciones": lista de excepciones con fecha, switch día libre / horario, botón eliminar; botón "Agregar excepción".
- Guarda con upsert por `(therapist_id, day_of_week)` y `(therapist_id, exception_date)`.

---

### 4. Integraciones

**`AvailabilityWidget`**: al calcular slots por terapeuta, marcar fuera de horario / día libre como no disponible. Mostrar badge "Libre" o rango "10:00-15:00" cuando aplica.

**`BookingFormFields`**: al seleccionar terapeuta + fecha, mostrar el rango de trabajo debajo del selector de hora; deshabilitar / advertir si la hora cae fuera. La validación dura sucede en el trigger de Postgres.

---

### 5. Permisos

- Ruta `/horarios` con `requireRole={["admin","administrativa"]}`.
- Sidebar muestra item solo a esos roles.
- Staff puede ver horarios en widget pero no acceder a la página de edición.
- RLS de las dos tablas refuerza el límite a nivel servidor.

---

### Archivos nuevos / editados

Nuevos: migration, `useTherapistSchedules.ts`, `useScheduleExceptions.ts`, `lib/scheduleUtils.ts`, `HorariosPage.tsx`, `TherapistScheduleDialog.tsx`.
Editados: `App.tsx` (ruta), `AppSidebar.tsx` (nav item), `AvailabilityWidget.tsx` (respetar horarios), `BookingFormFields.tsx` (mostrar rango + warning).
