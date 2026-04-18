// Bilingual HTML email templates for Spa Lleras booking notifications.
// Pure functions: receive a payload, return { subject, html }.
// Branding: teal (#3F9D8B) + soft gold (#D4AF7A), Playfair headings, Inter body.

export type Lang = "en" | "es";
export type EmailKind = "confirmation" | "update" | "reminder_24h" | "cancellation";

export interface BookingEmailPayload {
  clientName: string;
  bookingDate: string; // YYYY-MM-DD
  startTime: string;   // HH:MM
  endTime: string;     // HH:MM
  therapistName?: string | null;
  secondTherapistName?: string | null;
  resourceName?: string | null;
  totalCOP: number;
  totalUSD: number;
  items: Array<{
    serviceName: string;
    durationMinutes: number;
    quantity: number;
    priceCOP: number;
    priceUSD: number;
  }>;
  notes?: string | null;
}

const SPA = {
  name: "Spa Lleras",
  address: "Parque Lleras, Medellín, Colombia",
  whatsapp: "+57 300 000 0000",
  email: "hola@spalleras.com",
  website: "https://spalleras.com",
};

const COLORS = {
  teal: "#3F9D8B",
  tealDark: "#2D7A6B",
  tealLight: "#E8F4F1",
  gold: "#D4AF7A",
  goldLight: "#F5EDE0",
  text: "#1F2D2A",
  muted: "#6B7B78",
  border: "#E1ECEA",
  bg: "#ffffff",
};

function fmtCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(n);
}
function fmtUSD(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function fmtDate(date: string, lang: Lang) {
  // date is YYYY-MM-DD; render in friendly long format using the local lang.
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const locale = lang === "en" ? "en-US" : "es-CO";
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(dt);
}

function fmtDuration(mins: number, lang: Lang) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hLabel = lang === "en" ? "h" : "h";
  const mLabel = lang === "en" ? "min" : "min";
  if (h === 0) return `${m} ${mLabel}`;
  if (m === 0) return `${h}${hLabel}`;
  return `${h}${hLabel} ${m}${mLabel}`;
}

const T = {
  en: {
    confirmation: {
      subject: (n: string) => `✅ Booking Confirmed — ${SPA.name}`,
      heading: "Your booking is confirmed",
      intro: (n: string) => `Hi ${n}, we're delighted to welcome you to Spa Lleras. Here are your appointment details:`,
      cta: "We look forward to pampering you.",
    },
    update: {
      subject: () => `🔄 Booking Updated — ${SPA.name}`,
      heading: "Your booking has been updated",
      intro: (n: string) => `Hi ${n}, we've updated the details of your appointment. Please review them below:`,
      cta: "If anything looks wrong, let us know right away.",
    },
    reminder_24h: {
      subject: () => `⏰ Reminder: Your appointment tomorrow at ${SPA.name}`,
      heading: "See you tomorrow",
      intro: (n: string) => `Hi ${n}, this is a friendly reminder of your appointment tomorrow at Spa Lleras.`,
      cta: "Please arrive 10 minutes early to enjoy our welcome ritual.",
    },
    cancellation: {
      subject: () => `❌ Booking Cancelled — ${SPA.name}`,
      heading: "Your booking has been cancelled",
      intro: (n: string) => `Hi ${n}, we're confirming that your appointment has been cancelled.`,
      cta: "We hope to see you another time. Reply to this email or message us on WhatsApp to reschedule.",
    },
    labels: {
      date: "Date",
      time: "Time",
      duration: "Duration",
      therapist: "Therapist",
      secondTherapist: "Second therapist",
      room: "Room",
      services: "Your services",
      service: "Service",
      qty: "Qty",
      price: "Price",
      subtotal: "Subtotal",
      total: "Total",
      notes: "Notes",
      cancellationPolicy: "Cancellation policy",
      cancellationText: "Cancellations made less than 24 hours before the appointment may be charged 50% of the service price. No-shows are charged in full. Thank you for your understanding.",
      contactUs: "Contact us",
      address: "Address",
      footer: `© ${new Date().getFullYear()} ${SPA.name} · ${SPA.address}`,
    },
  },
  es: {
    confirmation: {
      subject: () => `✅ Reserva Confirmada — ${SPA.name}`,
      heading: "Tu reserva está confirmada",
      intro: (n: string) => `Hola ${n}, ¡gracias por reservar con Spa Lleras! Estos son los detalles de tu cita:`,
      cta: "Estamos listos para consentirte.",
    },
    update: {
      subject: () => `🔄 Reserva Actualizada — ${SPA.name}`,
      heading: "Tu reserva fue actualizada",
      intro: (n: string) => `Hola ${n}, hemos actualizado los detalles de tu cita. Por favor revísalos a continuación:`,
      cta: "Si algo no es correcto, avísanos lo antes posible.",
    },
    reminder_24h: {
      subject: () => `⏰ Recordatorio: Tu cita mañana en ${SPA.name}`,
      heading: "Te esperamos mañana",
      intro: (n: string) => `Hola ${n}, te recordamos cariñosamente que tu cita en Spa Lleras es mañana.`,
      cta: "Por favor llega 10 minutos antes para disfrutar nuestro ritual de bienvenida.",
    },
    cancellation: {
      subject: () => `❌ Reserva Cancelada — ${SPA.name}`,
      heading: "Tu reserva fue cancelada",
      intro: (n: string) => `Hola ${n}, confirmamos que tu cita ha sido cancelada.`,
      cta: "Esperamos verte en otra ocasión. Responde a este correo o escríbenos por WhatsApp para reprogramar.",
    },
    labels: {
      date: "Fecha",
      time: "Hora",
      duration: "Duración",
      therapist: "Terapeuta",
      secondTherapist: "Segundo terapeuta",
      room: "Sala",
      services: "Tus servicios",
      service: "Servicio",
      qty: "Cant.",
      price: "Precio",
      subtotal: "Subtotal",
      total: "Total",
      notes: "Notas",
      cancellationPolicy: "Política de cancelación",
      cancellationText: "Cancelaciones con menos de 24 horas de anticipación pueden tener un cargo del 50% del valor del servicio. La inasistencia se cobra al 100%. Agradecemos tu comprensión.",
      contactUs: "Contáctanos",
      address: "Dirección",
      footer: `© ${new Date().getFullYear()} ${SPA.name} · ${SPA.address}`,
    },
  },
} as const;

