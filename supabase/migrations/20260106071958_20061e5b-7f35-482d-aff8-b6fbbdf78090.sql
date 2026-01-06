-- 1. Add is_active column to profiles for soft delete
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 2. Create admin_notifications table for registration notifications
CREATE TABLE public.admin_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  user_role text NOT NULL,
  notification_type text NOT NULL DEFAULT 'user_registration',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  read_at timestamp with time zone,
  resolved_at timestamp with time zone,
  resolved_by uuid
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Only admins can view notifications
CREATE POLICY "Admins can view all notifications"
ON public.admin_notifications
FOR SELECT
USING (get_user_role(auth.uid()) = 'admin'::text);

-- Only admins can update notifications (mark as read/resolved)
CREATE POLICY "Admins can update notifications"
ON public.admin_notifications
FOR UPDATE
USING (get_user_role(auth.uid()) = 'admin'::text);

-- System can insert notifications (via trigger)
CREATE POLICY "System can insert notifications"
ON public.admin_notifications
FOR INSERT
WITH CHECK (true);

-- 3. Create trigger function to generate admin notification on user registration
CREATE OR REPLACE FUNCTION public.create_admin_notification_on_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.admin_notifications (
    user_id,
    user_email,
    user_role,
    notification_type,
    status
  ) VALUES (
    NEW.id,
    COALESCE(NEW.email, 'unknown'),
    NEW.role,
    'user_registration',
    'pending'
  );
  RETURN NEW;
END;
$function$;

-- 4. Create trigger on profiles table for new registrations
CREATE TRIGGER on_profile_created_notify_admin
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_admin_notification_on_registration();

-- 5. Create index for filtering users
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_status ON public.admin_notifications(status);