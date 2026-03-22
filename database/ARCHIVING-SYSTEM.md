# Sistema de Arquivamento Automático - Appointments

Este guia explica como funciona o sistema de arquivamento automático de agendamentos para melhorar a performance do banco de dados.

## 📋 Visão Geral

O sistema move automaticamente agendamentos **completed** para uma tabela de histórico e limpa agendamentos **pending/cancelled** antigos.

### Benefícios:
- ✅ **Performance:** Menos relacionamentos ativos (appointments_services, etc)
- ✅ **Histórico:** Dados preservados para relatórios de longo prazo
- ✅ **Limpeza:** Remove automaticamente agendamentos que não foram confirmados
- ✅ **Manutenção:** Banco de dados mais enxuto e rápido

---

## 🗄️ Estrutura de Tabelas

### `appointments` (Tabela Ativa)
Contém apenas agendamentos em andamento:
- **Status:** `pending`, `confirmed`, `cancelled`
- **Relacionamentos:** clients, partners, service_areas, services
- **Uso:** Operações do dia a dia, calendário, lista de agendamentos

### `appointments_history` (Tabela de Arquivo)
Contém agendamentos finalizados:
- **Status:** Sempre `completed`
- **Dados:** Snapshot no momento da conclusão
- **Serviços:** Texto consolidado (sem FK para `services`)
- **Uso:** Relatórios históricos, métricas financeiras de longo prazo

---

## ⚙️ Como Funciona

### 1️⃣ Arquivamento Automático (Trigger)

**Quando:** Status muda para `completed`  
**Ação:**
1. Cria registro em `appointments_history` com todos os dados
2. Gera texto consolidado dos serviços (ex: "Maquiagem de Noiva (2x), Penteado (1x)")
3. Deleta registro de `appointments` (e `appointment_services` via CASCADE)

**Código:**
```sql
-- Trigger executa automaticamente ao UPDATE status = 'completed'
-- Ver: 014-archive-completed-trigger.sql
```

---

### 2️⃣ Limpeza de Agendamentos Antigos (Função Manual)

**O que limpa:**
- Agendamentos `pending` criados há mais de **15 dias**
- Agendamentos `cancelled` atualizados há mais de **15 dias**

**Execução Manual:**
```sql
-- Limpar com threshold padrão (15 dias)
SELECT * FROM cleanup_old_appointments();

-- Limpar com threshold customizado (30 dias)
SELECT * FROM cleanup_old_appointments(30);

-- Retorna: (total_deleted, pending_deleted, cancelled_deleted)
```

**Agendamento Automático (Opcional):**
```sql
-- Habilitar extensão pg_cron no Supabase Dashboard primeiro
-- Database → Extensions → Enable "pg_cron"

-- Agendar limpeza diária às 3 AM
SELECT cron.schedule(
  'cleanup-old-appointments',
  '0 3 * * *',
  $$ SELECT cleanup_old_appointments(15) $$
);

-- Ver jobs agendados
SELECT * FROM cron.job;

-- Remover agendamento
SELECT cron.unschedule('cleanup-old-appointments');
```

---

## 📊 Relatórios e Queries

### Consultar Dados Combinados

A função `get_commission_metrics()` já consulta automaticamente **ambas** as tabelas:
```typescript
const { data } = await supabase.rpc('get_commission_metrics', { p_user_id: user.id })
// Retorna métricas incluindo dados arquivados
```

### Queries Manuais

**Total de agendamentos (ativos + arquivo):**
```sql
SELECT 
  (SELECT COUNT(*) FROM appointments WHERE user_id = 'user-id') +
  (SELECT COUNT(*) FROM appointments_history WHERE user_id = 'user-id')
  AS total_appointments_all_time;
```

**Receita total (ativos + arquivo):**
```sql
SELECT 
  COALESCE(
    (SELECT SUM(payment_total_appointment) FROM appointments 
     WHERE user_id = 'user-id' AND status IN ('confirmed', 'completed')), 0
  ) +
  COALESCE(
    (SELECT SUM(payment_total_appointment) FROM appointments_history 
     WHERE user_id = 'user-id'), 0
  ) AS receita_total;
```

