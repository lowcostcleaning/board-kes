CREATE OR REPLACE FUNCTION public.validate_order_availability()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('app.allow_order_cleaner_swap', true) = 'on' THEN
    RETURN NEW;
  END IF;

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

CREATE OR REPLACE FUNCTION public.swap_order_cleaners(
  p_source_order_id uuid,
  p_target_order_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  source_order public.orders%ROWTYPE;
  target_order public.orders%ROWTYPE;
  caller_role text;
BEGIN
  SELECT * INTO source_order
  FROM public.orders
  WHERE id = p_source_order_id
  FOR UPDATE;

  SELECT * INTO target_order
  FROM public.orders
  WHERE id = p_target_order_id
  FOR UPDATE;

  IF source_order.id IS NULL OR target_order.id IS NULL THEN
    RAISE EXCEPTION 'Уборка не найдена';
  END IF;

  IF source_order.id = target_order.id THEN
    RAISE EXCEPTION 'Нельзя обменять уборку саму с собой';
  END IF;

  caller_role := public.get_user_role(auth.uid());

  IF caller_role <> 'admin' THEN
    IF caller_role NOT IN ('manager', 'demo_manager') THEN
      RAISE EXCEPTION 'Недостаточно прав для обмена уборок';
    END IF;

    IF source_order.manager_id <> auth.uid() OR target_order.manager_id <> auth.uid() THEN
      RAISE EXCEPTION 'Можно менять только свои уборки';
    END IF;
  END IF;

  IF source_order.scheduled_date <> target_order.scheduled_date
    OR source_order.scheduled_time <> target_order.scheduled_time THEN
    RAISE EXCEPTION 'Обмен возможен только для уборок на одно и то же время';
  END IF;

  IF source_order.status IN ('cancelled', 'rejected', 'completed')
    OR target_order.status IN ('cancelled', 'rejected', 'completed') THEN
    RAISE EXCEPTION 'Нельзя обменять отменённую, отклонённую или завершённую уборку';
  END IF;

  IF source_order.cleaner_id = target_order.cleaner_id THEN
    RAISE EXCEPTION 'У уборок уже один и тот же клинер';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.cleaner_unavailability
    WHERE (cleaner_id = target_order.cleaner_id AND date = source_order.scheduled_date)
       OR (cleaner_id = source_order.cleaner_id AND date = target_order.scheduled_date)
  ) THEN
    RAISE EXCEPTION 'Один из клинеров недоступен в выбранную дату';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.cleaner_disabled_times
    WHERE (cleaner_id = target_order.cleaner_id AND time_slot = source_order.scheduled_time)
       OR (cleaner_id = source_order.cleaner_id AND time_slot = target_order.scheduled_time)
  ) THEN
    RAISE EXCEPTION 'Один из клинеров недоступен в выбранное время';
  END IF;

  PERFORM set_config('app.allow_order_cleaner_swap', 'on', true);

  UPDATE public.orders
  SET
    cleaner_id = CASE
      WHEN id = source_order.id THEN target_order.cleaner_id
      WHEN id = target_order.id THEN source_order.cleaner_id
    END,
    status = 'pending_confirmation'
  WHERE id IN (source_order.id, target_order.id);

  PERFORM set_config('app.allow_order_cleaner_swap', '', true);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.swap_order_cleaners(uuid, uuid) TO authenticated;
