-- Create storage bucket for chat files
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat_files', 'chat_files', true)
ON CONFLICT (id) DO NOTHING;

-- Create message_files table
CREATE TABLE public.message_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.message_files ENABLE ROW LEVEL SECURITY;

-- RLS policies for message_files
-- Users can view files in their dialogs
CREATE POLICY "Users can view message files in their dialogs"
ON public.message_files
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN dialogs d ON d.id = m.dialog_id
    WHERE m.id = message_files.message_id
    AND (d.manager_id = auth.uid() OR d.cleaner_id = auth.uid())
  )
);

-- Users can insert files for their own messages
CREATE POLICY "Users can insert files for their messages"
ON public.message_files
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM messages m
    WHERE m.id = message_files.message_id
    AND m.sender_id = auth.uid()
  )
);

-- Storage policies for chat_files bucket
-- Anyone can view chat files (for simplicity, as messages already have RLS)
CREATE POLICY "Anyone can view chat files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'chat_files');

-- Authenticated users can upload to chat_files
CREATE POLICY "Authenticated users can upload chat files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'chat_files'
  AND auth.role() = 'authenticated'
);