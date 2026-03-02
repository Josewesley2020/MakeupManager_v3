-- =====================================================
-- RPC: check_duplicate_appointment
-- Descrição: Verifica se há agendamento duplicado de forma otimizada
-- Elimina problema N+1 ao fazer comparação de arrays no banco
-- =====================================================

CREATE OR REPLACE FUNCTION check_duplicate_appointment(
  p_user_id UUID,
  p_client_id UUID,
  p_service_area_id UUID,
  p_scheduled_date DATE,
  p_scheduled_time TIME,
  p_service_ids UUID[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_appointment_id UUID;
  v_existing_service_ids UUID[];
BEGIN
  -- Buscar agendamento existente com mesma data/hora/cliente/área
  SELECT id INTO v_existing_appointment_id
  FROM appointments
  WHERE user_id = p_user_id
    AND client_id = p_client_id
    AND service_area_id = p_service_area_id
    AND scheduled_date = p_scheduled_date
    AND scheduled_time = p_scheduled_time
    AND status != 'cancelled'
  LIMIT 1;
  
  -- Se não encontrou agendamento, não é duplicado
  IF v_existing_appointment_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Carregar todos os service_ids do agendamento existente em um array
  SELECT ARRAY_AGG(service_id ORDER BY service_id)
  INTO v_existing_service_ids
  FROM appointment_services
  WHERE appointment_id = v_existing_appointment_id;
  
  -- Comparar arrays (ordenados para garantir comparação correta)
  -- Se arrays são iguais, é duplicado
  IF v_existing_service_ids = (SELECT ARRAY_AGG(x ORDER BY x) FROM UNNEST(p_service_ids) AS x) THEN
    RETURN TRUE;
  END IF;
  
  -- Serviços diferentes, não é duplicado
  RETURN FALSE;
END;
$$;

-- Garantir que a função possa ser executada por usuários autenticados
GRANT EXECUTE ON FUNCTION check_duplicate_appointment(UUID, UUID, UUID, DATE, TIME, UUID[]) TO authenticated;

-- Comentário descritivo
COMMENT ON FUNCTION check_duplicate_appointment IS 'Verifica duplicação de agendamentos comparando arrays de serviços no banco (elimina N+1 queries)';
