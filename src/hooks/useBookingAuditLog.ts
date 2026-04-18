import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "STATUS_CHANGE" | "CANCEL" | "ITEMS_CHANGE";

export interface AuditLogEntry {
  id: string;
  booking_id: string | null;
  user_id: string | null;
  action: AuditAction;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  reason: string | null;
  changed_at: string;
}

export function useBookingAuditLog(bookingId: string | null | undefined) {
  return useQuery({
    queryKey: ["booking_audit_log", bookingId],
    enabled: !!bookingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_audit_log" as any)
        .select("*")
        .eq("booking_id", bookingId!)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AuditLogEntry[];
    },
  });
}
