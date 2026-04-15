import { AppLayout } from "@/components/layout/AppLayout";
import { CalendarDays, Clock, Users, TrendingUp, CheckCircle, AlertCircle, XCircle, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, momentLocalizer, Views, type Event } from "react-big-calendar";
import moment from "moment";
import "moment/locale/es";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useCallback, useMemo, useState } from "react";

moment.locale("es");
const localizer = momentLocalizer(moment);

interface BookingEvent extends Event {
  client: string;
  service: string;
  therapist: string;
  room: string;
  status: string;
}

const today = new Date();
const d = (h: number, m = 0) => new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const dt = (h: number, m = 0) => new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), h, m);

const sampleEvents: BookingEvent[] = [
  { title: "María García — Masaje Relajante 60min", start: d(9, 0), end: d(10, 0), client: "María García", service: "Masaje Relajante 60min", therapist: "Ana", room: "Sala 1", status: "Completada" },
  { title: "Carlos López — Tejido Profundo 90min", start: d(10, 30), end: d(12, 0), client: "Carlos López", service: "Tejido Profundo 90min", therapist: "Juan", room: "Sala 2", status: "Confirmada" },
  { title: "Laura Martínez — Facial Premium", start: d(11, 0), end: d(12, 0), client: "Laura Martínez", service: "Facial Premium", therapist: "Sofia", room: "Sala 1", status: "Pendiente" },
  { title: "James Smith — Cuatro Manos 60min", start: d(14, 0), end: d(15, 0), client: "James Smith", service: "Masaje a Cuatro Manos 60min", therapist: "Ana & Juan", room: "Sala 2", status: "Confirmada" },
  { title: "Isabella Rodríguez — Rooftop Experience", start: d(15, 30), end: d(17, 0), client: "Isabella Rodríguez", service: "Rooftop Experience", therapist: "—", room: "Rooftop", status: "Confirmada" },
  { title: "Pedro Sánchez — Masaje Relajante 40min", start: d(16, 0), end: d(16, 40), client: "Pedro Sánchez", service: "Masaje Relajante 40min", therapist: "Sofia", room: "Sala 1", status: "Pendiente" },
  { title: "Andrea Ruiz — Tejido Profundo 60min", start: dt(9, 0), end: dt(10, 0), client: "Andrea Ruiz", service: "Tejido Profundo 60min", therapist: "Ana", room: "Sala 1", status: "Confirmada" },
  { title: "Diego Fernández — Masaje Relajante 90min", start: dt(11, 0), end: dt(12, 30), client: "Diego Fernández", service: "Masaje Relajante 90min", therapist: "Juan", room: "Sala 2", status: "Pendiente" },
];

const statusColors: Record<string, string> = {
  Completada: "hsl(210, 60%, 50%)",
  Confirmada: "hsl(168, 45%, 40%)",
  Pendiente: "hsl(42, 60%, 55%)",
  Cancelada: "hsl(0, 72%, 51%)",
};

const stats = [
  { label: "Reservas Hoy", value: "8", icon: CalendarDays, change: "+2 vs ayer" },
  { label: "Próxima Cita", value: "10:30 AM", icon: Clock, change: "Masaje Relajante" },
  { label: "Terapeutas Activos", value: "3", icon: Users, change: "de 4 total" },
  { label: "Ingresos Hoy", value: "$1.2M COP", icon: TrendingUp, change: "≈ $350 USD" },
];

const todayBookings = [
  { time: "09:00", client: "María García", service: "Masaje Relajante 60min", therapist: "Ana", room: "Sala 1", status: "Completada" },
  { time: "10:30", client: "Carlos López", service: "Tejido Profundo 90min", therapist: "Juan", room: "Sala 2", status: "Confirmada" },
  { time: "11:00", client: "Laura Martínez", service: "Facial Premium", therapist: "Sofia", room: "Sala 1", status: "Pendiente" },
  { time: "14:00", client: "James Smith", service: "Masaje a Cuatro Manos 60min", therapist: "Ana & Juan", room: "Sala 2", status: "Confirmada" },
  { time: "15:30", client: "Isabella Rodríguez", service: "Rooftop Experience", therapist: "—", room: "Rooftop", status: "Confirmada" },
  { time: "16:00", client: "Pedro Sánchez", service: "Masaje Relajante 40min", therapist: "Sofia", room: "Sala 1", status: "Pendiente" },
];

