# Partners & Commission System - Database Migrations

Este arquivo contém as instruções para executar as migrations do sistema de parceiros e gestão de comissões.

## Ordem de Execução

Execute as migrations **nesta ordem** no SQL Editor do Supabase:

### 1. Tabela Partners
**Arquivo:** `010-partners-table.sql`
**Descrição:** Cria tabela de parceiros (colaboradores que executam serviços)
**Impacto:** Tabela nova, sem dependências

```sql
-- Execute todo o conteúdo do arquivo 010-partners-table.sql
```

### 2. Campos de Parceiro em Appointments
**Arquivo:** `011-appointments-add-partner.sql`
**Descrição:** Adiciona partner_id e commission_amount à tabela appointments
**Impacto:** ALTER TABLE (não afeta dados existentes, campos nullable/default)

```sql
-- Execute todo o conteúdo do arquivo 011-appointments-add-partner.sql
```

### 3. RPC Commission Metrics
**Arquivo:** `012-rpc-commission-metrics.sql`
**Descrição:** Função para calcular métricas financeiras com comissões
**Impacto:** Função nova, não afeta dados

```sql
-- Execute todo o conteúdo do arquivo 012-rpc-commission-metrics.sql
```

### 4. Atualização RPC Create Appointment
**Arquivo:** `006-rpc-create-appointment-with-services.sql` (modificado)
**Descrição:** Atualiza função para incluir partner_id e commission_amount
**Impacto:** Substitui função existente (CREATE OR REPLACE)

```sql
-- Execute todo o conteúdo do arquivo 006-rpc-create-appointment-with-services.sql
```

## Verificação

Após executar todas as migrations, verifique:

### Verificar Tabela Partners
```sql
SELECT * FROM partners LIMIT 1;
-- Deve retornar vazio (sem erro)
```

### Verificar Campos em Appointments
```sql
SELECT partner_id, commission_amount 
FROM appointments 
LIMIT 1;
-- Deve retornar NULL, 0 (ou vazio sem erro)
```

### Verificar RPC Commission Metrics
```sql
SELECT get_commission_metrics('YOUR-USER-ID-HERE'::UUID);
-- Deve retornar JSON com métricas
```

### Verificar RPC Create Appointment (argumentos)
```sql
SELECT 
  proname, 
  pg_get_function_arguments(oid) as args
FROM pg_proc 
WHERE proname = 'create_appointment_with_services';
-- Deve retornar: p_user_id uuid, p_client_data jsonb, p_appointment_data jsonb, p_services jsonb
```

## Rollback (se necessário)

Se algo der errado, você pode reverter na ordem inversa:

```sql
-- 1. Reverter função create_appointment_with_services (executar versão antiga)
-- 2. Dropar função commission_metrics
DROP FUNCTION IF EXISTS get_commission_metrics(UUID);

-- 3. Remover campos de appointments
ALTER TABLE appointments DROP COLUMN IF EXISTS partner_id;
ALTER TABLE appointments DROP COLUMN IF EXISTS commission_amount;
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_commission_valid;

-- 4. Dropar tabela partners
DROP TABLE IF EXISTS partners CASCADE;
```

## Notas Importantes

- ✅ **RLS Habilitado:** Todas as tabelas têm Row Level Security para isolamento de dados por usuário
- ✅ **Backward Compatible:** Campos novos são nullable/default, não quebra dados existentes
- ✅ **Transactional:** CREATE OR REPLACE garante que não há downtime
- ✅ **Indexed:** Índices criados para otimizar queries de comissões e parceiros
- ⚠️ **Execução Manual:** Por segurança, execute manualmente no Supabase (não há auto-migration)

## Schema Visual

### Novos Relacionamentos

```
partners (nova tabela)
├─ id (PK)
├─ user_id (FK → auth.users)
├─ name
├─ phone
└─ notes

appointments (campos novos)
├─ partner_id (FK → partners.id) [nullable]
└─ commission_amount (decimal) [default 0]
```

### Lógica de Negócio

- `partner_id = NULL` → Atendimento feito pela proprietária
- `partner_id = UUID` → Atendimento feito por parceira
- `commission_amount = 0` → Sem comissão (proprietária)
- `commission_amount > 0` → Valor do repasse à parceira
- **Lucro Líquido** = payment_total_appointment - commission_amount

## Suporte

Se encontrar erros durante a execução:
1. Verifique se está executando em ordem
2. Confirme que tem permissões de admin no Supabase
3. Verifique logs de erro no Supabase SQL Editor
4. Reverta com os comandos de rollback acima
