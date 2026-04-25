import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sparkles,
  CircleDot,
  Clock,
  MapPin,
  User,
  CalendarPlus,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBookings, type Booking } from "@/hooks/useBookings";
import { useTherapists, type Therapist } from "@/hooks/useTherapists";
import { useResources, type Resource } from "@/hooks/useResources";
import BookingFormDialog from "@/components/BookingFormDialog";

/* ──────────────────────────────────────────────────────────────────────────
   Helpers (pure, time-string based — keeps it cheap and avoids tz bugs)
   ────────────────────────────────────────────────────────────────────────── */

const DAY_OPEN = 10 * 60; // 10:00
const DAY_CLOSE = 22 * 60; // 22:00
const SLOT_MIN = 60; // length of suggested free blocks
const NEXT_HOURS_WINDOW = 4 * 60; // "Próximas 4 horas" filter (minutes)

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function toMin(hhmm: string | null | undefined): number {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function fromMin(m: number): string {
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "·";
}

interface BusyInterval {
  start: number;
  end: number;
  label?: string;
}

/** Merge overlapping intervals, return sorted disjoint busy ranges. */
function mergeIntervals(list: BusyInterval[]): BusyInterval[] {
  const sorted = [...list].sort((a, b) => a.start - b.start);
  const out: BusyInterval[] = [];
  for (const iv of sorted) {
    const last = out[out.length - 1];
    if (last && iv.start < last.end) {
      last.end = Math.max(last.end, iv.end);
    } else {
      out.push({ ...iv });
    }
  }
  return out;
}

/** Free gaps in [from, to] given busy intervals. */
function freeGaps(from: number, to: number, busy: BusyInterval[]): BusyInterval[] {
  const merged = mergeIntervals(busy.filter((b) => b.end > from && b.start < to));
  const gaps: BusyInterval[] = [];
  let cursor = from;
  for (const b of merged) {
    if (b.start > cursor) gaps.push({ start: cursor, end: Math.min(b.start, to) });
    cursor = Math.max(cursor, b.end);
    if (cursor >= to) break;
  }
  if (cursor < to) gaps.push({ start: cursor, end: to });
  return gaps.filter((g) => g.end - g.start > 0);
}

/* ──────────────────────────────────────────────────────────────────────────
   Widget
   ────────────────────────────────────────────────────────────────────────── */

type Filter = "next4" | "all";

interface SlotSuggestion {
  start: number; // minutes from midnight
  end: number;
  therapistId: string;
  therapistName: string;
  resourceId: string;
  resourceName: string;
}

export default function AvailabilityWidget() {
  const { data: bookings } = useBookings();
  const { data: therapists } = useTherapists();
  const { data: resources } = useResources();

  const [filter, setFilter] = useState<Filter>("next4");

  /* Re-tick every minute so "Disponible ahora" stays accurate without polling. */
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const [createOpen, setCreateOpen] = useState(false);
  const [pre, setPre] = useState<{
    date: string;
    startTime: string;
    therapistId?: string;
    resourceId?: string;
  } | null>(null);

  const date = todayStr();
  const now = nowMinutes();

  /* Today's active bookings only (pendiente / confirmada). */
  const activeToday: Booking[] = useMemo(() => {
    if (!bookings) return [];
    return bookings.filter(
      (b) =>
        b.booking_date === date &&
        (b.status === "pendiente" || b.status === "confirmada"),
    );
  }, [bookings, date]);

  /* Busy intervals per therapist (covers principal + second). */
  const therapistBusy = useMemo(() => {
    const map = new Map<string, BusyInterval[]>();
    for (const t of therapists ?? []) map.set(t.id, []);
    for (const b of activeToday) {
      const iv: BusyInterval = {
        start: toMin(b.start_time),
        end: toMin(b.end_time),
        label: b.clients?.name ?? "",
      };
      if (b.therapist_id && map.has(b.therapist_id)) map.get(b.therapist_id)!.push(iv);
      if (b.second_therapist_id && map.has(b.second_therapist_id))
        map.get(b.second_therapist_id)!.push(iv);
    }
    return map;
  }, [activeToday, therapists]);

  /* Busy intervals per resource. */
  const resourceBusy = useMemo(() => {
    const map = new Map<string, BusyInterval[]>();
    for (const r of resources ?? []) map.set(r.id, []);
    for (const b of activeToday) {
      if (!b.resource_id || !map.has(b.resource_id)) continue;
      map.get(b.resource_id)!.push({
        start: toMin(b.start_time),
        end: toMin(b.end_time),
      });
    }
    return map;
  }, [activeToday, resources]);

  /* ── Section 1: Therapist status ────────────────────────────────── */
  const therapistStatus = useMemo(() => {
    return (therapists ?? [])
      .filter((t) => t.is_available !== false)
      .map((t) => {
        const busy = mergeIntervals(therapistBusy.get(t.id) ?? []);
        const current = busy.find((b) => b.start <= now && now < b.end);
        let nextFree: number | null = null;
        if (current) nextFree = current.end;
        else {
          // already free now — find next busy block to know window length
          const upcoming = busy.find((b) => b.start > now);
          nextFree = now;
          (void upcoming);
        }
        return {
          therapist: t,
          isBusy: !!current,
          freeAt: current ? current.end : now,
          nextBusyStart: busy.find((b) => b.start > now)?.start ?? DAY_CLOSE,
        };
      });
  }, [therapists, therapistBusy, now]);

  /* ── Section 2: Resource status ────────────────────────────────── */
  const resourceStatus = useMemo(() => {
    return (resources ?? [])
      .filter((r) => r.is_active !== false)
      .map((r) => {
        const busy = mergeIntervals(resourceBusy.get(r.id) ?? []);
        const current = busy.find((b) => b.start <= now && now < b.end);
        return {
          resource: r,
          isBusy: !!current,
          freeAt: current ? current.end : now,
        };
      });
  }, [resources, resourceBusy, now]);

  /* ── Section 3: Free time slots (combined: therapist + resource available) ── */
  const slotSuggestions: SlotSuggestion[] = useMemo(() => {
    if (!therapists || !resources) return [];
    const horizonStart = Math.max(now, DAY_OPEN);
    const horizonEnd =
      filter === "next4"
        ? Math.min(DAY_CLOSE, horizonStart + NEXT_HOURS_WINDOW)
        : DAY_CLOSE;

    if (horizonStart >= horizonEnd) return [];

    const activeTherapists = (therapists ?? []).filter((t) => t.is_available !== false);
    const activeResources = (resources ?? []).filter((r) => r.is_active !== false);
    if (!activeTherapists.length || !activeResources.length) return [];

    /* For every therapist × resource, compute intersection of free gaps. */
    const found: SlotSuggestion[] = [];
    for (const t of activeTherapists) {
      const tGaps = freeGaps(horizonStart, horizonEnd, therapistBusy.get(t.id) ?? []);
      for (const r of activeResources) {
        const rGaps = freeGaps(horizonStart, horizonEnd, resourceBusy.get(r.id) ?? []);
        // intersect tGaps with rGaps
        for (const tg of tGaps) {
          for (const rg of rGaps) {
            const s = Math.max(tg.start, rg.start);
            const e = Math.min(tg.end, rg.end);
            if (e - s >= SLOT_MIN) {
              // Round start up to next 15 min mark for cleaner suggestions
              const startRounded = Math.ceil(s / 15) * 15;
              if (e - startRounded >= SLOT_MIN) {
                found.push({
                  start: startRounded,
                  end: e,
                  therapistId: t.id,
                  therapistName: t.name,
                  resourceId: r.id,
                  resourceName: r.name,
                });
              }
            }
          }
        }
      }
    }

    /* De-duplicate by (start, end) — keep the first combo found.
       This gives Cata varied options instead of 30 rows of the same gap. */
    const seen = new Set<string>();
    const unique = found
      .sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start))
      .filter((s) => {
        const key = `${s.start}-${s.end}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    return unique.slice(0, 8);
  }, [therapists, resources, therapistBusy, resourceBusy, filter, now]);

  const handleSlotClick = (s: SlotSuggestion) => {
    setPre({
      date,
      startTime: fromMin(s.start),
      therapistId: s.therapistId,
      resourceId: s.resourceId,
    });
    setCreateOpen(true);
  };

  return (
    <>
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              Disponibilidad Actual y Huecos Libres
            </CardTitle>
            <div className="inline-flex rounded-md border border-border bg-muted/30 p-0.5">
              <button
                type="button"
                onClick={() => setFilter("next4")}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded transition-colors",
                  filter === "next4"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Próximas 4 horas
              </button>
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded transition-colors",
                  filter === "all"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Todo el día
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* ── Section 1: Therapists ────────────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              Terapeutas
            </h3>
            {therapistStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No hay terapeutas activos.</p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible">
                {therapistStatus.map(({ therapist: t, isBusy, freeAt }) => (
                  <div
                    key={t.id}
                    className={cn(
                      "shrink-0 w-[200px] sm:w-auto flex items-center gap-2.5 rounded-lg border p-2.5 transition-colors",
                      isBusy
                        ? "border-amber-300/60 bg-amber-50/60"
                        : "border-primary/20 bg-primary/5",
                    )}
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback
                        className={cn(
                          "text-xs font-semibold",
                          isBusy
                            ? "bg-amber-100 text-amber-800"
                            : "bg-primary/15 text-primary",
                        )}
                      >
                        {initialsOf(t.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{t.name}</div>
                      <div className="flex items-center gap-1 text-xs">
                        <CircleDot
                          className={cn(
                            "h-2.5 w-2.5",
                            isBusy ? "text-amber-600" : "text-emerald-600",
                          )}
                          fill="currentColor"
                        />
                        <span
                          className={cn(
                            "font-medium",
                            isBusy ? "text-amber-800" : "text-emerald-700",
                          )}
                        >
                          {isBusy ? `Ocupado · libre ${fromMin(freeAt)}` : "Disponible ahora"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Section 2: Resources ────────────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Espacios / Salas
            </h3>
            {resourceStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No hay salas activas.</p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible">
                {resourceStatus.map(({ resource: r, isBusy, freeAt }) => (
                  <div
                    key={r.id}
                    className={cn(
                      "shrink-0 w-[180px] sm:w-auto rounded-lg border p-3 transition-colors",
                      isBusy
                        ? "border-amber-300/60 bg-amber-50/60"
                        : "border-primary/20 bg-primary/5",
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <MapPin
                        className={cn(
                          "h-3.5 w-3.5",
                          isBusy ? "text-amber-600" : "text-primary",
                        )}
                      />
                      <span className="text-sm font-medium truncate">{r.name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <CircleDot
                        className={cn(
                          "h-2.5 w-2.5",
                          isBusy ? "text-amber-600" : "text-emerald-600",
                        )}
                        fill="currentColor"
                      />
                      <span
                        className={cn(
                          "font-medium",
                          isBusy ? "text-amber-800" : "text-emerald-700",
                        )}
                      >
                        {isBusy ? `Ocupado hasta ${fromMin(freeAt)}` : "Disponible"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Section 3: Free time slots ──────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Próximos huecos libres
              {slotSuggestions.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5">
                  {slotSuggestions.length}
                </Badge>
              )}
            </h3>

            {slotSuggestions.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
                <CheckCircle2 className="h-6 w-6 mx-auto text-muted-foreground/60 mb-2" />
                {filter === "next4"
                  ? "No hay huecos libres en las próximas 4 horas."
                  : "No quedan huecos libres hoy."}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {slotSuggestions.map((s, i) => {
                  const dur = s.end - s.start;
                  const isLong = dur >= 90;
                  return (
                    <button
                      key={`${s.start}-${s.end}-${s.therapistId}-${s.resourceId}-${i}`}
                      type="button"
                      onClick={() => handleSlotClick(s)}
                      className={cn(
                        "group text-left rounded-lg border p-3 transition-all",
                        "hover:border-primary hover:shadow-md hover:bg-primary/5",
                        "focus:outline-none focus:ring-2 focus:ring-primary/40",
                        isLong
                          ? "border-accent/40 bg-accent/5 ring-1 ring-accent/20"
                          : "border-border bg-card",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <Clock
                            className={cn(
                              "h-4 w-4",
                              isLong ? "text-accent" : "text-primary",
                            )}
                          />
                          <span className="font-heading font-bold text-base">
                            {fromMin(s.start)} – {fromMin(Math.min(s.end, s.start + 120))}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] h-4 px-1.5 font-medium",
                              isLong
                                ? "bg-accent/15 text-accent border-accent/40"
                                : "bg-primary/10 text-primary border-primary/30",
                            )}
                          >
                            {dur >= 120 ? "120+ min" : `${dur} min`}
                          </Badge>
                        </div>
                        <CalendarPlus
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-colors",
                            "group-hover:text-primary",
                          )}
                        />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {s.therapistName}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {s.resourceName}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </CardContent>
      </Card>

      <BookingFormDialog
        open={createOpen}
        onOpenChange={(v) => {
          setCreateOpen(v);
          if (!v) setPre(null);
        }}
        initialDate={pre?.date}
        initialStartTime={pre?.startTime}
        initialTherapistId={pre?.therapistId}
        initialResourceId={pre?.resourceId}
        hideTrigger
      />
    </>
  );
}

/* Re-export so other files can read the same types if needed. */
export type { Therapist, Resource };