-- Ensure pg_net is installed (creates schema net and http_* helpers)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Fix notification trigger functions to use correct net.http_post signature

CREATE OR REPLACE FUNCTION public.notify_new_order()
RETURNS TRIGGER AS $$
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
        'data', jsonb_build_object(
          'order_id', NEW.id,
          'scheduled_date', NEW.scheduled_date,
          'scheduled_time', NEW.scheduled_time
        )
      ),
      params := '{}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_jwt
      ),
      timeout_milliseconds := 5000
    ) INTO request_id;

    RAISE LOG 'notify_new_order: queued http_post request_id=%', request_id;
  EXCEPTION WHEN OTHERS THEN
    -- Never block order creation because notification failed
    RAISE LOG 'notify_new_order: failed to queue notification: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


CREATE OR REPLACE FUNCTION public.notify_order_status_changed()
RETURNS TRIGGER AS $$
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
            'order_id', NEW.id,
            'old_status', OLD.status,
            'new_status', NEW.status,
            'scheduled_date', NEW.scheduled_date,
            'scheduled_time', NEW.scheduled_time
          )
        ),
        params := '{}'::jsonb,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || anon_jwt
        ),
        timeout_milliseconds := 5000
      ) INTO request_id;

      RAISE LOG 'notify_order_status_changed: queued http_post request_id=%', request_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'notify_order_status_changed: failed to queue notification: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url text := 'https://hiulglwzolseqbsgvacq.supabase.co';
  anon_jwt text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdWxnbHd6b2xzZXFic2d2YWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzOTM0OTcsImV4cCI6MjA4MTk2OTQ5N30.St190th6If8lf2ZwviLURfEHL3gXYhcEN2AzSyPojVc';
  request_id bigint;
  dialog_record record;
  target_user_id uuid;
BEGIN
  BEGIN
    SELECT manager_id, cleaner_id
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
          'dialog_id', NEW.dialog_id,
          'message_preview', LEFT(NEW.text, 100)
        )
      ),
      params := '{}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_jwt
      ),
      timeout_milliseconds := 5000
    ) INTO request_id;

    RAISE LOG 'notify_new_message: queued http_post request_id=%', request_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'notify_new_message: failed to queue notification: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
