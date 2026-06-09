
CREATE POLICY "Anyone can upload cova files" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'cova-files');
CREATE POLICY "Anyone can read cova files" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'cova-files');
