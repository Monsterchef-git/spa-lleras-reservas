import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, TrendingUp, Users, DollarSign, Download, XCircle, CalendarDays } from "lucide-react";
import { useBookings, type Booking } from "@/hooks/useBookings";
import { useTherapists } from "@/hooks/useTherapists";
import { useResources } from "@/hooks/useResources";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);
}
function formatUSD(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

type Period = "week" | "month";

function getRange(period: Period) {
  const now = new Date();
  if (period === "week") return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
  return { start: startOfMonth(now), end: endOfMonth(now) };
}

function filterByPeriod(bookings: Booking[], period: Period) {
  const { start, end } = getRange(period);
  return bookings.filter((b) => {
    const d = parseISO(b.booking_date);
    return isWithinInterval(d, { start, end });
  });
}

function exportCSV(rows: string[][], filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Archivo CSV descargado");
}

export default function ReportesPage() {
  const [period, setPeriod] = useState<Period>("week");
  const { data: allBookings = [] } = useBookings();
  const { data: therapists = [] } = useTherapists();
  const { data: resources = [] } = useResources();

  const bookings = useMemo(() => filterByPeriod(allBookings, period), [allBookings, period]);

  // KPIs
  const completed = bookings.filter((b) => b.status === "completada");
  const cancelled = bookings.filter((b) => b.status === "cancelada");
  const totalCOP = bookings.reduce((s, b) => s + (b.price_cop ?? 0), 0);
  const totalUSD = bookings.reduce((s, b) => s + (b.price_usd ?? 0), 0);
  const cancelRate = bookings.length > 0 ? Math.round((cancelled.length / bookings.length) * 100) : 0;

  // Occupancy by therapist
  const therapistOccupancy = useMemo(() => {
    return therapists.map((t) => {
      const tb = bookings.filter((b) => b.therapist_id === t.id || b.second_therapist_id === t.id);
      const totalMinutes = tb.reduce((s, b) => {
        const [sh, sm] = b.start_time.split(":").map(Number);
        const [eh, em] = b.end_time.split(":").map(Number);
        return s + (eh * 60 + em) - (sh * 60 + sm);
      }, 0);
      const daysInPeriod = period === "week" ? 7 : 30;
      const availableMinutes = daysInPeriod * 8 * 60; // 8h/day
      return { name: t.name, bookings: tb.length, minutes: totalMinutes, pct: Math.min(100, Math.round((totalMinutes / availableMinutes) * 100)) };
    }).sort((a, b) => b.pct - a.pct);
  }, [therapists, bookings, period]);

  // Occupancy by resource
  const resourceOccupancy = useMemo(() => {
    return resources.map((r) => {
      const rb = bookings.filter((b) => b.resource_id === r.id);
      const totalMinutes = rb.reduce((s, b) => {
        const [sh, sm] = b.start_time.split(":").map(Number);
        const [eh, em] = b.end_time.split(":").map(Number);
        return s + (eh * 60 + em) - (sh * 60 + sm);
      }, 0);
      const daysInPeriod = period === "week" ? 7 : 30;
      const availableMinutes = daysInPeriod * 10 * 60;
      return { name: r.name, bookings: rb.length, minutes: totalMinutes, pct: Math.min(100, Math.round((totalMinutes / availableMinutes) * 100)) };
    }).sort((a, b) => b.pct - a.pct);
  }, [resources, bookings, period]);

  // Revenue by service (from booking_items)
  const revenueByService = useMemo(() => {
    const map: Record<string, { name: string; count: number; cop: number; usd: number }> = {};
    bookings.forEach((b) => {
      if (b.booking_items && b.booking_items.length > 0) {
        b.booking_items.forEach((item) => {
          const name = item.services?.name ?? "Desconocido";
          if (!map[name]) map[name] = { name, count: 0, cop: 0, usd: 0 };
          map[name].count += item.quantity;
          map[name].cop += item.price_cop * item.quantity;
          map[name].usd += item.price_usd * item.quantity;
        });
      } else if (b.services?.name) {
        const name = b.services.name;
        if (!map[name]) map[name] = { name, count: 0, cop: 0, usd: 0 };
        map[name].count += 1;
        map[name].cop += b.price_cop ?? 0;
        map[name].usd += b.price_usd ?? 0;
      }
    });
    return Object.values(map).sort((a, b) => b.cop - a.cop);
  }, [bookings]);

  // Revenue by source
  const revenueBySource = useMemo(() => {
    const map: Record<string, { source: string; count: number; cop: number; usd: number }> = {};
    bookings.forEach((b) => {
      const src = b.source ?? "sin_fuente";
      if (!map[src]) map[src] = { source: src, count: 0, cop: 0, usd: 0 };
      map[src].count += 1;
      map[src].cop += b.price_cop ?? 0;
      map[src].usd += b.price_usd ?? 0;
    });
    return Object.values(map).sort((a, b) => b.cop - a.cop);
  }, [bookings]);

  const sourceLabels: Record<string, string> = {
    fresha: "Fresha", whatsapp: "WhatsApp", email: "Email", walk_in: "Walk-in", web: "Web", sin_fuente: "Sin fuente",
  };

  // CSV export
  const handleExportCSV = () => {
    const header = ["Fecha", "Cliente", "Servicio", "Terapeuta", "Recurso", "Estado", "Fuente", "COP", "USD"];
    const rows = bookings.map((b) => [
      b.booking_date,
      b.clients?.name ?? "",
      b.services?.name ?? b.booking_items?.map((i) => i.services?.name).join("; ") ?? "",
      b.therapist?.name ?? "",
      b.resources?.name ?? "",
      b.status ?? "",
      b.source ?? "",
      String(b.price_cop ?? 0),
      String(b.price_usd ?? 0),
    ]);
    exportCSV([header, ...rows], `reporte_${period}_${format(new Date(), "yyyy-MM-dd")}.csv`);
  };

  const periodLabel = period === "week" ? "esta semana" : "este mes";
  const { start, end } = getRange(period);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl lg:text-3xl font-bold">Reportes</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {format(start, "d MMM", { locale: es })} – {format(end, "d MMM yyyy", { locale: es })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <TabsList>
                <TabsTrigger value="week">Semana</TabsTrigger>
                <TabsTrigger value="month">Mes</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
              <Download className="h-4 w-4" /> CSV
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: `Ingresos (${periodLabel})`, value: formatCOP(totalCOP), sub: formatUSD(totalUSD), icon: DollarSign },
            { label: "Reservas Totales", value: String(bookings.length), sub: `${completed.length} completadas`, icon: CalendarDays },
            { label: "Completadas", value: String(completed.length), sub: `de ${bookings.length}`, icon: BarChart3 },
            { label: "Cancelaciones", value: `${cancelRate}%`, sub: `${cancelled.length} canceladas`, icon: XCircle },
          ].map((m) => (
            <Card key={m.label} className="border-border/50 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{m.label}</p>
                    <p className="text-xl font-bold mt-1">{m.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{m.sub}</p>
                  </div>
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <m.icon className="h-4 w-4 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Occupancy: Therapists + Resources side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader><CardTitle className="font-heading text-lg flex items-center gap-2"><Users className="h-5 w-5" /> Ocupación por Terapeuta</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {therapistOccupancy.length === 0 && <p className="text-sm text-muted-foreground">Sin datos</p>}
              {therapistOccupancy.map((t) => (
                <div key={t.name}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">{t.name}</span>
                    <span className="text-sm text-muted-foreground">{t.pct}% · {t.bookings} reservas</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${t.pct}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader><CardTitle className="font-heading text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Ocupación por Recurso</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {resourceOccupancy.length === 0 && <p className="text-sm text-muted-foreground">Sin datos</p>}
              {resourceOccupancy.map((r) => (
                <div key={r.name}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">{r.name}</span>
                    <span className="text-sm text-muted-foreground">{r.pct}% · {r.bookings} reservas</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${r.pct}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Revenue by Service */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader><CardTitle className="font-heading text-lg">Ingresos por Servicio</CardTitle></CardHeader>
          <CardContent>
            {revenueByService.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos para {periodLabel}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Servicio</TableHead>
                    <TableHead className="text-center">Cantidad</TableHead>
                    <TableHead className="text-right">COP</TableHead>
                    <TableHead className="text-right">USD</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenueByService.map((s) => (
                    <TableRow key={s.name}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-center">{s.count}</TableCell>
                      <TableCell className="text-right">{formatCOP(s.cop)}</TableCell>
                      <TableCell className="text-right">{formatUSD(s.usd)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Source */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader><CardTitle className="font-heading text-lg">Ingresos por Fuente</CardTitle></CardHeader>
          <CardContent>
            {revenueBySource.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos para {periodLabel}</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {revenueBySource.map((s) => (
                  <Card key={s.source} className="border-border/30">
                    <CardContent className="p-3 text-center">
                      <Badge variant="secondary" className="mb-2">{sourceLabels[s.source] ?? s.source}</Badge>
                      <p className="text-lg font-bold">{s.count}</p>
                      <p className="text-xs text-muted-foreground">reservas</p>
                      <p className="text-sm font-semibold mt-1">{formatCOP(s.cop)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cancellations */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader><CardTitle className="font-heading text-lg flex items-center gap-2"><XCircle className="h-5 w-5 text-destructive" /> Cancelaciones</CardTitle></CardHeader>
          <CardContent>
            {cancelled.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin cancelaciones {periodLabel}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Servicio</TableHead>
                    <TableHead>Fuente</TableHead>
                    <TableHead className="text-right">COP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cancelled.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>{format(parseISO(b.booking_date), "d MMM", { locale: es })}</TableCell>
                      <TableCell>{b.clients?.name ?? "—"}</TableCell>
                      <TableCell>{b.services?.name ?? b.booking_items?.map((i) => i.services?.name).join(", ") ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline">{sourceLabels[b.source ?? ""] ?? b.source ?? "—"}</Badge></TableCell>
                      <TableCell className="text-right">{formatCOP(b.price_cop ?? 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
