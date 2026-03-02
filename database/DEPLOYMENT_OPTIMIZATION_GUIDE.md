# GUIA DE DEPLOYMENT DAS OTIMIZAÇÕES

## ⚠️ IMPORTANTE: Executar na ordem correta!

### Passo 1: Executar Scripts SQL no Supabase

Acesse o **SQL Editor** do Supabase e execute os arquivos na ordem:

1. **`database/005-rpc-check-duplicate-appointment.sql`**
   - Cria função RPC para verificação de duplicados
   - Elimina problema N+1 na verificação de appointments
   - Teste: `SELECT check_duplicate_appointment(...)`

2. **`database/006-rpc-create-appointment-with-services.sql`**
   - Cria função RPC transacional para criação de appointments
   - UPSERT automático de cliente + appointment + services
   - Teste: `SELECT create_appointment_with_services(...)`

3. **`database/007-optimized-indices.sql`**
   - Cria 5 índices compostos para queries comuns
   - Melhora performance de listagens e agregações
   - Teste: Use queries EXPLAIN ANALYZE incluídas no arquivo

4. **`database/008-dashboard-metrics-view.sql`** ✨ NOVO
   - Cria função RPC para métricas do dashboard
   - Consolida 8 queries em 1 chamada otimizada
   - Teste: `SELECT get_dashboard_metrics('user-uuid')`

### Passo 2: Validar Funções Criadas

Execute no SQL Editor:

```sql
-- Listar funções criadas
SELECT 
  routine_name, 
  routine_type,
  data_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'check_duplicate_appointment', 
    'create_appointment_with_services',
    'get_dashboard_metrics'
  );

-- Verificar índices criados
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
ORDER BY indexname;

-- Testar métricas do dashboard (substitua pelo seu user_id)
SELECT get_dashboard_metrics('seu-user-id-aqui');
```

### Passo 3: Deploy Frontend

O código frontend já está atualizado e pronto para usar as novas RPCs:

```bash
npm run build
./deploy.ps1
```

### Passo 4: Testar Funcionalidades

Teste essas operações após deployment:

1. **Cache de Perfil** (automático ao carregar PriceCalculator)
   - Abrir Calculadora de Preços
   - Verificar que clientes carregam normalmente
   - Enviar orçamento via WhatsApp (perfil deve estar em cache)

2. **Verificação de Duplicados**
   - Criar appointment confirmado
   - Tentar criar outro idêntico (mesmos serviços + data/hora)
   - Deve mostrar alerta de duplicação

3. **Criação de Appointment**
   - Criar appointment com cliente existente
   - Criar appointment com cliente novo
   - Verificar transação (se falhar, deve fazer rollback completo)

4. **Performance (opcional)**
   - Abrir DevTools → Network
   - Criar appointment e contar requests ao Supabase
   - Deve ter apenas 1-2 requests (vs 6-8 antes)

## 📊 Métricas Esperadas

### Antes das Otimizações
- **Carregamento inicial**: 2 queries sequenciais (clientes, depois perfil)
- **Dashboard load**: 8 queries sequenciais separadas
- **Envio WhatsApp**: 1 query de perfil por envio
- **Verificação duplicados**: 1 query inicial + 5-10 queries (N+1)
- **Criação appointment**: 3-6 queries (client → appointment → services)
- **Total por appointment**: ~8-12 queries
- **Tempo médio dashboard**: 800-1200ms
- **Tempo médio appointment**: 600-900ms

### Depois das Otimizações
- **Carregamento inicial**: 1 Promise.all paralela (clientes + perfil)
- **Dashboard load**: 2 queries paralelas (1 RPC + 1 upcoming)
- **Envio WhatsApp**: 0 queries (usa cache)
- **Verificação duplicados**: 1 RPC call (2 queries internas otimizadas)
- **Criação appointment**: 1 RPC call transacional
- **Total por appointment**: ~2-3 queries
- **Tempo médio dashboard**: 150-250ms (4-5x mais rápido)
- **Tempo médio appointment**: 200-400ms (3x mais rápido)
- **Redução de queries**: 75-80%

## 🔍 Troubleshooting

### Erro: "function does not exist"
- Execute os scripts SQL 005 e 006 no Supabase
- Verifique permissões com `GRANT EXECUTE` incluído nos scripts

### Erro: "column does not exist" 
- Verifique que todas as migrations V2 foram executadas
- Confirme campos: `payment_total_appointment`, `total_amount_paid`, `travel_fee`

### Appointment não é criado
- Abra console do navegador para ver erro detalhado
- Verifique se RPC retorna `{success: true, ...}`
- Teste RPC manualmente no SQL Editor

### Performance não melhorou
- Verifique se índices foram criados: `\di idx_*` no psql
- Execute EXPLAIN ANALYZE nas queries (exemplos no arquivo 007)
- Confirme que RLS policies não estão causando full scans

## ✅ Checklist de Deployment

- [ ] Executar `005-rpc-check-duplicate-appointment.sql`
- [ ] Executar `006-rpc-create-appointment-with-services.sql`
- [ ] Executar `007-optimized-indices.sql`
- [ ] Executar `008-dashboard-metrics-view.sql` ✨
- [ ] Validar funções criadas (query information_schema)
- [ ] Validar índices criados (query pg_indexes)
- [ ] Testar RPC `get_dashboard_metrics` com seu user_id
- [ ] Build frontend (`npm run build`)
- [ ] Deploy para produção (`./deploy.ps1`)
- [ ] Testar carregamento do dashboard (DevTools → Network)
- [ ] Verificar: 2 queries (antes eram 9+)
- [ ] Testar cache de perfil
- [ ] Testar verificação de duplicados
- [ ] Testar criação de appointments (cliente novo + existente)
- [ ] Confirmar que WhatsApp budget funciona (sem query de perfil)

