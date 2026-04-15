import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Globe, Languages, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Rate {
  label: string;
  minutes: number | null;
  priceCOP: number | null;
  priceUSD: number | null;
}

interface ServiceOption {
  id: string;
  name: string;
  rates: Rate[];
  priceOnRequest?: boolean;
}

const serviceOptions: ServiceOption[] = [
  {
    id: "relajante",
    name: "Masaje Relajante",
    rates: [
      { label: "40 minutos", minutes: 40, priceCOP: 160000, priceUSD: 50 },
      { label: "60 minutos", minutes: 60, priceCOP: 185000, priceUSD: 55 },
      { label: "90 minutos", minutes: 90, priceCOP: 235000, priceUSD: 70 },
    ],
  },
  {
    id: "profundo",
    name: "Masaje de Tejido Profundo",
    rates: [
      { label: "40 minutos", minutes: 40, priceCOP: 185000, priceUSD: 55 },
      { label: "60 minutos", minutes: 60, priceCOP: 210000, priceUSD: 65 },
      { label: "90 minutos", minutes: 90, priceCOP: 260000, priceUSD: 75 },
    ],
  },
  {
    id: "cuatro-manos",
    name: "Masaje a Cuatro Manos",
    rates: [
      { label: "60 minutos", minutes: 60, priceCOP: 370000, priceUSD: 110 },
      { label: "90 minutos", minutes: 90, priceCOP: 470000, priceUSD: 140 },
    ],
  },
  {
    id: "facial-limpieza",
    name: "Facial de Limpieza Profunda",
    rates: [
      { label: "Con masaje o IV — 60 min", minutes: 60, priceCOP: 185000, priceUSD: 55 },
      { label: "Sin masaje o IV — 60 min", minutes: 60, priceCOP: 210000, priceUSD: 65 },
    ],
  },
  {
    id: "facial-led",
    name: "Facial Limpieza + Hidratación + LED",
    rates: [
      { label: "Con masaje o IV — 70 min", minutes: 70, priceCOP: 235000, priceUSD: 70 },
      { label: "Sin masaje o IV — 70 min", minutes: 70, priceCOP: 260000, priceUSD: 75 },
    ],
  },
  {
    id: "facial-ultimate",
    name: "Facial Ultimate",
    rates: [
      { label: "Con masaje o IV — 80 min", minutes: 80, priceCOP: 285000, priceUSD: 85 },
      { label: "Sin masaje o IV — 80 min", minutes: 80, priceCOP: 310000, priceUSD: 90 },
    ],
  },
  {
    id: "hidroterapia",
    name: "Acceso a Hidroterapia en Terraza",
    rates: [
      { label: "90 minutos", minutes: 90, priceCOP: 110000, priceUSD: 35 },
    ],
  },
  {
    id: "exfoliacion",
    name: "Exfoliación Corporal Suave",
    rates: [
      { label: "15 minutos", minutes: 15, priceCOP: 85000, priceUSD: 25 },
    ],
  },
  {
    id: "chocolate",
    name: "Terapia Corporal de Chocolate",
    rates: [
      { label: "15 minutos", minutes: 15, priceCOP: 120000, priceUSD: 35 },
    ],
  },
  {
    id: "espumoso",
    name: "Vino Espumoso",
    rates: [
      { label: "Botella", minutes: null, priceCOP: 150000, priceUSD: 45 },
    ],
  },
  {
    id: "percusion",
    name: "Terapia de Percusión (Pistola de Masaje)",
    rates: [
      { label: "15 minutos", minutes: 15, priceCOP: 60000, priceUSD: 20 },
    ],
  },
  {
    id: "ventosas",
    name: "Terapia con Ventosas",
    rates: [
      { label: "15 minutos", minutes: 15, priceCOP: 60000, priceUSD: 20 },
    ],
  },
  {
    id: "piedras",
    name: "Piedras Volcánicas Calientes",
    rates: [
      { label: "15 minutos", minutes: 15, priceCOP: 60000, priceUSD: 20 },
    ],
  },
  {
    id: "aromaterapia",
    name: "Aromaterapia",
    rates: [],
    priceOnRequest: true,
  },
  {
    id: "zona-espalda",
    name: "Masaje Exprés — Espalda, cuello y hombros",
    rates: [
      { label: "30 minutos", minutes: 30, priceCOP: 150000, priceUSD: 40 },
    ],
  },
  {
    id: "zona-piernas",
    name: "Masaje Exprés — Piernas y pies",
    rates: [
      { label: "30 minutos", minutes: 30, priceCOP: 150000, priceUSD: 40 },
    ],
  },
  {
    id: "zona-brazos",
    name: "Masaje Exprés — Manos y brazos",
    rates: [
      { label: "30 minutos", minutes: 30, priceCOP: 150000, priceUSD: 40 },
    ],
  },
  {
    id: "paquete-terraza-1",
    name: "Paquete Día de Spa + Terraza (1 persona)",
    rates: [
      { label: "2h 30min", minutes: 150, priceCOP: 385000, priceUSD: 110 },
    ],
  },
  {
    id: "paquete-terraza-2",
    name: "Paquete Día de Spa + Terraza (2 personas)",
    rates: [
      { label: "2h 30min", minutes: 150, priceCOP: 720000, priceUSD: 205 },
    ],
  },
  {
    id: "paquete-jacuzzi-1",
    name: "Paquete Día de Spa + Jacuzzi Privado (1 persona)",
    rates: [
      { label: "2 horas", minutes: 120, priceCOP: 335000, priceUSD: 95 },
    ],
  },
  {
    id: "paquete-jacuzzi-2",
    name: "Paquete Día de Spa + Jacuzzi Privado (2 personas)",
    rates: [
      { label: "2 horas", minutes: 120, priceCOP: 620000, priceUSD: 180 },
    ],
  },
];

