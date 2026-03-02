-- =====================================================
-- ÍNDICES OTIMIZADOS PARA QUERIES COMUNS
-- Elimina full table scans em queries frequentes
-- =====================================================

-- =====================================================
-- ÍNDICE 1: Busca de appointments por user + filters
-- Usado em: Dashboard, Calendar, Financial queries
-- Benefício: Filtros comuns de appointments (user_id + date + status)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_appointments_user_filters 
ON appointments (user_id, scheduled_date, scheduled_time, status)
WHERE scheduled_date IS NOT NULL;

COMMENT ON INDEX idx_appointments_user_filters IS 
'Otimiza queries de appointments por usuário com filtros de data e status';

-- =====================================================
-- ÍNDICE 2: Duplicate check optimization
-- Usado em: check_duplicate_appointment RPC
-- Benefício: Busca rápida por combinação exata de appointment
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_appointments_duplicate_check 
ON appointments (user_id, client_id, service_area_id, scheduled_date, scheduled_time, status);

COMMENT ON INDEX idx_appointments_duplicate_check IS 
'Otimiza verificação de agendamentos duplicados (usado pela RPC)';

-- =====================================================
-- ÍNDICE 3: Appointment services lookup
-- Usado em: Queries de serviços por appointment
-- Benefício: JOIN rápido entre appointments e services
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_appointment_services_lookup 
ON appointment_services (appointment_id, service_id);

COMMENT ON INDEX idx_appointment_services_lookup IS 
'Otimiza busca de serviços por agendamento';

-- =====================================================
-- ÍNDICE 4: Client lookup optimization
-- Usado em: Busca de clientes por user
-- Benefício: Filtros de clientes ativos por usuário
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_clients_user_active 
ON clients (user_id, name)
WHERE created_at IS NOT NULL;

COMMENT ON INDEX idx_clients_user_active IS 
'Otimiza listagem de clientes por usuário com filtro de nome';

-- =====================================================
-- ÍNDICE 5: Financial queries optimization
-- Usado em: FinancialDashboard e relatórios
-- Benefício: Agregações por período e status de pagamento
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_appointments_financial 
ON appointments (user_id, scheduled_date, payment_status, payment_total_appointment)
WHERE scheduled_date IS NOT NULL;

COMMENT ON INDEX idx_appointments_financial IS 
'Otimiza queries financeiras (receita por período e status de pagamento)';

-- =====================================================
-- ANÁLISE DE IMPACTO DOS ÍNDICES
-- =====================================================
-- Executar EXPLAIN ANALYZE antes e depois para medir ganho:
--
-- Query de teste 1 (duplicate check):
-- EXPLAIN ANALYZE
-- SELECT id FROM appointments 
-- WHERE user_id = '<user_id>'
--   AND client_id = '<client_id>'
--   AND service_area_id = '<area_id>'
--   AND scheduled_date = '2024-01-15'
--   AND scheduled_time = '14:00:00'
--   AND status != 'cancelled';
--
-- Query de teste 2 (financial):
-- EXPLAIN ANALYZE
-- SELECT SUM(payment_total_appointment) 
-- FROM appointments 
-- WHERE user_id = '<user_id>'
--   AND scheduled_date BETWEEN '2024-01-01' AND '2024-01-31'
--   AND payment_status = 'paid';
--
-- Query de teste 3 (calendar):
-- EXPLAIN ANALYZE
-- SELECT * FROM appointments 
-- WHERE user_id = '<user_id>'
--   AND scheduled_date BETWEEN '2024-01-01' AND '2024-01-31'
-- ORDER BY scheduled_date, scheduled_time;
