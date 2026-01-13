-- Create user_inventory table
CREATE TABLE public.user_inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_code TEXT REFERENCES public.inventory_items(code) ON DELETE CASCADE,
  has_item BOOLEAN DEFAULT FALSE,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;

-- Create policies for cleaners (can only access their own inventory)
CREATE POLICY "cleaners_can_view_own_inventory" ON public.user_inventory 
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "cleaners_can_update_own_inventory" ON public.user_inventory 
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Create policies for managers/admins (can view all, but can't change has_item)
CREATE POLICY "managers_admins_can_view_all_inventory" ON public.user_inventory 
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('manager', 'admin', 'demo_manager')
  )
);

-- Policy to prevent managers/admins from updating has_item
CREATE POLICY "managers_admins_cannot_update_has_item" ON public.user_inventory 
FOR UPDATE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('manager', 'admin', 'demo_manager')
  )
)
WITH CHECK (
  has_item = has_item -- Prevents changing has_item
);