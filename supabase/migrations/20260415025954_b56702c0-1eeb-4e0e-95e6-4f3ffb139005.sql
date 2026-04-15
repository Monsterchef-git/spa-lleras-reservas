
CREATE TABLE public.booking_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id),
  service_duration_id UUID REFERENCES public.service_durations(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  price_cop INTEGER NOT NULL DEFAULT 0,
  price_usd INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view booking_items"
ON public.booking_items
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated can manage booking_items"
ON public.booking_items
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
