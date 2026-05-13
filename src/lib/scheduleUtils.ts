import type { TherapistSchedule, ScheduleException } from "@/hooks/useTherapistSchedules";

export interface ResolvedSchedule {
  isWorking: boolean;
  startTime: string | null; // "HH:MM" or "HH:MM:SS"
  endTime: string | null;
  hasConfig: boolean;
  source: "exception" | "base" | "none";
}

/** Date string "YYYY-MM-DD" → JS day-of-week (0=Sun..6=Sat) */
function dowFromISO(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1).getDay();
}

function normalizeTime(t: string | null | undefined): string | null {
  if (!t) return null;
  return t.length >= 5 ? t.slice(0, 5) : t;
}

export function resolveScheduleForDate(
  baseSchedules: TherapistSchedule[] | undefined,
  exceptions: ScheduleException[] | undefined,
  therapistId: string,
  isoDate: string,
): ResolvedSchedule {
  const ex = (exceptions ?? []).find(
    (e) => e.therapist_id === therapistId && e.exception_date === isoDate,
  );
  if (ex) {
    const ok = !ex.is_day_off && !!ex.start_time && !!ex.end_time;
    return {
      isWorking: ok,
      startTime: normalizeTime(ex.start_time),
      endTime: normalizeTime(ex.end_time),
      hasConfig: true,
      source: "exception",
    };
  }
  const dow = dowFromISO(isoDate);
  const base = (baseSchedules ?? []).find(
    (b) => b.therapist_id === therapistId && b.day_of_week === dow,
  );
  if (base) {
    const ok = !base.is_day_off && !!base.start_time && !!base.end_time;
    return {
      isWorking: ok,
      startTime: normalizeTime(base.start_time),
      endTime: normalizeTime(base.end_time),
      hasConfig: true,
      source: "base",
    };
  }
  return { isWorking: true, startTime: null, endTime: null, hasConfig: false, source: "none" };
}

/** Compares "HH:MM" strings. Returns true if `time` is inside [start, end). */
export function isTimeWithin(time: string, start: string, end: string): boolean {
  return time >= start.slice(0, 5) && time < end.slice(0, 5);
}

export const DAY_NAMES_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const DAY_NAMES_LONG = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
