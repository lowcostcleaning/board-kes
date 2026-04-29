INSERT INTO public.profiles (id, email, role, status, manual_orders_adjustment)
SELECT u.id, u.email, 'cleaner', 'approved', 0
FROM auth.users u
WHERE u.email = 'loganas4667@mail.ru'
ON CONFLICT (id) DO UPDATE SET role = 'cleaner', status = 'approved', email = EXCLUDED.email;