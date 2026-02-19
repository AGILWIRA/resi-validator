-- Run this script in your DB (psql or pgAdmin query tool)
-- Drop old tables if recreating
DROP TABLE IF EXISTS resi_items CASCADE;
DROP TABLE IF EXISTS resi CASCADE;
DROP TABLE IF EXISTS item CASCADE;

-- Tabel item (master data barang)
CREATE TABLE IF NOT EXISTS item (
  id SERIAL PRIMARY KEY,
  item_code VARCHAR(255) NOT NULL UNIQUE,
  item_name VARCHAR(255) NOT NULL,
  compatible_phone VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabel resi (header dokumen pengiriman - satu resi = satu baris)
CREATE TABLE IF NOT EXISTS resi (
  id SERIAL PRIMARY KEY,
  resi_number VARCHAR(255) NOT NULL UNIQUE,
  total_items INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabel resi_items (detail items dalam satu resi - banyak baris per resi)
CREATE TABLE IF NOT EXISTS resi_items (
  id SERIAL PRIMARY KEY,
  resi_id INTEGER NOT NULL,
  item_code VARCHAR(255) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  quantity_item INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  FOREIGN KEY (resi_id) REFERENCES resi(id) ON DELETE CASCADE,
  FOREIGN KEY (item_code) REFERENCES item(item_code) ON DELETE CASCADE
);

-- Insert data item contoh
INSERT INTO item (item_code, item_name, compatible_phone) VALUES
('BRPIP7', 'Rakkipanda - IP 7', 'Iphone 7'),
('BRP805', 'Rakkipanda - BLP 805', 'A16 2021/A32/A33 2020/ A53S 5G/ A54S/ A73/A74 5g/ A75/ A93'),
('BRP673', 'Rakkipanda - BLP 673', 'A3s/ A5/ A5s / AX5s / A11k / A12 2020/ A31 2020/ Realme C1 / Realme 2'),
('BRP631', 'Rakkipanda - BLP 631', 'F3/F5/F5 Youth/ A73/ A77'),
('BRPA50', 'Rakkipanda - EB-BA505ABU', 'Samsung A20/ A30/ A50/ A30s/ A50s'),
('BRPBS1', 'Rakkipanda - B-S1', 'Vivo Y21 2020/ Y21s/ Y21A/ Y21t/ Y33s')
ON CONFLICT (item_code) DO NOTHING;
