-- Create download_logs table to store YouTube download history
CREATE TABLE download_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL,
    video_title TEXT NOT NULL,
    video_channel TEXT,
    video_duration TEXT,
    video_thumbnail_url TEXT,
    download_format TEXT NOT NULL CHECK (download_format IN ('mp4', 'mp3')),
    file_size_bytes BIGINT,
    download_status TEXT NOT NULL DEFAULT 'completed' CHECK (download_status IN ('completed', 'failed', 'in_progress')),
    downloaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_download_logs_user_id ON download_logs(user_id);
CREATE INDEX idx_download_logs_downloaded_at ON download_logs(downloaded_at DESC);
CREATE INDEX idx_download_logs_video_id ON download_logs(video_id);

-- Enable Row Level Security
ALTER TABLE download_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own download logs
CREATE POLICY "Users can view their own download logs" 
ON download_logs FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own download logs
CREATE POLICY "Users can insert their own download logs" 
ON download_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own download logs
CREATE POLICY "Users can update their own download logs" 
ON download_logs FOR UPDATE 
USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_download_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_download_logs_updated_at
    BEFORE UPDATE ON download_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_download_logs_updated_at();