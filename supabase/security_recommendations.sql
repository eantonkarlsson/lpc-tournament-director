-- SECURITY RECOMMENDATIONS FOR LPC TOURNAMENT DIRECTOR
-- =====================================================

-- CURRENT STATE: All RLS policies use USING (true) which allows unrestricted access
-- RECOMMENDATION: Implement proper authentication and authorization

-- Option 1: Simple Password Protection (Quick Fix)
-- ================================================
-- Add an admin_password column to a settings table
-- Check password before allowing admin operations
-- Still vulnerable but better than nothing

CREATE TABLE IF NOT EXISTS admin_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  admin_password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Option 2: Supabase Auth Integration (Recommended)
-- ==================================================
-- Enable Supabase Authentication
-- Create user roles (admin, viewer, public)
-- Update RLS policies to check auth.uid() and roles

-- Example RLS policies with proper auth:
DROP POLICY IF EXISTS "Enable read access for all users" ON registrations;
CREATE POLICY "Public can view confirmed registrations"
  ON registrations FOR SELECT
  USING (is_confirmed = true);

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON registrations;
CREATE POLICY "Only authenticated users can insert"
  ON registrations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update for authenticated users only" ON registrations;
CREATE POLICY "Only admins can update registrations"
  ON registrations FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
    )
  );

-- Option 3: IP Whitelist (Additional Layer)
-- ==========================================
-- Use Supabase Edge Functions to check request origin
-- Only allow admin operations from specific IPs
-- Combine with authentication for better security

-- Option 4: API Key System (Alternative)
-- =======================================
-- Generate unique API keys for admin operations
-- Store hashed keys in database
-- Validate keys on sensitive operations

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash TEXT NOT NULL,
  description TEXT,
  permissions TEXT[], -- ['read', 'write', 'admin']
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- IMMEDIATE ACTIONS (Do These First):
-- ====================================

-- 1. Enable RLS on ALL tables
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- 2. Restrict admin operations (temporary measure until auth is added)
-- Make public operations read-only for critical tables
DROP POLICY IF EXISTS "Enable read access for all users" ON tournament_results;
CREATE POLICY "Anyone can read results"
  ON tournament_results FOR SELECT
  USING (true);

-- Block public writes (forces use of authenticated backend)
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON tournament_results;
CREATE POLICY "No public inserts on results"
  ON tournament_results FOR INSERT
  WITH CHECK (false); -- Blocks all inserts from client

-- 3. Create audit log table to track changes
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  user_id UUID,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Add triggers to log sensitive operations
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (table_name, operation, record_id, old_data)
    VALUES (TG_TABLE_NAME, TG_OP, OLD.id::TEXT, row_to_json(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (table_name, operation, record_id, old_data, new_data)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id::TEXT, row_to_json(OLD), row_to_json(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (table_name, operation, record_id, new_data)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id::TEXT, row_to_json(NEW));
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to sensitive tables
DROP TRIGGER IF EXISTS audit_registrations ON registrations;
CREATE TRIGGER audit_registrations
  AFTER INSERT OR UPDATE OR DELETE ON registrations
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_tournament_results ON tournament_results;
CREATE TRIGGER audit_tournament_results
  AFTER INSERT OR UPDATE OR DELETE ON tournament_results
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- SUMMARY OF RISKS:
-- ================
-- HIGH RISK:
-- - Anyone can modify tournament results (affects POY rankings)
-- - Anyone can change player registrations
-- - No tracking of who made changes
-- - Admin page has no authentication
--
-- MEDIUM RISK:
-- - Database credentials exposed in browser
-- - No rate limiting on API calls
--
-- LOW RISK (for private league):
-- - Small user base reduces attack surface
-- - No financial transactions in database
-- - Data is not highly sensitive (just tournament info)

-- RECOMMENDED IMPLEMENTATION ORDER:
-- =================================
-- 1. Add audit logging (protects without breaking anything)
-- 2. Enable Supabase Auth
-- 3. Add admin login page
-- 4. Update RLS policies to check auth.uid()
-- 5. Create admin role system
-- 6. Add IP whitelist as extra layer
