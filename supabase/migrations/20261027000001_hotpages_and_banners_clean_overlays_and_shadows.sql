-- Migration: 20261027000000_hotpages_and_banners_clean_overlays_and_shadows.sql
-- Propósito: Erradicação de sombras forçadas por padrão em botões e banners com upload de imagem.
-- Adiciona suporte a sombra externa opcional (show_shadow) e customização de cor/opacidade de overlay.

-- 1. Tabela HOTPAGES
ALTER TABLE IF EXISTS hotpages
  ADD COLUMN IF NOT EXISTS show_shadow BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS text_color TEXT DEFAULT NULL;

-- Atualizar defaults para false (Zero sombra e zero overlay por padrão)
ALTER TABLE IF EXISTS hotpages
  ALTER COLUMN show_overlay SET DEFAULT false;

-- Limpar registros existentes de hero_module e home para remover o degradê forçado
UPDATE hotpages
SET 
  show_overlay = false,
  show_shadow = false
WHERE 
  template_type = 'hero_module' 
  OR module = 'home'
  OR slug LIKE 'home-%'
  OR slug IN ('places', 'classificados', 'feed', 'noticias', 'empregos', 'eventos');

-- 2. Tabela BANNERS
ALTER TABLE IF EXISTS banners
  ADD COLUMN IF NOT EXISTS show_shadow BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS bg_color TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bg_overlay_opacity INTEGER DEFAULT 30;

ALTER TABLE IF EXISTS banners
  ALTER COLUMN show_overlay SET DEFAULT false;

UPDATE banners
SET show_shadow = false
WHERE show_shadow IS NULL;
