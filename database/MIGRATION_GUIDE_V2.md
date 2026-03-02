# Guia de Migração - MakeupManager V2

## ⚠️ IMPORTANTE
Esta é uma migração **DESTRUTIVA**. Você precisará criar um novo projeto Supabase (V2) e **NÃO** poderá migrar dados automaticamente da V1.

## 📋 Pré-requisitos
- Conta no Supabase (https://supabase.com)
- Node.js 18+ instalado
- Acesso ao código-fonte do MakeupManager_v2

## 🚀 Passo a Passo

### 1. Criar Novo Projeto Supabase V2

1. Acesse https://app.supabase.com
2. Clique em **"New Project"**
3. Preencha:
   - **Nome**: MakeupManager-V2 (ou outro de sua preferência)
   - **Database Password**: Anote em local seguro
   - **Region**: Escolha a mais próxima (exemplo: South America - São Paulo)
4. Clique em **"Create new project"**
5. Aguarde 2-3 minutos para o projeto ser criado

### 2. Executar Schema V2

1. No dashboard do Supabase V2, vá em **"SQL Editor"**
2. Clique em **"New query"**
3. Abra o arquivo `database/schema-v2-optimized.sql` no VS Code
4. Copie **TODO** o conteúdo (750 linhas)
5. Cole no SQL Editor do Supabase
6. Clique em **"Run"** (ou Ctrl+Enter)
7. Aguarde a execução (pode levar 10-20 segundos)
8. Verifique se não há erros na parte inferior da tela

### 3. Obter Credenciais do Projeto V2

1. No dashboard do Supabase V2, vá em **"Settings"** → **"API"**
2. Anote as seguintes informações:
   - **Project URL**: `https://seu-projeto.supabase.co`
   - **anon/public key**: Chave pública longa (começa com `eyJ...`)

### 4. Configurar .env.local

1. Na raiz do projeto MakeupManager_v2, crie (ou edite) o arquivo `.env.local`
2. Adicione as variáveis com as credenciais do passo 3:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. Salve o arquivo

### 5. Atualizar GitHub Pages (Produção)

Para atualizar o site em produção com as novas credenciais:

1. Vá em **GitHub** → Seu repositório → **Settings** → **Secrets and variables** → **Actions**
2. Atualize (ou crie) os seguintes **Repository Secrets**:
   - `VITE_SUPABASE_URL`: Cole a URL do projeto V2
   - `VITE_SUPABASE_ANON_KEY`: Cole a chave anon do projeto V2
3. Faça commit e push das alterações no código
4. O GitHub Actions fará deploy automaticamente

### 6. Testar Conexão Local

1. Abra o terminal no VS Code
2. Execute:
```bash
npm install
npm run dev
```
3. Abra http://localhost:3000
4. Clique em **"Sign Up"** e crie uma nova conta de teste
5. Verifique se consegue:
   - Criar clientes
   - Criar categorias e serviços
   - Criar áreas de atendimento
   - Criar agendamentos

### 7. Verificar Tabelas no Supabase

1. No dashboard do Supabase V2, vá em **"Table Editor"**
2. Verifique se as seguintes tabelas foram criadas:
   - `profiles` (perfis de usuário)
   - `clients` (clientes)
   - `service_categories` (categorias de serviço)
   - `services` (serviços)
   - `service_areas` (áreas de atendimento)
   - `appointments` (agendamentos)
   - `appointment_services` (itens do agendamento)

## ✅ Verificação de Sucesso

Você saberá que a migração foi bem-sucedida quando:

1. ✅ Conseguir fazer login no sistema local
2. ✅ Conseguir criar e editar clientes
3. ✅ Conseguir criar serviços e categorias
4. ✅ Conseguir criar agendamentos com cálculo de pagamento
5. ✅ O dashboard financeiro mostrar dados corretos
6. ✅ Não houver erros no console do navegador (F12)

## 🔍 Principais Mudanças na V2

### Campos Removidos (Breaking Changes)
- ❌ `total_received` (substituído por `total_amount_paid`)
- ❌ `payment_down_payment_paid` (use `total_amount_paid`)
- ❌ `payment_down_payment_expected` (não mais necessário)
- ❌ `service_regional_prices` (substituído por lógica de áreas)
- ❌ Status `partial` em appointments (use `pending` ou `paid`)

### Campos Mantidos e Otimizados
- ✅ `payment_total_service` (valor dos serviços sem taxa)
- ✅ `payment_total_appointment` (valor total com taxa)
- ✅ `total_amount_paid` (valor total já pago - USAR ESTE)
- ✅ `travel_fee` (taxa de deslocamento)
- ✅ `payment_status` ('pending' | 'paid' - atualizado automaticamente via trigger)

### Novas Funcionalidades
- ✅ Trigger automático para atualizar `payment_status` baseado em `total_amount_paid`
- ✅ CHECK constraints para garantir integridade dos dados
- ✅ Índices otimizados para consultas mais rápidas
- ✅ PaymentService centralizado para todos os cálculos

## 🛠️ Troubleshooting

### Erro: "Invalid API key"
- Verifique se copiou a chave `anon/public` correta (não use a chave `service_role`)
- Verifique se não há espaços extras no `.env.local`

### Erro: "relation does not exist"
- Execute novamente o `schema-v2-optimized.sql` no SQL Editor
- Verifique se está conectado ao projeto V2 correto

### Erro: "permission denied for table"
- Verifique se as RLS policies foram criadas (estão no schema)
- Tente fazer logout e login novamente

### Erro de compilação TypeScript
- Execute `npm install` novamente
- Delete a pasta `node_modules` e `package-lock.json`, depois `npm install`

## 📞 Suporte

Se encontrar problemas, verifique:
1. Console do navegador (F12) para erros JavaScript
2. Logs do Supabase no dashboard → "Logs"
3. Arquivo `.env.local` está configurado corretamente

## 🎉 Próximos Passos

Após a migração bem-sucedida:
1. Popule o banco com seus dados reais (clientes, serviços, etc.)
2. Configure seu perfil em **"Configurações"**
3. Teste o envio de orçamentos via WhatsApp
4. Configure lembretes automáticos de agendamento
5. Explore o dashboard financeiro

---

**Data de criação**: 2024
**Versão**: 2.0
**Autor**: MakeupManager Development Team
