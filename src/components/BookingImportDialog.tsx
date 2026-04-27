import { useState, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Download, CheckCircle2, AlertCircle, X, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

type Row = Record<string, any>;

interface ImportError {
  row: number;
  message: string;
  data?: Row;
}

interface ImportResult {
  created: number;
  skipped: number;
  errors: ImportError[];
  clientsCreated: number;
}

const EXPECTED_COLUMNS = [
  "fecha", "hora_inicio", "hora_fin", "cliente_nombre", "cliente_email",
  "cliente_whatsapp", "servicio_nombre", "duracion_minutos", "terapeuta_nombre",
  "recurso_nombre", "precio_cop", "estado",
];

const COLUMN_ALIASES: Record<string, string> = {
  date: "fecha", fecha_reserva: "fecha",
  start_time: "hora_inicio", inicio: "hora_inicio", hora: "hora_inicio",
  end_time: "hora_fin", fin: "hora_fin",
  cliente: "cliente_nombre", nombre: "cliente_nombre", client_name: "cliente_nombre",
  email: "cliente_email", correo: "cliente_email",
  whatsapp: "cliente_whatsapp", telefono: "cliente_whatsapp", phone: "cliente_whatsapp", celular: "cliente_whatsapp",
  servicio: "servicio_nombre", service: "servicio_nombre",
  duracion: "duracion_minutos", duration: "duracion_minutos", minutos: "duracion_minutos",
  terapeuta: "terapeuta_nombre", therapist: "terapeuta_nombre",
  recurso: "recurso_nombre", sala: "recurso_nombre", room: "recurso_nombre",
  precio: "precio_cop", price: "precio_cop", precio_total: "precio_cop",
  status: "estado",
};

const STATUS_MAP: Record<string, string> = {
  pendiente: "pendiente", pending: "pendiente",
  confirmada: "confirmada", confirmed: "confirmada", confirmado: "confirmada",
  cancelada: "cancelada", cancelled: "cancelada", canceled: "cancelada",
  completada: "completada", completed: "completada", completado: "completada",
};

function normalizeKey(k: string): string {
  const cleaned = String(k).trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
  return COLUMN_ALIASES[cleaned] || cleaned;
}

function parseDate(input: any): string | null {
  if (input == null || input === "") return null;
  // Excel serial date number
  if (typeof input === "number") {
    const d = XLSX.SSF.parse_date_code(input);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(input).trim();
  // yyyy-mm-dd
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  // dd/mm/yyyy or dd-mm-yyyy
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  // try Date parse
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return null;
}

function parseTime(input: any): string | null {
  if (input == null || input === "") return null;
  // Excel time fraction
  if (typeof input === "number") {
    const totalMin = Math.round(input * 24 * 60);
    const h = Math.floor(totalMin / 60);
    const mm = totalMin % 60;
    return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  }
  const s = String(input).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;
  return null;
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function normalizeName(s: any): string {
  return String(s || "").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function BookingImportDialog({ open, onOpenChange }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setRows([]);
    setResult(null);
    setProgress(0);
    if (fileInput.current) fileInput.current.value = "";
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const parseFile = async (f: File) => {
    setParsing(true);
    setResult(null);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: false });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Row>(sheet, { defval: "", raw: true });
      const normalized = json.map((r) => {
        const out: Row = {};
        for (const [k, v] of Object.entries(r)) out[normalizeKey(k)] = v;
        return out;
      });
      setRows(normalized);
      setFile(f);
      if (normalized.length === 0) toast.error("El archivo está vacío");
      else toast.success(`${normalized.length} filas detectadas`);
    } catch (e: any) {
      toast.error("Error al leer el archivo: " + e.message);
    } finally {
      setParsing(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) parseFile(f);
  };

  const downloadTemplate = () => {
    const example = [
      {
        fecha: "15/06/2026",
        hora_inicio: "10:00",
        hora_fin: "11:00",
        cliente_nombre: "María García",
        cliente_email: "maria@example.com",
        cliente_whatsapp: "+57 300 123 4567",
        servicio_nombre: "Masaje Relajante",
        duracion_minutos: 60,
        terapeuta_nombre: "Ana López",
        recurso_nombre: "Sala 1",
        precio_cop: 150000,
        estado: "confirmada",
      },
      {
        fecha: "2026-06-16",
        hora_inicio: "14:30",
        hora_fin: "",
        cliente_nombre: "John Smith",
        cliente_email: "john@example.com",
        cliente_whatsapp: "+1 555 123 4567",
        servicio_nombre: "Facial Hidratante",
        duracion_minutos: 90,
        terapeuta_nombre: "",
        recurso_nombre: "Sala 2",
        precio_cop: 200000,
        estado: "pendiente",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(example, { header: EXPECTED_COLUMNS });
    ws["!cols"] = EXPECTED_COLUMNS.map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reservas");
    XLSX.writeFile(wb, "plantilla_reservas_spa.xlsx");
    toast.success("Plantilla descargada");
  };

  const preview = useMemo(() => rows.slice(0, 5), [rows]);
  const detectedCols = useMemo(() => {
    if (rows.length === 0) return [];
    return Object.keys(rows[0]);
  }, [rows]);
  const missingRequired = useMemo(() => {
    const required = ["fecha", "hora_inicio", "cliente_nombre", "servicio_nombre"];
    return required.filter((c) => !detectedCols.includes(c));
  }, [detectedCols]);

  const runImport = async () => {
    if (rows.length === 0) return;
    if (missingRequired.length > 0) {
      toast.error(`Faltan columnas obligatorias: ${missingRequired.join(", ")}`);
      return;
    }
    setImporting(true);
    setProgress(0);
    const errors: ImportError[] = [];
    let created = 0;
    let skipped = 0;
    let clientsCreated = 0;

    // Pre-fetch reference data
    const [{ data: services }, { data: therapists }, { data: resources }, { data: clients }] = await Promise.all([
      supabase.from("services").select("id, name, service_durations(id, duration_minutes, price_cop, price_usd)"),
      supabase.from("therapists").select("id, name"),
      supabase.from("resources").select("id, name"),
      supabase.from("clients").select("id, name, email, phone"),
    ]);

    const findService = (name: string) => services?.find((s) => normalizeName(s.name) === normalizeName(name));
    const findTherapist = (name: string) => therapists?.find((t) => normalizeName(t.name) === normalizeName(name));
    const findResource = (name: string) => resources?.find((r) => normalizeName(r.name) === normalizeName(name));
    const clientCache = new Map<string, string>(); // key -> client_id
    clients?.forEach((c) => {
      if (c.email) clientCache.set(`e:${c.email.toLowerCase().trim()}`, c.id);
      if (c.phone) clientCache.set(`p:${c.phone.replace(/\s+/g, "")}`, c.id);
    });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // header + 1
      try {
        const fecha = parseDate(row.fecha);
        const horaInicio = parseTime(row.hora_inicio);
        if (!fecha) throw new Error("Fecha inválida");
        if (!horaInicio) throw new Error("Hora de inicio inválida");

        const clientName = String(row.cliente_nombre || "").trim();
        if (!clientName) throw new Error("Nombre de cliente requerido");

        const serviceName = String(row.servicio_nombre || "").trim();
        if (!serviceName) throw new Error("Servicio requerido");
        const service = findService(serviceName);
        if (!service) throw new Error(`Servicio no encontrado: "${serviceName}"`);

        const duracion = Number(row.duracion_minutos) || 0;
        let serviceDuration = service.service_durations?.find((d) => d.duration_minutes === duracion);
        if (!serviceDuration && service.service_durations?.length) {
          serviceDuration = service.service_durations[0];
        }

        const horaFin = parseTime(row.hora_fin)
          || (duracion > 0 ? addMinutes(horaInicio, duracion)
              : serviceDuration ? addMinutes(horaInicio, serviceDuration.duration_minutes) : null);
        if (!horaFin) throw new Error("Hora de fin no se puede calcular (faltan duración o hora_fin)");

        // Find or create client
        const email = String(row.cliente_email || "").toLowerCase().trim();
        const phone = String(row.cliente_whatsapp || "").trim();
        const phoneKey = phone.replace(/\s+/g, "");
        let clientId = (email && clientCache.get(`e:${email}`))
          || (phoneKey && clientCache.get(`p:${phoneKey}`));

        if (!clientId) {
          const { data: newClient, error: cErr } = await supabase
            .from("clients")
            .insert({ name: clientName, email: email || null, phone: phone || null })
            .select("id")
            .single();
          if (cErr) throw new Error(`No se pudo crear cliente: ${cErr.message}`);
          clientId = newClient.id;
          clientsCreated++;
          if (email) clientCache.set(`e:${email}`, clientId);
          if (phoneKey) clientCache.set(`p:${phoneKey}`, clientId);
        }

        const therapistName = String(row.terapeuta_nombre || "").trim();
        const therapist = therapistName ? findTherapist(therapistName) : null;
        if (therapistName && !therapist) throw new Error(`Terapeuta no encontrado: "${therapistName}"`);

        const resourceName = String(row.recurso_nombre || "").trim();
        const resource = resourceName ? findResource(resourceName) : null;
        if (resourceName && !resource) throw new Error(`Recurso no encontrado: "${resourceName}"`);

        const precioCop = Number(row.precio_cop) || serviceDuration?.price_cop || 0;
        const precioUsd = serviceDuration?.price_usd || 0;

        const estadoRaw = String(row.estado || "pendiente").toLowerCase().trim();
        const estado = (STATUS_MAP[estadoRaw] || "pendiente") as "pendiente" | "confirmada" | "cancelada" | "completada";

        const { error: bErr } = await supabase.from("bookings").insert({
          booking_date: fecha,
          start_time: horaInicio,
          end_time: horaFin,
          client_id: clientId,
          service_id: service.id,
          service_duration_id: serviceDuration?.id || null,
          therapist_id: therapist?.id || null,
          resource_id: resource?.id || null,
          price_cop: precioCop,
          price_usd: precioUsd,
          status: estado,
          source: "web",
        });
        if (bErr) throw new Error(bErr.message);
        created++;
      } catch (e: any) {
        errors.push({ row: rowNum, message: e.message || String(e), data: row });
        skipped++;
      }
      setProgress(Math.round(((i + 1) / rows.length) * 100));
    }

    setResult({ created, skipped, errors, clientsCreated });
    setImporting(false);
    if (created > 0) toast.success(`${created} reserva(s) importada(s)`);
    if (errors.length > 0) toast.error(`${errors.length} fila(s) con errores`);
  };

  const downloadErrorLog = () => {
    if (!result) return;
    const data = result.errors.map((e) => ({ fila: e.row, error: e.message, ...e.data }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Errores");
    XLSX.writeFile(wb, "errores_importacion.xlsx");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" /> Importar reservas desde CSV / Excel
          </DialogTitle>
        </DialogHeader>
        <Separator />

        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          {/* Template + reset */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs text-muted-foreground">
              Sube un archivo .xlsx, .xls o .csv con tus reservas. Crea automáticamente clientes nuevos.
            </p>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-1" /> Descargar plantilla
            </Button>
          </div>

          {/* Dropzone */}
          {!file && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInput.current?.click()}
              className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Arrastra tu archivo aquí o haz click para seleccionar</p>
              <p className="text-xs text-muted-foreground mt-1">CSV, XLSX, XLS</p>
              <input
                ref={fileInput}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && parseFile(e.target.files[0])}
              />
            </div>
          )}

          {parsing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Leyendo archivo...
            </div>
          )}

          {/* Preview */}
          {file && rows.length > 0 && !result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <Badge variant="secondary" className="text-[10px]">{rows.length} filas</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={reset}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {missingRequired.length > 0 && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Faltan columnas obligatorias:</p>
                    <p>{missingRequired.join(", ")}</p>
                  </div>
                </div>
              )}

              <div className="rounded-md border overflow-hidden">
                <p className="text-xs font-medium px-3 py-2 bg-muted/50 border-b">Vista previa (primeras 5 filas)</p>
                <ScrollArea className="max-h-64">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/30 sticky top-0">
                      <tr>
                        {detectedCols.map((c) => (
                          <th key={c} className={`text-left px-2 py-1.5 font-medium whitespace-nowrap ${
                            EXPECTED_COLUMNS.includes(c) ? "text-foreground" : "text-muted-foreground"
                          }`}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((r, i) => (
                        <tr key={i} className="border-t">
                          {detectedCols.map((c) => (
                            <td key={c} className="px-2 py-1.5 whitespace-nowrap">{String(r[c] ?? "")}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </div>

              {importing && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Importando...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-md border p-3 text-center bg-primary/5">
                  <CheckCircle2 className="h-5 w-5 mx-auto text-primary mb-1" />
                  <p className="text-2xl font-bold">{result.created}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Reservas creadas</p>
                </div>
                <div className="rounded-md border p-3 text-center">
                  <p className="text-2xl font-bold">{result.clientsCreated}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Clientes nuevos</p>
                </div>
                <div className={`rounded-md border p-3 text-center ${result.errors.length > 0 ? "bg-destructive/5" : ""}`}>
                  <AlertCircle className={`h-5 w-5 mx-auto mb-1 ${result.errors.length > 0 ? "text-destructive" : "text-muted-foreground"}`} />
                  <p className="text-2xl font-bold">{result.skipped}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Filas con error</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="rounded-md border overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
                    <p className="text-xs font-medium">Errores ({result.errors.length})</p>
                    <Button variant="ghost" size="sm" onClick={downloadErrorLog}>
                      <Download className="h-3 w-3 mr-1" /> Descargar log
                    </Button>
                  </div>
                  <ScrollArea className="max-h-48">
                    <ul className="text-xs divide-y">
                      {result.errors.slice(0, 50).map((e, i) => (
                        <li key={i} className="px-3 py-2 flex gap-2">
                          <Badge variant="outline" className="text-[10px] shrink-0">Fila {e.row}</Badge>
                          <span className="text-destructive">{e.message}</span>
                        </li>
                      ))}
                      {result.errors.length > 50 && (
                        <li className="px-3 py-2 text-muted-foreground">… y {result.errors.length - 50} más (ver log)</li>
                      )}
                    </ul>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </div>

        <Separator />
        <DialogFooter>
          {result ? (
            <>
              <Button variant="outline" onClick={reset}>Importar otro archivo</Button>
              <Button onClick={() => handleClose(false)} className="bg-primary hover:bg-primary/90">Cerrar</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
              <Button
                onClick={runImport}
                disabled={!file || rows.length === 0 || importing || missingRequired.length > 0}
                className="bg-primary hover:bg-primary/90"
              >
                {importing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                Importar {rows.length > 0 ? `${rows.length} filas` : ""}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}