-- Enable row-level security so policies take effect.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies so we can recreate the new secure set.
DO $$
DECLARE
  existing_policy RECORD;
BEGIN
  FOR existing_policy IN
    SELECT polname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.profiles;', existing_policy.polname);
  END LOOP;
END
$$;

-- Allow users to read their own profile row.
CREATE POLICY "Profiles can select their own row"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Allow users to insert a profile for themselves while keeping roles/status/is_active safe.
CREATE POLICY "Profiles can insert their own row"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() = id
    AND role IN ('cleaner', 'manager', 'demo_manager', 'demo_cleaner')
    AND status = 'pending'
    AND is_active = true
  );

-- Let users update only the fields that are safe by ensuring role/status/is_active stay unchanged.
CREATE POLICY "Profiles can update safe fields"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = OLD.role
    AND status = OLD.status
    AND is_active = OLD.is_active
  );

-- Give admins full access based on the helper function that returns the requesting user’s role.
CREATE POLICY "Admins can manage profiles"
  ON public.profiles
  FOR ALL
  USING (get_user_role(auth.uid()) = 'admin')
  WITH CHECK (get_user_role(auth.uid()) = 'admin');