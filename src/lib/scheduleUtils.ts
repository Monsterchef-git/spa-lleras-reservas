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

/** Format JS Date as "YYYY-MM-DD" in local time. */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Returns the quincena (1 = days 1-15, 2 = days 16-end) for the given date. */
export function quincenaOf(d: Date): 1 | 2 {
  return d.getDate() <= 15 ? 1 : 2;
}

/** Returns [start, end] (inclusive) of the quincena containing `date` as ISO strings. */
export function quincenaRange(date: Date): { from: string; to: string; label: string } {
  const y = date.getFullYear();
  const m = date.getMonth();
  const q = quincenaOf(date);
  const first = q === 1 ? new Date(y, m, 1) : new Date(y, m, 16);
  const last = q === 1 ? new Date(y, m, 15) : new Date(y, m + 1, 0);
  const monthName = first.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
  return {
    from: toISODate(first),
    to: toISODate(last),
    label: `${q === 1 ? "1ª" : "2ª"} quincena · ${monthName}`,
  };
}

/** Returns the next quincena's range. */
export function nextQuincenaRange(date: Date): { from: string; to: string; label: string } {
  const q = quincenaOf(date);
  const next = q === 1
    ? new Date(date.getFullYear(), date.getMonth(), 16)
    : new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return quincenaRange(next);
}

/** Iterate every ISO date between `from` and `to` inclusive. */
export function eachISODateInRange(from: string, to: string): string[] {
  const out: string[] = [];
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const cur = new Date(fy, fm - 1, fd);
  const end = new Date(ty, tm - 1, td);
  while (cur <= end) {
    out.push(toISODate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/** Default Spa Lleras template: Mon-Sat 10-19, Sun 10-17. */
export const DEFAULT_SPA_TEMPLATE: Record<number, { start: string; end: string } | null> = {
  0: { start: "10:00", end: "17:00" }, // Sunday
  1: { start: "10:00", end: "19:00" },
  2: { start: "10:00", end: "19:00" },
  3: { start: "10:00", end: "19:00" },
  4: { start: "10:00", end: "19:00" },
  5: { start: "10:00", end: "19:00" },
  6: { start: "10:00", end: "19:00" },
};
