-- Create KSUID generation function
CREATE OR REPLACE FUNCTION generate_ksuid() RETURNS TEXT AS $$
DECLARE
  -- KSUID timestamp (seconds since Unix epoch)
  timestamp_part BIGINT;
  -- Random payload (16 bytes = 128 bits)
  random_part BYTEA;
  -- Final KSUID as bytes
  ksuid_bytes BYTEA;
  -- Base62 alphabet for encoding
  alphabet TEXT := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  -- Variables for base62 encoding
  num NUMERIC;
  result TEXT := '';
  remainder INTEGER;
BEGIN
  -- Get current timestamp (seconds since Unix epoch)
  timestamp_part := EXTRACT(EPOCH FROM NOW())::BIGINT;

  -- Generate 16 random bytes
  random_part := gen_random_bytes(16);

  -- Combine timestamp (4 bytes) + random (16 bytes) = 20 bytes total
  ksuid_bytes :=
    decode(lpad(to_hex(timestamp_part), 8, '0'), 'hex') || random_part;

  -- Convert bytes to a large number for base62 encoding
  num := 0;
  FOR i IN 0..19 LOOP
    num := num * 256 + get_byte(ksuid_bytes, i);
  END LOOP;

  -- Convert to base62
  WHILE num > 0 LOOP
    remainder := (num % 62)::INTEGER;
    result := substr(alphabet, remainder + 1, 1) || result;
    num := floor(num / 62);
  END LOOP;

  -- Pad to 27 characters
  result := lpad(result, 27, '0');

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT DEFAULT ('user_' || generate_ksuid()) PRIMARY KEY,
  reddit_id TEXT UNIQUE NOT NULL,
  image_url TEXT,
  handle TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better performance
-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_reddit_id ON users(reddit_id);
CREATE INDEX IF NOT EXISTS idx_users_handle ON users(handle);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
