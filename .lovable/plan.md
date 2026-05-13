## Plan: Sincronización Google Calendar → App (Fresha)

### 1. Base de datos (migración)

**Nueva tabla `google_calendar_sync_config`** (singleton, 1 sola fila):
- `calendar_id` (text)
- `last_sync_at` (timestamptz)
- `last_sync_status` (text: ok / error)
- `last_sync_message` (text)
- `last_sync_count` (int)
- `auto_sync_enabled` (bool, default true)

**Modificación a `bookings`**:
- Agregar columna `external_event_id` (text, unique, nullable) → ID del evento de Google Calendar
- Agregar columna `external_source_data` (jsonb) → snapshot del evento original
- Agregar valor `'fresha'` al enum `booking_source` (si no existe)
- Agregar valor `'pendiente_revision'` al enum `booking_status`

**RLS**: solo admin/administrativa pueden gestionar config. Lectura para todos los autenticados.

### 2. Secrets (subida del Service Account JSON)

El JSON del Service Account se guarda como **secret de Lovable Cloud** llamado `GOOGLE_SERVICE_ACCOUNT_JSON`. Te pediré que lo pegues con la herramienta de secrets (paso seguro, no se guarda en el código).

⚠️ Importante: en Google Calendar debes **compartir el calendario de Fresha** con el `client_email` del service account (permiso "Ver eventos") para que la sincronización funcione.

### 3. Edge Functions

**`google-calendar-test-connection`** (POST):
- Lee `calendar_id` y secret JSON
- Genera JWT con Google Auth (manualmente: header + claim + firma RS256 con `crypto.subtle`)
- Pide access token a `oauth2.googleapis.com/token`
- Llama a `calendars/{id}` para validar
- Devuelve nombre del calendario o error

**`google-calendar-sync`** (POST, JWT verified):
- Misma autenticación con service account
- `events.list` desde `last_sync_at - 1h` hasta `now + 90 días` (`updatedMin` + `singleEvents=true`)
- Por cada evento:
  - Si `event.status === 'cancelled'` y existe booking con `external_event_id` → marcar `cancelada`
  - Si existe booking con `external_event_id` → UPDATE (fecha, horas, notas, snapshot)
  - Si no existe → INSERT con `source='fresha'`, `external_event_id=event.id`
  - **Matching de terapeuta**: buscar nombre de terapeuta dentro de `event.summary` o `event.description` (case-insensitive). Si no se detecta → `therapist_id = NULL`.
  - **Matching de servicio**: buscar nombre de servicio (lowercase, primeras 4 palabras significativas) dentro del summary. Si no → `service_id = NULL`.
  - **Cliente**: extraer del `summary` (formato típico Fresha: `"Nombre Cliente — Servicio"`); buscar en `clients` por nombre, si no existe → crear con `name` y `notes='Importado de Fresha'`.
  - **Detección de conflicto**: query a `bookings` activas con overlap en mismo terapeuta o resource → si hay conflicto, marcar `status='pendiente_revision'` (en vez de fallar el trigger de double-booking, hacemos el check antes y elegimos el status).
- Actualiza `google_calendar_sync_config` con `last_sync_*`
- Devuelve `{ created, updated, cancelled, conflicts, errors[] }`

**Nota técnica**: el trigger `prevent_double_booking` rechazaría duplicados. Para `pendiente_revision` el trigger no lo bloquea (no está en `('pendiente','confirmada')`), así que ese status nos sirve perfecto como bypass legítimo.

**Comentarios para futuro bidireccional**: bloque comentado en `google-calendar-sync` con plantilla de `events.insert` desde `bookings` → Google.

### 4. Cron job (cada 10 minutos)

Habilitar `pg_cron` + `pg_net` y crear un job que llame al edge function cada 10 min, solo si `auto_sync_enabled = true` (lo verifica el edge function al inicio).

### 5. UI en `/configuracion`

Nueva sección **"Integración Google Calendar (Fresha)"**:
- Input "Calendar ID" (con ejemplo: `xxxxx@group.calendar.google.com`)
- Toggle "Sincronización automática (cada 10 min)"
- Botón **"Probar conexión"** → llama `google-calendar-test-connection`, muestra ✓ con nombre del calendario o ✗ con error
- Botón **"Sincronizar ahora"** → llama `google-calendar-sync`, muestra spinner y resultado
- Card de estado:
  - Última sincronización: hace X minutos
  - Estado: ✓ OK / ⚠ Error
  - Mensaje
  - Eventos importados última vez
- Aviso explicativo sobre cómo subir el JSON (botón que abre el flujo de secret) y cómo compartir el calendario con el service account

Solo visible para `admin` y `administrativa`.

### 6. Flujo de entrega

Voy paso a paso:
1. Pido aprobación de la migración (tabla + columnas + enums)
2. Te pido el secret `GOOGLE_SERVICE_ACCOUNT_JSON` (pega el contenido completo del JSON)
3. Implemento edge functions + UI + cron

### Detalles técnicos

```text
JWT manual (sin librería externa):
  header  = { alg: "RS256", typ: "JWT" }
  claim   = { iss: client_email, scope: "https://www.googleapis.com/auth/calendar.readonly",
              aud: "https://oauth2.googleapis.com/token", iat, exp: iat+3600 }
  firma   = crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, `${b64(header)}.${b64(claim)}`)
```

```text
Matching heurístico:
  summary = "María López — Masaje relajante 60min"
  → cliente   = "María López"   (parte antes de "—" o "-" o "|")
  → servicio  = primer match en services.name (lowercase contains)
  → terapeuta = primer match en therapists.name dentro de summary+description
```
