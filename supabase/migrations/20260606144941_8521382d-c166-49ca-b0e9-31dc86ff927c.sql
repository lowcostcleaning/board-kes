ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS visible_to_managers boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS telegram_username text;