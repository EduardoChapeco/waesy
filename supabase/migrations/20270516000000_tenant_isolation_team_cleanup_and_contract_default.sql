-- 20270516000000_tenant_isolation_team_cleanup_and_contract_default.sql
-- 1. Altera o valor default da coluna contract_type em workspace_members de 'partner_law' para 'clt'.
-- 2. Normaliza vínculos existentes de lojas não pertencentes ao setor de Beleza/Barbearia/Estética
--    que herdaram o default 'partner_law' sem acordo ativo em workspace_partner_agreements.
-- 3. Remove os vínculos legados/teste ('teste@jah.com' e 'admin@jah.com') da loja Foodman,
--    preservando estritamente 'Eduardo Antônio Ramos' como proprietário único quando presente.

ALTER TABLE public.workspace_members
  ALTER COLUMN contract_type SET DEFAULT 'clt';

UPDATE public.workspace_members wm
SET contract_type = 'clt'
FROM public.stores s
WHERE wm.store_id = s.id
  AND wm.contract_type = 'partner_law'
  AND LOWER(COALESCE(s.primary_niche_id, s.settings->>'niche', s.settings->>'segment', s.settings->>'type', '')) NOT IN (
    'beauty',
    'beauty_salon',
    'barbershop',
    'barbearia',
    'aesthetics',
    'aesthetics_clinic',
    'salao',
    'estetica',
    'wellness'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.workspace_partner_agreements wpa
    WHERE wpa.store_id = wm.store_id
      AND wpa.is_partner_law = true
  );

DELETE FROM public.workspace_members
WHERE store_id = '32233049-07c6-49bf-a053-989824fef385'::uuid
  AND profile_id IN (
    '9aceecd7-4100-4a52-95ee-e6f4b549b9ac'::uuid,
    '7b55d8f4-0992-4def-85ae-e79add99bc6b'::uuid
  )
  AND EXISTS (
    SELECT 1
    FROM public.workspace_members keep_owner
    WHERE keep_owner.store_id = '32233049-07c6-49bf-a053-989824fef385'::uuid
      AND keep_owner.profile_id = '2ea9f0aa-8b04-4086-9e1d-e23105560302'::uuid
      AND keep_owner.role = 'owner'
  );
