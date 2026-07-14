CREATE INDEX IF NOT EXISTS idx_bookings_therapist_start ON public.bookings(therapist_id, start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_resource_start ON public.bookings(resource_id, start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON public.bookings(start_time);