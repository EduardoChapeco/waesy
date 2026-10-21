-- Migration: 20270217000000_waesy_go_end_to_end_multimodal_platform.sql
-- Propósito: Plataforma Multimodal Waesy Go Completa (Mobilidade, Agendamentos, Entregas, Fretes, Mudanças e Caronas)
-- Suporte a status 'scheduled', gorjetas (tip_cents), waypoints, dados de entrega e cancelamento por fase.

DO $$ BEGIN
  ALTER TYPE public.mobility_status ADD VALUE IF NOT EXISTS 'scheduled';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.mobility_requests
  ADD COLUMN IF NOT EXISTS tip_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS waypoints JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS delivery_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS delivery_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS package_weight_kg NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS package_volume_m3 NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS live_tracking_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cancelled_by TEXT,
  ADD COLUMN IF NOT EXISTS rescheduled_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_rescheduled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_mobility_requests_customer_status
  ON public.mobility_requests(customer_id, status);

CREATE INDEX IF NOT EXISTS idx_mobility_requests_scheduled_for
  ON public.mobility_requests(scheduled_for)
  WHERE scheduled_for IS NOT NULL;
