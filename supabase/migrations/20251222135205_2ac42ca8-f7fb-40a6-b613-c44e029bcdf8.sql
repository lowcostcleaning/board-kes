-- Create completion_reports table
CREATE TABLE public.completion_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

-- Create report_files table
CREATE TABLE public.report_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.completion_reports(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_type text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.completion_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_files ENABLE ROW LEVEL SECURITY;

-- Create storage bucket for reports
INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', true);

-- RLS policies for completion_reports
CREATE POLICY "Cleaners can create reports for their orders"
ON public.completion_reports FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = completion_reports.order_id
    AND orders.cleaner_id = auth.uid()
  )
);

CREATE POLICY "Cleaners can view their reports"
ON public.completion_reports FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = completion_reports.order_id
    AND orders.cleaner_id = auth.uid()
  )
);

CREATE POLICY "Managers can view reports for their orders"
ON public.completion_reports FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = completion_reports.order_id
    AND orders.manager_id = auth.uid()
  )
);

-- RLS policies for report_files
CREATE POLICY "Cleaners can create report files"
ON public.report_files FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.completion_reports cr
    JOIN public.orders o ON o.id = cr.order_id
    WHERE cr.id = report_files.report_id
    AND o.cleaner_id = auth.uid()
  )
);

CREATE POLICY "Cleaners can view their report files"
ON public.report_files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.completion_reports cr
    JOIN public.orders o ON o.id = cr.order_id
    WHERE cr.id = report_files.report_id
    AND o.cleaner_id = auth.uid()
  )
);

CREATE POLICY "Managers can view report files for their orders"
ON public.report_files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.completion_reports cr
    JOIN public.orders o ON o.id = cr.order_id
    WHERE cr.id = report_files.report_id
    AND o.manager_id = auth.uid()
  )
);

-- Storage policies for reports bucket
CREATE POLICY "Authenticated users can upload reports"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'reports' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view reports"
ON storage.objects FOR SELECT
USING (bucket_id = 'reports');