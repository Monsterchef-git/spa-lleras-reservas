// Lightweight client-side helper to fire-and-forget booking notifications.
// Never throws — if the email cannot be sent, we just log it. The booking
// flow itself is unaffected.

import { supabase } from "@/integrations/supabase/client";

export type BookingEmailKind =
  | "confirmation"
  | "update"
  | "reminder_24h"
  | "cancellation";

export async function notifyBookingEmail(
  bookingId: string,
  kind: BookingEmailKind,
): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke("send-booking-email", {
      body: { bookingId, kind },
    });
    if (error) {
      console.warn(`[notifyBookingEmail] ${kind} for ${bookingId}:`, error.message);
    }
  } catch (err) {
    console.warn(`[notifyBookingEmail] ${kind} for ${bookingId} threw:`, err);
  }
}
