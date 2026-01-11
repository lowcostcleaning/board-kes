-- Включим RLS для таблицы cleaner_pricing если еще не включено
ALTER TABLE cleaner_pricing ENABLE ROW LEVEL SECURITY;

-- Удалим существующие политики если есть
DROP POLICY IF EXISTS "cleaner_pricing_select_policy" ON cleaner_pricing;
DROP POLICY IF EXISTS "cleaner_pricing_insert_policy" ON cleaner_pricing;
DROP POLICY IF EXISTS "cleaner_pricing_update_policy" ON cleaner_pricing;
DROP POLICY IF EXISTS "cleaner_pricing_delete_policy" ON cleaner_pricing;

-- Создадим политику для чтения цен только для владельца
CREATE POLICY "cleaner_pricing_select_policy" 
ON cleaner_pricing 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Создадим политику для вставки цен только для владельца
CREATE POLICY "cleaner_pricing_insert_policy" 
ON cleaner_pricing 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Создадим политику для обновления цен только для владельца
CREATE POLICY "cleaner_pricing_update_policy" 
ON cleaner_pricing 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

-- Создадим политику для удаления цен только для владельца
CREATE POLICY "cleaner_pricing_delete_policy" 
ON cleaner_pricing 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);