function escape(s: string | null | undefined) {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderItemsTable(items: BookingEmailPayload["items"], lang: Lang) {
  const L = T[lang].labels;
  const rows = items
    .map(
      (it) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.border};color:${COLORS.text};font-size:14px;">
            <strong>${escape(it.serviceName)}</strong>
            <div style="color:${COLORS.muted};font-size:12px;margin-top:2px;">
              ${fmtDuration(it.durationMinutes, lang)}${it.quantity > 1 ? ` × ${it.quantity}` : ""}
            </div>
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.border};color:${COLORS.text};font-size:14px;text-align:right;white-space:nowrap;">
            ${fmtCOP(it.priceCOP)}<br/>
            <span style="color:${COLORS.muted};font-size:12px;">${fmtUSD(it.priceUSD)}</span>
          </td>
        </tr>`,
    )
    .join("");
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:8px;">
      <thead>
        <tr>
          <th align="left" style="padding:8px 12px;background:${COLORS.tealLight};color:${COLORS.tealDark};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">${L.service}</th>
          <th align="right" style="padding:8px 12px;background:${COLORS.tealLight};color:${COLORS.tealDark};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">${L.price}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderDetailsBlock(p: BookingEmailPayload, lang: Lang) {
  const L = T[lang].labels;
  const totalMinutes = p.items.reduce(
    (acc, it) => acc + it.durationMinutes * it.quantity,
    0,
  );
  const rows: Array<[string, string]> = [
    [L.date, fmtDate(p.bookingDate, lang)],
    [L.time, `${p.startTime} – ${p.endTime}`],
    [L.duration, fmtDuration(totalMinutes, lang)],
  ];
  if (p.therapistName) rows.push([L.therapist, p.therapistName]);
  if (p.secondTherapistName) rows.push([L.secondTherapist, p.secondTherapistName]);
  if (p.resourceName) rows.push([L.room, p.resourceName]);

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:${COLORS.tealLight};border-radius:10px;overflow:hidden;margin:16px 0;">
      ${rows
        .map(
          ([k, v]) => `
        <tr>
          <td style="padding:10px 16px;color:${COLORS.muted};font-size:13px;width:40%;border-bottom:1px solid rgba(255,255,255,0.6);">${escape(k)}</td>
          <td style="padding:10px 16px;color:${COLORS.text};font-size:14px;font-weight:500;border-bottom:1px solid rgba(255,255,255,0.6);">${escape(v)}</td>
        </tr>`,
        )
        .join("")}
    </table>`;
}

