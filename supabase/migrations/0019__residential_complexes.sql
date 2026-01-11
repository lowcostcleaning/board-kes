-- Проверим политики доступа для таблицы residential_complexes
SELECT * FROM pg_policy WHERE polrelid = 'residential_complexes'::regclass;