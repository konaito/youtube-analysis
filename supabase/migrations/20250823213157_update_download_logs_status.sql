-- Update download_status constraint to include 'pending'
ALTER TABLE download_logs DROP CONSTRAINT IF EXISTS download_logs_download_status_check;

ALTER TABLE download_logs ADD CONSTRAINT download_logs_download_status_check 
CHECK (download_status IN ('pending', 'in_progress', 'completed', 'failed'));

-- Update default status to 'pending'
ALTER TABLE download_logs ALTER COLUMN download_status SET DEFAULT 'pending';