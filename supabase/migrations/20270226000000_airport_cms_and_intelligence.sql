-- Migration: 20270226000000_airport_cms_and_intelligence.sql
-- Tabela canônica de Gestão CMS e Inteligência de Infraestrutura Aeroportuária
-- Suporta personalização pelo Admin Master para qualquer aeroporto do mundo (Terminais, PF, Receita, Taxas, etc.)

CREATE TABLE IF NOT EXISTS public.airport_cms_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iata_code varchar(3) UNIQUE NOT NULL,
  operator_name text,
  operating_hours text,
  website_url text,
  phone_pabx text,
  cover_image_url text,
  terminals jsonb DEFAULT '[]'::jsonb,
  official_sectors jsonb DEFAULT '[]'::jsonb,
  fees_and_taxes jsonb DEFAULT '[]'::jsonb,
  amenities jsonb DEFAULT '[]'::jsonb,
  ground_transportation jsonb DEFAULT '{}'::jsonb,
  anac_rights_summary jsonb DEFAULT '{}'::jsonb,
  notices jsonb DEFAULT '[]'::jsonb,
  nearby_points jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  view_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_airport_cms_iata ON public.airport_cms_profiles(iata_code);

-- RLS
ALTER TABLE public.airport_cms_profiles ENABLE ROW LEVEL SECURITY;

-- Leitura pública irrestrita
DROP POLICY IF EXISTS "Public read airport_cms_profiles" ON public.airport_cms_profiles;
CREATE POLICY "Public read airport_cms_profiles" ON public.airport_cms_profiles
  FOR SELECT USING (true);

-- Edição exclusiva para administradores autenticados ou service_role
DROP POLICY IF EXISTS "Admin master manage airport_cms_profiles" ON public.airport_cms_profiles;
CREATE POLICY "Admin master manage airport_cms_profiles" ON public.airport_cms_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND (profiles.role = 'admin' OR profiles.is_admin = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND (profiles.role = 'admin' OR profiles.is_admin = true)
    )
  );

-- Seed de Aeroportos Primários com Perfis Iniciais
INSERT INTO public.airport_cms_profiles (
  iata_code, operator_name, operating_hours, phone_pabx, website_url
) VALUES
  ('XAP', 'Voe Xap (Socicam)', '05:00 às 00:00', '(49) 3328-4000', 'https://aeroportochapeco.net.br'),
  ('GRU', 'GRU Airport', '24 Horas', '(11) 2445-2945', 'https://www.gru.com.br'),
  ('LIM', 'Lima Airport Partners (LAP)', '24 Horas', '+51 1 517-3100', 'https://www.lima-airport.com')
ON CONFLICT (iata_code) DO NOTHING;
