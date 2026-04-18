import { z } from "zod";

/* ============================================================
 * Spa business rules (single source of truth — keep aligned with
 * the prevent_double_booking() trigger in Postgres).
 * ============================================================ */
export const SPA_OPEN_TIME = "10:00";   // 10:00 AM
export const SPA_CLOSE_TIME = "22:00";  // 10:00 PM

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const timeToMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const todayISO = () => {
  const d = new Date();
  // Local-date string YYYY-MM-DD (avoid TZ off-by-one)
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};

/* ============================================================
 * CLIENT SCHEMA
 * ============================================================ */
export const ClientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "Máximo 100 caracteres"),
  email: z
    .string()
    .trim()
    .min(1, "El email es obligatorio")
    .email("Email inválido")
    .max(255, "Máximo 255 caracteres"),
  phone: z
    .string()
    .trim()
    .max(30, "Máximo 30 caracteres")
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(1000, "Máximo 1000 caracteres")
    .optional()
    .or(z.literal("")),
});
export type ClientFormValues = z.infer<typeof ClientSchema>;

/* ============================================================
 * BOOKING SCHEMA
 * ============================================================ */
export const BookingItemSchema = z.object({
  uid: z.string(),
  serviceId: z.string().min(1, "Selecciona un servicio"),
  durationId: z.string().min(1, "Selecciona la tarifa / duración"),
  quantity: z
    .number({ invalid_type_error: "Cantidad inválida" })
    .int()
    .min(1, "Mínimo 1")
    .max(10, "Máximo 10"),
});
export type BookingItemValues = z.infer<typeof BookingItemSchema>;

export const BookingSchema = z
  .object({
    clientId: z.string().min(1, "Selecciona un cliente"),
    nationality: z.string().trim().max(100).optional().or(z.literal("")),
    language: z.enum(["en", "es"]),
    date: z
      .string()
      .min(1, "Selecciona una fecha")
      .refine((d) => d >= todayISO(), "La fecha no puede ser en el pasado"),
    startTime: z
      .string()
      .regex(TIME_REGEX, "Hora inválida")
      .refine(
        (t) => timeToMinutes(t) >= timeToMinutes(SPA_OPEN_TIME),
        `El spa abre a las ${SPA_OPEN_TIME}`,
      )
      .refine(
        (t) => timeToMinutes(t) < timeToMinutes(SPA_CLOSE_TIME),
        `El spa cierra a las ${SPA_CLOSE_TIME}`,
      ),
    therapistId: z.string().min(1, "Selecciona el terapeuta"),
    secondTherapistId: z.string().optional().or(z.literal("")),
    resourceId: z.string().min(1, "Selecciona la sala / recurso"),
    source: z.enum(["whatsapp", "fresha", "email", "walk_in", "web"]),
    status: z.enum(["pendiente", "confirmada", "cancelada", "completada"]).default("pendiente"),
    notes: z.string().trim().max(1000, "Máximo 1000 caracteres").optional().or(z.literal("")),
    items: z.array(BookingItemSchema).min(1, "Agrega al menos un servicio"),

    /* Computed / cross-field context (not user-editable) */
    totalMinutes: z.number().int().min(1, "Servicios sin duración válida"),
    requiresTwoTherapists: z.boolean(),
  })
  .superRefine((data, ctx) => {
    /* End time must fit before close */
    const end = timeToMinutes(data.startTime) + data.totalMinutes;
    if (end > timeToMinutes(SPA_CLOSE_TIME)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startTime"],
        message: `La reserva termina después del cierre (${SPA_CLOSE_TIME}). Adelanta la hora o reduce los servicios.`,
      });
    }

    /* Two-therapist requirement */
    if (data.requiresTwoTherapists) {
      if (!data.secondTherapistId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["secondTherapistId"],
          message: "Esta reserva requiere un segundo terapeuta",
        });
      } else if (data.secondTherapistId === data.therapistId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["secondTherapistId"],
          message: "El segundo terapeuta debe ser distinto al principal",
        });
      }
    }
  });

export type BookingFormValues = z.infer<typeof BookingSchema>;

/* ============================================================
 * Helpers
 * ============================================================ */
export function calculateEndTime(start: string, mins: number): string {
  if (!start || mins <= 0) return "";
  const total = timeToMinutes(start) + mins;
  const eh = Math.floor(total / 60) % 24;
  const em = total % 60;
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
}

export function formatDuration(mins: number): string {
  if (mins <= 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export { todayISO };
