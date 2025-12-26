-- Allow cleaners to view all approved managers
CREATE POLICY "Cleaners can view all approved managers"
ON public.profiles
FOR SELECT
USING (
  get_user_role(auth.uid()) = 'cleaner'
  AND role = 'manager'
  AND status = 'approved'
);

-- Allow cleaners to view all objects from approved managers
CREATE POLICY "Cleaners can view all manager objects"
ON public.objects
FOR SELECT
USING (
  get_user_role(auth.uid()) = 'cleaner'
  AND user_id IN (
    SELECT id FROM public.profiles WHERE role = 'manager' AND status = 'approved'
  )
);

-- Allow cleaners to create orders for themselves
CREATE POLICY "Cleaners can create own orders"
ON public.orders
FOR INSERT
WITH CHECK (
  auth.uid() = cleaner_id
  AND get_user_role(auth.uid()) = 'cleaner'
);

-- Allow cleaners to delete their own orders (only orders they created)
CREATE POLICY "Cleaners can delete own orders"
ON public.orders
FOR DELETE
USING (
  auth.uid() = cleaner_id
  AND manager_id = cleaner_id
);

-- Allow managers to delete their own orders
CREATE POLICY "Managers can delete own orders"
ON public.orders
FOR DELETE
USING (
  auth.uid() = manager_id
);