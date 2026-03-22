-- Migration 013: Create appointments_history table
-- Purpose: Archive completed appointments to improve performance and maintain history
-- Related to: Automatic archiving system and historical reporting

-- Create appointments_history table (similar structure to appointments)
CREATE TABLE IF NOT EXISTS appointments_history (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
  service_area_id UUID REFERENCES service_areas(id) ON DELETE SET NULL,
  
  -- Original appointment data
  scheduled_date DATE,
  scheduled_time TIME,
  original_status TEXT NOT NULL, -- Status before archiving (should be 'completed')
  appointment_address TEXT,
  notes TEXT,
  
  -- Financial data (snapshot at completion)
  is_custom_price BOOLEAN DEFAULT false,
  travel_fee DECIMAL(10,2) DEFAULT 0,
  payment_total_appointment DECIMAL(10,2) NOT NULL,
  payment_total_service DECIMAL(10,2) NOT NULL,
  total_amount_paid DECIMAL(10,2) DEFAULT 0,
  payment_status TEXT,
  commission_amount DECIMAL(10,2) DEFAULT 0,
  net_profit DECIMAL(10,2) GENERATED ALWAYS AS (payment_total_appointment - commission_amount) STORED,
  
  -- Service details (consolidated text - no FK to services)
  services_summary TEXT, -- Ex: "Maquiagem de Noiva (2x), Penteado (1x)"
  total_duration_minutes INTEGER,
  
  -- WhatsApp tracking
  whatsapp_sent BOOLEAN DEFAULT false,
  whatsapp_sent_at TIMESTAMPTZ,
  
  -- Archiving metadata
  completed_at TIMESTAMPTZ NOT NULL, -- When status changed to completed
  archived_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, -- When moved to history
  original_created_at TIMESTAMPTZ, -- Original creation date from appointments table
  
  -- Constraints
  CONSTRAINT appointments_history_status_check CHECK (original_status = 'completed')
);

-- Create indices for common queries
CREATE INDEX IF NOT EXISTS idx_appointments_history_user_id ON appointments_history(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_history_client_id ON appointments_history(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_history_partner_id ON appointments_history(partner_id) WHERE partner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_history_completed_date ON appointments_history(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_history_scheduled_date ON appointments_history(user_id, scheduled_date DESC);

-- Create composite index for financial reports
CREATE INDEX IF NOT EXISTS idx_appointments_history_financial ON appointments_history(
  user_id, 
  completed_at, 
  payment_total_appointment, 
  commission_amount
);

-- Enable Row Level Security
ALTER TABLE appointments_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own archived appointments
DROP POLICY IF EXISTS appointments_history_all ON appointments_history;
CREATE POLICY appointments_history_all ON appointments_history
  FOR ALL
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON appointments_history TO authenticated;
GRANT ALL ON appointments_history TO service_role;

-- Comments
COMMENT ON TABLE appointments_history IS 'Archived completed appointments for historical reporting and performance optimization';
COMMENT ON COLUMN appointments_history.original_status IS 'Status before archiving (always completed)';
COMMENT ON COLUMN appointments_history.services_summary IS 'Consolidated text description of services (no FK to services table)';
COMMENT ON COLUMN appointments_history.net_profit IS 'Calculated profit (total - commission) - GENERATED column';
COMMENT ON COLUMN appointments_history.completed_at IS 'Timestamp when appointment status changed to completed';
COMMENT ON COLUMN appointments_history.archived_at IS 'Timestamp when appointment was moved to history table';
