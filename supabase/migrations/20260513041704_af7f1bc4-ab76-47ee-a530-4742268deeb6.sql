
-- Add 'fresha' to booking_source enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'fresha' AND enumtypid = 'public.booking_source'::regtype) THEN
    ALTER TYPE public.booking_source ADD VALUE 'fresha';
  END IF;
END $$;

-- Add 'pendiente_revision' to booking_status enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pendiente_revision' AND enumtypid = 'public.booking_status'::regtype) THEN
    ALTER TYPE public.booking_status ADD VALUE 'pendiente_revision';
  END IF;
END $$;

-- Add external event tracking to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS external_event_id text,
  ADD COLUMN IF NOT EXISTS external_source_data jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_external_event_id_unique
  ON public.bookings(external_event_id)
  WHERE external_event_id IS NOT NULL;

-- Sync config singleton table
CREATE TABLE IF NOT EXISTS public.google_calendar_sync_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id text,
  last_sync_at timestamptz,
  last_sync_status text,
  last_sync_message text,
  last_sync_count integer DEFAULT 0,
  auto_sync_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.google_calendar_sync_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view sync config" ON public.google_calendar_sync_config;
CREATE POLICY "Authenticated can view sync config"
  ON public.google_calendar_sync_config
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin or administrativa can manage sync config" ON public.google_calendar_sync_config;
CREATE POLICY "Admin or administrativa can manage sync config"
  ON public.google_calendar_sync_config
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'administrativa'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'administrativa'::app_role));

DROP TRIGGER IF EXISTS update_gcal_sync_config_updated_at ON public.google_calendar_sync_config;
CREATE TRIGGER update_gcal_sync_config_updated_at
  BEFORE UPDATE ON public.google_calendar_sync_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed singleton row if not present
INSERT INTO public.google_calendar_sync_config (auto_sync_enabled)
SELECT true
WHERE NOT EXISTS (SELECT 1 FROM public.google_calendar_sync_config);
