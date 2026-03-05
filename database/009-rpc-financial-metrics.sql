-- ============================================================================
-- RPC: get_financial_metrics
-- Propósito: Consolidar TODAS as métricas financeiras em 1 query
-- Performance: ~200ms vs loop JavaScript ~1-2s
-- ============================================================================

CREATE OR REPLACE FUNCTION get_financial_metrics(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  today DATE := CURRENT_DATE;
  week_ago DATE := today - INTERVAL '7 days';
  month_start DATE := DATE_TRUNC('month', today);
BEGIN
  -- Consolidar todas as métricas em 1 query usando FILTER clauses
  SELECT json_build_object(
    -- ═══════════════════════════════════════════════════════════════════════
    -- TOTAIS GERAIS (confirmed + completed, exceto cancelled)
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
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- MÊS ATUAL (desde início do mês)
    -- ═══════════════════════════════════════════════════════════════════════
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
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- ÚLTIMA SEMANA (últimos 7 dias)
    -- ═══════════════════════════════════════════════════════════════════════
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
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- HOJE (data atual)
    -- ═══════════════════════════════════════════════════════════════════════
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
    -- MÉTRICAS ESPECIAIS
    -- ═══════════════════════════════════════════════════════════════════════
    
    -- Agendamentos atrasados (data passada + status confirmed + não pago)
    'overdue_amount', COALESCE(
      SUM(payment_total_appointment - total_amount_paid) 
      FILTER (
        WHERE scheduled_date < today 
        AND status = 'confirmed'
        AND payment_total_appointment > total_amount_paid
      ), 
      0
    ),
    
    -- Quantidade de atendimentos com preço customizado
    'custom_price_count', COUNT(*) FILTER (WHERE is_custom_price = true),
    
    -- Ticket médio (apenas agendamentos completed)
    'average_ticket', COALESCE(
      AVG(payment_total_appointment) FILTER (WHERE status = 'completed'), 
      0
    ),
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- CONTADORES POR STATUS (para gráficos/estatísticas)
    -- ═══════════════════════════════════════════════════════════════════════
    'pending_count', COUNT(*) FILTER (WHERE status = 'pending'),
    'confirmed_count', COUNT(*) FILTER (WHERE status = 'confirmed'),
    'completed_count', COUNT(*) FILTER (WHERE status = 'completed'),
    'cancelled_count', COUNT(*) FILTER (WHERE status = 'cancelled'),
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- CONTADORES POR STATUS DE PAGAMENTO
    -- ═══════════════════════════════════════════════════════════════════════
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
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_financial_metrics IS 
  'Retorna TODAS as métricas financeiras consolidadas em 1 query (vs loop JS). Performance: ~200ms vs 1-2s';

-- ============================================================================
-- TESTE RÁPIDO
-- ============================================================================
-- SELECT get_financial_metrics('seu-user-id-aqui');

-- Exemplo de resultado:
-- {
--   "total_receivable": 5000.00,
--   "total_received": 12000.00,
--   "month_receivable": 2500.00,
--   "month_received": 8000.00,
--   "week_receivable": 1000.00,
--   "week_received": 3000.00,
--   "today_receivable": 500.00,
--   "today_received": 1500.00,
--   "overdue_amount": 1200.00,
--   "custom_price_count": 3,
--   "average_ticket": 350.00,
--   "pending_count": 5,
--   "confirmed_count": 12,
--   "completed_count": 45,
--   "cancelled_count": 2,
--   "payment_paid_count": 40,
--   "payment_pending_count": 10,
--   "payment_partial_count": 5
-- }
