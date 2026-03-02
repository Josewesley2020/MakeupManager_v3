-- ============================================================================
-- MAKEUPMANAGER V2 - SCHEMA OTIMIZADO
-- Data: 2025-12-01
-- Versão: 2.0.0
-- Filosofia: Simplicidade, Consistência, Performance
-- ============================================================================

-- ============================================================================
-- TABELA: profiles
-- Propósito: Dados do profissional (maquiadora)
-- ============================================================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  bio TEXT,
  address TEXT,
  instagram TEXT,
  experience_years INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE profiles IS 'Perfil do profissional de maquiagem';

-- ============================================================================
-- TABELA: clients
-- Propósito: Base de clientes da maquiadora
-- ============================================================================
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  instagram TEXT,
  notes TEXT CHECK (char_length(notes) <= 500),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT clients_name_min_length CHECK (char_length(name) >= 2)
);

CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_clients_phone ON clients(user_id, phone);

COMMENT ON TABLE clients IS 'Clientes da maquiadora';
COMMENT ON COLUMN clients.notes IS 'Observações (max 500 caracteres)';

-- ============================================================================
-- TABELA: service_areas
-- Propósito: Regiões de atendimento (com taxa de deslocamento)
-- ============================================================================
CREATE TABLE service_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  travel_fee DECIMAL(10,2) DEFAULT 0 CHECK (travel_fee >= 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT service_areas_name_unique UNIQUE(user_id, name)
);

CREATE INDEX idx_service_areas_user_active ON service_areas(user_id) WHERE is_active = true;

COMMENT ON TABLE service_areas IS 'Regiões de atendimento com taxa de deslocamento';
COMMENT ON COLUMN service_areas.travel_fee IS 'Taxa de deslocamento em BRL';

-- ============================================================================
-- TABELA: service_categories
-- Propósito: Categorias de serviços (ex: Noiva, Social, Editorial)
-- ============================================================================
CREATE TABLE service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT service_categories_name_unique UNIQUE(user_id, name)
);

CREATE INDEX idx_service_categories_user_active ON service_categories(user_id, display_order) WHERE is_active = true;

COMMENT ON TABLE service_categories IS 'Categorias de serviços de maquiagem';

-- ============================================================================
-- TABELA: services
-- Propósito: Serviços oferecidos (ex: Maquiagem de Noiva, Penteado)
-- ============================================================================
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES service_categories(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  duration_minutes INTEGER DEFAULT 60 CHECK (duration_minutes > 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT services_name_unique UNIQUE(user_id, name)
);

CREATE INDEX idx_services_category ON services(category_id) WHERE is_active = true;
CREATE INDEX idx_services_user_active ON services(user_id) WHERE is_active = true;

COMMENT ON TABLE services IS 'Serviços de maquiagem oferecidos';
COMMENT ON COLUMN services.price IS 'Preço base (BRL). Travel fee é adicionado separadamente.';

-- ============================================================================
-- TABELA: appointments
-- Propósito: Agendamentos de serviços
-- DESIGN: Campos de pagamento SIMPLIFICADOS (4 campos apenas)
-- ============================================================================
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  service_area_id UUID REFERENCES service_areas(id) ON DELETE SET NULL,
  
  -- Data e hora
  scheduled_date DATE,
  scheduled_time TIME,
  
  -- Status (APENAS 4 opções)
  status TEXT DEFAULT 'pending' NOT NULL 
    CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  
  -- Localização
  appointment_address TEXT,
  
  -- Observações
  notes TEXT CHECK (char_length(notes) <= 1000),
  
  -- Preço customizado
  is_custom_price BOOLEAN DEFAULT false,
  
  -- ═══════════════════════════════════════════════════════════════════════
  -- CAMPOS DE PAGAMENTO (V2 - SIMPLIFICADO)
  -- ═══════════════════════════════════════════════════════════════════════
  travel_fee DECIMAL(10,2) DEFAULT 0 CHECK (travel_fee >= 0),
  payment_total_service DECIMAL(10,2) NOT NULL CHECK (payment_total_service >= 0),
  payment_total_appointment DECIMAL(10,2) NOT NULL CHECK (payment_total_appointment >= 0),
  total_amount_paid DECIMAL(10,2) DEFAULT 0 CHECK (total_amount_paid >= 0),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending')),
  -- ═══════════════════════════════════════════════════════════════════════
  
  -- Duração total
  total_duration_minutes INTEGER DEFAULT 0 CHECK (total_duration_minutes >= 0),
  
  -- WhatsApp (minimal)
  whatsapp_sent BOOLEAN DEFAULT false,
  whatsapp_sent_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints de validação
  CONSTRAINT payment_not_exceeds_total CHECK (total_amount_paid <= payment_total_appointment),
  CONSTRAINT total_includes_service CHECK (payment_total_appointment >= payment_total_service),
  CONSTRAINT scheduled_date_required_if_confirmed CHECK (
    (status IN ('confirmed', 'completed') AND scheduled_date IS NOT NULL) OR 
    (status IN ('pending', 'cancelled'))
  )
);

