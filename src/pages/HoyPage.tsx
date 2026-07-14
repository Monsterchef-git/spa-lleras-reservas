import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, MapPin, User, CalendarDays, PlayCircle } from "lucide-react";
import { useBookings, type Booking } from "@/hooks/useBookings";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-800 border-amber-200",
  confirmada: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelada: "bg-red-100 text-red-800 border-red-200",
  completada: "bg-slate-100 text-slate-700 border-slate-200",
};

const statusLabels: Record<string, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  completada: "Completada",
};

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toMinutes(t: string | null | undefined) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function fmtTime(t: string | null | undefined) {
  return (t ?? "").slice(0, 5);
}

function serviceLabel(b: Booking) {
  if (b.booking_items?.length) {
    return b.booking_items.map((i) => i.services?.name).filter(Boolean).join(" + ");
  }
  return b.services?.name ?? "—";
}

export default function HoyPage() {
  const { data: bookings, isLoading } = useBookings();
  const today = todayISO();

  // Live clock so the "en curso" indicator updates automatically.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const grouped = useMemo(() => {
    const list = (bookings ?? []).filter(
      (b) => b.booking_date === today && b.status !== "cancelada",
    );
    const byTherapist = new Map<string, { name: string; items: Booking[] }>();
    for (const b of list) {
      const key = b.therapist_id ?? "__sin__";
      const name = b.therapist?.name ?? "Sin terapeuta asignado";
      if (!byTherapist.has(key)) byTherapist.set(key, { name, items: [] });
      byTherapist.get(key)!.items.push(b);
    }
    for (const g of byTherapist.values()) {
      g.items.sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));
    }
    return Array.from(byTherapist.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "es"),
    );
  }, [bookings, today]);

  const totalToday = grouped.reduce((n, g) => n + g.items.length, 0);

  const headerDate = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-heading text-2xl lg:text-3xl font-bold text-foreground">
              Hoy
            </h1>
            <p className="text-muted-foreground text-sm mt-1 capitalize">
              {headerDate}
            </p>
          </div>
          <Badge variant="secondary" className="text-sm h-7 px-3">
            <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
            {totalToday} {totalToday === 1 ? "reserva" : "reservas"}
          </Badge>
        </div>

        {grouped.length === 0 ? (
          <Card className="border-border/50 shadow-sm">
            <CardContent className="py-12 text-center">
              <CalendarDays className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">
                No hay reservas programadas para hoy.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {grouped.map((group) => (
              <section key={group.name} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <h2 className="font-heading text-base font-semibold text-foreground">
                    {group.name}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    · {group.items.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {group.items.map((b) => {
                    const startMin = toMinutes(b.start_time);
                    const endMin = toMinutes(b.end_time);
                    const inProgress =
                      nowMin >= startMin && nowMin < endMin && b.status !== "completada";
                    const isFresha = b.source === "fresha";
                    return (
                      <Card
                        key={b.id}
                        className={cn(
                          "border-border/50 shadow-sm transition-colors",
                          inProgress && "border-primary/60 ring-2 ring-primary/25 bg-primary/5",
                        )}
                      >
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-stretch gap-3 sm:gap-4">
                            {/* Time column */}
                            <div
                              className={cn(
                                "flex flex-col items-center justify-center rounded-lg px-3 py-2 min-w-[74px] shrink-0",
                                inProgress
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-foreground",
                              )}
                            >
                              <span className="font-heading text-lg font-bold leading-none tabular-nums">
                                {fmtTime(b.start_time)}
                              </span>
                              <span
                                className={cn(
                                  "text-[10px] mt-1 tabular-nums",
                                  inProgress ? "text-primary-foreground/80" : "text-muted-foreground",
                                )}
                              >
                                {fmtTime(b.end_time)}
                              </span>
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-sm sm:text-base truncate">
                                  {b.clients?.name ?? "Sin cliente"}
                                </p>
                                {inProgress && (
                                  <Badge className="h-5 px-1.5 text-[10px] bg-primary text-primary-foreground border-transparent gap-1">
                                    <PlayCircle className="h-3 w-3" />
                                    En curso
                                  </Badge>
                                )}
                                {isFresha && (
                                  <Badge
                                    variant="outline"
                                    className="h-5 px-1.5 text-[10px] border-fuchsia-300 text-fuchsia-700 bg-fuchsia-50"
                                  >
                                    Fresha
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">
                                {serviceLabel(b)}
                              </p>
                              <div className="flex items-center gap-3 mt-1.5 text-[11px] sm:text-xs text-muted-foreground flex-wrap">
                                {b.resources?.name && (
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {b.resources.name}
                                  </span>
                                )}
                                {b.second_therapist?.name && (
                                  <span className="inline-flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    + {b.second_therapist.name}
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {endMin - startMin} min
                                </span>
                              </div>
                            </div>

                            {/* Status */}
                            <div className="flex items-start">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] sm:text-xs h-5 px-1.5",
                                  statusStyles[b.status ?? "pendiente"],
                                )}
                              >
                                {statusLabels[b.status ?? "pendiente"] ?? b.status}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}