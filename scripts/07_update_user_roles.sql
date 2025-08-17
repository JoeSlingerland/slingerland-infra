-- Update existing users with correct roles based on their auth metadata
-- This fixes users created before the trigger was in place

-- First, let's create a function to sync user roles from auth metadata
CREATE OR REPLACE FUNCTION sync_user_roles()
RETURNS void AS $$
DECLARE
    auth_user RECORD;
    user_role TEXT;
BEGIN
    -- Loop through all auth users and update their roles in the users table
    FOR auth_user IN 
        SELECT id, email, raw_user_meta_data 
        FROM auth.users 
    LOOP
        -- Extract role from metadata, default to 'employee'
        user_role := COALESCE(auth_user.raw_user_meta_data->>'role', 'employee');
        
        -- Update or insert user record with correct role
        INSERT INTO public.users (id, email, full_name, role, created_at, updated_at)
        VALUES (
            auth_user.id,
            auth_user.email,
            COALESCE(auth_user.raw_user_meta_data->>'full_name', auth_user.email),
            user_role,
            now(),
            now()
        )
        ON CONFLICT (id) DO UPDATE SET
            role = user_role,
            full_name = COALESCE(auth_user.raw_user_meta_data->>'full_name', auth_user.email),
            updated_at = now();
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the sync function
SELECT sync_user_roles();

-- Also ensure the trigger is properly set up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.raw_user_meta_data->>'role', 'employee'),
    now(),
    now()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger to ensure it's active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
