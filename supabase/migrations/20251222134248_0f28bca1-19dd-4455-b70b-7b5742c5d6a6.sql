-- Create dialogs table
CREATE TABLE public.dialogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cleaner_id uuid NOT NULL,
  manager_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(cleaner_id, manager_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dialog_id uuid NOT NULL REFERENCES public.dialogs(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('manager', 'cleaner')),
  text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dialogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- RLS policies for dialogs
CREATE POLICY "Managers can view their dialogs"
ON public.dialogs FOR SELECT
USING (auth.uid() = manager_id);

CREATE POLICY "Cleaners can view their dialogs"
ON public.dialogs FOR SELECT
USING (auth.uid() = cleaner_id);

CREATE POLICY "Managers can create dialogs"
ON public.dialogs FOR INSERT
WITH CHECK (auth.uid() = manager_id);

-- RLS policies for messages
CREATE POLICY "Users can view messages in their dialogs"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.dialogs
    WHERE dialogs.id = messages.dialog_id
    AND (dialogs.manager_id = auth.uid() OR dialogs.cleaner_id = auth.uid())
  )
);

CREATE POLICY "Users can send messages in their dialogs"
ON public.messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.dialogs
    WHERE dialogs.id = messages.dialog_id
    AND (dialogs.manager_id = auth.uid() OR dialogs.cleaner_id = auth.uid())
  )
);