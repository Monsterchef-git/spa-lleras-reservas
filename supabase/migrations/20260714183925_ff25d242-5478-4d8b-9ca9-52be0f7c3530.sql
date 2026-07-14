-- 1) Convert set_cancel_reason from SECURITY DEFINER to SECURITY INVOKER
--    It only writes a local GUC and does not need elevated privileges.
CREATE OR REPLACE FUNCTION public.set_cancel_reason(reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.cancel_reason', COALESCE(reason, ''), true);
END;
$$;

-- 2) Tighten SELECT policies that used USING (true) — restrict to admin / administrativa / staff.

DROP POLICY IF EXISTS "Authenticated can view resources" ON public.resources;
CREATE POLICY "Staff can view resources"
  ON public.resources FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'administrativa'::public.app_role)
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
  );

DROP POLICY IF EXISTS "Authenticated can view therapists" ON public.therapists;
CREATE POLICY "Staff can view therapists"
  ON public.therapists FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'administrativa'::public.app_role)
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
  );

DROP POLICY IF EXISTS "Authenticated can view services" ON public.services;
CREATE POLICY "Staff can view services"
  ON public.services FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'administrativa'::public.app_role)
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
  );

DROP POLICY IF EXISTS "Authenticated can view service_durations" ON public.service_durations;
CREATE POLICY "Staff can view service_durations"
  ON public.service_durations FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'administrativa'::public.app_role)
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
  );

DROP POLICY IF EXISTS "Authenticated can view therapist_schedules" ON public.therapist_schedules;
CREATE POLICY "Staff can view therapist_schedules"
  ON public.therapist_schedules FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'administrativa'::public.app_role)
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
  );

DROP POLICY IF EXISTS "Authenticated can view therapist_schedule_exceptions" ON public.therapist_schedule_exceptions;
CREATE POLICY "Staff can view therapist_schedule_exceptions"
  ON public.therapist_schedule_exceptions FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'administrativa'::public.app_role)
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
  );

DROP POLICY IF EXISTS "Authenticated can view sync config" ON public.google_calendar_sync_config;
CREATE POLICY "Admin or administrativa can view sync config"
  ON public.google_calendar_sync_config FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'administrativa'::public.app_role)
  );

-- 3) Storage: add RLS policies for storage.objects.
--    Bucket 'email-assets' is public: allow anonymous SELECT so email images render.
--    Writes on that bucket are restricted to admins. All other buckets remain locked
--    (no policies = no access via anon/authenticated; service_role bypasses RLS).

DROP POLICY IF EXISTS "Public can read email-assets" ON storage.objects;
CREATE POLICY "Public can read email-assets"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'email-assets');

DROP POLICY IF EXISTS "Admins can upload email-assets" ON storage.objects;
CREATE POLICY "Admins can upload email-assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'email-assets'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Admins can update email-assets" ON storage.objects;
CREATE POLICY "Admins can update email-assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'email-assets'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    bucket_id = 'email-assets'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Admins can delete email-assets" ON storage.objects;
CREATE POLICY "Admins can delete email-assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'email-assets'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );