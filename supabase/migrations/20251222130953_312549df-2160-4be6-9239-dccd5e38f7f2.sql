-- Add name column to profiles table
ALTER TABLE public.profiles ADD COLUMN name text;

-- Update RLS policy to allow users to update their own name
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);