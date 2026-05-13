import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash2, CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useUpsertException,
  useDeleteException,
  type ScheduleException,
  type TherapistSchedule,
} from "@/hooks/useTherapistSchedules";
import { DAY_NAMES_LONG, resolveScheduleForDate } from "@/lib/scheduleUtils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  therapistId: string;
  therapistName: string;
  isoDate: string;
  baseSchedules: TherapistSchedule[];
  exceptions: ScheduleException[];
}

export default function DayScheduleDialog({
  open, onOpenChange, therapistId, therapistName, isoDate, baseSchedules, exceptions,
}: Props) {
  const { toast } = useToast();
  const upsert = useUpsertException();
  const remove = useDeleteException();

  const existing = exceptions.find((e) => e.therapist_id === therapistId && e.exception_date === isoDate);
  const resolved = resolveScheduleForDate(baseSchedules, exceptions, therapistId, isoDate);

  const [dayOff, setDayOff] = useState(false);
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("19:00");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setDayOff(existing.is_day_off);
      setStart((existing.start_time ?? "10:00").slice(0, 5));
      setEnd((existing.end_time ?? "19:00").slice(0, 5));
      setNotes(existing.notes ?? "");
    } else {
      setDayOff(!resolved.isWorking && resolved.hasConfig);
      setStart((resolved.startTime ?? "10:00").slice(0, 5));
      setEnd((resolved.endTime ?? "19:00").slice(0, 5));
      setNotes("");
    }
  }, [open, isoDate, therapistId]);

  const [y, m, d] = isoDate.split("-").map(Number);
  const dateObj = new Date(y, (m || 1) - 1, d || 1);
  const dow = dateObj.getDay();
  const prettyDate = dateObj.toLocaleDateString("es-CO", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const handleSave = async () => {
    if (!dayOff && start >= end) {
      toast({ title: "Horario inválido", description: "La hora de inicio debe ser menor a la de fin.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await upsert.mutateAsync({
        therapist_id: therapistId,
        exception_date: isoDate,
        is_day_off: dayOff,
        start_time: dayOff ? null : start,
        end_time: dayOff ? null : end,
        notes: notes.trim() || null,
      });
      toast({ title: "Horario guardado", description: `${therapistName} · ${prettyDate}` });
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "No se pudo guardar.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!existing) return;
    setSaving(true);
    try {
      await remove.mutateAsync(existing.id);
      toast({ title: "Excepción eliminada", description: `Vuelve a usar el horario base de ${DAY_NAMES_LONG[dow]}.` });
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "No se pudo eliminar.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            {therapistName}
          </DialogTitle>
          <DialogDescription className="capitalize">{prettyDate}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
            <div>
              <Label className="text-sm font-medium">Día libre</Label>
              <p className="text-[11px] text-muted-foreground">No disponible este día</p>
            </div>
            <Switch checked={dayOff} onCheckedChange={setDayOff} />
          </div>

          <div className={`grid grid-cols-2 gap-2 ${dayOff ? "opacity-50 pointer-events-none" : ""}`}>
            <div>
              <Label className="text-xs">Hora de entrada</Label>
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Hora de salida</Label>
              <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="h-9" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Nota (opcional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: cita médica, evento..." className="h-9" />
          </div>

          {existing && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              Este día tiene un horario específico que sobreescribe el base de {DAY_NAMES_LONG[dow]}.
            </p>
          )}

          <div className="flex gap-2 pt-1">
            {existing && (
              <Button type="button" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={handleClear} disabled={saving}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="spa" className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
