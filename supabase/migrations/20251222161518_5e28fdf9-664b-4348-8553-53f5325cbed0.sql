-- Add columns to track last read message for each participant
ALTER TABLE public.dialogs
ADD COLUMN manager_last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN cleaner_last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now();