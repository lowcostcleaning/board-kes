-- Add manager_id column to residential complexes so every complex can be tied to a manager.
ALTER TABLE public.residential_complexes
ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES public.profiles(id);

-- Function to enforce that managers can only assign their own complexes and cannot leave/stomp on the complex field.
CREATE OR REPLACE FUNCTION public.enforce_manager_object_complex()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  complex_owner uuid;
  is_manager boolean;
BEGIN
  is_manager := EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('manager', 'demo_manager')
  );

  IF is_manager THEN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.residential_complex_id IS DISTINCT FROM OLD.residential_complex_id) THEN
      IF NEW.residential_complex_id IS NULL THEN
        RAISE EXCEPTION 'Менеджер должен выбрать жилой комплекс';
      END IF;

      SELECT manager_id INTO complex_owner
      FROM public.residential_complexes
      WHERE id = NEW.residential_complex_id;

      IF complex_owner IS NULL THEN
        RAISE EXCEPTION 'Жилой комплекс не найден';
      END IF;

      IF complex_owner <> auth.uid() THEN
        RAISE EXCEPTION 'Нельзя привязать ЖК другого менеджера';
      END IF;

      IF TG_OP = 'UPDATE' AND OLD.residential_complex_id IS DISTINCT FROM NEW.residential_complex_id THEN
        RAISE EXCEPTION 'Менеджер не может менять ЖК у существующего объекта';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach the trigger to the objects table.
DROP TRIGGER IF EXISTS enforce_manager_object_complex_trigger ON public.objects;

CREATE TRIGGER enforce_manager_object_complex_trigger
BEFORE INSERT OR UPDATE ON public.objects
FOR EACH ROW
EXECUTE FUNCTION public.enforce_manager_object_complex();