-- Create inventory_items table
CREATE TABLE public.inventory_items (
  code TEXT PRIMARY KEY,
  title TEXT NOT NULL
);

-- Insert base inventory items
INSERT INTO public.inventory_items (code, title) VALUES
('mop', 'Швабра'),
('bucket_fold', 'Ведро складное'),
('vacuum', 'Пылесос'),
('chem_glass', 'Химия для стекол'),
('chem_dust', 'Химия для пыли'),
('chem_limescale', 'Химия от накипи'),
('chem_toilet', 'Химия для туалета'),
('chem_floor', 'Химия для пола'),
('cloth_floor', 'Тряпка для пола'),
('cloth_glass', 'Тряпка для стекол'),
('cloth_general', 'Тряпка универсальная'),
('squeegee', 'Скребок');