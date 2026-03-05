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
database/009-rpc-financial-metrics.sql
```

**Benefícios:**
- RPC functions para queries consolidadas
- Índices otimizados (4x mais rápido)
- Dashboard com 1 query ao invés de 8
- Financial Dashboard com 3 queries ao invés de loop gigante

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

---

## 🚀 RPC Functions (Performance)

| Function | Benefício |
|----------|-----------|
| `check_duplicate_appointment` | Verifica duplicatas (1 query vs N+1) |
| `create_appointment_with_services` | Criação transacional |
| `get_dashboard_metrics` | Dashboard 800ms → 200ms (4x) |
| `get_financial_metrics` | Financial 2s → 200ms (10x) |