-- Add status column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN status text NOT NULL DEFAULT 'pending' 
CHECK (status IN ('pending', 'approved'));

-- Update existing profiles to 'approved' (or you may want 'pending' for new users)
UPDATE public.profiles SET status = 'approved' WHERE role = 'admin';

-- Create index for status queries
CREATE INDEX idx_profiles_status ON public.profiles(status);