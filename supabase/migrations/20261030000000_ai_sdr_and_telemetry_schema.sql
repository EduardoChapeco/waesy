-- Migration: AI SDR & Telemetry Schema
-- Adds support for AI agents on classifieds and stores, and creates telemetry tables for chat sessions.

BEGIN;

-- 1. Add AI Instructions to Classifieds
ALTER TABLE public.classifieds
ADD COLUMN IF NOT EXISTS ai_instructions TEXT,
ADD COLUMN IF NOT EXISTS ai_agent_enabled BOOLEAN DEFAULT false;

-- 2. Add AI Knowledge Base to Stores (Workspaces)
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS ai_knowledge_base TEXT,
ADD COLUMN IF NOT EXISTS ai_sales_agent_enabled BOOLEAN DEFAULT false;

-- 3. Create SDR Chat Sessions Table for Telemetry (SimLabs)
CREATE TABLE IF NOT EXISTS public.sdr_chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classified_id UUID REFERENCES public.classifieds(id) ON DELETE SET NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    anonymous_session_id TEXT, -- For tracking non-logged in users
    intent_classification TEXT CHECK (intent_classification IN ('curious', 'warm', 'ready_to_buy', 'support', 'complaint')),
    summary TEXT,
    message_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_sdr_chat_sessions_classified_id ON public.sdr_chat_sessions(classified_id);
CREATE INDEX IF NOT EXISTS idx_sdr_chat_sessions_store_id ON public.sdr_chat_sessions(store_id);
CREATE INDEX IF NOT EXISTS idx_sdr_chat_sessions_user_id ON public.sdr_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sdr_chat_sessions_intent ON public.sdr_chat_sessions(intent_classification);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trg_sdr_chat_sessions_updated_at ON public.sdr_chat_sessions;
CREATE TRIGGER trg_sdr_chat_sessions_updated_at
BEFORE UPDATE ON public.sdr_chat_sessions
FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- RLS Policies for SDR Chat Sessions
ALTER TABLE public.sdr_chat_sessions ENABLE ROW LEVEL SECURITY;

-- Admins / Store Owners can view chats for their store or classifieds
CREATE POLICY "Store owners can view chat sessions"
ON public.sdr_chat_sessions
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.store_members sm
        WHERE sm.store_id = sdr_chat_sessions.store_id
        AND sm.profile_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.classifieds c
        WHERE c.id = sdr_chat_sessions.classified_id
        AND c.author_profile_id = auth.uid()
    )
);

-- Users can view their own chat sessions
CREATE POLICY "Users can view their own chat sessions"
ON public.sdr_chat_sessions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow service role / BFF to insert and update chat sessions
CREATE POLICY "Service role can insert chat sessions"
ON public.sdr_chat_sessions
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update chat sessions"
ON public.sdr_chat_sessions
FOR UPDATE
TO service_role
USING (true);

COMMIT;
