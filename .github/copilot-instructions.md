# MakeupManager - AI Coding Assistant Instructions

## Project Overview
MakeupManager is a professional makeup artist's management system built with React 18, TypeScript, Vite, and Supabase. It provides complete client management, pricing calculation, and WhatsApp integration for Brazilian beauty professionals.

## Architecture & Data Flow

### Core Components
- **Authentication**: Supabase Auth with user-scoped data isolation
- **Client Management**: Full CRUD with search/filtering and WhatsApp integration
- **Partners Management**: Collaborator management with commission tracking
- **Appointments System**: Complete scheduling with calendar view, status management, and payment tracking
- **Weekly Schedule View**: Multi-professional time grid with conflict detection
- **Financial Dashboard**: Revenue analysis, payment tracking, commission reports, and performance metrics
- **Archiving System**: Automatic archival of completed appointments for performance optimization
- **Service Configuration**: Hierarchical structure (categories → services → regional pricing)
- **Price Calculator**: Complex pricing with regional overrides, custom prices, and travel fees
- **Settings**: User profile and business configuration management

### Data Model
```sql
-- User Management
profiles (user profiles and business info)
├── id (uuid, PK, FK to auth.users)
├── email, full_name, avatar_url
├── phone, bio, address, instagram
├── experience_years
└── created_at, updated_at

-- Client Management
clients (customer database with user isolation)
├── id (uuid, PK)
├── user_id (FK to profiles)
├── name, phone, email
├── address, instagram, notes
└── created_at, updated_at

-- Service Configuration
service_categories (service groups)
├── id (uuid, PK)
├── user_id (FK to auth.users)
├── name, description
├── is_deleted, deleted_at
└── created_at, updated_at

services (individual services)
├── id (uuid, PK)
├── user_id (FK to auth.users)
├── category_id (FK to service_categories)
├── name, description, price
├── duration_minutes, is_active
├── is_deleted, deleted_at
└── created_at, updated_at

service_areas (regions with travel fees)
├── id (uuid, PK)
├── user_id (FK to auth.users)
├── name, description, travel_fee
├── is_deleted, deleted_at
└── created_at, updated_at

service_regional_prices (region-specific pricing overrides)
├── id (uuid, PK)
├── user_id (FK to auth.users)
├── service_id (FK to services)
├── service_area_id (FK to service_areas)
├── price (overrides base service price)
└── created_at, updated_at

-- Partners Management
partners (collaborators/professionals)
├── id (uuid, PK)
├── user_id (FK to auth.users)
├── name, phone
├── notes (max 500 chars)
└── created_at, updated_at

-- Appointments System
appointments (active scheduling and payment tracking)
├── id (uuid, PK)
├── user_id (FK to auth.users)
├── client_id (FK to clients)
├── partner_id (FK to partners, nullable - null = owner)
├── service_area_id (FK to service_areas)
├── scheduled_date, scheduled_time
├── status (pending, confirmed, completed, cancelled)
├── appointment_address, notes
├── is_custom_price (boolean flag)
├── travel_fee (decimal)
├── payment_total_appointment (total value)
├── payment_total_service (services only, no travel)
├── total_amount_paid (sum of all payments)
├── commission_amount (decimal, default 0 - partner commission)
├── payment_status (paid, pending - auto-updated by trigger)
├── total_duration_minutes
├── whatsapp_sent (boolean)
├── last_edited_at, edited_by (FK to auth.users)
└── created_at, updated_at

appointment_services (appointment line items)
├── id (uuid, PK)
├── appointment_id (FK to appointments)
├── service_id (FK to services)
├── quantity (integer, min 1)
├── unit_price, total_price
└── created_at

appointments_history (archived completed appointments)
├── id (uuid, PK - same as original appointment)
├── user_id, client_id, partner_id
├── scheduled_date, scheduled_time
├── appointment_address, notes
├── travel_fee
├── payment_total_appointment
├── payment_total_service
├── total_amount_paid
├── commission_amount
├── total_duration_minutes
├── services_summary (text - snapshot of services)
├── completed_at (timestamp)
└── archived_at (timestamp)
```

### Key Business Rules
- **Regional Pricing Priority**: Regional prices completely override base service prices (including travel fees)
- **User Data Isolation**: All data scoped by `user_id` with Row Level Security (RLS)
- **Brazilian Localization**: Phone formatting, currency (BRL), and Portuguese UI text
- **Appointment Reminders**: WhatsApp reminders automatically sent for appointments within 7 days
- **Custom Pricing**: Support for manual price override excluding travel fees
- **Payment Tracking**: Complete payment flow with automatic status updates (paid/pending)
- **Partner Logic**: `partner_id = NULL` means owner performs service; otherwise assigned to partner
- **Commission Tracking**: `commission_amount` tracks partner payout; Net Profit = total - commission
- **Archiving System**: Appointments with status `completed` are auto-moved to `appointments_history` via trigger
- **Data Cleanup**: Old `pending` (>15 days) and `cancelled` (>15 days) appointments can be cleaned via RPC function

## Critical Developer Workflows

### Development Setup
```bash
npm install
npm run dev  # Runs on http://localhost:3000
```

### Build & Deployment
```bash
npm run build  # Creates dist/ folder
./deploy.ps1   # PowerShell deploy script (developer → master → GitHub Pages)
```

### Database Management
- SQL migrations in `database/migrations.sql`
- Execute via Supabase dashboard SQL editor
- RLS policies ensure user data isolation

