import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Service = Tables<"services">;
export type ServiceDuration = Tables<"service_durations">;
export type ServiceWithDurations = Service & { service_durations: ServiceDuration[] };

export function useServices() {
  return useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*, service_durations(*)")
        .order("category")
        .order("name");
      if (error) throw error;
      return data as ServiceWithDurations[];
    },
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      service: TablesInsert<"services">;
      durations: Omit<TablesInsert<"service_durations">, "service_id">[];
    }) => {
      const { data: svc, error: sErr } = await supabase
        .from("services")
        .insert(input.service)
        .select()
        .single();
      if (sErr) throw sErr;
      if (input.durations.length > 0) {
        const rows = input.durations.map((d) => ({ ...d, service_id: svc.id }));
        const { error: dErr } = await supabase.from("service_durations").insert(rows);
        if (dErr) throw dErr;
      }
      return svc;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      service: TablesUpdate<"services">;
      durations: Omit<TablesInsert<"service_durations">, "service_id">[];
    }) => {
      const { error: sErr } = await supabase
        .from("services")
        .update(input.service)
        .eq("id", input.id);
      if (sErr) throw sErr;
      // Replace durations: delete old, insert new
      const { error: delErr } = await supabase
        .from("service_durations")
        .delete()
        .eq("service_id", input.id);
      if (delErr) throw delErr;
      if (input.durations.length > 0) {
        const rows = input.durations.map((d) => ({ ...d, service_id: input.id }));
        const { error: dErr } = await supabase.from("service_durations").insert(rows);
        if (dErr) throw dErr;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
  });
}
