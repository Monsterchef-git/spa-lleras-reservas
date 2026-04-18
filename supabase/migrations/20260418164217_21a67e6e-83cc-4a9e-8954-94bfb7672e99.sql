
-- Audit log table
CREATE TABLE public.booking_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid,
  user_id uuid,
  action text NOT NULL CHECK (action IN ('CREATE','UPDATE','DELETE','STATUS_CHANGE','CANCEL','ITEMS_CHANGE')),
  old_data jsonb,
  new_data jsonb,
  reason text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_audit_log_booking_id ON public.booking_audit_log(booking_id);
CREATE INDEX idx_booking_audit_log_changed_at ON public.booking_audit_log(changed_at DESC);

ALTER TABLE public.booking_audit_log ENABLE ROW LEVEL SECURITY;

-- Only authenticated admin/staff can view
CREATE POLICY "Authenticated can view audit log"
ON public.booking_audit_log
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- No direct inserts/updates/deletes from clients — only triggers (SECURITY DEFINER) write.
-- We intentionally do NOT create INSERT/UPDATE/DELETE policies.

-- Trigger function for bookings
CREATE OR REPLACE FUNCTION public.audit_booking_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_user uuid;
  v_reason text;
BEGIN
  v_user := auth.uid();

  IF TG_OP = 'INSERT' THEN
    v_action := 'CREATE';
    INSERT INTO public.booking_audit_log(booking_id, user_id, action, old_data, new_data)
    VALUES (NEW.id, v_user, v_action, NULL, to_jsonb(NEW));
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Differentiate STATUS_CHANGE / CANCEL / UPDATE
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status = 'cancelada' THEN
        v_action := 'CANCEL';
      ELSE
        v_action := 'STATUS_CHANGE';
      END IF;
    ELSE
      v_action := 'UPDATE';
    END IF;

    -- Pull optional reason from a session GUC (set by app before update)
    BEGIN
      v_reason := current_setting('app.cancel_reason', true);
    EXCEPTION WHEN OTHERS THEN
      v_reason := NULL;
    END;

    INSERT INTO public.booking_audit_log(booking_id, user_id, action, old_data, new_data, reason)
    VALUES (NEW.id, v_user, v_action, to_jsonb(OLD), to_jsonb(NEW), v_reason);
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.booking_audit_log(booking_id, user_id, action, old_data, new_data)
    VALUES (OLD.id, v_user, 'DELETE', to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_bookings ON public.bookings;
CREATE TRIGGER trg_audit_bookings
AFTER INSERT OR UPDATE OR DELETE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.audit_booking_changes();

-- Trigger function for booking_items (groups as ITEMS_CHANGE)
CREATE OR REPLACE FUNCTION public.audit_booking_items_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_booking uuid;
BEGIN
  v_user := auth.uid();
  v_booking := COALESCE(NEW.booking_id, OLD.booking_id);

  INSERT INTO public.booking_audit_log(booking_id, user_id, action, old_data, new_data)
  VALUES (
    v_booking,
    v_user,
    'ITEMS_CHANGE',
    CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_booking_items ON public.booking_items;
CREATE TRIGGER trg_audit_booking_items
AFTER INSERT OR UPDATE OR DELETE ON public.booking_items
FOR EACH ROW EXECUTE FUNCTION public.audit_booking_items_changes();