**Agendamentos por parceiro (incluindo histórico):**
```sql
WITH combined AS (
  SELECT partner_id, commission_amount FROM appointments 
  WHERE user_id = 'user-id' AND status = 'completed'
  UNION ALL
  SELECT partner_id, commission_amount FROM appointments_history 
  WHERE user_id = 'user-id'
)
SELECT 
  p.name AS parceiro,
  COUNT(*) AS total_atendimentos,
  SUM(c.commission_amount) AS total_repasses
FROM combined c
JOIN partners p ON p.id = c.partner_id
WHERE c.partner_id IS NOT NULL
GROUP BY p.id, p.name
ORDER BY total_repasses DESC;
```

---

## 🔧 Migrations - Ordem de Execução

Execute **nesta ordem** no SQL Editor do Supabase:

### 1. Criar tabela de histórico
```bash
database/013-appointments-history-table.sql
```

### 2. Criar trigger de arquivamento
```bash
database/014-archive-completed-trigger.sql
```

### 3. Criar função de limpeza
```bash
database/015-cleanup-old-appointments.sql
```

### 4. Atualizar RPC de métricas
```bash
database/016-update-commission-metrics-with-history.sql
```

---

## ✅ Verificação

Após executar as migrations, verifique:

### 1. Tabela de histórico existe
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'appointments_history'
ORDER BY ordinal_position;
```

### 2. Trigger está ativo
```sql
SELECT tgname, tgrelid::regclass, tgenabled 
FROM pg_trigger 
WHERE tgname = 'trigger_archive_completed';
```

### 3. Função de limpeza funciona
```sql
SELECT * FROM cleanup_old_appointments(15);
-- Deve retornar: (0, 0, 0) se não houver dados antigos
```

### 4. Teste de arquivamento
```sql
-- 1. Criar agendamento de teste
-- 2. Mudar status para 'completed'
UPDATE appointments 
SET status = 'completed' 
WHERE id = 'test-appointment-id';

-- 3. Verificar que foi movido
SELECT * FROM appointments_history WHERE id = 'test-appointment-id';
SELECT * FROM appointments WHERE id = 'test-appointment-id'; -- Deve estar vazio
```

---

## ⚠️ Considerações Importantes

### Performance
- Tabela `appointments` ficará muito menor (apenas agendamentos ativos)
- Índices otimizados para queries mais rápidas
- Menos JOINs desnecessários

### Backup
- Dados arquivados em `appointments_history` são permanentes
- Fazer backup regular de ambas as tabelas

### Rollback
Se precisar reverter o sistema:
```sql
-- Desabilitar trigger
ALTER TABLE appointments DISABLE TRIGGER trigger_archive_completed;

-- Dropar trigger e função
DROP TRIGGER IF EXISTS trigger_archive_completed ON appointments;
DROP FUNCTION IF EXISTS archive_completed_appointment();

-- Opcional: mover dados de volta
INSERT INTO appointments (...)
SELECT ... FROM appointments_history WHERE ...;
```

---

## 📈 Monitoramento

### Ver quantos registros em cada tabela
```sql
SELECT 
  'appointments' AS tabela,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending,
  COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed,
  COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled
FROM appointments
WHERE user_id = 'your-user-id'

UNION ALL

SELECT 
  'appointments_history' AS tabela,
  COUNT(*) AS total,
  0, 0, 0
FROM appointments_history
WHERE user_id = 'your-user-id';
```

### Ver dados mais antigos em appointments
```sql
SELECT 
  id,
  status,
  created_at,
  scheduled_date,
  AGE(NOW(), created_at) AS idade
FROM appointments
WHERE user_id = 'your-user-id'
ORDER BY created_at ASC
LIMIT 10;
```

---

## 🆘 Troubleshooting

**Problema:** Trigger não está arquivando  
**Solução:** Verificar se trigger está habilitado:
```sql
SELECT tgenabled FROM pg_trigger WHERE tgname = 'trigger_archive_completed';
-- Deve retornar: 'O' (enabled)
```

**Problema:** Limpeza não está deletando  
**Solução:** Verificar datas:
```sql
SELECT id, status, created_at, updated_at, 
       AGE(NOW(), created_at) AS idade
FROM appointments
WHERE status IN ('pending', 'cancelled')
ORDER BY created_at ASC;
```

**Problema:** Relatórios não mostram dados históricos  
**Solução:** Verificar se está usando `get_commission_metrics()` atualizado (migration 016)

---

## 📞 Suporte

Para dúvidas ou problemas com o sistema de arquivamento, verifique:
1. Logs do Supabase (Database → Logs)
2. Permissões RLS nas tabelas
3. Se todas as 4 migrations foram executadas na ordem correta
