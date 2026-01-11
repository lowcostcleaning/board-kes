-- Create the junction table
CREATE TABLE public.cleaner_complexes (
    cleaner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    complex_id UUID NOT NULL REFERENCES public.residential_complexes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (cleaner_id, complex_id) -- Ensures a cleaner can only be assigned to a complex once
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.cleaner_complexes ENABLE ROW LEVEL SECURITY;

-- Create policies for secure data access
-- Policy for cleaners to manage their own assignments
CREATE POLICY "Cleaners can manage their own complex assignments"
ON public.cleaner_complexes
FOR ALL TO authenticated
USING (auth.uid() = cleaner_id)
WITH CHECK (auth.uid() = cleaner_id);

-- Policy for admins to view all assignments (adjust if needed)
CREATE POLICY "Admins can view all cleaner-complex assignments"
ON public.cleaner_complexes
FOR SELECT TO authenticated
USING (get_user_role(auth.uid()) = 'admin');

-- Policy for admins to create assignments (ensure admin is assigning)
CREATE POLICY "Admins can create cleaner-complex assignments"
ON public.cleaner_complexes
FOR INSERT TO authenticated
WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- Policy for admins to delete assignments (ensure admin is deleting)
CREATE POLICY "Admins can delete cleaner-complex assignments"
ON public.cleaner_complexes
FOR DELETE TO authenticated
USING (get_user_role(auth.uid()) = 'admin');