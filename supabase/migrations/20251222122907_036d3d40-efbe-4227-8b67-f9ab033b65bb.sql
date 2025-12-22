-- Allow cleaners to view objects from their assigned orders
CREATE POLICY "Cleaners can view objects from orders"
ON public.objects
FOR SELECT
USING (
  id IN (
    SELECT object_id FROM public.orders WHERE cleaner_id = auth.uid()
  )
);

-- Allow cleaners to view manager profiles for their orders
CREATE POLICY "Cleaners can view managers from orders"
ON public.profiles
FOR SELECT
USING (
  get_user_role(auth.uid()) = 'cleaner'
  AND id IN (
    SELECT manager_id FROM public.orders WHERE cleaner_id = auth.uid()
  )
);