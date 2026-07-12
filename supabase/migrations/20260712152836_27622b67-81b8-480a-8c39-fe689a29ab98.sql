CREATE TABLE public.sync_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  events_fetched INT NOT NULL DEFAULT 0,
  events_imported INT NOT NULL DEFAULT 0,
  events_skipped INT NOT NULL DEFAULT 0,
  conflicts_detected INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('success','empty','error')),
  error_message TEXT,
  duration_ms INT NOT NULL DEFAULT 0
);

GRANT SELECT ON public.sync_log TO authenticated;
GRANT ALL ON public.sync_log TO service_role;

ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sync log"
ON public.sync_log FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'administrativa'));

CREATE INDEX idx_sync_log_created_at ON public.sync_log (created_at DESC);