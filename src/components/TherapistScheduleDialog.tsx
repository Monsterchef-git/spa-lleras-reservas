import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, CalendarClock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useTherapistSchedules,
  useScheduleExceptions,
  useUpsertSchedule,
  useUpsertException,
  useDeleteException,
  type TherapistSchedule,
  type ScheduleException,
} from "@/hooks/useTherapistSchedules";
import { DAY_NAMES_LONG } from "@/lib/scheduleUtils";

interface Props {
  therapistId: string;
  therapistName: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

/* JS getDay: 0=Sun..6=Sat. We display Mon→Sun for usability. */
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

type DayState = {
  day_of_week: number;
  is_day_off: boolean;
  start_time: string;
  end_time: string;
};

function buildBaseState(rows: TherapistSchedule[]): DayState[] {
  return DISPLAY_ORDER.map((dow) => {
    const r = rows.find((x) => x.day_of_week === dow);
    return {
      day_of_week: dow,
      is_day_off: r?.is_day_off ?? false,
      start_time: (r?.start_time ?? "10:00").slice(0, 5),
      end_time: (r?.end_time ?? "19:00").slice(0, 5),
    };
  });
}

export default function TherapistScheduleDialog({ therapistId, therapistName, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const { data: baseRows } = useTherapistSchedules(therapistId);
  const { data: exceptionRows } = useScheduleExceptions(therapistId);
  const upsertSchedule = useUpsertSchedule();
  const upsertException = useUpsertException();
  const deleteException = useDeleteException();

  const [days, setDays] = useState<DayState[]>(() => buildBaseState(baseRows ?? []));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setDays(buildBaseState(baseRows ?? []));
  }, [open, baseRows]);

  const updateDay = (dow: number, patch: Partial<DayState>) =>
    setDays((prev) => prev.map((d) => (d.day_of_week === dow ? { ...d, ...patch } : d)));

  const handleSaveBase = async () => {
    setSaving(true);
    try {
      for (const d of days) {
        if (!d.is_day_off && d.start_time >= d.end_time) {
          throw new Error(`${DAY_NAMES_LONG[d.day_of_week]}: la hora de inicio debe ser menor a la de fin.`);
        }
        await upsertSchedule.mutateAsync({
          therapist_id: therapistId,
          day_of_week: d.day_of_week,
          is_day_off: d.is_day_off,
          start_time: d.is_day_off ? null : d.start_time,
          end_time: d.is_day_off ? null : d.end_time,
        });
      }
      toast({ title: "Horario guardado", description: `Se actualizó el horario base de ${therapistName}.` });
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "No se pudo guardar.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Horario de {therapistName}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="base" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="base">Horario base</TabsTrigger>
            <TabsTrigger value="exceptions">
              Excepciones {exceptionRows && exceptionRows.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">{exceptionRows.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="base" className="space-y-3 pt-3">
            <p className="text-xs text-muted-foreground">
              Define el horario semanal regular. Aplicará a todos los días salvo que exista una excepción para esa fecha.
            </p>
            <div className="space-y-2">
              {days.map((d) => (
                <div key={d.day_of_week} className="grid grid-cols-[100px_1fr_auto] sm:grid-cols-[120px_1fr_1fr_auto] gap-2 items-center border rounded-lg p-2.5 bg-muted/20">
                  <div className="text-sm font-medium">{DAY_NAMES_LONG[d.day_of_week]}</div>
                  <Input
                    type="time"
                    value={d.start_time}
                    disabled={d.is_day_off}
                    onChange={(e) => updateDay(d.day_of_week, { start_time: e.target.value })}
                    className="h-9"
                  />
                  <Input
                    type="time"
                    value={d.end_time}
                    disabled={d.is_day_off}
                    onChange={(e) => updateDay(d.day_of_week, { end_time: e.target.value })}
                    className="h-9 col-span-2 sm:col-span-1"
                  />
                  <div className="flex items-center gap-2 col-span-3 sm:col-span-1 justify-end">
                    <Label className="text-xs text-muted-foreground">Día libre</Label>
                    <Switch
                      checked={d.is_day_off}
                      onCheckedChange={(v) => updateDay(d.day_of_week, { is_day_off: v })}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
              <Button variant="spa" className="flex-1" onClick={handleSaveBase} disabled={saving}>
                {saving ? "Guardando..." : "Guardar horario"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="exceptions" className="space-y-3 pt-3">
            <p className="text-xs text-muted-foreground">
              Excepciones puntuales (ej: "Este viernes sale a las 15:00" o "Sábado libre"). Se priorizan sobre el horario base.
            </p>
            <ExceptionList rows={exceptionRows ?? []} onDelete={(id) => deleteException.mutate(id)} />
            <NewExceptionForm
              therapistId={therapistId}
              onSave={async (input) => {
                try {
                  await upsertException.mutateAsync(input);
                  toast({ title: "Excepción guardada" });
                } catch (e) {
                  toast({ title: "Error", description: e instanceof Error ? e.message : "No se pudo guardar.", variant: "destructive" });
                }
              }}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function ExceptionList({ rows, onDelete }: { rows: ScheduleException[]; onDelete: (id: string) => void }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground italic text-center py-4">Sin excepciones registradas.</p>;
  }
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.id} className="flex items-center justify-between gap-2 border rounded-md px-3 py-2 bg-card">
          <div className="min-w-0">
            <div className="text-sm font-medium">{r.exception_date}</div>
            <div className="text-xs text-muted-foreground">
              {r.is_day_off
                ? "Día libre"
                : r.start_time && r.end_time
                ? `${r.start_time.slice(0, 5)} – ${r.end_time.slice(0, 5)}`
                : "Sin horario"}
              {r.notes ? ` · ${r.notes}` : ""}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => onDelete(r.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

function NewExceptionForm({
  therapistId,
  onSave,
}: {
  therapistId: string;
  onSave: (input: {
    therapist_id: string;
    exception_date: string;
    is_day_off: boolean;
    start_time: string | null;
    end_time: string | null;
    notes: string | null;
  }) => Promise<void>;
}) {
  const [date, setDate] = useState("");
  const [dayOff, setDayOff] = useState(false);
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("19:00");
  const [notes, setNotes] = useState("");

  const handleAdd = async () => {
    if (!date) return;
    await onSave({
      therapist_id: therapistId,
      exception_date: date,
      is_day_off: dayOff,
      start_time: dayOff ? null : start,
      end_time: dayOff ? null : end,
      notes: notes.trim() || null,
    });
    setDate("");
    setDayOff(false);
    setNotes("");
  };

  return (
    <div className="border rounded-lg p-3 bg-primary/5 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Agregar excepción</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Fecha</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
        </div>
        <div className="flex items-end justify-end gap-2">
          <Label className="text-xs">Día libre</Label>
          <Switch checked={dayOff} onCheckedChange={setDayOff} />
        </div>
      </div>
      {!dayOff && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Inicio</Label>
            <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Fin</Label>
            <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="h-9" />
          </div>
        </div>
      )}
      <div>
        <Label className="text-xs">Nota (opcional)</Label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: cita médica" className="h-9" />
      </div>
      <Button type="button" variant="spa" size="sm" className="w-full gap-1" onClick={handleAdd} disabled={!date}>
        <Plus className="h-4 w-4" /> Agregar excepción
      </Button>
    </div>
  );
}
