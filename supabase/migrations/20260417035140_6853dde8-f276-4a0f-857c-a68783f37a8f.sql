-- Crear usuario admin inicial para Spa Lleras
-- Email: spallerasmedellin@gmail.com
-- Contraseña: AdminSpa2026

-- Primero creamos el usuario en auth.users
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_sent_at,
  is_sso_user
) VALUES (
  gen_random_uuid(),
  'spallerasmedellin@gmail.com',
  crypt('AdminSpa2026', gen_salt('bf')),
  now(), -- Email ya confirmado
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Administrador Spa Lleras"}',
  now(),
  now(),
  now(),
  false
)
RETURNING id;

-- Luego asignamos el rol admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'spallerasmedellin@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;