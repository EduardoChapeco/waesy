-- Onda 2: envelope encryption por conversa e isolamento estrito por atendente.
-- Supervisores administram a loja; atendentes só leem/escrevem threads atribuídas ao próprio perfil.

ALTER TABLE public.chat_conversation_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversation_keys FORCE ROW LEVEL SECURITY;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_threads FORCE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversation_keys ADD COLUMN IF NOT EXISTS retired_at TIMESTAMPTZ;
ALTER TABLE public.chat_conversation_keys DROP CONSTRAINT IF EXISTS chat_conversation_keys_thread_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_chat_conversation_keys_thread_version ON public.chat_conversation_keys(thread_id, key_version);
CREATE INDEX IF NOT EXISTS idx_chat_conversation_keys_active ON public.chat_conversation_keys(thread_id, key_version DESC) WHERE retired_at IS NULL;

-- Remove policies legadas permissivas conhecidas antes de recriar o conjunto canônico.
DROP POLICY IF EXISTS "chat_threads_customer_select" ON public.chat_threads;
DROP POLICY IF EXISTS "chat_threads_staff_all" ON public.chat_threads;
DROP POLICY IF EXISTS chat_threads_customer_select ON public.chat_threads;
DROP POLICY IF EXISTS chat_threads_staff_all ON public.chat_threads;
DROP POLICY IF EXISTS "chat_messages_customer_select" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_staff_all" ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_customer_select ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_staff_all ON public.chat_messages;
DROP POLICY IF EXISTS chat_threads_strict_staff_select ON public.chat_threads;
DROP POLICY IF EXISTS chat_threads_strict_staff_modify ON public.chat_threads;
DROP POLICY IF EXISTS chat_threads_strict_staff_insert ON public.chat_threads;
DROP POLICY IF EXISTS chat_threads_strict_customer ON public.chat_threads;
DROP POLICY IF EXISTS chat_messages_strict_staff_select ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_strict_staff_insert ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_strict_staff_update ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_strict_customer ON public.chat_messages;
DROP POLICY IF EXISTS chat_threads_wave2_select ON public.chat_threads;
DROP POLICY IF EXISTS chat_threads_wave2_update ON public.chat_threads;
DROP POLICY IF EXISTS chat_threads_wave2_insert ON public.chat_threads;
DROP POLICY IF EXISTS chat_threads_wave2_delete_deny ON public.chat_threads;
DROP POLICY IF EXISTS chat_messages_wave2_select ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_wave2_insert ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_wave2_update ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_wave2_delete_deny ON public.chat_messages;

CREATE POLICY chat_threads_wave2_select ON public.chat_threads FOR SELECT TO authenticated USING (
  customer_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.store_id = chat_threads.store_id AND wm.profile_id = auth.uid()
      AND (wm.role IN ('owner','admin','manager','platform_admin','master') OR chat_threads.assigned_to_profile_id = auth.uid())
  )
);
CREATE POLICY chat_threads_wave2_update ON public.chat_threads FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.store_id = chat_threads.store_id AND wm.profile_id = auth.uid() AND wm.role IN ('owner','admin','manager','platform_admin','master'))
) WITH CHECK (store_id IS NOT NULL);
CREATE POLICY chat_threads_wave2_insert ON public.chat_threads FOR INSERT TO authenticated WITH CHECK (
  (customer_id = auth.uid() AND store_id IS NOT NULL)
  OR EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.store_id = chat_threads.store_id AND wm.profile_id = auth.uid() AND wm.role IN ('owner','admin','manager','platform_admin','master'))
);
CREATE POLICY chat_threads_wave2_delete_deny ON public.chat_threads FOR DELETE TO anon, authenticated USING (false);

CREATE POLICY chat_messages_wave2_select ON public.chat_messages FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.chat_threads t
    WHERE t.id = chat_messages.thread_id AND (
      t.customer_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.store_id = t.store_id AND wm.profile_id = auth.uid()
          AND (wm.role IN ('owner','admin','manager','platform_admin','master') OR t.assigned_to_profile_id = auth.uid())
      )
    )
  )
);
CREATE POLICY chat_messages_wave2_insert ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (
  (sender_id IS NULL OR sender_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.chat_threads t
    WHERE t.id = chat_messages.thread_id AND (
      t.customer_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.store_id = t.store_id AND wm.profile_id = auth.uid()
          AND (wm.role IN ('owner','admin','manager','platform_admin','master') OR t.assigned_to_profile_id = auth.uid())
      )
    )
  )
);
CREATE POLICY chat_messages_wave2_update ON public.chat_messages FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.chat_threads t JOIN public.workspace_members wm ON wm.store_id = t.store_id
    WHERE t.id = chat_messages.thread_id AND wm.profile_id = auth.uid()
      AND (wm.role IN ('owner','admin','manager','platform_admin','master') OR t.assigned_to_profile_id = auth.uid())
  )
) WITH CHECK (true);
CREATE POLICY chat_messages_wave2_delete_deny ON public.chat_messages FOR DELETE TO anon, authenticated USING (false);

-- A chave nunca é legível pelo cliente; somente server_role/worker pode desenvelopar a DEK.
DROP POLICY IF EXISTS chat_conversation_keys_wave2_deny ON public.chat_conversation_keys;
CREATE POLICY chat_conversation_keys_wave2_deny ON public.chat_conversation_keys FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_chat_threads_wave2_assignee_status ON public.chat_threads(store_id, assigned_to_profile_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_wave2_thread_created ON public.chat_messages(thread_id, created_at ASC);

COMMENT ON TABLE public.chat_conversation_keys IS 'DEK aleatória por conversa envelopada pelo cofre; nunca exposta ao cliente ou atendente.';
COMMENT ON POLICY chat_threads_wave2_select ON public.chat_threads IS 'Atendente só acessa conversa atribuída; fila não atribuída fica restrita a supervisores.';
