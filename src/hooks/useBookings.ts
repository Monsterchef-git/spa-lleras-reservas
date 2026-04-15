import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Booking = Tables<"bookings"> & {
  clients: { name: string; phone: string | null } | null;
  services: { name: string } | null;
  therapists: { name: string } | null;
  resources: { name: string } | null;
  booking_items: (Tables<"booking_items"> & {
    services: { name: string } | null;
    service_durations: { duration_minutes: number; price_cop: number; price_usd: number } | null;
  })[];
};

export function useBookings() {
  return useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          clients(name, phone),
          services(name),
          therapists(name),
          resources(name),
          booking_items(*, services(name), service_durations(duration_minutes, price_cop, price_usd))
        `)
        .order("booking_date", { ascending: false })
        .order("start_time", { ascending: false });
      if (error) throw error;
      return data as Booking[];
    },
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      booking: TablesInsert<"bookings">;
      items: Omit<TablesInsert<"booking_items">, "booking_id">[];
    }) => {
      const { data: booking, error: bErr } = await supabase
        .from("bookings")
        .insert(input.booking)
        .select()
        .single();
      if (bErr) throw bErr;
      if (input.items.length > 0) {
        const rows = input.items.map((item) => ({ ...item, booking_id: booking.id }));
        const { error: iErr } = await supabase.from("booking_items").insert(rows);
        if (iErr) throw iErr;
      }
      return booking;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

export function useUpdateBookingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: "pendiente" | "confirmada" | "cancelada" | "completada" }) => {
      const { error } = await supabase.from("bookings").update({ status: input.status }).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

export function useDeleteBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
}
