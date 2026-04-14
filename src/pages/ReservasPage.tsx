import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const mockBookings = [
  { id: 1, client: "María García", phone: "+57 300 123 4567", service: "Masaje Relajante 60min", therapist: "Ana Pérez", room: "Sala 1", date: "2024-01-15", time: "09:00", price: 185000, status: "Confirmada", source: "WhatsApp" },
  { id: 2, client: "Carlos López", phone: "+57 310 987 6543", service: "Tejido Profundo 90min", therapist: "Juan Rivera", room: "Sala 2", date: "2024-01-15", time: "10:30", price: 260000, status: "Pendiente", source: "Fresha" },
  { id: 3, client: "Laura Martínez", phone: "+57 320 555 1234", service: "Facial Premium", therapist: "Sofia Torres", room: "Sala 1", date: "2024-01-15", time: "14:00", price: 150000, status: "Confirmada", source: "Walk-in" },
  { id: 4, client: "James Smith", phone: "+1 555 123 4567", service: "Masaje Cuatro Manos 60min", therapist: "Ana & Juan", room: "Sala 2", date: "2024-01-15", time: "15:00", price: 370000, status: "Confirmada", source: "Email" },
  { id: 5, client: "Isabella Rodríguez", phone: "+57 315 222 3333", service: "Rooftop Experience", therapist: "—", room: "Rooftop", date: "2024-01-16", time: "16:00", price: 200000, status: "Pendiente", source: "WhatsApp" },
  { id: 6, client: "Pedro Sánchez", phone: "+57 301 444 5555", service: "Masaje Relajante 40min", therapist: "Sofia Torres", room: "Sala 1", date: "2024-01-16", time: "11:00", price: 160000, status: "Cancelada", source: "Fresha" },
];

const statusClasses: Record<string, string> = {
  Confirmada: "status-badge-confirmed",
  Pendiente: "status-badge-pending",
  Cancelada: "status-badge-cancelled",
  Completada: "status-badge-completed",
};

function formatCOP(amount: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(amount);
}

export default function ReservasPage() {
  const [search, setSearch] = useState("");
  const filtered = mockBookings.filter(
    (b) => b.client.toLowerCase().includes(search.toLowerCase()) || b.service.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl lg:text-3xl font-bold">Reservas</h1>
            <p className="text-muted-foreground text-sm mt-1">Gestiona todas las reservas del spa</p>
          </div>
          <Button variant="spa" className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Reserva
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente o servicio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
        </div>

        {/* Table */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Cliente</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Servicio</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Terapeuta</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Fecha/Hora</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Precio</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Fuente</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => (
                    <tr key={b.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer">
                      <td className="py-3 px-4">
                        <div className="font-medium">{b.client}</div>
                        <div className="text-xs text-muted-foreground">{b.phone}</div>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">{b.service}</td>
                      <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">{b.therapist}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium">{b.date}</div>
                        <div className="text-xs text-muted-foreground">{b.time}</div>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell font-medium">{formatCOP(b.price)}</td>
                      <td className="py-3 px-4 hidden lg:table-cell">
                        <Badge variant="secondary" className="text-xs">{b.source}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className={statusClasses[b.status]}>{b.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
