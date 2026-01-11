-- Удаляем старую политику, использующую get_user_role
DROP POLICY IF EXISTS "Admins can view all residential complexes" ON public.residential_complexes;

-- Создаем новую политику, использующую is_admin()
CREATE POLICY "Admins can view all residential complexes" ON public.residential_complexes
FOR SELECT TO authenticated
USING (is_admin());