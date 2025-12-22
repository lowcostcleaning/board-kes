-- Add pricing columns to profiles for cleaners
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS price_studio integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS price_one_plus_one integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS price_two_plus_one integer DEFAULT NULL;

-- Add apartment type to objects
ALTER TABLE public.objects
ADD COLUMN IF NOT EXISTS apartment_type text DEFAULT NULL;

-- Add check constraint for apartment_type
ALTER TABLE public.objects
ADD CONSTRAINT objects_apartment_type_check 
CHECK (apartment_type IN ('studio', '1+1', '2+1') OR apartment_type IS NULL);