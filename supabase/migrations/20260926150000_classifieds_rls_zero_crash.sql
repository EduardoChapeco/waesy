-- Migration 0132: Zero-Crash Classifieds & Public Items RLS Hardening
-- Master Prompt V101: Fix RLS Blocks for public viewing of active, reserved, and sold (completed) items.
-- Allows public/anon/authenticated readers to see items so the UI can distinguish between
-- a 404 (non-existent), a sold item ('Poxa, chegou tarde!'), and a reserved item.

DROP POLICY IF EXISTS "classifieds_public_read" ON public.classifieds;

CREATE POLICY "classifieds_public_read" ON public.classifieds
  FOR SELECT
  TO public, anon, authenticated
  USING (status IN ('active', 'reserved', 'completed'));
