import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import BookingFormDialog from "@/components/BookingFormDialog";

const mockBookings = [
  { id: 1, client: "María García", phone: "+57 300 123 4567", service: "Masaje Relajante 60min", therapist: "Ana Pérez", room: "Agua", date: "2024-01-15", time: "09:00", priceCOP: 185000, priceUSD: 55, status: "Confirmada", source: "WhatsApp", nationality: "Colombia", lang: "es" },
  { id: 2, client: "Carlos López", phone: "+57 310 987 6543", service: "Tejido Profundo 90min", therapist: "Juan Rivera", room: "Aire", date: "2024-01-15", time: "10:30", priceCOP: 260000, priceUSD: 75, status: "Pendiente", source: "Fresha", nationality: "Colombia", lang: "es" },
  { id: 3, client: "Laura Martínez", phone: "+57 320 555 1234", service: "Facial Premium", therapist: "Sofia Torres", room: "Tierra", date: "2024-01-15", time: "14:00", priceCOP: 150000, priceUSD: 45, status: "Confirmada", source: "Walk-in", nationality: "Colombia", lang: "es" },
  { id: 4, client: "James Smith", phone: "+1 555 123 4567", service: "Masaje Cuatro Manos 60min", therapist: "Ana & Juan", room: "Fuego", date: "2024-01-15", time: "15:00", priceCOP: 370000, priceUSD: 110, status: "Confirmada", source: "Email", nationality: "USA", lang: "en" },
  { id: 5, client: "Isabella Rodríguez", phone: "+57 315 222 3333", service: "Rooftop Experience", therapist: "—", room: "Rooftop", date: "2024-01-16", time: "16:00", priceCOP: 200000, priceUSD: 60, status: "Pendiente", source: "WhatsApp", nationality: "Argentina", lang: "es" },
  { id: 6, client: "Pedro Sánchez", phone: "+57 301 444 5555", service: "Masaje Relajante 40min", therapist: "Sofia Torres", room: "Consultorio 1", date: "2024-01-16", time: "11:00", priceCOP: 160000, priceUSD: 50, status: "Cancelada", source: "Fresha", nationality: "España", lang: "es" },
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

function formatUSD(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

const statuses = ["Todas", "Pendiente", "Confirmada", "Cancelada", "Completada"];
const sources = ["Todas", "Fresha", "WhatsApp", "Email", "Walk-in", "Web"];
const therapists = ["Todos", ...Array.from(new Set(mockBookings.map((b) => b.therapist).filter((t) => t !== "—")))];
const rooms = ["Todas", "Agua", "Aire", "Tierra", "Fuego", "Yin and Yang", "Africa", "Consultorio 1", "Consultorio 2", "Rooftop"];

export default function ReservasPage() {
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("Todas");
  const [sourceFilter, setSourceFilter] = useState("Todas");
  const [therapistFilter, setTherapistFilter] = useState("Todos");
  const [roomFilter, setRoomFilter] = useState("Todas");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const hasActiveFilters = statusFilter !== "Todas" || sourceFilter !== "Todas" || therapistFilter !== "Todos" || roomFilter !== "Todas" || dateFrom || dateTo;

  const clearFilters = () => {
    setStatusFilter("Todas");
    setSourceFilter("Todas");
    setTherapistFilter("Todos");
    setRoomFilter("Todas");
    setDateFrom("");
    setDateTo("");
  };

  const filtered = mockBookings.filter((b) => {
    const matchesSearch = b.client.toLowerCase().includes(search.toLowerCase()) || b.service.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "Todas" || b.status === statusFilter;
    const matchesSource = sourceFilter === "Todas" || b.source === sourceFilter;
    const matchesTherapist = therapistFilter === "Todos" || b.therapist === therapistFilter;
    const matchesRoom = roomFilter === "Todas" || b.room === roomFilter;
    const matchesDateFrom = !dateFrom || b.date >= dateFrom;
    const matchesDateTo = !dateTo || b.date <= dateTo;
    return matchesSearch && matchesStatus && matchesSource && matchesTherapist && matchesRoom && matchesDateFrom && matchesDateTo;
  });

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl lg:text-3xl font-bold">Reservas</h1>
            <p className="text-muted-foreground text-sm mt-1">Gestiona todas las reservas del spa</p>
          </div>
          <BookingFormDialog />
        </div>

        {/* Search + Filter toggle */}
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
          <Button
            variant={showFilters ? "default" : "outline"}
            className="gap-2"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
            Filtros
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">
                !
              </Badge>
            )}
          </Button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <Card className="border-border/50 shadow-sm animate-fade-in">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm">Filtros avanzados</h3>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" onClick={clearFilters}>
                    <X className="h-3 w-3" /> Limpiar filtros
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Estado</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Fuente</label>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {sources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Terapeuta</label>
                  <Select value={therapistFilter} onValueChange={setTherapistFilter}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {therapists.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Sala</label>
                  <Select value={roomFilter} onValueChange={setRoomFilter}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {rooms.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Desde</label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Hasta</label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 text-sm" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                     <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Idioma</th>
                     <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Fuente</th>
                     <th className="text-left py-3 px-4 font-medium text-muted-foreground">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground">
                        No se encontraron reservas con los filtros seleccionados
                      </td>
                    </tr>
                  )}
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
                      <td className="py-3 px-4 hidden md:table-cell">
                         <div className="font-medium">{formatCOP(b.priceCOP)}</div>
                         <div className="text-xs text-muted-foreground">{formatUSD(b.priceUSD)}</div>
                       </td>
                       <td className="py-3 px-4 hidden lg:table-cell">
                         <Badge variant="secondary" className="text-xs">{b.lang === "en" ? "🇺🇸 EN" : "🇪🇸 ES"}</Badge>
                       </td>
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
