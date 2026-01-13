-- Create the levels table
CREATE TABLE IF NOT EXISTS public.levels (
  level INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  min_cleanings INTEGER NOT NULL,
  min_rating NUMERIC(3,2) NOT NULL
);

-- Enable RLS
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;

-- Insert level data
INSERT INTO public.levels (level, title, min_cleanings, min_rating) VALUES
(0, 'Стажёр', 0, 0.00),
(1, 'Новичок', 5, 4.00),
(2, 'Исполнитель', 25, 4.30),
(3, 'Профи', 50, 4.50),
(4, 'Мастер', 100, 4.70),
(5, 'Легенда', 300, 4.85)
ON CONFLICT (level) DO UPDATE SET
  title = EXCLUDED.title,
  min_cleanings = EXCLUDED.min_cleanings,
  min_rating = EXCLUDED.min_rating;

-- Create policy allowing everyone to read levels
CREATE POLICY "levels_read_policy" ON public.levels 
FOR SELECT USING (true);