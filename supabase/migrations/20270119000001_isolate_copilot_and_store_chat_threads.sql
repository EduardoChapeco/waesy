-- ==============================================================================
-- MIGRAÇÃO: ISOLAMENTO ESTRITO ENTRE CONVERSAS CO-PILOT E SAC DA LOJA
-- Impede categoricamente o vazamento de conversas civis de IA para o painel de atendimento
-- ==============================================================================

-- 1. Desvincular retrospectivamente store_id de conversas de assistente ou copilot
UPDATE public.chat_threads
SET store_id = NULL
WHERE (
  thread_type IN ('ai_assistant', 'copilot', 'project')
  OR subject ILIKE '%Copilot%'
  OR subject ILIKE '%Assessor Local%'
) AND store_id IS NOT NULL;

-- 2. Garantir que índices de busca no chat da loja ignorem threads de IA
CREATE INDEX IF NOT EXISTS idx_chat_threads_store_filter 
ON public.chat_threads(store_id, status, updated_at DESC) 
WHERE store_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_threads_civil_ai 
ON public.chat_threads(customer_id, thread_type, updated_at DESC) 
WHERE store_id IS NULL;
