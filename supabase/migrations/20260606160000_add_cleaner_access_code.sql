ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS cleaner_access_code text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_cleaner_access_code
ON public.profiles(cleaner_access_code)
WHERE cleaner_access_code IS NOT NULL;
