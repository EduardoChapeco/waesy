-- Migration: 20260815170000_mobility_and_logistics_ecosystem.sql
-- Propósito: Ecossistema completo de Mobilidade Urbana, Entregas Expressas,
-- Fretes de Mudança e Gestão de Frotas de Logística (Weasy/Waesy Integration).

-- ============================================================
-- 1. Enums de Mobilidade & Logística
-- ============================================================
DO $$ BEGIN
  CREATE TYPE mobility_service_type AS ENUM (
    'ride_car',
    'ride_moto',
    'delivery_express',
    'moving_truck',
    'freight_van'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE mobility_status AS ENUM (
    'draft',
    'searching',
    'accepted',
    'in_progress',
    'delivered',
    'completed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE negotiation_status AS ENUM (
    'pending',
    'accepted',
    'rejected',
    'countered',
    'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 2. Perfis de Motoristas / Entregadores Autônomos (Mobooty)
-- ============================================================
CREATE TABLE IF NOT EXISTS courier_profiles (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id                  UUID REFERENCES stores(id) ON DELETE SET NULL, -- Empresa de logística vinculada (opcional)
  slug                      TEXT UNIQUE,
  full_name                 TEXT NOT NULL,
  phone                     TEXT NOT NULL,
  cpf                       TEXT,
  avatar_url                TEXT,
  vehicle_type              vehicle_type NOT NULL DEFAULT 'motorcycle',
  vehicle_plate             TEXT,
  vehicle_model             TEXT,
  vehicle_color             TEXT,
  receives_direct_requests  BOOLEAN NOT NULL DEFAULT true,  -- Atende chamadas diretas via link mágico/perfil
  receives_pool_requests    BOOLEAN NOT NULL DEFAULT true,  -- Participa do pool público de corridas
  is_available              BOOLEAN NOT NULL DEFAULT true,  -- Disponível para chamados agora
  rating                    NUMERIC(3,2) NOT NULL DEFAULT 5.00,
  total_rides               INTEGER NOT NULL DEFAULT 0,
  current_lat               DOUBLE PRECISION,
  current_lng               DOUBLE PRECISION,
  last_location_at          TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_courier_profiles_user_id ON courier_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_courier_profiles_store_id ON courier_profiles(store_id);
CREATE INDEX IF NOT EXISTS idx_courier_profiles_is_available ON courier_profiles(is_available);
CREATE INDEX IF NOT EXISTS idx_courier_profiles_slug ON courier_profiles(slug);

-- ============================================================
-- 3. Tabelas de Preço de Logística / Frete por Empresa ou Motorista
-- ============================================================
CREATE TABLE IF NOT EXISTS logistics_price_tables (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id            UUID REFERENCES stores(id) ON DELETE CASCADE,
  courier_profile_id  UUID REFERENCES courier_profiles(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  service_type        mobility_service_type NOT NULL,
  base_fee_cents      INTEGER NOT NULL DEFAULT 500,    -- Tarifa base de partida (ex: R$ 5,00)
  km_rate_cents       INTEGER NOT NULL DEFAULT 250,    -- Valor por KM rodado (ex: R$ 2,50/km)
  minute_rate_cents   INTEGER NOT NULL DEFAULT 30,     -- Valor por minuto estimado
  helper_fee_cents    INTEGER NOT NULL DEFAULT 5000,   -- Adicional por ajudante de mudança (ex: R$ 50,00)
  min_fare_cents      INTEGER NOT NULL DEFAULT 1000,   -- Tarifa mínima (ex: R$ 10,00)
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_owner_presence CHECK (store_id IS NOT NULL OR courier_profile_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_price_tables_store_id ON logistics_price_tables(store_id);
CREATE INDEX IF NOT EXISTS idx_price_tables_service_type ON logistics_price_tables(service_type);

-- ============================================================
-- 4. Pedidos de Mobilidade, Entregas Expressas & Mudanças
-- ============================================================
CREATE TABLE IF NOT EXISTS mobility_requests (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id                    UUID REFERENCES stores(id) ON DELETE SET NULL, -- Empresa de logística responsável (se houver)
  customer_id                 UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name               TEXT NOT NULL,
  customer_phone              TEXT NOT NULL,
  service_type                mobility_service_type NOT NULL DEFAULT 'delivery_express',
  status                      mobility_status NOT NULL DEFAULT 'searching',
  
  -- Origem
  origin_address              TEXT NOT NULL,
  origin_lat                  DOUBLE PRECISION,
  origin_lng                  DOUBLE PRECISION,
  origin_instructions         TEXT,

  -- Destino Principal
  destination_address         TEXT NOT NULL,
  destination_lat             DOUBLE PRECISION,
  destination_lng             DOUBLE PRECISION,
  destination_instructions    TEXT,

  -- Métricas da Rota
  distance_km                 NUMERIC(6,2) NOT NULL DEFAULT 1.0,
  estimated_duration_minutes  INTEGER NOT NULL DEFAULT 15,
  
  -- Detalhes de Carga / Mudança
  package_description         TEXT,
  helpers_count               INTEGER NOT NULL DEFAULT 0,
  needs_packing               BOOLEAN NOT NULL DEFAULT false,
  
  -- Agendamento
  scheduled_for               TIMESTAMPTZ, -- Nulo = Chamar Imediato / Agora

  -- Preço & Financeiro
  estimated_price_cents       INTEGER NOT NULL DEFAULT 0,
  final_price_cents           INTEGER NOT NULL DEFAULT 0,
  payment_method              TEXT NOT NULL DEFAULT 'pix',
  payment_status              TEXT NOT NULL DEFAULT 'pending',

  -- Atribuição do Motorista
  courier_id                  UUID REFERENCES couriers(id) ON DELETE SET NULL,
  courier_profile_id          UUID REFERENCES courier_profiles(id) ON DELETE SET NULL,
  magic_token                 TEXT UNIQUE,

  -- Tracking de Horários
  accepted_at                 TIMESTAMPTZ,
  started_at                  TIMESTAMPTZ,
  completed_at                TIMESTAMPTZ,
  cancelled_at                TIMESTAMPTZ,
  cancellation_reason         TEXT,

  notes                       TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mobility_customer_id ON mobility_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_mobility_store_id ON mobility_requests(store_id);
CREATE INDEX IF NOT EXISTS idx_mobility_courier_id ON mobility_requests(courier_id);
CREATE INDEX IF NOT EXISTS idx_mobility_status ON mobility_requests(status);
CREATE INDEX IF NOT EXISTS idx_mobility_service_type ON mobility_requests(service_type);
CREATE INDEX IF NOT EXISTS idx_mobility_magic_token ON mobility_requests(magic_token);

-- ============================================================
-- 5. Paradas Múltiplas (Multi-Drop) para Entregas e Mudanças
-- ============================================================
CREATE TABLE IF NOT EXISTS mobility_stops (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id          UUID NOT NULL REFERENCES mobility_requests(id) ON DELETE CASCADE,
  stop_order          INTEGER NOT NULL DEFAULT 1,
  address             TEXT NOT NULL,
  lat                 DOUBLE PRECISION,
  lng                 DOUBLE PRECISION,
  contact_name        TEXT,
  contact_phone       TEXT,
  package_description TEXT,
  status              TEXT NOT NULL DEFAULT 'pending', -- pending, arrived, delivered, failed
  completed_at        TIMESTAMPTZ,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mobility_stops_request_id ON mobility_stops(request_id);

-- ============================================================
-- 6. Negociações & Propostas de Frete / Mudança
-- ============================================================
CREATE TABLE IF NOT EXISTS mobility_offers_negotiations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id            UUID NOT NULL REFERENCES mobility_requests(id) ON DELETE CASCADE,
  courier_profile_id    UUID REFERENCES courier_profiles(id) ON DELETE CASCADE,
  store_id              UUID REFERENCES stores(id) ON DELETE CASCADE,
  proposed_by           TEXT NOT NULL, -- 'customer', 'courier', 'store'
  proposed_price_cents  INTEGER NOT NULL,
  message               TEXT,
  status                negotiation_status NOT NULL DEFAULT 'pending',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_negotiations_request_id ON mobility_offers_negotiations(request_id);

-- ============================================================
-- 7. RLS Deny-by-Default com Políticas Rigorosas
-- ============================================================
ALTER TABLE courier_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_price_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobility_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobility_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobility_offers_negotiations ENABLE ROW LEVEL SECURITY;

-- Courier Profiles: Leitura pública de motoristas disponíveis; edição pelo próprio usuário ou loja vinculada
CREATE POLICY "Public read available courier profiles"
  ON courier_profiles FOR SELECT
  USING (true);

CREATE POLICY "Couriers can manage their own profile"
  ON courier_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Price Tables: Leitura pública para cotações; edição pelo dono da loja ou motorista
CREATE POLICY "Public read logistics price tables"
  ON logistics_price_tables FOR SELECT
  USING (is_active = true);

CREATE POLICY "Store owners can manage price tables"
  ON logistics_price_tables FOR ALL
  USING (store_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM workspace_members wm WHERE wm.store_id = logistics_price_tables.store_id AND wm.profile_id = auth.uid()
  ));

-- Mobility Requests: Leitura pelo cliente que solicitou, pelo motorista atribuído ou pela loja responsável
CREATE POLICY "Customers can view their own requests"
  ON mobility_requests FOR SELECT
  USING (customer_id = auth.uid() OR magic_token IS NOT NULL);

CREATE POLICY "Customers can create requests"
  ON mobility_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Customers can update their own pending requests"
  ON mobility_requests FOR UPDATE
  USING (customer_id = auth.uid() OR (courier_profile_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM courier_profiles cp WHERE cp.id = mobility_requests.courier_profile_id AND cp.user_id = auth.uid()
  )));

-- Mobility Stops: Acesso vinculado ao request
CREATE POLICY "Access mobility stops via request"
  ON mobility_stops FOR ALL
  USING (EXISTS (
    SELECT 1 FROM mobility_requests mr WHERE mr.id = mobility_stops.request_id AND (
      mr.customer_id = auth.uid() OR mr.courier_profile_id IN (
        SELECT cp.id FROM courier_profiles cp WHERE cp.user_id = auth.uid()
      )
    )
  ));

-- Negotiations: Leitura e criação pelos participantes da negociação
CREATE POLICY "Participants can view and create negotiations"
  ON mobility_offers_negotiations FOR ALL
  USING (true)
  WITH CHECK (true);
