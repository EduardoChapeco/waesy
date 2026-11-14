-- ==============================================================================
-- MIGRATION: 20270416000000_travel_quotes_proposals_e2e_hardening.sql
-- DESCRIPTION:
--   1. Expande a CHECK constraint de trip_type em public.travel_quotes para incluir
--      todos os 8 tipos suportados pelo Workspace/Cotacoes (air_only, car_rental,
--      corporate_b2b alem dos 5 originais).
--   2. Adiciona public.travel_quotes.customer_id (FK customers_crm) e indices
--      operacionais para multi-tenant Kanban/CRM.
--   3. Substitui politicas RLS permissivas (auth.uid() IS NOT NULL) em
--      public.travel_quotes por isolamento estrito via public.is_store_staff(store_id),
--      incluindo DELETE autorizado por staff da loja.
--   4. Consolida FK de converted_trip_id -> public.tourism_trips(id) e indices em
--      public.travel_proposals para integridade referencial e lookup rapido.
-- ==============================================================================

-- 1. Expandir CHECK constraint trip_type em public.travel_quotes de forma idempotente
DO $$
DECLARE
  v_conname TEXT;
BEGIN
  FOR v_conname IN
    SELECT c.conname
      FROM pg_constraint c
     WHERE c.conrelid = 'public.travel_quotes'::regclass
       AND c.contype = 'c'
       AND pg_get_constraintdef(c.oid) ILIKE '%trip_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.travel_quotes DROP CONSTRAINT IF EXISTS %I', v_conname);
  END LOOP;

  ALTER TABLE public.travel_quotes
    ADD CONSTRAINT travel_quotes_trip_type_check
    CHECK (
      trip_type IS NULL
      OR trip_type IN (
        'air_package',
        'air_only',
        'hotel_only',
        'car_rental',
        'corporate_b2b',
        'cruise',
        'bus',
        'visa_assistance'
      )
    );
END
$$;

-- 2. Vínculo canonico com customers_crm + indices em public.travel_quotes
ALTER TABLE public.travel_quotes
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers_crm(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_travel_quotes_store_status_created
  ON public.travel_quotes (store_id, status, created_at DESC)
  WHERE store_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_travel_quotes_customer_id
  ON public.travel_quotes (store_id, customer_id)
  WHERE customer_id IS NOT NULL;

-- 3. RLS Multi-Tenant estrita em public.travel_quotes (mantendo INSERT publico do formulario civil)
ALTER TABLE public.travel_quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários autenticados podem ver cotações" ON public.travel_quotes;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar cotações" ON public.travel_quotes;
DROP POLICY IF EXISTS "Store staff view own travel_quotes" ON public.travel_quotes;
DROP POLICY IF EXISTS "Store staff update own travel_quotes" ON public.travel_quotes;
DROP POLICY IF EXISTS "Store staff delete own travel_quotes" ON public.travel_quotes;

CREATE POLICY "Store staff view own travel_quotes"
  ON public.travel_quotes
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_store_staff(store_id)));

CREATE POLICY "Store staff update own travel_quotes"
  ON public.travel_quotes
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_store_staff(store_id)))
  WITH CHECK ((SELECT public.is_store_staff(store_id)));

CREATE POLICY "Store staff delete own travel_quotes"
  ON public.travel_quotes
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_store_staff(store_id)));

-- 4. Hardening referencial e indices em public.travel_proposals
ALTER TABLE public.travel_proposals
  ADD COLUMN IF NOT EXISTS converted_trip_id UUID,
  ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source_listing_id TEXT,
  ADD COLUMN IF NOT EXISTS source_listing_origin TEXT;

DO $$
BEGIN
  UPDATE public.travel_proposals tp
     SET converted_trip_id = NULL
   WHERE tp.converted_trip_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.tourism_trips tt WHERE tt.id = tp.converted_trip_id
     );

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'travel_proposals_converted_trip_id_fkey'
       AND conrelid = 'public.travel_proposals'::regclass
  ) THEN
    ALTER TABLE public.travel_proposals
      ADD CONSTRAINT travel_proposals_converted_trip_id_fkey
      FOREIGN KEY (converted_trip_id)
      REFERENCES public.tourism_trips(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_travel_proposals_converted_trip_id
  ON public.travel_proposals (converted_trip_id)
  WHERE converted_trip_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_travel_proposals_quote_id
  ON public.travel_proposals (store_id, quote_id)
  WHERE quote_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_travel_proposals_quote_lookup
  ON public.travel_proposals (quote_id)
  WHERE quote_id IS NOT NULL;
