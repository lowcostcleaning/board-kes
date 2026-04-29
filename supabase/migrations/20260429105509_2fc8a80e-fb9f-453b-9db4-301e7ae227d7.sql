CREATE OR REPLACE FUNCTION public.add_pricing_for_new_cleaner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  IF NEW.role = 'cleaner' THEN
    INSERT INTO public.cleaner_pricing (user_id, complex_id)
    SELECT NEW.id, c.id
    FROM public.residential_complexes c
    WHERE NOT EXISTS (
      SELECT 1 FROM public.cleaner_pricing cp
      WHERE cp.user_id = NEW.id
        AND cp.complex_id = c.id
    );
  END IF;
  RETURN NEW;
END;
$function$;