-- ============================================================================
-- Waesy Services Engine — Migration: Appointment Status Audit Fields Hardening
-- ============================================================================
-- Adds audit fields for tracking when and who completed, cancelled, or marked
-- no-show on appointments, guaranteeing zero ambiguous states.
-- ============================================================================

ALTER TABLE public.booking_appointments
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS no_show_marked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS no_show_marked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_booking_appointments_completed_at ON public.booking_appointments(completed_at);
CREATE INDEX IF NOT EXISTS idx_booking_appointments_cancelled_at ON public.booking_appointments(cancelled_at);
