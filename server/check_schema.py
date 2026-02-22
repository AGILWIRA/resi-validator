import os
from dotenv import load_dotenv
import psycopg2
from urllib.parse import urlparse

load_dotenv()
db_url = os.getenv('DATABASE_URL')
parsed = urlparse(db_url)

conn = psycopg2.connect(
    host=parsed.hostname,
    port=parsed.port,
    database=parsed.path.lstrip('/'),
    user=parsed.username,
    password=parsed.password
)

cur = conn.cursor()

# Check item table columns
print("Item table columns:")
cur.execute("""SELECT column_name, data_type FROM information_schema.columns 
              WHERE table_name = 'item' ORDER BY ordinal_position""")
result = cur.fetchall()
for col, dtype in result:
    print(f'{col}: {dtype}')

# Check resi_items table columns
print("\n\nResi_items table columns:")
cur.execute("""SELECT column_name, data_type FROM information_schema.columns 
              WHERE table_name = 'resi_items' ORDER BY ordinal_position""")
result = cur.fetchall()
for col, dtype in result:
    print(f'{col}: {dtype}')

# Get sample resi_items data
print("\n\nSample resi_items data:")
cur.execute("SELECT * FROM resi_items LIMIT 2")
result = cur.fetchall()
for row in result:
    print(row)

cur.close()
conn.close()
