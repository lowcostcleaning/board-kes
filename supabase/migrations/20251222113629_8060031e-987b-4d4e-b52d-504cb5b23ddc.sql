-- 1. Create security definer helper function to safely check role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = _user_id
$$;

-- 2. Drop and recreate admin policies to use the function
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update roles" ON public.profiles;

-- Admin can view all profiles
CREATE POLICY "Admin can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.get_user_role(auth.uid()) = 'admin');

-- Admin can update any profile role
CREATE POLICY "Admin can update roles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.get_user_role(auth.uid()) = 'admin');