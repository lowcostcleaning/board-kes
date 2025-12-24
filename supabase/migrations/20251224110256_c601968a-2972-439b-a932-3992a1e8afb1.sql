-- Update notify_new_order to send complete order data
CREATE OR REPLACE FUNCTION public.notify_new_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  supabase_url text := 'https://hiulglwzolseqbsgvacq.supabase.co';
  anon_jwt text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdWxnbHd6b2xzZXFic2d2YWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzOTM0OTcsImV4cCI6MjA4MTk2OTQ5N30.St190th6If8lf2ZwviLURfEHL3gXYhcEN2AzSyPojVc';
  request_id bigint;
BEGIN
  BEGIN
    SELECT net.http_post(
      url := supabase_url || '/functions/v1/send-telegram-notification',
      body := jsonb_build_object(
        'user_id', NEW.cleaner_id,
        'event_type', 'new_order',
        'data', to_jsonb(NEW)
      ),
      params := '{}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_jwt
      ),
      timeout_milliseconds := 5000
    ) INTO request_id;

    RAISE LOG 'notify_new_order: sent full order data, request_id=%', request_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'notify_new_order: failed to queue notification: %', SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

-- Update notify_order_status_changed to send complete order data
CREATE OR REPLACE FUNCTION public.notify_order_status_changed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  supabase_url text := 'https://hiulglwzolseqbsgvacq.supabase.co';
  anon_jwt text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdWxnbHd6b2xzZXFic2d2YWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzOTM0OTcsImV4cCI6MjA4MTk2OTQ5N30.St190th6If8lf2ZwviLURfEHL3gXYhcEN2AzSyPojVc';
  request_id bigint;
  target_user_id uuid;
  event_name text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    target_user_id := NEW.manager_id;
    event_name := CASE WHEN NEW.status = 'completed' THEN 'order_completed' ELSE 'order_status_changed' END;

    BEGIN
      SELECT net.http_post(
        url := supabase_url || '/functions/v1/send-telegram-notification',
        body := jsonb_build_object(
          'user_id', target_user_id,
          'event_type', event_name,
          'data', jsonb_build_object(
            'old', to_jsonb(OLD),
            'new', to_jsonb(NEW)
          )
        ),
        params := '{}'::jsonb,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || anon_jwt
        ),
        timeout_milliseconds := 5000
      ) INTO request_id;

      RAISE LOG 'notify_order_status_changed: sent full order data, request_id=%', request_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'notify_order_status_changed: failed to queue notification: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- Update notify_new_message to send complete message and dialog data
CREATE OR REPLACE FUNCTION public.notify_new_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  supabase_url text := 'https://hiulglwzolseqbsgvacq.supabase.co';
  anon_jwt text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdWxnbHd6b2xzZXFic2d2YWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzOTM0OTcsImV4cCI6MjA4MTk2OTQ5N30.St190th6If8lf2ZwviLURfEHL3gXYhcEN2AzSyPojVc';
  request_id bigint;
  dialog_record record;
  target_user_id uuid;
BEGIN
  BEGIN
    SELECT *
      INTO dialog_record
    FROM public.dialogs
    WHERE id = NEW.dialog_id;

    IF dialog_record.manager_id IS NULL OR dialog_record.cleaner_id IS NULL THEN
      RAISE LOG 'notify_new_message: dialog not found for dialog_id=%', NEW.dialog_id;
      RETURN NEW;
    END IF;

    IF NEW.sender_id = dialog_record.manager_id THEN
      target_user_id := dialog_record.cleaner_id;
    ELSE
      target_user_id := dialog_record.manager_id;
    END IF;

    SELECT net.http_post(
      url := supabase_url || '/functions/v1/send-telegram-notification',
      body := jsonb_build_object(
        'user_id', target_user_id,
        'event_type', 'new_message',
        'data', jsonb_build_object(
          'message', to_jsonb(NEW),
          'dialog', to_jsonb(dialog_record)
        )
      ),
      params := '{}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_jwt
      ),
      timeout_milliseconds := 5000
    ) INTO request_id;

    RAISE LOG 'notify_new_message: sent full message and dialog data, request_id=%', request_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'notify_new_message: failed to queue notification: %', SQLERRM;
  END;

  RETURN NEW;
END;
$function$;