-- Проверим существование и структуру таблицы cleaner_objects
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'cleaner_objects' 
ORDER BY ordinal_position;