-- Tighten SELECT policies on clients and booking_items so that only
-- authenticated users with admin or staff role can read these tables.
-- Previously, both had a permissive SELECT policy with USING (true),
-- exposing client PII and booking pricing to any authenticated user.

DROP POLICY IF EXISTS "Authenticated can view clients" ON public.clients;
CREATE POLICY "Admin or staff can view clients"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS "Authenticated can view booking_items" ON public.booking_items;
CREATE POLICY "Admin or staff can view booking_items"
  ON public.booking_items
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- Same hardening for bookings: it had a permissive SELECT policy with USING (true)
-- in addition to the role-gated ALL policy. Remove the permissive one.
DROP POLICY IF EXISTS "Authenticated can view bookings" ON public.bookings;
CREATE POLICY "Admin or staff can view bookings"
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));