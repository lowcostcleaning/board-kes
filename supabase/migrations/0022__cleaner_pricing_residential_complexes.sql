-- Проверим структуру таблицы residential_complexes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'residential_complexes' 
ORDER BY ordinal_position;

-- Проверим структуру таблицы cleaner_pricing
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'cleaner_pricing' 
ORDER BY ordinal_position;