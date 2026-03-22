-- Migration 015: Create cleanup function for old appointments
-- Purpose: Automatically delete old pending/cancelled appointments
-- Related to: Database maintenance and performance optimization

-- Function to cleanup old appointments
CREATE OR REPLACE FUNCTION cleanup_old_appointments(days_threshold INTEGER DEFAULT 15)
RETURNS TABLE(
  deleted_count INTEGER,
  deleted_pending INTEGER,
  deleted_cancelled INTEGER
) AS $$
DECLARE
  v_deleted_pending INTEGER;
  v_deleted_cancelled INTEGER;
  v_total_deleted INTEGER;
BEGIN
  -- Delete old pending appointments (older than threshold days)
  WITH deleted_pending AS (
    DELETE FROM appointments
    WHERE status = 'pending'
      AND created_at < (CURRENT_DATE - (days_threshold || ' days')::INTERVAL)
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_pending FROM deleted_pending;
  
  -- Delete old cancelled appointments (older than threshold days)
  WITH deleted_cancelled AS (
    DELETE FROM appointments
    WHERE status = 'cancelled'
      AND updated_at < (CURRENT_DATE - (days_threshold || ' days')::INTERVAL)
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_cancelled FROM deleted_cancelled;
  
  -- Calculate total
  v_total_deleted := v_deleted_pending + v_deleted_cancelled;
  
  -- Return summary
  RETURN QUERY SELECT 
    v_total_deleted,
    v_deleted_pending,
    v_deleted_cancelled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_old_appointments(INTEGER) TO service_role;

-- Comments
COMMENT ON FUNCTION cleanup_old_appointments IS 'Deletes pending/cancelled appointments older than specified days (default 15). Returns count of deleted records.';

-- ============================================================================
-- OPTIONAL: Setup pg_cron for automatic daily cleanup
-- ============================================================================
-- IMPORTANT: pg_cron extension must be enabled in Supabase dashboard first
-- Go to: Database → Extensions → Enable "pg_cron"
--
-- After enabling pg_cron, run this SQL to schedule daily cleanup at 3 AM:
--
-- SELECT cron.schedule(
--   'cleanup-old-appointments',         -- Job name
--   '0 3 * * *',                        -- Cron schedule: 3 AM daily
--   $$ SELECT cleanup_old_appointments(15) $$  -- Delete appointments older than 15 days
-- );
--
-- To check scheduled jobs:
-- SELECT * FROM cron.job;
--
-- To unschedule:
-- SELECT cron.unschedule('cleanup-old-appointments');
-- ============================================================================

-- Manual execution example:
-- SELECT * FROM cleanup_old_appointments(15);
-- Returns: (total_deleted, pending_deleted, cancelled_deleted)
