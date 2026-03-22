-- Migration 014: Create automatic archiving trigger for completed appointments
-- Purpose: Automatically move completed appointments to history table
-- Related to: Performance optimization and data archiving

-- Function to archive completed appointment
CREATE OR REPLACE FUNCTION archive_completed_appointment()
RETURNS TRIGGER AS $$
DECLARE
  v_services_summary TEXT;
BEGIN
  -- Only archive if status changed TO 'completed' (prevent re-archiving)
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Build services summary text from appointment_services
    SELECT string_agg(
      COALESCE(s.name, 'Serviço') || 
      CASE WHEN aps.quantity > 1 THEN ' (' || aps.quantity || 'x)' ELSE '' END,
      ', '
    ORDER BY aps.created_at)
    INTO v_services_summary
    FROM appointment_services aps
    LEFT JOIN services s ON s.id = aps.service_id
    WHERE aps.appointment_id = NEW.id;
    
    -- If no services found, use generic text
    IF v_services_summary IS NULL THEN
      v_services_summary := 'Serviços não especificados';
    END IF;
    
    -- Insert into appointments_history
    INSERT INTO appointments_history (
      id,
      user_id,
      client_id,
      partner_id,
      service_area_id,
      scheduled_date,
      scheduled_time,
      original_status,
      appointment_address,
      notes,
      is_custom_price,
      travel_fee,
      payment_total_appointment,
      payment_total_service,
      total_amount_paid,
      payment_status,
      commission_amount,
      services_summary,
      total_duration_minutes,
      whatsapp_sent,
      whatsapp_sent_at,
      completed_at,
      archived_at,
      original_created_at
    ) VALUES (
      NEW.id,
      NEW.user_id,
      NEW.client_id,
      NEW.partner_id,
      NEW.service_area_id,
      NEW.scheduled_date,
      NEW.scheduled_time,
      'completed',
      NEW.appointment_address,
      NEW.notes,
      NEW.is_custom_price,
      NEW.travel_fee,
      NEW.payment_total_appointment,
      NEW.payment_total_service,
      NEW.total_amount_paid,
      NEW.payment_status,
      NEW.commission_amount,
      v_services_summary,
      NEW.total_duration_minutes,
      NEW.whatsapp_sent,
      NEW.whatsapp_sent_at,
      NOW(), -- completed_at
      NOW(), -- archived_at
      NEW.created_at -- original_created_at
    );
    
    -- Delete from appointments (cascade will delete appointment_services)
    DELETE FROM appointments WHERE id = NEW.id;
    
    -- Return NULL to prevent original UPDATE (row already deleted)
    RETURN NULL;
  END IF;
  
  -- For other status changes, allow normal update
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on appointments table
DROP TRIGGER IF EXISTS trigger_archive_completed ON appointments;
CREATE TRIGGER trigger_archive_completed
  BEFORE UPDATE OF status ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION archive_completed_appointment();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION archive_completed_appointment() TO authenticated;

-- Comments
COMMENT ON FUNCTION archive_completed_appointment IS 'Automatically archives completed appointments to history table and removes from active appointments';
COMMENT ON TRIGGER trigger_archive_completed ON appointments IS 'Triggers archiving when appointment status changes to completed';
