-- =============================================================================
-- MIGRATION: 20270623000000_fix_stores_avatar_url_and_storage_buckets.sql
-- OBJETIVO:
-- 1. Corrigir erro P0 na criação de lojas: `record "new" has no field "avatar_url"`
--    adicionando `avatar_url` em `public.stores` e blindando `sync_store_to_directory()`.
-- 2. Provisionar 100% dos buckets de Storage usados pela BFF (`ALLOWED_BFF_BUCKETS`)
--    e garantir políticas RLS consistentes para upload autenticado (incluindo
--    onboarding de novas empresas em `avatars`, `store-assets`, `covers`, etc.).
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. GARANTIR COLUNA avatar_url EM public.stores & BLINDAR TRIGGER DE SYNC
-- -----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.stores
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

CREATE OR REPLACE FUNCTION public.sync_store_to_directory()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category TEXT;
  v_city TEXT;
  v_state TEXT;
  v_address TEXT;
  v_avatar TEXT;
  v_banner TEXT;
  v_phone TEXT;
  v_whatsapp TEXT;
  v_working_hours JSONB;
  v_description TEXT;
  v_is_verified BOOLEAN := false;
  v_new_json JSONB;
BEGIN
  IF (NEW.is_active IS FALSE) THEN
    UPDATE public.directory_listings
    SET status = 'inactive', updated_at = now()
    WHERE store_id = NEW.id;
    RETURN NEW;
  END IF;

  v_new_json := to_jsonb(NEW);

  v_category := coalesce(
    NEW.settings->>'category',
    NEW.settings->>'niche',
    NEW.settings->>'segment',
    'Comércio e Serviços'
  );

  IF (v_category = 'turismo') THEN v_category := 'Agências de Turismo';
  ELSIF (v_category = 'gastronomia') THEN v_category := 'Gastronomia e Restaurantes';
  ELSIF (v_category = 'servicos') THEN v_category := 'Serviços Especializados';
  ELSIF (v_category = 'comercio') THEN v_category := 'Comércio Local';
  ELSIF (v_category = 'saude') THEN v_category := 'Saúde e Bem-Estar';
  ELSIF (v_category = 'imoveis') THEN v_category := 'Imóveis e Construção';
  ELSIF (v_category = 'automotivo') THEN v_category := 'Automotivo';
  ELSIF (v_category = 'educacao') THEN v_category := 'Educação e Cursos';
  ELSIF (v_category = 'hoteis') THEN v_category := 'Hospedagem e Hotéis';
  ELSIF (v_category = 'eventos') THEN v_category := 'Eventos e Lazer';
  END IF;

  v_city := coalesce(NEW.city, NEW.settings->>'city');
  v_state := coalesce(v_new_json->>'state', NEW.settings->>'state', 'SC');

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

  v_avatar := coalesce(
    NEW.logo_url,
    v_new_json->>'avatar_url',
    NEW.settings->>'logoUrl',
    NEW.settings->>'logo_url'
  );
  v_banner := coalesce(
    NEW.banner_url,
    NEW.settings->>'bannerUrl',
    NEW.settings->>'banner_url',
    NEW.settings->>'cover_url'
  );
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
    description = coalesce(EXCLUDED.description, directory_listings.description),
    address = coalesce(EXCLUDED.address, directory_listings.address),
    city = coalesce(EXCLUDED.city, directory_listings.city),
    state = coalesce(EXCLUDED.state, directory_listings.state),
    contact_phone = coalesce(EXCLUDED.contact_phone, directory_listings.contact_phone),
    contact_whatsapp = coalesce(EXCLUDED.contact_whatsapp, directory_listings.contact_whatsapp),
    contact_email = coalesce(EXCLUDED.contact_email, directory_listings.contact_email),
    working_hours = coalesce(EXCLUDED.working_hours, directory_listings.working_hours),
    is_verified = EXCLUDED.is_verified OR directory_listings.is_verified,
    avatar_url = coalesce(EXCLUDED.avatar_url, directory_listings.avatar_url),
    banner_url = coalesce(EXCLUDED.banner_url, directory_listings.banner_url),
    status = 'active',
    updated_at = now();

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. PROVISIONAMENTO COMPLETO DE TODOS OS BUCKETS CANÔNICOS (ALLOWED_BFF_BUCKETS)
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('product-media', 'product-media', true, 20971520, NULL),
  ('cms-media', 'cms-media', true, 20971520, NULL),
  ('classifieds', 'classifieds', true, 20971520, NULL),
  ('classified-media', 'classified-media', true, 20971520, NULL),
  ('covers', 'covers', true, 15728640, NULL),
  ('avatars', 'avatars', true, 10485760, NULL),
  ('banners', 'banners', true, 20971520, NULL),
  ('home-banners', 'home-banners', true, 20971520, NULL),
  ('home-categories', 'home-categories', true, 10485760, NULL),
  ('post-media', 'post-media', true, 20971520, NULL),
  ('public_media', 'public_media', true, 20971520, NULL),
  ('store-assets', 'store-assets', true, 20971520, NULL),
  ('brand-assets', 'brand-assets', true, 20971520, NULL),
  ('destination-media', 'destination-media', true, 20971520, NULL),
  ('recipes', 'recipes', true, 15728640, NULL),
  ('social', 'social', true, 20971520, NULL),
  ('payment-proofs', 'payment-proofs', false, 20971520, NULL),
  ('rma-proofs', 'rma-proofs', false, 20971520, NULL),
  ('legal-documents', 'legal-documents', false, 20971520, NULL),
  ('receipts', 'receipts', false, 20971520, NULL),
  ('order-receipts', 'order-receipts', false, 20971520, NULL),
  ('identity-vault', 'identity-vault', false, 20971520, NULL),
  ('copilot-uploads', 'copilot-uploads', false, 20971520, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

-- -----------------------------------------------------------------------------
-- 3. POLÍTICAS RLS DE LEITURA PÚBLICA & ESCRITA AUTENTICADA SEGURA
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "public_buckets_read_all" ON storage.objects;
CREATE POLICY "public_buckets_read_all"
  ON storage.objects
  FOR SELECT
  TO public
  USING (
    bucket_id IN (
      'product-media', 'cms-media', 'classifieds', 'classified-media',
      'covers', 'avatars', 'banners', 'home-banners', 'home-categories',
      'post-media', 'public_media', 'store-assets', 'brand-assets',
      'destination-media', 'recipes', 'social'
    )
  );

DROP POLICY IF EXISTS "media_authenticated_insert_civil_and_tenant" ON storage.objects;
CREATE POLICY "media_authenticated_insert_civil_and_tenant"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      bucket_id IN (
        'store-assets',
        'product-media',
        'product-images',
        'classifieds',
        'classified-media',
        'classified-images',
        'covers',
        'avatars',
        'post-media',
        'public_media',
        'social',
        'social-media',
        'stories',
        'chat-attachments',
        'documents',
        'contracts',
        'proposals',
        'tourism-media',
        'destination-media',
        'brand-assets',
        'recipes',
        'Fiscal_Certificates',
        'resumes',
        'copilot-uploads',
        'legal-documents',
        'receipts',
        'order-receipts',
        'payment-proofs',
        'rma-proofs',
        'identity-vault'
      )
      OR (
        bucket_id IN ('cms-media', 'banners', 'home-banners', 'home-categories')
        AND (
          public.is_platform_admin()
          OR EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.profile_id = auth.uid()
              AND wm.role IN ('owner', 'admin', 'manager', 'content')
          )
        )
      )
    )
  );

COMMIT;
