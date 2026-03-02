-- ============================================================================
-- MIGRATION: 008-dashboard-metrics-view.sql
-- Purpose: Consolidate dashboard metrics into single optimized query
-- Version: 2.0.0
-- Date: 2025-12-02
-- ============================================================================
-- This migration creates an RPC function that returns all dashboard metrics
-- in a single JSONB object, using efficient aggregations with FILTER clauses
-- to avoid multiple table scans.
-- ============================================================================

-- ============================================================================
-- FUNCTION: get_dashboard_metrics
-- Purpose: Calculate all dashboard metrics in a single query pass
-- Parameters: p_user_id UUID - The authenticated user's ID
-- Returns: JSONB with all dashboard metrics
-- ============================================================================

CREATE OR REPLACE FUNCTION get_dashboard_metrics(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_month_start DATE := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  v_month_end DATE := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  v_result JSONB;
BEGIN
  -- Validate user_id
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id cannot be null';
  END IF;

  -- Calculate all metrics in a single query using FILTER aggregations
  -- This is much more efficient than running 8 separate queries
  SELECT jsonb_build_object(
    -- Today's appointments count (scheduled for today)
    'today_appointments_count', 
    COUNT(*) FILTER (WHERE scheduled_date = v_today),
    
    -- Today's pending revenue (appointments scheduled today with pending payments)
    'today_revenue_pending',
    COALESCE(
      SUM(
        CASE 
          WHEN scheduled_date = v_today 
            AND payment_total_appointment > total_amount_paid
          THEN (payment_total_appointment - total_amount_paid)
          ELSE 0
        END
      ),
      0
    ),
    
    -- Pending appointments count (status = 'pending')
    'pending_appointments_count',
    COUNT(*) FILTER (WHERE status = 'pending'),
    
    -- Confirmed appointments this month (status = 'confirmed', scheduled this month)
    'confirmed_appointments_month_count',
    COUNT(*) FILTER (
      WHERE status = 'confirmed' 
        AND scheduled_date >= v_month_start 
        AND scheduled_date <= v_month_end
    ),
    
    -- Completed appointments this month (status = 'completed', scheduled this month)
    'completed_appointments_month_count',
    COUNT(*) FILTER (
      WHERE status = 'completed' 
        AND scheduled_date >= v_month_start 
        AND scheduled_date <= v_month_end
    ),
    
    -- Pending payments count (confirmed with pending payment)
    'pending_payments_count',
    COUNT(*) FILTER (
      WHERE status = 'confirmed' 
        AND payment_status = 'pending'
    ),
    
    -- Overdue appointments (scheduled in past, still pending or confirmed)
    'overdue_appointments_count',
    COUNT(*) FILTER (
      WHERE scheduled_date < v_today 
        AND status IN ('confirmed', 'pending')
    ),
    
    -- Monthly pending revenue (all pending payments for this month's appointments)
    'monthly_revenue_pending',
    COALESCE(
      SUM(
        CASE 
          WHEN scheduled_date >= v_month_start 
            AND scheduled_date <= v_month_end
            AND payment_total_appointment > total_amount_paid
          THEN (payment_total_appointment - total_amount_paid)
          ELSE 0
        END
      ),
      0
    )
  ) INTO v_result
  FROM appointments
  WHERE user_id = p_user_id
    AND status != 'cancelled'; -- Exclude cancelled appointments from all metrics

  RETURN v_result;
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON FUNCTION get_dashboard_metrics(UUID) IS 
'Returns all dashboard metrics in single JSONB object. Uses efficient FILTER aggregations to calculate metrics in one query pass.';

-- ============================================================================
-- PERMISSIONS
-- ============================================================================
-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_dashboard_metrics(UUID) TO authenticated;

-- ============================================================================
-- USAGE EXAMPLE
-- ============================================================================
-- SELECT get_dashboard_metrics('user-uuid-here');
-- 
-- Returns:
-- {
--   "today_appointments_count": 3,
--   "today_revenue_pending": 450.00,
--   "pending_appointments_count": 5,
--   "confirmed_appointments_month_count": 12,
--   "completed_appointments_month_count": 8,
--   "pending_payments_count": 4,
--   "overdue_appointments_count": 2,
--   "monthly_revenue_pending": 2300.00
-- }
-- ============================================================================

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================
-- This function uses a single table scan with multiple FILTER clauses instead
-- of 8 separate queries. Benefits:
-- 
-- 1. Single index scan on (user_id, scheduled_date, status)
-- 2. All aggregations calculated in parallel during single pass
-- 3. Reduced query planning overhead (1 plan vs 8 plans)
-- 4. Better cache locality and reduced I/O
-- 5. JSONB output format ready for API consumption
--
-- Existing indexes that support this query:
-- - idx_appointments_user_filters (from 007-optimized-indices.sql)
-- - idx_appointments_duplicate_check
-- - idx_appointments_financial
-- ============================================================================
