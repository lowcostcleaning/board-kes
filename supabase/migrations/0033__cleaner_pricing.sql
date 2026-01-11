SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cleaner_pricing' 
ORDER BY ordinal_position;