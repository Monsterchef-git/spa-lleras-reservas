import type { UseFormSetError, FieldPath } from "react-hook-form";
import type { BookingFormValues } from "@/lib/schemas";

/**
 * Maps a Postgres error from the `prevent_double_booking` trigger
 * (or generic Supabase errors) into a user-friendly message and
 * the most relevant form field, so we can highlight it inline.
 *
 * Trigger raises with codes:
 *   22023 → invalid_parameter_value (range / business rule violations)
 *   23P01 → exclusion_violation (overlap / conflict)
 */
export interface MappedBookingError {
  field: FieldPath<BookingFormValues> | null;
  message: string;
}

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function mapBookingError(err: unknown): MappedBookingError {
  // PostgrestError shape: { message, code, details, hint }
  const e = (err ?? {}) as { message?: string; code?: string; details?: string };
  const rawMsg = e.message ?? (typeof err === "string" ? err : "Error desconocido");
  const code = e.code ?? "";
  const text = norm(rawMsg);

  // Trigger-specific mappings
  if (code === "22023" || code === "23P01" || /reserva|terapeuta|recurso|rooftop|sala|horario|spa/.test(text)) {
    if (/segundo terapeuta/.test(text)) {
      return { field: "secondTherapistId", message: rawMsg };
    }
    if (/terapeuta/.test(text)) {
      return { field: "therapistId", message: rawMsg };
    }
    if (/rooftop|sala|recurso/.test(text) || /esta ocupado/.test(text)) {
      return { field: "resourceId", message: rawMsg };
    }
    if (/hora de fin|hora de inicio|horario|10:00|22:00/.test(text)) {
      return { field: "startTime", message: rawMsg };
    }
    if (/fecha/.test(text)) {
      return { field: "date", message: rawMsg };
    }
    return { field: "startTime", message: rawMsg };
  }

  return { field: null, message: rawMsg };
}

/**
 * Apply the mapped error to the form: highlight inline AND surface
 * a toast if the field is unknown. Returns the message used.
 */
export function applyBookingError(
  err: unknown,
  setError: UseFormSetError<BookingFormValues>,
): MappedBookingError {
  const mapped = mapBookingError(err);
  if (mapped.field) {
    setError(mapped.field, { type: "server", message: mapped.message }, { shouldFocus: true });
  }
  return mapped;
}