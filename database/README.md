# 🗄️ Configuração do Banco de Dados

## Instruções para Supabase

### 1. Acesse o Supabase Dashboard
- Vá para [supabase.com](https://supabase.com)
- Faça login na sua conta
- Acesse seu projeto MakeupManager

### 2. Execute as Migrações
Execute os arquivos SQL na seguinte ordem:

1. **Arquivo principal:** `migrations.sql` ou `migrations-safe.sql`
2. **Tabela clients:** `create_clients_table.sql`
3. **Políticas RLS clients:** `clients_rls.sql`
4. **Preços regionais:** `fix-profiles-and-regional-prices.sql`
5. **Status dos clients:** `add-status-to-clients.sql`
6. **Tabela appointments:** `create-appointments-table.sql` ⭐ **NOVO**
7. **Campo email:** `add-email-field.sql` (opcional)

Para cada arquivo:
1. No dashboard do Supabase, vá para **SQL Editor**
2. Clique em **"New Query"**
3. Copie o conteúdo do arquivo
4. Cole no editor SQL
5. Clique em **"Run"** para executar

### 3. Verifique as Tabelas
Após executar, você deve ver as seguintes tabelas criadas:
- `profiles` - Perfis dos usuários
- `service_areas` - Regiões de atendimento
- `service_categories` - Categorias de serviços
- `services` - Serviços oferecidos
- `service_regional_prices` - Preços específicos por região
- `clients` - Dados dos clientes
- `appointments` - Agendamentos de serviços ⭐ **NOVO**

### 4. Configuração das Políticas RLS
As políticas de segurança (Row Level Security) já foram configuradas automaticamente para garantir que:
- Cada usuário só vê e modifica seus próprios dados
- Não há vazamento de informações entre usuários
- Segurança total dos dados

## Estrutura das Tabelas

### `profiles`
- Informações pessoais do usuário
- Nome, telefone, bio, endereço, Instagram
- Anos de experiência

### `service_areas`
- Regiões onde a maquiadora atende
- Nome da região, descrição, taxa de deslocamento

### `service_categories`
- Categorias de serviços (Noivas, Social, Artística, etc.)
- Nome e descrição da categoria

### `clients`
- Dados básicos dos clientes (nome, telefone, email, endereço, Instagram)
- Vinculado ao usuário (user_id) para isolamento de dados
- Permite múltiplos agendamentos por cliente

### `appointments` ⭐ **NOVO**
- Agendamentos específicos de serviços
- Suporte a múltiplas unidades do mesmo serviço (quantity)
- Status: `pending`, `confirmed`, `completed`, `cancelled`
- Preços calculados: unitário × quantidade
- Data, horário e endereço específicos do agendamento
- Vinculado a cliente, serviço e região

### `service_regional_prices`
- Preços específicos de serviços por região
- Substitui o preço padrão quando existe
- Inclui automaticamente a taxa de deslocamento

## Próximos Passos
Após executar as migrações, as seguintes funcionalidades estarão disponíveis:

### ✅ Funcionalidades Ativas
- **Configurações:** Gerenciamento de perfil e regiões
- **Calculadora de Preços:** Cálculo com preços regionais
- **Agendamentos:** Criar agendamentos confirmados/pendentes ⭐ **NOVO**
- **Quantidade de Serviços:** Suporte a grupos e eventos ⭐ **NOVO**
- **Clientes:** Gestão separada de dados de clientes ⭐ **NOVO**
- **WhatsApp:** Envio de orçamentos personalizados

### 🔒 Segurança
- Row Level Security (RLS) ativo em todas as tabelas
- Isolamento completo de dados por usuário
- Políticas de segurança configuradas automaticamente