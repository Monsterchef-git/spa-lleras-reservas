import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Globe, Languages } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const sources = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "fresha", label: "Fresha" },
  { value: "email", label: "Email" },
  { value: "walk_in", label: "Walk-in" },
  { value: "web", label: "Web" },
];

export default function BookingFormDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: Connect to Supabase insert
    toast({
      title: "Reserva creada",
      description: "La reserva se ha registrado correctamente.",
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="spa" className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Reserva
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Nueva Reserva</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Client */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="clientName">Nombre del Cliente</Label>
              <Input id="clientName" placeholder="María García" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clientPhone">WhatsApp / Teléfono</Label>
              <Input id="clientPhone" placeholder="+57 300 123 4567" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="clientEmail">Email</Label>
            <Input id="clientEmail" type="email" placeholder="cliente@email.com" />
          </div>

          {/* Nationality & Language */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nationality" className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-primary" />
                País / Nacionalidad
              </Label>
              <Input id="nationality" placeholder="Colombia, USA, UK..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="language" className="flex items-center gap-1.5">
                <Languages className="h-3.5 w-3.5 text-primary" />
                Idioma Preferido
              </Label>
              <Select defaultValue="en">
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">🇺🇸 English</SelectItem>
                  <SelectItem value="es">🇪🇸 Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Service */}
          <div className="space-y-1.5">
            <Label>Servicio</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar servicio..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relajante">Masaje Relajante</SelectItem>
                <SelectItem value="profundo">Masaje de Tejido Profundo</SelectItem>
                <SelectItem value="cuatro-manos">Masaje a Cuatro Manos</SelectItem>
                <SelectItem value="express">Masaje Exprés</SelectItem>
                <SelectItem value="facial">Faciales</SelectItem>
                <SelectItem value="paquete">Paquetes de Día de Spa</SelectItem>
                <SelectItem value="rooftop">Experiencia Rooftop</SelectItem>
                <SelectItem value="aroma">Aromaterapia (Add-on)</SelectItem>
                <SelectItem value="iv">Terapia IV</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date, Time, Duration */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date">Fecha</Label>
              <Input id="date" type="date" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="startTime">Hora Inicio</Label>
              <Input id="startTime" type="time" required />
            </div>
            <div className="space-y-1.5">
              <Label>Duración</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Min..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="40">40 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                  <SelectItem value="90">90 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Therapist & Resource */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Terapeuta</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ana">Ana Pérez</SelectItem>
                  <SelectItem value="juan">Juan Rivera</SelectItem>
                  <SelectItem value="sofia">Sofia Torres</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Recurso / Sala</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sala1">Sala de Masajes 1</SelectItem>
                  <SelectItem value="sala2">Sala de Masajes 2</SelectItem>
                  <SelectItem value="rooftop">Rooftop</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Price display */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Precio COP</Label>
              <Input placeholder="$185.000" readOnly className="bg-muted/50" />
            </div>
            <div className="space-y-1.5">
              <Label>Precio USD</Label>
              <Input placeholder="$55" readOnly className="bg-muted/50" />
            </div>
          </div>

          {/* Source */}
          <div className="space-y-1.5">
            <Label>Fuente</Label>
            <Select defaultValue="web">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sources.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" placeholder="Notas adicionales..." rows={2} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="spa" className="flex-1">
              Crear Reserva
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
