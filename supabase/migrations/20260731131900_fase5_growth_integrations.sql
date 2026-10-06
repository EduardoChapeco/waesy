-- Migration: Fase 5 Growth and Integrations
-- Author: Antigravity

-- 1. Tabelas de Credenciais de Integração (Cofre Seguro)
-- A migration 0017 criou provider como enum e chamou o payload de
-- credentials. CREATE TABLE IF NOT EXISTS não altera tabela existente;
-- normalizamos ambos antes de os BFFs usarem token_payload e novos providers.
ALTER TABLE public.integration_credentials
  ALTER COLUMN provider TYPE text USING provider::text;

ALTER TABLE public.integration_credentials
  ADD COLUMN IF NOT EXISTS credentials JSONB,
  ADD COLUMN IF NOT EXISTS token_payload JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.integration_credentials
SET token_payload = credentials
WHERE token_payload = '{}'::jsonb
  AND credentials IS NOT NULL
  AND jsonb_typeof(credentials) = 'object';

-- credentials é legado; novos BFFs gravam token_payload (ou o payload cifrado)
-- e não devem ser obrigados a duplicar segredos nessa coluna antiga.
ALTER TABLE public.integration_credentials
  ALTER COLUMN credentials DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.integration_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    provider VARCHAR(100) NOT NULL, -- e.g., 'whatsapp_cloud_api', 'melhorenvio', 'meta_pixel'
    token_payload JSONB NOT NULL DEFAULT '{}'::jsonb, -- Armazena a chave de API e secrets (acessível apenas via server functions)
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (store_id, provider)
);

ALTER TABLE public.integration_credentials ENABLE ROW LEVEL SECURITY;
-- Apenas donos e admins podem gerenciar credenciais (A proteção real deve ser feita nas server functions).
CREATE POLICY "Store owners can manage credentials"
    ON public.integration_credentials
    FOR ALL
    TO authenticated
    USING (public.has_workspace_role(store_id, ARRAY['owner', 'admin']))
    WITH CHECK (public.has_workspace_role(store_id, ARRAY['owner', 'admin']));


-- 2. Tabela de Cotações de Frete (Rastreabilidade e prevenção a fraude de alteração de preço)
CREATE TABLE IF NOT EXISTS public.shipping_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    cart_id UUID REFERENCES public.carts(id) ON DELETE SET NULL, -- Se o carrinho for deletado, mantemos o rastro
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Opcional, caso não esteja logado
    zipcode VARCHAR(20) NOT NULL,
    provider VARCHAR(100) NOT NULL, -- e.g., 'correios', 'melhorenvio'
    service_name VARCHAR(100) NOT NULL, -- e.g., 'PAC', 'SEDEX'
    price_cents INTEGER NOT NULL,
    estimated_days INTEGER,
    payload_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb, -- Guarda o peso e dimensão usados no momento
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shipping_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert their own quotes"
    ON public.shipping_quotes
    FOR INSERT
    TO authenticated
    WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Store staff can read quotes"
    ON public.shipping_quotes
    FOR SELECT
    TO authenticated
    USING (public.is_store_staff(store_id));

-- 3. Tabela de Carrinhos Abandonados (Marketing e Conversão)
CREATE TABLE IF NOT EXISTS public.abandoned_carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'abandoned', -- 'abandoned', 'recovered', 'lost'
    recovery_attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    cart_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb, -- Guarda o conteúdo para o e-mail/mensagem
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (cart_id)
);

ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Store staff can manage abandoned carts"
    ON public.abandoned_carts
    FOR ALL
    TO authenticated
    USING (public.is_store_staff(store_id))
    WITH CHECK (public.is_store_staff(store_id));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_credentials_store ON public.integration_credentials(store_id);
CREATE INDEX IF NOT EXISTS idx_shipping_quotes_store ON public.shipping_quotes(store_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_store ON public.abandoned_carts(store_id);
