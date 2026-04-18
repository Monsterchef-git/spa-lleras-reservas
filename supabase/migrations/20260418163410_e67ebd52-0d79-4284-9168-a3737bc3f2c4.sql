ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS last_notification_sent jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.bookings.last_notification_sent IS 'Tracks notification timestamps per type: { confirmation: timestamp, reminder_24h: timestamp, cancellation: timestamp, update: timestamp }';

CREATE INDEX IF NOT EXISTS idx_bookings_date_status 
ON public.bookings (booking_date, status) 
WHERE status IN ('pendiente', 'confirmada');