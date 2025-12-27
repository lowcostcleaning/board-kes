-- Allow admins to insert objects for any user
CREATE POLICY "Admins can insert objects for any user"
ON public.objects
FOR INSERT
WITH CHECK (get_user_role(auth.uid()) = 'admin');