-- Create table for cleaner pricing by residential complex
CREATE TABLE public.cleaner_pricing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  complex_id UUID NOT NULL REFERENCES public.residential_complexes(id) ON DELETE CASCADE,
  price_studio INTEGER,
  price_one_plus_one INTEGER,
  price_two_plus_one INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, complex_id)
);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.cleaner_pricing ENABLE ROW LEVEL SECURITY;

-- Create policies for each operation
CREATE POLICY "cleaner_pricing_select_policy" ON public.cleaner_pricing 
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "cleaner_pricing_insert_policy" ON public.cleaner_pricing 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cleaner_pricing_update_policy" ON public.cleaner_pricing 
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "cleaner_pricing_delete_policy" ON public.cleaner_pricing 
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cleaner_pricing_updated_at
  BEFORE UPDATE ON public.cleaner_pricing
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();