-- Включим RLS для таблицы residential_complexes если еще не включено
ALTER TABLE residential_complexes ENABLE ROW LEVEL SECURITY;

-- Удалим существующие политики если есть
DROP POLICY IF EXISTS "residential_complexes_select_policy" ON residential_complexes;

-- Создадим политику для чтения ЖК всеми аутентифицированными пользователями
CREATE POLICY "residential_complexes_select_policy" 
ON residential_complexes 
FOR SELECT 
TO authenticated 
USING (true);