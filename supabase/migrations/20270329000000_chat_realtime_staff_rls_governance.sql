-- Migração: Aperfeiçoamento de RLS e Governança de Realtime para Atendimento & SAC
-- Data: 2026-11-12
-- Invariantes:
-- 1. Supervisores (owner, admin, manager, platform_admin, master) acessam 100% das conversas e mensagens da loja.
-- 2. Colaboradores comuns (seller, agent, support, operator) acessam conversas não confidenciais da sua loja, viabilizando Realtime <50ms e evitando dropouts de tela vazia.
-- 3. Conversas confidenciais (hidden_from_staff = true) são estritamente restritas a supervisores.
-- 4. Exclusão direta permanece estritamente bloqueada (deny) em chat_messages e chat_threads para clientes e equipe comum.

-- 1. Atualizar política de SELECT em chat_threads
DROP POLICY IF EXISTS "chat_threads_wave2_select" ON chat_threads;

CREATE POLICY "chat_threads_wave2_select" ON chat_threads
FOR SELECT
TO authenticated
USING (
  (customer_id = auth.uid()) OR
  (EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.store_id = chat_threads.store_id
      AND wm.profile_id = auth.uid()
      AND (
        (wm.role = ANY (ARRAY['owner', 'admin', 'manager', 'platform_admin', 'master']))
        OR (
          COALESCE(chat_threads.metadata->>'hidden_from_staff', 'false') != 'true'
          AND (
            chat_threads.assigned_to_profile_id IS NULL
            OR chat_threads.assigned_to_profile_id = auth.uid()
          )
        )
      )
  ))
);

-- 2. Atualizar política de SELECT em chat_messages
DROP POLICY IF EXISTS "chat_messages_wave2_select" ON chat_messages;

CREATE POLICY "chat_messages_wave2_select" ON chat_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_threads t
    WHERE t.id = chat_messages.thread_id
      AND (
        (t.customer_id = auth.uid()) OR
        (EXISTS (
          SELECT 1 FROM workspace_members wm
          WHERE wm.store_id = t.store_id
            AND wm.profile_id = auth.uid()
            AND (
              (wm.role = ANY (ARRAY['owner', 'admin', 'manager', 'platform_admin', 'master']))
              OR (
                COALESCE(t.metadata->>'hidden_from_staff', 'false') != 'true'
                AND (
                  t.assigned_to_profile_id IS NULL
                  OR t.assigned_to_profile_id = auth.uid()
                )
              )
            )
        ))
      )
  )
);
