-- Create initial admin user (you'll need to sign up first, then run this to make yourself admin)
-- Replace 'your-email@example.com' with your actual email address

-- This script should be run after you've signed up with your admin email
UPDATE users 
SET role = 'admin', full_name = 'Administrator'
WHERE email = 'your-email@example.com';

-- If the user doesn't exist yet, you can create a placeholder
-- (This will be updated when the user actually signs up)
INSERT INTO users (id, email, full_name, role)
SELECT 
  gen_random_uuid(),
  'your-email@example.com',
  'Administrator',
  'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'your-email@example.com'
);
