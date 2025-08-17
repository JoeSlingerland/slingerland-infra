-- Fix RLS policies to prevent infinite recursion
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;

-- Create simple, non-recursive policies
-- Users can view their own profile using auth.uid() directly
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile (for new registrations)
CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Simple admin policy - check if user has admin role in auth metadata
CREATE POLICY "admins_all_access" ON users
  FOR ALL USING (
    COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'role'),
      (auth.jwt() -> 'app_metadata' ->> 'role')
    ) = 'admin'
  );

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Also fix policies for projects and time_entries to prevent similar issues
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Admins can view all projects" ON projects;

CREATE POLICY "projects_select_policy" ON projects
  FOR SELECT USING (
    created_by = auth.uid() OR 
    COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'role'),
      (auth.jwt() -> 'app_metadata' ->> 'role')
    ) = 'admin'
  );

CREATE POLICY "projects_insert_policy" ON projects
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "projects_update_policy" ON projects
  FOR UPDATE USING (
    created_by = auth.uid() OR 
    COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'role'),
      (auth.jwt() -> 'app_metadata' ->> 'role')
    ) = 'admin'
  );

-- Fix time_entries policies
DROP POLICY IF EXISTS "Users can view own time entries" ON time_entries;
DROP POLICY IF EXISTS "Admins can view all time entries" ON time_entries;

CREATE POLICY "time_entries_select_policy" ON time_entries
  FOR SELECT USING (
    user_id = auth.uid() OR 
    COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'role'),
      (auth.jwt() -> 'app_metadata' ->> 'role')
    ) = 'admin'
  );

CREATE POLICY "time_entries_insert_policy" ON time_entries
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "time_entries_update_policy" ON time_entries
  FOR UPDATE USING (user_id = auth.uid());
