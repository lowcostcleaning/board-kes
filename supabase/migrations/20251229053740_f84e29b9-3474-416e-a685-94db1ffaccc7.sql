-- Allow demo cleaners to view demo managers
CREATE POLICY "Demo cleaners can view demo managers" 
ON public.profiles 
FOR SELECT 
USING (
  (get_user_role(auth.uid()) = 'demo_cleaner') 
  AND (role = 'demo_manager')
);