## 📝 Rollback (se necessário)

Se houver problemas graves após deployment:

```sql
-- Remover RPCs
DROP FUNCTION IF EXISTS check_duplicate_appointment(UUID, UUID, UUID, DATE, TIME, UUID[]);
DROP FUNCTION IF EXISTS create_appointment_with_services(UUID, JSONB, JSONB, JSONB);
DROP FUNCTION IF EXISTS get_dashboard_metrics(UUID);

-- Remover índices
DROP INDEX IF EXISTS idx_appointments_user_filters;
DROP INDEX IF EXISTS idx_appointments_duplicate_check;
DROP INDEX IF EXISTS idx_appointment_services_lookup;
DROP INDEX IF EXISTS idx_clients_user_active;
DROP INDEX IF EXISTS idx_appointments_financial;
```

Depois fazer rollback do frontend para commit anterior.

## 🎯 Próximos Passos (Opcional)

Após validar que tudo funciona:

1. **Monitorar performance** no Supabase Dashboard
2. **Ajustar índices** se necessário baseado em queries reais
3. **Considerar outras otimizações**:
   - Cache de services/categories no localStorage
   - Lazy loading de componentes grandes
   - Pagination para listagens longas

---

## 📁 Estrutura de Arquivos Database (Pós-Limpeza 02/12/2025)

### ✅ Arquivos Essenciais Mantidos

```
database/
├── 005-rpc-check-duplicate-appointment.sql ✅ OTIMIZAÇÃO
│   └── RPC para verificação de duplicados (elimina N+1)
│
├── 006-rpc-create-appointment-with-services.sql ✅ OTIMIZAÇÃO
│   └── RPC transacional para criação de appointments
│
├── 007-optimized-indices.sql ✅ PERFORMANCE
│   └── 5 índices compostos estratégicos
│
├── 008-dashboard-metrics-view.sql ✅ PERFORMANCE
│   └── RPC para métricas do dashboard (8 queries → 1)
│
├── schema-v2-optimized.sql ✅ PRINCIPAL
│   └── Schema completo consolidado (execute PRIMEIRO em setup novo)
│
├── create-budgets-bucket.sql ✅ FEATURE OPCIONAL
│   └── Configuração Storage para PDFs/Documentos
│
├── DEPLOYMENT_OPTIMIZATION_GUIDE.md ✅ DOCUMENTAÇÃO
│   └── Este arquivo - guia completo de deployment
│
└── MIGRATION_GUIDE_V2.md ✅ SETUP INICIAL
    └── Guia de migração e configuração inicial do projeto
```

### 🗑️ Arquivos Obsoletos Removidos (55 total)

**Limpeza executada em:** 02/12/2025  
**Branch:** feature/sp01

#### Categorias Removidas:

1. **Documentação de Migração V1→V2 (11 arquivos)**
   - FASE_1_COMPLETA.md, FASE_1_FINAL.md
   - migrate-to-v2.md, migrate-v2.sh
   - CAMPO_*.md, CORRECOES_*.md, TROUBLESHOOTING_*.md
   - FILE_STRUCTURE.md, COMANDOS.md, DEPLOY_GUIDE.md

2. **Scripts SQL de Teste (9 arquivos)**
   - check_tables.sql, supabase_setup.sql
   - test-*.sql, verify-*.sql, query-*.sql

3. **Migrations Incrementais Antigas (27 arquivos)**
   - 001-fix-payment-status.sql até 004-add-travel-fee-field.sql
   - add-*.sql, remove-*.sql, update-*.sql
   - fix-*.sql, future-*.sql
   - create-appointments-*.sql, create_clients_table.sql
   - migrations.sql, migrations-safe.sql
   - COMO_EXECUTAR_MIGRATION.md
   - **Motivo:** Todas consolidadas em `schema-v2-optimized.sql`

4. **Scripts de Seed (3 arquivos)**
   - seed_clients.js, seed_clients.cjs, seed_clients_rest.cjs

5. **Mocks e Exemplos (2 arquivos)**
   - whatsapp-mock.cjs, whatsapp-service-example.js

6. **Assets de Build Antigos (4 arquivos)**
   - assets/index-*.css, assets/index-*.js
   - **Motivo:** Regenerados automaticamente pelo build

### 📋 Ordem de Execução (Setup Novo Banco)

```bash
# 1. SCHEMA BASE (obrigatório)
database/schema-v2-optimized.sql

# 2. OTIMIZAÇÕES (recomendado - ordem importante)
database/005-rpc-check-duplicate-appointment.sql
database/006-rpc-create-appointment-with-services.sql
database/007-optimized-indices.sql
database/008-dashboard-metrics-view.sql

# 3. FEATURES OPCIONAIS
database/create-budgets-bucket.sql  # Se usar PDFs/Documentos
```

### ⚠️ Importante

- **Não executar** migrations antigas (001-004) - já estão em `schema-v2-optimized.sql`
- **Schema V2** é a fonte única de verdade para estrutura do banco
- **Backups:** Migrations antigas preservadas no git history (antes de 02/12/2025)

### 📊 Estatísticas da Limpeza

- **Antes:** ~90 arquivos totais
- **Depois:** ~35 arquivos essenciais
- **Redução:** 61% menos arquivos
- **Espaço liberado:** ~60KB de código obsoleto
- **Manutenibilidade:** Estrutura clara e navegável
