-- =============================================================================
-- MIGRATION: 20270616000000_canonical_subdomains_eventio_wider_juris_store_mercado.sql
-- OBJETIVO:
-- 1. Reconciliar o catálogo SSOT public.platform_vertical_subsystems com a topologia
--    oficial de DNS (wider, eventio, juris, store, mercado).
-- 2. Migrar registros de public.platform_landing_pages e public.stores.brand_origin
--    dos identificadores legados (tableway -> wider, passhub -> eventio,
--    lexcloud -> juris, varejo -> store) de forma idempotente.
-- =============================================================================

-- ─── 1. UPSERT DOS SUBSISTEMAS CANÔNICOS EM public.platform_vertical_subsystems ───

INSERT INTO public.platform_vertical_subsystems (
  id, name, short_name, category, subdomain, canonical_domain, target_path, description, modules_included, is_active, show_in_hub, show_on_landing, is_standalone_app, sort_order, updated_at
) VALUES
  ('wider', 'Wider (Gastronomia & KDS)', 'Wider', 'saas_brand', 'wider', 'wider.waesy.com.br', '/painel?vertical=wider', 'Vertical para restaurantes e delivery com cardapio digital, comandas, mesas e KDS.', ARRAY['module_food_delivery', 'kds', 'tables', 'pdv'], true, true, true, true, 120, now()),
  ('eventio', 'Eventio (Eventos & Bilheteria)', 'Eventio', 'saas_brand', 'eventio', 'eventio.waesy.com.br', '/painel?vertical=eventio', 'Gestao completa de eventos, lotes de ingressos, QR Code de portaria e promoters.', ARRAY['events', 'tickets', 'affiliates'], true, true, true, true, 140, now()),
  ('juris', 'Juris (Juridico & Processos)', 'Juris', 'saas_brand', 'juris', 'juris.waesy.com.br', '/painel?vertical=juris', 'Gestao para escritorios de advocacia, prazos processuais, GED e contratos de honorarios.', ARRAY['legal', 'contracts', 'crm'], true, true, true, true, 150, now()),
  ('store', 'Waesy Store (Lojas & Varejo)', 'Store Varejo', 'saas_brand', 'store', 'store.waesy.com.br', '/painel?vertical=store', 'PDV, grade de variacoes por cor e tamanho, vitrine online, reposicao inteligente e entrega local.', ARRAY['catalog', 'inventory', 'pdv', 'orders'], true, true, true, true, 185, now()),
  ('mercado', 'Waesy Mercado (Supermercados & Mercearias)', 'Mercado', 'saas_brand', 'mercado', 'mercado.waesy.com.br', '/painel?vertical=mercado', 'PDV de caixa rapido, produtos pesaveis por balanca, controle de lote/validade, encartes e entregas de mercado.', ARRAY['catalog', 'inventory', 'pdv', 'orders'], true, true, true, true, 190, now())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  subdomain = EXCLUDED.subdomain,
  canonical_domain = EXCLUDED.canonical_domain,
  target_path = EXCLUDED.target_path,
  description = EXCLUDED.description,
  modules_included = EXCLUDED.modules_included,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- ─── 2. MIGRAÇÃO DE LANDING PAGES CUSTOMIZADAS DOS SLUGS LEGADOS ──────────────

DO $$
DECLARE
  v_pair RECORD;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'platform_landing_pages'
  ) THEN
    FOR v_pair IN
      SELECT * FROM (VALUES
        ('tableway', 'wider', 'wider'),
        ('passhub', 'eventio', 'eventio'),
        ('lexcloud', 'juris', 'juris'),
        ('varejo', 'store', 'waesy_studio')
      ) AS t(old_slug, new_slug, new_brand)
    LOOP
      IF EXISTS (SELECT 1 FROM public.platform_landing_pages WHERE slug = v_pair.old_slug)
         AND NOT EXISTS (SELECT 1 FROM public.platform_landing_pages WHERE slug = v_pair.new_slug) THEN
        UPDATE public.platform_landing_pages
        SET
          slug = v_pair.new_slug,
          subsystem_id = v_pair.new_slug,
          brand_vertical_id = v_pair.new_brand,
          updated_at = now()
        WHERE slug = v_pair.old_slug;
      ELSIF EXISTS (SELECT 1 FROM public.platform_landing_pages WHERE slug = v_pair.old_slug) THEN
        UPDATE public.platform_landing_pages
        SET subsystem_id = v_pair.new_slug
        WHERE subsystem_id = v_pair.old_slug;
        DELETE FROM public.platform_landing_pages WHERE slug = v_pair.old_slug;
      END IF;
    END LOOP;
  END IF;
END $$;

-- ─── 3. REMOÇÃO DOS SLUGS LEGADOS DE public.platform_vertical_subsystems ─────

DELETE FROM public.platform_vertical_subsystems
WHERE id IN ('tableway', 'passhub', 'lexcloud', 'varejo');

-- ─── 4. NORMALIZAÇÃO DE brand_origin EM public.stores E directory_listings ────

UPDATE public.stores
SET brand_origin = CASE brand_origin
  WHEN 'tableway' THEN 'wider'
  WHEN 'passhub' THEN 'eventio'
  WHEN 'lexcloud' THEN 'juris'
  ELSE brand_origin
END
WHERE brand_origin IN ('tableway', 'passhub', 'lexcloud');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'directory_listings' AND column_name = 'brand_origin'
  ) THEN
    UPDATE public.directory_listings
    SET brand_origin = CASE brand_origin
      WHEN 'tableway' THEN 'wider'
      WHEN 'passhub' THEN 'eventio'
      WHEN 'lexcloud' THEN 'juris'
      ELSE brand_origin
    END
    WHERE brand_origin IN ('tableway', 'passhub', 'lexcloud');
  END IF;
END $$;

COMMENT ON COLUMN public.stores.brand_origin IS 'Marca vertical de origem do tenant (waesy, wowbook, wider, turis, eventio, juris, talentlink, omnipage, signflow, waesy_news, waesy_copilot, waesy_studio)';

NOTIFY pgrst, 'reload schema';
