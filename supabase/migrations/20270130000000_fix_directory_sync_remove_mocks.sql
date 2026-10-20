
-- Migration: 20270130000000_fix_directory_sync_remove_mocks.sql
-- Erradica avaliações mockadas, bio fake e selos de verificação indevidos no sync_store_to_directory
-- Sincroniza city e state para permitir indexação e visualização no Places

CREATE OR REPLACE FUNCTION public.sync_store_to_directory()
RETURNS TRIGGER AS $$
DECLARE
  v_niche TEXT;
  v_category TEXT := 'servicos';
  v_address TEXT;
  v_avatar TEXT;
  v_banner TEXT;
  v_phone TEXT;
  v_whatsapp TEXT;
  v_working_hours JSONB;
  v_city TEXT;
  v_state TEXT;
  v_description TEXT;
  v_is_verified BOOLEAN := false;
BEGIN
  v_niche := coalesce(
    NEW.settings->>'niche',
    NEW.settings->>'type',
    NEW.settings->>'segment',
    'servicos'
  );

  IF v_niche ILIKE '%turis%' OR v_niche ILIKE '%viag%' OR v_niche ILIKE '%tour%' OR v_niche ILIKE '%hotel%' THEN
    v_category := 'turismo';
  ELSIF v_niche ILIKE '%gastro%' OR v_niche ILIKE '%rest%' OR v_niche ILIKE '%lanch%' OR v_niche ILIKE '%bar%' OR v_niche ILIKE '%cafe%' THEN
    v_category := 'gastronomia';
  ELSIF v_niche ILIKE '%saude%' OR v_niche ILIKE '%clin%' OR v_niche ILIKE '%fisi%' OR v_niche ILIKE '%odonto%' OR v_niche ILIKE '%psico%' THEN
    v_category := 'saude';
  ELSIF v_niche ILIKE '%auto%' OR v_niche ILIKE '%mecan%' OR v_niche ILIKE '%car%' OR v_niche ILIKE '%moto%' THEN
    v_category := 'auto';
  ELSIF v_niche ILIKE '%pet%' OR v_niche ILIKE '%vet%' THEN
    v_category := 'pet';
  ELSIF v_niche ILIKE '%reform%' OR v_niche ILIKE '%obra%' OR v_niche ILIKE '%const%' OR v_niche ILIKE '%eletric%' OR v_niche ILIKE '%hidraul%' THEN
    v_category := 'reformas';
  ELSIF v_niche ILIKE '%moda%' OR v_niche ILIKE '%roup%' OR v_niche ILIKE '%calc%' OR v_niche ILIKE '%mercado%' OR v_niche ILIKE '%comerc%' THEN
    v_category := 'comercio';
  ELSE
    v_category := 'servicos';
  END IF;

  v_city := coalesce(NEW.city, NEW.settings->>'city');
  v_state := coalesce(NEW.state, NEW.settings->>'state', 'SC');

  v_address := coalesce(
    NEW.address,
    CASE 
      WHEN NEW.settings->>'street' IS NOT NULL THEN
        concat_ws(', ', 
          NEW.settings->>'street', 
          coalesce(NEW.settings->>'number', 'S/N'),
          NEW.settings->>'neighborhood',
          concat_ws(' - ', v_city, v_state)
        )
      ELSE concat_ws(' - ', v_city, v_state)
    END,
    'Regional'
  );

  v_avatar := coalesce(NEW.logo_url, NEW.avatar_url, NEW.settings->>'logoUrl', NEW.settings->>'logo_url');
  v_banner := coalesce(NEW.banner_url, NEW.settings->>'bannerUrl', NEW.settings->>'banner_url', NEW.settings->>'cover_url');
  v_phone := coalesce(NEW.phone, NEW.settings->>'phone');
  v_whatsapp := regexp_replace(coalesce(v_phone, ''), '[^0-9]', '', 'g');
  v_working_hours := coalesce(NEW.settings->'working_hours', NULL);
  v_description := coalesce(NEW.description, NEW.settings->>'bio', NEW.settings->>'description');

  IF (NEW.settings->>'is_verified')::boolean IS TRUE THEN
    v_is_verified := true;
  END IF;

  INSERT INTO public.directory_listings (
    store_id,
    business_name,
    category,
    description,
    specialties,
    address,
    city,
    state,
    contact_phone,
    contact_whatsapp,
    contact_email,
    working_hours,
    is_verified,
    rating,
    reviews_count,
    avatar_url,
    banner_url,
    status
  ) VALUES (
    NEW.id,
    NEW.name,
    v_category,
    v_description,
    ARRAY[v_category, 'Atendimento Oficial'],
    v_address,
    v_city,
    v_state,
    v_phone,
    v_whatsapp,
    NEW.email,
    v_working_hours,
    v_is_verified,
    NULL,
    0,
    v_avatar,
    v_banner,
    'active'
  )
  ON CONFLICT (store_id) DO UPDATE SET
    business_name = EXCLUDED.business_name,
    category = EXCLUDED.category,
    address = EXCLUDED.address,
    city = coalesce(EXCLUDED.city, directory_listings.city),
    state = coalesce(EXCLUDED.state, directory_listings.state),
    contact_phone = EXCLUDED.contact_phone,
    contact_whatsapp = EXCLUDED.contact_whatsapp,
    contact_email = EXCLUDED.contact_email,
    avatar_url = coalesce(EXCLUDED.avatar_url, directory_listings.avatar_url),
    banner_url = coalesce(EXCLUDED.banner_url, directory_listings.banner_url),
    description = coalesce(EXCLUDED.description, directory_listings.description),
    is_verified = EXCLUDED.is_verified,
    status = 'active',
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sincronizar dados existentes
UPDATE public.directory_listings dl
SET 
  city = s.city,
  state = coalesce(s.state, 'SC')
