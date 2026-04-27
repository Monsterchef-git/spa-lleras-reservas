import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  TrendingUp, TrendingDown, Users, DollarSign, Download, CalendarDays,
  Wallet, FileSpreadsheet, FileText, Receipt,
} from "lucide-react";
import { useBookings, type Booking } from "@/hooks/useBookings";
import { useTherapists } from "@/hooks/useTherapists";
import { useResources } from "@/hooks/useResources";
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, startOfDay, endOfDay,
  isWithinInterval, parseISO, eachDayOfInterval, subDays, differenceInDays,
} from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const STORAGE_KEY = "spa_lleras_config";

function getTipPercent(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const cfg = JSON.parse(raw);
      if (typeof cfg.tipPercent === "number") return cfg.tipPercent;
    }
  } catch {}
  return 10;
}

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", minimumFractionDigits: 0,
  }).format(n);
}
function formatUSD(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

type Preset = "today" | "week" | "month" | "year" | "custom";

interface DateRange {
  start: Date;
  end: Date;
}

function presetRange(p: Preset): DateRange {
  const now = new Date();
  switch (p) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "week":
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case "month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "year":
      return { start: startOfYear(now), end: endOfYear(now) };
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

function previousRange(r: DateRange): DateRange {
  const days = differenceInDays(r.end, r.start) + 1;
  const end = subDays(r.start, 1);
  const start = subDays(end, days - 1);
  return { start: startOfDay(start), end: endOfDay(end) };
}

function inRange(b: Booking, r: DateRange) {
  const d = parseISO(b.booking_date);
  return isWithinInterval(d, { start: r.start, end: r.end });
}

function bookingMinutes(b: Booking) {
  const [sh, sm] = b.start_time.split(":").map(Number);
  const [eh, em] = b.end_time.split(":").map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

const sourceLabels: Record<string, string> = {
  fresha: "Fresha", whatsapp: "WhatsApp", email: "Email",
  walk_in: "Walk-in", web: "Web", sin_fuente: "Sin fuente",
};
const statusLabels: Record<string, string> = {
  pendiente: "Pendiente", confirmada: "Confirmada",
  completada: "Completada", cancelada: "Cancelada",
};

function VariationPill({ pct }: { pct: number | null }) {
  if (pct === null) {
    return <span className="text-[11px] text-muted-foreground">— sin comparativa</span>;
  }
  const positive = pct >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded ${
        positive ? "text-emerald-600 bg-emerald-500/10" : "text-rose-600 bg-rose-500/10"
      }`}
    >
      <Icon className="h-3 w-3" />
      {positive ? "+" : ""}
      {pct.toFixed(1)}% vs período anterior
    </span>
  );
}

export default function ReportesPage() {
  const [preset, setPreset] = useState<Preset>("month");
  const [customStart, setCustomStart] = useState<string>(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [customEnd, setCustomEnd] = useState<string>(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [tipPercent, setTipPercentLocal] = useState<number>(getTipPercent());

  const { data: allBookings = [] } = useBookings();
  const { data: therapists = [] } = useTherapists();
  const { data: resources = [] } = useResources();

  const range: DateRange = useMemo(() => {
    if (preset === "custom") {
      return {
        start: startOfDay(parseISO(customStart)),
        end: endOfDay(parseISO(customEnd)),
      };
    }
    return presetRange(preset);
  }, [preset, customStart, customEnd]);

  const prevRangeMemo = useMemo(() => previousRange(range), [range]);

  const bookings = useMemo(() => allBookings.filter((b) => inRange(b, range)), [allBookings, range]);
  const prevBookings = useMemo(() => allBookings.filter((b) => inRange(b, prevRangeMemo)), [allBookings, prevRangeMemo]);

  // KPIs (excluding cancellations from revenue)
  const activeBookings = bookings.filter((b) => b.status !== "cancelada");
  const prevActive = prevBookings.filter((b) => b.status !== "cancelada");

  const totalCOP = activeBookings.reduce((s, b) => s + (b.price_cop ?? 0), 0);
  const totalUSD = activeBookings.reduce((s, b) => s + (b.price_usd ?? 0), 0);
  const prevTotalCOP = prevActive.reduce((s, b) => s + (b.price_cop ?? 0), 0);

  const avgTicket = activeBookings.length > 0 ? totalCOP / activeBookings.length : 0;
  const prevAvgTicket = prevActive.length > 0 ? prevTotalCOP / prevActive.length : 0;

  // Occupancy rate: total booked minutes / available minutes
  const days = differenceInDays(range.end, range.start) + 1;
  const availableMinutes = days * 12 * 60 * Math.max(1, therapists.length); // 12h/day per therapist
  const usedMinutes = activeBookings.reduce((s, b) => s + bookingMinutes(b), 0);
  const occupancyPct = availableMinutes > 0 ? Math.min(100, (usedMinutes / availableMinutes) * 100) : 0;

  const prevDays = differenceInDays(prevRangeMemo.end, prevRangeMemo.start) + 1;
  const prevAvailable = prevDays * 12 * 60 * Math.max(1, therapists.length);
  const prevUsed = prevActive.reduce((s, b) => s + bookingMinutes(b), 0);
  const prevOccupancyPct = prevAvailable > 0 ? Math.min(100, (prevUsed / prevAvailable) * 100) : 0;

  const variation = (curr: number, prev: number): number | null => {
    if (prev === 0) return curr === 0 ? 0 : null;
    return ((curr - prev) / prev) * 100;
  };

  // ========== Therapist report (priority section for tips) ==========
  const therapistReport = useMemo(() => {
    const rows = therapists.map((t) => {
      const tb = activeBookings.filter(
        (b) => b.therapist_id === t.id || b.second_therapist_id === t.id,
      );
      const totalRev = tb.reduce((s, b) => s + (b.price_cop ?? 0), 0);
      const avg = tb.length > 0 ? totalRev / tb.length : 0;
      const tipEstimate = totalRev * (tipPercent / 100);
      const pctOfTotal = totalCOP > 0 ? (totalRev / totalCOP) * 100 : 0;
      return {
        id: t.id,
        name: t.name,
        bookings: tb.length,
        totalRev,
        avgTicket: avg,
        pctOfTotal,
        tipEstimate,
      };
    });
    return rows.sort((a, b) => b.totalRev - a.totalRev);
  }, [therapists, activeBookings, tipPercent, totalCOP]);

  const totalTipEstimate = therapistReport.reduce((s, t) => s + t.tipEstimate, 0);

  // ========== Daily revenue with comparison ==========
  const dailyData = useMemo(() => {
    const daysList = eachDayOfInterval({ start: range.start, end: range.end });
    const prevDaysList = eachDayOfInterval({ start: prevRangeMemo.start, end: prevRangeMemo.end });

    return daysList.map((d, idx) => {
      const dStr = format(d, "yyyy-MM-dd");
      const curr = activeBookings
        .filter((b) => b.booking_date === dStr)
        .reduce((s, b) => s + (b.price_cop ?? 0), 0);

      const prevD = prevDaysList[idx];
      const prevStr = prevD ? format(prevD, "yyyy-MM-dd") : null;
      const prev = prevStr
        ? prevActive
            .filter((b) => b.booking_date === prevStr)
            .reduce((s, b) => s + (b.price_cop ?? 0), 0)
        : 0;

      return {
        date: format(d, "d MMM", { locale: es }),
        actual: curr,
        anterior: prev,
      };
    });
  }, [range, prevRangeMemo, activeBookings, prevActive]);

  // ========== Detailed table ==========
  const detailedRows = useMemo(() => {
    return [...bookings].sort((a, b) => {
      const cmp = a.booking_date.localeCompare(b.booking_date);
      if (cmp !== 0) return cmp;
      return a.start_time.localeCompare(b.start_time);
    });
  }, [bookings]);

  const periodLabel = `${format(range.start, "d MMM", { locale: es })} – ${format(range.end, "d MMM yyyy", { locale: es })}`;

  // ========== Exports ==========
  const handleExportXLSX = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Resumen
    const summary = [
      ["Reporte de Ventas — Spa Lleras"],
      [`Período: ${periodLabel}`],
      [`Generado: ${format(new Date(), "d MMM yyyy HH:mm", { locale: es })}`],
      [],
      ["KPI", "Valor", "Período Anterior", "Variación %"],
      ["Total Ventas (COP)", totalCOP, prevTotalCOP, variation(totalCOP, prevTotalCOP)?.toFixed(1) ?? "—"],
      ["Total Ventas (USD)", totalUSD, "", ""],
      ["Número de Reservas", activeBookings.length, prevActive.length, variation(activeBookings.length, prevActive.length)?.toFixed(1) ?? "—"],
      ["Ticket Promedio (COP)", Math.round(avgTicket), Math.round(prevAvgTicket), variation(avgTicket, prevAvgTicket)?.toFixed(1) ?? "—"],
      ["Tasa de Ocupación %", occupancyPct.toFixed(1), prevOccupancyPct.toFixed(1), variation(occupancyPct, prevOccupancyPct)?.toFixed(1) ?? "—"],
      [],
      [`% Propina aplicado: ${tipPercent}%`],
      ["Total propinas estimadas (COP)", Math.round(totalTipEstimate)],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summary);
    ws1["!cols"] = [{ wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws1, "Resumen");

    // Sheet 2: Por Terapeuta
    const therapistHeader = [
      "Terapeuta", "Reservas Atendidas", "Total Ventas (COP)",
      "Ticket Promedio (COP)", "% del Total", `% Propina (${tipPercent}%)`,
      "Propina Estimada (COP)",
    ];
    const therapistRows = therapistReport.map((t) => [
      t.name, t.bookings, t.totalRev, Math.round(t.avgTicket),
      `${t.pctOfTotal.toFixed(1)}%`, `${tipPercent}%`, Math.round(t.tipEstimate),
    ]);
    const totalRow = [
      "TOTAL",
      therapistReport.reduce((s, t) => s + t.bookings, 0),
      totalCOP,
      Math.round(avgTicket),
      "100%",
      `${tipPercent}%`,
      Math.round(totalTipEstimate),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet([therapistHeader, ...therapistRows, [], totalRow]);
    ws2["!cols"] = [{ wch: 24 }, { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Por Terapeuta");

    // Sheet 3: Detalle
    const detailHeader = [
      "Fecha", "Hora", "Cliente", "Servicios", "Terapeuta(s)",
      "Recurso", "Precio Total (COP)", "Fuente", "Estado",
    ];
    const detailRows = detailedRows.map((b) => {
      const services = b.booking_items?.length
        ? b.booking_items.map((i) => i.services?.name).filter(Boolean).join("; ")
        : (b.services?.name ?? "");
      const therapistNames = [b.therapist?.name, b.second_therapist?.name].filter(Boolean).join(" + ");
      return [
        b.booking_date,
        `${b.start_time.slice(0, 5)}–${b.end_time.slice(0, 5)}`,
        b.clients?.name ?? "",
        services,
        therapistNames,
        b.resources?.name ?? "",
        b.price_cop ?? 0,
        sourceLabels[b.source ?? ""] ?? b.source ?? "",
        statusLabels[b.status ?? ""] ?? b.status ?? "",
      ];
    });
    const ws3 = XLSX.utils.aoa_to_sheet([detailHeader, ...detailRows]);
    ws3["!cols"] = [
      { wch: 12 }, { wch: 14 }, { wch: 22 }, { wch: 36 }, { wch: 24 },
      { wch: 16 }, { wch: 18 }, { wch: 12 }, { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws3, "Detalle");

    XLSX.writeFile(wb, `reporte_ventas_${format(range.start, "yyyy-MM-dd")}_${format(range.end, "yyyy-MM-dd")}.xlsx`);
    toast.success("Reporte Excel descargado");
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
    const margin = 36;
    let y = margin;

    doc.setFontSize(18);
    doc.setTextColor(20);
    doc.text("Reporte de Ventas — Spa Lleras", margin, y);
    y += 22;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Período: ${periodLabel}`, margin, y);
    y += 14;
    doc.text(`Generado: ${format(new Date(), "d MMM yyyy HH:mm", { locale: es })}`, margin, y);
    y += 20;

    // KPIs
    autoTable(doc, {
      startY: y,
      head: [["KPI", "Valor", "Período anterior", "Variación"]],
      body: [
        ["Total Ventas (COP)", formatCOP(totalCOP), formatCOP(prevTotalCOP), variation(totalCOP, prevTotalCOP) === null ? "—" : `${variation(totalCOP, prevTotalCOP)!.toFixed(1)}%`],
        ["Total Ventas (USD)", formatUSD(totalUSD), "—", "—"],
        ["Número de Reservas", String(activeBookings.length), String(prevActive.length), variation(activeBookings.length, prevActive.length) === null ? "—" : `${variation(activeBookings.length, prevActive.length)!.toFixed(1)}%`],
        ["Ticket Promedio", formatCOP(avgTicket), formatCOP(prevAvgTicket), variation(avgTicket, prevAvgTicket) === null ? "—" : `${variation(avgTicket, prevAvgTicket)!.toFixed(1)}%`],
        ["Tasa de Ocupación", `${occupancyPct.toFixed(1)}%`, `${prevOccupancyPct.toFixed(1)}%`, variation(occupancyPct, prevOccupancyPct) === null ? "—" : `${variation(occupancyPct, prevOccupancyPct)!.toFixed(1)}%`],
      ],
      headStyles: { fillColor: [77, 155, 138] },
      styles: { fontSize: 9 },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 24;

    doc.setFontSize(13);
    doc.setTextColor(20);
    doc.text(`Reporte por Terapeuta (Propina ${tipPercent}%)`, margin, y);
    y += 8;

    autoTable(doc, {
      startY: y + 6,
      head: [["Terapeuta", "Reservas", "Total COP", "Ticket Prom.", "% Total", "Propina Est."]],
      body: [
        ...therapistReport.map((t) => [
          t.name, String(t.bookings), formatCOP(t.totalRev),
          formatCOP(t.avgTicket), `${t.pctOfTotal.toFixed(1)}%`, formatCOP(t.tipEstimate),
        ]),
        ["TOTAL", String(therapistReport.reduce((s, t) => s + t.bookings, 0)), formatCOP(totalCOP), formatCOP(avgTicket), "100%", formatCOP(totalTipEstimate)],
      ],
      headStyles: { fillColor: [77, 155, 138] },
      foot: undefined,
      styles: { fontSize: 9 },
      margin: { left: margin, right: margin },
      didParseCell: (data) => {
        if (data.section === "body" && data.row.index === therapistReport.length) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [240, 240, 240];
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 24;

    if (y > 700) { doc.addPage(); y = margin; }
    doc.setFontSize(13);
    doc.text("Detalle de Ventas", margin, y);

    autoTable(doc, {
      startY: y + 10,
      head: [["Fecha", "Hora", "Cliente", "Servicio", "Terapeuta", "COP", "Estado"]],
      body: detailedRows.map((b) => {
        const services = b.booking_items?.length
          ? b.booking_items.map((i) => i.services?.name).filter(Boolean).join(", ")
          : (b.services?.name ?? "");
        const therapistNames = [b.therapist?.name, b.second_therapist?.name].filter(Boolean).join(" + ");
        return [
          format(parseISO(b.booking_date), "d MMM", { locale: es }),
          b.start_time.slice(0, 5),
          b.clients?.name ?? "—",
          services || "—",
          therapistNames || "—",
          formatCOP(b.price_cop ?? 0),
          statusLabels[b.status ?? ""] ?? b.status ?? "",
        ];
      }),
      headStyles: { fillColor: [77, 155, 138] },
      styles: { fontSize: 8 },
      margin: { left: margin, right: margin },
    });

    doc.save(`reporte_ventas_${format(range.start, "yyyy-MM-dd")}_${format(range.end, "yyyy-MM-dd")}.pdf`);
    toast.success("Reporte PDF descargado");
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h1 className="font-heading text-2xl lg:text-3xl font-bold">Reporte de Ventas</h1>
              <p className="text-muted-foreground text-sm mt-1">{periodLabel}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2" onClick={handleExportXLSX}>
                <FileSpreadsheet className="h-4 w-4" /> Excel (.xlsx)
              </Button>
              <Button variant="outline" className="gap-2" onClick={handleExportPDF}>
                <FileText className="h-4 w-4" /> PDF
              </Button>
            </div>
          </div>

          {/* Period filters */}
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {([
                  ["today", "Hoy"], ["week", "Esta Semana"], ["month", "Este Mes"], ["year", "Este Año"],
                ] as [Preset, string][]).map(([key, label]) => (
                  <Button
                    key={key}
                    variant={preset === key ? "spa" : "outline"}
                    size="sm"
                    onClick={() => setPreset(key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Desde</Label>
                  <Input
                    type="date"
                    value={customStart}
                    onChange={(e) => { setCustomStart(e.target.value); setPreset("custom"); }}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Hasta</Label>
                  <Input
                    type="date"
                    value={customEnd}
                    onChange={(e) => { setCustomEnd(e.target.value); setPreset("custom"); }}
                    className="h-9"
                  />
                </div>
                <Button
                  variant={preset === "custom" ? "spa" : "outline"}
                  size="sm"
                  onClick={() => setPreset("custom")}
                >
                  <CalendarDays className="h-4 w-4 mr-1" /> Aplicar rango
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* KPIs with comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Total Ventas",
              value: formatCOP(totalCOP),
              sub: formatUSD(totalUSD),
              icon: DollarSign,
              variation: variation(totalCOP, prevTotalCOP),
            },
            {
              label: "Reservas",
              value: String(activeBookings.length),
              sub: `${bookings.length - activeBookings.length} canceladas`,
              icon: CalendarDays,
              variation: variation(activeBookings.length, prevActive.length),
            },
            {
              label: "Ticket Promedio",
              value: formatCOP(avgTicket),
              sub: "por reserva",
              icon: Receipt,
              variation: variation(avgTicket, prevAvgTicket),
            },
            {
              label: "Ocupación",
              value: `${occupancyPct.toFixed(1)}%`,
              sub: `${Math.round(usedMinutes / 60)}h / ${therapists.length} terapeutas`,
              icon: TrendingUp,
              variation: variation(occupancyPct, prevOccupancyPct),
            },
          ].map((m) => (
            <Card key={m.label} className="border-border/50 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-foreground">{m.label}</p>
                    <p className="text-xl font-bold mt-1 truncate">{m.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{m.sub}</p>
                  </div>
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                    <m.icon className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="mt-2">
                  <VariationPill pct={m.variation} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* === REPORTE POR TERAPEUTA — destacado === */}
        <Card className="border-2 border-accent/40 shadow-md bg-gradient-to-br from-card to-accent/5">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="font-heading text-xl flex items-center gap-2">
                  <Wallet className="h-6 w-6 text-accent" />
                  Reporte por Terapeuta
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Cálculo de propinas estimadas según ventas del período.
                </p>
              </div>
              <div className="flex items-end gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">% Propina</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={tipPercent}
                    onChange={(e) => setTipPercentLocal(Number(e.target.value))}
                    className="h-9 w-20"
                  />
                </div>
                <div className="text-right pb-1">
                  <p className="text-[11px] text-muted-foreground">Total propinas estimadas</p>
                  <p className="text-lg font-bold text-accent">{formatCOP(totalTipEstimate)}</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            {therapistReport.length === 0 || totalCOP === 0 ? (
              <p className="text-sm text-muted-foreground p-6">Sin datos de ventas en este período.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Terapeuta</TableHead>
                      <TableHead className="text-center">Reservas</TableHead>
                      <TableHead className="text-right">Total Ventas (COP)</TableHead>
                      <TableHead className="text-right hidden md:table-cell">Ticket Promedio</TableHead>
                      <TableHead className="text-center hidden sm:table-cell">% del Total</TableHead>
                      <TableHead className="text-right bg-accent/10 font-semibold">
                        Propina Est. ({tipPercent}%)
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {therapistReport.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                              {t.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                            </div>
                            {t.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{t.bookings}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCOP(t.totalRev)}</TableCell>
                        <TableCell className="text-right hidden md:table-cell text-muted-foreground">
                          {t.bookings > 0 ? formatCOP(t.avgTicket) : "—"}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden min-w-[40px]">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${t.pctOfTotal}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-12 text-right">
                              {t.pctOfTotal.toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-accent bg-accent/5">
                          {formatCOP(t.tipEstimate)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/60 border-t-2">
                      <TableCell className="font-bold">TOTAL</TableCell>
                      <TableCell className="text-center font-bold">
                        {therapistReport.reduce((s, t) => s + t.bookings, 0)}
                      </TableCell>
                      <TableCell className="text-right font-bold">{formatCOP(totalCOP)}</TableCell>
                      <TableCell className="text-right hidden md:table-cell font-bold">{formatCOP(avgTicket)}</TableCell>
                      <TableCell className="text-center hidden sm:table-cell font-bold">100%</TableCell>
                      <TableCell className="text-right font-bold text-accent bg-accent/10">
                        {formatCOP(totalTipEstimate)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Ingresos por Día</CardTitle>
              <p className="text-xs text-muted-foreground">Comparativa con período anterior</p>
            </CardHeader>
            <CardContent>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(v: number) => formatCOP(v)}
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="anterior" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Anterior" />
                    <Line type="monotone" dataKey="actual" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} name="Actual" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <Users className="h-5 w-5" /> Ventas por Terapeuta
              </CardTitle>
              <p className="text-xs text-muted-foreground">Distribución de ingresos del período</p>
            </CardHeader>
            <CardContent>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={therapistReport} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip
                      formatter={(v: number) => formatCOP(v)}
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                    />
                    <Bar dataKey="totalRev" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} name="Ventas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed table */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Detalle de Ventas</CardTitle>
            <p className="text-xs text-muted-foreground">{detailedRows.length} reservas en el período</p>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            {detailedRows.length === 0 ? (
              <p className="text-sm text-muted-foreground p-6">Sin reservas en el período seleccionado.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Hora</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="hidden md:table-cell">Servicios</TableHead>
                      <TableHead className="hidden lg:table-cell">Terapeuta(s)</TableHead>
                      <TableHead className="hidden lg:table-cell">Recurso</TableHead>
                      <TableHead className="text-right">COP</TableHead>
                      <TableHead className="hidden sm:table-cell">Fuente</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailedRows.map((b) => {
                      const services = b.booking_items?.length
                        ? b.booking_items.map((i) => i.services?.name).filter(Boolean).join(", ")
                        : (b.services?.name ?? "—");
                      const therapistNames = [b.therapist?.name, b.second_therapist?.name].filter(Boolean).join(" + ");
                      return (
                        <TableRow key={b.id}>
                          <TableCell className="whitespace-nowrap">{format(parseISO(b.booking_date), "d MMM", { locale: es })}</TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}
                          </TableCell>
                          <TableCell className="font-medium">{b.clients?.name ?? "—"}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{services}</TableCell>
                          <TableCell className="hidden lg:table-cell text-sm">{therapistNames || "—"}</TableCell>
                          <TableCell className="hidden lg:table-cell text-sm">{b.resources?.name ?? "—"}</TableCell>
                          <TableCell className="text-right font-medium whitespace-nowrap">{formatCOP(b.price_cop ?? 0)}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="outline" className="text-[10px]">
                              {sourceLabels[b.source ?? ""] ?? b.source ?? "—"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={b.status === "cancelada" ? "destructive" : b.status === "completada" ? "default" : "secondary"}
                              className="text-[10px]"
                            >
                              {statusLabels[b.status ?? ""] ?? b.status ?? "—"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resources occupancy (kept compact) */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base">Uso de Recursos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {resources.map((r) => {
              const rb = activeBookings.filter((b) => b.resource_id === r.id);
              const minutes = rb.reduce((s, b) => s + bookingMinutes(b), 0);
              const avail = days * 12 * 60;
              const pct = avail > 0 ? Math.min(100, (minutes / avail) * 100) : 0;
              return (
                <div key={r.id}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">{r.name}</span>
                    <span className="text-xs text-muted-foreground">{pct.toFixed(0)}% · {rb.length} reservas</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {resources.length === 0 && <p className="text-sm text-muted-foreground">Sin recursos configurados</p>}
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-2 justify-end pb-6">
          <Button variant="outline" className="gap-2" onClick={handleExportXLSX}>
            <FileSpreadsheet className="h-4 w-4" /> Exportar a Excel (.xlsx)
          </Button>
          <Button className="gap-2" onClick={handleExportPDF}>
            <Download className="h-4 w-4" /> Exportar a PDF
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
