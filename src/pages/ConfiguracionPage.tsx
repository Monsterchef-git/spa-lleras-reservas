import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Globe, MessageSquare, Mail, Upload, Calendar, Bell,
  Save, RotateCcw, Settings2, Building2, Clock, Shield
} from "lucide-react";

const STORAGE_KEY = "spa_lleras_config";

interface SpaConfig {
  // Business Rules
  timezone: string;
  currency: string;
  showUsd: boolean;
  language: string;
  reminderTime: string;
  doubleBookingCheck: boolean;
  cancellationPolicy: string;
  depositPercent: number;
  // Spa Info
  spaName: string;
  address: string;
  phone: string;
  email: string;
  openTime: string;
  closeTime: string;
  welcomeEs: string;
  welcomeEn: string;
  // Integrations
  integrations: Record<string, { connected: boolean; lastSync: string; config: Record<string, string> }>;
  // Meta
  lastModified: string;
  lastModifiedBy: string;
}

const DEFAULT_CONFIG: SpaConfig = {
  timezone: "America/Bogota",
  currency: "COP",
  showUsd: true,
  language: "es",
  reminderTime: "24h",
  doubleBookingCheck: true,
  cancellationPolicy: "Las cancelaciones deben realizarse con al menos 24 horas de anticipación. Cancelaciones tardías están sujetas a un cargo del 50% del valor del servicio. No-shows serán cobrados al 100%.",
  depositPercent: 30,
  spaName: "Spa Lleras",
  address: "Parque Lleras, Medellín, Colombia",
  phone: "+57 300 123 4567",
  email: "reservas@spalleras.com",
  openTime: "10:00",
  closeTime: "20:00",
  welcomeEs: "¡Bienvenido a Spa Lleras! Tu oasis de relajación en el corazón de Medellín.",
  welcomeEn: "Welcome to Spa Lleras! Your relaxation oasis in the heart of Medellín.",
  integrations: {
    gcal: { connected: false, lastSync: "", config: { calendarId: "", apiKey: "" } },
    whatsapp: { connected: false, lastSync: "", config: { webhookUrl: "", phoneNumber: "", apiToken: "" } },
    email: { connected: false, lastSync: "", config: { smtpHost: "", smtpPort: "587", smtpUser: "", smtpPass: "" } },
    csv: { connected: false, lastSync: "", config: {} },
    notifications: { connected: false, lastSync: "", config: { emailEnabled: "true", whatsappEnabled: "true" } },
  },
  lastModified: "",
  lastModifiedBy: "",
};

const INTEGRATION_META = [
  {
    key: "gcal", name: "Google Calendar", icon: Calendar,
    description: "Sincronización bidireccional de reservas con Google Calendar.",
    modalDescription: "Conecta tu cuenta de Google Calendar para sincronizar reservas automáticamente. Necesitas crear un proyecto en Google Cloud Console y habilitar la Calendar API.",
    fields: [
      { key: "calendarId", label: "Calendar ID", placeholder: "ejemplo@group.calendar.google.com", hint: "ID del calendario donde se crearán los eventos", type: "text" },
      { key: "apiKey", label: "API Key", placeholder: "AIzaSy...", hint: "Clave de API de Google Cloud Console", type: "password" },
    ],
  },
  {
    key: "whatsapp", name: "WhatsApp Business API", icon: MessageSquare,
    description: "Webhook vía Make.com para parsear mensajes y crear reservas.",
    modalDescription: "Configura la integración con WhatsApp Business API para recibir y responder mensajes de reservas automáticamente a través de Make.com o n8n.",
    fields: [
      { key: "webhookUrl", label: "Webhook URL", placeholder: "https://hook.make.com/abc123...", hint: "URL del webhook de Make.com o n8n que recibe los mensajes", type: "url" },
      { key: "phoneNumber", label: "Número de teléfono", placeholder: "+57 300 123 4567", hint: "Número de WhatsApp Business registrado", type: "tel" },
      { key: "apiToken", label: "API Token", placeholder: "whsec_...", hint: "Token de autenticación de la API de WhatsApp", type: "password" },
    ],
  },
  {
    key: "email", name: "Email / Gmail API", icon: Mail,
    description: "Integración con Gmail para reservas por correo electrónico.",
    modalDescription: "Configura el servidor SMTP para enviar confirmaciones, recordatorios y notificaciones de reservas por correo electrónico.",
    fields: [
      { key: "smtpHost", label: "SMTP Host", placeholder: "smtp.gmail.com", hint: "Servidor de correo saliente", type: "text" },
      { key: "smtpPort", label: "SMTP Port", placeholder: "587", hint: "Puerto del servidor (587 para TLS, 465 para SSL)", type: "text" },
      { key: "smtpUser", label: "Usuario / Email", placeholder: "reservas@spalleras.com", hint: "Dirección de email para enviar correos", type: "email" },
      { key: "smtpPass", label: "Contraseña de aplicación", placeholder: "••••••••", hint: "Contraseña de app de Gmail o del servidor SMTP", type: "password" },
    ],
  },
  {
    key: "csv", name: "Importar CSV/Excel", icon: Upload,
    description: "Importar reservas antiguas desde archivos CSV o Excel.",
    modalDescription: "Sube un archivo CSV o Excel para importar reservas históricas al sistema.",
    fields: [],
  },
  {
    key: "notifications", name: "Notificaciones Automáticas", icon: Bell,
    description: "Recordatorios automáticos vía email y WhatsApp.",
    modalDescription: "Configura los canales de notificación para enviar recordatorios automáticos a los clientes antes de su cita.",
    fields: [
      { key: "emailEnabled", label: "Notificaciones por Email", placeholder: "", hint: "Enviar recordatorios por correo electrónico", type: "toggle" },
      { key: "whatsappEnabled", label: "Notificaciones por WhatsApp", placeholder: "", hint: "Enviar recordatorios por WhatsApp", type: "toggle" },
    ],
  },
];

