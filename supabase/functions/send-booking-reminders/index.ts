// Daily cron: finds active bookings 24h ahead and triggers reminder emails.
// Invoked by pg_cron once per day.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function tomorrowDateString(): string {
  // Bogotá is UTC-5 year-round; compute "tomorrow" in that timezone.
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  const bogotaMs = utcMs - 5 * 60 * 60_000;
  const bogotaDate = new Date(bogotaMs);
  bogotaDate.setUTCDate(bogotaDate.getUTCDate() + 1);
  const y = bogotaDate.getUTCFullYear();
  const m = String(bogotaDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(bogotaDate.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const target = tomorrowDateString();

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("id, last_notification_sent")
      .eq("booking_date", target)
      .in("status", ["pendiente", "confirmada"]);

    if (error) throw error;

    const results: Array<{ id: string; status: string }> = [];

    for (const b of bookings ?? []) {
      const alreadySent = (b as any).last_notification_sent?.reminder_24h;
      if (alreadySent) {
        results.push({ id: b.id, status: "skipped_already_sent" });
        continue;
      }
      try {
        const resp = await supabase.functions.invoke("send-booking-email", {
          body: { bookingId: b.id, kind: "reminder_24h" },
        });
        if (resp.error) {
          results.push({ id: b.id, status: `error:${resp.error.message}` });
        } else {
          results.push({ id: b.id, status: "queued" });
        }
      } catch (e: any) {
        results.push({ id: b.id, status: `exception:${e?.message ?? e}` });
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        target_date: target,
        total: bookings?.length ?? 0,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[send-booking-reminders] error", err?.message ?? err);
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
