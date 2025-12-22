-- Allow authenticated users to READ private storage objects via signed URLs
-- (required for createSignedUrl to return a URL)

-- Chat attachments: user must be a participant in the dialog of the message
CREATE POLICY "Users can read chat files in their dialogs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat_files'
  AND EXISTS (
    SELECT 1
    FROM public.message_files mf
    JOIN public.messages m ON m.id = mf.message_id
    JOIN public.dialogs d ON d.id = m.dialog_id
    WHERE (
      mf.file_url = storage.objects.name
      OR split_part(split_part(mf.file_url, '/chat_files/', 2), '?', 1) = storage.objects.name
    )
    AND (d.manager_id = auth.uid() OR d.cleaner_id = auth.uid())
  )
);

-- Report attachments: user must be the manager/cleaner for the order
CREATE POLICY "Users can read report files for their orders"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'reports'
  AND EXISTS (
    SELECT 1
    FROM public.report_files rf
    JOIN public.completion_reports cr ON cr.id = rf.report_id
    JOIN public.orders o ON o.id = cr.order_id
    WHERE rf.file_path = storage.objects.name
      AND (o.manager_id = auth.uid() OR o.cleaner_id = auth.uid())
  )
);