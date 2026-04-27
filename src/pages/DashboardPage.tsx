import { AppLayout } from "@/components/layout/AppLayout";
import { CalendarDays, Clock, Users, TrendingUp, CheckCircle, AlertCircle, XCircle, MessageCircle, DollarSign, Loader2 } from "lucide-react";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Calendar, momentLocalizer, Views, type Event, type SlotInfo } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import moment from "moment";
import "moment/locale/es";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import { useCallback, useMemo, useState } from "react";
import { useEffect } from "react";
import { useBookings, useUpdateBooking, type Booking } from "@/hooks/useBookings";
import { useTherapists } from "@/hooks/useTherapists";
import { useResources } from "@/hooks/useResources";
import BookingFormDialog from "@/components/BookingFormDialog";
import BookingEditDialog from "@/components/BookingEditDialog";
import UpcomingBookingsWidget from "@/components/UpcomingBookingsWidget";
import AvailabilityWidget from "@/components/AvailabilityWidget";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

moment.locale("es");
const localizer = momentLocalizer(moment);

interface BookingEvent extends Event {
  status: string;
  bookingId: string;
}

const DnDCalendar = withDragAndDrop<BookingEvent>(Calendar as never);

// Status colors: pendiente=amarillo, confirmada=verde, cancelada=rojo, completada=gris
const statusColors: Record<string, string> = {
  pendiente: "hsl(42, 90%, 55%)",
  confirmada: "hsl(142, 55%, 42%)",
  cancelada: "hsl(0, 72%, 51%)",
  completada: "hsl(220, 10%, 55%)",
};

const statusLabels: Record<string, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  completada: "Completada",
};

const statusConfig: Record<string, { icon: React.ElementType; className: string }> = {
  completada: { icon: CheckCircle, className: "status-badge-completed" },
  confirmada: { icon: CheckCircle, className: "status-badge-confirmed" },
  pendiente: { icon: AlertCircle, className: "status-badge-pending" },
  cancelada: { icon: XCircle, className: "status-badge-cancelled" },
};

const calendarMessages = {
  allDay: "Todo el día",
  previous: "Anterior",
  next: "Siguiente",
  today: "Hoy",
  month: "Mes",
  week: "Semana",
  day: "Día",
  agenda: "Agenda",
  date: "Fecha",
  time: "Hora",
  event: "Evento",
  noEventsInRange: "No hay reservas en este rango.",
  showMore: (total: number) => `+${total} más`,
};

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);
}

function formatUSD(n: number) {
  return `$${n} USD`;
}

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: monday.toISOString().split("T")[0], end: sunday.toISOString().split("T")[0] };
}

