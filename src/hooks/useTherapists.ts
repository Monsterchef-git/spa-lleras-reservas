import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Therapist = Tables<"therapists">;

export function useTherapists() {
  return useQuery({
    queryKey: ["therapists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("therapists")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTherapist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"therapists">) => {
      const { data, error } = await supabase.from("therapists").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["therapists"] }),
  });
}

export function useUpdateTherapist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; data: TablesUpdate<"therapists"> }) => {
      const { error } = await supabase.from("therapists").update(input.data).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["therapists"] }),
  });
}

export function useDeleteTherapist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("therapists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["therapists"] }),
  });
}
