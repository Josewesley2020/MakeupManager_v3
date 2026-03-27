-- Índices de Performance Adicionais para Otimização de Queries
-- Execute este arquivo no Supabase Dashboard SQL Editor APÓS o arquivo 007-optimized-indices.sql
-- Adiciona índices para as novas funcionalidades de Parceiros e Regiões

-- Índice para buscar agendamentos por parceiro (nova funcionalidade)
CREATE INDEX IF NOT EXISTS idx_appointments_partner 
ON appointments(partner_id) WHERE partner_id IS NOT NULL;

-- Índice para buscar agendamentos por região (nova funcionalidade)
CREATE INDEX IF NOT EXISTS idx_appointments_service_area 
ON appointments(service_area_id) WHERE service_area_id IS NOT NULL;

-- Índice para partners por user_id
CREATE INDEX IF NOT EXISTS idx_partners_user 
ON partners(user_id);

-- Índice para service_areas por user_id (se ainda não existir)
CREATE INDEX IF NOT EXISTS idx_service_areas_user 
ON service_areas(user_id);

-- Índice para melhorar queries de comissão
CREATE INDEX IF NOT EXISTS idx_appointments_commission 
ON appointments(user_id, commission_amount) WHERE commission_amount > 0;

-- Análise das tabelas para atualizar estatísticas do query planner
ANALYZE appointments;
ANALYZE appointment_services;
ANALYZE partners;
ANALYZE service_areas;

-- Query para verificar os índices da tabela appointments
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'appointments'
ORDER BY indexname;
