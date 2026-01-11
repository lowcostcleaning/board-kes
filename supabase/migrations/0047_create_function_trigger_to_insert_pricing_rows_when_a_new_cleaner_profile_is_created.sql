CREATE OR REPLACE FUNCTION public.add_pricing_for_new_cleaner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only run for cleaners
  IF NEW.role = 'cleaner' THEN
    INSERT INTO public.cleaner_pricing (cleaner_id, residential_complex_id)
    SELECT NEW.id, c.id
    FROM public.residential_complexes c
    WHERE NOT EXISTS (
      SELECT 1 FROM public.cleaner_pricing cp
      WHERE cp.cleaner_id = NEW.id
        AND cp.residential_complex_id = c.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_add_pricing_on_profile_insert ON public.profiles;
CREATE TRIGGER trg_add_pricing_on_profile_insert
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.add_pricing_for_new_cleaner();