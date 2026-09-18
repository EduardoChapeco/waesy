-- ============================================================================
-- WAESY UNIVERSAL BRAND SETTINGS, REBRANDING & LEGAL GOVERNANCE
-- Migration: 20261016000000_waesy_universal_brand_settings_and_cleanup.sql
-- ============================================================================

-- 1. TABELA CANÔNICA DE CONFIGURAÇÕES DE MARCA DA PLATAFORMA (WHITE-LABEL REAL)
CREATE TABLE IF NOT EXISTS public.platform_brand_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_name TEXT NOT NULL DEFAULT 'Waesy',
  logo_url TEXT,
  favicon_url TEXT,
  show_name BOOLEAN NOT NULL DEFAULT true,
  show_logo BOOLEAN NOT NULL DEFAULT true,
  support_email TEXT DEFAULT 'contato@usewaesy.com',
  support_whatsapp TEXT,
  support_hours TEXT DEFAULT 'Segunda a Sexta, das 08h às 18h',
  login_split_image_url TEXT,
  login_bg_desktop_url TEXT,
  login_bg_tablet_url TEXT,
  login_bg_mobile_url TEXT,
  social_instagram TEXT,
  social_facebook TEXT,
  social_linkedin TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  seo_title TEXT DEFAULT 'Waesy',
  seo_description TEXT DEFAULT 'Plataforma Comunitária de Comércio Local, Serviços, Turismo e Comunidade',
  seo_keywords TEXT DEFAULT 'comércio, serviços, comunidade, delivery, turismo, classificados, vagas',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para platform_brand_settings
ALTER TABLE public.platform_brand_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view platform brand settings" ON public.platform_brand_settings;
CREATE POLICY "Public can view platform brand settings" ON public.platform_brand_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Platform admins can manage platform brand settings" ON public.platform_brand_settings;
CREATE POLICY "Platform admins can manage platform brand settings" ON public.platform_brand_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('platform_admin', 'master')
    )
  );

-- 2. POPULAR PLATFORM_BRAND_SETTINGS A PARTIR DA MATRIZ EXISTENTE (SEM PERDER LOGO OU UPLOADS)
DO $$
DECLARE
  v_root_store RECORD;
  v_settings JSONB;
BEGIN
  SELECT * INTO v_root_store
  FROM public.stores
  WHERE is_platform_root = true OR slug IN ('waesy-matriz', 'waesy', 'waesy', 'matriz', 'waesy')
  ORDER BY is_platform_root DESC, created_at ASC
  LIMIT 1;

  IF v_root_store.id IS NOT NULL THEN
    v_settings := COALESCE(v_root_store.settings, '{}'::jsonb);

    IF NOT EXISTS (SELECT 1 FROM public.platform_brand_settings LIMIT 1) THEN
      INSERT INTO public.platform_brand_settings (
        platform_name,
        logo_url,
        favicon_url,
        show_name,
        show_logo,
        support_email,
        support_whatsapp,
        support_hours,
        login_split_image_url,
        login_bg_desktop_url,
        login_bg_tablet_url,
        login_bg_mobile_url,
        social_instagram,
        social_facebook,
        social_linkedin,
        address,
        city,
        state,
        seo_title,
        seo_description
      ) VALUES (
        'Waesy',
        COALESCE(v_settings->>'logoUrl', v_settings->>'logo_url'),
        COALESCE(v_settings->>'faviconUrl', v_settings->>'favicon_url'),
        COALESCE((v_settings->>'show_name')::boolean, true),
        COALESCE((v_settings->>'show_logo')::boolean, true),
        COALESCE(v_settings->>'support_email', 'contato@usewaesy.com'),
        v_settings->>'support_whatsapp',
        COALESCE(v_settings->>'support_hours', 'Segunda a Sexta, das 08h às 18h'),
        v_settings->>'login_split_image_url',
        COALESCE(v_settings->>'login_bg_desktop_url', v_settings->>'login_split_image_url'),
        COALESCE(v_settings->>'login_bg_tablet_url', v_settings->>'login_split_image_url'),
        COALESCE(v_settings->>'login_bg_mobile_url', v_settings->>'login_split_image_url'),
        v_settings->>'social_instagram',
        v_settings->>'social_facebook',
        v_settings->>'social_linkedin',
        v_root_store.address,
        v_root_store.city,
        v_root_store.state,
        'Waesy',
        'Plataforma Comunitária de Comércio Local, Serviços, Turismo e Comunidade'
      );
    ELSE
      UPDATE public.platform_brand_settings
      SET
        platform_name = 'Waesy',
        seo_title = 'Waesy',
        logo_url = COALESCE(logo_url, v_settings->>'logoUrl', v_settings->>'logo_url'),
        favicon_url = COALESCE(favicon_url, v_settings->>'faviconUrl', v_settings->>'favicon_url'),
        updated_at = now();
    END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM public.platform_brand_settings LIMIT 1) THEN
      INSERT INTO public.platform_brand_settings (platform_name, seo_title)
      VALUES ('Waesy', 'Waesy');
    END IF;
  END IF;
END $$;

