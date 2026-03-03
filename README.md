# MakeUp Manager v3 💄

[![Deploy Status](https://github.com/Josewesley2020/MakeupManager_v3/workflows/CI%20&%20Deploy/badge.svg)](https://github.com/Josewesley2020/MakeupManager_v3/actions)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)

> Sistema profissional de gestão para maquiadores(as) - Clientes, Agendamentos, Pagamentos e WhatsApp

**Website:** https://josewesley2020.github.io/MakeupManager_v3/

---

## 🚀 Funcionalidades

- **👥 Clientes** - Cadastro completo com histórico e WhatsApp
- **📅 Agendamentos** - Calendário interativo com status e lembretes
- **💰 Pagamentos** - Controle de entrada, saldo e status automático
- **📊 Dashboard** - Métricas financeiras e performance
- **⚙️ Configurações** - Serviços, categorias, áreas e preços
- **📱 WhatsApp** - Orçamentos e lembretes direto pelo app

---

## ⚡ Quick Start

```bash
# Clone e instale
git clone https://github.com/Josewesley2020/MakeupManager_v3.git
cd MakeupManager_v3
npm install

# Configure variáveis de ambiente
# Crie arquivo .env na raiz:
VITE_SUPABASE_URL=sua-url-aqui
VITE_SUPABASE_ANON_KEY=sua-chave-aqui

# Rode localmente
npm run dev
```

**Acesse:** http://localhost:3000

---

## 🗄️ Setup Supabase

### 1. Criar Projeto

1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Click **"New Project"**
3. Anote a senha do banco

### 2. Copiar Credenciais

Em **Settings → API**, copie:
- **Project URL** → `VITE_SUPABASE_URL`  
- **anon/public key** → `VITE_SUPABASE_ANON_KEY`

### 3. Executar Schema SQL

No **SQL Editor**, execute:

```sql
database/schema-v2-optimized.sql
```

**Otimizações** (recomendado):
```sql
database/005-rpc-check-duplicate-appointment.sql
database/006-rpc-create-appointment-with-services.sql  
database/007-optimized-indices.sql
```

✅ **Pronto!** Faça login e configure seus serviços.

---

## 📝 Comandos

```bash
npm run dev        # Desenvolvimento (localhost:3000)
npm run build      # Build para produção
npm run preview    # Testar build localmente
```

---

## 🛠️ Stack

- **React 18** + **TypeScript 5**
- **Vite** - Build tool
- **Tailwind CSS** - Estilos
- **Supabase** - Backend (PostgreSQL + Auth + RLS)
- **GitHub Pages** - Hospedagem

---

## 📊 Estrutura do Banco

**Principais tabelas:**

- `profiles` - Usuários e perfis
- `clients` - Clientes (isolados por usuário)
- `services` / `service_categories` - Catálogo de serviços
- `service_areas` - Regiões com taxas de deslocamento
- `appointments` - Agendamentos completos
- `appointment_services` - Itens do agendamento

**Row Level Security (RLS):** ✅ Ativado em todas as tabelas

---

## 📚 Documentação

- [PROJECT_ROADMAP.md](PROJECT_ROADMAP.md) - Roadmap e histórico de versões
- [WHATSAPP_README.md](WHATSAPP_README.md) - Integração WhatsApp
- [database/](database/) - Schema e migrações SQL

---

## 🔐 Segurança

- ✅ Row Level Security (RLS) - Dados isolados por usuário
- ✅ Supabase Auth com JWT
- ✅ `.env` no `.gitignore` (nunca commitado)
- ✅ Secrets configurados via GitHub Actions

---

## 🚀 Deploy

**Automático via GitHub Actions:**

```bash
git push origin main  # Deploy automático
```

**Manual:**

```bash
npm run build
# Suba a pasta dist/ manualmente
```

**URL de produção:** https://josewesley2020.github.io/MakeupManager_v3/

---

## 🆕 Novidades da v3

### Phase 0 - Simplificação (Mar 2026)
- ✅ Removidas 11 dependências não utilizadas
- ✅  Deletado código de regional pricing (obsoleto)
- ✅ Hook customizado `usePaymentCalculator`
- ✅ Imports React otimizados (React 18)
- ✅ ~600 linhas de código removidas
- ✅ Bundle otimizado: 460 kB (118 kB gzipped)

### Phase 1 & 2 - Performance (Dez 2025)
- ✅ Dashboard 4x mais rápido (800ms → 200ms)
- ✅ RPC functions para queries consolidadas
- ✅ Índices otimizados no banco

---

## 📞 Contato

**Desenvolvedor:** Jose Wesley  
**GitHub:** [@Josewesley2020](https://github.com/Josewesley2020)  
**Projeto:** [github.com/Josewesley2020/MakeupManager_v3](https://github.com/Josewesley2020/MakeupManager_v3)

---

💄 **Transformando a gestão profissional de maquiadores!**

