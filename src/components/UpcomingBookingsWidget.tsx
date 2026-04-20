import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, XCircle, Globe, User, Sparkles, MapPin, Loader2 } from "lucide-react";
import { useBookings, useUpdateBookingStatus, type Booking } from "@/hooks/useBookings";
import CancelBookingDialog from "@/components/CancelBookingDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const statusBadgeClass: Record<string, string> = {
  pendiente: "status-badge-pending",
  confirmada: "status-badge-confirmed",
  cancelada: "status-badge-cancelled",
  completada: "status-badge-completed",
};

const statusLabels: Record<string, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  completada: "Completada",
};

function formatDayLabel(dateStr: string): string {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  if (dateStr === todayStr) return "Hoy";
  if (dateStr === tomorrowStr) return "Mañana";
  return dateStr;
}

export default function UpcomingBookingsWidget() {
  const { data: bookings } = useBookings();
  const updateStatus = useUpdateBookingStatus();
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const upcoming = useMemo(() => {
    if (!bookings) return [];
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    return bookings
      .filter((b) => {
        if (b.status === "cancelada" || b.status === "completada") return false;
        if (b.booking_date === todayStr) return (b.start_time ?? "") >= currentTime;
        if (b.booking_date === tomorrowStr) return true;
        return false;
      })
      .sort((a, b) => {
        const d = a.booking_date.localeCompare(b.booking_date);
        if (d !== 0) return d;
        return (a.start_time ?? "").localeCompare(b.start_time ?? "");
      });
  }, [bookings]);

  const handleConfirm = async (b: Booking) => {
    setActingId(b.id);
    try {
      await updateStatus.mutateAsync({ id: b.id, status: "confirmada" });
      toast.success("Reserva confirmada", { description: b.clients?.name ?? "" });
    } catch (e) {
      toast.error("No se pudo confirmar", {
        description: e instanceof Error ? e.message : "Error desconocido",
      });
    } finally {
      setActingId(null);
    }
  };

  const handleCancel = async (reason: string | null) => {
    if (!cancelTarget) return;
    setActingId(cancelTarget.id);
    try {
      await updateStatus.mutateAsync({ id: cancelTarget.id, status: "cancelada", reason });
      toast.success("Reserva cancelada", { description: cancelTarget.clients?.name ?? "" });
    } catch (e) {
      toast.error("No se pudo cancelar", {
        description: e instanceof Error ? e.message : "Error desconocido",
      });
    } finally {
      setActingId(null);
      setCancelTarget(null);
    }
  };

  return (
    <>
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Próximas 24 horas
            {upcoming.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {upcoming.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No hay reservas en las próximas 24 horas 🌿
            </p>
          ) : (
            <div className="divide-y divide-border">
              {upcoming.map((b) => {
                const serviceDisplay = b.booking_items?.length
                  ? b.booking_items.map((i) => i.services?.name ?? "").join(", ")
                  : b.services?.name ?? "—";
                const isPending = b.status === "pendiente";
                const isActing = actingId === b.id;

                return (
                  <div
                    key={b.id}
                    className="py-3 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center gap-3"
                  >
                    {/* Time block */}
                    <div className="flex md:flex-col md:items-center md:justify-center md:min-w-[80px] md:py-1 md:px-2 md:rounded-md md:bg-primary/5 md:border md:border-primary/20">
                      <div className="md:text-[10px] md:font-medium md:text-primary md:uppercase md:tracking-wide text-xs text-muted-foreground mr-2 md:mr-0">
                        {formatDayLabel(b.booking_date)}
                      </div>
                      <div className="font-heading font-bold text-base md:text-lg text-foreground md:text-primary">
                        {(b.start_time ?? "").slice(0, 5)}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm truncate">
                          {b.clients?.name ?? "—"}
                        </span>
                        {b.nationality && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 gap-1">
                            <Globe className="h-2.5 w-2.5" />
                            {b.nationality}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] h-5", statusBadgeClass[b.status ?? "pendiente"])}
                        >
                          {statusLabels[b.status ?? "pendiente"]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                        <Sparkles className="h-3 w-3 shrink-0" />
                        <span className="truncate">{serviceDisplay}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {b.therapist?.name ?? "—"}
                          {b.second_therapist && ` + ${b.second_therapist.name}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {b.resources?.name ?? "—"}
                        </span>
                      </div>
                    </div>

                    {/* Quick actions */}
                    <div className="flex items-center gap-2 md:flex-col md:items-end shrink-0">
                      {isPending && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleConfirm(b)}
                          disabled={isActing}
                          className="h-8 px-3 text-xs gap-1 bg-primary hover:bg-primary/90"
                        >
                          {isActing ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle className="h-3 w-3" />
                          )}
                          Confirmar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCancelTarget(b)}
                        disabled={isActing}
                        className="h-8 px-3 text-xs gap-1 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                      >
                        <XCircle className="h-3 w-3" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <CancelBookingDialog
        open={!!cancelTarget}
        onOpenChange={(v) => !v && setCancelTarget(null)}
        onConfirm={handleCancel}
        title={
          cancelTarget
            ? `¿Cancelar reserva de ${cancelTarget.clients?.name ?? "cliente"}?`
            : undefined
        }
      />
    </>
  );
}
