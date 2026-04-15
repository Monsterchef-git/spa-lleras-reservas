// Bilingual message templates for WhatsApp and Email
// Each template has English (en) and Spanish (es) versions

export type TemplateLang = "en" | "es";

interface BookingData {
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  therapist: string;
  priceCOP: number;
  priceUSD: number;
  resource: string;
}

function formatCOP(amount: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(amount);
}

function formatUSD(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

// ─── Booking Confirmation ───
export function bookingConfirmation(data: BookingData, lang: TemplateLang) {
  const price = `${formatCOP(data.priceCOP)} (${formatUSD(data.priceUSD)})`;
  if (lang === "en") {
    return {
      subject: `Booking Confirmed – Spa Lleras`,
      whatsapp: `✅ *Booking Confirmed*\n\nHi ${data.clientName}! Your appointment is confirmed.\n\n🧖 *Service:* ${data.serviceName}\n📅 *Date:* ${data.date}\n🕐 *Time:* ${data.time}\n💆 *Therapist:* ${data.therapist}\n📍 *Location:* ${data.resource}\n💰 *Price:* ${price}\n\nWe look forward to seeing you!\n— Spa Lleras, Parque Lleras, Medellín`,
      email: {
        subject: `Your Booking is Confirmed – Spa Lleras`,
        body: `<h2>Booking Confirmed ✅</h2>
<p>Hi ${data.clientName},</p>
<p>Your appointment at <strong>Spa Lleras</strong> has been confirmed:</p>
<table style="border-collapse:collapse;margin:16px 0">
  <tr><td style="padding:4px 12px 4px 0;color:#888">Service</td><td>${data.serviceName}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#888">Date</td><td>${data.date}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#888">Time</td><td>${data.time}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#888">Therapist</td><td>${data.therapist}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#888">Location</td><td>${data.resource}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#888">Price</td><td>${price}</td></tr>
</table>
<p>We look forward to welcoming you!</p>
<p style="color:#888;font-size:12px">Spa Lleras · Parque Lleras, Medellín, Colombia</p>`,
      },
    };
  }
  return {
    subject: `Reserva Confirmada – Spa Lleras`,
    whatsapp: `✅ *Reserva Confirmada*\n\nHola ${data.clientName}, tu cita ha sido confirmada.\n\n🧖 *Servicio:* ${data.serviceName}\n📅 *Fecha:* ${data.date}\n🕐 *Hora:* ${data.time}\n💆 *Terapeuta:* ${data.therapist}\n📍 *Ubicación:* ${data.resource}\n💰 *Precio:* ${price}\n\n¡Te esperamos!\n— Spa Lleras, Parque Lleras, Medellín`,
    email: {
      subject: `Tu Reserva está Confirmada – Spa Lleras`,
      body: `<h2>Reserva Confirmada ✅</h2>
<p>Hola ${data.clientName},</p>
<p>Tu cita en <strong>Spa Lleras</strong> ha sido confirmada:</p>
<table style="border-collapse:collapse;margin:16px 0">
  <tr><td style="padding:4px 12px 4px 0;color:#888">Servicio</td><td>${data.serviceName}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#888">Fecha</td><td>${data.date}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#888">Hora</td><td>${data.time}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#888">Terapeuta</td><td>${data.therapist}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#888">Ubicación</td><td>${data.resource}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#888">Precio</td><td>${price}</td></tr>
</table>
<p>¡Te esperamos con gusto!</p>
<p style="color:#888;font-size:12px">Spa Lleras · Parque Lleras, Medellín, Colombia</p>`,
    },
  };
}

// ─── 24h Reminder ───
export function reminder24h(data: BookingData, lang: TemplateLang) {
  if (lang === "en") {
    return {
      whatsapp: `⏰ *Appointment Reminder*\n\nHi ${data.clientName}! This is a friendly reminder that your appointment is tomorrow.\n\n🧖 *Service:* ${data.serviceName}\n📅 *Date:* ${data.date}\n🕐 *Time:* ${data.time}\n📍 *Location:* ${data.resource}\n\nPlease arrive 10 minutes early. See you soon!\n— Spa Lleras`,
      email: {
        subject: `Reminder: Your Appointment Tomorrow – Spa Lleras`,
        body: `<h2>Appointment Reminder ⏰</h2>
<p>Hi ${data.clientName},</p>
<p>This is a friendly reminder about your appointment <strong>tomorrow</strong>:</p>
<table style="border-collapse:collapse;margin:16px 0">
  <tr><td style="padding:4px 12px 4px 0;color:#888">Service</td><td>${data.serviceName}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#888">Date</td><td>${data.date}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#888">Time</td><td>${data.time}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#888">Location</td><td>${data.resource}</td></tr>
</table>
<p>Please arrive 10 minutes early. We look forward to seeing you!</p>
<p style="color:#888;font-size:12px">Spa Lleras · Parque Lleras, Medellín</p>`,
      },
    };
  }
  return {
    whatsapp: `⏰ *Recordatorio de Cita*\n\nHola ${data.clientName}, te recordamos que tu cita es mañana.\n\n🧖 *Servicio:* ${data.serviceName}\n📅 *Fecha:* ${data.date}\n🕐 *Hora:* ${data.time}\n📍 *Ubicación:* ${data.resource}\n\nPor favor llega 10 minutos antes. ¡Te esperamos!\n— Spa Lleras`,
    email: {
      subject: `Recordatorio: Tu Cita Mañana – Spa Lleras`,
      body: `<h2>Recordatorio de Cita ⏰</h2>
<p>Hola ${data.clientName},</p>
<p>Te recordamos que tu cita es <strong>mañana</strong>:</p>
<table style="border-collapse:collapse;margin:16px 0">
  <tr><td style="padding:4px 12px 4px 0;color:#888">Servicio</td><td>${data.serviceName}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#888">Fecha</td><td>${data.date}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#888">Hora</td><td>${data.time}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#888">Ubicación</td><td>${data.resource}</td></tr>
</table>
<p>Por favor llega 10 minutos antes. ¡Te esperamos!</p>
<p style="color:#888;font-size:12px">Spa Lleras · Parque Lleras, Medellín</p>`,
    },
  };
}

// ─── Cancellation ───
export function bookingCancellation(data: BookingData, lang: TemplateLang) {
  if (lang === "en") {
    return {
      whatsapp: `❌ *Booking Cancelled*\n\nHi ${data.clientName}, your appointment has been cancelled.\n\n🧖 *Service:* ${data.serviceName}\n📅 *Date:* ${data.date}\n🕐 *Time:* ${data.time}\n\nIf you'd like to reschedule, please contact us.\n— Spa Lleras`,
      email: {
        subject: `Booking Cancelled – Spa Lleras`,
        body: `<h2>Booking Cancelled ❌</h2>
<p>Hi ${data.clientName},</p>
<p>Your appointment has been cancelled:</p>
<table style="border-collapse:collapse;margin:16px 0">
  <tr><td style="padding:4px 12px 4px 0;color:#888">Service</td><td>${data.serviceName}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#888">Date</td><td>${data.date}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#888">Time</td><td>${data.time}</td></tr>
</table>
<p>If you'd like to reschedule, please don't hesitate to contact us.</p>
<p style="color:#888;font-size:12px">Spa Lleras · Parque Lleras, Medellín</p>`,
      },
    };
  }
  return {
    whatsapp: `❌ *Reserva Cancelada*\n\nHola ${data.clientName}, tu cita ha sido cancelada.\n\n🧖 *Servicio:* ${data.serviceName}\n📅 *Fecha:* ${data.date}\n🕐 *Hora:* ${data.time}\n\nSi deseas reprogramar, contáctanos.\n— Spa Lleras`,
    email: {
      subject: `Reserva Cancelada – Spa Lleras`,
      body: `<h2>Reserva Cancelada ❌</h2>
<p>Hola ${data.clientName},</p>
<p>Tu cita ha sido cancelada:</p>
<table style="border-collapse:collapse;margin:16px 0">
  <tr><td style="padding:4px 12px 4px 0;color:#888">Servicio</td><td>${data.serviceName}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#888">Fecha</td><td>${data.date}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#888">Hora</td><td>${data.time}</td></tr>
</table>
<p>Si deseas reprogramar, no dudes en contactarnos.</p>
<p style="color:#888;font-size:12px">Spa Lleras · Parque Lleras, Medellín</p>`,
    },
  };
}

// ─── WhatsApp Language Detection ───
export function detectLanguage(message: string): TemplateLang {
  const englishWords = ["hello", "hi", "booking", "appointment", "massage", "want", "need", "please", "thank", "cancel", "reschedule", "available", "price", "how much", "do you", "can i", "i'd like", "good morning", "good afternoon"];
  const lower = message.toLowerCase();
  const englishScore = englishWords.filter((w) => lower.includes(w)).length;
  return englishScore >= 2 ? "en" : "es";
}