-- Índices otimizados
CREATE INDEX idx_appointments_user_date ON appointments(user_id, scheduled_date) 
  WHERE status != 'cancelled';
  
CREATE INDEX idx_appointments_status ON appointments(user_id, status);

CREATE INDEX idx_appointments_payment_pending ON appointments(user_id) 
  WHERE payment_status = 'pending' AND status = 'completed';

COMMENT ON TABLE appointments IS 'Agendamentos V2 - Schema otimizado';
COMMENT ON COLUMN appointments.payment_total_service IS 'Valor total dos serviços (sem travel_fee)';
COMMENT ON COLUMN appointments.payment_total_appointment IS 'Valor total = payment_total_service + travel_fee';
COMMENT ON COLUMN appointments.total_amount_paid IS 'Quanto cliente já pagou (qualquer valor entre 0 e payment_total_appointment)';
COMMENT ON COLUMN appointments.payment_status IS 'paid = total_amount_paid >= payment_total_appointment | pending = restante a receber';

-- ============================================================================
-- TABELA: appointment_services
-- Propósito: Serviços incluídos em cada agendamento (many-to-many)
-- ============================================================================
CREATE TABLE appointment_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT check_total_price CHECK (total_price = unit_price * quantity)
);

CREATE INDEX idx_appointment_services_appointment ON appointment_services(appointment_id);

COMMENT ON TABLE appointment_services IS 'Serviços incluídos em cada agendamento';
COMMENT ON COLUMN appointment_services.unit_price IS 'Preço unitário no momento do agendamento (snapshot)';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_services ENABLE ROW LEVEL SECURITY;

-- Políticas: Usuários só veem seus próprios dados
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "clients_all" ON clients FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "service_areas_all" ON service_areas FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "service_categories_all" ON service_categories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "services_all" ON services FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "appointments_all" ON appointments FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "appointment_services_select" ON appointment_services FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM appointments 
  WHERE appointments.id = appointment_services.appointment_id 
    AND appointments.user_id = auth.uid()
));

CREATE POLICY "appointment_services_insert" ON appointment_services FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM appointments 
  WHERE appointments.id = appointment_services.appointment_id 
    AND appointments.user_id = auth.uid()
));

CREATE POLICY "appointment_services_update" ON appointment_services FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM appointments 
  WHERE appointments.id = appointment_services.appointment_id 
    AND appointments.user_id = auth.uid()
));

CREATE POLICY "appointment_services_delete" ON appointment_services FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM appointments 
  WHERE appointments.id = appointment_services.appointment_id 
    AND appointments.user_id = auth.uid()
));

-- ============================================================================
-- TRIGGERS PARA UPDATED_AT AUTOMÁTICO
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  
CREATE TRIGGER clients_updated_at BEFORE UPDATE ON clients 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  
CREATE TRIGGER service_areas_updated_at BEFORE UPDATE ON service_areas 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  
CREATE TRIGGER service_categories_updated_at BEFORE UPDATE ON service_categories 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  
CREATE TRIGGER services_updated_at BEFORE UPDATE ON services 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  
CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON appointments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- TRIGGER: ATUALIZAR PAYMENT_STATUS AUTOMATICAMENTE
-- ============================================================================

