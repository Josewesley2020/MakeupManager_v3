-- Migration 010: Create partners table
-- Purpose: Store collaborators/professionals who execute services
-- Related to: Partner management and commission tracking

-- Create partners table
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT partners_name_min_length CHECK (char_length(name) >= 2),
  CONSTRAINT partners_notes_max_length CHECK (notes IS NULL OR char_length(notes) <= 500)
);

-- Create index for user isolation (RLS performance)
CREATE INDEX IF NOT EXISTS idx_partners_user_id ON partners(user_id);

-- Create index for phone lookups
CREATE INDEX IF NOT EXISTS idx_partners_phone ON partners(user_id, phone);

-- Enable Row Level Security
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own partners
DROP POLICY IF EXISTS partners_all ON partners;
CREATE POLICY partners_all ON partners
  FOR ALL
  USING (auth.uid() = user_id);

-- Trigger: Auto-update updated_at timestamp
DROP TRIGGER IF EXISTS partners_updated_at ON partners;
CREATE TRIGGER partners_updated_at
  BEFORE UPDATE ON partners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Grant permissions
GRANT ALL ON partners TO authenticated;
GRANT ALL ON partners TO service_role;

COMMENT ON TABLE partners IS 'Collaborators/professionals who execute services for users';
COMMENT ON COLUMN partners.user_id IS 'Owner of the partner record (makeup artist managing their team)';
COMMENT ON COLUMN partners.name IS 'Partner full name (maquiadoras, penteadistas, etc)';
COMMENT ON COLUMN partners.phone IS 'Partner phone number for contact';
COMMENT ON COLUMN partners.notes IS 'Optional notes about specialties, observations, etc (max 500 chars)';
