-- Create the cleaner_stats_view
CREATE OR REPLACE VIEW public.cleaner_stats_view AS
SELECT 
  cleaner_id,
  COUNT(*) AS total_cleanings,
  ROUND(AVG(cleaner_rating)::numeric, 2) AS avg_rating,
  COUNT(CASE WHEN cleaner_rating >= 4 THEN 1 END) AS clean_jobs,
  CASE 
    WHEN COUNT(*) > 0 THEN 
      ROUND((COUNT(CASE WHEN cleaner_rating >= 4 THEN 1 END)::decimal / COUNT(*)) * 100, 2)
    ELSE 0 
  END AS clean_rate
FROM public.orders
WHERE status = 'completed' AND cleaner_rating IS NOT NULL
GROUP BY cleaner_id;