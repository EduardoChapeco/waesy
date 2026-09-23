-- ============================================================================
-- Waesy Platform: Enriquecimento Reverso de Perfis Fantasma (Ghost Tenants) & Claiming
-- Migration: 20261114000001_ghost_tenants_and_claiming_engine.sql
-- ============================================================================

-- 1. Expansão de stores com suporte nativo a Ghost Tenants
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS is_ghost BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_listing_id UUID REFERENCES public.directory_listings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS claim_status TEXT NOT NULL DEFAULT 'unclaimed' 
    CHECK (claim_status IN ('unclaimed', 'claim_pending', 'claimed'));

CREATE INDEX IF NOT EXISTS idx_stores_is_ghost ON public.stores(is_ghost) WHERE is_ghost = true;
CREATE INDEX IF NOT EXISTS idx_stores_source_listing ON public.stores(source_listing_id);
CREATE INDEX IF NOT EXISTS idx_stores_claim_status ON public.stores(claim_status);

-- 2. Expansão de directory_listings com link reverso para ghost_store_id
ALTER TABLE public.directory_listings
  ADD COLUMN IF NOT EXISTS ghost_store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_dl_ghost_store ON public.directory_listings(ghost_store_id) WHERE ghost_store_id IS NOT NULL;

-- 3. Stored Procedure: Geração em Lote de Ghost Tenants a partir de Listagens com Score Superior
CREATE OR REPLACE FUNCTION public.generate_ghost_stores_from_high_score_listings(
  p_min_score INTEGER DEFAULT 80,
  p_limit INTEGER DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_default_org_id UUID;
  v_rec RECORD;
  v_slug TEXT;
  v_base_slug TEXT;
  v_counter INTEGER;
  v_created_count INTEGER := 0;
  v_store_id UUID;
  v_created_stores JSONB := '[]'::jsonb;
BEGIN
  -- Garante que existe uma organização pública/mestre para abrigar pré-perfis não reivindicados
  SELECT id INTO v_default_org_id FROM public.organizations ORDER BY created_at ASC LIMIT 1;
  IF v_default_org_id IS NULL THEN
    INSERT INTO public.organizations (name, slug)
    VALUES ('Waesy Hub Regional', 'waesy-hub-regional')
    RETURNING id INTO v_default_org_id;
  END IF;

  -- Itera sobre empresas mineradas que possuem alta qualidade e ainda não foram convertidas
  FOR v_rec IN (
    SELECT dl.*
    FROM public.directory_listings dl
    WHERE (dl.data_quality_score >= p_min_score OR dl.crawl_score >= p_min_score)
      AND dl.ghost_store_id IS NULL
      AND dl.store_id IS NULL
      AND dl.business_name IS NOT NULL
      AND length(trim(dl.business_name)) >= 2
    ORDER BY dl.data_quality_score DESC, dl.created_at DESC
    LIMIT p_limit
  ) LOOP
    -- Gera slug seguro a partir do nome do negócio
    v_base_slug := lower(regexp_replace(
      translate(v_rec.business_name, 'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ', 'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'),
      '[^a-z0-9]+', '-', 'g'
    ));
    v_base_slug := trim(both '-' from v_base_slug);
    IF length(v_base_slug) = 0 THEN
      v_base_slug := 'empresa';
    END IF;

    -- Garante unicidade do slug
    v_slug := v_base_slug;
    v_counter := 1;
    WHILE EXISTS (SELECT 1 FROM public.stores WHERE slug = v_slug) LOOP
      v_slug := v_base_slug || '-' || v_counter;
      v_counter := v_counter + 1;
    END LOOP;

    -- Cria a Ghost Store
    INSERT INTO public.stores (
      organization_id,
      name,
      slug,
      is_ghost,
      source_listing_id,
      claim_status,
      settings
    )
    VALUES (
      v_default_org_id,
      v_rec.business_name,
      v_slug,
      true,
      v_rec.id,
      'unclaimed',
      jsonb_build_object(
        'is_ghost', true,
        'claimed', false,
        'cnpj', v_rec.cnpj,
        'cnae', v_rec.cnae,
        'phone', v_rec.contact_phone,
        'city', v_rec.city,
        'state', v_rec.state,
        'neighborhood', v_rec.neighborhood,
        'address', v_rec.address,
        'description', v_rec.description,
        'avatar_url', v_rec.avatar_url,
        'banner_url', v_rec.banner_url,
        'photos', v_rec.photos,
        'quality_score', v_rec.data_quality_score,
        'working_hours', v_rec.working_hours,
        'source', coalesce(v_rec.scraper_source, 'crawled_directory')
      )
    )
    RETURNING id INTO v_store_id;

    -- Atualiza directory_listings com a referência da loja fantasma
    UPDATE public.directory_listings
    SET ghost_store_id = v_store_id,
        updated_at = now()
    WHERE id = v_rec.id;

    v_created_count := v_created_count + 1;
    v_created_stores := v_created_stores || jsonb_build_object(
      'listing_id', v_rec.id,
      'store_id', v_store_id,
      'name', v_rec.business_name,
      'slug', v_slug,
      'score', v_rec.data_quality_score
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'created_count', v_created_count,
    'stores', v_created_stores
  );
END;
$$;

-- 4. Stored Procedure: Aprovação Atômica de Reivindicação de Negócio (Claim)
CREATE OR REPLACE FUNCTION public.approve_ghost_store_claim(
  p_claim_id UUID,
  p_approver_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_claim RECORD;
  v_store RECORD;
  v_requester_profile RECORD;
BEGIN
  -- Busca reivindicação pendente
  SELECT * INTO v_claim
  FROM public.claim_profiles
  WHERE id = p_claim_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solicitação de reivindicação não encontrada ou já processada.');
  END IF;

  -- Localiza a loja associada
  SELECT * INTO v_store
  FROM public.stores
  WHERE id = v_claim.store_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Loja vinculada não encontrada.');
  END IF;

  -- Localiza perfil do solicitante por e-mail se já cadastrado no sistema
  SELECT p.* INTO v_requester_profile
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE u.email = v_claim.requester_email
  LIMIT 1;

  -- Transição atômica da loja para proprietário real
  UPDATE public.stores
  SET 
    is_ghost = false,
    claimed_at = now(),
    claimed_by = coalesce(v_requester_profile.id, p_approver_id),
    claim_status = 'claimed',
    settings = settings || jsonb_build_object(
      'is_ghost', false,
      'claimed', true,
      'claimed_at', now(),
      'claimed_by_email', v_claim.requester_email
    ),
    updated_at = now()
  WHERE id = v_store.id;

  -- Se perfil existir, associa-o à loja como 'owner'
  IF v_requester_profile.id IS NOT NULL THEN
    UPDATE public.profiles
    SET store_id = v_store.id,
        role = 'owner',
        updated_at = now()
    WHERE id = v_requester_profile.id;

    -- Insere na tabela de membros se existir
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspace_members') THEN
      INSERT INTO public.workspace_members (
        store_id,
        profile_id,
        role,
        is_active
      )
      VALUES (
        v_store.id,
        v_requester_profile.id,
        'owner',
        true
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Sincroniza o vínculo canônico na tabela directory_listings
  UPDATE public.directory_listings
  SET store_id = v_store.id,
      updated_at = now()
  WHERE id = v_store.source_listing_id;

  -- Atualiza o status da reivindicação
  UPDATE public.claim_profiles
  SET 
    status = 'approved',
    verified_at = now(),
    updated_at = now()
  WHERE id = p_claim_id;

  RETURN jsonb_build_object(
    'success', true,
    'store_id', v_store.id,
    'store_slug', v_store.slug,
    'claim_id', p_claim_id,
    'requester_email', v_claim.requester_email,
    'claimed_at', now()
  );
END;
$$;
