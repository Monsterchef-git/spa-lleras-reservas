import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CalendarDays, Sparkles, Copy, Eraser } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTherapists } from "@/hooks/useTherapists";
import {
  useTherapistSchedules,
  useScheduleExceptions,
  useBulkUpsertExceptions,
  useDeleteExceptionsInRange,
} from "@/hooks/useTherapistSchedules";
import {
  resolveScheduleForDate,
  toISODate,
  quincenaRange,
  nextQuincenaRange,
  eachISODateInRange,
  DEFAULT_SPA_TEMPLATE,
  DAY_NAMES_SHORT,
} from "@/lib/scheduleUtils";
import DayScheduleDialog from "@/components/DayScheduleDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props { canEdit: boolean }

export default function ScheduleCalendar({ canEdit }: Props) {
  const { toast } = useToast();
  const { data: therapists } = useTherapists();
  const { data: allSchedules } = useTherapistSchedules();
  const { data: allExceptions } = useScheduleExceptions();
  const bulkUpsert = useBulkUpsertExceptions();
  const deleteRange = useDeleteExceptionsInRange();

  const [therapistId, setTherapistId] = useState<string>("");
  const [cursor, setCursor] = useState<Date>(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [editingDate, setEditingDate] = useState<string | null>(null);

  // Default to first therapist
  const activeTherapistId = therapistId || therapists?.[0]?.id || "";
  const activeTherapist = therapists?.find((t) => t.id === activeTherapistId);

  const monthLabel = cursor.toLocaleDateString("es-CO", { month: "long", year: "numeric" });

  const calendar = useMemo(() => buildMonthGrid(cursor), [cursor]);

  const therapistSchedules = useMemo(
    () => (allSchedules ?? []).filter((s) => s.therapist_id === activeTherapistId),
    [allSchedules, activeTherapistId],
  );
  const therapistExceptions = useMemo(
    () => (allExceptions ?? []).filter((e) => e.therapist_id === activeTherapistId),
    [allExceptions, activeTherapistId],
  );

  const todayISO = toISODate(new Date());

  const goPrev = () => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
  const goNext = () => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
  const goToday = () => {
    const n = new Date();
    setCursor(new Date(n.getFullYear(), n.getMonth(), 1));
  };

  const applyTemplateToRange = async (from: string, to: string, label: string) => {
    if (!activeTherapistId) return;
    const rows = eachISODateInRange(from, to).map((iso) => {
      const [y, m, d] = iso.split("-").map(Number);
      const dow = new Date(y, m - 1, d).getDay();
      const tpl = DEFAULT_SPA_TEMPLATE[dow];
      return {
        therapist_id: activeTherapistId,
        exception_date: iso,
        is_day_off: !tpl,
        start_time: tpl?.start ?? null,
        end_time: tpl?.end ?? null,
        notes: null,
      };
    });
    try {
      await bulkUpsert.mutateAsync(rows);
      toast({ title: "Plantilla aplicada", description: `${label} · ${rows.length} días` });
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "No se pudo aplicar.", variant: "destructive" });
    }
  };

  const copyQuincena = async (from: Date, to: Date, sourceFrom: string, sourceTo: string) => {
    if (!activeTherapistId) return;
    const sourceDates = eachISODateInRange(sourceFrom, sourceTo);
    const targetDates = eachISODateInRange(toISODate(from), toISODate(to));
    const rows = targetDates.map((targetISO, idx) => {
      const sourceISO = sourceDates[idx % sourceDates.length];
      const resolved = resolveScheduleForDate(therapistSchedules, therapistExceptions, activeTherapistId, sourceISO);
      return {
        therapist_id: activeTherapistId,
        exception_date: targetISO,
        is_day_off: !resolved.isWorking,
        start_time: resolved.isWorking ? resolved.startTime : null,
        end_time: resolved.isWorking ? resolved.endTime : null,
        notes: null,
      };
    });
    try {
      await bulkUpsert.mutateAsync(rows);
      toast({ title: "Quincena copiada", description: `${rows.length} días copiados.` });
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "No se pudo copiar.", variant: "destructive" });
    }
  };

  const clearRange = async (from: string, to: string, label: string) => {
    if (!activeTherapistId) return;
    try {
      await deleteRange.mutateAsync({ therapistId: activeTherapistId, from, to });
      toast({ title: "Excepciones eliminadas", description: `${label} · vuelve al horario base.` });
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "No se pudo limpiar.", variant: "destructive" });
    }
  };

  // Quincena ranges for the visible month
  const firstQ = quincenaRange(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
  const secondQ = quincenaRange(new Date(cursor.getFullYear(), cursor.getMonth(), 16));
  const nextQ = nextQuincenaRange(new Date());
  const currentQ = quincenaRange(new Date());

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Terapeuta</label>
              <Select value={activeTherapistId} onValueChange={setTherapistId}>
                <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Selecciona terapeuta" /></SelectTrigger>
                <SelectContent>
                  {(therapists ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-1">
              <Button variant="outline" size="icon" onClick={goPrev} aria-label="Mes anterior"><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={goToday}>Hoy</Button>
              <Button variant="outline" size="icon" onClick={goNext} aria-label="Mes siguiente"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
          <div>
            <h2 className="font-heading text-xl capitalize flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              {monthLabel}
            </h2>
          </div>
        </CardContent>
      </Card>

      {/* Quincena toolbar */}
      {canEdit && activeTherapistId && (
        <Card className="border-border/60">
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Acciones quincenales</p>
            <div className="flex flex-wrap gap-2">
              <QuincenaActions
                label={firstQ.label}
                onApplyTemplate={() => applyTemplateToRange(firstQ.from, firstQ.to, firstQ.label)}
                onCopyFromCurrent={() => copyQuincena(
                  new Date(firstQ.from + "T00:00"), new Date(firstQ.to + "T00:00"),
                  currentQ.from, currentQ.to,
                )}
                onClear={() => clearRange(firstQ.from, firstQ.to, firstQ.label)}
              />
              <QuincenaActions
                label={secondQ.label}
                onApplyTemplate={() => applyTemplateToRange(secondQ.from, secondQ.to, secondQ.label)}
                onCopyFromCurrent={() => copyQuincena(
                  new Date(secondQ.from + "T00:00"), new Date(secondQ.to + "T00:00"),
                  currentQ.from, currentQ.to,
                )}
                onClear={() => clearRange(secondQ.from, secondQ.to, secondQ.label)}
              />
            </div>
            <p className="text-[11px] text-muted-foreground pt-1">
              <Sparkles className="inline h-3 w-3 mr-1" />
              <strong>Plantilla base:</strong> Lun–Sáb 10:00–19:00 · Dom 10:00–17:00 ·
              &nbsp;<strong>Copiar quincena actual</strong> usa los horarios de {currentQ.label}.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Calendar grid */}
      <Card className="border-border/60">
        <CardContent className="p-3">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {[1, 2, 3, 4, 5, 6, 0].map((dow) => (
              <div key={dow} className="text-[11px] font-semibold uppercase tracking-wide text-center text-muted-foreground py-1">
                {DAY_NAMES_SHORT[dow]}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendar.map((cell, idx) => {
              if (!cell) return <div key={idx} className="aspect-square sm:aspect-[4/3]" />;
              const iso = toISODate(cell);
              const resolved = resolveScheduleForDate(therapistSchedules, therapistExceptions, activeTherapistId, iso);
              const ex = therapistExceptions.find((e) => e.exception_date === iso);
              const isPast = iso < todayISO;
              const isToday = iso === todayISO;
              const handleClick = () => { if (canEdit && activeTherapistId) setEditingDate(iso); };

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={handleClick}
                  disabled={!canEdit || !activeTherapistId}
                  className={[
                    "aspect-square sm:aspect-[4/3] rounded-md border text-left p-1.5 flex flex-col gap-0.5 transition",
                    canEdit ? "hover:border-primary hover:bg-primary/5 cursor-pointer" : "cursor-default",
                    isToday ? "border-primary border-2" : "border-border/60",
                    isPast ? "opacity-60" : "",
                    !resolved.isWorking && resolved.hasConfig ? "bg-amber-50/70" : "bg-card",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${isToday ? "text-primary" : ""}`}>{cell.getDate()}</span>
                    {ex && <span className="h-1.5 w-1.5 rounded-full bg-primary" title="Excepción definida" />}
                  </div>
                  {!activeTherapistId ? null : !resolved.hasConfig ? (
                    <span className="text-[10px] text-muted-foreground italic">Sin definir</span>
                  ) : !resolved.isWorking ? (
                    <Badge variant="outline" className="text-[9px] h-4 px-1 border-amber-300 text-amber-700 self-start">Libre</Badge>
                  ) : (
                    <span className="text-[10px] font-medium leading-tight">
                      {resolved.startTime?.slice(0, 5)}<br />
                      {resolved.endTime?.slice(0, 5)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {!activeTherapistId && (
            <p className="text-center text-sm text-muted-foreground py-6">Selecciona una terapeuta para ver su calendario.</p>
          )}
        </CardContent>
      </Card>

      {editingDate && activeTherapist && (
        <DayScheduleDialog
          open={!!editingDate}
          onOpenChange={(v) => !v && setEditingDate(null)}
          therapistId={activeTherapistId}
          therapistName={activeTherapist.name}
          isoDate={editingDate}
          baseSchedules={therapistSchedules}
          exceptions={therapistExceptions}
        />
      )}
    </div>
  );
}

function QuincenaActions({
  label, onApplyTemplate, onCopyFromCurrent, onClear,
}: {
  label: string;
  onApplyTemplate: () => void;
  onCopyFromCurrent: () => void;
  onClear: () => void;
}) {
  return (
    <div className="border rounded-lg p-2.5 bg-muted/20 space-y-1.5 flex-1 min-w-[220px]">
      <p className="text-xs font-semibold capitalize">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onApplyTemplate}>
          <Sparkles className="h-3 w-3" /> Aplicar plantilla
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onCopyFromCurrent}>
          <Copy className="h-3 w-3" /> Copiar actual
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive hover:bg-destructive/10">
              <Eraser className="h-3 w-3" /> Limpiar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar excepciones de esta quincena?</AlertDialogTitle>
              <AlertDialogDescription>
                Se borrarán los horarios específicos de los días de <strong>{label}</strong>. Esos días volverán a tomar el horario base semanal.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onClear}>Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

/** Returns 6 weeks * 7 days, Monday-first. Cells outside the month are null. */
function buildMonthGrid(monthStart: Date): (Date | null)[] {
  const y = monthStart.getFullYear();
  const m = monthStart.getMonth();
  const first = new Date(y, m, 1);
  const lastDay = new Date(y, m + 1, 0).getDate();
  // Monday-first offset: JS getDay() Sun=0..Sat=6 → we want Mon=0..Sun=6
  const offset = (first.getDay() + 6) % 7;
  const cells: (Date | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) cells.push(new Date(y, m, d));
  while (cells.length % 7 !== 0) cells.push(null);
  // pad up to 6 rows for stable layout
  while (cells.length < 42) cells.push(null);
  return cells;
}
