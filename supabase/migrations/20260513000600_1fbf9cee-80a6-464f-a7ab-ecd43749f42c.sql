-- Therapist base weekly schedule
CREATE TABLE public.therapist_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_day_off boolean NOT NULL DEFAULT false,
  start_time time,
  end_time time,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (therapist_id, day_of_week)
);

ALTER TABLE public.therapist_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view therapist_schedules"
  ON public.therapist_schedules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin or administrativa can manage therapist_schedules"
  ON public.therapist_schedules FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'administrativa'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'administrativa'::app_role));

CREATE TRIGGER trg_therapist_schedules_updated
  BEFORE UPDATE ON public.therapist_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Per-date exceptions
CREATE TABLE public.therapist_schedule_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL,
  exception_date date NOT NULL,
  is_day_off boolean NOT NULL DEFAULT false,
  start_time time,
  end_time time,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (therapist_id, exception_date)
);

ALTER TABLE public.therapist_schedule_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view therapist_schedule_exceptions"
  ON public.therapist_schedule_exceptions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin or administrativa can manage therapist_schedule_exceptions"
  ON public.therapist_schedule_exceptions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'administrativa'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'administrativa'::app_role));

CREATE TRIGGER trg_therapist_schedule_exceptions_updated
  BEFORE UPDATE ON public.therapist_schedule_exceptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Resolver: returns one row (is_working, start_time, end_time) for a therapist on a date
CREATE OR REPLACE FUNCTION public.get_therapist_schedule(_therapist_id uuid, _date date)
RETURNS TABLE(is_working boolean, start_time time, end_time time, has_config boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ex RECORD;
  base RECORD;
  dow smallint;
BEGIN
  SELECT * INTO ex FROM public.therapist_schedule_exceptions
    WHERE therapist_id = _therapist_id AND exception_date = _date LIMIT 1;
  IF FOUND THEN
    RETURN QUERY SELECT (NOT ex.is_day_off) AND ex.start_time IS NOT NULL AND ex.end_time IS NOT NULL,
                        ex.start_time, ex.end_time, true;
    RETURN;
  END IF;

  dow := EXTRACT(DOW FROM _date)::smallint;
  SELECT * INTO base FROM public.therapist_schedules
    WHERE therapist_id = _therapist_id AND day_of_week = dow LIMIT 1;
  IF FOUND THEN
    RETURN QUERY SELECT (NOT base.is_day_off) AND base.start_time IS NOT NULL AND base.end_time IS NOT NULL,
                        base.start_time, base.end_time, true;
    RETURN;
  END IF;

  RETURN QUERY SELECT true::boolean, NULL::time, NULL::time, false;
END;
$$;

-- Validation trigger: booking must fit therapist schedule when configured
CREATE OR REPLACE FUNCTION public.validate_booking_within_schedule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sch RECORD;
  tname text;
BEGIN
  IF NEW.status IS NULL OR NEW.status NOT IN ('pendiente','confirmada') THEN
    RETURN NEW;
  END IF;

  IF NEW.therapist_id IS NOT NULL THEN
    SELECT * INTO sch FROM public.get_therapist_schedule(NEW.therapist_id, NEW.booking_date);
    IF sch.has_config THEN
      IF NOT sch.is_working THEN
        SELECT name INTO tname FROM public.therapists WHERE id = NEW.therapist_id;
        RAISE EXCEPTION '% tiene día libre el % según su horario configurado.',
          COALESCE(tname,'La terapeuta'), to_char(NEW.booking_date,'DD/MM/YYYY')
          USING ERRCODE = '22023';
      END IF;
      IF NEW.start_time < sch.start_time OR NEW.end_time > sch.end_time THEN
        SELECT name INTO tname FROM public.therapists WHERE id = NEW.therapist_id;
        RAISE EXCEPTION '% trabaja de % a % ese día. La reserva (%-%) está fuera de su horario.',
          COALESCE(tname,'La terapeuta'),
          to_char(sch.start_time,'HH24:MI'), to_char(sch.end_time,'HH24:MI'),
          to_char(NEW.start_time,'HH24:MI'), to_char(NEW.end_time,'HH24:MI')
          USING ERRCODE = '22023';
      END IF;
    END IF;
  END IF;

  IF NEW.second_therapist_id IS NOT NULL THEN
    SELECT * INTO sch FROM public.get_therapist_schedule(NEW.second_therapist_id, NEW.booking_date);
    IF sch.has_config THEN
      IF NOT sch.is_working THEN
        SELECT name INTO tname FROM public.therapists WHERE id = NEW.second_therapist_id;
        RAISE EXCEPTION '% (segunda terapeuta) tiene día libre el %.',
          COALESCE(tname,''), to_char(NEW.booking_date,'DD/MM/YYYY')
          USING ERRCODE = '22023';
      END IF;
      IF NEW.start_time < sch.start_time OR NEW.end_time > sch.end_time THEN
        SELECT name INTO tname FROM public.therapists WHERE id = NEW.second_therapist_id;
        RAISE EXCEPTION '% (segunda terapeuta) trabaja de % a % ese día.',
          COALESCE(tname,''),
          to_char(sch.start_time,'HH24:MI'), to_char(sch.end_time,'HH24:MI')
          USING ERRCODE = '22023';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_booking_schedule
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.validate_booking_within_schedule();