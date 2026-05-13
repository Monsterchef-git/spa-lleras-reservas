import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type TherapistSchedule = Tables<"therapist_schedules">;
export type ScheduleException = Tables<"therapist_schedule_exceptions">;

export function useTherapistSchedules(therapistId?: string) {
  return useQuery({
    queryKey: ["therapist_schedules", therapistId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("therapist_schedules").select("*").order("day_of_week");
      if (therapistId) q = q.eq("therapist_id", therapistId);
      const { data, error } = await q;
      if (error) throw error;
      return data as TherapistSchedule[];
    },
  });
}

export function useScheduleExceptions(therapistId?: string) {
  return useQuery({
    queryKey: ["therapist_schedule_exceptions", therapistId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("therapist_schedule_exceptions")
        .select("*")
        .order("exception_date", { ascending: true });
      if (therapistId) q = q.eq("therapist_id", therapistId);
      const { data, error } = await q;
      if (error) throw error;
      return data as ScheduleException[];
    },
  });
}

export function useUpsertSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"therapist_schedules">) => {
      const { error } = await supabase
        .from("therapist_schedules")
        .upsert(input, { onConflict: "therapist_id,day_of_week" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["therapist_schedules"] }),
  });
}

export function useUpsertException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"therapist_schedule_exceptions">) => {
      const { error } = await supabase
        .from("therapist_schedule_exceptions")
        .upsert(input, { onConflict: "therapist_id,exception_date" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["therapist_schedule_exceptions"] }),
  });
}

export function useDeleteException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("therapist_schedule_exceptions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["therapist_schedule_exceptions"] }),
  });
}
