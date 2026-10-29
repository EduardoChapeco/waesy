-- ==============================================================================
-- Waesy Zero-Trust & RLS Multi-Tenant Hardening (DEC-374)
-- Erradica políticas excessivamente permissivas com USING (true) em módulos
-- de estúdio, eventos e projetos, estabelecendo isolamento estrito por tenant.
-- ==============================================================================

BEGIN;

-- 1. STUDIO PROJECTS & TEMPLATES (Isolamento por Usuário e Store)
ALTER TABLE public.studio_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "studio_projects_select_all" ON public.studio_projects;
DROP POLICY IF EXISTS "studio_projects_insert_all" ON public.studio_projects;
DROP POLICY IF EXISTS "studio_projects_update_all" ON public.studio_projects;
DROP POLICY IF EXISTS "studio_projects_delete_all" ON public.studio_projects;

-- Leitura: Proprietário do projeto ou membro da loja proprietária
CREATE POLICY "studio_projects_tenant_select" ON public.studio_projects
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    (store_id IS NOT NULL AND store_id IN (
      SELECT store_id FROM public.workspace_members WHERE profile_id = auth.uid()
    ))
  );

-- Inserção: Apenas para si mesmo ou para loja onde é colaborador ativo
CREATE POLICY "studio_projects_tenant_insert" ON public.studio_projects
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    (store_id IS NOT NULL AND store_id IN (
      SELECT store_id FROM public.workspace_members WHERE profile_id = auth.uid()
    ))
  );

-- Atualização: Apenas proprietário ou colaborador da loja
CREATE POLICY "studio_projects_tenant_update" ON public.studio_projects
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid() OR
    (store_id IS NOT NULL AND store_id IN (
      SELECT store_id FROM public.workspace_members WHERE profile_id = auth.uid()
    ))
  )
  WITH CHECK (
    user_id = auth.uid() OR
    (store_id IS NOT NULL AND store_id IN (
      SELECT store_id FROM public.workspace_members WHERE profile_id = auth.uid()
    ))
  );

-- Exclusão: Apenas proprietário ou gerente/dono da loja
CREATE POLICY "studio_projects_tenant_delete" ON public.studio_projects
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid() OR
    (store_id IS NOT NULL AND store_id IN (
      SELECT store_id FROM public.workspace_members 
      WHERE profile_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
    ))
  );

-- Templates: Visualização pública/autenticada, mas mutação estrita
DROP POLICY IF EXISTS "studio_templates_select_all" ON public.studio_templates;
DROP POLICY IF EXISTS "studio_templates_insert_admin" ON public.studio_templates;
DROP POLICY IF EXISTS "studio_templates_update_admin" ON public.studio_templates;
DROP POLICY IF EXISTS "studio_templates_delete_admin" ON public.studio_templates;

CREATE POLICY "studio_templates_public_select" ON public.studio_templates
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "studio_templates_admin_insert" ON public.studio_templates
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "studio_templates_admin_update" ON public.studio_templates
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "studio_templates_admin_delete" ON public.studio_templates
  FOR DELETE TO authenticated
  USING (public.is_platform_admin());

-- 2. EVENTOS ENTERPRISE (Isolamento por Evento e Tenant)
-- Remove políticas genéricas USING (true) para authenticated
DROP POLICY IF EXISTS "eventos_quadros_auth" ON public.eventos_quadros;
DROP POLICY IF EXISTS "eventos_quadros_colunas_auth" ON public.eventos_quadros_colunas;
DROP POLICY IF EXISTS "eventos_tarefas_auth" ON public.eventos_tarefas;
DROP POLICY IF EXISTS "eventos_orcamentos_auth" ON public.eventos_orcamentos;
DROP POLICY IF EXISTS "eventos_setores_auth" ON public.eventos_setores;
DROP POLICY IF EXISTS "eventos_parceiros_auth" ON public.eventos_parceiros;
DROP POLICY IF EXISTS "eventos_lineup_auth" ON public.eventos_lineup;
DROP POLICY IF EXISTS "eventos_documentos_auth" ON public.eventos_documentos;

