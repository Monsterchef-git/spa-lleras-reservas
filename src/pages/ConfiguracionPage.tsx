import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, MessageSquare, Mail, Upload, Calendar } from "lucide-react";

const integrations = [
  { name: "Fresha → Google Calendar", description: "Sincronización bidireccional de reservas con Google Calendar.", icon: Calendar, status: "Placeholder" },
  { name: "WhatsApp Business API", description: "Webhook vía Make.com para parsear mensajes y crear reservas automáticamente.", icon: MessageSquare, status: "Placeholder" },
  { name: "Email / Gmail API", description: "Forward de emails o integración directa con Gmail para reservas por correo.", icon: Mail, status: "Placeholder" },
  { name: "Importar CSV/Excel", description: "Importar reservas antiguas desde archivos CSV o Excel.", icon: Upload, status: "Placeholder" },
  { name: "Notificaciones Automáticas", description: "Recordatorios 24h antes vía email y WhatsApp.", icon: Globe, status: "Placeholder" },
];

export default function ConfiguracionPage() {
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-heading text-2xl lg:text-3xl font-bold">Configuración</h1>
          <p className="text-muted-foreground text-sm mt-1">Integraciones y ajustes del sistema</p>
        </div>

        {/* Business Rules */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Reglas de Negocio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">Zona Horaria</span>
              <span className="font-medium">America/Bogota (GMT-5)</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">Moneda Principal</span>
              <span className="font-medium">COP (también muestra USD)</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">Idioma</span>
              <span className="font-medium">Español</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">Recordatorios</span>
              <span className="font-medium">24 horas antes</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">Doble Booking</span>
              <span className="font-medium text-primary">Verificación automática activa</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">Política de Cancelación</span>
              <span className="font-medium">Visible al confirmar reserva</span>
            </div>
          </CardContent>
        </Card>

        {/* Integrations */}
        <div>
          <h2 className="font-heading text-xl font-bold mb-4">Integraciones</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {integrations.map((int) => (
              <Card key={int.name} className="border-border/50 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <int.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-sm">{int.name}</h3>
                        <Badge variant="secondary" className="text-xs">{int.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{int.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
