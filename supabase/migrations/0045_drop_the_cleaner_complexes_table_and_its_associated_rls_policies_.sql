-- Drop policies first
DROP POLICY IF EXISTS "Cleaners can manage their own complex assignments" ON public.cleaner_complexes;
DROP POLICY IF EXISTS "Admins can view all cleaner-complex assignments" ON public.cleaner_complexes;
DROP POLICY IF EXISTS "Admins can create cleaner-complex assignments" ON public.cleaner_complexes;
DROP POLICY IF EXISTS "Admins can delete cleaner-complex assignments" ON public.cleaner_complexes;

-- Drop the table
DROP TABLE IF EXISTS public.cleaner_complexes;