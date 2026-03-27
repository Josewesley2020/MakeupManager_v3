# 🔧 CORREÇÃO: RPC create_appointment_with_services

## Problema Identificado

O RPC `create_appointment_with_services` estava tentando inserir colunas que não existem na tabela `appointments`:

❌ **Colunas removidas (não fazem mais sentido):**
- `payment_down_payment_expected` 
- `payment_down_payment_paid`
- `whatsapp_sent_at` (calculado automaticamente via trigger)
- `whatsapp_message` (não existe na v2)

❌ **Colunas de parceiro (ainda não adicionadas - dependem de migração 011):**
- `partner_id`
- `commission_amount`

## Estrutura Atual da Tabela `appointments`

✅ **Colunas de pagamento válidas:**
- `travel_fee` - Taxa de deslocamento
- `payment_total_service` - Total dos serviços (sem taxa)
- `payment_total_appointment` - Total do agendamento (com taxa)
- `total_amount_paid` - Valor já pago
- `payment_status` - Status: 'paid' ou 'pending'

## Solução Aplicada

### 1. Atualizado o RPC (arquivo `006-fix-rpc-create-appointment.sql`)
✅ Removidas todas as colunas inexistentes
✅ Mantidas apenas as colunas que existem atualmente
✅ Pronto para funcionar

### 2. Atualizado o PriceCalculator
✅ Campos `partner_id` e `commission_amount` comentados temporariamente
✅ Serão habilitados após executar a migração 011

## 📋 PRÓXIMOS PASSOS

### Passo 1: Executar correção do RPC (IMEDIATO)
Execute este arquivo no Supabase SQL Editor:
```
database/006-fix-rpc-create-appointment.sql
```

### Passo 2: Testar criação de agendamento
Após executar o fix acima, teste criar um agendamento. Deve funcionar normalmente.

### Passo 3: Quando quiser adicionar sistema de parceiros
Execute as migrações na ordem:
1. `database/010-partners-table.sql` - Cria tabela de parceiros
2. `database/011-appointments-add-partner.sql` - Adiciona campos de parceiro em appointments
3. Descomente as linhas no PriceCalculator (buscar por "TODO: Habilitar após executar migração 011")
4. Execute o RPC atualizado com suporte a parceiros (será criado após migração 011)

## Resumo das Mudanças

### Campos que NÃO fazem mais sentido (removidos permanentemente):
- ❌ `payment_down_payment_expected` - Complexidade desnecessária
- ❌ `payment_down_payment_paid` - Substituído por `total_amount_paid`

### Campos que serão adicionados futuramente (quando migração 011 for executada):
- 🔜 `partner_id` - ID do parceiro que realizará o atendimento
- 🔜 `commission_amount` - Valor da comissão/repasse

### Sistema atual simplificado:
```
Total do Agendamento = Serviços + Taxa de Deslocamento
Total Pago = Soma de todos os pagamentos realizados
Pendente = Total do Agendamento - Total Pago
Status = 'paid' (se pago integralmente) ou 'pending'
```

## ✅ Status Atual

- [x] RPC corrigido (sem colunas inexistentes)
- [x] PriceCalculator atualizado (campos de parceiro comentados)
- [ ] Executar fix no Supabase (VOCÊ PRECISA FAZER ISSO)
- [ ] Testar criação de agendamento
- [ ] (Futuro) Executar migrações de parceiros
