-- Drop outdated policies that referenced OLD/NEW values and caused SQL failures.
DROP POLICY IF EXISTS "Users can update own non-critical profile fields" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile with allowed roles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

-- Ensure RLS is enabled before defining policies.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read only their own profile.
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Allow legitimate registration inserts.
CREATE POLICY "Users can insert own profile with allowed roles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() = id
    AND role IN ('cleaner', 'manager')
    AND status = 'pending'
    AND is_active = true
  );

-- Allow users to update only their own row (column protections are enforced by the trigger).
CREATE POLICY "Users can update own non-critical profile fields"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow admins to bypass row restrictions.
CREATE POLICY "Admin can manage all profiles"
  ON public.profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );