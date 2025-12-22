-- Create orders table
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cleaner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  object_id uuid NOT NULL REFERENCES public.objects(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  scheduled_time text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Managers can view their own orders
CREATE POLICY "Managers can view own orders"
ON public.orders
FOR SELECT
USING (auth.uid() = manager_id);

-- Managers can create orders
CREATE POLICY "Managers can create orders"
ON public.orders
FOR INSERT
WITH CHECK (auth.uid() = manager_id);

-- Managers can update their own orders
CREATE POLICY "Managers can update own orders"
ON public.orders
FOR UPDATE
USING (auth.uid() = manager_id);

-- Cleaners can view orders assigned to them
CREATE POLICY "Cleaners can view assigned orders"
ON public.orders
FOR SELECT
USING (auth.uid() = cleaner_id);

-- Cleaners can update orders assigned to them (e.g., mark as completed)
CREATE POLICY "Cleaners can update assigned orders"
ON public.orders
FOR UPDATE
USING (auth.uid() = cleaner_id);

-- Admins can view all orders
CREATE POLICY "Admins can view all orders"
ON public.orders
FOR SELECT
USING (get_user_role(auth.uid()) = 'admin');

-- Create indexes
CREATE INDEX idx_orders_manager_id ON public.orders(manager_id);
CREATE INDEX idx_orders_cleaner_id ON public.orders(cleaner_id);
CREATE INDEX idx_orders_scheduled_date ON public.orders(scheduled_date);

-- Create updated_at trigger
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();