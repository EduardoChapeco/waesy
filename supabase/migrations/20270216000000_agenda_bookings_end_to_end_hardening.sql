-- ==============================================================================
-- Waesy Agenda & Booking Module — End-to-End Hardening (DEC-275)
-- ==============================================================================
-- 1. Snapshots imutáveis na reserva (price_cents, service_title, cancellation_policy, modality).
-- 2. Máquina de estados expandida: pending, confirmed, checked_in, in_service, completed, rescheduled, cancelled, no_show.
-- 3. Rastreabilidade de remarcações (rescheduled_from_id, reschedule_count).
-- 4. Auditoria de cancelamento e no-show (cancelled_by, cancellation_reason, cancelled_at, no_show_marked_at).
-- 5. Rastreabilidade financeira do atendimento (payment_status, payment_method).
-- ==============================================================================

-- 1. Expandir restrição de status em booking_appointments
ALTER TABLE public.booking_appointments
  DROP CONSTRAINT IF EXISTS booking_appointments_status_check;

ALTER TABLE public.booking_appointments
  ADD CONSTRAINT booking_appointments_status_check
  CHECK (status IN (
    'pending',
    'confirmed',
    'checked_in',
    'in_service',
    'completed',
    'rescheduled',
    'cancelled',
    'no_show'
  ));

-- 2. Adicionar colunas de snapshot e rastreabilidade transacional
ALTER TABLE public.booking_appointments
  ADD COLUMN IF NOT EXISTS price_cents INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_title TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_policy TEXT,
  ADD COLUMN IF NOT EXISTS modality TEXT DEFAULT 'in_store' CHECK (modality IN ('in_store', 'at_home', 'online')),
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pay_at_location' CHECK (payment_status IN ('unpaid', 'paid', 'partially_paid', 'refunded', 'pass_credit', 'pay_at_location')),
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'at_location',
  ADD COLUMN IF NOT EXISTS rescheduled_from_id UUID REFERENCES public.booking_appointments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reschedule_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancelled_by TEXT CHECK (cancelled_by IN ('customer', 'provider', 'system_timeout')),
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS no_show_marked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS no_show_marked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Retrocompatibilidade: preencher dados de snapshot para agendamentos históricos existentes
UPDATE public.booking_appointments ba
SET
  price_cents = COALESCE(ba.price_cents, bs.price_cents, 0),
  service_title = COALESCE(ba.service_title, bs.title, 'Atendimento'),
  cancellation_policy = COALESCE(ba.cancellation_policy, bs.cancellation_policy),
  modality = COALESCE(ba.modality, bs.modality, 'in_store')
FROM public.booking_services bs
WHERE ba.service_id = bs.id
  AND (ba.service_title IS NULL OR ba.price_cents IS NULL OR ba.price_cents = 0);

-- 4. Índices de performance para busca por loja, cliente, horário e histórico
CREATE INDEX IF NOT EXISTS idx_booking_appts_store_scheduled
  ON public.booking_appointments(store_id, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_booking_appts_customer_scheduled
  ON public.booking_appointments(customer_id, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_booking_appts_rescheduled_from
  ON public.booking_appointments(rescheduled_from_id);

CREATE INDEX IF NOT EXISTS idx_booking_appts_status_scheduled
  ON public.booking_appointments(status, scheduled_at);

-- 5. Função de liberação de slot mantendo integridade com resource_availabilities
CREATE OR REPLACE FUNCTION public.release_resource_slot(
  p_resource_id UUID,
  p_start_at TIMESTAMPTZ,
  p_end_at TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.resource_availabilities
  WHERE resource_id = p_resource_id
    AND booking_range = tstzrange(p_start_at, p_end_at);
  RETURN true;
END;
$$;

NOTIFY pgrst, 'reload schema';
