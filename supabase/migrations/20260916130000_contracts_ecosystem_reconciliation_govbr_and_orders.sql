-- ==============================================================================
-- 20260916130000_contracts_ecosystem_reconciliation_govbr_and_orders.sql
-- Waesy Platform — Reconciliação por CPF, Gov.br, Vínculo com Pedidos & Quitação
-- ==============================================================================

-- 1. Extensão na tabela public.profiles para assinatura salva
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS saved_signature_url TEXT,
  ADD COLUMN IF NOT EXISTS cpf TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_cpf
  ON public.profiles(cpf) WHERE cpf IS NOT NULL;

-- 2. Extensão na tabela public.contracts para vínculo com pedidos e quitação
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discharge_hash_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS discharge_issued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_settled BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_contracts_order_id
  ON public.contracts(order_id) WHERE order_id IS NOT NULL;

-- 3. Extensão na tabela public.signature_envelopes para Gov.br
ALTER TABLE public.signature_envelopes
  ADD COLUMN IF NOT EXISTS gov_br_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gov_br_level TEXT CHECK (gov_br_level IN ('bronze', 'prata', 'ouro'));

-- 4. Extensão na tabela public.signature_evidence para Gov.br
ALTER TABLE public.signature_evidence
  ADD COLUMN IF NOT EXISTS gov_br_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gov_br_level TEXT,
  ADD COLUMN IF NOT EXISTS gov_br_raw_claims JSONB;

-- 5. Função de Reconciliação Automática por CPF / E-mail
CREATE OR REPLACE FUNCTION public.reconcile_contracts_for_profile(p_profile_id UUID)
RETURNS INT AS $$
DECLARE
  v_cpf TEXT;
  v_email TEXT;
  v_updated_count INT := 0;
BEGIN
  SELECT cpf, email INTO v_cpf, v_email FROM public.profiles WHERE id = p_profile_id;

  IF v_cpf IS NOT NULL OR v_email IS NOT NULL THEN
    UPDATE public.signature_envelopes
    SET signer_profile_id = p_profile_id
    WHERE signer_profile_id IS NULL
      AND (
        (v_cpf IS NOT NULL AND signer_cpf = v_cpf)
        OR (v_email IS NOT NULL AND LOWER(signer_email) = LOWER(v_email))
      );
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  END IF;

  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
