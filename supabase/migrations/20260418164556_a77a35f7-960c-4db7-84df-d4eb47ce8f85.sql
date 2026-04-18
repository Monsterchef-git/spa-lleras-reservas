CREATE OR REPLACE FUNCTION public.set_cancel_reason(reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.cancel_reason', COALESCE(reason, ''), true);
END;
$$;

REVOKE ALL ON FUNCTION public.set_cancel_reason(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_cancel_reason(text) TO authenticated;
