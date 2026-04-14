import { AppLayout } from "@/components/layout/AppLayout";
import { CalendarDays, Clock, Users, TrendingUp, CheckCircle, AlertCircle, XCircle, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const stats = [
  { label: "Reservas Hoy", value: "8", icon: CalendarDays, change: "+2 vs ayer" },
  { label: "Próxima Cita", value: "10:30 AM", icon: Clock, change: "Masaje Relajante" },
  { label: "Terapeutas Activos", value: "3", icon: Users, change: "de 4 total" },
  { label: "Ingresos Hoy", value: "$1.2M", icon: TrendingUp, change: "COP" },
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

export default function DashboardPage() {
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-foreground">
            Dashboard
          </h1>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {["Sala de Masajes 1", "Sala de Masajes 2", "Rooftop"].map((resource) => (
            <Card key={resource} className="border-border/50 shadow-sm">
              <CardContent className="p-4">
                <h3 className="font-medium text-sm">{resource}</h3>
                <div className="mt-3 space-y-2">
                  {[
                    { time: "09:00 - 10:00", busy: resource !== "Rooftop" },
                    { time: "10:30 - 12:00", busy: true },
                    { time: "14:00 - 15:00", busy: resource === "Sala de Masajes 2" },
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
      </div>
    </AppLayout>
  );
}
