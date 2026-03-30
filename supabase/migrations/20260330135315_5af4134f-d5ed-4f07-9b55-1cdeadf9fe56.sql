
-- Table for globally disabled time slots per cleaner
CREATE TABLE public.cleaner_disabled_times (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cleaner_id UUID NOT NULL,
  time_slot TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (cleaner_id, time_slot)
);

ALTER TABLE public.cleaner_disabled_times ENABLE ROW LEVEL SECURITY;

-- Cleaners can manage their own disabled times
CREATE POLICY "Cleaners can view own disabled times" ON public.cleaner_disabled_times
  FOR SELECT TO public USING (auth.uid() = cleaner_id);

CREATE POLICY "Cleaners can insert own disabled times" ON public.cleaner_disabled_times
  FOR INSERT TO public WITH CHECK (auth.uid() = cleaner_id);

CREATE POLICY "Cleaners can delete own disabled times" ON public.cleaner_disabled_times
  FOR DELETE TO public USING (auth.uid() = cleaner_id);

-- Managers can view cleaner disabled times (for order creation)
CREATE POLICY "Managers can view cleaner disabled times" ON public.cleaner_disabled_times
  FOR SELECT TO public USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'demo_manager'))
  );

-- Admins can view all
CREATE POLICY "Admins can view all disabled times" ON public.cleaner_disabled_times
  FOR SELECT TO public USING (get_user_role(auth.uid()) = 'admin');

-- Update the validation trigger to also check disabled times
CREATE OR REPLACE FUNCTION public.validate_order_availability()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if cleaner is unavailable on the scheduled date
  IF EXISTS (
    SELECT 1 FROM public.cleaner_unavailability
    WHERE cleaner_id = NEW.cleaner_id
    AND date = NEW.scheduled_date
  ) THEN
    RAISE EXCEPTION 'Клинер недоступен в выбранную дату';
  END IF;

  -- Check if the time slot is globally disabled for this cleaner
  IF EXISTS (
    SELECT 1 FROM public.cleaner_disabled_times
    WHERE cleaner_id = NEW.cleaner_id
    AND time_slot = NEW.scheduled_time
  ) THEN
    RAISE EXCEPTION 'Клинер недоступен в выбранное время';
  END IF;
  
  RETURN NEW;
END;
$function$;
