-- Включим RLS для таблицы residential_complexes
ALTER TABLE residential_complexes ENABLE ROW LEVEL SECURITY;

-- Создадим политику для чтения ЖК всеми аутентифицированными пользователями
CREATE POLICY "residential_complexes_select_policy" 
ON residential_complexes 
FOR SELECT 
TO authenticated 
USING (true);

-- Создадим политику для вставки ЖК администраторами
CREATE POLICY "residential_complexes_insert_policy" 
ON residential_complexes 
FOR INSERT 
TO authenticated 
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Создадим политику для обновления ЖК администраторами
CREATE POLICY "residential_complexes_update_policy" 
ON residential_complexes 
FOR UPDATE 
TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Создадим политику для удаления ЖК администраторами
CREATE POLICY "residential_complexes_delete_policy" 
ON residential_complexes 
FOR DELETE 
TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));