-- ============================================================================
-- Waesy Commerce — Migration 20260726050000: Seed Home Experience Document
-- ============================================================================
-- Seeds a default published experience_document for the storefront home page
-- so every store instance has a luxury storefront layout out of the box.
-- ============================================================================

ALTER TYPE public.builder_block_type ADD VALUE IF NOT EXISTS 'hero';
ALTER TYPE public.builder_block_type ADD VALUE IF NOT EXISTS 'category_grid';
ALTER TYPE public.builder_block_type ADD VALUE IF NOT EXISTS 'product_grid';

DO $$
DECLARE
  v_store_id UUID := '00000000-0000-0000-0000-000000000002';
  v_doc_id UUID;
  v_version_id UUID;
BEGIN
  -- Ensure store exists
  SELECT id INTO v_store_id FROM public.stores WHERE id = v_store_id LIMIT 1;
  IF v_store_id IS NULL THEN
    SELECT id INTO v_store_id FROM public.stores LIMIT 1;
  END IF;

  IF v_store_id IS NULL THEN
    RETURN;
  END IF;

  -- 1. Insert or get default experience_document
  SELECT id INTO v_doc_id
  FROM public.experience_documents
  WHERE store_id = v_store_id AND slug = 'home' AND document_type = 'storefront'
  LIMIT 1;

  IF v_doc_id IS NULL THEN
    INSERT INTO public.experience_documents (store_id, title, slug, document_type, is_active)
    VALUES (v_store_id, 'Vitrine Principal', 'home', 'storefront', true)
    RETURNING id INTO v_doc_id;
  END IF;

  -- 2. Insert or get default published experience_version
  SELECT id INTO v_version_id
  FROM public.experience_versions
  WHERE document_id = v_doc_id AND status = 'published'
  LIMIT 1;

  IF v_version_id IS NULL THEN
    INSERT INTO public.experience_versions (document_id, version_number, status)
    VALUES (v_doc_id, 1, 'published')
    RETURNING id INTO v_version_id;
  END IF;

  -- 3. Insert default experience_nodes if version has no nodes
  IF NOT EXISTS (SELECT 1 FROM public.experience_nodes WHERE version_id = v_version_id) THEN
    -- Hero Section
    INSERT INTO public.experience_nodes (id, version_id, node_type, block_type, sort_order, content)
    VALUES (
      gen_random_uuid(),
      v_version_id,
      'section',
      'hero',
      1,
      '{
        "title": "Coleção Verão & Elegância",
        "subtitle": "Conforto artesanal e design contemporâneo em cada detalhe",
        "primary_cta_text": "Ver Lançamentos",
        "primary_cta_link": "/catalogo",
        "badge_text": "Nova Coleção 2026",
        "image_url": "https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&q=80&w=2000"
      }'::jsonb
    );

    -- Category Grid Section
    INSERT INTO public.experience_nodes (id, version_id, node_type, block_type, sort_order, content)
    VALUES (
      gen_random_uuid(),
      v_version_id,
      'section',
      'category_grid',
      2,
      '{
        "title": "Categorias em Destaque",
        "subtitle": "Explore nossas opções selecionadas",
        "categories": [
          { "title": "Sandálias & Rasteiras", "slug": "sandalias", "image_url": "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&q=80&w=600" },
          { "title": "Tênis casuais", "slug": "tenis", "image_url": "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=600" },
          { "title": "Scarpins & Saltos", "slug": "saltos", "image_url": "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&q=80&w=600" }
        ]
      }'::jsonb
    );

    -- Featured Products Grid
    INSERT INTO public.experience_nodes (id, version_id, node_type, block_type, sort_order, content, data_bindings)
    VALUES (
      gen_random_uuid(),
      v_version_id,
      'section',
      'product_grid',
      3,
      '{
        "title": "Mais Desejados",
        "subtitle": "Os favoritos da nossa comunidade",
        "limit": 8
      }'::jsonb,
      '{ "source": "latest_products" }'::jsonb
    );
  END IF;

END $$;
