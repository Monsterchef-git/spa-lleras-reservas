import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X, Loader2, Trash2, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import BookingFormDialog from "@/components/BookingFormDialog";
import BookingEditDialog from "@/components/BookingEditDialog";
import { useBookings, useUpdateBookingStatus, useDeleteBooking, type Booking } from "@/hooks/useBookings";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const statusClasses: Record<string, string> = {
  confirmada: "status-badge-confirmed",
  pendiente: "status-badge-pending",
  cancelada: "status-badge-cancelled",
  completada: "status-badge-completed",
};

const statusLabels: Record<string, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  completada: "Completada",
};

function formatCOP(amount: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(amount);
}

function formatUSD(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

const statuses = ["Todas", "pendiente", "confirmada", "cancelada", "completada"];
const sources = ["Todas", "fresha", "whatsapp", "email", "walk_in", "web"];

export default function ReservasPage() {
  const { data: bookings, isLoading } = useBookings();
  const updateStatus = useUpdateBookingStatus();
  const deleteBooking = useDeleteBooking();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("Todas");
  const [sourceFilter, setSourceFilter] = useState("Todas");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const hasActiveFilters = statusFilter !== "Todas" || sourceFilter !== "Todas" || dateFrom || dateTo;

  const clearFilters = () => {
    setStatusFilter("Todas");
    setSourceFilter("Todas");
    setDateFrom("");
    setDateTo("");
  };

  const filtered = (bookings ?? []).filter((b) => {
    const clientName = b.clients?.name ?? "";
    const serviceName = b.services?.name ?? b.booking_items?.map((i) => i.services?.name).join(", ") ?? "";
    const matchesSearch = clientName.toLowerCase().includes(search.toLowerCase()) || serviceName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "Todas" || b.status === statusFilter;
    const matchesSource = sourceFilter === "Todas" || b.source === sourceFilter;
    const matchesDateFrom = !dateFrom || b.booking_date >= dateFrom;
    const matchesDateTo = !dateTo || b.booking_date <= dateTo;
    return matchesSearch && matchesStatus && matchesSource && matchesDateFrom && matchesDateTo;
  });

  const handleStatusChange = async (id: string, status: "pendiente" | "confirmada" | "cancelada" | "completada") => {
    try {
      await updateStatus.mutateAsync({ id, status });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBooking.mutateAsync(id);
      toast({ title: "Reserva eliminada" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const getServiceDisplay = (b: Booking) => {
    if (b.booking_items && b.booking_items.length > 0) {
      return b.booking_items.map((i) => i.services?.name ?? "—").join(", ");
    }
    return b.services?.name ?? "—";
  };

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
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl lg:text-3xl font-bold">Reservas</h1>
            <p className="text-muted-foreground text-sm mt-1">{bookings?.length ?? 0} reservas</p>
          </div>
          <BookingFormDialog />
        </div>

        {/* Search + Filter toggle */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por cliente o servicio..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Button variant={showFilters ? "default" : "outline"} className="gap-2" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4" />
            Filtros
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">!</Badge>
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Estado</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => <SelectItem key={s} value={s}>{s === "Todas" ? "Todas" : statusLabels[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Fuente</label>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {sources.map((s) => <SelectItem key={s} value={s}>{s === "Todas" ? "Todas" : s}</SelectItem>)}
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
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Servicio(s)</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Terapeuta</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Fecha/Hora</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Precio</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Estado</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        {search || hasActiveFilters ? "No se encontraron reservas con los filtros seleccionados" : "No hay reservas registradas."}
                      </td>
                    </tr>
                  )}
                  {filtered.map((b) => (
                    <tr key={b.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => { setEditBooking(b); setEditOpen(true); }}>
                      <td className="py-3 px-4">
                        <div className="font-medium">{b.clients?.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{b.clients?.phone ?? ""}</div>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell text-muted-foreground max-w-[200px] truncate">
                        {getServiceDisplay(b)}
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">
                        {b.therapist?.name ?? "—"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium">{b.booking_date}</div>
                        <div className="text-xs text-muted-foreground">{b.start_time?.slice(0, 5)} - {b.end_time?.slice(0, 5)}</div>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        {b.price_cop != null && <div className="font-medium">{formatCOP(b.price_cop)}</div>}
                        {b.price_usd != null && <div className="text-xs text-muted-foreground">{formatUSD(b.price_usd)}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <Select
                          value={b.status ?? "pendiente"}
                          onValueChange={(v) => handleStatusChange(b.id, v as any)}
                        >
                          <SelectTrigger className="h-7 w-[120px] text-xs border-0 p-0">
                            <Badge variant="outline" className={statusClasses[b.status ?? "pendiente"]}>
                              {statusLabels[b.status ?? "pendiente"]}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusLabels).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => { setEditBooking(b); setEditOpen(true); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar reserva?</AlertDialogTitle>
                                <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(b.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
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
