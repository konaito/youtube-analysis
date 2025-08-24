-- Add storage_path column to download_logs table
ALTER TABLE download_logs ADD COLUMN storage_path TEXT;

-- Add index for storage_path for faster queries
CREATE INDEX idx_download_logs_storage_path ON download_logs(storage_path);

-- Enable storage for video files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'videos',
    'videos',
    true,
    1073741824, -- 1GB limit
    ARRAY['video/mp4', 'audio/mpeg', 'audio/mp3']
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for storage
CREATE POLICY "Users can upload their own videos" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'videos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Videos are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'videos');

CREATE POLICY "Users can update their own videos" 
ON storage.objects FOR UPDATE 
USING (
    bucket_id = 'videos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own videos" 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'videos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);