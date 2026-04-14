# 🗄️ Database Setup

## Ordem de Execução SQL

Execute no **Supabase SQL Editor** nesta ordem:

### 1. Schema Principal
```sql
database/schema-v2-optimized.sql
```
Cria todas as tabelas principais: `profiles`, `clients`, `appointments`, `appointment_services`, `services`, `service_categories`, `service_areas`

### 2. RPC Functions & Otimizações (Recomendado)
```sql
database/005-rpc-check-duplicate-appointment.sql
database/006-fix-rpc-create-appointment.sql           # Versão corrigida do RPC
database/007-optimized-indices.sql
database/008-dashboard-metrics-view.sql
database/009-rpc-financial-metrics.sql
```

### 3. Sistema de Parceiros (Opcional)
```sql
database/010-partners-table.sql                       # Tabela de parceiros
database/011-appointments-add-partner.sql             # Campos partner_id e commission_amount
database/012-rpc-commission-metrics.sql               # Métricas com comissões
database/006-rpc-create-appointment-with-services.sql # Atualiza RPC para suportar parceiros
```

### 4. Sistema de Arquivamento (Opcional)
```sql
database/013-appointments-history-table.sql           # Tabela de histórico
database/014-archive-completed-trigger.sql            # Trigger automático
database/015-cleanup-old-appointments.sql             # Função de limpeza
database/016-update-commission-metrics-with-history.sql # Atualiza métricas
```

### 5. Índices Avançados & Utilitários (Opcional)
```sql
database/017-performance-indices.sql                  # Índices adicionais
database/018-rpc-schedule-conflict.sql                # Verificação de conflitos
```

**Benefícios:**
- RPC functions para queries consolidadas
- Índices otimizados (4x mais rápido)
- Dashboard com 1 query ao invés de 8
- Financial Dashboard com 3 queries ao invés de loop gigante
- Sistema de parceiros com gestão de comissões
- Arquivamento automático para performance

---

## ✅ Tabelas Criadas

### Tabelas Principais
| Tabela | Função |
|--------|--------|
| `profiles` | Perfis de usuário e configurações |
| `clients` | Clientes (RLS por `user_id`) |
| `appointments` | Agendamentos ativos |
| `appointment_services` | Serviços por agendamento (many-to-many) |
| `services` | Catálogo de serviços |
| `service_categories` | Categorias de serviços |
| `service_areas` | Regiões + taxas de deslocamento |

### Tabelas Opcionais
| Tabela | Função | Migration |
|--------|--------|-----------|
| `partners` | Parceiros/colaboradores | 010-partners-table.sql |
| `appointments_history` | Histórico de agendamentos completos | 013-appointments-history-table.sql |

**Row Level Security (RLS):** ✅ Ativo em todas as tabelas

---

## 🚀 RPC Functions (Performance)

| Function | Benefício | Migration |
|----------|-----------|-----------|
| `check_duplicate_appointment` | Verifica duplicatas (1 query vs N+1) | 005 |
| `create_appointment_with_services` | Criação transacional com serviços e parceiros | 006 |
| `get_dashboard_metrics` | Dashboard 800ms → 200ms (4x) | 008 |
| `get_financial_metrics` | Financial 2s → 200ms (10x) | 009 |
| `get_commission_metrics` | Métricas com comissões de parceiros | 012 |
| `cleanup_old_appointments` | Remove pending/cancelled antigos | 015 |
| `check_schedule_conflict` | Detecta conflitos de horário | 018 |

---

## 🔧 Notas Importantes

### Payment Fields (V2 - Simplificado)
**Campos Atuais:**
- `payment_total_service` - Total dos serviços (sem taxa de deslocamento)
- `travel_fee` - Taxa de deslocamento
- `payment_total_appointment` - Total completo (serviços + taxa)
- `total_amount_paid` - Soma de todos os pagamentos realizados
- `payment_status` - 'paid' ou 'pending' (atualizado automaticamente por trigger)

**Campos Removidos (não usar):**
- ❌ `payment_down_payment_expected` - Removido na V2
- ❌ `payment_down_payment_paid` - Removido na V2
- ❌ `whatsapp_message` - Nunca implementado
- ❌ `whatsapp_sent_at` - Gerenciado automaticamente

### Partners System (Opcional)
Após executar migrations 010-012:
- Campo `partner_id` em appointments (FK para partners)
- Campo `commission_amount` - Valor do repasse ao parceiro
- Lógica: Lucro Líquido = payment_total_appointment - commission_amount
- RPC `get_commission_metrics()` consulta ambas tabelas (appointments + appointments_history)

### Archiving System (Opcional)
Após executar migrations 013-016:
- Appointments com status `completed` são movidos automaticamente para `appointments_history`
- Trigger executa na mudança de status
- Função `cleanup_old_appointments(days)` remove pending/cancelled antigos
- Financial metrics incluem dados históricos automaticamente

### Migration Order (Importante)
Execute **sempre nesta ordem** para evitar erros de dependência:
1. Schema principal (cria tabelas base)
2. RPCs e otimizações (funções que dependem das tabelas)
3. Partners (adiciona campos em appointments)
4. Archiving (cria history table e triggers)
5. Índices avançados (otimizações finais)

### Rollback (Se Necessário)
Para reverter partners system:
```sql
ALTER TABLE appointments DROP COLUMN IF EXISTS partner_id;
ALTER TABLE appointments DROP COLUMN IF EXISTS commission_amount;
DROP TABLE IF EXISTS partners CASCADE;
DROP FUNCTION IF EXISTS get_commission_metrics(UUID);
```

Para reverter archiving system:
```sql
DROP TRIGGER IF EXISTS archive_completed_appointments_trigger ON appointments;
DROP FUNCTION IF EXISTS archive_completed_appointment();
DROP FUNCTION IF EXISTS cleanup_old_appointments(INTEGER);
DROP TABLE IF EXISTS appointments_history CASCADE;
```

---

## 📚 Documentação Adicional

- **[ARCHIVING-SYSTEM.md](ARCHIVING-SYSTEM.md)** - Guia detalhado do sistema de arquivamento
- **Migration Files** - Cada arquivo .sql contém comentários explicativos