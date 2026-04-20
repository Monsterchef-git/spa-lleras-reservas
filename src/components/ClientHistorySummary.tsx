import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarCheck, Clock, DollarSign, History, StickyNote, Loader2 } from "lucide-react";

interface Props {
  clientId: string;
  /** Optional: skip fetching when the client object isn't real yet (e.g. walk-in). */
  enabled?: boolean;
  /** Note from the client record (alergias, preferencias). */
  note?: string | null;
}

interface ClientStats {
  totalVisits: number;
  lastVisit: string | null;
  totalCop: number;
}

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", minimumFractionDigits: 0,
  }).format(n);
}

export default function ClientHistorySummary({ clientId, enabled = true, note }: Props) {
  const { data, isLoading } = useQuery<ClientStats>({
    queryKey: ["client-history-summary", clientId],
    enabled: !!clientId && enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("booking_date, price_cop, status")
        .eq("client_id", clientId)
        .in("status", ["confirmada", "completada"])
        .order("booking_date", { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      const totalVisits = rows.length;
      const lastVisit = rows[0]?.booking_date ?? null;
      const totalCop = rows.reduce((sum, r) => sum + (r.price_cop ?? 0), 0);
      return { totalVisits, lastVisit, totalCop };
    },
    staleTime: 30_000,
  });

  if (!clientId || !enabled) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-3">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
          <History className="h-3 w-3" /> Historial del cliente
        </p>

        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Cargando...
          </div>
        ) : data && data.totalVisits > 0 ? (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                <CalendarCheck className="h-3 w-3" /> Visitas
              </p>
              <p className="font-heading font-bold text-sm">{data.totalVisits}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" /> Última
              </p>
              <p className="font-heading font-bold text-sm">
                {data.lastVisit
                  ? format(parseISO(data.lastVisit), "d MMM yy", { locale: es })
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                <DollarSign className="h-3 w-3" /> Gastado
              </p>
              <p className="font-heading font-bold text-sm">{formatCOP(data.totalCop)}</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            Cliente nuevo · sin visitas previas
          </p>
        )}

        {note && (
          <div className="mt-2 flex items-start gap-1.5 text-xs bg-amber-500/10 text-amber-900 dark:text-amber-200 rounded-md px-2 py-1.5 border border-amber-500/30">
            <StickyNote className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span className="leading-snug">{note}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
