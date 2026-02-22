import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()
db_url = os.getenv('DATABASE_URL')

if db_url:
    # Parse connection string
    # postgres://user:password@host:port/database
    from urllib.parse import urlparse
    parsed = urlparse(db_url)
    
    conn = psycopg2.connect(
        host=parsed.hostname,
        port=parsed.port,
        database=parsed.path.lstrip('/'),
        user=parsed.username,
        password=parsed.password
    )
    
    cur = conn.cursor()
    cur.execute("SELECT username, password FROM users WHERE username = 'agilwira'")
    result = cur.fetchall()
    print("Result:", result)
    cur.close()
    conn.close()
else:
    print("DATABASE_URL not set")
