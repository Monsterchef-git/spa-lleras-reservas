import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { loadServiceAccount, getGoogleAccessToken } from "../_shared/google-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TZ_OFFSET = "-05:00"; // America/Bogota (no DST)

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Service-role client (bypasses RLS — used for sync writes from cron + UI alike)
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Determine if call comes from a logged-in user (manual) or cron (no auth)
  const authHeader = req.headers.get("Authorization");
  const isManual = !!authHeader?.startsWith("Bearer ");

  try {
    const { data: cfgRow, error: cfgErr } = await admin
      .from("google_calendar_sync_config")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (cfgErr) throw cfgErr;
    if (!cfgRow) throw new Error("Configuración de sincronización no encontrada");

    if (!isManual && !cfgRow.auto_sync_enabled) {
      return json({ ok: true, skipped: true, reason: "auto_sync_disabled" });
    }
    const calendarId: string | null = cfgRow.calendar_id;
    if (!calendarId) {
      const msg = "Falta configurar el Calendar ID";
      await admin.from("google_calendar_sync_config").update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: "error",
        last_sync_message: msg,
      }).eq("id", cfgRow.id);
      return json({ ok: false, error: msg }, 400);
    }

    const sa = loadServiceAccount();
    const token = await getGoogleAccessToken(sa);

    // --- Diagnostic: verify the service account can actually see this calendar
    let accessRole: string | null = null;
    let calendarVisible = false;
    let calendarListError: string | null = null;
    try {
      const clResp = await fetch(
         `https://www.googleapis.com/calendar/v3/users/me/calendarList/${encodeURIComponent(calendarId)}`,
         { headers: { Authorization: `Bearer ${token}` } },
      );
      const clData = await clResp.json();
      if (clResp.ok) {
        calendarVisible = true;
        accessRole = clData.accessRole ?? null;
      } else {
        calendarListError = `${clResp.status}: ${clData?.error?.message ?? JSON.stringify(clData)}`;
      }
    } catch (e) {
      calendarListError = e instanceof Error ? e.message : String(e);
    }

    // Time window: 30 days back, 180 days forward (by event start time)
    const now = new Date();
    const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch all event pages
    const events: any[] = [];
    let pageToken: string | undefined;
    do {
      const url = new URL(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      );
      url.searchParams.set("singleEvents", "true");
      url.searchParams.set("showDeleted", "true");
      url.searchParams.set("timeMin", timeMin);
      url.searchParams.set("timeMax", timeMax);
      url.searchParams.set("maxResults", "250");
      url.searchParams.set("orderBy", "startTime");
      url.searchParams.set("timeZone", "America/Bogota");
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const resp = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(`Google Calendar error: ${JSON.stringify(data)}`);
      console.log(`[sync] page fetched: items=${(data.items ?? []).length} url=${url.toString()}`);
      events.push(...(data.items ?? []));
      pageToken = data.nextPageToken;
    } while (pageToken);

    // Build event-level diagnostic snapshot (first 30 events, ordered by start)
    const eventsSnapshot = events.slice(0, 30).map((e) => ({
      id: e.id,
      status: e.status ?? null,
      summary: e.summary ?? null,
      start: e.start?.dateTime ?? e.start?.date ?? null,
      end: e.end?.dateTime ?? e.end?.date ?? null,
    }));
    const todayBogotaStr = formatDateInTZ(new Date());
    const eventsToday = eventsSnapshot.filter((e) => (e.start ?? "").startsWith(todayBogotaStr));

    // Preload reference data for matching
    const [{ data: therapists }, { data: services }, { data: clients }] = await Promise.all([
      admin.from("therapists").select("id, name").eq("is_available", true),
      admin.from("services").select("id, name").eq("is_active", true),
      admin.from("clients").select("id, name"),
    ]);

    let created = 0, updated = 0, cancelled = 0, conflicts = 0, skippedPast = 0, skippedWithoutTime = 0;
    const errors: string[] = [];

    for (const ev of events) {
      try {
        const eventId: string = ev.id;

        // Cancellation: mark existing booking as cancelada
        if (ev.status === "cancelled") {
          const { data: existing } = await admin
            .from("bookings")
            .select("id, status")
            .eq("external_event_id", eventId)
            .maybeSingle();
          if (existing && existing.status !== "cancelada") {
            await admin.from("bookings").update({ status: "cancelada" }).eq("id", existing.id);
            cancelled++;
          }
          continue;
        }

        // Skip all-day or events without dateTime
        if (!ev.start?.dateTime || !ev.end?.dateTime) {
          skippedWithoutTime++;
          console.log(`[sync] event skipped without dateTime: id=${eventId} status=${ev.status ?? "unknown"}`);
          continue;
        }

        const startDt = new Date(ev.start.dateTime);
        let endDt = new Date(ev.end.dateTime);
        const bookingDate = formatDateInTZ(startDt);
        const startTime = formatTimeInTZ(startDt);
        console.log(
          `[sync] event seen: id=${eventId} status=${ev.status ?? "unknown"} rawStart=${ev.start.dateTime} rawEnd=${ev.end.dateTime} parsedDate=${bookingDate} parsedTime=${startTime}`,
        );
        // If end <= start (zero-duration or malformed Google event), default to +60min
        if (endDt.getTime() <= startDt.getTime()) {
          console.log(`[sync] event ${ev.id}: end<=start, defaulting end to start+60min`);
          endDt = new Date(startDt.getTime() + 60 * 60 * 1000);
        }
        const endTime = formatTimeInTZ(endDt);

        // Skip past events — bookings table rejects past dates by design
        const todayBogota = formatDateInTZ(new Date());
        if (bookingDate < todayBogota) {
          skippedPast++;
          console.log(`[sync] event skipped past date: id=${eventId} bookingDate=${bookingDate} today=${todayBogota}`);
          continue;
        }

        const summary: string = (ev.summary ?? "").toString();
        const description: string = (ev.description ?? "").toString();
        const haystack = `${summary}\n${description}`.toLowerCase();

        // Heuristic: client name = part before " — ", " - " or " | "
        const clientName = extractClientName(summary);
        let clientId: string | null = null;
        if (clientName) {
          const found = clients?.find((c) => c.name.toLowerCase() === clientName.toLowerCase());
          if (found) {
            clientId = found.id;
          } else {
            const { data: ins } = await admin
              .from("clients")
              .insert({ name: clientName, notes: "Importado de Fresha" })
              .select("id")
              .single();
            if (ins) {
              clientId = ins.id;
              clients?.push({ id: ins.id, name: clientName });
            }
          }
        }

        // Match therapist by name appearing in summary/description
        const therapist = therapists?.find((t) => haystack.includes(t.name.toLowerCase()));
        const therapistId = therapist?.id ?? null;

        // Match service by name appearing in summary/description (longest match wins)
        const matchedServices = (services ?? [])
          .filter((s) => haystack.includes(s.name.toLowerCase()))
          .sort((a, b) => b.name.length - a.name.length);
        const serviceId = matchedServices[0]?.id ?? null;

        // Conflict detection: any active booking overlapping same therapist/resource
        let hasConflict = false;
        if (therapistId) {
          const { data: clash } = await admin
            .from("bookings")
            .select("id")
            .eq("booking_date", bookingDate)
            .in("status", ["pendiente", "confirmada"])
            .or(`therapist_id.eq.${therapistId},second_therapist_id.eq.${therapistId}`)
            .lt("start_time", endTime)
            .gt("end_time", startTime);
          if (clash && clash.length > 0) hasConflict = true;
        }

        const status = hasConflict ? "pendiente_revision" : "pendiente";
        if (hasConflict) conflicts++;

        const payload = {
          client_id: clientId,
          service_id: serviceId,
          therapist_id: therapistId,
          booking_date: bookingDate,
          start_time: startTime,
          end_time: endTime,
          status,
          source: "fresha" as const,
          notes: buildNotes(summary, description),
          external_event_id: eventId,
          external_source_data: ev,
        };

        const { data: existing } = await admin
          .from("bookings")
          .select("id, status")
          .eq("external_event_id", eventId)
          .maybeSingle();

        if (existing) {
          // Don't overwrite a manually-confirmed booking's status back to pendiente
          const updateBody: any = { ...payload };
          if (existing.status === "confirmada" && !hasConflict) {
            delete updateBody.status;
          }
          const { error: upErr } = await admin
            .from("bookings")
            .update(updateBody)
            .eq("id", existing.id);
          if (upErr) throw upErr;
          updated++;
        } else {
          const { error: insErr } = await admin.from("bookings").insert(payload);
          if (insErr) throw insErr;
          created++;
        }
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : typeof e === "object" && e !== null
            ? JSON.stringify(e)
            : String(e);
        console.error(`[sync] event ${ev.id} failed:`, e);
        errors.push(`Evento ${ev.id}: ${msg}`);
      }
    }

    const total = created + updated + cancelled;
    const status = errors.length === 0 ? "ok" : (total > 0 ? "ok" : "error");
    let message: string;
    if (errors.length > 0) {
      message = `Parcial — ${errors.length} errores. Primer error: ${errors[0]}`;
    } else {
      message = `OK — Google devolvió ${events.length} evento(s): ${created} creadas, ${updated} actualizadas, ${cancelled} canceladas, ${conflicts} con conflicto, ${skippedPast + skippedWithoutTime} omitidas (${skippedPast} pasadas, ${skippedWithoutTime} sin hora)`;
    }
    // Append diagnostic context so the UI can show it
    const diagLines: string[] = [];
    diagLines.push(`Calendar ID: ${calendarId}`);
    diagLines.push(`Service Account: ${sa.client_email}`);
    if (calendarVisible) {
      diagLines.push(`✓ Calendario visible para el Service Account (accessRole=${accessRole ?? "?"})`);
      if (accessRole === "freeBusyReader") {
        diagLines.push(`⚠ Permiso insuficiente: "Solo libre/ocupado". Cámbialo a "Ver todos los detalles del evento" en Google Calendar → Configuración → Compartir con personas y grupos.`);
      }
    } else {
      diagLines.push(`✗ El calendario NO es visible para el Service Account. Causa más probable: NO está compartido con ${sa.client_email}. (Detalle: ${calendarListError ?? "sin detalles"})`);
    }
    diagLines.push(`Hoy (Bogotá): ${todayBogotaStr} — Eventos para hoy en la respuesta de Google: ${eventsToday.length}`);
    if (eventsSnapshot.length > 0) {
      diagLines.push(`Eventos devueltos por Google (máx. 30):`);
      for (const e of eventsSnapshot) {
        diagLines.push(`  • ${e.start ?? "?"} → ${e.end ?? "?"} | ${e.status ?? "?"} | ${e.summary ?? "(sin título)"} [${e.id}]`);
      }
    } else {
      diagLines.push(`Google no devolvió ningún evento en la ventana ${timeMin} → ${timeMax}.`);
    }
    const diagnosticText = diagLines.join("\n");
    const fullMessage = `${message}\n\n— Diagnóstico —\n${diagnosticText}`;

    await admin.from("google_calendar_sync_config").update({
      last_sync_at: new Date().toISOString(),
      last_sync_status: status,
      last_sync_message: fullMessage,
      last_sync_count: total,
    }).eq("id", cfgRow.id);

    return json({
      ok: true,
      fetched: events.length,
      created, updated, cancelled, conflicts, skippedPast, skippedWithoutTime, errors,
      diagnostic: {
        calendarId,
        serviceAccount: sa.client_email,
        calendarVisible,
        accessRole,
        calendarListError,
        todayBogota: todayBogotaStr,
        eventsTodayCount: eventsToday.length,
        timeMin, timeMax,
        events: eventsSnapshot,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    try {
      const { data: cfg } = await admin
        .from("google_calendar_sync_config").select("id").limit(1).maybeSingle();
      if (cfg) {
        await admin.from("google_calendar_sync_config").update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: "error",
          last_sync_message: msg,
        }).eq("id", cfg.id);
      }
    } catch (_) { /* ignore */ }
    return json({ ok: false, error: msg }, 200);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Format a Date (instant) as YYYY-MM-DD in America/Bogota. */
function formatDateInTZ(d: Date): string {
  // Shift to UTC-5 manually (Bogotá no DST)
  const local = new Date(d.getTime() - 5 * 60 * 60 * 1000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, "0");
  const day = String(local.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function formatTimeInTZ(d: Date): string {
  const local = new Date(d.getTime() - 5 * 60 * 60 * 1000);
  const hh = String(local.getUTCHours()).padStart(2, "0");
  const mm = String(local.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}:00`;
}

function extractClientName(summary: string): string | null {
  if (!summary) return null;
  const m = summary.split(/\s[—\-|]\s/);
  const first = (m[0] ?? "").trim();
  if (!first) return null;
  // Avoid using a service name as a client name when no separator exists
  if (m.length === 1) return first;
  return first;
}

function buildNotes(summary: string, description: string): string {
  const parts: string[] = ["[Importado de Fresha vía Google Calendar]"];
  if (summary) parts.push(`Título: ${summary}`);
  if (description) parts.push(description);
  return parts.join("\n");
}

/* =====================================================================
 * FUTURE: bidirectional sync (App → Google Calendar)
 *
 * Para implementar la sincronización inversa cuando se cree/actualice una
 * reserva manual en la app, usaremos:
 *
 *   POST https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events
 *   {
 *     summary: `${clientName} — ${serviceName}`,
 *     description: notes,
 *     start: { dateTime: ISO, timeZone: "America/Bogota" },
 *     end:   { dateTime: ISO, timeZone: "America/Bogota" },
 *     extendedProperties: { private: { spa_booking_id: <uuid> } },
 *   }
 *
 * Y guardaremos el event.id devuelto en bookings.external_event_id.
 * Para updates: PATCH /events/{eventId}.
 * Para cancelaciones: DELETE /events/{eventId}.
 *
 * El scope debe ampliarse a "https://www.googleapis.com/auth/calendar".
 * ===================================================================== */