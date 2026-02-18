-- Add verification columns to resi_items if missing
ALTER TABLE resi_items
  ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS verified_by VARCHAR(255),
  ADD COLUMN IF NOT EXISTS last_scan TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_scanned_code VARCHAR(255);

-- Optional: index for faster lookup
CREATE INDEX IF NOT EXISTS idx_resi_items_resi_id ON resi_items(resi_id);