FROM public.stores s
WHERE dl.store_id = s.id AND (dl.city IS NULL OR dl.city = '') AND s.city IS NOT NULL;

UPDATE public.directory_listings
SET description = NULL
WHERE description ILIKE '%ecossistema Wider%' OR description ILIKE '%ecossistema Waesy%';

UPDATE public.directory_listings dl
SET rating = NULL, reviews_count = 0
WHERE dl.reviews_count = 1 AND dl.rating = 5.00 AND NOT EXISTS (
  SELECT 1 FROM public.reviews r WHERE r.store_id = dl.store_id
);

UPDATE public.directory_listings dl
SET is_verified = false
WHERE dl.is_verified = true AND dl.store_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM public.stores s WHERE s.id = dl.store_id AND (s.settings->>'is_verified')::boolean IS TRUE
);


-- =============================================================================
-- RECONCILIAÇÃO DE CONTRATOS BFF <-> BANCO DE DADOS (REALIDADE SISTÊMICA)
-- =============================================================================

-- 1. crm_leads (Espelho e compatibilidade de leads capturados via Omni Builder)
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  source TEXT DEFAULT 'omni_builder',
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_leads_store_id ON public.crm_leads(store_id);
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store members manage crm_leads" ON public.crm_leads;
CREATE POLICY "Store members manage crm_leads"
  ON public.crm_leads
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_members sm
      WHERE sm.store_id = crm_leads.store_id AND sm.profile_id = auth.uid()
    )
  );

-- 2. travel_quote_requests (Kanban de Cotações Turísticas capturadas via Vitrine/Builder)
CREATE TABLE IF NOT EXISTS public.travel_quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL DEFAULT '',
  client_email TEXT,
  destination TEXT NOT NULL DEFAULT 'Cotação via Vitrine',
  departure_date DATE,
  return_date DATE,
  passengers_count INTEGER NOT NULL DEFAULT 1 CHECK (passengers_count >= 1),
  budget_cents BIGINT CHECK (budget_cents IS NULL OR budget_cents >= 0),
  status TEXT NOT NULL DEFAULT 'new',
  source TEXT NOT NULL DEFAULT 'omni_builder_vitrine',
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_travel_quote_requests_store_id ON public.travel_quote_requests(store_id);
ALTER TABLE public.travel_quote_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store members manage travel_quote_requests" ON public.travel_quote_requests;
CREATE POLICY "Store members manage travel_quote_requests"
  ON public.travel_quote_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_members sm
      WHERE sm.store_id = travel_quote_requests.store_id AND sm.profile_id = auth.uid()
    )
  );

