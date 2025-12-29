-- Add UPDATE policies for dialogs table

-- Managers can update their read status in their dialogs
CREATE POLICY "Managers can update their read status" 
ON public.dialogs 
FOR UPDATE 
TO authenticated
USING (auth.uid() = manager_id);

-- Cleaners can update their read status in their dialogs  
CREATE POLICY "Cleaners can update their read status" 
ON public.dialogs 
FOR UPDATE 
TO authenticated
USING (auth.uid() = cleaner_id);