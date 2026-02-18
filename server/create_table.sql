-- Run this script in your DB (psql or pgAdmin query tool)

-- Tabel item (master data)
CREATE TABLE IF NOT EXISTS item (
  id SERIAL PRIMARY KEY,
  item_code VARCHAR(255) NOT NULL UNIQUE,
  item_name VARCHAR(255) NOT NULL,
  compatible_phone VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabel resi (dokumen pengiriman)
CREATE TABLE IF NOT EXISTS resi (
  id SERIAL PRIMARY KEY,
  resi_number VARCHAR(255) NOT NULL UNIQUE,
  item_code VARCHAR(255) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  quantity_item INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  FOREIGN KEY (item_code) REFERENCES item(item_code) ON DELETE CASCADE
);
