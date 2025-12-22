-- Allow managers to view cleaner profiles from their orders
CREATE POLICY "Managers can view cleaners from orders"
ON public.profiles
FOR SELECT
USING (
  get_user_role(auth.uid()) = 'manager'
  AND id IN (
    SELECT cleaner_id FROM public.orders WHERE manager_id = auth.uid()
  )
);