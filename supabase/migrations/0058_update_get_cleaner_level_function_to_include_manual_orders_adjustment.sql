CREATE OR REPLACE FUNCTION public.get_cleaner_level(p_cleaner_id uuid)
 RETURNS SETOF levels
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  cleaner_has_all_base_items BOOLEAN;
  cleaner_stats RECORD;
  cleaner_profile RECORD;
  final_cleanings INTEGER;
BEGIN
  -- 1) Check base inventory
  SELECT
    (SELECT COUNT(ui.id) FROM public.user_inventory ui WHERE ui.user_id = p_cleaner_id AND ui.has_item = TRUE) =
    (SELECT COUNT(ii.code) FROM public.inventory_items ii)
  INTO cleaner_has_all_base_items;

  IF NOT cleaner_has_all_base_items THEN
    RETURN QUERY SELECT * FROM public.levels WHERE level = 0;
    RETURN;
  END IF;

  -- 2) If inventory is complete, calculate level based on stats and manual adjustment
  SELECT
    csv.total_cleanings,
    csv.avg_rating
  INTO cleaner_stats
  FROM public.cleaner_stats_view csv
  WHERE csv.cleaner_id = p_cleaner_id;

  -- Get manual orders adjustment from profiles
  SELECT
    p.manual_orders_adjustment
  INTO cleaner_profile
  FROM public.profiles p
  WHERE p.id = p_cleaner_id;

  -- If no stats found (e.g., new cleaner), default to level 0
  IF cleaner_stats IS NULL OR cleaner_stats.total_cleanings IS NULL THEN
    RETURN QUERY SELECT * FROM public.levels WHERE level = 0;
    RETURN;
  END IF;

  -- Calculate final cleanings including manual adjustment
  final_cleanings := cleaner_stats.total_cleanings + COALESCE(cleaner_profile.manual_orders_adjustment, 0);

  -- Find the highest level that the cleaner qualifies for
  RETURN QUERY
  SELECT l.*
  FROM public.levels l
  WHERE
    l.min_cleanings <= final_cleanings AND
    l.min_rating <= cleaner_stats.avg_rating
  ORDER BY l.level DESC
  LIMIT 1;

END;
$function$