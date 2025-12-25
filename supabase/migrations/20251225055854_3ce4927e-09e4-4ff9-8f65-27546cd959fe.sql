
-- Add avatar_url column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Add phone column to profiles  
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: anyone can view avatars (public bucket)
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Storage policy: authenticated users can upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage policy: users can update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage policy: users can delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create a function to validate order creation doesn't conflict with cleaner unavailability
CREATE OR REPLACE FUNCTION public.validate_order_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if cleaner is unavailable on the scheduled date
  IF EXISTS (
    SELECT 1 FROM public.cleaner_unavailability
    WHERE cleaner_id = NEW.cleaner_id
    AND date = NEW.scheduled_date
  ) THEN
    RAISE EXCEPTION 'Клинер недоступен в выбранную дату';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to validate order availability before insert
DROP TRIGGER IF EXISTS validate_order_availability_trigger ON public.orders;
CREATE TRIGGER validate_order_availability_trigger
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_order_availability();
