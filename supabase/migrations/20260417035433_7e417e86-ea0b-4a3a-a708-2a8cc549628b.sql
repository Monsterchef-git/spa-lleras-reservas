-- Eliminar usuario existente para recrearlo correctamente
DELETE FROM public.user_roles WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'spallerasmedellin@gmail.com'
);
DELETE FROM auth.identities WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'spallerasmedellin@gmail.com'
);
DELETE FROM auth.users WHERE email = 'spallerasmedellin@gmail.com';