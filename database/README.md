# 🗄️ Database Setup

## Ordem de Execução SQL

Execute no **Supabase SQL Editor** nesta ordem:

### 1. Schema Principal
```sql
database/schema-v2-optimized.sql
```
Cria todas as tabelas: `profiles`, `clients`, `appointments`, `services`, `service_categories`, `service_areas`

### 2. Otimizações (Opcional - Recomendado)
```sql
database/005-rpc-check-duplicate-appointment.sql
database/006-rpc-create-appointment-with-services.sql
database/007-optimized-indices.sql
database/008-dashboard-metrics-view.sql
```

**Benefícios:**
- RPC functions para queries consolidadas
- Índices otimizados (4x mais rápido)
- Dashboard com 1 query ao invés de 8

---

## ✅ Tabelas Criadas

| Tabela | Função |
|--------|--------|
| `profiles` | Perfis de usuário |
| `clients` | Clientes (RLS por `user_id`) |
| `appointments` | Agendamentos com serviços |
| `services` | Catálogo de serviços |
| `service_categories` | Categorias |
| `service_areas` | Regiões + taxas de deslocamento |

**Row Level Security (RLS):** ✅ Ativo em todas as tabelas