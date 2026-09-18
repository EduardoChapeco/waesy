-- Módulo: Motor de Onboarding (Admin Master Editável)

-- 1. Tabela central de passos (steps) do onboarding
CREATE TABLE IF NOT EXISTS public.system_onboarding_steps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    media_url TEXT,
    media_type TEXT DEFAULT 'image', -- image ou video
    step_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.system_onboarding_steps ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
CREATE POLICY "Leitura pública de steps ativos"
    ON public.system_onboarding_steps FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admin total sobre onboarding steps"
    ON public.system_onboarding_steps FOR ALL
    USING (
      (auth.jwt() ->> 'role'::text) IN ('master', 'superadmin', 'platform_admin')
    )
    WITH CHECK (
      (auth.jwt() ->> 'role'::text) IN ('master', 'superadmin', 'platform_admin')
    );

-- 2. Coluna no profile do usuário para rastrear se ele já viu
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ NULL;

-- 3. Função RPC para o usuário marcar que concluiu o onboarding
CREATE OR REPLACE FUNCTION public.complete_user_onboarding()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.profiles
    SET onboarding_completed_at = now(),
        updated_at = now()
    WHERE id = auth.uid() 
      AND onboarding_completed_at IS NULL;
END;
$$;
