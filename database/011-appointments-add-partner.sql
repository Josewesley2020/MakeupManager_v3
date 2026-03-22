-- Migration 011: Add partner and commission fields to appointments
-- Purpose: Track which partner executed the service and commission amount
-- Related to: Commission tracking and net profit calculation

-- Add partner_id column (nullable - NULL means owner performed the service)
ALTER TABLE appointments 
  ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id) ON DELETE SET NULL;

-- Add commission_amount column (default 0 - no commission)
ALTER TABLE appointments 
  ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2) DEFAULT 0 NOT NULL;

-- Add constraint: commission cannot exceed total appointment value
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_commission_valid'
  ) THEN
    ALTER TABLE appointments 
      ADD CONSTRAINT appointments_commission_valid 
      CHECK (commission_amount >= 0 AND commission_amount <= payment_total_appointment);
  END IF;
END $$;

-- Create index for partner lookup and reporting
CREATE INDEX IF NOT EXISTS idx_appointments_partner ON appointments(partner_id) 
  WHERE partner_id IS NOT NULL;

-- Create composite index for commission queries
CREATE INDEX IF NOT EXISTS idx_appointments_partner_commission ON appointments(user_id, partner_id, commission_amount)
  WHERE partner_id IS NOT NULL AND commission_amount > 0;

COMMENT ON COLUMN appointments.partner_id IS 'Partner who executed the service (NULL = owner performed service)';
COMMENT ON COLUMN appointments.commission_amount IS 'Commission/repasse amount paid to partner (0 = no commission)';
