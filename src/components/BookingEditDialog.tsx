import { useState, useMemo, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Globe, Languages, DollarSign, Trash2, ShoppingCart, Clock, AlertTriangle, ShieldAlert, History } from "lucide-react";
import { toast } from "sonner";
import { useServices, type ServiceWithDurations } from "@/hooks/useServices";
import { useTherapists } from "@/hooks/useTherapists";
import { useResources } from "@/hooks/useResources";
import { useClients } from "@/hooks/useClients";
import { useUpdateBooking, useCheckAvailability, type Booking } from "@/hooks/useBookings";
import BookingHistoryTab from "@/components/BookingHistoryTab";
import CancelBookingDialog from "@/components/CancelBookingDialog";

interface CartItem {
  uid: string;
  serviceId: string;
  durationId: string;
  quantity: number;
}

const sources = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "fresha", label: "Fresha" },
  { value: "email", label: "Email" },
  { value: "walk_in", label: "Walk-in" },
  { value: "web", label: "Web" },
];

const statusOptions = [
  { value: "pendiente", label: "Pendiente" },
  { value: "confirmada", label: "Confirmada" },
  { value: "cancelada", label: "Cancelada" },
  { value: "completada", label: "Completada" },
];

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);
}

let uidCounter = 1000;
function nextUid() { return `ei-${++uidCounter}-${Date.now()}`; }

interface Props {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function BookingEditDialog({ booking, open, onOpenChange }: Props) {
  const { data: services } = useServices();
  const { data: therapists } = useTherapists();
  const { data: resources } = useResources();
  const { data: clients } = useClients();
  const updateBooking = useUpdateBooking();
  const checkAvailability = useCheckAvailability();

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [clientId, setClientId] = useState("");
  const [nationality, setNationality] = useState("");
  const [language, setLanguage] = useState("en");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [therapistId, setTherapistId] = useState("");
  const [secondTherapistId, setSecondTherapistId] = useState("");
  const [resourceId, setResourceId] = useState("");
  const [source, setSource] = useState("web");
  const [status, setStatus] = useState("pendiente");
  const [notes, setNotes] = useState("");
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const [pendingCancel, setPendingCancel] = useState(false);

  const activeServices = useMemo(() => (services ?? []).filter((s) => s.is_active), [services]);
  const activeTherapists = useMemo(() => (therapists ?? []).filter((t) => t.is_available), [therapists]);

  // Populate form when booking changes
  useEffect(() => {
    if (!booking) return;
    setClientId(booking.client_id ?? "");
    setNationality(booking.nationality ?? "");
    setLanguage(booking.preferred_language ?? "en");
    setDate(booking.booking_date);
    setStartTime(booking.start_time?.slice(0, 5) ?? "");
    setTherapistId(booking.therapist_id ?? "");
    setSecondTherapistId(booking.second_therapist_id ?? "");
    setResourceId(booking.resource_id ?? "");
    setSource(booking.source ?? "web");
    setStatus(booking.status ?? "pendiente");
    setNotes(booking.notes ?? "");
    setConflicts([]);

    // Build cart from booking_items or fallback to single service
    if (booking.booking_items && booking.booking_items.length > 0) {
      setCartItems(booking.booking_items.map((bi) => ({
        uid: nextUid(),
        serviceId: bi.service_id,
        durationId: bi.service_duration_id ?? "",
        quantity: bi.quantity,
      })));
    } else if (booking.service_id) {
      setCartItems([{
        uid: nextUid(),
        serviceId: booking.service_id,
        durationId: booking.service_duration_id ?? "",
        quantity: 1,
      }]);
    } else {
      setCartItems([]);
    }
  }, [booking]);

  const addCartItem = useCallback(() => {
    setCartItems((prev) => [...prev, { uid: nextUid(), serviceId: "", durationId: "", quantity: 1 }]);
  }, []);

  const updateCartItem = useCallback((uid: string, patch: Partial<CartItem>) => {
    setCartItems((prev) => prev.map((item) => (item.uid === uid ? { ...item, ...patch } : item)));
  }, []);

  const removeCartItem = useCallback((uid: string) => {
    setCartItems((prev) => prev.filter((item) => item.uid !== uid));
  }, []);

  const getDuration = (serviceId: string, durationId: string) => {
    const svc = activeServices.find((s) => s.id === serviceId);
    return svc?.service_durations.find((d) => d.id === durationId);
  };

