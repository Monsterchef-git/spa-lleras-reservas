
-- 1) user_roles SELECT: restrict to self or admin
DROP POLICY IF EXISTS "Authenticated users can view user_roles" ON public.user_roles;
CREATE POLICY "Users can view own role or admins view all"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 2) Revoke EXECUTE on SECURITY DEFINER functions from public/anon/authenticated,
--    then re-grant only what the app calls directly.
REVOKE ALL ON FUNCTION public.set_cancel_reason(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_double_booking() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_booking_items_changes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_booking_changes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_booking_within_schedule() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_therapist_schedule(uuid, date) FROM PUBLIC, anon, authenticated;

-- Re-grant to authenticated only what the client / RLS need
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_cancel_reason(text) TO authenticated;

-- 3) Storage: drop broad public SELECT policy on email-assets (public bucket URLs still work)
DROP POLICY IF EXISTS "Public read email-assets" ON storage.objects;
