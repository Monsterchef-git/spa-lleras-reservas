import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useServices } from "@/hooks/useServices";
import { useTherapists } from "@/hooks/useTherapists";
import { useResources } from "@/hooks/useResources";
import { useClients } from "@/hooks/useClients";
import { useCreateBooking, useCheckAvailability } from "@/hooks/useBookings";
import { BookingSchema, calculateEndTime, type BookingFormValues } from "@/lib/schemas";
import BookingFormFields, { nextItemUid, useCartTotals } from "@/components/BookingFormFields";

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
      toast({ title: "Error al crear reserva", description: err.message, variant: "destructive" });
    }
  };

  const submitting = form.formState.isSubmitting || createBooking.isPending;
  const hasErrors = Object.keys(form.formState.errors).length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="spa" className="gap-2">
            <Plus className="h-4 w-4" /> Nueva Reserva
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Nueva Reserva</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-2">
            <BookingFormFields
              services={services ?? []}
              therapists={therapists ?? []}
              resources={resources ?? []}
              clients={clients ?? []}
              conflicts={conflicts}
            />

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
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
