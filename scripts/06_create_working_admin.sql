-- Create a working admin user for testing
-- Email: admin@test.com
-- Password: admin123 (you'll set this when signing up)

-- First, let's create the user in our users table
INSERT INTO users (id, email, full_name, role, created_at)
VALUES (
  gen_random_uuid(),
  'admin@test.com',
  'Test Administrator',
  'admin',
  now()
) ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  full_name = 'Test Administrator';

-- Also create a test employee
INSERT INTO users (id, email, full_name, role, created_at)
VALUES (
  gen_random_uuid(),
  'werknemer@test.com',
  'Test Werknemer',
  'employee',
  now()
) ON CONFLICT (email) DO UPDATE SET
  role = 'employee',
  full_name = 'Test Werknemer';
