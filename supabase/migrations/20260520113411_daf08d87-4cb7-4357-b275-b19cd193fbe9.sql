CREATE OR REPLACE FUNCTION public.validate_order_availability()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.cleaner_unavailability
    WHERE cleaner_id = NEW.cleaner_id
    AND date = NEW.scheduled_date
  ) THEN
    RAISE EXCEPTION 'Клинер недоступен в выбранную дату';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.cleaner_disabled_times
    WHERE cleaner_id = NEW.cleaner_id
    AND time_slot = NEW.scheduled_time
  ) THEN
    RAISE EXCEPTION 'Клинер недоступен в выбранное время';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.orders
    WHERE cleaner_id = NEW.cleaner_id
      AND scheduled_date = NEW.scheduled_date
      AND scheduled_time = NEW.scheduled_time
      AND status <> 'cancelled'
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'У клинера уже есть уборка на это время';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS validate_order_availability_trigger ON public.orders;
CREATE TRIGGER validate_order_availability_trigger
BEFORE INSERT OR UPDATE OF scheduled_date, scheduled_time, cleaner_id ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.validate_order_availability();