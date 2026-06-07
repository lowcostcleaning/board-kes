-- The app uses pending_confirmation while waiting for cleaner approval and
-- rejected when a cleaner declines. Keep the database check constraint aligned
-- with the statuses used by the UI and order flows.
ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
ADD CONSTRAINT orders_status_check
CHECK (status IN (
  'pending',
  'pending_confirmation',
  'confirmed',
  'completed',
  'cancelled',
  'rejected'
));
