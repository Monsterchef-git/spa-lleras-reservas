-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Booking status enum
CREATE TYPE public.booking_status AS ENUM ('pendiente', 'confirmada', 'cancelada', 'completada');
CREATE TYPE public.booking_source AS ENUM ('fresha', 'whatsapp', 'email', 'walk_in', 'web');

-- Services table
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  requires_two_therapists BOOLEAN DEFAULT false,
  uses_rooftop BOOLEAN DEFAULT false,
  is_addon BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Service durations/prices
CREATE TABLE public.service_durations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  price_cop INTEGER NOT NULL,
  price_usd INTEGER NOT NULL
);
ALTER TABLE public.service_durations ENABLE ROW LEVEL SECURITY;

-- Therapists
CREATE TABLE public.therapists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  schedule TEXT,
  is_available BOOLEAN DEFAULT true,
  specialties TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.therapists ENABLE ROW LEVEL SECURITY;

-- Resources (rooms, rooftop)
CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  notes TEXT,
  is_active BOOLEAN DEFAULT true
);
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- Clients
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Bookings
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id),
  service_id UUID REFERENCES public.services(id),
  service_duration_id UUID REFERENCES public.service_durations(id),
  therapist_id UUID REFERENCES public.therapists(id),
  second_therapist_id UUID REFERENCES public.therapists(id),
  resource_id UUID REFERENCES public.resources(id),
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  price_cop INTEGER,
  price_usd INTEGER,
  status booking_status DEFAULT 'pendiente',
  source booking_source DEFAULT 'web',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view user_roles" ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can view services" ON public.services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage services" ON public.services FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view service_durations" ON public.service_durations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage service_durations" ON public.service_durations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view therapists" ON public.therapists FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage therapists" ON public.therapists FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view resources" ON public.resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage resources" ON public.resources FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage clients" ON public.clients FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Authenticated can view bookings" ON public.bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage bookings" ON public.bookings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Triggers for updated_at
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_therapists_updated_at BEFORE UPDATE ON public.therapists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed: Services
INSERT INTO public.services (id, name, category, description, requires_two_therapists, uses_rooftop, is_addon, notes) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Masaje Relajante', 'Masajes', 'Un masaje corporal completo con movimientos suaves y presión ligera para aliviar tensión, mejorar la circulación y promover una relajación profunda.', false, false, false, NULL),
  ('a1000000-0000-0000-0000-000000000002', 'Masaje de Tejido Profundo', 'Masajes', 'Un masaje de presión profunda diseñado para aliviar la tensión crónica y descargar los músculos. Ayuda a liberar nudos, restaurar la movilidad y acelerar la recuperación.', false, false, false, NULL),
  ('a1000000-0000-0000-0000-000000000003', 'Masaje a Cuatro Manos', 'Masajes', 'Dos terapeutas trabajando en perfecta sincronía para un masaje inmersivo. Ideal para ocasiones especiales.', true, false, false, 'Requiere DOS terapeutas simultáneos'),
  ('a1000000-0000-0000-0000-000000000004', 'Masaje Exprés', 'Masajes', 'Sesión rápida para alivio inmediato.', false, false, false, NULL),
  ('a1000000-0000-0000-0000-000000000005', 'Faciales', 'Faciales', 'Tratamientos faciales personalizados.', false, false, false, NULL),
  ('a1000000-0000-0000-0000-000000000006', 'Paquetes de Día de Spa', 'Paquetes', 'Experiencias completas de bienestar.', false, false, false, NULL),
  ('a1000000-0000-0000-0000-000000000007', 'Experiencia Rooftop Jacuzzi & Baño Turco', 'Experiencias', 'Relajación en terraza con jacuzzi en piedra Bali, baño turco y vistas panorámicas. Puede ser compartido o privado para eventos.', false, true, false, 'Reservado para huéspedes del spa'),
  ('a1000000-0000-0000-0000-000000000008', 'Aromaterapia', 'Complementos', 'Se puede agregar a cualquier masaje como complemento.', false, false, true, NULL),
  ('a1000000-0000-0000-0000-000000000009', 'Terapia IV', 'Tratamientos', 'Terapia intravenosa disponible en Lleras Medical Lounge.', false, false, false, 'Disponible en Lleras Medical Lounge (empresa hermana)');

-- Seed: Service durations
INSERT INTO public.service_durations (service_id, duration_minutes, price_cop, price_usd) VALUES
  ('a1000000-0000-0000-0000-000000000001', 40, 160000, 50),
  ('a1000000-0000-0000-0000-000000000001', 60, 185000, 55),
  ('a1000000-0000-0000-0000-000000000001', 90, 235000, 70),
  ('a1000000-0000-0000-0000-000000000002', 40, 185000, 55),
  ('a1000000-0000-0000-0000-000000000002', 60, 210000, 65),
  ('a1000000-0000-0000-0000-000000000002', 90, 260000, 75),
  ('a1000000-0000-0000-0000-000000000003', 60, 370000, 110),
  ('a1000000-0000-0000-0000-000000000003', 90, 470000, 140);

-- Seed: Resources
INSERT INTO public.resources (name, type, notes) VALUES
  ('Sala de Masajes 1', 'Sala', NULL),
  ('Sala de Masajes 2', 'Sala', NULL),
  ('Rooftop', 'Experiencia', 'Puede ser compartido o privado para eventos');

-- Seed: Therapists
INSERT INTO public.therapists (name, schedule, is_available, specialties) VALUES
  ('Ana Pérez', 'Lun-Vie 8:00-16:00', true, ARRAY['Relajante', 'Cuatro Manos']),
  ('Juan Rivera', 'Lun-Sáb 9:00-17:00', true, ARRAY['Tejido Profundo', 'Cuatro Manos']),
  ('Sofia Torres', 'Mar-Sáb 10:00-18:00', true, ARRAY['Faciales', 'Relajante']),
  ('Diego Morales', 'Lun-Vie 8:00-16:00', false, ARRAY['Tejido Profundo', 'Relajante']);