# MakeUp Manager 💄

[![Deploy Status](https://github.com/avanade-joseWesley/MakeupManager/workflows/CI%20&%20Deploy/badge.svg)](https://github.com/avanade-joseWesley/MakeupManager/actions)
[![Live Demo](https://img.shields.io/badge/demo-online-brightgreen)](https://avanade-josewesley.github.io/MakeupManager/)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)

Sistema completo de gestão para maquiladoras profissionais com controle de clientes, agendamentos, pagamentos, dashboard financeiro e integração WhatsApp.

## 🌐 Demo Online

**Acesse:** https://avanade-josewesley.github.io/MakeupManager/

## 📑 Índice

- [Funcionalidades](#-funcionalidades-atuais)
- [Quick Start](#-quick-start)
- [Setup Completo](#️-setup-completo)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Banco de Dados](#️-estrutura-do-banco-de-dados)
- [Deploy](#-deploy)
- [Documentação](#-documentação-completa)
- [Troubleshooting](#-troubleshooting)

## ⚡ Quick Start

```bash
# Clone e instale
git clone https://github.com/avanade-joseWesley/MakeupManager.git
cd MakeupManager
npm install

# Configure o .env (veja abaixo)
# Rode localmente
npm run dev
```

**Próximos passos:** Configure o Supabase e execute as migrações SQL → [Ver Setup Completo](#️-setup-completo)

## 🚀 Funcionalidades Atuais

### 👥 Gestão de Clientes
- ✅ CRUD completo de clientes
- ✅ Busca e filtros avançados
- ✅ Integração WhatsApp
- ✅ Histórico de atendimentos

### 📅 Sistema de Agendamentos
- ✅ Calendário mensal interativo
- ✅ Criação e edição de agendamentos
- ✅ Gestão de status (confirmado, completo, cancelado)
- ✅ Destaque visual para agendamentos próximos (7 dias)
- ✅ Lembretes automáticos via WhatsApp
- ✅ Controle de pagamentos (entrada, restante, total pago)

### 💰 Calculadora de Preços
- ✅ Cálculo automático por serviços
- ✅ Preços customizados
- ✅ Taxas de deslocamento por região
- ✅ Geração de orçamentos em PDF
- ✅ Envio direto via WhatsApp

### 📊 Dashboard Financeiro
- ✅ Análise de receitas e despesas
- ✅ Acompanhamento de pagamentos
- ✅ Métricas de desempenho
- ✅ Filtros por período

### ⚙️ Configurações
- ✅ Gestão de Serviços e Categorias
- ✅ Preços Regionais com taxas de deslocamento
- ✅ Perfil do usuário
- ✅ Configurações de negócio

### 🔐 Segurança & Infraestrutura
- ✅ Integração com Supabase
- ✅ Autenticação de Usuários
- ✅ Row Level Security (RLS)
- ✅ PWA Ready

## 🏗️ Setup Completo

### Pré-requisitos
- **Node.js 18+** ([Download](https://nodejs.org/))
- **npm** (incluído com Node.js)
- **Git** ([Download](https://git-scm.com/))
- **Conta Supabase** (grátis) - [Criar conta](https://supabase.com)

### Instalação Rápida

```bash
# 1. Clone o repositório
git clone https://github.com/avanade-joseWesley/MakeupManager.git
cd MakeupManager

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
# Crie um arquivo .env na raiz do projeto
# Copie o conteúdo de .env.example e preencha com suas credenciais do Supabase

# 4. Execute em desenvolvimento
npm run dev

# Acesse: http://127.0.0.1:3000/
```

### Configuração do Supabase

#### 1. Criar Projeto
1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Clique em "New Project"
3. Escolha um nome e senha para o banco
4. Anote a senha - você vai precisar!

#### 2. Configurar Variáveis de Ambiente
1. No Supabase, vá em **Settings → API**
2. Copie a **Project URL** e a **anon/public key**
3. Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica-aqui
```

⚠️ **IMPORTANTE:** Nunca commite o arquivo `.env` (já está no `.gitignore`)

#### 3. Executar Migrações do Banco de Dados

No Supabase, vá em **SQL Editor** e execute os scripts na ordem:

```sql
-- 1. SCHEMA BASE (executar primeiro - OBRIGATÓRIO)
database/schema-v2-optimized.sql

-- 2. OTIMIZAÇÕES (recomendado - executar na ordem)
database/005-rpc-check-duplicate-appointment.sql  -- Elimina N+1 queries
database/006-rpc-create-appointment-with-services.sql  -- Transação atômica
database/007-optimized-indices.sql  -- Performance (5 índices)

-- 3. FEATURES OPCIONAIS
database/create-budgets-bucket.sql  -- Se usar PDFs/Documentos
```

📖 **Guia completo:** Veja [database/DEPLOYMENT_OPTIMIZATION_GUIDE.md](database/DEPLOYMENT_OPTIMIZATION_GUIDE.md) para instruções detalhadas e troubleshooting

⚠️ **IMPORTANTE:** 
- `schema-v2-optimized.sql` contém TODA a estrutura do banco (tabelas, RLS, constraints)
- NÃO execute migrations antigas (001-004) - já estão consolidadas no schema V2
- Otimizações (005-007) são opcionais mas ALTAMENTE recomendadas (70-80% menos queries)

### Primeiro Acesso

1. Rode o servidor: `npm run dev`
2. Acesse: http://127.0.0.1:3000/
3. Crie sua conta (primeiro usuário)
4. Configure seus serviços em **Configurações**
5. Comece a adicionar clientes!

## 📝 Comandos Principais

### Desenvolvimento
```powershell
npm run dev      # Servidor de desenvolvimento (http://127.0.0.1:3000/)
npm run build    # Build para produção (gera pasta dist/)
npm start        # Preview do build local
```

### Deploy
```powershell
.\deploy.ps1     # Deploy manual para GitHub Pages (recomendado)
```

### Git
```powershell
git add .
git commit -m "feat: descrição"
git push origin developer  # Desenvolvimento (não faz deploy)
git push origin master     # Produção (deploy automático via CI/CD)
```

## 📁 Estrutura do Projeto (Pós-Limpeza 02/12/2025)

### 🗂️ Diretórios Principais

```
MakeupManager_v2/
├── 📁 src/                      # Código-fonte React/TypeScript
│   ├── components/              # Componentes da aplicação
│   │   ├── AppointmentsPage.tsx # Gestão de agendamentos + reminders
│   │   ├── CalendarPage.tsx     # Calendário mensal interativo
│   │   ├── FinancialDashboard.tsx # Métricas e relatórios financeiros
│   │   ├── Clients.tsx          # CRUD de clientes
│   │   ├── PriceCalculator.tsx  # Calculadora com orçamentos
│   │   ├── Settings.tsx         # Configurações (serviços, regiões, perfil)
│   │   ├── Dashboard.tsx        # Container principal e navegação
│   │   └── [outros componentes] # Login, WhatsApp, etc.
│   ├── lib/
│   │   └── supabase.ts          # Cliente Supabase e types
│   ├── App.tsx                  # Raiz da aplicação
│   └── main.tsx                 # Entry point
│
├── 📁 database/                 # ✅ Scripts SQL essenciais (limpo!)
│   ├── schema-v2-optimized.sql  # 🟢 PRINCIPAL - Schema completo V2
│   ├── 005-rpc-check-duplicate-appointment.sql  # 🟢 Otimização N+1
│   ├── 006-rpc-create-appointment-with-services.sql  # 🟢 Transação
│   ├── 007-optimized-indices.sql  # 🟢 Performance (5 índices)
│   ├── create-budgets-bucket.sql  # Feature PDFs (opcional)
│   ├── DEPLOYMENT_OPTIMIZATION_GUIDE.md  # Guia completo
│   └── MIGRATION_GUIDE_V2.md    # Setup inicial
│
├── 📁 scripts/                  # Utilitários
│   ├── run-migration.cjs        # Executor de migrations
│   └── create-budgets-bucket.cjs  # Guia setup PDFs
│
├── 📁 .github/                  # CI/CD e instruções AI
│   ├── workflows/ci-deploy.yml  # GitHub Actions
│   └── copilot-instructions.md  # Contexto do projeto
│
├── 📁 public/                   # Assets estáticos
├── 📁 dist/                     # Build de produção (gerado)
│
├── 📄 .env.local                # Credenciais Supabase (não commitado)
├── 📄 package.json              # Dependências e scripts
├── 📄 vite.config.ts            # Configuração build
├── 📄 deploy.ps1                # Script deploy automático
├── 📄 whatsapp-server.cjs       # Servidor WhatsApp (opcional)
├── 📄 start-whatsapp.bat        # Iniciar servidor WhatsApp
└── 📄 README.md                 # Este arquivo
```

### 📊 Estatísticas da Limpeza (02/12/2025)

- **Removidos:** 55 arquivos obsoletos (~60KB)
- **Antes:** ~90 arquivos totais
- **Depois:** ~35 arquivos essenciais
- **Redução:** 61% menos arquivos
- **Benefício:** Estrutura clara, fácil navegação, manutenção simplificada

**Arquivos removidos:**
- 27 migrations incrementais antigas (consolidadas em schema-v2)
- 11 documentos de migração V1→V2 (processo concluído)
- 9 scripts SQL de teste/verificação (queries temporárias)
- 3 scripts de seed (desenvolvimento)
- 2 mocks/exemplos não utilizados
- 4 assets de build antigos (regenerados automaticamente)

**Detalhes completos:** Ver seção "Arquivos Obsoletos Removidos" em [database/DEPLOYMENT_OPTIMIZATION_GUIDE.md](database/DEPLOYMENT_OPTIMIZATION_GUIDE.md)

## 🗄️ Estrutura do Banco de Dados
│   │   ├── Dashboard.tsx        # Dashboard principal
│   │   ├── LoginForm.tsx        # Login/Autenticação
│   │   ├── PriceCalculator.tsx  # Calculadora de preços
│   │   ├── Settings.tsx         # Configurações
│   │   ├── PDFManager.tsx       # Geração de PDFs
│   │   ├── WhatsAppButton.tsx   # Integração WhatsApp
│   │   ├── NumericInput.tsx     # Input numérico formatado
│   │   ├── ErrorBoundary.tsx    # Tratamento de erros
│   │   └── Container.tsx        # Container wrapper
│   ├── lib/
│   │   └── supabase.ts          # Cliente Supabase + tipos
│   ├── App.tsx                  # App principal
│   └── main.tsx                 # Entry point
├── database/                    # Scripts SQL e migrações
│   ├── migrations.sql           # Migrações principais
│   ├── 001-fix-payment-status.sql
│   ├── 002-add-total-amount-paid.sql
│   ├── 003-add-payment-total-appointment.sql
│   ├── 004-add-travel-fee-field.sql
│   ├── create_clients_table.sql
│   └── clients_rls.sql
├── public/                      # Assets estáticos
├── .env                         # Variáveis de ambiente (local)
├── deploy.ps1                   # Script de deploy
└── vite.config.ts               # Configuração Vite
```

📖 **Estrutura detalhada:** Veja [FILE_STRUCTURE.md](FILE_STRUCTURE.md) para descrição completa de cada arquivo

## �️ Estrutura do Banco de Dados

### Tabelas Principais

#### 👤 User Management
- **profiles** - Perfis de usuário e informações do negócio
  - Dados pessoais (nome, email, telefone, bio)
  - Informações profissionais (anos de experiência)
  - Integração com Supabase Auth

#### 👥 Client Management
- **clients** - Base de clientes com RLS
  - Informações de contato (nome, telefone, email)
  - Dados complementares (endereço, Instagram, notas)
  - Isolamento por usuário

#### 💼 Service Configuration
- **service_categories** - Categorias de serviços
- **services** - Catálogo de serviços
  - Preço base, duração, descrição
  - Status ativo/inativo
  - Soft delete para histórico
- **service_areas** - Áreas de atendimento
  - Regiões com taxas de deslocamento
- **service_regional_prices** - Preços regionais
  - Sobrescreve preço base por região

#### 📅 Appointments System
- **appointments** - Agendamentos completos
  - Scheduling (data, hora, status)
  - Pagamentos (total, pago, pendente)
  - WhatsApp tracking (enviado, quando, mensagem)
  - Audit trail (editado por, quando)
- **appointment_services** - Itens do agendamento
  - Serviços vinculados ao agendamento
  - Quantidade, preços unitários e totais

### Principais Campos de Appointments
```typescript
{
  // Agendamento
  scheduled_date: DATE,
  scheduled_time: TIME,
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled',
  
  // Pricing
  is_custom_price: BOOLEAN,
  travel_fee: DECIMAL,
  payment_total_service: DECIMAL,      // Só serviços
  payment_total_appointment: DECIMAL,   // Total (serviços + viagem)
  
  // Payment Tracking
  total_amount_paid: DECIMAL,
  payment_down_payment_expected: DECIMAL,
  payment_down_payment_paid: DECIMAL,
  payment_status: 'paid' | 'pending',
  
  // WhatsApp Integration
  whatsapp_sent: BOOLEAN,
  whatsapp_sent_at: TIMESTAMP,
  whatsapp_message: TEXT
}
```

🗄️ **Schema completo:** Veja os scripts SQL em [database/](database/) para estrutura detalhada com constraints e índices

## 🚀 Deploy

### Opção 1: Deploy Manual (⭐ Recomendado)
```

## �🔄 Fluxo de Deploy

### Desenvolvimento → Produção

```
developer (branch de desenvolvimento)
    ↓ trabalho diário
    ↓ commits frequentes
    ↓
    ↓ quando estiver pronto
    ↓
master (branch de produção)
    ↓ merge + push
    ↓
GitHub Actions (CI/CD)
    ↓ build automático
    ↓
GitHub Pages (produção)
https://avanade-josewesley.github.io/MakeupManager/
```

### Opção 1: Deploy Manual (Recomendado)
```powershell
# Teste localmente
npm run build

# Publique quando estiver pronto
.\deploy.ps1
```

### Opção 2: Deploy via GitHub Actions
```bash
# 1. Merge developer → master
git checkout master
git merge developer
git push origin master

# 2. GitHub Actions faz deploy automático
# 3. Aguarde 1-2 minutos
```

### Fluxo de Branches

```
developer (desenvolvimento diário)
    ↓ git push origin developer (só salva, não deploya)
    ↓
    ↓ quando pronto para produção
    ↓
master (produção)
    ↓ git push origin master (deploya automaticamente)
    ↓
GitHub Actions → GitHub Pages
```

📖 **Guia completo de deploy:** Veja [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md) para fluxos detalhados e troubleshooting

## 📚 Documentação Completa

Este projeto conta com documentação detalhada para diferentes necessidades:

### 📖 Guias Principais
- **[README.md](README.md)** (este arquivo) - Visão geral e setup inicial
- **[DEPLOY_GUIDE.md](DEPLOY_GUIDE.md)** - Guia completo de desenvolvimento e deploy
- **[FILE_STRUCTURE.md](FILE_STRUCTURE.md)** - Estrutura detalhada do projeto
- **[COMANDOS.md](COMANDOS.md)** - Referência rápida de comandos

### �️ Banco de Dados
- **[database/README.md](database/README.md)** - Documentação do schema e migrações
- **[database/migrations.sql](database/migrations.sql)** - Script de criação completo

### 🔧 Integrações
- **[WHATSAPP_README.md](WHATSAPP_README.md)** - Configuração de WhatsApp (web + servidor)

### 🤖 Para Desenvolvedores
- **[.github/copilot-instructions.md](.github/copilot-instructions.md)** - Contexto completo para AI assistants

## 🛠️ Stack Tecnológico

### Frontend
- **React 18** - UI library
- **TypeScript 5** - Type safety
- **Vite 4** - Build tool e dev server
- **Tailwind CSS** - Styling framework

### Backend & Infrastructure
- **Supabase** - Backend as a Service
  - PostgreSQL database
  - Authentication
  - Row Level Security (RLS)
- **GitHub Pages** - Hosting estático
- **GitHub Actions** - CI/CD pipeline

### Integrações
- **WhatsApp Web.js** - Mensagens automáticas
- **PDF Generation** - Orçamentos em PDF

## 🔐 Segurança

### Row Level Security (RLS)
- ✅ Habilitado em todas as tabelas
- ✅ Usuários isolados por `user_id`
- ✅ Apenas donos dos dados podem acessar

### Autenticação
- ✅ Supabase Auth (email/senha)
- ✅ Tokens JWT automáticos
- ✅ Sessões persistentes

### Boas Práticas
- ⚠️ `.env` está no `.gitignore` - nunca commite credenciais
- ✅ Chaves públicas (anon key) podem ser expostas
- ✅ RLS protege os dados mesmo com chave exposta

## 🤝 Contribuindo

### Workflow Recomendado

1. **Fork** o repositório
2. Crie uma branch de feature: `git checkout -b feat/minha-feature`
3. Commit suas mudanças: `git commit -m 'feat: adiciona nova funcionalidade'`
4. Push para a branch: `git push origin feat/minha-feature`
5. Abra um **Pull Request** para `developer`

### Convenções de Commit

```
feat: nova funcionalidade
fix: correção de bug
docs: atualização de documentação
style: formatação, sem mudança de lógica
refactor: refatoração de código
test: adição de testes
chore: manutenção geral
```

## � Pipeline CI/CD

A pipeline do GitHub Actions roda automaticamente:

- **Em Pull Requests para master:** Apenas valida o build
- **Em Push para master:** Valida build + faz deploy automático

Ver status: https://github.com/avanade-josewesley/MakeupManager/actions

## � Troubleshooting

### Tela branca no navegador
- Verifique se o `.env` existe e está preenchido
- Reinicie o servidor: `npm run dev`

### Erro ao buildar
- Delete `node_modules`: `Remove-Item node_modules -Recurse -Force`
- Reinstale: `npm install`

### Deploy falhou
- Veja logs em: https://github.com/avanade-josewesley/MakeupManager/actions
- Use deploy manual: `.\deploy.ps1`

## 📞 Contato

- **Desenvolvedor:** Jose Wesley
- **GitHub:** [@avanade-joseWesley](https://github.com/avanade-joseWesley)
- **Projeto:** MakeUp Manager

---

**💄 Transformando a gestão de maquiladoras profissionais!**
# GitHub Pages Deploy Test

