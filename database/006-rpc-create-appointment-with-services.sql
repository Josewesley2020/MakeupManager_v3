-- =====================================================
-- RPC: create_appointment_with_services
-- Descrição: Cria agendamento com serviços em TRANSAÇÃO ATÔMICA
-- Elimina 3 operações sequenciais (client upsert + appointment + services)
-- =====================================================

CREATE OR REPLACE FUNCTION create_appointment_with_services(
  p_user_id UUID,
  p_client_data JSONB,
  p_appointment_data JSONB,
  p_services JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_id UUID;
  v_appointment_id UUID;
  v_service JSONB;
  v_result JSONB;
BEGIN
  -- 1. UPSERT do cliente (se necessário)
  IF p_client_data->>'id' IS NOT NULL AND p_client_data->>'id' != '' THEN
    -- Cliente existente, usar ID fornecido
    v_client_id := (p_client_data->>'id')::UUID;
  ELSE
    -- Cliente novo, criar
    INSERT INTO clients (
      user_id,
      name,
      phone,
      email,
      address,
      instagram,
      notes
    ) VALUES (
      p_user_id,
      p_client_data->>'name',
      p_client_data->>'phone',
      p_client_data->>'email',
      p_client_data->>'address',
      p_client_data->>'instagram',
      p_client_data->>'notes'
    )
    RETURNING id INTO v_client_id;
  END IF;

  -- 2. Criar appointment
  INSERT INTO appointments (
    user_id,
    client_id,
    service_area_id,
    scheduled_date,
    scheduled_time,
    status,
    appointment_address,
    notes,
    is_custom_price,
    travel_fee,
    payment_total_appointment,
    payment_total_service,
    total_amount_paid,
    payment_down_payment_expected,
    payment_down_payment_paid,
    payment_status,
    total_duration_minutes,
    whatsapp_sent,
    whatsapp_sent_at,
    whatsapp_message
  ) VALUES (
    p_user_id,
    v_client_id,
    (p_appointment_data->>'service_area_id')::UUID,
    (p_appointment_data->>'scheduled_date')::DATE,
    (p_appointment_data->>'scheduled_time')::TIME,
    p_appointment_data->>'status',
    p_appointment_data->>'appointment_address',
    p_appointment_data->>'notes',
    (p_appointment_data->>'is_custom_price')::BOOLEAN,
    (p_appointment_data->>'travel_fee')::DECIMAL,
    (p_appointment_data->>'payment_total_appointment')::DECIMAL,
    (p_appointment_data->>'payment_total_service')::DECIMAL,
    (p_appointment_data->>'total_amount_paid')::DECIMAL,
    (p_appointment_data->>'payment_down_payment_expected')::DECIMAL,
    (p_appointment_data->>'payment_down_payment_paid')::DECIMAL,
    p_appointment_data->>'payment_status',
    (p_appointment_data->>'total_duration_minutes')::INTEGER,
    (p_appointment_data->>'whatsapp_sent')::BOOLEAN,
    CASE 
      WHEN (p_appointment_data->>'whatsapp_sent')::BOOLEAN THEN NOW()
      ELSE NULL
    END,
    p_appointment_data->>'whatsapp_message'
  )
  RETURNING id INTO v_appointment_id;

  -- 3. Inserir serviços (batch insert otimizado)
  FOR v_service IN SELECT * FROM jsonb_array_elements(p_services)
  LOOP
    INSERT INTO appointment_services (
      appointment_id,
      service_id,
      quantity,
      unit_price,
      total_price
    ) VALUES (
      v_appointment_id,
      (v_service->>'service_id')::UUID,
      (v_service->>'quantity')::INTEGER,
      (v_service->>'unit_price')::DECIMAL,
      (v_service->>'total_price')::DECIMAL
    );
  END LOOP;

  -- 4. Retornar resultado completo
  v_result := jsonb_build_object(
    'success', true,
    'client_id', v_client_id,
    'appointment_id', v_appointment_id
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Em caso de erro, rollback automático da transação
    RAISE EXCEPTION 'Erro ao criar agendamento: %', SQLERRM;
END;
$$;

-- Garantir que a função possa ser executada por usuários autenticados
GRANT EXECUTE ON FUNCTION create_appointment_with_services(UUID, JSONB, JSONB, JSONB) TO authenticated;

-- Comentário descritivo
COMMENT ON FUNCTION create_appointment_with_services IS 'Cria agendamento completo (cliente + appointment + serviços) em transação atômica';