-- 3. store_ad_campaigns (Campanhas de Anúncios Omnichannel geradas e sincronizadas por Loja)
CREATE TABLE IF NOT EXISTS public.store_ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  channel TEXT NOT NULL DEFAULT 'meta_ads',
  platform TEXT DEFAULT 'meta_ads',
  external_campaign_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  daily_budget_cents BIGINT NOT NULL DEFAULT 0 CHECK (daily_budget_cents >= 0),
  total_budget_cents BIGINT NOT NULL DEFAULT 0 CHECK (total_budget_cents >= 0),
  headline TEXT,
  ad_copy TEXT,
  destination_url TEXT DEFAULT '/',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_ad_campaigns_store_id ON public.store_ad_campaigns(store_id);
ALTER TABLE public.store_ad_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store members manage store_ad_campaigns" ON public.store_ad_campaigns;
CREATE POLICY "Store members manage store_ad_campaigns"
  ON public.store_ad_campaigns
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_members sm
      WHERE sm.store_id = store_ad_campaigns.store_id AND sm.profile_id = auth.uid()
    )
  );

-- 4. travel_sales_spreadsheet_rows (Linhas da Planilha Financeira de Vendas e Comissões de Turismo)
CREATE TABLE IF NOT EXISTS public.travel_sales_spreadsheet_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  trip_id UUID,
  contract_id UUID,
  client_name TEXT NOT NULL,
  destination TEXT NOT NULL,
  gross_sale_cents BIGINT NOT NULL DEFAULT 0 CHECK (gross_sale_cents >= 0),
  net_commissionable_cents BIGINT NOT NULL DEFAULT 0 CHECK (net_commissionable_cents >= 0),
  agent_commission_cents BIGINT NOT NULL DEFAULT 0 CHECK (agent_commission_cents >= 0),
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_travel_sales_spreadsheet_rows_store_id ON public.travel_sales_spreadsheet_rows(store_id);
ALTER TABLE public.travel_sales_spreadsheet_rows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store members manage travel_sales_spreadsheet_rows" ON public.travel_sales_spreadsheet_rows;
CREATE POLICY "Store members manage travel_sales_spreadsheet_rows"
  ON public.travel_sales_spreadsheet_rows
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_members sm
      WHERE sm.store_id = travel_sales_spreadsheet_rows.store_id AND sm.profile_id = auth.uid()
    )
  );

-- 5. crm_universal_spreadsheet_import_batches (Lotes de Importação Universal de Planilhas CRM)
CREATE TABLE IF NOT EXISTS public.crm_universal_spreadsheet_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'csv',
  total_rows INTEGER NOT NULL DEFAULT 0 CHECK (total_rows >= 0),
  imported_rows INTEGER NOT NULL DEFAULT 0 CHECK (imported_rows >= 0),
  unmapped_columns_preserved JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_spreadsheet_batches_store_id ON public.crm_universal_spreadsheet_import_batches(store_id);
ALTER TABLE public.crm_universal_spreadsheet_import_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store members manage crm_universal_spreadsheet_import_batches" ON public.crm_universal_spreadsheet_import_batches;
CREATE POLICY "Store members manage crm_universal_spreadsheet_import_batches"
  ON public.crm_universal_spreadsheet_import_batches
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_members sm
      WHERE sm.store_id = crm_universal_spreadsheet_import_batches.store_id AND sm.profile_id = auth.uid()
    )
  );
