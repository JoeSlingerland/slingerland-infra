-- Add hourly rate column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10,2) DEFAULT 50.00;

-- Update existing users with default hourly rate
UPDATE users SET hourly_rate = 50.00 WHERE hourly_rate IS NULL;

-- Add comment to explain the column
COMMENT ON COLUMN users.hourly_rate IS 'Hourly rate for this user in euros';
