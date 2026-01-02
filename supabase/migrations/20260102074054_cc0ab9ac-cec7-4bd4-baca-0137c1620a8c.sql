-- Allow demo_managers to view demo_cleaners for order creation
CREATE POLICY "Demo managers can view demo cleaners"
ON public.profiles
FOR SELECT
USING (
  (get_user_role(auth.uid()) = 'demo_manager') 
  AND (role = 'demo_cleaner')
);

-- Allow demo_managers to create orders with demo_cleaners
CREATE POLICY "Demo managers can create orders"
ON public.orders
FOR INSERT
WITH CHECK (
  (auth.uid() = manager_id) 
  AND (get_user_role(auth.uid()) = 'demo_manager')
);

-- Allow demo_managers to view their own orders
CREATE POLICY "Demo managers can view own orders"
ON public.orders
FOR SELECT
USING (
  (auth.uid() = manager_id) 
  AND (get_user_role(auth.uid()) = 'demo_manager')
);

-- Allow demo_managers to update their own orders
CREATE POLICY "Demo managers can update own orders"
ON public.orders
FOR UPDATE
USING (
  (auth.uid() = manager_id) 
  AND (get_user_role(auth.uid()) = 'demo_manager')
);

-- Allow demo_managers to delete their own orders
CREATE POLICY "Demo managers can delete own orders"
ON public.orders
FOR DELETE
USING (
  (auth.uid() = manager_id) 
  AND (get_user_role(auth.uid()) = 'demo_manager')
);

-- Allow demo_managers to view demo_cleaner unavailability
CREATE POLICY "Demo managers can view demo cleaner unavailability"
ON public.cleaner_unavailability
FOR SELECT
USING (
  (get_user_role(auth.uid()) = 'demo_manager')
  AND (cleaner_id IN (SELECT id FROM profiles WHERE role = 'demo_cleaner'))
);

-- Allow demo_managers to view objects for orders (their own)
CREATE POLICY "Demo managers can view own objects"
ON public.objects
FOR SELECT
USING (
  (auth.uid() = user_id) 
  AND (get_user_role(auth.uid()) = 'demo_manager')
);

-- Allow demo_managers to insert own objects
CREATE POLICY "Demo managers can insert own objects"
ON public.objects
FOR INSERT
WITH CHECK (
  (auth.uid() = user_id) 
  AND (get_user_role(auth.uid()) = 'demo_manager')
);

-- Allow demo_managers to update own objects
CREATE POLICY "Demo managers can update own objects"
ON public.objects
FOR UPDATE
USING (
  (auth.uid() = user_id) 
  AND (get_user_role(auth.uid()) = 'demo_manager')
);

-- Allow demo_managers to delete own objects
CREATE POLICY "Demo managers can delete own objects"
ON public.objects
FOR DELETE
USING (
  (auth.uid() = user_id) 
  AND (get_user_role(auth.uid()) = 'demo_manager')
);