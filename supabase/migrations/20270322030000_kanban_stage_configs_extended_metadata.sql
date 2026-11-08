-- ========================================================================================
-- MIGRATION: EXTENSÃO DE METADADOS DE KANBAN (SLA, CARD VARIANT, NICHO E DEPARTAMENTO)
-- ========================================================================================

ALTER TABLE public.kanban_stage_configs ADD COLUMN IF NOT EXISTS sla_minutes integer;
ALTER TABLE public.kanban_stage_configs ADD COLUMN IF NOT EXISTS card_variant text;
ALTER TABLE public.kanban_stage_configs ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE public.kanban_stage_configs ADD COLUMN IF NOT EXISTS niche text;
ALTER TABLE public.kanban_stage_configs ADD COLUMN IF NOT EXISTS description text;
