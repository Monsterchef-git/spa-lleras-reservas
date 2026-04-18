-- Indexes for performance on overlap checks
CREATE INDEX IF NOT EXISTS idx_bookings_date_status ON public.bookings (booking_date, status);
CREATE INDEX IF NOT EXISTS idx_bookings_therapist ON public.bookings (therapist_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_second_therapist ON public.bookings (second_therapist_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_resource ON public.bookings (resource_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_times ON public.bookings (booking_date, start_time, end_time);

-- Trigger function: prevent_double_booking
CREATE OR REPLACE FUNCTION public.prevent_double_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conflict_record RECORD;
  therapist_name TEXT;
  resource_name TEXT;
BEGIN
  -- Only validate active bookings (pendiente / confirmada)
  IF NEW.status IS NULL OR NEW.status NOT IN ('pendiente', 'confirmada') THEN
    RETURN NEW;
  END IF;

  -- Business rule: end_time > start_time
  IF NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'La hora de fin debe ser posterior a la hora de inicio.'
      USING ERRCODE = '22023';
  END IF;

  -- Business rule: booking_date >= today
  IF NEW.booking_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'No se pueden crear reservas en fechas pasadas (fecha: %).', NEW.booking_date
      USING ERRCODE = '22023';
  END IF;

  -- Business rule: working hours 10:00 - 22:00
  IF NEW.start_time < TIME '10:00' OR NEW.end_time > TIME '22:00' THEN
    RAISE EXCEPTION 'El horario debe estar entre 10:00 y 22:00 (recibido: % - %).',
      NEW.start_time, NEW.end_time
      USING ERRCODE = '22023';
  END IF;

  -- Business rule: a therapist cannot be both principal and second
  IF NEW.therapist_id IS NOT NULL
     AND NEW.second_therapist_id IS NOT NULL
     AND NEW.therapist_id = NEW.second_therapist_id THEN
    RAISE EXCEPTION 'El terapeuta principal y el segundo terapeuta no pueden ser la misma persona.'
      USING ERRCODE = '22023';
  END IF;

  -- Conflict check: principal therapist
  IF NEW.therapist_id IS NOT NULL THEN
    SELECT b.id, b.start_time, b.end_time
      INTO conflict_record
    FROM public.bookings b
    WHERE b.booking_date = NEW.booking_date
      AND b.status IN ('pendiente', 'confirmada')
      AND b.id IS DISTINCT FROM NEW.id
      AND (b.therapist_id = NEW.therapist_id OR b.second_therapist_id = NEW.therapist_id)
      AND b.start_time < NEW.end_time
      AND b.end_time > NEW.start_time
    LIMIT 1;

    IF FOUND THEN
      SELECT name INTO therapist_name FROM public.therapists WHERE id = NEW.therapist_id;
      RAISE EXCEPTION 'El terapeuta % ya tiene una reserva de % a % ese día.',
        COALESCE(therapist_name, 'principal'),
        to_char(conflict_record.start_time, 'HH24:MI'),
        to_char(conflict_record.end_time, 'HH24:MI')
        USING ERRCODE = '23P01';
    END IF;
  END IF;

  -- Conflict check: second therapist
  IF NEW.second_therapist_id IS NOT NULL THEN
    SELECT b.id, b.start_time, b.end_time
      INTO conflict_record
    FROM public.bookings b
    WHERE b.booking_date = NEW.booking_date
      AND b.status IN ('pendiente', 'confirmada')
      AND b.id IS DISTINCT FROM NEW.id
      AND (b.therapist_id = NEW.second_therapist_id OR b.second_therapist_id = NEW.second_therapist_id)
      AND b.start_time < NEW.end_time
      AND b.end_time > NEW.start_time
    LIMIT 1;

    IF FOUND THEN
      SELECT name INTO therapist_name FROM public.therapists WHERE id = NEW.second_therapist_id;
      RAISE EXCEPTION 'El segundo terapeuta % ya tiene una reserva de % a % ese día.',
        COALESCE(therapist_name, ''),
        to_char(conflict_record.start_time, 'HH24:MI'),
        to_char(conflict_record.end_time, 'HH24:MI')
        USING ERRCODE = '23P01';
    END IF;
  END IF;

  -- Conflict check: resource (sala / rooftop)
  IF NEW.resource_id IS NOT NULL THEN
    SELECT b.id, b.start_time, b.end_time
      INTO conflict_record
    FROM public.bookings b
    WHERE b.booking_date = NEW.booking_date
      AND b.status IN ('pendiente', 'confirmada')
      AND b.id IS DISTINCT FROM NEW.id
      AND b.resource_id = NEW.resource_id
      AND b.start_time < NEW.end_time
      AND b.end_time > NEW.start_time
    LIMIT 1;

    IF FOUND THEN
      SELECT name INTO resource_name FROM public.resources WHERE id = NEW.resource_id;
      RAISE EXCEPTION '% está ocupado de % a % ese día.',
        COALESCE(resource_name, 'El recurso'),
        to_char(conflict_record.start_time, 'HH24:MI'),
        to_char(conflict_record.end_time, 'HH24:MI')
        USING ERRCODE = '23P01';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS trg_prevent_double_booking ON public.bookings;

CREATE TRIGGER trg_prevent_double_booking
BEFORE INSERT OR UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.prevent_double_booking();