const rooms = [
  { value: "agua", label: "Agua (doble, jacuzzi)" },
  { value: "aire", label: "Aire" },
  { value: "tierra", label: "Tierra" },
  { value: "fuego", label: "Fuego (doble)" },
  { value: "yin-yang", label: "Yin and Yang (doble)" },
  { value: "africa", label: "Africa (doble)" },
  { value: "consultorio1", label: "Consultorio 1" },
  { value: "consultorio2", label: "Consultorio 2" },
  { value: "rooftop", label: "Rooftop" },
];

const sources = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "fresha", label: "Fresha" },
  { value: "email", label: "Email" },
  { value: "walk_in", label: "Walk-in" },
  { value: "web", label: "Web" },
];

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);
}

export default function BookingFormDialog() {
  const [open, setOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedRateIdx, setSelectedRateIdx] = useState("");
  const { toast } = useToast();

  const selectedService = useMemo(
    () => serviceOptions.find((s) => s.id === selectedServiceId),
    [selectedServiceId]
  );

  const selectedRate = useMemo(() => {
    if (!selectedService || selectedRateIdx === "") return null;
    return selectedService.rates[Number(selectedRateIdx)] ?? null;
  }, [selectedService, selectedRateIdx]);

  const handleServiceChange = (value: string) => {
    setSelectedServiceId(value);
    setSelectedRateIdx("");
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast({
      title: "Reserva creada",
      description: "La reserva se ha registrado correctamente.",
    });
    setOpen(false);
    setSelectedServiceId("");
    setSelectedRateIdx("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSelectedServiceId(""); setSelectedRateIdx(""); } }}>
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
            <Select value={selectedServiceId} onValueChange={handleServiceChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar servicio..." />
              </SelectTrigger>
              <SelectContent>
                {serviceOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duration / Rate */}
          {selectedService && selectedService.rates.length > 0 && (
            <div className="space-y-1.5">
              <Label>Duración / Tarifa</Label>
              <Select value={selectedRateIdx} onValueChange={setSelectedRateIdx}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tarifa..." />
                </SelectTrigger>
                <SelectContent>
                  {selectedService.rates.map((r, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {r.label} — {r.priceCOP ? formatCOP(r.priceCOP) : ""}{r.priceUSD ? ` | $${r.priceUSD} USD` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedService?.priceOnRequest && (
            <div className="bg-accent/10 border border-accent/20 text-accent-foreground text-sm px-3 py-2 rounded-md">
              Precio bajo consulta
            </div>
          )}

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date">Fecha</Label>
              <Input id="date" type="date" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="startTime">Hora Inicio</Label>
              <Input id="startTime" type="time" required />
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
                  {rooms.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Price display - auto-calculated */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-primary" />
                Precio COP
              </Label>
              <Input
                value={selectedRate?.priceCOP ? formatCOP(selectedRate.priceCOP) : ""}
                placeholder="Selecciona servicio y tarifa"
                readOnly
                className="bg-muted/50 font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-primary" />
                Precio USD
              </Label>
              <Input
                value={selectedRate?.priceUSD ? `$${selectedRate.priceUSD} USD` : ""}
                placeholder="—"
                readOnly
                className="bg-muted/50 font-semibold"
              />
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
