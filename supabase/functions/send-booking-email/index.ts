// Send a booking notification email (confirmation, update, reminder_24h, cancellation).
//
// IMPORTANT: This function is preparado for the future custom domain
// `notify.spalleras.com`. Until that domain is configured and verified,
// any send attempt will fail; the function logs the error but does NOT
// throw, so it never blocks the booking flow itself.
//
// Once the domain is verified:
//   - Configure RESEND_API_KEY (or use Lovable's email connector) and
//     update FROM_EMAIL below to use notify.spalleras.com.
//   - Emails will start sending automatically with no further code changes.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import {
  renderBookingEmail,
  type BookingEmailPayload,
  type EmailKind,
  type Lang,
} from "../_shared/booking-email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

// Future sender — update once notify.spalleras.com is verified.
const FROM_EMAIL = "Spa Lleras <reservas@notify.spalleras.com>";
const REPLY_TO = "hola@spalleras.com";

interface InvokePayload {
  bookingId: string;
  kind: EmailKind;
  // optional override (used by reminder cron to force-send even if recently sent)
  force?: boolean;
}

async function fetchBookingForEmail(
  supabase: ReturnType<typeof createClient>,
  bookingId: string,
) {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id,
      booking_date,
      start_time,
      end_time,
      price_cop,
      price_usd,
      preferred_language,
      notes,
      status,
      last_notification_sent,
      clients:client_id ( name, email ),
      therapist:therapist_id ( name ),
      second_therapist:second_therapist_id ( name ),
      resource:resource_id ( name ),
      booking_items (
        quantity,
        price_cop,
        price_usd,
        services ( name ),
        service_durations ( duration_minutes )
      )
    `)
    .eq("id", bookingId)
    .maybeSingle();

  if (error) throw new Error(`fetch booking failed: ${error.message}`);
  if (!data) throw new Error(`booking not found: ${bookingId}`);
  return data as any;
}

function buildPayload(b: any): {
  payload: BookingEmailPayload;
  recipientEmail: string | null;
  lang: Lang;
} {
  const lang: Lang = (b.preferred_language === "es" ? "es" : "en");
  const items = (b.booking_items ?? []).map((it: any) => ({
    serviceName: it.services?.name ?? "Service",
    durationMinutes: it.service_durations?.duration_minutes ?? 0,
    quantity: it.quantity ?? 1,
    priceCOP: it.price_cop ?? 0,
    priceUSD: it.price_usd ?? 0,
  }));

  const payload: BookingEmailPayload = {
    clientName: b.clients?.name ?? (lang === "es" ? "Cliente" : "Guest"),
    bookingDate: b.booking_date,
    startTime: (b.start_time ?? "").slice(0, 5),
    endTime: (b.end_time ?? "").slice(0, 5),
    therapistName: b.therapist?.name ?? null,
    secondTherapistName: b.second_therapist?.name ?? null,
    resourceName: b.resource?.name ?? null,
    totalCOP: b.price_cop ?? 0,
    totalUSD: b.price_usd ?? 0,
    items,
    notes: b.notes ?? null,
  };

  return { payload, recipientEmail: b.clients?.email ?? null, lang };
}

async function sendViaResend(args: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: boolean; status: number; body: any }> {
  // Prefer the Lovable connector gateway if both keys exist.
  // Fall back to direct Resend API if only RESEND_API_KEY is set.
  // If neither is set, return a soft failure (logged, non-throwing).
  if (!RESEND_API_KEY) {
    return {
      ok: false,
      status: 0,
      body: {
        skipped: true,
        reason:
          "RESEND_API_KEY not configured — email skipped. Configure once notify.spalleras.com is verified.",
      },
    };
  }

  const useGateway = LOVABLE_API_KEY.length > 0;
  const url = useGateway
    ? "https://connector-gateway.lovable.dev/resend/emails"
    : "https://api.resend.com/emails";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
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

  let body: any;
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
    // --- AuthN/AuthZ: require a valid JWT belonging to admin or staff. ---
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    // Confirm the caller has an admin or staff role before sending client emails.
    const { data: roleRows } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const hasRole = (roleRows ?? []).some((r: { role: string }) =>
      r.role === "admin" || r.role === "staff"
    );
    if (!hasRole) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { bookingId, kind, force } = (await req.json()) as InvokePayload;
    if (!bookingId || !kind) {
      return new Response(
        JSON.stringify({ error: "bookingId and kind are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const booking = await fetchBookingForEmail(supabase, bookingId);

    // Skip duplicates: same kind sent within the last hour, unless forced.
    if (!force) {
      const last = booking.last_notification_sent?.[kind];
      if (last) {
        const ageMs = Date.now() - new Date(last).getTime();
        if (ageMs < 60 * 60 * 1000) {
          return new Response(
            JSON.stringify({ skipped: true, reason: "already sent recently" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }

    const { payload, recipientEmail, lang } = buildPayload(booking);
    if (!recipientEmail) {
      console.log(`[send-booking-email] booking ${bookingId} has no client email, skipping ${kind}`);
      return new Response(
        JSON.stringify({ skipped: true, reason: "no client email" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { subject, html, text } = renderBookingEmail(kind, payload, lang);
    const result = await sendViaResend({ to: recipientEmail, subject, html, text });

    if (!result.ok) {
      // Soft-fail: log details but return 200 so the booking flow is never blocked.
      console.error(
        `[send-booking-email] send failed status=${result.status}`,
        JSON.stringify(result.body),
      );
      return new Response(
        JSON.stringify({
          ok: false,
          deferred: true,
          status: result.status,
          detail: result.body,
          note:
            "Email could not be sent yet (likely missing/unverified domain). Booking flow not affected.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Persist last_notification_sent.
    const updated = {
      ...(booking.last_notification_sent ?? {}),
      [kind]: new Date().toISOString(),
    };
    await supabase
      .from("bookings")
      .update({ last_notification_sent: updated })
      .eq("id", bookingId);

    return new Response(
      JSON.stringify({ ok: true, kind, lang, to: recipientEmail }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[send-booking-email] error", err?.message ?? err);
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
