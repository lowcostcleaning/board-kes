-- Create function to populate user_inventory for new cleaners
CREATE OR REPLACE FUNCTION public.populate_user_inventory()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert all inventory items for the new cleaner with has_item = false
  INSERT INTO public.user_inventory (user_id, item_code, has_item)
  SELECT NEW.id, code, false
  FROM public.inventory_items
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run when a new profile is created
CREATE TRIGGER populate_user_inventory_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.role IN ('cleaner', 'demo_cleaner'))
  EXECUTE FUNCTION public.populate_user_inventory();