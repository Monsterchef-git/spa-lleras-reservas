
ALTER TABLE public.bookings
  ADD COLUMN nationality text,
  ADD COLUMN preferred_language text DEFAULT 'en';
