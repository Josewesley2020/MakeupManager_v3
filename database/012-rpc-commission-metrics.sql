-- ============================================================================
-- RPC: get_commission_metrics
-- Purpose: Financial metrics including partner commissions and net profit
-- Performance: Extends get_financial_metrics with commission calculations
-- ============================================================================

CREATE OR REPLACE FUNCTION get_commission_metrics(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  today DATE := CURRENT_DATE;
  week_ago DATE := today - INTERVAL '7 days';
  month_start DATE := DATE_TRUNC('month', today);
BEGIN
  -- Consolidate all metrics including commissions in 1 query
  SELECT json_build_object(
    -- ═══════════════════════════════════════════════════════════════════════
    -- GROSS REVENUE (Total charged to clients - confirmed + completed)
    -- ═══════════════════════════════════════════════════════════════════════
    'total_gross_revenue', COALESCE(
      SUM(payment_total_appointment) 
      FILTER (WHERE status IN ('confirmed', 'completed')), 
      0
    ),
    
    'month_gross_revenue', COALESCE(
      SUM(payment_total_appointment) 
      FILTER (
        WHERE scheduled_date >= month_start 
        AND status IN ('confirmed', 'completed')
      ), 
      0
    ),
    
    'week_gross_revenue', COALESCE(
      SUM(payment_total_appointment) 
      FILTER (
        WHERE scheduled_date >= week_ago 
        AND status IN ('confirmed', 'completed')
      ), 
      0
    ),
    
    'today_gross_revenue', COALESCE(
      SUM(payment_total_appointment) 
      FILTER (
        WHERE scheduled_date = today 
        AND status IN ('confirmed', 'completed')
      ), 
      0
    ),
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- COMMISSIONS (Total paid to partners)
    -- ═══════════════════════════════════════════════════════════════════════
    'total_commissions', COALESCE(
      SUM(commission_amount) 
      FILTER (
        WHERE status IN ('confirmed', 'completed') 
        AND partner_id IS NOT NULL
      ), 
      0
    ),
    
    'month_commissions', COALESCE(
      SUM(commission_amount) 
      FILTER (
        WHERE scheduled_date >= month_start 
        AND status IN ('confirmed', 'completed')
        AND partner_id IS NOT NULL
      ), 
      0
    ),
    
    'week_commissions', COALESCE(
      SUM(commission_amount) 
      FILTER (
        WHERE scheduled_date >= week_ago 
        AND status IN ('confirmed', 'completed')
        AND partner_id IS NOT NULL
      ), 
      0
    ),
    
    'today_commissions', COALESCE(
      SUM(commission_amount) 
      FILTER (
        WHERE scheduled_date = today 
        AND status IN ('confirmed', 'completed')
        AND partner_id IS NOT NULL
      ), 
      0
    ),
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- NET PROFIT (Gross Revenue - Commissions)
    -- ═══════════════════════════════════════════════════════════════════════
    'total_net_profit', COALESCE(
      SUM(payment_total_appointment - commission_amount) 
      FILTER (WHERE status IN ('confirmed', 'completed')), 
      0
    ),
    
    'month_net_profit', COALESCE(
      SUM(payment_total_appointment - commission_amount) 
      FILTER (
        WHERE scheduled_date >= month_start 
        AND status IN ('confirmed', 'completed')
      ), 
      0
    ),
    
    'week_net_profit', COALESCE(
      SUM(payment_total_appointment - commission_amount) 
      FILTER (
        WHERE scheduled_date >= week_ago 
        AND status IN ('confirmed', 'completed')
      ), 
      0
    ),
    
    'today_net_profit', COALESCE(
      SUM(payment_total_appointment - commission_amount) 
      FILTER (
        WHERE scheduled_date = today 
        AND status IN ('confirmed', 'completed')
      ), 
      0
    ),
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- PAYMENT TRACKING (Amount received vs receivable)
    -- ═══════════════════════════════════════════════════════════════════════
    'total_receivable', COALESCE(
      SUM(payment_total_appointment - total_amount_paid) 
      FILTER (
        WHERE status IN ('confirmed', 'completed') 
        AND payment_total_appointment > total_amount_paid
      ), 
      0
    ),
    
    'total_received', COALESCE(
      SUM(total_amount_paid) 
      FILTER (WHERE status IN ('confirmed', 'completed')), 
      0
    ),
    
    'month_receivable', COALESCE(
      SUM(payment_total_appointment - total_amount_paid) 
      FILTER (
        WHERE scheduled_date >= month_start 
        AND status IN ('confirmed', 'completed')
        AND payment_total_appointment > total_amount_paid
      ), 
      0
    ),
    
    'month_received', COALESCE(
      SUM(total_amount_paid) 
      FILTER (
        WHERE scheduled_date >= month_start 
        AND status IN ('confirmed', 'completed')
      ), 
      0
    ),
    
    'week_receivable', COALESCE(
      SUM(payment_total_appointment - total_amount_paid) 
      FILTER (
        WHERE scheduled_date >= week_ago 
        AND status IN ('confirmed', 'completed')
        AND payment_total_appointment > total_amount_paid
      ), 
      0
    ),
    
    'week_received', COALESCE(
      SUM(total_amount_paid) 
      FILTER (
        WHERE scheduled_date >= week_ago 
        AND status IN ('confirmed', 'completed')
      ), 
      0
    ),
    
    'today_receivable', COALESCE(
      SUM(payment_total_appointment - total_amount_paid) 
      FILTER (
        WHERE scheduled_date = today 
        AND status IN ('confirmed', 'completed')
        AND payment_total_appointment > total_amount_paid
      ), 
      0
    ),
    
    'today_received', COALESCE(
      SUM(total_amount_paid) 
      FILTER (
        WHERE scheduled_date = today 
        AND status IN ('confirmed', 'completed')
      ), 
      0
    ),
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- PARTNER STATISTICS
    -- ═══════════════════════════════════════════════════════════════════════
    'appointments_with_partner', COUNT(*) FILTER (
      WHERE partner_id IS NOT NULL 
      AND status IN ('confirmed', 'completed')
    ),
    
    'appointments_self_performed', COUNT(*) FILTER (
      WHERE partner_id IS NULL 
      AND status IN ('confirmed', 'completed')
    ),
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- SPECIAL METRICS
    -- ═══════════════════════════════════════════════════════════════════════
    'overdue_amount', COALESCE(
      SUM(payment_total_appointment - total_amount_paid) 
      FILTER (
        WHERE scheduled_date < today 
        AND status = 'confirmed'
        AND payment_total_appointment > total_amount_paid
      ), 
      0
    ),
    
    'custom_price_count', COUNT(*) FILTER (WHERE is_custom_price = true),
    
    'average_ticket', COALESCE(
      AVG(payment_total_appointment) FILTER (WHERE status = 'completed'), 
      0
    ),
    
    'average_commission', COALESCE(
      AVG(commission_amount) FILTER (
        WHERE status = 'completed' 
        AND partner_id IS NOT NULL 
        AND commission_amount > 0
      ), 
      0
    ),
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- STATUS COUNTERS
    -- ═══════════════════════════════════════════════════════════════════════
    'pending_count', COUNT(*) FILTER (WHERE status = 'pending'),
    'confirmed_count', COUNT(*) FILTER (WHERE status = 'confirmed'),
    'completed_count', COUNT(*) FILTER (WHERE status = 'completed'),
    'cancelled_count', COUNT(*) FILTER (WHERE status = 'cancelled'),
    
    'payment_paid_count', COUNT(*) FILTER (WHERE payment_status = 'paid'),
    'payment_pending_count', COUNT(*) FILTER (
      WHERE payment_status = 'pending' 
      AND total_amount_paid = 0
    ),
    'payment_partial_count', COUNT(*) FILTER (
      WHERE total_amount_paid > 0 
      AND total_amount_paid < payment_total_appointment
    )
    
  ) INTO result
  FROM appointments
  WHERE user_id = p_user_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_commission_metrics IS 'Financial metrics with partner commission tracking and net profit calculation';