export default function DashboardPage() {
  const { data: bookings, isLoading: loadingB } = useBookings();
  const { data: therapists, isLoading: loadingT } = useTherapists();
  const { data: resources, isLoading: loadingR } = useResources();
  const updateBooking = useUpdateBooking();
  const isMobile = useIsMobile();

  const [view, setView] = useState<(typeof Views)[keyof typeof Views]>(
    isMobile ? Views.AGENDA : Views.WEEK,
  );
  const [date, setDate] = useState(new Date());

  /* When viewport switches to mobile, force agenda view */
  useEffect(() => {
    if (isMobile && (view === Views.WEEK || view === Views.MONTH)) {
      setView(Views.AGENDA);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  // Interactive dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState<string | undefined>();
  const [createTime, setCreateTime] = useState<string | undefined>();
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const today = getToday();
  const week = getWeekRange();

  // Derived metrics
  const metrics = useMemo(() => {
    if (!bookings) return null;

    const todayBookings = bookings.filter((b) => b.booking_date === today && b.status !== "cancelada");
    const weekBookings = bookings.filter((b) => b.booking_date >= week.start && b.booking_date <= week.end && b.status !== "cancelada");
    const pendingBookings = bookings.filter((b) => b.status === "pendiente");
    const whatsappPending = pendingBookings.filter((b) => b.source === "whatsapp");

    const todayCOP = todayBookings.reduce((sum, b) => sum + (b.price_cop ?? 0), 0);
    const todayUSD = todayBookings.reduce((sum, b) => sum + (b.price_usd ?? 0), 0);
    const weekCOP = weekBookings.reduce((sum, b) => sum + (b.price_cop ?? 0), 0);
    const weekUSD = weekBookings.reduce((sum, b) => sum + (b.price_usd ?? 0), 0);

    // Occupancy: hours booked today vs total available hours (9 resources × 14h day = 126h)
    const totalAvailableMinutes = (resources?.length ?? 9) * 14 * 60;
    const bookedMinutes = todayBookings.reduce((sum, b) => {
      const [sh, sm] = (b.start_time ?? "00:00").split(":").map(Number);
      const [eh, em] = (b.end_time ?? "00:00").split(":").map(Number);
      return sum + ((eh * 60 + em) - (sh * 60 + sm));
    }, 0);
    const occupancy = totalAvailableMinutes > 0 ? Math.round((bookedMinutes / totalAvailableMinutes) * 100) : 0;

    // Next booking
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const upcoming = todayBookings
      .filter((b) => (b.start_time ?? "") >= currentTime)
      .sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""));

    return {
      todayBookings,
      weekBookings,
      pendingBookings,
      whatsappPending,
      todayCOP,
      todayUSD,
      weekCOP,
      weekUSD,
      occupancy,
      nextBooking: upcoming[0] ?? null,
      activeTherapists: therapists?.filter((t) => t.is_available).length ?? 0,
      totalTherapists: therapists?.length ?? 0,
    };
  }, [bookings, therapists, resources, today, week.start, week.end]);

  // Calendar events (include all statuses; canceladas mostradas en rojo, completadas en gris)
  const calendarEvents = useMemo<BookingEvent[]>(() => {
    if (!bookings) return [];
    return bookings.map((b) => {
      const [y, m, d] = b.booking_date.split("-").map(Number);
      const [sh, sm] = (b.start_time ?? "09:00").split(":").map(Number);
      const [eh, em] = (b.end_time ?? "10:00").split(":").map(Number);
      const clientName = b.clients?.name ?? "Sin cliente";
      const serviceName = b.booking_items?.length
        ? b.booking_items.map((i) => i.services?.name ?? "").join(", ")
        : b.services?.name ?? "Servicio";
      return {
        title: `${clientName} — ${serviceName}`,
        start: new Date(y, m - 1, d, sh, sm),
        end: new Date(y, m - 1, d, eh, em),
        status: b.status ?? "pendiente",
        bookingId: b.id,
      };
    });
  }, [bookings]);

  // Resource occupancy for today
  const resourceOccupancy = useMemo(() => {
    if (!resources || !metrics) return [];
    return resources.map((r) => {
      const bookingsForResource = metrics.todayBookings.filter((b) => b.resource_id === r.id);
      return {
        ...r,
        slots: bookingsForResource.map((b) => ({
          start: (b.start_time ?? "").slice(0, 5),
          end: (b.end_time ?? "").slice(0, 5),
          client: b.clients?.name ?? "—",
        })),
      };
    });
  }, [resources, metrics]);

  const eventStyleGetter = useCallback((event: BookingEvent) => {
    const bg = statusColors[event.status] || "hsl(168, 45%, 40%)";
    const isCancelled = event.status === "cancelada";
    return {
      style: {
        backgroundColor: bg,
        borderRadius: "6px",
        border: "none",
        color: "#fff",
        fontSize: "0.75rem",
        padding: "2px 6px",
        opacity: isCancelled ? 0.6 : 0.95,
        textDecoration: isCancelled ? "line-through" : "none",
      },
    };
  }, []);

  const formatTime = (d: Date) =>
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const formatDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const handleSelectSlot = useCallback((slot: SlotInfo) => {
    setCreateDate(formatDate(slot.start as Date));
    setCreateTime(formatTime(slot.start as Date));
    setCreateOpen(true);
  }, []);

  const handleSelectEvent = useCallback(
    (event: BookingEvent) => {
      const b = bookings?.find((x) => x.id === event.bookingId);
      if (!b) return;
      setEditBooking(b);
      setEditOpen(true);
    },
    [bookings],
  );

  const handleEventDrop = useCallback(
    async ({ event, start, end }: { event: BookingEvent; start: Date | string; end: Date | string }) => {
      const b = bookings?.find((x) => x.id === event.bookingId);
      if (!b) return;
      const s = typeof start === "string" ? new Date(start) : start;
      const e = typeof end === "string" ? new Date(end) : end;
      const newDate = formatDate(s);
      const newStart = `${formatTime(s)}:00`;
      const newEnd = `${formatTime(e)}:00`;
      try {
        await updateBooking.mutateAsync({
          id: b.id,
          booking: {
            booking_date: newDate,
            start_time: newStart,
            end_time: newEnd,
          },
          items: (b.booking_items ?? []).map((it) => ({
            service_id: it.service_id,
            service_duration_id: it.service_duration_id ?? null,
            quantity: it.quantity,
            price_cop: it.price_cop,
            price_usd: it.price_usd,
          })),
        });
        toast.success("Reserva movida", {
          description: `${b.clients?.name ?? "Cliente"} → ${newDate} ${newStart.slice(0, 5)}`,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "No se pudo mover la reserva";
        toast.error("Error al mover", { description: msg });
      }
    },
    [bookings, updateBooking],
  );

  if (loadingB || loadingT || loadingR) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const m = metrics!;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Hoy, {new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Reservas Hoy</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{m.todayBookings.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {m.pendingBookings.length} pendiente(s)
                  </p>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <CalendarDays className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Ocupación Hoy</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{m.occupancy}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {m.activeTherapists} de {m.totalTherapists} terapeutas
                  </p>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-4 w-4 text-primary" />
                </div>
              </div>
              {/* Mini progress bar */}
              <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(m.occupancy, 100)}%` }} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Ingresos Hoy</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{formatCOP(m.todayCOP)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatUSD(m.todayUSD)}</p>
                </div>
                <div className="p-2 bg-accent/20 rounded-lg">
                  <DollarSign className="h-4 w-4 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Ingresos Semana</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{formatCOP(m.weekCOP)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatUSD(m.weekUSD)}</p>
                </div>
                <div className="p-2 bg-accent/20 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 🟢 PRIORIDAD 1: Espacios Disponibles — widget principal de acción rápida */}
        <AvailabilityWidget />

        {/* 🟢 PRIORIDAD 2: Próxima Cita (compacta) + Próximas 24h */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="border-border/50 shadow-sm lg:col-span-1">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-primary" />
                <h3 className="font-medium text-sm">Próxima Cita</h3>
              </div>
              {m.nextBooking ? (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-2.5 flex items-center gap-3">
                  <div className="font-heading font-bold text-xl text-primary leading-none">
                    {(m.nextBooking.start_time ?? "").slice(0, 5)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{m.nextBooking.clients?.name ?? "Sin cliente"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {m.nextBooking.booking_items?.length
                        ? m.nextBooking.booking_items.map((i) => i.services?.name).join(", ")
                        : m.nextBooking.services?.name ?? "—"}
                      {" · "}
                      {m.nextBooking.therapist?.name ?? "—"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No hay más citas programadas hoy</p>
              )}
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <UpcomingBookingsWidget />
          </div>
        </div>

        {/* 🟡 PRIORIDAD 3: WhatsApp pendientes — compacto */}
        {m.whatsappPending.length > 0 && (
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="h-4 w-4 text-green-600" />
                <h3 className="font-medium text-sm">Pendientes de WhatsApp</h3>
                <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                  {m.whatsappPending.length}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {m.whatsappPending.slice(0, 6).map((b) => (
                  <div key={b.id} className="flex items-center gap-2 text-xs bg-muted/40 px-2.5 py-1.5 rounded-md">
                    <span className="font-medium">{b.clients?.name ?? "—"}</span>
                    <span className="text-muted-foreground">
                      {b.booking_date} · {(b.start_time ?? "").slice(0, 5)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Calendar */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Calendario de Reservas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <p className="text-xs text-muted-foreground">
                💡 Clic en espacio vacío para crear, en un evento para editar, o arrástralo para moverlo.
              </p>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {Object.entries(statusColors).map(([status, color]) => (
                  <div key={status} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: color }} />
                    {statusLabels[status]}
                  </div>
                ))}
              </div>
            </div>
            <div className="spa-calendar">
              <DnDCalendar
                localizer={localizer}
                events={calendarEvents}
                date={date}
                onNavigate={setDate}
                view={view}
                onView={setView}
                views={isMobile ? [Views.DAY, Views.AGENDA] : [Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
                startAccessor="start"
                endAccessor="end"
                style={{ height: isMobile ? 380 : 460 }}
                eventPropGetter={eventStyleGetter}
                messages={calendarMessages}
                min={new Date(0, 0, 0, 7, 0)}
                max={new Date(0, 0, 0, 21, 0)}
                step={30}
                timeslots={2}
                popup
                selectable
                resizable={false}
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleSelectEvent}
                onEventDrop={handleEventDrop}
                draggableAccessor={(e) => e.status !== "cancelada" && e.status !== "completada"}
              />
            </div>
          </CardContent>
        </Card>

        {/* Interactive dialogs */}
        <BookingFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          initialDate={createDate}
          initialStartTime={createTime}
          hideTrigger
        />
        <BookingEditDialog
          booking={editBooking}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      </div>

      {/* Floating "Nueva Reserva" button — premium spa style.
          Larger on mobile, compact pill on desktop. */}
      <Button
        type="button"
        variant="spa"
        onClick={() => {
          setCreateDate(undefined);
          setCreateTime(undefined);
          setCreateOpen(true);
        }}
        aria-label="Nueva Reserva"
        className={cn(
          "fixed z-40 shadow-lg hover:shadow-xl transition-all",
          "ring-2 ring-accent/40 hover:ring-accent/70",
          // Mobile: round FAB bottom-right above safe area
          "h-14 w-14 rounded-full p-0 bottom-6 right-4",
          // Desktop: pill with label, sits above content
          "md:h-12 md:w-auto md:rounded-full md:px-5 md:bottom-8 md:right-8 md:gap-2",
        )}
      >
        <Plus className="h-6 w-6 md:h-5 md:w-5" />
        <span className="hidden md:inline font-medium">Nueva Reserva</span>
      </Button>
    </AppLayout>
  );
}
