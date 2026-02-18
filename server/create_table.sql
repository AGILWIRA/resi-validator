
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

-- Tabel resi_items (detail items dalam satu resi untuk verifikasi per item)
CREATE TABLE IF NOT EXISTS resi_items (
  id SERIAL PRIMARY KEY,
  resi_id INTEGER NOT NULL,
  item_code VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  FOREIGN KEY (resi_id) REFERENCES resi(id) ON DELETE CASCADE,
  FOREIGN KEY (item_code) REFERENCES item(item_code) ON DELETE CASCADE
);

INSERT INTO item (item_code, item_name, compatible_phone) VALUES
('BRPIP7', 'Rakkipanda - IP 7', 'Iphone 7'),
('BRP805', 'Rakkipanda - BLP 805', 'A16 2021/A32/A33 2020/ A53S 5G/ A54S/ A73/A74 5g/ A75/ A93 '),
('BRP673', 'Rakkipanda - BLP 673', 'A3s/ A5/ A5s / AX5s / A11k / A12 2020/ A31 2020/ Realme C1 / Realme 2'),
('BRP631', 'Rakkipanda - BLP 631', 'F3/F5/F5 Youth/ A73/ A77'),
('BRPA50', 'Rakkipanda - EB-BA505ABU', 'Samsung A20/ A30/ A50/ A30s/ A50s'),
('BRPBS1', 'Rakkipanda - B-S1', 'Vivo Y21 2020/ Y21s/ Y21A/ Y21t/ Y33s');