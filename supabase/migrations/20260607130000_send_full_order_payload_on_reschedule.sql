-- Keep reschedule notifications compatible with the existing n8n "new order"
-- branch by sending the full order row. n8n needs cleaner_id, object_id,
-- scheduled_date, scheduled_time, and status to build the Telegram message.
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
        'data',
          to_jsonb(NEW) ||
          jsonb_build_object('status', 'pending')
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
  event_name text;
BEGIN
  IF
    OLD.cleaner_id IS DISTINCT FROM NEW.cleaner_id OR
    OLD.scheduled_date IS DISTINCT FROM NEW.scheduled_date OR
    OLD.scheduled_time IS DISTINCT FROM NEW.scheduled_time
  THEN
    BEGIN
      SELECT net.http_post(
        url := supabase_url || '/functions/v1/send-telegram-notification',
        body := jsonb_build_object(
          'user_id', NEW.cleaner_id,
          'event_type', 'new_order',
          'data',
            to_jsonb(NEW) ||
            jsonb_build_object(
              'status', 'pending',
              'is_rescheduled', true,
              'old_scheduled_date', OLD.scheduled_date,
              'old_scheduled_time', OLD.scheduled_time,
              'old_cleaner_id', OLD.cleaner_id
            )
        ),
        params := '{}'::jsonb,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || anon_jwt
        ),
        timeout_milliseconds := 5000
      ) INTO request_id;

      RAISE LOG 'notify_order_status_changed: sent cleaner reschedule notification, request_id=%', request_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'notify_order_status_changed: failed to queue cleaner reschedule notification: %', SQLERRM;
    END;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    event_name := CASE WHEN NEW.status = 'completed' THEN 'order_completed' ELSE 'order_status_changed' END;

    BEGIN
      SELECT net.http_post(
        url := supabase_url || '/functions/v1/send-telegram-notification',
        body := jsonb_build_object(
          'user_id', NEW.manager_id,
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

      RAISE LOG 'notify_order_status_changed: sent manager status notification, request_id=%', request_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'notify_order_status_changed: failed to queue manager status notification: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$function$;
