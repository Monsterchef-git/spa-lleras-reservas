import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { loadServiceAccount, getGoogleAccessToken } from "../_shared/google-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // AuthN: must be a valid signed-in user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const calendarId = (body?.calendarId ?? "").toString().trim();
    if (!calendarId) return json({ error: "calendarId es requerido" }, 400);

    const sa = loadServiceAccount();
    const token = await getGoogleAccessToken(sa);

    const resp = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const data = await resp.json();
    if (!resp.ok) {
      return json({
        ok: false,
        error: data?.error?.message || `HTTP ${resp.status}`,
        hint:
          resp.status === 404
            ? `Verifica que el Calendar ID sea correcto y que hayas compartido el calendario con ${sa.client_email} (permiso "Ver eventos").`
            : undefined,
        client_email: sa.client_email,
      }, 200);
    }

    return json({
      ok: true,
      calendarName: data.summary,
      timeZone: data.timeZone,
      client_email: sa.client_email,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return json({ ok: false, error: msg }, 200);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}