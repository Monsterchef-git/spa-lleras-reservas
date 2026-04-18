import { useBookingAuditLog, type AuditAction, type AuditLogEntry } from "@/hooks/useBookingAuditLog";
import { Loader2, Plus, Pencil, Trash2, RefreshCw, Ban, ShoppingCart, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  bookingId: string | null | undefined;
}

const actionMeta: Record<AuditAction, { label: string; icon: any; className: string }> = {
  CREATE: { label: "Creada", icon: Plus, className: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
  UPDATE: { label: "Editada", icon: Pencil, className: "bg-blue-500/10 text-blue-700 border-blue-200" },
  STATUS_CHANGE: { label: "Cambio de estado", icon: RefreshCw, className: "bg-amber-500/10 text-amber-700 border-amber-200" },
  CANCEL: { label: "Cancelada", icon: Ban, className: "bg-destructive/10 text-destructive border-destructive/30" },
  DELETE: { label: "Eliminada", icon: Trash2, className: "bg-destructive/10 text-destructive border-destructive/30" },
  ITEMS_CHANGE: { label: "Servicios actualizados", icon: ShoppingCart, className: "bg-primary/10 text-primary border-primary/30" },
};

const FIELD_LABELS: Record<string, string> = {
  status: "Estado",
  booking_date: "Fecha",
  start_time: "Inicio",
  end_time: "Fin",
  therapist_id: "Terapeuta",
  second_therapist_id: "Segundo terapeuta",
  resource_id: "Recurso",
  client_id: "Cliente",
  notes: "Notas",
  price_cop: "Precio COP",
  price_usd: "Precio USD",
  source: "Fuente",
  preferred_language: "Idioma",
  nationality: "Nacionalidad",
  service_id: "Servicio",
  service_duration_id: "Duración",
};

const IGNORED_FIELDS = new Set(["updated_at", "created_at", "id", "last_notification_sent", "created_by"]);

function formatValue(v: any): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "string" && v.length > 40) return v.slice(0, 40) + "…";
  return String(v);
}

function diffFields(oldData: any, newData: any): { field: string; before: any; after: any }[] {
  if (!oldData || !newData) return [];
  const changes: { field: string; before: any; after: any }[] = [];
  const keys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  for (const k of keys) {
    if (IGNORED_FIELDS.has(k)) continue;
    if (JSON.stringify(oldData[k]) !== JSON.stringify(newData[k])) {
      changes.push({ field: k, before: oldData[k], after: newData[k] });
    }
  }
  return changes;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function HistoryItem({ entry }: { entry: AuditLogEntry }) {
  const meta = actionMeta[entry.action] ?? actionMeta.UPDATE;
  const Icon = meta.icon;
  const changes = entry.action === "UPDATE" || entry.action === "STATUS_CHANGE" || entry.action === "CANCEL"
    ? diffFields(entry.old_data, entry.new_data)
    : [];

  return (
    <Card className="border-border/60">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`h-7 w-7 rounded-full border flex items-center justify-center ${meta.className}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div>
              <Badge variant="outline" className={`text-xs ${meta.className}`}>{meta.label}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
            <Clock className="h-3 w-3" />
            {formatTimestamp(entry.changed_at)}
          </div>
        </div>

        {entry.reason && (
          <div className="text-xs bg-muted/40 px-2 py-1.5 rounded border-l-2 border-primary/40">
            <span className="font-medium text-foreground">Motivo:</span>{" "}
            <span className="text-muted-foreground italic">{entry.reason}</span>
          </div>
        )}

        {changes.length > 0 && (
          <div className="space-y-1 pl-2 border-l-2 border-border">
            {changes.map((c) => (
              <div key={c.field} className="text-xs flex flex-wrap items-center gap-1.5">
                <span className="font-medium text-foreground">{FIELD_LABELS[c.field] ?? c.field}:</span>
                <span className="text-muted-foreground line-through">{formatValue(c.before)}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-foreground font-medium">{formatValue(c.after)}</span>
              </div>
            ))}
          </div>
        )}

        {entry.action === "ITEMS_CHANGE" && (
          <p className="text-xs text-muted-foreground italic">
            Se modificaron los servicios del carrito.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function BookingHistoryTab({ bookingId }: Props) {
  const { data, isLoading, error } = useBookingAuditLog(bookingId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive py-4 text-center">
        No se pudo cargar el historial.
      </p>
    );
  }

  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Sin historial registrado todavía.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((e) => <HistoryItem key={e.id} entry={e} />)}
    </div>
  );
}
