-- Enable the pg_net extension for HTTP requests from database triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to send notification via Edge Function when new order is created
CREATE OR REPLACE FUNCTION public.notify_new_order()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url text := 'https://hiulglwzolseqbsgvacq.supabase.co';
  service_role_key text;
  request_id bigint;
BEGIN
  -- Get service role key from vault (or use anon key for now)
  service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdWxnbHd6b2xzZXFic2d2YWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzOTM0OTcsImV4cCI6MjA4MTk2OTQ5N30.St190th6If8lf2ZwviLURfEHL3gXYhcEN2AzSyPojVc';
  
  -- Send notification to the cleaner about new order
  SELECT extensions.http_post(
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
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    )
  ) INTO request_id;
  
  RAISE LOG 'Sent new order notification, request_id: %', request_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to send notification when order status changes
CREATE OR REPLACE FUNCTION public.notify_order_status_changed()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url text := 'https://hiulglwzolseqbsgvacq.supabase.co';
  service_role_key text;
  request_id bigint;
  target_user_id uuid;
BEGIN
  service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdWxnbHd6b2xzZXFic2d2YWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzOTM0OTcsImV4cCI6MjA4MTk2OTQ5N30.St190th6If8lf2ZwviLURfEHL3gXYhcEN2AzSyPojVc';
  
  -- Only trigger if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notify manager about status changes
    target_user_id := NEW.manager_id;
    
    SELECT extensions.http_post(
      url := supabase_url || '/functions/v1/send-telegram-notification',
      body := jsonb_build_object(
        'user_id', target_user_id,
        'event_type', CASE WHEN NEW.status = 'completed' THEN 'order_completed' ELSE 'order_status_changed' END,
        'data', jsonb_build_object(
          'order_id', NEW.id,
          'old_status', OLD.status,
          'new_status', NEW.status,
          'scheduled_date', NEW.scheduled_date
        )
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      )
    ) INTO request_id;
    
    RAISE LOG 'Sent order status notification, request_id: %', request_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to send notification when new message is sent
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url text := 'https://hiulglwzolseqbsgvacq.supabase.co';
  service_role_key text;
  request_id bigint;
  dialog_record record;
  target_user_id uuid;
BEGIN
  service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdWxnbHd6b2xzZXFic2d2YWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzOTM0OTcsImV4cCI6MjA4MTk2OTQ5N30.St190th6If8lf2ZwviLURfEHL3gXYhcEN2AzSyPojVc';
  
  -- Get dialog to find the recipient
  SELECT * INTO dialog_record FROM dialogs WHERE id = NEW.dialog_id;
  
  -- Determine the recipient (the other party in the dialog)
  IF NEW.sender_id = dialog_record.manager_id THEN
    target_user_id := dialog_record.cleaner_id;
  ELSE
    target_user_id := dialog_record.manager_id;
  END IF;
  
  SELECT extensions.http_post(
    url := supabase_url || '/functions/v1/send-telegram-notification',
    body := jsonb_build_object(
      'user_id', target_user_id,
      'event_type', 'new_message',
      'data', jsonb_build_object(
        'dialog_id', NEW.dialog_id,
        'message_preview', LEFT(NEW.text, 100)
      )
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    )
  ) INTO request_id;
  
  RAISE LOG 'Sent new message notification, request_id: %', request_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_notify_new_order ON orders;
CREATE TRIGGER trigger_notify_new_order
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_order();

DROP TRIGGER IF EXISTS trigger_notify_order_status ON orders;
CREATE TRIGGER trigger_notify_order_status
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_order_status_changed();

DROP TRIGGER IF EXISTS trigger_notify_new_message ON messages;
CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();