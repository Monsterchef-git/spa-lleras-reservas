import { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Globe, Languages, DollarSign, Trash2, ShoppingCart, Sparkles, Clock, AlertTriangle } from "lucide-react";
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
  isAddon?: boolean;
  requiresTwoTherapists?: boolean;
}

interface CartItem {
  uid: string;
  serviceId: string;
  rateIdx: number;
  quantity: number;
}

const serviceOptions: ServiceOption[] = [
  {
    id: "relajante", name: "Masaje Relajante",
    rates: [
      { label: "40 minutos", minutes: 40, priceCOP: 160000, priceUSD: 50 },
      { label: "60 minutos", minutes: 60, priceCOP: 185000, priceUSD: 55 },
      { label: "90 minutos", minutes: 90, priceCOP: 235000, priceUSD: 70 },
    ],
  },
  {
    id: "profundo", name: "Masaje de Tejido Profundo",
    rates: [
      { label: "40 minutos", minutes: 40, priceCOP: 185000, priceUSD: 55 },
      { label: "60 minutos", minutes: 60, priceCOP: 210000, priceUSD: 65 },
      { label: "90 minutos", minutes: 90, priceCOP: 260000, priceUSD: 75 },
    ],
  },
  {
    id: "cuatro-manos", name: "Masaje a Cuatro Manos", requiresTwoTherapists: true,
    rates: [
      { label: "60 minutos", minutes: 60, priceCOP: 370000, priceUSD: 110 },
      { label: "90 minutos", minutes: 90, priceCOP: 470000, priceUSD: 140 },
    ],
  },
  {
    id: "facial-limpieza", name: "Facial de Limpieza Profunda",
    rates: [
      { label: "Con masaje o IV — 60 min", minutes: 60, priceCOP: 185000, priceUSD: 55 },
      { label: "Sin masaje o IV — 60 min", minutes: 60, priceCOP: 210000, priceUSD: 65 },
    ],
  },
  {
    id: "facial-led", name: "Facial Limpieza + Hidratación + LED",
    rates: [
      { label: "Con masaje o IV — 70 min", minutes: 70, priceCOP: 235000, priceUSD: 70 },
      { label: "Sin masaje o IV — 70 min", minutes: 70, priceCOP: 260000, priceUSD: 75 },
    ],
  },
  {
    id: "facial-ultimate", name: "Facial Ultimate",
    rates: [
      { label: "Con masaje o IV — 80 min", minutes: 80, priceCOP: 285000, priceUSD: 85 },
      { label: "Sin masaje o IV — 80 min", minutes: 80, priceCOP: 310000, priceUSD: 90 },
    ],
  },
  {
    id: "hidroterapia", name: "Acceso a Hidroterapia en Terraza",
    rates: [{ label: "90 minutos", minutes: 90, priceCOP: 110000, priceUSD: 35 }],
  },
  {
    id: "exfoliacion", name: "Exfoliación Corporal Suave", isAddon: true,
    rates: [{ label: "15 minutos", minutes: 15, priceCOP: 85000, priceUSD: 25 }],
  },
  {
    id: "chocolate", name: "Terapia Corporal de Chocolate", isAddon: true,
    rates: [{ label: "15 minutos", minutes: 15, priceCOP: 120000, priceUSD: 35 }],
  },
  {
    id: "espumoso", name: "Vino Espumoso", isAddon: true,
    rates: [{ label: "Botella", minutes: null, priceCOP: 150000, priceUSD: 45 }],
  },
  {
    id: "percusion", name: "Terapia de Percusión (Pistola de Masaje)", isAddon: true,
    rates: [{ label: "15 minutos", minutes: 15, priceCOP: 60000, priceUSD: 20 }],
  },
  {
    id: "ventosas", name: "Terapia con Ventosas", isAddon: true,
    rates: [{ label: "15 minutos", minutes: 15, priceCOP: 60000, priceUSD: 20 }],
  },
  {
    id: "piedras", name: "Piedras Volcánicas Calientes", isAddon: true,
    rates: [{ label: "15 minutos", minutes: 15, priceCOP: 60000, priceUSD: 20 }],
  },
  {
    id: "aromaterapia", name: "Aromaterapia", isAddon: true,
    rates: [], priceOnRequest: true,
  },
  {
    id: "zona-espalda", name: "Masaje Exprés — Espalda, cuello y hombros",
    rates: [{ label: "30 minutos", minutes: 30, priceCOP: 150000, priceUSD: 40 }],
  },
  {
    id: "zona-piernas", name: "Masaje Exprés — Piernas y pies",
    rates: [{ label: "30 minutos", minutes: 30, priceCOP: 150000, priceUSD: 40 }],
  },
  {
    id: "zona-brazos", name: "Masaje Exprés — Manos y brazos",
    rates: [{ label: "30 minutos", minutes: 30, priceCOP: 150000, priceUSD: 40 }],
  },
  {
    id: "paquete-terraza-1", name: "Paquete Día de Spa + Terraza (1 persona)",
    rates: [{ label: "2h 30min", minutes: 150, priceCOP: 385000, priceUSD: 110 }],
  },
  {
    id: "paquete-terraza-2", name: "Paquete Día de Spa + Terraza (2 personas)",
    rates: [{ label: "2h 30min", minutes: 150, priceCOP: 720000, priceUSD: 205 }],
  },
  {
    id: "paquete-jacuzzi-1", name: "Paquete Día de Spa + Jacuzzi Privado (1 persona)",
    rates: [{ label: "2 horas", minutes: 120, priceCOP: 335000, priceUSD: 95 }],
  },
  {
    id: "paquete-jacuzzi-2", name: "Paquete Día de Spa + Jacuzzi Privado (2 personas)",
    rates: [{ label: "2 horas", minutes: 120, priceCOP: 620000, priceUSD: 180 }],
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

// Add-on suggestions based on main services
const addonSuggestions: Record<string, string[]> = {
  relajante: ["aromaterapia", "exfoliacion", "piedras", "espumoso"],
  profundo: ["percusion", "ventosas", "piedras", "espumoso"],
  "cuatro-manos": ["aromaterapia", "chocolate", "espumoso"],
  "facial-limpieza": ["exfoliacion", "aromaterapia", "espumoso"],
  "facial-led": ["exfoliacion", "aromaterapia", "espumoso"],
  "facial-ultimate": ["chocolate", "aromaterapia", "espumoso"],
};

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);
}

