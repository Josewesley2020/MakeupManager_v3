-- =====================================================
-- RPC: check_schedule_conflict
-- Descrição: Verifica se há conflito de horário para um prestador
-- Detecta sobreposição de agendamentos considerando duração
-- =====================================================

CREATE OR REPLACE FUNCTION check_schedule_conflict(
  p_prestador_id UUID,  -- user_id ou partner_id
  p_scheduled_date DATE,
  p_scheduled_time TIME,
  p_duration_minutes INTEGER,
  p_exclude_appointment_id UUID DEFAULT NULL  -- Para edição, ignora o próprio agendamento
)
RETURNS TABLE (
  has_conflict BOOLEAN,
  conflict_appointment_id UUID,
  conflict_client_name TEXT,
  conflict_time_start TIME,
  conflict_time_end TIME
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_time_end TIME;
BEGIN
  -- Calcular horário de término do novo agendamento
  v_time_end := p_scheduled_time + (p_duration_minutes || ' minutes')::INTERVAL;
  
  -- Buscar agendamentos que possam conflitar
  -- Conflito ocorre quando:
  -- 1. Mesmo prestador (user_id ou partner_id)
  -- 2. Mesma data
  -- 3. Status não cancelado
  -- 4. Intervalos de tempo se sobrepõem
  RETURN QUERY
  SELECT 
    TRUE as has_conflict,
    a.id as conflict_appointment_id,
    c.name as conflict_client_name,
    a.scheduled_time as conflict_time_start,
    (a.scheduled_time + (COALESCE(a.total_duration_minutes, 60) || ' minutes')::INTERVAL)::TIME as conflict_time_end
  FROM appointments a
  LEFT JOIN clients c ON c.id = a.client_id
  WHERE 
    -- Mesma data
    a.scheduled_date = p_scheduled_date
    -- Não cancelado
    AND a.status != 'cancelled'
    -- Excluir o próprio agendamento (caso edição)
    AND (p_exclude_appointment_id IS NULL OR a.id != p_exclude_appointment_id)
    -- Prestador = owner (user_id) OU partner (partner_id)
    AND (a.user_id = p_prestador_id OR a.partner_id = p_prestador_id)
    -- Verificar sobreposição de horários
    -- Novo agendamento começa antes do existente terminar E termina depois do existente começar
    AND (
      (p_scheduled_time < (a.scheduled_time + (COALESCE(a.total_duration_minutes, 60) || ' minutes')::INTERVAL)::TIME)
      AND 
      (v_time_end > a.scheduled_time)
    )
  LIMIT 1;  -- Retorna apenas o primeiro conflito encontrado
  
  -- Se não encontrou conflito, retornar linha indicando sem conflito
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TIME, NULL::TIME;
  END IF;
END;
$$;

-- Garantir que a função possa ser executada por usuários autenticados
GRANT EXECUTE ON FUNCTION check_schedule_conflict(UUID, DATE, TIME, INTEGER, UUID) TO authenticated;

-- Comentário descritivo
COMMENT ON FUNCTION check_schedule_conflict IS 'Verifica conflito de horário para prestador, detectando sobreposição de agendamentos';

-- =====================================================
-- Adicionar índice para performance da query de conflito
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_appointments_conflict_check 
ON appointments (user_id, scheduled_date, scheduled_time) 
WHERE status != 'cancelled';

CREATE INDEX IF NOT EXISTS idx_appointments_partner_conflict_check 
ON appointments (partner_id, scheduled_date, scheduled_time) 
WHERE status != 'cancelled' AND partner_id IS NOT NULL;

-- Comentários nos índices
COMMENT ON INDEX idx_appointments_conflict_check IS 'Índice otimizado para verificação de conflitos de horário do proprietário';
COMMENT ON INDEX idx_appointments_partner_conflict_check IS 'Índice otimizado para verificação de conflitos de horário de parceiros';