const statusConfig: Record<string, { icon: React.ElementType; className: string }> = {
  Completada: { icon: CheckCircle, className: "status-badge-completed" },
  Confirmada: { icon: CheckCircle, className: "status-badge-confirmed" },
  Pendiente: { icon: AlertCircle, className: "status-badge-pending" },
  Cancelada: { icon: XCircle, className: "status-badge-cancelled" },
};

const messages = {
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

export default function DashboardPage() {
  const [view, setView] = useState<(typeof Views)[keyof typeof Views]>(Views.WEEK);
  const [date, setDate] = useState(new Date());

  const eventStyleGetter = useCallback((event: BookingEvent) => {
    const bg = statusColors[event.status] || "hsl(168, 45%, 40%)";
    return {
      style: {
        backgroundColor: bg,
        borderRadius: "6px",
        border: "none",
        color: "#fff",
        fontSize: "0.75rem",
        padding: "2px 6px",
        opacity: 0.95,
      },
    };
  }, []);

  const { defaultDate } = useMemo(() => ({ defaultDate: new Date() }), []);

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

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-border/50 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                  </div>
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <stat.icon className="h-4 w-4 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Calendar */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Calendario de Reservas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="spa-calendar">
              <Calendar<BookingEvent>
                localizer={localizer}
                events={sampleEvents}
                defaultDate={defaultDate}
                date={date}
                onNavigate={setDate}
                view={view}
                onView={setView}
                views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 600 }}
                eventPropGetter={eventStyleGetter}
                messages={messages}
                min={new Date(0, 0, 0, 7, 0)}
                max={new Date(0, 0, 0, 21, 0)}
                step={30}
                timeslots={2}
                popup
              />
            </div>
          </CardContent>
        </Card>

        {/* Today's Schedule */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Timer className="h-5 w-5 text-primary" />
              Agenda del Día
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Hora</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Cliente</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground hidden md:table-cell">Servicio</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground hidden lg:table-cell">Terapeuta</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground hidden lg:table-cell">Recurso</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {todayBookings.map((booking, i) => {
                    const sc = statusConfig[booking.status];
                    return (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-3 font-medium">{booking.time}</td>
                        <td className="py-3 px-3">{booking.client}</td>
                        <td className="py-3 px-3 hidden md:table-cell text-muted-foreground">{booking.service}</td>
                        <td className="py-3 px-3 hidden lg:table-cell text-muted-foreground">{booking.therapist}</td>
                        <td className="py-3 px-3 hidden lg:table-cell text-muted-foreground">{booking.room}</td>
                        <td className="py-3 px-3">
                          <Badge variant="outline" className={sc?.className}>
                            {booking.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Occupancy */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {["Agua", "Aire", "Tierra", "Fuego", "Yin and Yang", "Africa", "Consultorio 1", "Consultorio 2", "Rooftop"].map((resource) => (
            <Card key={resource} className="border-border/50 shadow-sm">
              <CardContent className="p-4">
                <h3 className="font-medium text-sm">{resource}</h3>
                <div className="mt-3 space-y-2">
                  {[
                    { time: "09:00 - 10:00", busy: ["Agua", "Aire", "Tierra"].includes(resource) },
                    { time: "10:30 - 12:00", busy: ["Fuego", "Yin and Yang"].includes(resource) },
                    { time: "14:00 - 15:00", busy: ["Africa", "El Consultorio"].includes(resource) },
                    { time: "15:30 - 16:30", busy: resource === "Rooftop" },
                  ].map((slot) => (
                    <div
                      key={slot.time}
                      className={`text-xs px-3 py-1.5 rounded-md ${
                        slot.busy ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {slot.time} {slot.busy ? "● Ocupado" : "○ Libre"}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Calendar Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          {Object.entries(statusColors).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: color }} />
              {status}
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
