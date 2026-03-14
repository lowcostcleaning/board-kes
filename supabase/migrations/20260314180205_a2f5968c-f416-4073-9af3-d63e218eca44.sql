CREATE OR REPLACE FUNCTION public.add_pricing_for_new_complex()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.cleaner_pricing (user_id, complex_id)
  SELECT p.id, NEW.id
  FROM public.profiles p
  WHERE p.role = 'cleaner'
    AND NOT EXISTS (
      SELECT 1 FROM public.cleaner_pricing cp
      WHERE cp.user_id = p.id
        AND cp.complex_id = NEW.id
    );
  RETURN NEW;
END;
$function$;