let uidCounter = 0;
function nextUid() {
  return `ci-${++uidCounter}-${Date.now()}`;
}

export default function BookingFormDialog() {
  const [open, setOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const { toast } = useToast();

  const addCartItem = useCallback(() => {
    setCartItems((prev) => [...prev, { uid: nextUid(), serviceId: "", rateIdx: -1, quantity: 1 }]);
  }, []);

  const updateCartItem = useCallback((uid: string, patch: Partial<CartItem>) => {
    setCartItems((prev) => prev.map((item) => (item.uid === uid ? { ...item, ...patch } : item)));
  }, []);

  const removeCartItem = useCallback((uid: string) => {
    setCartItems((prev) => prev.filter((item) => item.uid !== uid));
  }, []);

  const addSuggestedAddon = useCallback((serviceId: string) => {
    const svc = serviceOptions.find((s) => s.id === serviceId);
    if (!svc || svc.rates.length === 0) return;
    setCartItems((prev) => [...prev, { uid: nextUid(), serviceId, rateIdx: 0, quantity: 1 }]);
  }, []);

  // Derived totals
  const { totalMinutes, totalCOP, totalUSD, requiresTwoTherapists } = useMemo(() => {
    let mins = 0, cop = 0, usd = 0, needsTwo = false;
    for (const item of cartItems) {
      const svc = serviceOptions.find((s) => s.id === item.serviceId);
      if (!svc || item.rateIdx < 0 || item.rateIdx >= svc.rates.length) continue;
      const rate = svc.rates[item.rateIdx];
      if (rate.minutes) mins += rate.minutes * item.quantity;
      if (rate.priceCOP) cop += rate.priceCOP * item.quantity;
      if (rate.priceUSD) usd += rate.priceUSD * item.quantity;
      if (svc.requiresTwoTherapists) needsTwo = true;
    }
    return { totalMinutes: mins, totalCOP: cop, totalUSD: usd, requiresTwoTherapists: needsTwo };
  }, [cartItems]);

  // Suggested add-ons based on cart
  const suggestedAddons = useMemo(() => {
    const mainServiceIds = cartItems.map((i) => i.serviceId).filter(Boolean);
    const cartServiceIds = new Set(mainServiceIds);
    const suggestions = new Set<string>();
    for (const sid of mainServiceIds) {
      const addons = addonSuggestions[sid] || [];
      for (const a of addons) {
        if (!cartServiceIds.has(a)) suggestions.add(a);
      }
    }
    return Array.from(suggestions)
      .map((id) => serviceOptions.find((s) => s.id === id))
      .filter((s): s is ServiceOption => !!s && !s.priceOnRequest)
      .slice(0, 4);
  }, [cartItems]);

  const resetForm = () => {
    setCartItems([]);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      toast({ title: "Sin servicios", description: "Agrega al menos un servicio a la reserva.", variant: "destructive" });
      return;
    }
    const incomplete = cartItems.some((i) => {
      const svc = serviceOptions.find((s) => s.id === i.serviceId);
      return !svc || (svc.rates.length > 0 && i.rateIdx < 0);
    });
    if (incomplete) {
      toast({ title: "Servicios incompletos", description: "Selecciona tarifa para todos los servicios.", variant: "destructive" });
      return;
    }
    toast({ title: "Reserva creada", description: `${cartItems.length} servicio(s) — ${formatCOP(totalCOP)}` });
    setOpen(false);
    resetForm();
  };

  const formatDuration = (mins: number) => {
    if (mins === 0) return "—";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="spa" className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Reserva
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Nueva Reserva</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Client info */}
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
                <Globe className="h-3.5 w-3.5 text-primary" /> País / Nacionalidad
              </Label>
              <Input id="nationality" placeholder="Colombia, USA, UK..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="language" className="flex items-center gap-1.5">
                <Languages className="h-3.5 w-3.5 text-primary" /> Idioma Preferido
              </Label>
              <Select defaultValue="en">
                <SelectTrigger id="language"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">🇺🇸 English</SelectItem>
                  <SelectItem value="es">🇪🇸 Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ============ CART ============ */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-base font-semibold">
                <ShoppingCart className="h-4 w-4 text-primary" />
                Servicios seleccionados
              </Label>
              <Badge variant="secondary" className="text-xs">
                {cartItems.length} servicio(s)
              </Badge>
            </div>

            {/* Cart items */}
            <div className="space-y-2">
              {cartItems.map((item) => {
                const svc = serviceOptions.find((s) => s.id === item.serviceId);
                const rate = svc && item.rateIdx >= 0 ? svc.rates[item.rateIdx] : null;
                return (
                  <Card key={item.uid} className="border-border/60 bg-muted/20">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex gap-2">
                        {/* Service selector */}
                        <div className="flex-1 space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Servicio</label>
                          <Select
                            value={item.serviceId}
                            onValueChange={(v) => updateCartItem(item.uid, { serviceId: v, rateIdx: -1 })}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Seleccionar servicio..." />
                            </SelectTrigger>
                            <SelectContent>
                              {serviceOptions.filter((s) => !s.priceOnRequest).map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.isAddon && "⭐ "}{s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {/* Remove */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="mt-5 h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeCartItem(item.uid)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {svc && svc.rates.length > 0 && (
                        <div className="grid grid-cols-[1fr_80px] gap-2">
                          {/* Rate */}
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Duración / Tarifa</label>
                            <Select
                              value={item.rateIdx >= 0 ? String(item.rateIdx) : ""}
                              onValueChange={(v) => updateCartItem(item.uid, { rateIdx: Number(v) })}
                            >
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="Tarifa..." />
                              </SelectTrigger>
                              <SelectContent>
                                {svc.rates.map((r, i) => (
                                  <SelectItem key={i} value={String(i)}>
                                    {r.label} — {r.priceCOP ? formatCOP(r.priceCOP) : ""}{r.priceUSD ? ` | $${r.priceUSD}` : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {/* Quantity */}
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Cant.</label>
                            <Input
                              type="number"
                              min={1}
                              max={10}
                              value={item.quantity}
                              onChange={(e) => updateCartItem(item.uid, { quantity: Math.max(1, Number(e.target.value)) })}
                              className="h-9 text-sm text-center"
                            />
                          </div>
                        </div>
                      )}

                      {/* Line total */}
                      {rate && (
                        <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t border-border/30">
                          <span>{rate.minutes ? `${rate.minutes * item.quantity} min` : "—"}</span>
                          <span className="font-medium text-foreground">
                            {rate.priceCOP ? formatCOP(rate.priceCOP * item.quantity) : ""} | ${rate.priceUSD ? rate.priceUSD * item.quantity : 0} USD
                          </span>
                        </div>
                      )}

                      {/* Two therapists warning */}
                      {svc?.requiresTwoTherapists && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Requiere dos terapeutas
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Add service button */}
            <Button
              type="button"
              variant="outline"
              className="w-full border-dashed border-2 border-primary/30 text-primary hover:bg-primary/5 gap-2 h-11"
              onClick={addCartItem}
            >
              <Plus className="h-4 w-4" />
              Agregar servicio
            </Button>

            {/* Suggested add-ons */}
            {suggestedAddons.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                  Sugerencias de add-ons
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestedAddons.map((svc) => (
                    <Button
                      key={svc.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 gap-1 border-accent/40 text-accent-foreground hover:bg-accent/10"
                      onClick={() => addSuggestedAddon(svc.id)}
                    >
                      <Plus className="h-3 w-3" />
                      {svc.name}
                      {svc.rates[0]?.priceCOP ? ` — ${formatCOP(svc.rates[0].priceCOP)}` : ""}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Totals */}
            {cartItems.length > 0 && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-3">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <Clock className="h-3 w-3" /> Tiempo total
                      </p>
                      <p className="font-heading font-bold text-lg">{formatDuration(totalMinutes)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <DollarSign className="h-3 w-3" /> Total COP
                      </p>
                      <p className="font-heading font-bold text-lg">{formatCOP(totalCOP)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <DollarSign className="h-3 w-3" /> Total USD
                      </p>
                      <p className="font-heading font-bold text-lg">${totalUSD}</p>
                    </div>
                  </div>
                  {requiresTwoTherapists && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 mt-2 justify-center">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Esta reserva requiere al menos dos terapeutas
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

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

          {/* End time auto-calculated */}
          {totalMinutes > 0 && (
            <div className="text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-md flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              La reserva ocupará un bloque de <span className="font-semibold">{formatDuration(totalMinutes)}</span> desde la hora de inicio.
            </div>
          )}

          {/* Therapist & Resource */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Terapeuta</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
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
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Second therapist if needed */}
          {requiresTwoTherapists && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                Segundo Terapeuta
              </Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Seleccionar segundo terapeuta..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ana">Ana Pérez</SelectItem>
                  <SelectItem value="juan">Juan Rivera</SelectItem>
                  <SelectItem value="sofia">Sofia Torres</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Price totals (readonly) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-primary" /> Precio COP
              </Label>
              <Input value={totalCOP > 0 ? formatCOP(totalCOP) : ""} placeholder="Se calcula automáticamente" readOnly className="bg-muted/50 font-semibold" />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-primary" /> Precio USD
              </Label>
              <Input value={totalUSD > 0 ? `$${totalUSD} USD` : ""} placeholder="—" readOnly className="bg-muted/50 font-semibold" />
            </div>
          </div>

          {/* Source */}
          <div className="space-y-1.5">
            <Label>Fuente</Label>
            <Select defaultValue="web">
              <SelectTrigger><SelectValue /></SelectTrigger>
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
