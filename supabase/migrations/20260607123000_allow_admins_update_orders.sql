-- Admins manage operational scheduling, so they need to update any order
-- when rescheduling or cancelling from the admin calendar.
DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;

CREATE POLICY "Admins can update all orders"
ON public.orders
FOR UPDATE
USING (public.get_user_role(auth.uid()) = 'admin')
WITH CHECK (public.get_user_role(auth.uid()) = 'admin');
