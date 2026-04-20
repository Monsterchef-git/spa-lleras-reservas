import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Plus, ChevronLeft, ChevronRight, User, ShoppingCart, CalendarClock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useServices } from "@/hooks/useServices";
import { useTherapists } from "@/hooks/useTherapists";
import { useResources } from "@/hooks/useResources";
import { useClients } from "@/hooks/useClients";
import { useCreateBooking, useCheckAvailability } from "@/hooks/useBookings";
import { BookingSchema, calculateEndTime, type BookingFormValues } from "@/lib/schemas";
import BookingFormFields, { nextItemUid, useCartTotals } from "@/components/BookingFormFields";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { applyBookingError } from "@/lib/bookingErrors";

interface Props {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  initialDate?: string;
  initialStartTime?: string;
  hideTrigger?: boolean;
}

const defaults: BookingFormValues = {
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

export default function BookingFormDialog({
  open: controlledOpen,
  onOpenChange,
  initialDate,
  initialStartTime,
  hideTrigger = false,
}: Props = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (!isControlled) setInternalOpen(v);
    onOpenChange?.(v);
  };
  const isMobile = useIsMobile();
  const [step, setStep] = useState<0 | 1 | 2>(0);

  const { toast } = useToast();
  const { data: services } = useServices();
  const { data: therapists } = useTherapists();
  const { data: resources } = useResources();
  const { data: clients } = useClients();
  const createBooking = useCreateBooking();
  const checkAvailability = useCheckAvailability();

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(BookingSchema),
    defaultValues: defaults,
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

  /* Apply preselected date/time when opened externally */
  useEffect(() => {
    if (!open) return;
    form.reset({
      ...defaults,
      date: initialDate ?? "",
      startTime: initialStartTime ?? "",
    });
    setConflicts([]);
    setStep(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* Realtime availability check */
  useEffect(() => {
    if (!date || !startTime || totals.totalMinutes === 0) {
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
    }).then(setConflicts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, startTime, totals.totalMinutes, therapistId, secondTherapistId, resourceId]);

  const onSubmit = async (values: BookingFormValues) => {
    if (conflicts.length > 0) {
      toast({
        title: "Conflictos de horario",
        description: "Resuelve los conflictos antes de guardar.",
        variant: "destructive",
      });
      return;
    }
    const endTime = calculateEndTime(values.startTime, totals.totalMinutes);
    try {
      await createBooking.mutateAsync({
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
      toast({
        title: "Reserva creada",
        description: `${values.items.length} servicio(s) — ${new Intl.NumberFormat("es-CO", {
          style: "currency", currency: "COP", minimumFractionDigits: 0,
        }).format(totals.totalCOP)}`,
      });
      setOpen(false);
    } catch (err: any) {
      const mapped = applyBookingError(err, form.setError);
      toast({
        title: mapped.field ? "Conflicto al guardar" : "Error al crear reserva",
        description: mapped.message,
        variant: "destructive",
      });
      // If error maps to step 2 fields, jump to that step on mobile.
      if (isMobile && mapped.field) {
        const stepIdx = STEP_FIELDS_LOCAL.findIndex((fs) =>
          (fs as string[]).includes(mapped.field as string),
        );
        if (stepIdx >= 0) setStep(stepIdx as 0 | 1 | 2);
      }
    }
  };

  const submitting = form.formState.isSubmitting || createBooking.isPending;
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
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="spa" className="gap-2">
            <Plus className="h-4 w-4" /> Nueva Reserva
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Nueva Reserva</DialogTitle>
        </DialogHeader>

        {isMobile && (
          <WizardProgress step={step} />
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-2">
            <BookingFormFields
              services={services ?? []}
              therapists={therapists ?? []}
              resources={resources ?? []}
              clients={clients ?? []}
              conflicts={conflicts}
              mobileStep={isMobile ? step : undefined}
            />

            {isMobile ? (
              <div className="flex gap-2 pt-2 sticky bottom-0 bg-background/95 backdrop-blur py-2 -mx-4 px-4 border-t">
                {step > 0 ? (
                  <Button type="button" variant="outline" className="flex-1 gap-1" onClick={() => setStep((s) => (s - 1) as 0 | 1 | 2)}>
                    <ChevronLeft className="h-4 w-4" /> Anterior
                  </Button>
                ) : (
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                )}
                {step < 2 ? (
                  <Button type="button" variant="spa" className="flex-1 gap-1" onClick={goNext}>
                    Siguiente <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="spa"
                    className="flex-1"
                    disabled={submitting || conflicts.length > 0 || hasErrors}
                  >
                    {submitting ? "Creando..." : conflicts.length > 0 ? "Conflictos" : hasErrors ? "Revisa campos" : "Crear Reserva"}
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="spa"
                  className="flex-1"
                  disabled={submitting || conflicts.length > 0 || hasErrors}
                >
                  {submitting
                    ? "Creando..."
                    : conflicts.length > 0
                      ? "Conflictos pendientes"
                      : hasErrors
                        ? "Revisa los campos"
                        : "Crear Reserva"}
                </Button>
              </div>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function WizardProgress({ step }: { step: 0 | 1 | 2 }) {
  const steps = [
    { label: "Cliente", icon: User },
    { label: "Servicios", icon: ShoppingCart },
    { label: "Horario", icon: CalendarClock },
  ];
  return (
    <div className="flex items-center gap-2 px-1 pt-2" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={3}>
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
              <span className="hidden xs:inline">{s.label}</span>
              <span className="xs:hidden">{i + 1}</span>
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