-- Políticas com escopo no organizador do evento ou colaborador da loja
CREATE POLICY "eventos_quadros_tenant" ON public.eventos_quadros
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = eventos_quadros.evento_id
      AND (
        e.store_id IN (SELECT store_id FROM public.workspace_members WHERE profile_id = auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = eventos_quadros.evento_id
      AND (
        e.store_id IN (SELECT store_id FROM public.workspace_members WHERE profile_id = auth.uid())
      )
    )
  );

CREATE POLICY "eventos_quadros_colunas_tenant" ON public.eventos_quadros_colunas
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.eventos_quadros q
      JOIN public.events e ON e.id = q.evento_id
      WHERE q.id = eventos_quadros_colunas.quadro_id
      AND (
        e.store_id IN (SELECT store_id FROM public.workspace_members WHERE profile_id = auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.eventos_quadros q
      JOIN public.events e ON e.id = q.evento_id
      WHERE q.id = eventos_quadros_colunas.quadro_id
      AND (
        e.store_id IN (SELECT store_id FROM public.workspace_members WHERE profile_id = auth.uid())
      )
    )
  );

CREATE POLICY "eventos_tarefas_tenant" ON public.eventos_tarefas
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.eventos_quadros_colunas c
      JOIN public.eventos_quadros q ON q.id = c.quadro_id
      JOIN public.events e ON e.id = q.evento_id
      WHERE c.id = eventos_tarefas.coluna_id
      AND (
        e.store_id IN (SELECT store_id FROM public.workspace_members WHERE profile_id = auth.uid())
        OR eventos_tarefas.responsavel_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.eventos_quadros_colunas c
      JOIN public.eventos_quadros q ON q.id = c.quadro_id
      JOIN public.events e ON e.id = q.evento_id
      WHERE c.id = eventos_tarefas.coluna_id
      AND (
        e.store_id IN (SELECT store_id FROM public.workspace_members WHERE profile_id = auth.uid())
      )
    )
  );

CREATE POLICY "eventos_orcamentos_tenant" ON public.eventos_orcamentos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = eventos_orcamentos.evento_id
      AND (
        e.store_id IN (SELECT store_id FROM public.workspace_members WHERE profile_id = auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = eventos_orcamentos.evento_id
      AND (
        e.store_id IN (SELECT store_id FROM public.workspace_members WHERE profile_id = auth.uid())
      )
    )
  );

CREATE POLICY "eventos_setores_tenant" ON public.eventos_setores
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = eventos_setores.evento_id
      AND (
        e.store_id IN (SELECT store_id FROM public.workspace_members WHERE profile_id = auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = eventos_setores.evento_id
      AND (
        e.store_id IN (SELECT store_id FROM public.workspace_members WHERE profile_id = auth.uid())
      )
    )
  );

CREATE POLICY "eventos_parceiros_tenant" ON public.eventos_parceiros
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = eventos_parceiros.evento_id
      AND (
        e.store_id IN (SELECT store_id FROM public.workspace_members WHERE profile_id = auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = eventos_parceiros.evento_id
      AND (
        e.store_id IN (SELECT store_id FROM public.workspace_members WHERE profile_id = auth.uid())
      )
    )
  );

CREATE POLICY "eventos_lineup_tenant" ON public.eventos_lineup
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = eventos_lineup.evento_id
      AND (
        e.store_id IN (SELECT store_id FROM public.workspace_members WHERE profile_id = auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = eventos_lineup.evento_id
      AND (
        e.store_id IN (SELECT store_id FROM public.workspace_members WHERE profile_id = auth.uid())
      )
    )
  );

CREATE POLICY "eventos_documentos_tenant" ON public.eventos_documentos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = eventos_documentos.evento_id
      AND (
        e.store_id IN (SELECT store_id FROM public.workspace_members WHERE profile_id = auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = eventos_documentos.evento_id
      AND (
        e.store_id IN (SELECT store_id FROM public.workspace_members WHERE profile_id = auth.uid())
      )
    )
  );

COMMIT;
