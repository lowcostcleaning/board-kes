-- Task 1: Create residential_complexes table
CREATE TABLE public.residential_complexes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.residential_complexes ENABLE ROW LEVEL SECURITY;

-- Admin-only management policies
CREATE POLICY "Admins can view all residential complexes"
ON public.residential_complexes
FOR SELECT
USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can create residential complexes"
ON public.residential_complexes
FOR INSERT
WITH CHECK (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can update residential complexes"
ON public.residential_complexes
FOR UPDATE
USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete residential complexes"
ON public.residential_complexes
FOR DELETE
USING (get_user_role(auth.uid()) = 'admin');

-- Managers can view residential complexes for selection
CREATE POLICY "Managers can view residential complexes"
ON public.residential_complexes
FOR SELECT
USING (get_user_role(auth.uid()) IN ('manager', 'demo_manager'));

-- Add residential_complex_id to objects table
ALTER TABLE public.objects 
ADD COLUMN residential_complex_id UUID REFERENCES public.residential_complexes(id);

-- Add is_archived column to objects for status tracking
ALTER TABLE public.objects
ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false;

-- Index for faster lookups
CREATE INDEX idx_objects_residential_complex ON public.objects(residential_complex_id);
CREATE INDEX idx_residential_complexes_name ON public.residential_complexes(name);

-- Task 3: Add admin read-only access to cleaner_unavailability
CREATE POLICY "Admins can view all cleaner unavailability"
ON public.cleaner_unavailability
FOR SELECT
USING (get_user_role(auth.uid()) = 'admin');