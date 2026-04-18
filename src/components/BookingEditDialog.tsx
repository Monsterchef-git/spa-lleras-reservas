import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History } from "lucide-react";
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

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(BookingSchema),
    defaultValues: empty,
    mode: "onTouched",
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

  /* Hydrate when booking changes */
  useEffect(() => {
    if (!booking) return;
    form.reset(bookingToValues(booking));
    setConflicts([]);
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
      toast.error(err.message);
    }
  };

  const submitting = form.formState.isSubmitting || updateBooking.isPending;

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
                />

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="spa"
                    className="flex-1"
                    disabled={submitting || conflicts.length > 0}
                  >
                    {submitting
                      ? "Guardando..."
                      : conflicts.length > 0
                        ? "Conflictos pendientes"
                        : "Guardar Cambios"}
                  </Button>
                </div>
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
      </DialogContent>
    </Dialog>
  );
}
