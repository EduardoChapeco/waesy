-- Estado canônico do ciclo de reserva para evitar que a conversão caia diretamente em
-- status ambíguo de viagem. A emissão de vouchers/locators continua sendo uma etapa explícita.

ALTER TABLE public.tourism_trips
  ADD COLUMN IF NOT EXISTS reservation_state TEXT NOT NULL DEFAULT 'draft';

ALTER TABLE public.tourism_trips
  DROP CONSTRAINT IF EXISTS tourism_trips_reservation_state_check;

ALTER TABLE public.tourism_trips
  ADD CONSTRAINT tourism_trips_reservation_state_check
  CHECK (reservation_state IN (
    'draft',
    'reserved_pending_issuance',
    'issuance_in_progress',
    'issued',
    'cancelled'
  ));

UPDATE public.tourism_trips
SET reservation_state = 'reserved_pending_issuance'
WHERE reservation_state = 'draft'
  AND proposal_id IS NOT NULL
  AND status <> 'cancelled';

CREATE INDEX IF NOT EXISTS idx_tourism_trips_reservation_state
  ON public.tourism_trips (store_id, reservation_state, travel_start_date);

COMMENT ON COLUMN public.tourism_trips.reservation_state IS
  'Estado canônico da reserva: reserved_pending_issuance aguarda emissão/locators e não representa viagem emitida.';
