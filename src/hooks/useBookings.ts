import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Booking = Tables<"bookings"> & {
  clients: { name: string; phone: string | null } | null;
  services: { name: string } | null;
  therapist: { name: string } | null;
  second_therapist: { name: string } | null;
  resources: { name: string } | null;
  booking_items: (Tables<"booking_items"> & {
    services: { name: string } | null;
    service_durations: { duration_minutes: number; price_cop: number; price_usd: number } | null;
  })[];
};

export function useBookings() {
  const qc = useQueryClient();

  // Realtime subscription: invalidate query on any change to bookings or booking_items
  useEffect(() => {
    const channel = supabase
      .channel("bookings-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        qc.invalidateQueries({ queryKey: ["bookings"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "booking_items" }, () => {
        qc.invalidateQueries({ queryKey: ["bookings"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          clients(name, phone),
          services(name),
          therapist:therapists!bookings_therapist_id_fkey(name),
          second_therapist:therapists!bookings_second_therapist_id_fkey(name),
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

export function useUpdateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      booking: Partial<TablesInsert<"bookings">>;
      items: Omit<TablesInsert<"booking_items">, "booking_id">[];
    }) => {
      const { error: bErr } = await supabase
        .from("bookings")
        .update(input.booking)
        .eq("id", input.id);
      if (bErr) throw bErr;
      // Replace items
      const { error: delErr } = await supabase
        .from("booking_items")
        .delete()
        .eq("booking_id", input.id);
      if (delErr) throw delErr;
      if (input.items.length > 0) {
        const rows = input.items.map((item) => ({ ...item, booking_id: input.id }));
        const { error: iErr } = await supabase.from("booking_items").insert(rows);
        if (iErr) throw iErr;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

export function useCheckAvailability() {
  return async (input: {
    date: string;
    startTime: string;
    endTime: string;
    therapistId?: string | null;
    secondTherapistId?: string | null;
    resourceId?: string | null;
    excludeBookingId?: string;
  }): Promise<string[]> => {
    const conflicts: string[] = [];
    if (!input.date || !input.startTime || !input.endTime) return conflicts;

    let query = supabase
      .from("bookings")
      .select("id, start_time, end_time, therapist_id, second_therapist_id, resource_id, therapist:therapists!bookings_therapist_id_fkey(name), resources(name)")
      .eq("booking_date", input.date)
      .in("status", ["pendiente", "confirmada"]);

    if (input.excludeBookingId) {
      query = query.neq("id", input.excludeBookingId);
    }

    const { data: existing } = await query;
    if (!existing) return conflicts;

    for (const b of existing) {
      const overlapTime = b.start_time < input.endTime && b.end_time > input.startTime;
      if (!overlapTime) continue;

      if (input.therapistId && (b.therapist_id === input.therapistId || b.second_therapist_id === input.therapistId)) {
        const name = (b as any).therapist?.name ?? "Terapeuta";
        conflicts.push(`${name} ya tiene una reserva de ${b.start_time.slice(0,5)} a ${b.end_time.slice(0,5)}`);
      }
      if (input.secondTherapistId && (b.therapist_id === input.secondTherapistId || b.second_therapist_id === input.secondTherapistId)) {
        conflicts.push(`El segundo terapeuta ya tiene una reserva de ${b.start_time.slice(0,5)} a ${b.end_time.slice(0,5)}`);
      }
      if (input.resourceId && b.resource_id === input.resourceId) {
        const name = (b as any).resources?.name ?? "Recurso";
        conflicts.push(`${name} está ocupado de ${b.start_time.slice(0,5)} a ${b.end_time.slice(0,5)}`);
      }
    }
    return conflicts;
  };
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
