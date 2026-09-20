-- Migration: 20261110000000_hotpages_show_shadow_and_text_color.sql
-- Description: Adicionar colunas show_shadow, text_color e is_active na tabela hotpages para compatibilidade total

ALTER TABLE public.hotpages ADD COLUMN IF NOT EXISTS show_shadow BOOLEAN DEFAULT false;
ALTER TABLE public.hotpages ADD COLUMN IF NOT EXISTS text_color TEXT;
ALTER TABLE public.hotpages ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
