-- Drop the old demo policy and create new ones for demo_manager and demo_cleaner
DROP POLICY IF EXISTS "Demo users can view other demo users" ON public.profiles;

-- Demo managers can view other demo managers
CREATE POLICY "Demo managers can view demo managers"
ON public.profiles
FOR SELECT
USING (
  (get_user_role(auth.uid()) = 'demo_manager') 
  AND (role = 'demo_manager')
);

-- Demo cleaners can view other demo cleaners
CREATE POLICY "Demo cleaners can view demo cleaners"
ON public.profiles
FOR SELECT
USING (
  (get_user_role(auth.uid()) = 'demo_cleaner') 
  AND (role = 'demo_cleaner')
);

-- Demo managers can view demo cleaners (to assign orders)
CREATE POLICY "Demo managers can view demo cleaners for orders"
ON public.profiles
FOR SELECT
USING (
  (get_user_role(auth.uid()) = 'demo_manager') 
  AND (role = 'demo_cleaner')
);