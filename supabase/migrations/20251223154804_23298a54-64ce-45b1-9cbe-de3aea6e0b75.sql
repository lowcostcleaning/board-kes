-- Create table for cleaner unavailability (busy days)
CREATE TABLE public.cleaner_unavailability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cleaner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cleaner_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.cleaner_unavailability ENABLE ROW LEVEL SECURITY;

-- Create policies for cleaner access
CREATE POLICY "Cleaners can view their own unavailability" 
ON public.cleaner_unavailability 
FOR SELECT 
USING (auth.uid() = cleaner_id);

CREATE POLICY "Cleaners can create their own unavailability" 
ON public.cleaner_unavailability 
FOR INSERT 
WITH CHECK (auth.uid() = cleaner_id);

CREATE POLICY "Cleaners can delete their own unavailability" 
ON public.cleaner_unavailability 
FOR DELETE 
USING (auth.uid() = cleaner_id);

-- Managers can view cleaner unavailability (for scheduling)
CREATE POLICY "Managers can view all cleaner unavailability" 
ON public.cleaner_unavailability 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'manager'
  )
);