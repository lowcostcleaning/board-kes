-- Проверим существующие политики для residential_complexes
SELECT * FROM pg_policy WHERE polrelid = 'residential_complexes'::regclass;