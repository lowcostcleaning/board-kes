-- Add rating and completed_orders_count to profiles for cleaners
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS rating numeric(3,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS completed_orders_count integer DEFAULT 0 NOT NULL;

-- Add rating field to orders (manager rates cleaner after completion)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS cleaner_rating integer DEFAULT NULL;

-- Add constraint for rating 1-5
ALTER TABLE public.orders 
ADD CONSTRAINT orders_cleaner_rating_check 
CHECK (cleaner_rating IS NULL OR (cleaner_rating >= 1 AND cleaner_rating <= 5));

-- Function to recalculate cleaner's average rating
CREATE OR REPLACE FUNCTION public.recalculate_cleaner_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  avg_rating numeric(3,2);
  cleaner uuid;
BEGIN
  -- Get the cleaner_id from the order
  IF TG_OP = 'UPDATE' THEN
    cleaner := NEW.cleaner_id;
  ELSE
    cleaner := OLD.cleaner_id;
  END IF;
  
  -- Calculate average rating for this cleaner
  SELECT AVG(cleaner_rating)::numeric(3,2) INTO avg_rating
  FROM orders
  WHERE cleaner_id = cleaner AND cleaner_rating IS NOT NULL;
  
  -- Update the cleaner's profile
  UPDATE profiles
  SET rating = avg_rating
  WHERE id = cleaner;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-update rating when order rating changes
CREATE TRIGGER update_cleaner_rating_trigger
AFTER UPDATE OF cleaner_rating ON orders
FOR EACH ROW
WHEN (NEW.cleaner_rating IS DISTINCT FROM OLD.cleaner_rating)
EXECUTE FUNCTION recalculate_cleaner_rating();

-- Function to increment completed orders count when order is completed
CREATE OR REPLACE FUNCTION public.increment_completed_orders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE profiles
    SET completed_orders_count = completed_orders_count + 1
    WHERE id = NEW.cleaner_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for completed orders count
CREATE TRIGGER increment_completed_orders_trigger
AFTER UPDATE OF status ON orders
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
EXECUTE FUNCTION increment_completed_orders();