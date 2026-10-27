-- ============================================================================
-- WAESY CRM: ATENDIMENTO OMNICHANNEL, WHATICKET/CHATWOOT PARITY & TYPEBOT ENGINE
-- Tabelas de Departamentos/Filas, Respostas Rápidas, Transferências com Nota e Tags
-- ============================================================================

-- 1. EXTENSÃO DA TABELA CHAT_THREADS COM TAGS E FILAS
ALTER TABLE public.chat_threads ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.chat_threads ADD COLUMN IF NOT EXISTS queue_id UUID;
ALTER TABLE public.chat_threads ADD COLUMN IF NOT EXISTS unread_count INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_chat_threads_tags ON public.chat_threads USING gin (tags);

-- 2. TABELA DE DEPARTAMENTOS / FILAS DE ATENDIMENTO (WHATICKET / CHATWOOT PARITY)
CREATE TABLE IF NOT EXISTS public.chat_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3b82f6',
    sla_minutes INT DEFAULT 15,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_chat_departments_store_slug UNIQUE (store_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_chat_departments_store ON public.chat_departments(store_id, is_active);

-- 3. TABELA DE RESPOSTAS RÁPIDAS / MACROS COM ATALHO "/" (WHATICKET PARITY)
CREATE TABLE IF NOT EXISTS public.chat_quick_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    shortcut TEXT NOT NULL, -- e.g. "pix", "horario", "ola", "cardapio"
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    media_url TEXT,
    category TEXT DEFAULT 'geral',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_chat_quick_replies_store_shortcut UNIQUE (store_id, shortcut)
);

CREATE INDEX IF NOT EXISTS idx_chat_quick_replies_store ON public.chat_quick_replies(store_id);

-- 4. TABELA DE LOG AUDITÁVEL DE TRANSFERÊNCIAS DE TICKET (CHATWOOT PARITY)
CREATE TABLE IF NOT EXISTS public.chat_thread_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    transferred_by_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    from_department TEXT,
    to_department TEXT NOT NULL,
    from_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    to_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    context_notes TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_transfers_thread ON public.chat_thread_transfers(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_transfers_store ON public.chat_thread_transfers(store_id, created_at);

-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (DENY-BY-DEFAULT)
-- ----------------------------------------------------------------------------

ALTER TABLE public.chat_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_quick_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_thread_transfers ENABLE ROW LEVEL SECURITY;

-- Departamentos / Filas
CREATE POLICY "chat_departments_staff_select" ON public.chat_departments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.store_id = chat_departments.store_id AND wm.profile_id = auth.uid()
        )
    );

CREATE POLICY "chat_departments_staff_write" ON public.chat_departments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.store_id = chat_departments.store_id AND wm.profile_id = auth.uid()
        )
    );

-- Respostas Rápidas
CREATE POLICY "chat_quick_replies_staff_select" ON public.chat_quick_replies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.store_id = chat_quick_replies.store_id AND wm.profile_id = auth.uid()
        )
    );

CREATE POLICY "chat_quick_replies_staff_write" ON public.chat_quick_replies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.store_id = chat_quick_replies.store_id AND wm.profile_id = auth.uid()
        )
    );

-- Transferências de Ticket
CREATE POLICY "chat_thread_transfers_staff_select" ON public.chat_thread_transfers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.store_id = chat_thread_transfers.store_id AND wm.profile_id = auth.uid()
        )
    );

CREATE POLICY "chat_thread_transfers_staff_insert" ON public.chat_thread_transfers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.store_id = chat_thread_transfers.store_id AND wm.profile_id = auth.uid()
        )
    );
