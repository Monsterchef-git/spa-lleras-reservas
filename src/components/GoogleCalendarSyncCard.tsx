import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Calendar, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Save, Wifi, Loader2, Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SyncConfig {
  id: string;
  calendar_id: string | null;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_message: string | null;
  last_sync_count: number | null;
  auto_sync_enabled: boolean;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "Nunca";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "hace unos segundos";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} día${d === 1 ? "" : "s"}`;
}

export function GoogleCalendarSyncCard() {
  const [cfg, setCfg] = useState<SyncConfig | null>(null);
  const [calendarId, setCalendarId] = useState("");
  const [autoSync, setAutoSync] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("google_calendar_sync_config")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (error) {
      toast.error("Error cargando configuración: " + error.message);
    } else if (data) {
      setCfg(data as SyncConfig);
      setCalendarId(data.calendar_id ?? "");
      setAutoSync(data.auto_sync_enabled);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("gcal-sync-config")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "google_calendar_sync_config" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const saveConfig = async () => {
    if (!cfg) return;
    setSaving(true);
    const { error } = await supabase
      .from("google_calendar_sync_config")
      .update({ calendar_id: calendarId.trim() || null, auto_sync_enabled: autoSync })
      .eq("id", cfg.id);
    setSaving(false);
    if (error) toast.error("No se pudo guardar: " + error.message);
    else toast.success("Configuración guardada");
  };

  const testConnection = async () => {
    if (!calendarId.trim()) {
      toast.error("Ingresa un Calendar ID primero");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("google-calendar-test-connection", {
        body: { calendarId: calendarId.trim() },
      });
      if (error) throw error;
      if (data?.ok) {
        setTestResult({ ok: true, msg: `✓ Conectado a "${data.calendarName}" (${data.timeZone})` });
        toast.success("Conexión exitosa");
      } else {
        const hint = data?.hint ? `\n${data.hint}` : "";
        setTestResult({ ok: false, msg: `${data?.error ?? "Error desconocido"}${hint}` });
        toast.error("Conexión falló");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setTestResult({ ok: false, msg });
      toast.error("Error: " + msg);
    } finally {
      setTesting(false);
    }
  };

  const syncNow = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-calendar-sync", { body: {} });
      if (error) throw error;
      if (data?.ok) {
        toast.success(
          `Sincronización OK — ${data.created ?? 0} nuevas, ${data.updated ?? 0} actualizadas, ${data.cancelled ?? 0} canceladas${data.conflicts ? `, ${data.conflicts} con conflicto` : ""}`,
        );
        if (data.diagnostic) setShowDiagnostic(true);
      } else {
        toast.error("Error en sincronización: " + (data?.error ?? "desconocido"));
        setShowDiagnostic(true);
      }
      await load();
    } catch (e) {
      toast.error("Error: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50 shadow-sm">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">Cargando…</CardContent>
      </Card>
    );
  }

  const statusBadge = () => {
    if (!cfg?.last_sync_status) return <Badge variant="secondary">Sin sincronizar</Badge>;
    if (cfg.last_sync_status === "ok")
      return <Badge className="bg-emerald-600 text-white"><CheckCircle2 className="h-3 w-3 mr-1" /> OK</Badge>;
    return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Error</Badge>;
  };

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="font-heading text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" /> Integración Google Calendar (Fresha)
          <Badge className="ml-2 bg-emerald-600 text-white text-[10px]">Activo</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
          <p className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              <strong>Importante:</strong> en Google Calendar, comparte el calendario de Fresha con el correo del Service Account
              (permiso <em>"Ver todos los detalles del evento"</em>). Sin esto, la sincronización fallará con error 404.
            </span>
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Calendar ID</Label>
          <Input
            value={calendarId}
            onChange={(e) => setCalendarId(e.target.value)}
            placeholder="ejemplo@group.calendar.google.com"
            className="font-mono text-sm"
          />
          <p className="text-[11px] text-muted-foreground">
            Lo encuentras en Google Calendar → Configuración del calendario → "Integrar calendario".
          </p>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
          <div>
            <p className="text-sm font-medium">Sincronización automática</p>
            <p className="text-xs text-muted-foreground">Se ejecuta cada 10 minutos en segundo plano</p>
          </div>
          <Switch checked={autoSync} onCheckedChange={setAutoSync} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={testConnection} disabled={testing}>
            {testing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Wifi className="h-4 w-4 mr-1" />}
            Probar conexión
          </Button>
          <Button size="sm" onClick={saveConfig} disabled={saving} className="bg-primary hover:bg-primary/90">
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Guardar
          </Button>
          <Button variant="gold" size="sm" onClick={syncNow} disabled={syncing} className="ml-auto">
            {syncing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Sincronizar ahora
          </Button>
        </div>

        {testResult && (
          <div
            className={`rounded-lg border p-3 text-xs whitespace-pre-line ${
              testResult.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-destructive/30 bg-destructive/5 text-destructive"
            }`}
          >
            {testResult.msg}
          </div>
        )}

        <Separator />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-border/50 p-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Clock className="h-3 w-3" /> Última sincronización
            </p>
            <p className="text-sm font-medium mt-1">{timeAgo(cfg?.last_sync_at ?? null)}</p>
            {cfg?.last_sync_at && (
              <p className="text-[10px] text-muted-foreground">
                {new Date(cfg.last_sync_at).toLocaleString("es-CO")}
              </p>
            )}
          </div>
          <div className="rounded-lg border border-border/50 p-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Estado</p>
            <div className="mt-1">{statusBadge()}</div>
          </div>
          <div className="rounded-lg border border-border/50 p-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Eventos importados</p>
            <p className="text-sm font-medium mt-1">{cfg?.last_sync_count ?? 0}</p>
          </div>
        </div>

        {cfg?.last_sync_message && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowDiagnostic((s) => !s)}
              className="text-xs underline text-muted-foreground hover:text-foreground"
            >
              {showDiagnostic ? "Ocultar" : "Ver"} diagnóstico detallado
            </button>
            {showDiagnostic && (
              <pre className="text-[11px] bg-muted/50 border border-border/50 rounded-lg p-3 whitespace-pre-wrap break-all max-h-96 overflow-auto font-mono">
                {cfg.last_sync_message}
              </pre>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}