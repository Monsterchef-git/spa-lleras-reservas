import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History, ChevronLeft, ChevronRight, User, ShoppingCart, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { useServices } from "@/hooks/useServices";
import { useTherapists } from "@/hooks/useTherapists";
import { useResources } from "@/hooks/useResources";
import { useClients } from "@/hooks/useClients";
import { useUpdateBooking, useCheckAvailability, type Booking } from "@/hooks/useBookings";
import { BookingSchema, calculateEndTime, type BookingFormValues } from "@/lib/schemas";
import BookingFormFields, { nextItemUid, useCartTotals } from "@/components/BookingFormFields";
import BookingHistoryTab from "@/components/BookingHistoryTab";
import CancelBookingDialog from "@/components/CancelBookingDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { applyBookingError } from "@/lib/bookingErrors";
import QuickClientDialog from "@/components/QuickClientDialog";

interface Props {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const empty: BookingFormValues = {
  clientId: "",
  nationality: "",
  language: "en",
  date: "",
  startTime: "",
  therapistId: "",
  secondTherapistId: "",
  resourceId: "",
  source: "web",
  status: "pendiente",
  notes: "",
  items: [],
  totalMinutes: 0,
  requiresTwoTherapists: false,
};

function bookingToValues(b: Booking): BookingFormValues {
  const items = b.booking_items && b.booking_items.length > 0
    ? b.booking_items.map((bi) => ({
        uid: nextItemUid(),
        serviceId: bi.service_id,
        durationId: bi.service_duration_id ?? "",
        quantity: bi.quantity,
      }))
    : b.service_id
      ? [{ uid: nextItemUid(), serviceId: b.service_id, durationId: b.service_duration_id ?? "", quantity: 1 }]
      : [];

  return {
    clientId: b.client_id ?? "",
    nationality: b.nationality ?? "",
    language: (b.preferred_language as "en" | "es") ?? "en",
    date: b.booking_date,
    startTime: b.start_time?.slice(0, 5) ?? "",
    therapistId: b.therapist_id ?? "",
    secondTherapistId: b.second_therapist_id ?? "",
    resourceId: b.resource_id ?? "",
    source: (b.source ?? "web") as BookingFormValues["source"],
    status: (b.status ?? "pendiente") as BookingFormValues["status"],
    notes: b.notes ?? "",
    items,
    totalMinutes: 0,
    requiresTwoTherapists: false,
  };
}

export default function BookingEditDialog({ booking, open, onOpenChange }: Props) {
  const { data: services } = useServices();
  const { data: therapists } = useTherapists();
  const { data: resources } = useResources();
  const { data: clients } = useClients();
  const updateBooking = useUpdateBooking();
  const checkAvailability = useCheckAvailability();
  const isMobile = useIsMobile();
  const [step, setStep] = useState<0 | 1 | 2>(0);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(BookingSchema),
    defaultValues: empty,
    mode: "onChange",
  });

  const items = useWatch({ control: form.control, name: "items" });
  const date = useWatch({ control: form.control, name: "date" });
  const startTime = useWatch({ control: form.control, name: "startTime" });
  const therapistId = useWatch({ control: form.control, name: "therapistId" });
  const secondTherapistId = useWatch({ control: form.control, name: "secondTherapistId" });
  const resourceId = useWatch({ control: form.control, name: "resourceId" });

  const totals = useCartTotals(items, services ?? []);

  const [conflicts, setConflicts] = useState<string[]>([]);
  const [pendingCancel, setPendingCancel] = useState(false);
  const [quickClientOpen, setQuickClientOpen] = useState(false);

  /* Hydrate when booking changes */
  useEffect(() => {
    if (!booking) return;
    form.reset(bookingToValues(booking));
    setConflicts([]);
    setStep(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking?.id]);

  /* Availability check, excluding the current booking */
  useEffect(() => {
    if (!booking || !date || !startTime || totals.totalMinutes === 0) {
      setConflicts([]);
      return;
    }
    const endTime = calculateEndTime(startTime, totals.totalMinutes);
    if (!endTime) return;
    checkAvailability({
      date, startTime, endTime,
      therapistId: therapistId || null,
      secondTherapistId: secondTherapistId || null,
      resourceId: resourceId || null,
      excludeBookingId: booking.id,
    }).then(setConflicts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, startTime, totals.totalMinutes, therapistId, secondTherapistId, resourceId, booking?.id]);

  const onSubmit = async (values: BookingFormValues) => {
    if (!booking) return;
    if (conflicts.length > 0) {
      toast.error("Resuelve los conflictos de horario antes de guardar.");
      return;
    }
    const endTime = calculateEndTime(values.startTime, totals.totalMinutes);
    try {
      await updateBooking.mutateAsync({
        id: booking.id,
        booking: {
          client_id: values.clientId,
          booking_date: values.date,
          start_time: values.startTime,
          end_time: endTime || values.startTime,
          therapist_id: values.therapistId,
          second_therapist_id: values.secondTherapistId || null,
          resource_id: values.resourceId,
          price_cop: totals.totalCOP,
          price_usd: totals.totalUSD,
          nationality: values.nationality || null,
          preferred_language: values.language,
          source: values.source as any,
          status: values.status as any,
          notes: values.notes || null,
          service_id: values.items.length === 1 ? values.items[0].serviceId : null,
          service_duration_id: values.items.length === 1 ? values.items[0].durationId : null,
        },
        items: values.items.map((item) => {
          const svc = (services ?? []).find((s) => s.id === item.serviceId);
          const dur = svc?.service_durations.find((d) => d.id === item.durationId);
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
      const mapped = applyBookingError(err, form.setError);
      toast.error(mapped.field ? "Conflicto al guardar" : "Error al actualizar", {
        description: mapped.message,
      });
      if (isMobile && mapped.field) {
        const stepIdx = STEP_FIELDS_LOCAL.findIndex((fs) =>
          (fs as string[]).includes(mapped.field as string),
        );
        if (stepIdx >= 0) setStep(stepIdx as 0 | 1 | 2);
      }
    }
  };

  const submitting = form.formState.isSubmitting || updateBooking.isPending;
  const hasErrors = Object.keys(form.formState.errors).length > 0;

  const STEP_FIELDS_LOCAL: Array<Array<keyof BookingFormValues>> = [
    ["clientId", "language"],
    ["items"],
    ["date", "startTime", "therapistId", "secondTherapistId", "resourceId"],
  ];
  const goNext = async () => {
    const ok = await form.trigger(STEP_FIELDS_LOCAL[step]);
    if (ok && step < 2) setStep((s) => (s + 1) as 0 | 1 | 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
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
            {isMobile && <EditWizardProgress step={step} />}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-2">
                <BookingFormFields
                  services={services ?? []}
                  therapists={therapists ?? []}
                  resources={resources ?? []}
                  clients={clients ?? []}
                  conflicts={conflicts}
                  showStatus
                  onCancelStatusIntercept={() => setPendingCancel(true)}
                  onCreateNewClient={() => setQuickClientOpen(true)}
                  mobileStep={isMobile ? step : undefined}
                />

                {isMobile ? (
                  <div className="flex gap-2 pt-2 sticky bottom-0 bg-background/95 backdrop-blur py-2 -mx-4 px-4 border-t">
                    {step > 0 ? (
                      <Button type="button" variant="outline" className="flex-1 gap-1" onClick={() => setStep((s) => (s - 1) as 0 | 1 | 2)}>
                        <ChevronLeft className="h-4 w-4" /> Anterior
                      </Button>
                    ) : (
                      <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                        Cancelar
                      </Button>
                    )}
                    {step < 2 ? (
                      <Button type="button" variant="spa" className="flex-1 gap-1" onClick={goNext}>
                        Siguiente <ChevronRight className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button type="submit" variant="spa" className="flex-1" disabled={submitting || conflicts.length > 0 || hasErrors}>
                        {submitting ? "Guardando..." : conflicts.length > 0 ? "Conflictos" : hasErrors ? "Revisa campos" : "Guardar"}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      variant="spa"
                      className="flex-1"
                      disabled={submitting || conflicts.length > 0 || hasErrors}
                    >
                      {submitting
                        ? "Guardando..."
                        : conflicts.length > 0
                          ? "Conflictos pendientes"
                          : hasErrors
                            ? "Revisa los campos"
                            : "Guardar Cambios"}
                    </Button>
                  </div>
                )}
              </form>
            </Form>
          </TabsContent>
        </Tabs>

        <CancelBookingDialog
          open={pendingCancel}
          onOpenChange={setPendingCancel}
          onConfirm={async (reason) => {
            if (!booking) return;
            try {
              await updateBooking.mutateAsync({
                id: booking.id,
                booking: { status: "cancelada" as any },
                items: (booking.booking_items ?? []).map((bi) => ({
                  service_id: bi.service_id,
                  service_duration_id: bi.service_duration_id,
                  quantity: bi.quantity,
                  price_cop: bi.price_cop,
                  price_usd: bi.price_usd,
                })),
              });
              form.setValue("status", "cancelada");
              toast.success(reason ? `Reserva cancelada — ${reason}` : "Reserva cancelada");
              onOpenChange(false);
            } catch (err: any) {
              toast.error(err.message);
            }
          }}
        />

        <QuickClientDialog
          open={quickClientOpen}
          onOpenChange={setQuickClientOpen}
          onCreated={(c) => {
            form.setValue("clientId", c.id, { shouldValidate: true });
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function EditWizardProgress({ step }: { step: 0 | 1 | 2 }) {
  const steps = [
    { label: "Cliente", icon: User },
    { label: "Servicios", icon: ShoppingCart },
    { label: "Horario", icon: CalendarClock },
  ];
  return (
    <div className="flex items-center gap-2 px-1 pt-3" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={3}>
      {steps.map((s, i) => {
        const Icon = s.icon;
        const active = i === step;
        const done = i < step;
        return (
          <div key={s.label} className="flex-1 flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors",
              active && "bg-primary text-primary-foreground",
              done && "bg-primary/15 text-primary",
              !active && !done && "bg-muted text-muted-foreground",
            )}>
              <Icon className="h-3.5 w-3.5" />
              <span>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn("flex-1 h-0.5 rounded-full", done ? "bg-primary" : "bg-muted")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
