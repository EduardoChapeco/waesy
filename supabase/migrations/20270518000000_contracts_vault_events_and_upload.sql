-- ==============================================================================
-- 20270518000000_contracts_vault_events_and_upload.sql
-- Waesy Platform — Cofre de Pastas, Metadados de Upload (PDF/DOCX/MD),
-- Lembretes de Envelope, Cancelamento Auditado & Rubrica Salva de Colaboradores.
-- ==============================================================================

BEGIN;

-- 1. Metadados do arquivo original anexado ao contrato (PDF / DOCX / MD / TXT)
ALTER TABLE public.contract_versions
  ADD COLUMN IF NOT EXISTS source_file_name TEXT,
  ADD COLUMN IF NOT EXISTS source_file_mime TEXT;

-- 2. Rastreio de cobrancas/reenvios nos envelopes de assinatura
ALTER TABLE public.signature_envelopes
  ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_count INT NOT NULL DEFAULT 0;

-- 3. Metadados de cancelamento / anulacao formal do contrato
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS void_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- 4. Rubrica salva no perfil para colaboradores e usuarios recorrentes
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS saved_initials_url TEXT;

-- 5. Indice de navegacao rapida no Cofre de Pastas multi-tenant
CREATE INDEX IF NOT EXISTS idx_folders_store_parent
  ON public.folders(store_id, parent_id);

-- 6. Endurecimento multi-tenant via workspace_members em contract_audit_chain
ALTER TABLE public.contract_audit_chain ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contract_audit_chain_staff_all" ON public.contract_audit_chain;
CREATE POLICY "contract_audit_chain_staff_all"
  ON public.contract_audit_chain
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.workspace_members wm
      WHERE wm.store_id = contract_audit_chain.store_id
        AND wm.profile_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('admin', 'superadmin', 'platform_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workspace_members wm
      WHERE wm.store_id = contract_audit_chain.store_id
        AND wm.profile_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('admin', 'superadmin', 'platform_admin')
    )
  );

-- 7. Limite de 20 MB no bucket privado 'legal-documents' para PDFs, DOCX e MD
UPDATE storage.buckets
SET
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = NULL
WHERE id = 'legal-documents';

COMMIT;
