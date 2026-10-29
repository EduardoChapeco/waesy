-- ============================================================================
-- Migration: 20261027140000_threads_community_system.sql
-- Description: Sistema de Comunidades e Grupos Estilo Threads com Capa Editável,
--              Presets de Gradiente, Membros, Permissões e Post Templates.
-- ============================================================================

BEGIN;

-- 1. ENUM para tipos de comunidade
DO $$ BEGIN
    CREATE TYPE public.community_type AS ENUM (
        'general',  -- Discussões gerais estilo Threads
        'sales',    -- Vendas locais / Classificados P2P
        'news',     -- Notícias e jornalismo comunitário
        'videos',   -- Vídeos e mídias visuais
        'events',   -- Eventos e encontros presenciais/online
        'jobs'      -- Empregos e oportunidades locais
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. ENUM para modo de capa da comunidade
DO $$ BEGIN
    CREATE TYPE public.community_cover_mode AS ENUM (
        'gradient', -- Mesh gradient dinâmico
        'image'     -- Upload de imagem com overlay
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Tabela public.communities
CREATE TABLE IF NOT EXISTS public.communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE, -- ex: 'design-threads', 'classificados-smo'
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    
    community_type public.community_type NOT NULL DEFAULT 'general',
    cover_mode public.community_cover_mode NOT NULL DEFAULT 'gradient',
    cover_gradient_preset TEXT NOT NULL DEFAULT 'blue-lime', -- 'blue-lime' | 'pink-cyan' | 'sunset' | 'cyberpunk' | 'obsidian'
    cover_image_url TEXT NULL,
    avatar_url TEXT NULL,
    
    privacy TEXT NOT NULL DEFAULT 'public' CHECK (privacy IN ('public', 'private', 'secret')),
    rules JSONB DEFAULT '[]'::jsonb,
    
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    member_count INT NOT NULL DEFAULT 1,
    online_count INT NOT NULL DEFAULT 1,
    
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices essenciais para consultas de comunidade
CREATE INDEX IF NOT EXISTS idx_communities_slug ON public.communities(slug);
CREATE INDEX IF NOT EXISTS idx_communities_type ON public.communities(community_type);
CREATE INDEX IF NOT EXISTS idx_communities_owner ON public.communities(owner_id);
CREATE INDEX IF NOT EXISTS idx_communities_status ON public.communities(status);

-- 4. Tabela public.community_members
CREATE TABLE IF NOT EXISTS public.community_members (
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'moderator', 'member')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'banned')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (community_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_community_members_profile ON public.community_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_community_members_role ON public.community_members(community_id, role);

-- 5. Evolução da tabela public.posts para suporte a comunidade e atributos de template
ALTER TABLE public.posts
    ADD COLUMN IF NOT EXISTS community_id UUID NULL REFERENCES public.communities(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS post_attributes JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_posts_community_created ON public.posts(community_id, created_at DESC) WHERE status = 'active';

-- 6. Habilitar RLS em communities e community_members
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

-- 7. Políticas RLS para communities
DO $$ BEGIN
    DROP POLICY IF EXISTS "Public can view active communities" ON public.communities;
    DROP POLICY IF EXISTS "Authenticated users can create communities" ON public.communities;
    DROP POLICY IF EXISTS "Owners and moderators can update community" ON public.communities;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "Public can view active communities" ON public.communities
    FOR SELECT USING (status = 'active' OR auth.uid() = owner_id);

CREATE POLICY "Authenticated users can create communities" ON public.communities
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners and moderators can update community" ON public.communities
    FOR UPDATE USING (
        auth.uid() = owner_id OR
        EXISTS (
            SELECT 1 FROM public.community_members cm
            WHERE cm.community_id = communities.id
              AND cm.profile_id = auth.uid()
              AND cm.role IN ('owner', 'moderator')
        )
    );

-- 8. Políticas RLS para community_members
DO $$ BEGIN
    DROP POLICY IF EXISTS "Public can view community members" ON public.community_members;
    DROP POLICY IF EXISTS "Users can join active communities" ON public.community_members;
    DROP POLICY IF EXISTS "Users can leave communities" ON public.community_members;
    DROP POLICY IF EXISTS "Moderators can manage members" ON public.community_members;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "Public can view community members" ON public.community_members
    FOR SELECT USING (true);

CREATE POLICY "Users can join active communities" ON public.community_members
    FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can leave communities" ON public.community_members
    FOR DELETE USING (auth.uid() = profile_id);

CREATE POLICY "Moderators can manage members" ON public.community_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.communities c
            WHERE c.id = community_members.community_id
              AND c.owner_id = auth.uid()
        )
    );

-- 9. Trigger para atualizar updated_at em communities
CREATE TRIGGER set_updated_at_communities
    BEFORE UPDATE ON public.communities
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

COMMIT;