### WhatsApp Integration
- **Web Integration**: Direct `wa.me` links with URL-encoded messages
- **Server Integration**: Node.js server (`whatsapp-server.cjs`) for automated messaging
- **Phone Formatting**: Brazilian numbers with automatic country code addition

## Project-Specific Patterns

### Component Structure
```tsx
// State management with useState/useEffect
// Supabase queries with user isolation
// Brazilian Portuguese UI text
// Tailwind CSS with custom gradients
// Form validation with NumericInput component
```

### Database Queries
```typescript
// Always include user_id filtering
const { data, error } = await supabase
  .from('clients')
  .select('*')
  .eq('user_id', user.id)  // Critical for RLS
  .order('created_at', { ascending: false })
```

### Pricing Logic
```typescript
// Regional price takes precedence over base price
const basePrice = regionalPrice ? regionalPrice.price : service.price
// Regional prices already include travel fees
```

### Phone Number Handling
```typescript
// Brazilian phone formatting for WhatsApp
const cleanNumber = phone.replace(/\D/g, '')
const whatsappNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`
const chatId = `${whatsappNumber}@c.us`
```

### File Organization
```
src/
├── components/     # React components
├── lib/           # Utilities (supabase client)
└── main.tsx       # App entry point

database/          # SQL migrations and setup
.github/workflows/ # CI/CD configuration
```

## Common Patterns & Conventions

### Error Handling
```typescript
try {
  const { data, error } = await supabase.from('table').select('*')
  if (error) throw error
  // Handle success
} catch (err) {
  console.error('Operation failed:', err)
  alert(`Error: ${err.message}`)
}
```

### Form Validation
```tsx
// Use NumericInput for currency/numeric fields
<NumericInput
  value={priceInput}
  onChange={setPriceInput}
  decimalPlaces={2}
  formatCurrency={true}
  currency="BRL"
  locale="pt-BR"
  onValidate={setValid}
/>
```

### WhatsApp Message Templates
```typescript
const message = `*🎨 AGENDAMENTO CONFIRMADO*
👤 Cliente: ${clientName}
💄 Serviço: ${service}
📅 Data: ${date}
💰 Valor: R$ ${price.toFixed(2)}
✨ Enviado via MakeUp Manager`
```

### Branch Strategy
- `developer`: Active development branch
- `master`: Production branch (auto-deploys to GitHub Pages)
- Merge developer → master triggers CI/CD pipeline

### Environment Configuration
```typescript
// Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
```

## Key Files to Reference

### Core Architecture
- `src/App.tsx` - Main app structure and routing
- `src/components/Dashboard.tsx` - Main navigation and view switching (V1)
- `src/components/DashboardV2.tsx` - Redesigned dashboard with optimized metrics
- `src/lib/supabase.ts` - Database client and types

### Business Logic
- `src/components/AppointmentsPage.tsx` - Appointments management with reminders
- `src/components/CalendarPage.tsx` - Monthly calendar with appointment CRUD
- `src/components/WeeklyScheduleView.tsx` - Multi-professional weekly schedule grid
- `src/components/FinancialDashboard.tsx` - Financial metrics with commission tracking
- `src/components/PriceCalculator.tsx` - Complex pricing calculations
- `src/components/Settings.tsx` - Configuration management
- `src/components/Clients.tsx` - Client CRUD operations
- `src/components/Partners.tsx` - Partner management with commission tracking
- `src/components/PartnersPage.tsx` - Partners page wrapper

### Utilities & Hooks
- `src/hooks/usePaymentCalculator.ts` - Payment calculation hook
- `src/lib/PaymentService.ts` - Centralized payment logic

### Infrastructure
- `vite.config.ts` - Build configuration with GitHub Pages setup
- `package.json` - Scripts and dependencies
- `database/schema-v2-optimized.sql` - Database schema and RLS policies
- `database/ARCHIVING-SYSTEM.md` - Archiving system documentation
- `.github/workflows/ci-deploy.yml` - CI/CD pipeline

### WhatsApp Integration
- `src/components/WhatsAppButton.tsx` - Web-based messaging
- `src/components/PriceCalculator.tsx` - Budget messaging templates

## Development Best Practices

### Code Style
- TypeScript strict mode enabled
- ESLint configuration via Vite
- Tailwind CSS with custom color schemes
- Component composition over inheritance

### Testing Approach
- Manual testing with `npm run dev`
- Build validation with `npm run build`
- Deploy testing with `./deploy.ps1`

### Performance Considerations
- Lazy loading not implemented (small app)
- Supabase RLS ensures data security
- PWA manifest for offline capability
- Optimized bundle with Vite

## Troubleshooting Common Issues

### Build Failures
```bash
# Clear cache and reinstall
Remove-Item node_modules -Recurse -Force
npm install
npm run build
```

### Supabase Connection Issues
- Verify `.env` file exists with correct credentials
- Check Supabase project status and API keys
- Ensure RLS policies are applied

### WhatsApp Integration Problems
- Web version: Check phone number formatting
- Server version: Verify QR code scanning and authentication
- Test with Brazilian phone numbers (55 prefix)

### Deployment Issues
- Ensure on `developer` branch before deploy
- Check GitHub Actions logs for CI/CD failures
- Verify `dist/` folder creation after build

## Security Considerations
- Row Level Security (RLS) enabled on all tables
- User data isolation by `user_id`
- Environment variables for sensitive credentials
- No client-side secret storage

Remember: This is a Brazilian makeup artist's business tool. All features should support professional beauty service workflows with WhatsApp integration and regional pricing flexibility.