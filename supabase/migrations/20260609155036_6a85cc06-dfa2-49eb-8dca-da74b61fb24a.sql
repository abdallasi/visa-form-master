
CREATE TABLE public.cova_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.cova_submissions TO anon;
GRANT SELECT, INSERT ON public.cova_submissions TO authenticated;
GRANT ALL ON public.cova_submissions TO service_role;
ALTER TABLE public.cova_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit" ON public.cova_submissions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can view" ON public.cova_submissions FOR SELECT TO anon, authenticated USING (true);
