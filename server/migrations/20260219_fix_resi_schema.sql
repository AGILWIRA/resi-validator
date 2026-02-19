-- Align existing schema with current app requirements
ALTER TABLE resi
  ADD COLUMN IF NOT EXISTS total_items INTEGER DEFAULT 0;

-- Older schema had item_code/item_name/quantity_item in resi; make them nullable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resi' AND column_name = 'item_code'
  ) THEN
    ALTER TABLE resi ALTER COLUMN item_code DROP NOT NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resi' AND column_name = 'item_name'
  ) THEN
    ALTER TABLE resi ALTER COLUMN item_name DROP NOT NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resi' AND column_name = 'quantity_item'
  ) THEN
    ALTER TABLE resi ALTER COLUMN quantity_item DROP NOT NULL;
  END IF;
END $$;

-- Ensure resi_items has expected columns
ALTER TABLE resi_items
  ADD COLUMN IF NOT EXISTS item_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS quantity_item INTEGER DEFAULT 1;