-- 3. UNIFICAR ORGANIZAÇÃO E LOJA MATRIZ NO BANCO DE DADOS
/* DO $$
BEGIN
  -- Reatribuir lojas vinculadas a waesy-org para a organização raiz oficial
  UPDATE public.stores
  SET organization_id = '00000000-0000-0000-0000-000000000001'
  WHERE organization_id = '8a6d631b-05cc-4dba-9212-c731763bcb74';

  -- Excluir a organização legada waesy-org se existir
  DELETE FROM public.organizations WHERE id = '8a6d631b-05cc-4dba-9212-c731763bcb74' OR slug = 'waesy-org';

  -- Atualizar a organização raiz canônica para Waesy
  UPDATE public.organizations
  SET name = 'Waesy Global', slug = 'waesy-org'
  WHERE id = '00000000-0000-0000-0000-000000000001' OR slug = 'waesy-org';

  -- Loja matriz da plataforma
  UPDATE public.stores
  SET
    name = 'Waesy',
    slug = 'waesy',
    is_platform_root = true,
    seo_title = 'Waesy',
    seo_description = 'Plataforma Comunitária de Comércio Local, Serviços, Turismo e Comunidade'
  WHERE is_platform_root = true OR slug IN ('waesy-matriz', 'waesy', 'matriz', 'waesy') OR id = '00000000-0000-0000-0000-000000000002';

  -- Limpar perfil master
  UPDATE public.profiles
  SET full_name = 'Administrador Waesy'
  WHERE full_name IN ('Admin Waesy', 'Admin Waesy') OR id = '7b55d8f4-0992-4def-85ae-e79add99bc6b';
END $$; */

-- 4. ATUALIZAR TERMOS LEGAIS E POLÍTICAS PARA WAESY
DO $$
BEGIN
  -- Termos de uso
  UPDATE public.legal_documents
  SET
    title = 'Termos Gerais de Uso e Condições da Plataforma Waesy',
    summary = 'Condições gerais de navegação, conduta comunitária, segurança de contas e conformidade legal da Plataforma Waesy.',
    content_markdown = REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(content_markdown, 'plataforma Waesy', 'Plataforma Waesy'),
          'Waesy', 'Waesy'
        ),
        'Padrão CVC / Decolar / Booking / Airbnb', 'Operadoras Externas e Prestadores Terceirizados'
      ),
      'meuwaesy@gmail.com', 'contato@usewaesy.com'
    ),
    updated_at = now()
  WHERE slug = 'termos';

  -- Política de privacidade
  UPDATE public.legal_documents
  SET
    title = 'Política de Privacidade e Proteção de Dados (LGPD)',
    summary = 'Diretrizes de transparência, proteção e tratamento ético de dados conforme a LGPD na Plataforma Waesy.',
    content_markdown = REPLACE(
      REPLACE(
        REPLACE(content_markdown, 'plataforma Waesy', 'Plataforma Waesy'),
        'Waesy', 'Waesy'
      ),
      'meuwaesy@gmail.com', 'contato@usewaesy.com'
    ),
    updated_at = now()
  WHERE slug = 'privacidade';

  -- Política de cookies
  UPDATE public.legal_documents
  SET
    title = 'Política de Cookies e Gestão de Consentimento Digital',
    summary = 'Finalidades, tipos de armazenamento técnico e controle de preferências do usuário na Waesy.',
    content_markdown = REPLACE(
      REPLACE(content_markdown, 'Waesy', 'Waesy'),
      'meuwaesy@gmail.com', 'contato@usewaesy.com'
    ),
    updated_at = now()
  WHERE slug = 'cookies';

  -- Termo de isenção
  UPDATE public.legal_documents
  SET
    title = 'Termo de Isenção da Plataforma e Diretrizes de Negociações P2P',
    summary = 'A Waesy opera como canal de comunicação e vitrine comunitária, não figurando como compradora ou vendedora de anúncios de terceiros.',
    content_markdown = REPLACE(
      REPLACE(content_markdown, 'Waesy', 'Waesy'),
      'meuwaesy@gmail.com', 'contato@usewaesy.com'
    ),
    updated_at = now()
  WHERE slug = 'isencao';

  -- Lojistas
  UPDATE public.legal_documents
  SET
    title = 'Termos de Adesão e Responsabilidades de Lojistas, Empresas e Anunciantes',
    summary = 'Diretrizes operacionais, conformidade fiscal, integridade cadastral e regras de catálogo para parceiros Waesy.',
    content_markdown = REPLACE(
      REPLACE(content_markdown, 'Waesy', 'Waesy'),
      'meuwaesy@gmail.com', 'contato@usewaesy.com'
    ),
    updated_at = now()
  WHERE slug = 'lojistas';

  -- Uso de IA
  UPDATE public.legal_documents
  SET
    title = 'Aviso sobre Uso de Inteligência Artificial e Dados Biométricos',
    summary = 'Parâmetros de moderação, inteligência preditiva e proteção em conformidade ética na Waesy.',
    content_markdown = REPLACE(
      REPLACE(content_markdown, 'Waesy', 'Waesy'),
      'meuwaesy@gmail.com', 'contato@usewaesy.com'
    ),
    updated_at = now()
  WHERE slug = 'uso-de-ia';

  -- Entregadores
  UPDATE public.legal_documents
  SET
    title = 'Termos e Condições para Entregadores, Motoristas e Parceiros de Logística',
    summary = 'Normas operacionais para profissionais de entrega autônoma no ecossistema Waesy.',
    content_markdown = REPLACE(
      REPLACE(content_markdown, 'Waesy', 'Waesy'),
      'meuwaesy@gmail.com', 'contato@usewaesy.com'
    ),
    updated_at = now()
  WHERE slug = 'entregadores';

  -- Trocas e devoluções
  UPDATE public.legal_documents
  SET
    title = 'Políticas de Trocas, Devoluções e Cancelamentos',
    summary = 'Diretrizes do Código de Defesa do Consumidor para compras realizadas nas lojas do ecossistema Waesy.',
    content_markdown = REPLACE(
      REPLACE(content_markdown, 'Waesy', 'Waesy'),
      'meuwaesy@gmail.com', 'contato@usewaesy.com'
    ),
    updated_at = now()
  WHERE slug = 'trocas-e-devolucoes';

END $$;
