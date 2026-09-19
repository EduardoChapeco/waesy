-- ==============================================================================
-- MIGRAÇÃO: TERMOS DE CONFIDENCIALIDADE (NDA DIGITAL) & EXPANSÃO DE PROVEDORES
-- ==============================================================================

-- 1. Tabela de Assinaturas de NDA Digital para Classificados M&A e Empresas
CREATE TABLE IF NOT EXISTS public.classified_nda_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classified_id UUID NOT NULL REFERENCES public.classifieds(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    signer_name TEXT NOT NULL,
    signer_email TEXT,
    signer_document TEXT, -- CPF ou CNPJ formatado
    ip_address TEXT,
    user_agent TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
    signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_classified_user_nda UNIQUE (classified_id, user_id)
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_classified_nda_classified ON public.classified_nda_signatures(classified_id);
CREATE INDEX IF NOT EXISTS idx_classified_nda_user ON public.classified_nda_signatures(user_id);
CREATE INDEX IF NOT EXISTS idx_classified_nda_created ON public.classified_nda_signatures(created_at DESC);

-- RLS
ALTER TABLE public.classified_nda_signatures ENABLE ROW LEVEL SECURITY;

-- O assinante pode consultar seus próprios termos assinados
DROP POLICY IF EXISTS "Signers view own NDA signatures" ON public.classified_nda_signatures;
CREATE POLICY "Signers view own NDA signatures"
    ON public.classified_nda_signatures
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- O proprietário do anúncio pode consultar quem assinou o NDA do seu anúncio
DROP POLICY IF EXISTS "Ad owners view NDA signatures on their ads" ON public.classified_nda_signatures;
CREATE POLICY "Ad owners view NDA signatures on their ads"
    ON public.classified_nda_signatures
    FOR SELECT
    TO authenticated
    USING (
        classified_id IN (
            SELECT id FROM public.classifieds WHERE author_profile_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'platform_admin')
        )
    );

-- Usuários autenticados podem assinar NDA (inserir registro com seu próprio user_id)
DROP POLICY IF EXISTS "Authenticated users can sign NDA" ON public.classified_nda_signatures;
CREATE POLICY "Authenticated users can sign NDA"
    ON public.classified_nda_signatures
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- 2. Atualizar check constraint de tenant_ai_providers para permitir 'openrouter' se a tabela existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_ai_providers') THEN
        ALTER TABLE public.tenant_ai_providers DROP CONSTRAINT IF EXISTS tenant_ai_providers_provider_check;
        ALTER TABLE public.tenant_ai_providers ADD CONSTRAINT tenant_ai_providers_provider_check 
            CHECK (provider IN ('openai', 'anthropic', 'gemini', 'deepseek', 'groq', 'openrouter', 'custom'));
    END IF;
END $$;
