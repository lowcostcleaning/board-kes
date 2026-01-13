-- Insert inventory items for all existing cleaners
INSERT INTO public.user_inventory (user_id, item_code, has_item)
SELECT p.id, i.code, false
FROM public.profiles p
CROSS JOIN public.inventory_items i
WHERE p.role IN ('cleaner', 'demo_cleaner')
ON CONFLICT DO NOTHING;