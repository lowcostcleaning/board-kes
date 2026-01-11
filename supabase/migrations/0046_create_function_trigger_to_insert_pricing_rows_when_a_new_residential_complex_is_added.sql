CREATE OR REPLACE FUNCTION public.add_pricing_for_new_complex()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert a pricing row for every cleaner for the new complex if missing
  INSERT INTO public.cleaner_pricing (cleaner_id, residential_complex_id)
  SELECT p.id, NEW.id
  FROM public.profiles p
  WHERE p.role = 'cleaner'
    AND NOT EXISTS (
      SELECT 1 FROM public.cleaner_pricing cp
      WHERE cp.cleaner_id = p.id
        AND cp.residential_complex_id = NEW.id
    );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_add_pricing_on_complex_insert ON public.residential_complexes;
CREATE TRIGGER trg_add_pricing_on_complex_insert
AFTER INSERT ON public.residential_complexes
FOR EACH ROW
EXECUTE FUNCTION public.add_pricing_for_new_complex();