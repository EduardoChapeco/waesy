-- ============================================================================
-- WAESY PLATFORM BRAND SETTINGS — DYNAMIC THEME COLORS & ACCENTS
-- Migration: 20270313000000_platform_brand_settings_theme_colors.sql
-- ============================================================================

-- 1. Adicionar colunas de paleta de cores à tabela canônica platform_brand_settings
ALTER TABLE public.platform_brand_settings 
  ADD COLUMN IF NOT EXISTS primary_color TEXT NOT NULL DEFAULT '#09090b',
  ADD COLUMN IF NOT EXISTS accent_color TEXT NOT NULL DEFAULT '#0066FF',
  ADD COLUMN IF NOT EXISTS secondary_color TEXT NOT NULL DEFAULT '#0052CC',
  ADD COLUMN IF NOT EXISTS theme_style TEXT NOT NULL DEFAULT 'azure_minimal';

-- 2. Atualizar registros existentes que estejam vazios ou desatualizados
UPDATE public.platform_brand_settings
SET 
  primary_color = COALESCE(primary_color, '#09090b'),
  accent_color = COALESCE(accent_color, '#0066FF'),
  secondary_color = COALESCE(secondary_color, '#0052CC'),
  theme_style = COALESCE(theme_style, 'azure_minimal')
WHERE id IS NOT NULL;
