-- Migration: 20270106000000_campaign_scheduling_and_auto_archive.sql
-- Adiciona suporte canônico a agendamento temporal e auto-arquivamento de campanhas CMS

ALTER TABLE IF EXISTS hotpages
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS auto_archive_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE IF EXISTS marketplace_sections
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS auto_archive_at TIMESTAMPTZ DEFAULT NULL;

-- Índices parciais para consulta performática de itens de campanha ativos
CREATE INDEX IF NOT EXISTS idx_hotpages_campaign_schedule
  ON hotpages(is_active, starts_at, ends_at)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_marketplace_sections_campaign_schedule
  ON marketplace_sections(is_active, starts_at, ends_at)
  WHERE is_active = true;
