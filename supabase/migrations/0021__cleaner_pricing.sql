-- Проверим политики доступа для таблицы cleaner_pricing
SELECT * FROM pg_policy WHERE polrelid = 'cleaner_pricing'::regclass;