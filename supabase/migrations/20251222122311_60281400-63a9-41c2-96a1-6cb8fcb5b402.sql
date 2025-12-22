-- Allow managers to view approved cleaners for order creation
CREATE POLICY "Managers can view approved cleaners"
ON public.profiles
FOR SELECT
USING (
  get_user_role(auth.uid()) = 'manager' 
  AND role = 'cleaner' 
  AND status = 'approved'
);