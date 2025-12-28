-- Add RLS policy for demo users to only view other demo users
CREATE POLICY "Demo users can view other demo users"
ON public.profiles
FOR SELECT
USING (
  (get_user_role(auth.uid()) = 'demo') 
  AND (role = 'demo')
);

-- Demo users can view their own profile (already covered by existing policies)
-- Admins can already update any profile via "Admin can update roles" policy