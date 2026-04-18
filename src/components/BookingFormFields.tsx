import { useEffect, useMemo } from "react";
import { useFormContext, useFieldArray, useWatch } from "react-hook-form";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Plus, Globe, Languages, DollarSign, Trash2, ShoppingCart, Sparkles,
  Clock, AlertTriangle, ShieldAlert, CalendarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type BookingFormValues, calculateEndTime, formatDuration,
  SPA_OPEN_TIME, SPA_CLOSE_TIME, todayISO,
} from "@/lib/schemas";
import type { ServiceWithDurations } from "@/hooks/useServices";

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", minimumFractionDigits: 0,
  }).format(n);
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

let uidCounter = 0;
export function nextItemUid() {
  return `bi-${++uidCounter}-${Date.now()}`;
}

interface Props {
  services: ServiceWithDurations[];
  therapists: { id: string; name: string; is_available: boolean | null }[];
  resources: { id: string; name: string; type: string; is_active: boolean | null }[];
  clients: { id: string; name: string; phone: string | null }[];
  conflicts: string[];
  showStatus?: boolean;
  onCancelStatusIntercept?: () => void;
}

export default function BookingFormFields({
  services, therapists, resources, clients,
  conflicts, showStatus = false, onCancelStatusIntercept,
}: Props) {
  const form = useFormContext<BookingFormValues>();
  const { control, setValue, watch } = form;

  const items = useWatch({ control, name: "items" });
  const startTime = useWatch({ control, name: "startTime" });
  const therapistId = useWatch({ control, name: "therapistId" });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const activeServices = useMemo(() => services.filter((s) => s.is_active), [services]);
  const activeTherapists = useMemo(() => therapists.filter((t) => t.is_available), [therapists]);
  const activeResources = useMemo(() => resources.filter((r) => r.is_active), [resources]);

  const getDuration = (serviceId: string, durationId: string) => {
    const svc = activeServices.find((s) => s.id === serviceId);
    return svc?.service_durations.find((d) => d.id === durationId);
  };

  /* Recompute totals + sync hidden fields used by the schema's superRefine */
  const { totalMinutes, totalCOP, totalUSD, requiresTwoTherapists } = useMemo(() => {
    let mins = 0, cop = 0, usd = 0, needsTwo = false;
    for (const item of items ?? []) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, activeServices]);

  useEffect(() => {
    setValue("totalMinutes", totalMinutes, { shouldValidate: false });
    setValue("requiresTwoTherapists", requiresTwoTherapists, { shouldValidate: false });
    // Re-validate cross-field dependencies when cart changes
    if (form.formState.isSubmitted || form.formState.touchedFields.secondTherapistId) {
      form.trigger(["secondTherapistId", "startTime", "items"]);
    }
  }, [totalMinutes, requiresTwoTherapists, setValue, form]);

  /* Suggested addons */
  const suggestedAddons = useMemo(() => {
    const cartIds = new Set((items ?? []).map((i) => i.serviceId));
    const hasMain = (items ?? []).some((i) => {
      const svc = activeServices.find((s) => s.id === i.serviceId);
      return svc && !svc.is_addon;
    });
    if (!hasMain) return [];
    return activeServices
      .filter((s) => s.is_addon && !cartIds.has(s.id) && s.service_durations.length > 0)
      .slice(0, 4);
  }, [items, activeServices]);

  const addItem = () =>
    append({ uid: nextItemUid(), serviceId: "", durationId: "", quantity: 1 });

  const addAddon = (svc: ServiceWithDurations) =>
    append({
      uid: nextItemUid(),
      serviceId: svc.id,
      durationId: svc.service_durations[0]?.id ?? "",
      quantity: 1,
    });

  const dateValue = watch("date");

  return (
    <div className="space-y-5">
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

      {/* Status (edit mode only) */}
      {showStatus && (
        <FormField
          control={control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estado</FormLabel>
              <Select
                value={field.value}
                onValueChange={(v) => {
                  if (v === "cancelada" && field.value !== "cancelada" && onCancelStatusIntercept) {
                    onCancelStatusIntercept();
                    return;
                  }
                  field.onChange(v);
                }}
              >
                <FormControl>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Client */}
      <FormField
        control={control}
        name="clientId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Cliente <span className="text-destructive">*</span>
            </FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger><SelectValue placeholder="Seleccionar cliente..." /></SelectTrigger>
              </FormControl>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}{c.phone ? ` — ${c.phone}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Nationality + Language */}
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={control}
          name="nationality"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-primary" /> País / Nacionalidad
              </FormLabel>
              <FormControl>
                <Input placeholder="Colombia, USA..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="language"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <Languages className="h-3.5 w-3.5 text-primary" /> Idioma Preferido
              </FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="en">🇺🇸 English</SelectItem>
                  <SelectItem value="es">🇪🇸 Español</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* CART */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <FormLabel className="flex items-center gap-2 text-base font-semibold">
            <ShoppingCart className="h-4 w-4 text-primary" />
            Servicios <span className="text-destructive">*</span>
          </FormLabel>
          <Badge variant="secondary" className="text-xs">{fields.length} servicio(s)</Badge>
        </div>

        <FormField
          control={control}
          name="items"
          render={() => <FormMessage />}
        />

        <div className="space-y-2">
          {fields.map((field, index) => {
            const item = items?.[index];
            const svc = item ? activeServices.find((s) => s.id === item.serviceId) : null;
            const dur = svc && item ? svc.service_durations.find((d) => d.id === item.durationId) : null;

            return (
              <Card key={field.id} className="border-border/60 bg-muted/20">
                <CardContent className="p-3 space-y-2">
                  <div className="flex gap-2">
                    <FormField
                      control={control}
                      name={`items.${index}.serviceId`}
                      render={({ field: f }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="text-xs font-medium text-muted-foreground">Servicio</FormLabel>
                          <Select
                            value={f.value}
                            onValueChange={(v) => {
                              f.onChange(v);
                              setValue(`items.${index}.durationId`, "", { shouldValidate: false });
                            }}
                          >
                            <FormControl>
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="Seleccionar servicio..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {activeServices.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.is_addon && "⭐ "}{s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-7 h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => remove(index)}
                      aria-label="Quitar servicio"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {svc && svc.service_durations.length > 0 && (
                    <div className="grid grid-cols-[1fr_80px] gap-2">
                      <FormField
                        control={control}
                        name={`items.${index}.durationId`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium text-muted-foreground">
                              Duración / Tarifa
                            </FormLabel>
                            <Select value={f.value} onValueChange={f.onChange}>
                              <FormControl>
                                <SelectTrigger className="h-9 text-sm">
                                  <SelectValue placeholder="Tarifa..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {svc.service_durations.map((d) => (
                                  <SelectItem key={d.id} value={d.id}>
                                    {d.duration_minutes} min — {formatCOP(d.price_cop)} | ${d.price_usd}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name={`items.${index}.quantity`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium text-muted-foreground">Cant.</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                max={10}
                                value={f.value}
                                onChange={(e) => f.onChange(Math.max(1, Number(e.target.value) || 1))}
                                className="h-9 text-sm text-center"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {dur && (
                    <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t border-border/30">
                      <span>{dur.duration_minutes * (item?.quantity ?? 1)} min</span>
                      <span className="font-medium text-foreground">
                        {formatCOP(dur.price_cop * (item?.quantity ?? 1))} | ${dur.price_usd * (item?.quantity ?? 1)} USD
                      </span>
                    </div>
                  )}

                  {svc?.requires_two_therapists && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Requiere dos terapeutas
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed border-2 border-primary/30 text-primary hover:bg-primary/5 gap-2 h-11"
          onClick={addItem}
        >
          <Plus className="h-4 w-4" /> Agregar servicio
        </Button>

        {suggestedAddons.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-accent" /> Sugerencias de add-ons
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedAddons.map((svc) => (
                <Button
                  key={svc.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 gap-1 border-accent/40 hover:bg-accent/10"
                  onClick={() => addAddon(svc)}
                >
                  <Plus className="h-3 w-3" />
                  {svc.name}
                  {svc.service_durations[0] ? ` — ${formatCOP(svc.service_durations[0].price_cop)}` : ""}
                </Button>
              ))}
            </div>
          </div>
        )}

        {fields.length > 0 && (
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
                <div className="flex items-center gap-1.5 text-xs text-amber-700 mt-2 justify-center">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Esta reserva requiere al menos dos terapeutas
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Date + Time */}
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={control}
          name="date"
          render={({ field }) => {
            const selectedDate = field.value ? new Date(field.value + "T00:00:00") : undefined;
            return (
              <FormItem className="flex flex-col">
                <FormLabel>
                  Fecha <span className="text-destructive">*</span>
                </FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "h-10 justify-start text-left font-normal",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
                        {selectedDate
                          ? format(selectedDate, "PPP", { locale: es })
                          : "Seleccionar fecha"}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(d) => {
                        if (!d) return;
                        const yy = d.getFullYear();
                        const mm = String(d.getMonth() + 1).padStart(2, "0");
                        const dd = String(d.getDate()).padStart(2, "0");
                        field.onChange(`${yy}-${mm}-${dd}`);
                      }}
                      disabled={(d) => {
                        const t = new Date();
                        t.setHours(0, 0, 0, 0);
                        return d < t;
                      }}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <FormField
          control={control}
          name="startTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Hora Inicio <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="time"
                  min={SPA_OPEN_TIME}
                  max={SPA_CLOSE_TIME}
                  step={300}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {totalMinutes > 0 && startTime && (
        <div className="text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-md flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          Bloque de <span className="font-semibold">{formatDuration(totalMinutes)}</span> — termina a las{" "}
          {calculateEndTime(startTime, totalMinutes) || "—"}
        </div>
      )}

      {/* Therapist + Resource */}
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={control}
          name="therapistId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Terapeuta <span className="text-destructive">*</span>
              </FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {activeTherapists.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="resourceId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Recurso / Sala <span className="text-destructive">*</span>
              </FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {activeResources.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name} ({r.type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {requiresTwoTherapists && (
        <FormField
          control={control}
          name="secondTherapistId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                Segundo Terapeuta <span className="text-destructive">*</span>
              </FormLabel>
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Seleccionar segundo terapeuta..." /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {activeTherapists
                    .filter((t) => t.id !== therapistId)
                    .map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Source */}
      <FormField
        control={control}
        name="source"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Fuente</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger><SelectValue /></SelectTrigger>
              </FormControl>
              <SelectContent>
                {sources.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Notes */}
      <FormField
        control={control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notas</FormLabel>
            <FormControl>
              <Textarea rows={2} placeholder="Notas adicionales..." {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

/* Hook used by both create + edit dialogs to compute price totals from items
   without touching the schema. Lives here so both dialogs share it. */
export function useCartTotals(
  items: BookingFormValues["items"] | undefined,
  services: ServiceWithDurations[],
) {
  return useMemo(() => {
    let mins = 0, cop = 0, usd = 0;
    for (const item of items ?? []) {
      const svc = services.find((s) => s.id === item.serviceId);
      const dur = svc?.service_durations.find((d) => d.id === item.durationId);
      if (dur) {
        mins += dur.duration_minutes * item.quantity;
        cop += dur.price_cop * item.quantity;
        usd += dur.price_usd * item.quantity;
      }
    }
    return { totalMinutes: mins, totalCOP: cop, totalUSD: usd };
  }, [items, services]);
}