function loadConfig(): SpaConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_CONFIG };
}

export default function ConfiguracionPage() {
  const [config, setConfig] = useState<SpaConfig>(loadConfig);
  const [integrationModal, setIntegrationModal] = useState<string | null>(null);
  const [modalFields, setModalFields] = useState<Record<string, string>>({});

  const update = <K extends keyof SpaConfig>(key: K, value: SpaConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const saveAll = () => {
    const updated = { ...config, lastModified: new Date().toISOString(), lastModifiedBy: "Admin" };
    setConfig(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    toast.success("Configuración guardada correctamente");
  };

  const resetDefaults = () => {
    setConfig({ ...DEFAULT_CONFIG });
    localStorage.removeItem(STORAGE_KEY);
    toast("Valores por defecto restaurados");
  };

  const openIntegrationModal = (key: string) => {
    setModalFields({ ...config.integrations[key]?.config });
    setIntegrationModal(key);
  };

  const saveIntegrationModal = () => {
    if (!integrationModal) return;
    setConfig((prev) => ({
      ...prev,
      integrations: {
        ...prev.integrations,
        [integrationModal]: { ...prev.integrations[integrationModal], config: { ...modalFields } },
      },
    }));
    setIntegrationModal(null);
    toast.success("Configuración de integración actualizada");
  };

  const toggleIntegration = (key: string, connected: boolean) => {
    setConfig((prev) => ({
      ...prev,
      integrations: {
        ...prev.integrations,
        [key]: {
          ...prev.integrations[key],
          connected,
          lastSync: connected ? new Date().toLocaleString("es-CO") : prev.integrations[key].lastSync,
        },
      },
    }));
  };

  const meta = INTEGRATION_META.find((m) => m.key === integrationModal);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl lg:text-3xl font-bold">Configuración</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {config.lastModified
                ? `Última modificación: ${new Date(config.lastModified).toLocaleString("es-CO")} por ${config.lastModifiedBy}`
                : "Sin modificaciones recientes"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={resetDefaults}>
              <RotateCcw className="h-4 w-4 mr-1" /> Restaurar
            </Button>
            <Button size="sm" onClick={saveAll} className="bg-primary hover:bg-primary/90">
              <Save className="h-4 w-4 mr-1" /> Guardar todos los cambios
            </Button>
          </div>
        </div>

        {/* Spa Info */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" /> Ajustes Generales del Spa
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nombre del Spa</Label>
              <Input value={config.spaName} onChange={(e) => update("spaName", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Dirección</Label>
              <Input value={config.address} onChange={(e) => update("address", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono / WhatsApp</Label>
              <Input value={config.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email de Reservas</Label>
              <Input type="email" value={config.email} onChange={(e) => update("email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Hora Apertura</Label>
              <Input type="time" value={config.openTime} onChange={(e) => update("openTime", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Hora Cierre</Label>
              <Input type="time" value={config.closeTime} onChange={(e) => update("closeTime", e.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Mensaje de bienvenida (Español)</Label>
              <Textarea rows={2} value={config.welcomeEs} onChange={(e) => update("welcomeEs", e.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Mensaje de bienvenida (English)</Label>
              <Textarea rows={2} value={config.welcomeEn} onChange={(e) => update("welcomeEn", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Business Rules */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" /> Reglas de Negocio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Zona Horaria</Label>
                <Select value={config.timezone} onValueChange={(v) => update("timezone", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/Bogota">America/Bogota (GMT-5)</SelectItem>
                    <SelectItem value="America/New_York">America/New_York (GMT-5/-4)</SelectItem>
                    <SelectItem value="America/Mexico_City">America/Mexico_City (GMT-6)</SelectItem>
                    <SelectItem value="America/Lima">America/Lima (GMT-5)</SelectItem>
                    <SelectItem value="Europe/Madrid">Europe/Madrid (GMT+1/+2)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Idioma</Label>
                <Select value={config.language} onValueChange={(v) => update("language", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Moneda Principal</Label>
                <Input value={config.currency} onChange={(e) => update("currency", e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label>Recordatorios</Label>
                <Select value={config.reminderTime} onValueChange={(v) => update("reminderTime", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2h">2 horas antes</SelectItem>
                    <SelectItem value="24h">24 horas antes</SelectItem>
                    <SelectItem value="48h">48 horas antes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Depósito requerido (%)</Label>
                <Input type="number" min={0} max={100} value={config.depositPercent} onChange={(e) => update("depositPercent", Number(e.target.value))} />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Mostrar precios en USD</p>
                <p className="text-xs text-muted-foreground">Muestra la conversión a dólares junto al precio en COP</p>
              </div>
              <Switch checked={config.showUsd} onCheckedChange={(v) => update("showUsd", v)} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-primary" /> Verificación de Doble Booking
                </p>
                <p className="text-xs text-muted-foreground">Evita que se reserven dos servicios en el mismo horario y recurso</p>
              </div>
              <Switch checked={config.doubleBookingCheck} onCheckedChange={(v) => update("doubleBookingCheck", v)} />
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label>Política de Cancelación</Label>
              <Textarea rows={4} value={config.cancellationPolicy} onChange={(e) => update("cancellationPolicy", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Integrations */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" /> Integraciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {INTEGRATION_META.map((int) => {
              const state = config.integrations[int.key] || { connected: false, lastSync: "", config: {} };
              return (
                <div key={int.key} className="flex items-center gap-4 p-4 rounded-lg border border-border/50 bg-card hover:shadow-sm transition-shadow">
                  <div className="p-2.5 rounded-lg bg-muted shrink-0">
                    <int.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-sm">{int.name}</h3>
                      <Badge variant={state.connected ? "default" : "secondary"} className={state.connected ? "bg-primary/90 text-primary-foreground text-[10px]" : "text-[10px]"}>
                        {state.connected ? "Conectado" : "Desconectado"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{int.description}</p>
                    {state.connected && state.lastSync && (
                      <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Última sync: {state.lastSync}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={state.connected} onCheckedChange={(v) => toggleIntegration(int.key, v)} />
                    {int.fields.length > 0 && (
                      <Button variant="outline" size="sm" onClick={() => openIntegrationModal(int.key)}>
                        Configurar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Bottom Save */}
        <div className="flex justify-end gap-2 pb-8">
          <Button variant="outline" onClick={resetDefaults}>
            <RotateCcw className="h-4 w-4 mr-1" /> Restaurar valores por defecto
          </Button>
          <Button onClick={saveAll} className="bg-primary hover:bg-primary/90">
            <Save className="h-4 w-4 mr-1" /> Guardar todos los cambios
          </Button>
        </div>
      </div>

      {/* Integration Config Modal */}
      <Dialog open={!!integrationModal} onOpenChange={(o) => !o && setIntegrationModal(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {meta && <div className="p-2.5 rounded-lg bg-primary/10"><meta.icon className="h-5 w-5 text-primary" /></div>}
              <div>
                <DialogTitle className="font-heading text-lg">Configurar {meta?.name}</DialogTitle>
                <p className="text-xs text-muted-foreground mt-1">{meta?.modalDescription}</p>
              </div>
            </div>
          </DialogHeader>
          <Separator />
          <div className="space-y-5 py-1">
            {meta?.fields.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label className="text-sm font-medium">{f.label}</Label>
                {f.type === "toggle" ? (
                  <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                    <p className="text-xs text-muted-foreground">{f.hint}</p>
                    <Switch
                      checked={modalFields[f.key] === "true"}
                      onCheckedChange={(v) => setModalFields((prev) => ({ ...prev, [f.key]: String(v) }))}
                    />
                  </div>
                ) : (
                  <>
                    <Input
                      type={f.type || "text"}
                      value={modalFields[f.key] || ""}
                      onChange={(e) => setModalFields((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="font-mono text-sm"
                    />
                    {f.hint && <p className="text-[11px] text-muted-foreground">{f.hint}</p>}
                  </>
                )}
              </div>
            ))}
            {meta?.fields.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Arrastra un archivo CSV o Excel aquí, o haz clic para seleccionar</p>
                <Button variant="outline" size="sm" className="mt-3">Seleccionar archivo</Button>
              </div>
            )}
          </div>
          <Separator />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIntegrationModal(null)}>Cancelar</Button>
            <Button onClick={saveIntegrationModal} className="bg-primary hover:bg-primary/90">
              <Save className="h-4 w-4 mr-1" /> Guardar configuración
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