export function renderBookingEmail(
  kind: EmailKind,
  payload: BookingEmailPayload,
  lang: Lang,
): { subject: string; html: string; text: string } {
  const t = T[lang][kind];
  const L = T[lang].labels;
  const subject = t.subject(payload.clientName);

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${escape(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.bg};font-family:Arial,Helvetica,sans-serif;color:${COLORS.text};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${COLORS.bg};border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04);border:1px solid ${COLORS.border};">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,${COLORS.teal} 0%,${COLORS.tealDark} 100%);padding:32px 28px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-family:'Playfair Display',Georgia,serif;font-size:28px;font-weight:600;letter-spacing:0.5px;">${SPA.name}</h1>
              <p style="margin:6px 0 0;color:${COLORS.goldLight};font-size:13px;letter-spacing:1.5px;text-transform:uppercase;">${SPA.address}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 28px;">
              <h2 style="margin:0 0 12px;color:${COLORS.tealDark};font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:600;">${escape(t.heading)}</h2>
              <p style="margin:0 0 16px;color:${COLORS.text};font-size:15px;line-height:1.6;">${escape(t.intro(payload.clientName))}</p>

              ${renderDetailsBlock(payload, lang)}

              <h3 style="margin:24px 0 8px;color:${COLORS.tealDark};font-family:'Playfair Display',Georgia,serif;font-size:17px;font-weight:600;">${escape(L.services)}</h3>
              ${renderItemsTable(payload.items, lang)}

              <!-- Total -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;border-collapse:collapse;background:${COLORS.goldLight};border-radius:10px;">
                <tr>
                  <td style="padding:14px 16px;color:${COLORS.text};font-size:15px;font-weight:600;">${escape(L.total)}</td>
                  <td style="padding:14px 16px;text-align:right;color:${COLORS.tealDark};font-size:18px;font-weight:700;font-family:'Playfair Display',Georgia,serif;">
                    ${fmtCOP(payload.totalCOP)}
                    <div style="color:${COLORS.muted};font-size:13px;font-weight:500;font-family:Arial,sans-serif;">${fmtUSD(payload.totalUSD)}</div>
                  </td>
                </tr>
              </table>

              ${
                payload.notes
                  ? `<div style="margin-top:18px;padding:12px 14px;background:${COLORS.tealLight};border-left:3px solid ${COLORS.teal};border-radius:6px;">
                       <strong style="color:${COLORS.tealDark};font-size:13px;">${escape(L.notes)}</strong>
                       <p style="margin:4px 0 0;color:${COLORS.text};font-size:14px;line-height:1.5;">${escape(payload.notes)}</p>
                     </div>`
                  : ""
              }

              <p style="margin:24px 0 0;color:${COLORS.text};font-size:14px;line-height:1.6;">${escape(t.cta)}</p>

              <!-- Cancellation policy -->
              <div style="margin-top:24px;padding:14px 16px;background:#FBF7EF;border:1px solid ${COLORS.gold};border-radius:8px;">
                <strong style="display:block;color:${COLORS.tealDark};font-size:13px;margin-bottom:4px;">${escape(L.cancellationPolicy)}</strong>
                <p style="margin:0;color:${COLORS.muted};font-size:12.5px;line-height:1.5;">${escape(L.cancellationText)}</p>
              </div>
            </td>
          </tr>

          <!-- Footer / contact -->
          <tr>
            <td style="background:#FAFBFB;padding:22px 28px;border-top:1px solid ${COLORS.border};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:12.5px;color:${COLORS.muted};line-height:1.7;">
                    <strong style="color:${COLORS.tealDark};">${escape(L.contactUs)}</strong><br/>
                    📍 ${escape(SPA.address)}<br/>
                    💬 WhatsApp: <a href="https://wa.me/${SPA.whatsapp.replace(/\D/g, "")}" style="color:${COLORS.teal};text-decoration:none;">${escape(SPA.whatsapp)}</a><br/>
                    ✉️ <a href="mailto:${SPA.email}" style="color:${COLORS.teal};text-decoration:none;">${escape(SPA.email)}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:18px 0 0;text-align:center;color:${COLORS.muted};font-size:11px;">${escape(L.footer)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // Plain text fallback
  const text = [
    t.heading,
    "",
    t.intro(payload.clientName),
    "",
    `${L.date}: ${fmtDate(payload.bookingDate, lang)}`,
    `${L.time}: ${payload.startTime} - ${payload.endTime}`,
    payload.therapistName ? `${L.therapist}: ${payload.therapistName}` : "",
    payload.secondTherapistName ? `${L.secondTherapist}: ${payload.secondTherapistName}` : "",
    payload.resourceName ? `${L.room}: ${payload.resourceName}` : "",
    "",
    L.services + ":",
    ...payload.items.map(
      (it) =>
        `  - ${it.serviceName} (${fmtDuration(it.durationMinutes, lang)}${it.quantity > 1 ? ` x${it.quantity}` : ""}) — ${fmtCOP(it.priceCOP)} / ${fmtUSD(it.priceUSD)}`,
    ),
    "",
    `${L.total}: ${fmtCOP(payload.totalCOP)} (${fmtUSD(payload.totalUSD)})`,
    "",
    t.cta,
    "",
    L.cancellationPolicy + ": " + L.cancellationText,
    "",
    `${SPA.name} — ${SPA.address}`,
    `WhatsApp: ${SPA.whatsapp} · ${SPA.email}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}
