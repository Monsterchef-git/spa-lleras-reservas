-- Enable realtime for bookings tables
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
ALTER TABLE public.booking_items REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_items;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;