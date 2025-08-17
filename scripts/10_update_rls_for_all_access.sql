-- Update RLS policies to allow all authenticated users to see all data
-- This ensures employees can see all projects and time entries, not just their own

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view projects they created or are assigned to" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update projects they created" ON projects;
DROP POLICY IF EXISTS "Users can view own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can create own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can update own time entries" ON time_entries;

-- Create new permissive policies for all authenticated users
CREATE POLICY "All authenticated users can view all users" ON users
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "All authenticated users can view all projects" ON projects
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "All authenticated users can create projects" ON projects
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "All authenticated users can update projects" ON projects
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "All authenticated users can delete projects" ON projects
    FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "All authenticated users can view all time entries" ON time_entries
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "All authenticated users can create time entries" ON time_entries
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "All authenticated users can update time entries" ON time_entries
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "All authenticated users can delete time entries" ON time_entries
    FOR DELETE USING (auth.role() = 'authenticated');
