// Cron job (every 6h): inspects sync_log and sends an alert email when
//  1) the last successful sync (status='success' AND events_fetched > 0)
//     is older than 24h — only alert Mon–Sat in America/Bogota, or
//  2) the last 3 sync_log rows are all status='error'.
//
// The email is sent with the same Resend pattern used by send-booking-email:
// prefers the Lovable connector gateway, falls back to direct Resend API,
// and soft-fails (logs but never throws) so the cron never dies.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

// Same sender pattern as send-booking-email (will start delivering once
// notify.spalleras.com is verified in Resend).
const FROM_EMAIL = "Spa Lleras Alerts <alerts@notify.spalleras.com>";
const REPLY_TO = "hola@spalleras.com";
const ALERT_TO = "spallerasmedellin@gmail.com";

const STALE_SUCCESS_HOURS = 24;

interface SyncRow {
  id: string;
  created_at: string;
  status: "success" | "empty" | "error";
  events_fetched: number;
  events_imported: number;
  events_skipped: number;
  conflicts_detected: number;
  error_message: string | null;
  duration_ms: number | null;
}

/** Day of week in America/Bogota (0 = Sunday … 6 = Saturday). */
function bogotaDayOfWeek(d: Date): number {
  // Bogotá is UTC-5 year-round.
  const utcMs = d.getTime();
  const bogotaMs = utcMs - 5 * 60 * 60_000;
  return new Date(bogotaMs).getUTCDay();
}

