-- Migration: 20261107000000_eventos_credenciais_assimilation.sql
-- Description: Strict porting of Event Credentials (CrachÃ¡s com QR Code) from persona-nexus to Waesy
-- Attached to public.events and public.stores without duplicating entities.

CREATE TABLE IF NOT EXISTS public.eventos_credenciais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    
    -- Credential Info
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('equipe', 'terceiro', 'patrocinador', 'imprensa', 'autoridade', 'vip', 'staff')),
    nome VARCHAR(255) NOT NULL,
    documento VARCHAR(50),
    email VARCHAR(255),
    telefone VARCHAR(20),
    
    -- Badge Info
    cargo VARCHAR(100),
    empresa_origem VARCHAR(255),
    foto_url TEXT,
    
    -- QR Code
    qr_code VARCHAR(100) UNIQUE NOT NULL,
    qr_personalizado_url TEXT,
    
    -- Access Control
    nivel_acesso VARCHAR(50) DEFAULT 'basico' CHECK (nivel_acesso IN ('basico', 'restrito', 'vip', 'total')),
    areas_acesso JSONB DEFAULT '[]'::jsonb,
    setores_acesso JSONB DEFAULT '[]'::jsonb,
    
    -- Validity
    valido_de TIMESTAMPTZ,
    valido_ate TIMESTAMPTZ,
    
    -- Check-in
    checkin_realizado BOOLEAN DEFAULT false,
    checkin_em TIMESTAMPTZ,
    checkin_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Status
    status VARCHAR(50) DEFAULT 'ativo' CHECK (status IN ('ativo', 'suspenso', 'revogado')),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eventos_credenciais_evento ON public.eventos_credenciais(evento_id);
CREATE INDEX IF NOT EXISTS idx_eventos_credenciais_store ON public.eventos_credenciais(store_id);
CREATE INDEX IF NOT EXISTS idx_eventos_credenciais_qr ON public.eventos_credenciais(qr_code);
CREATE INDEX IF NOT EXISTS idx_eventos_credenciais_tipo ON public.eventos_credenciais(tipo);

ALTER TABLE public.eventos_credenciais ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "eventos_credenciais_store_auth" ON public.eventos_credenciais;
  DROP POLICY IF EXISTS "eventos_credenciais_store_auth" ON public.eventos_credenciais;
CREATE POLICY "eventos_credenciais_store_auth" ON public.eventos_credenciais
    FOR ALL TO authenticated
    USING (
      store_id IN (
        SELECT store_id FROM public.workspace_members WHERE profile_id = auth.uid()
      )
    )
    WITH CHECK (
      store_id IN (
        SELECT store_id FROM public.workspace_members WHERE profile_id = auth.uid()
      )
    );
END $$;

