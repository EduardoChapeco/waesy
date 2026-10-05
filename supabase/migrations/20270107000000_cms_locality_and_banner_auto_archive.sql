-- Migration: 20270107000000_cms_locality_and_banner_auto_archive.sql
-- Propósito: Adicionar city_filter em hotpages e auto_archive_at em banners para governança de localidade e auto-arquivamento de campanhas.

ALTER TABLE IF EXISTS public.hotpages 
  ADD COLUMN IF NOT EXISTS city_filter text;

CREATE INDEX IF NOT EXISTS idx_hotpages_city_filter ON public.hotpages(city_filter);

ALTER TABLE IF EXISTS public.banners 
  ADD COLUMN IF NOT EXISTS auto_archive_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_banners_scheduling ON public.banners(starts_at, ends_at, auto_archive_at);
