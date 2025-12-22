-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create objects table for residential complexes and apartments
CREATE TABLE public.objects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  complex_name text NOT NULL,
  apartment_number text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.objects ENABLE ROW LEVEL SECURITY;

-- Managers can view their own objects
CREATE POLICY "Users can view own objects"
ON public.objects
FOR SELECT
USING (auth.uid() = user_id);

-- Managers can insert their own objects
CREATE POLICY "Users can insert own objects"
ON public.objects
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Managers can update their own objects
CREATE POLICY "Users can update own objects"
ON public.objects
FOR UPDATE
USING (auth.uid() = user_id);

-- Managers can delete their own objects
CREATE POLICY "Users can delete own objects"
ON public.objects
FOR DELETE
USING (auth.uid() = user_id);

-- Admins can view all objects
CREATE POLICY "Admins can view all objects"
ON public.objects
FOR SELECT
USING (get_user_role(auth.uid()) = 'admin');

-- Create index for faster queries
CREATE INDEX idx_objects_user_id ON public.objects(user_id);

-- Create updated_at trigger
CREATE TRIGGER update_objects_updated_at
BEFORE UPDATE ON public.objects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();