function fmtBogota(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const bogota = new Date(d.getTime() - 5 * 60 * 60_000);
  const yyyy = bogota.getUTCFullYear();
  const mm = String(bogota.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(bogota.getUTCDate()).padStart(2, "0");
  const hh = String(bogota.getUTCHours()).padStart(2, "0");
  const mi = String(bogota.getUTCMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi} (Bogotá)`;
}

function statusEmoji(s: string): string {
  if (s === "success") return "✅";
  if (s === "empty") return "⚪️";
  if (s === "error") return "❌";
  return "•";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildAlertEmail(args: {
  reasons: string[];
  lastSuccess: SyncRow | null;
  last5: SyncRow[];
  lastError: SyncRow | null;
}): { subject: string; html: string; text: string } {
  const { reasons, lastSuccess, last5, lastError } = args;

  const subject =
    reasons.length > 1
      ? "🚨 Spa Lleras · Alertas de sincronización con Google Calendar"
      : `🚨 Spa Lleras · ${reasons[0]}`;

  const reasonsHtml = reasons
    .map((r) => `<li style="margin:4px 0">${escapeHtml(r)}</li>`)
    .join("");

  const rowsHtml = last5
    .map((r) => {
      const err = r.error_message
        ? ` — <code style="color:#b00020">${escapeHtml(r.error_message).slice(0, 200)}</code>`
        : "";
      return `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${statusEmoji(r.status)} ${r.status}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${fmtBogota(r.created_at)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${r.events_fetched}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${r.events_imported}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${r.conflicts_detected}${err}</td>
      </tr>`;
    })
    .join("");

  const lastErrBlock = lastError
    ? `<h3 style="color:#b00020;margin:24px 0 8px">Último error</h3>
       <p style="margin:0 0 4px"><strong>Cuándo:</strong> ${fmtBogota(lastError.created_at)}</p>
       <pre style="background:#fbeaea;border:1px solid #f3caca;border-radius:6px;padding:12px;white-space:pre-wrap;color:#7a1f1f;font-size:12px">${escapeHtml(lastError.error_message ?? "(sin mensaje)")}</pre>`
    : "";

  const html = `<!doctype html>
<html lang="es"><body style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f6f7f9;padding:24px;color:#1f2933">
  <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e4e7eb;border-radius:10px;overflow:hidden">
    <div style="background:#4D9B8A;color:#fff;padding:18px 22px">
      <h1 style="margin:0;font-size:18px;letter-spacing:.3px">Alerta de sincronización</h1>
      <p style="margin:4px 0 0;font-size:12px;opacity:.85">Spa Lleras · Google Calendar</p>
    </div>
    <div style="padding:20px 22px">
      <p style="margin:0 0 6px">Se detectó lo siguiente:</p>
      <ul style="margin:0 0 18px 20px;padding:0">${reasonsHtml}</ul>

      <p style="margin:0 0 4px"><strong>Último sync exitoso:</strong> ${
        lastSuccess ? fmtBogota(lastSuccess.created_at) : "Nunca registrado"
      }${lastSuccess ? ` — importó ${lastSuccess.events_imported} evento(s)` : ""}</p>

      <h3 style="margin:22px 0 8px">Últimos 5 ciclos</h3>
      <table style="border-collapse:collapse;width:100%;font-size:13px">
        <thead>
          <tr style="background:#f0f4f3;text-align:left">
            <th style="padding:8px 10px">Estado</th>
            <th style="padding:8px 10px">Cuándo</th>
            <th style="padding:8px 10px">Fetch</th>
            <th style="padding:8px 10px">Import</th>
            <th style="padding:8px 10px">Conflictos / Error</th>
          </tr>
        </thead>
        <tbody>${rowsHtml || `<tr><td colspan="5" style="padding:12px;text-align:center;color:#666">Sin registros aún</td></tr>`}</tbody>
      </table>

      ${lastErrBlock}

      <p style="margin:22px 0 0;font-size:12px;color:#667">Este correo lo envía la tarea programada <code>check-sync-health</code> cada 6 horas.</p>
    </div>
  </div>
</body></html>`;

  const textLines: string[] = [
    "Alerta de sincronización — Spa Lleras / Google Calendar",
    "",
    "Motivos:",
    ...reasons.map((r) => ` - ${r}`),
    "",
    `Último sync exitoso: ${lastSuccess ? fmtBogota(lastSuccess.created_at) : "Nunca registrado"}`,
    "",
    "Últimos 5 ciclos:",
    ...(last5.length
      ? last5.map(
          (r) =>
            `  ${statusEmoji(r.status)} ${r.status.padEnd(7)} ${fmtBogota(r.created_at)}  fetch=${r.events_fetched} import=${r.events_imported}${r.error_message ? `  err="${r.error_message.slice(0, 200)}"` : ""}`,
        )
      : ["  (sin registros)"]),
  ];
  if (lastError) {
    textLines.push(
      "",
      `Último error (${fmtBogota(lastError.created_at)}):`,
      lastError.error_message ?? "(sin mensaje)",
    );
  }
  const text = textLines.join("\n");

  return { subject, html, text };
}

async function sendViaResend(args: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: boolean; status: number; body: unknown }> {
  if (!RESEND_API_KEY) {
    return {
      ok: false,
      status: 0,
      body: {
        skipped: true,
        reason:
          "RESEND_API_KEY no configurado — email omitido. Se enviará cuando notify.spalleras.com esté verificado.",
      },
    };
  }

  const useGateway = LOVABLE_API_KEY.length > 0;
  const url = useGateway
    ? "https://connector-gateway.lovable.dev/resend/emails"
    : "https://api.resend.com/emails";

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (useGateway) {
    headers["Authorization"] = `Bearer ${LOVABLE_API_KEY}`;
    headers["X-Connection-Api-Key"] = RESEND_API_KEY;
  } else {
    headers["Authorization"] = `Bearer ${RESEND_API_KEY}`;
  }

  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [args.to],
      reply_to: REPLY_TO,
      subject: args.subject,
      html: args.html,
      text: args.text,
    }),
  });

  let body: unknown;
  try {
    body = await resp.json();
  } catch {
    body = { raw: await resp.text() };
  }
  return { ok: resp.ok, status: resp.status, body };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // 1. Last successful sync with events_fetched > 0
    const { data: successRows, error: successErr } = await supabase
      .from("sync_log")
      .select("*")
      .eq("status", "success")
      .gt("events_fetched", 0)
      .order("created_at", { ascending: false })
      .limit(1);
    if (successErr) throw successErr;
    const lastSuccess: SyncRow | null = (successRows?.[0] as SyncRow) ?? null;

    // 2. Last 5 rows (for report + condition #2 uses first 3)
    const { data: recentRows, error: recentErr } = await supabase
      .from("sync_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);
    if (recentErr) throw recentErr;
    const last5: SyncRow[] = (recentRows ?? []) as SyncRow[];

    // 3. Last row with an error message (for the "Último error" block)
    const { data: errorRows } = await supabase
      .from("sync_log")
      .select("*")
      .eq("status", "error")
      .order("created_at", { ascending: false })
      .limit(1);
    const lastError: SyncRow | null = (errorRows?.[0] as SyncRow) ?? null;

    // Evaluate conditions
    const now = new Date();
    const reasons: string[] = [];

    // Condition 1: stale successful sync (Mon–Sat in Bogotá only)
    const dow = bogotaDayOfWeek(now); // 0 = Sunday
    const isMonToSat = dow >= 1 && dow <= 6;
    let cond1 = false;
    let ageHours: number | null = null;
    if (isMonToSat) {
      if (!lastSuccess) {
        cond1 = true;
        reasons.push(
          `No hay ningún sync exitoso registrado en sync_log (esperado cada 10 min).`,
        );
      } else {
        ageHours =
          (now.getTime() - new Date(lastSuccess.created_at).getTime()) /
          (60 * 60 * 1000);
        if (ageHours > STALE_SUCCESS_HOURS) {
          cond1 = true;
          reasons.push(
            `El último sync exitoso con eventos tiene ${ageHours.toFixed(1)}h de antigüedad (umbral: ${STALE_SUCCESS_HOURS}h).`,
          );
        }
      }
    }

    // Condition 2: last 3 consecutive rows are all 'error'
    const last3 = last5.slice(0, 3);
    const cond2 = last3.length === 3 && last3.every((r) => r.status === "error");
    if (cond2) {
      reasons.push(`Los últimos 3 ciclos de sincronización terminaron en error.`);
    }

    const shouldAlert = cond1 || cond2;

    if (!shouldAlert) {
      return new Response(
        JSON.stringify({
          ok: true,
          alerted: false,
          checked_at: now.toISOString(),
          bogota_dow: dow,
          is_mon_to_sat: isMonToSat,
          last_success_at: lastSuccess?.created_at ?? null,
          last_success_age_hours: ageHours,
          last3_statuses: last3.map((r) => r.status),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { subject, html, text } = buildAlertEmail({
      reasons,
      lastSuccess,
      last5,
      lastError,
    });

    const result = await sendViaResend({ to: ALERT_TO, subject, html, text });

    if (!result.ok) {
      console.error(
        `[check-sync-health] email send failed status=${result.status}`,
        JSON.stringify(result.body),
      );
      return new Response(
        JSON.stringify({
          ok: false,
          alerted: false,
          deferred: true,
          reasons,
          send_status: result.status,
          send_detail: result.body,
          note:
            "Alert email could not be sent (likely missing/unverified sender domain). Health check itself ran successfully.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        alerted: true,
        reasons,
        to: ALERT_TO,
        last_success_at: lastSuccess?.created_at ?? null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[check-sync-health] error", msg);
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});