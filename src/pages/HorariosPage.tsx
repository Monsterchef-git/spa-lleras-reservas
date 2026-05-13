import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarClock, Pencil, Loader2 } from "lucide-react";
import { useTherapists } from "@/hooks/useTherapists";
import {
  useTherapistSchedules,
  useScheduleExceptions,
  type TherapistSchedule,
  type ScheduleException,
} from "@/hooks/useTherapistSchedules";
import { DAY_NAMES_SHORT } from "@/lib/scheduleUtils";
import TherapistScheduleDialog from "@/components/TherapistScheduleDialog";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ScheduleCalendar from "@/components/ScheduleCalendar";

const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function HorariosPage() {
  const { user } = useAuth();
  const canEdit = user?.role === "admin" || user?.role === "administrativa";
  const { data: therapists, isLoading } = useTherapists();
  const { data: allSchedules } = useTherapistSchedules();
  const { data: allExceptions } = useScheduleExceptions();

  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="font-heading text-3xl font-bold flex items-center gap-2">
            <CalendarClock className="h-7 w-7 text-primary" />
            Horarios de Terapeutas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Programa horarios quincenales por terapeuta. Haz clic en un día para editarlo.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <Tabs defaultValue="calendar" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="calendar">Calendario</TabsTrigger>
              <TabsTrigger value="base">Horario base</TabsTrigger>
            </TabsList>

            <TabsContent value="calendar" className="pt-4">
              <ScheduleCalendar canEdit={canEdit} />
            </TabsContent>

            <TabsContent value="base" className="pt-4">
              <div className="grid gap-3 md:grid-cols-2">
                {(therapists ?? []).map((t) => (
                  <TherapistScheduleCard
                    key={t.id}
                    therapistId={t.id}
                    therapistName={t.name}
                    schedules={(allSchedules ?? []).filter((s) => s.therapist_id === t.id)}
                    exceptions={(allExceptions ?? []).filter((e) => e.therapist_id === t.id)}
                    canEdit={canEdit}
                    onEdit={() => setEditing({ id: t.id, name: t.name })}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {editing && (
        <TherapistScheduleDialog
          therapistId={editing.id}
          therapistName={editing.name}
          open={!!editing}
          onOpenChange={(v) => !v && setEditing(null)}
        />
      )}
    </AppLayout>
  );
}

function TherapistScheduleCard({
  therapistId, therapistName, schedules, exceptions, canEdit, onEdit,
}: {
  therapistId: string;
  therapistName: string;
  schedules: TherapistSchedule[];
  exceptions: ScheduleException[];
  canEdit: boolean;
  onEdit: () => void;
}) {
  const upcomingExceptions = exceptions
    .filter((e) => e.exception_date >= new Date().toISOString().slice(0, 10))
    .slice(0, 3);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="font-heading text-lg">{therapistName}</CardTitle>
        {canEdit && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Horario semanal</p>
          {schedules.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Sin horario configurado · disponible todo horario laboral.</p>
          ) : (
            <div className="space-y-1">
              {DISPLAY_ORDER.map((dow) => {
                const s = schedules.find((x) => x.day_of_week === dow);
                return (
                  <div key={dow} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground w-10">{DAY_NAMES_SHORT[dow]}</span>
                    {!s ? (
                      <span className="text-muted-foreground italic">Sin definir</span>
                    ) : s.is_day_off ? (
                      <Badge variant="outline" className="text-[10px] h-4 border-amber-300 text-amber-700">Libre</Badge>
                    ) : (
                      <span className="font-medium">{s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {upcomingExceptions.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Próximas excepciones</p>
            <div className="space-y-1">
              {upcomingExceptions.map((e) => (
                <div key={e.id} className="flex items-center justify-between text-xs bg-amber-50/60 border border-amber-200/60 rounded px-2 py-1">
                  <span className="font-medium">{e.exception_date}</span>
                  <span className="text-muted-foreground">
                    {e.is_day_off ? "Día libre" : `${e.start_time?.slice(0,5)} – ${e.end_time?.slice(0,5)}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
