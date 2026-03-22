-- Migration 016: Update commission metrics to include history
-- Purpose: Update get_commission_metrics to query both active and archived appointments
-- Related to: Historical financial reporting with archived data

CREATE OR REPLACE FUNCTION get_commission_metrics(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  today DATE := CURRENT_DATE;
  week_ago DATE := today - INTERVAL '7 days';
  month_start DATE := DATE_TRUNC('month', today);
BEGIN
  -- Combine data from appointments (active) and appointments_history (archived)
  -- Use UNION ALL to merge both sources
  WITH combined_appointments AS (
    -- Active appointments (pending, confirmed, completed that haven't been archived yet)
    SELECT
      user_id,
      status,
      scheduled_date,
      payment_total_appointment,
      commission_amount,
      total_amount_paid,
      partner_id,
      is_custom_price,
      payment_status
    FROM appointments
    WHERE user_id = p_user_id
    
    UNION ALL
    
    -- Archived appointments (completed and moved to history)
    SELECT
      user_id,
      original_status as status,
      scheduled_date,
      payment_total_appointment,
      commission_amount,
      total_amount_paid,
      partner_id,
      is_custom_price,
      payment_status
    FROM appointments_history
    WHERE user_id = p_user_id
  )
  
  -- Aggregate metrics from combined dataset
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
    -- NOTE: Only from active appointments (history is already paid)
    -- ═══════════════════════════════════════════════════════════════════════
    'total_receivable', COALESCE(
      (SELECT SUM(payment_total_appointment - total_amount_paid)
       FROM appointments
       WHERE user_id = p_user_id
         AND status IN ('confirmed', 'completed')
         AND payment_total_appointment > total_amount_paid), 
      0
    ),
    
    'total_received', COALESCE(
      SUM(total_amount_paid) 
      FILTER (WHERE status IN ('confirmed', 'completed')), 
      0
    ),
    
    'month_receivable', COALESCE(
      (SELECT SUM(payment_total_appointment - total_amount_paid)
       FROM appointments
       WHERE user_id = p_user_id
         AND scheduled_date >= month_start
         AND status IN ('confirmed', 'completed')
         AND payment_total_appointment > total_amount_paid),
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
      (SELECT SUM(payment_total_appointment - total_amount_paid)
       FROM appointments
       WHERE user_id = p_user_id
         AND scheduled_date >= week_ago
         AND status IN ('confirmed', 'completed')
         AND payment_total_appointment > total_amount_paid),
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
      (SELECT SUM(payment_total_appointment - total_amount_paid)
       FROM appointments
       WHERE user_id = p_user_id
         AND scheduled_date = today
         AND status IN ('confirmed', 'completed')
         AND payment_total_appointment > total_amount_paid),
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
    -- PARTNER STATISTICS (including history)
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
    -- SPECIAL METRICS (from active appointments only)
    -- ═══════════════════════════════════════════════════════════════════════
    'overdue_amount', COALESCE(
      (SELECT SUM(payment_total_appointment - total_amount_paid)
       FROM appointments
       WHERE user_id = p_user_id
         AND scheduled_date < today
         AND status = 'confirmed'
         AND payment_total_appointment > total_amount_paid),
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
    -- STATUS COUNTERS (from active appointments only)
    -- ═══════════════════════════════════════════════════════════════════════
    'pending_count', (SELECT COUNT(*) FROM appointments WHERE user_id = p_user_id AND status = 'pending'),
    'confirmed_count', (SELECT COUNT(*) FROM appointments WHERE user_id = p_user_id AND status = 'confirmed'),
    'completed_count', COUNT(*) FILTER (WHERE status = 'completed'), -- includes history
    'cancelled_count', (SELECT COUNT(*) FROM appointments WHERE user_id = p_user_id AND status = 'cancelled'),
    
    'payment_paid_count', (SELECT COUNT(*) FROM appointments WHERE user_id = p_user_id AND payment_status = 'paid'),
    'payment_pending_count', (SELECT COUNT(*) FROM appointments WHERE user_id = p_user_id AND payment_status = 'pending' AND total_amount_paid = 0),
    'payment_partial_count', (SELECT COUNT(*) FROM appointments WHERE user_id = p_user_id AND total_amount_paid > 0 AND total_amount_paid < payment_total_appointment)
    
  ) INTO result
  FROM combined_appointments;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_commission_metrics IS 'Financial metrics with partner commission tracking and net profit calculation - includes archived appointments';