  const { totalMinutes, totalCOP, totalUSD, requiresTwoTherapists } = useMemo(() => {
    let mins = 0, cop = 0, usd = 0, needsTwo = false;
    for (const item of cartItems) {
      const dur = getDuration(item.serviceId, item.durationId);
      if (dur) {
        mins += dur.duration_minutes * item.quantity;
        cop += dur.price_cop * item.quantity;
        usd += dur.price_usd * item.quantity;
      }
      const svc = activeServices.find((s) => s.id === item.serviceId);
      if (svc?.requires_two_therapists) needsTwo = true;
    }
    return { totalMinutes: mins, totalCOP: cop, totalUSD: usd, requiresTwoTherapists: needsTwo };
  }, [cartItems, activeServices]);

  const formatDuration = (mins: number) => {
    if (mins === 0) return "—";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  };

  const calculateEndTime = (start: string, mins: number) => {
    if (!start || mins === 0) return "";
    const [h, m] = start.split(":").map(Number);
    const total = h * 60 + m + mins;
    const eh = Math.floor(total / 60) % 24;
    const em = total % 60;
    return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
  };

  // Check availability whenever relevant fields change
  useEffect(() => {
    if (!date || !startTime || totalMinutes === 0 || !booking) return;
    const endTime = calculateEndTime(startTime, totalMinutes);
    if (!endTime) return;

    setChecking(true);
    checkAvailability({
      date,
      startTime,
      endTime,
      therapistId: therapistId || null,
      secondTherapistId: secondTherapistId || null,
      resourceId: resourceId || null,
      excludeBookingId: booking.id,
    }).then((c) => {
      setConflicts(c);
      setChecking(false);
    });
  }, [date, startTime, totalMinutes, therapistId, secondTherapistId, resourceId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!booking) return;
    if (cartItems.length === 0) {
      toast.error("Agrega al menos un servicio.");
      return;
    }
    if (cartItems.some((i) => !i.serviceId || !i.durationId)) {
      toast.error("Selecciona tarifa para todos los servicios.");
      return;
    }
    if (!date || !startTime) {
      toast.error("Selecciona fecha y hora.");
      return;
    }
    if (conflicts.length > 0) {
      toast.error("Resuelve los conflictos de horario antes de guardar.");
      return;
    }

    const endTime = calculateEndTime(startTime, totalMinutes);

    try {
      await updateBooking.mutateAsync({
        id: booking.id,
        booking: {
          client_id: clientId || null,
          booking_date: date,
          start_time: startTime,
          end_time: endTime || startTime,
          therapist_id: therapistId || null,
          second_therapist_id: secondTherapistId || null,
          resource_id: resourceId || null,
          price_cop: totalCOP,
          price_usd: totalUSD,
          nationality: nationality || null,
          preferred_language: language,
          source: source as any,
          status: status as any,
          notes: notes || null,
          service_id: cartItems.length === 1 ? cartItems[0].serviceId : null,
          service_duration_id: cartItems.length === 1 ? cartItems[0].durationId : null,
        },
        items: cartItems.map((item) => {
          const dur = getDuration(item.serviceId, item.durationId);
          return {
            service_id: item.serviceId,
            service_duration_id: item.durationId,
            quantity: item.quantity,
            price_cop: (dur?.price_cop ?? 0) * item.quantity,
            price_usd: (dur?.price_usd ?? 0) * item.quantity,
          };
        }),
      });
      toast.success("Reserva actualizada correctamente");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Editar Reserva</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="form" className="mt-2">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="form">Detalles</TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <History className="h-3.5 w-3.5" /> Historial
            </TabsTrigger>
          </TabsList>
          <TabsContent value="history" className="pt-3">
            <BookingHistoryTab bookingId={booking?.id} />
          </TabsContent>
          <TabsContent value="form">
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Conflict warnings */}
          {conflicts.length > 0 && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="p-3 space-y-1">
                <p className="text-sm font-semibold text-destructive flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4" /> Conflictos de horario
                </p>
                {conflicts.map((c, i) => (
                  <p key={i} className="text-xs text-destructive/80">• {c}</p>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Status */}
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select
              value={status}
              onValueChange={(v) => {
                if (v === "cancelada" && status !== "cancelada") {
                  setPendingCancel(true);
                  return;
                }
                setStatus(v);
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client */}
          <div className="space-y-1.5">
            <Label>Cliente</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar cliente..." /></SelectTrigger>
              <SelectContent>
                {(clients ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}{c.phone ? ` — ${c.phone}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nationality & Language */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-primary" /> Nacionalidad
              </Label>
              <Input value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="Colombia, USA..." />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Languages className="h-3.5 w-3.5 text-primary" /> Idioma
              </Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">🇺🇸 English</SelectItem>
                  <SelectItem value="es">🇪🇸 Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cart */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-base font-semibold">
                <ShoppingCart className="h-4 w-4 text-primary" /> Servicios
              </Label>
              <Badge variant="secondary" className="text-xs">{cartItems.length} servicio(s)</Badge>
            </div>

            <div className="space-y-2">
              {cartItems.map((item) => {
                const svc = activeServices.find((s) => s.id === item.serviceId);
                const dur = svc ? svc.service_durations.find((d) => d.id === item.durationId) : null;
                return (
                  <Card key={item.uid} className="border-border/60 bg-muted/20">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex gap-2">
                        <div className="flex-1 space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Servicio</label>
                          <Select value={item.serviceId} onValueChange={(v) => updateCartItem(item.uid, { serviceId: v, durationId: "" })}>
                            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                            <SelectContent>
                              {activeServices.map((s) => (
                                <SelectItem key={s.id} value={s.id}>{s.is_addon && "⭐ "}{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="mt-5 h-9 w-9 text-destructive" onClick={() => removeCartItem(item.uid)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {svc && svc.service_durations.length > 0 && (
                        <div className="grid grid-cols-[1fr_80px] gap-2">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Duración / Tarifa</label>
                            <Select value={item.durationId} onValueChange={(v) => updateCartItem(item.uid, { durationId: v })}>
                              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Tarifa..." /></SelectTrigger>
                              <SelectContent>
                                {svc.service_durations.map((d) => (
                                  <SelectItem key={d.id} value={d.id}>{d.duration_minutes} min — {formatCOP(d.price_cop)} | ${d.price_usd}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Cant.</label>
                            <Input type="number" min={1} max={10} value={item.quantity} onChange={(e) => updateCartItem(item.uid, { quantity: Math.max(1, Number(e.target.value)) })} className="h-9 text-sm text-center" />
                          </div>
                        </div>
                      )}
                      {dur && (
                        <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t border-border/30">
                          <span>{dur.duration_minutes * item.quantity} min</span>
                          <span className="font-medium text-foreground">{formatCOP(dur.price_cop * item.quantity)} | ${dur.price_usd * item.quantity} USD</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Button type="button" variant="outline" className="w-full border-dashed border-2 border-primary/30 text-primary hover:bg-primary/5 gap-2 h-11" onClick={addCartItem}>
              <Plus className="h-4 w-4" /> Agregar servicio
            </Button>

            {cartItems.length > 0 && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-3">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Clock className="h-3 w-3" /> Tiempo</p>
                      <p className="font-heading font-bold text-lg">{formatDuration(totalMinutes)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><DollarSign className="h-3 w-3" /> COP</p>
                      <p className="font-heading font-bold text-lg">{formatCOP(totalCOP)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><DollarSign className="h-3 w-3" /> USD</p>
                      <p className="font-heading font-bold text-lg">${totalUSD}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Hora Inicio</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
            </div>
          </div>

          {totalMinutes > 0 && startTime && (
            <div className="text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-md flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Bloque de <span className="font-semibold">{formatDuration(totalMinutes)}</span> — termina a las {calculateEndTime(startTime, totalMinutes)}
            </div>
          )}

          {/* Therapist & Resource */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Terapeuta</Label>
              <Select value={therapistId} onValueChange={setTherapistId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {activeTherapists.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Recurso / Sala</Label>
              <Select value={resourceId} onValueChange={setResourceId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {(resources ?? []).filter((r) => r.is_active).map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name} ({r.type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {requiresTwoTherapists && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Segundo Terapeuta
              </Label>
              <Select value={secondTherapistId} onValueChange={setSecondTherapistId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {activeTherapists.filter((t) => t.id !== therapistId).map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Source */}
          <div className="space-y-1.5">
            <Label>Fuente</Label>
            <Select value={source} onValueChange={setSource}>
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
            <Label>Notas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas adicionales..." rows={2} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" variant="spa" className="flex-1" disabled={updateBooking.isPending || conflicts.length > 0}>
              {updateBooking.isPending ? "Guardando..." : conflicts.length > 0 ? "Conflictos pendientes" : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