CREATE OR REPLACE FUNCTION update_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar payment_status baseado em total_amount_paid
  IF NEW.total_amount_paid >= NEW.payment_total_appointment THEN
    NEW.payment_status = 'paid';
  ELSE
    NEW.payment_status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appointments_payment_status 
  BEFORE INSERT OR UPDATE OF total_amount_paid, payment_total_appointment ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_payment_status();

COMMENT ON FUNCTION update_payment_status() IS 'Atualiza payment_status automaticamente baseado em valores pagos';

-- ============================================================================
-- FUNÇÕES UTILITÁRIAS
-- ============================================================================

-- Função: Calcular valor restante a pagar
CREATE OR REPLACE FUNCTION get_remaining_amount(appointment_id UUID)
RETURNS DECIMAL(10,2) AS $$
  SELECT GREATEST(0, payment_total_appointment - total_amount_paid)
  FROM appointments
  WHERE id = appointment_id;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION get_remaining_amount IS 'Retorna valor restante a pagar de um agendamento';

-- Função: Verificar se appointment está pago
CREATE OR REPLACE FUNCTION is_fully_paid(appointment_id UUID)
RETURNS BOOLEAN AS $$
  SELECT total_amount_paid >= payment_total_appointment
  FROM appointments
  WHERE id = appointment_id;
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- VIEWS ÚTEIS
-- ============================================================================

-- View: Appointments com dados completos
CREATE OR REPLACE VIEW v_appointments_detailed AS
SELECT 
  a.id,
  a.user_id,
  a.status,
  a.scheduled_date,
  a.scheduled_time,
  c.name as client_name,
  c.phone as client_phone,
  sa.name as service_area_name,
  a.payment_total_appointment,
  a.total_amount_paid,
  (a.payment_total_appointment - a.total_amount_paid) as remaining_amount,
  a.payment_status,
  CASE 
    WHEN a.total_amount_paid >= a.payment_total_appointment THEN 100
    ELSE ROUND((a.total_amount_paid::NUMERIC / NULLIF(a.payment_total_appointment, 0)) * 100)
  END as payment_percentage,
  a.created_at,
  a.updated_at
FROM appointments a
JOIN clients c ON c.id = a.client_id
LEFT JOIN service_areas sa ON sa.id = a.service_area_id;

COMMENT ON VIEW v_appointments_detailed IS 'View com dados completos de agendamentos (para relatórios)';

-- ============================================================================
-- DADOS INICIAIS (SEED)
-- ============================================================================

-- Criar categoria padrão para novos usuários (via trigger)
CREATE OR REPLACE FUNCTION create_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO service_categories (user_id, name, description, display_order) VALUES
    (NEW.id, 'Maquiagem', 'Serviços de maquiagem', 1),
    (NEW.id, 'Penteado', 'Serviços de penteado', 2),
    (NEW.id, 'Combo', 'Pacotes completos', 3);
  
  INSERT INTO service_areas (user_id, name, description, travel_fee) VALUES
    (NEW.id, 'Local (sem deslocamento)', 'Atendimento no salão/studio', 0),
    (NEW.id, 'Cidade', 'Atendimento na cidade', 50),
    (NEW.id, 'Região Metropolitana', 'Cidades próximas', 100);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_user_defaults
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_categories();

COMMENT ON FUNCTION create_default_categories() IS 'Cria categorias e áreas padrão para novos usuários';

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public' 
    AND table_name IN ('profiles', 'clients', 'service_areas', 'service_categories', 'services', 'appointments', 'appointment_services');
  
  IF table_count = 7 THEN
    RAISE NOTICE '✅ SCHEMA V2 CRIADO COM SUCESSO! (% tabelas)', table_count;
  ELSE
    RAISE WARNING '⚠️  Esperado 7 tabelas, encontrado %', table_count;
  END IF;
END $$;
