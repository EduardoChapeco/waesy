-- Contrato físico do extrato de cashback do Clube.
-- Créditos e débitos são emitidos por BFF/service_role; o cliente só lê o próprio extrato.

CREATE TABLE IF NOT EXISTS public.store_cashback_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit', 'debit')),
  description TEXT,
  reference_type TEXT,
  reference_id UUID,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_cashback_ledger_user_created
  ON public.store_cashback_ledger (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_store_cashback_ledger_store_created
  ON public.store_cashback_ledger (store_id, created_at DESC);

ALTER TABLE public.store_cashback_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cashback ledger self read" ON public.store_cashback_ledger;
CREATE POLICY "cashback ledger self read"
  ON public.store_cashback_ledger
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

REVOKE ALL ON TABLE public.store_cashback_ledger FROM anon, authenticated;
GRANT SELECT ON TABLE public.store_cashback_ledger TO authenticated;
GRANT ALL ON TABLE public.store_cashback_ledger TO service_role;
