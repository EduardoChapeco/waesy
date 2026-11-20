-- 20260903150000_fix_sponsor_placements_rls.sql
-- Auditoria de RLS: corrigir política aberta em sponsor_placements
-- A política sponsor_placements_staff_all com FOR ALL USING (true)
-- permitia que qualquer usuário autenticado alterasse/deletasse placements de anúncios.

ALTER TABLE public.sponsor_placements ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "sponsor_placements_staff_all" ON public.sponsor_placements;
DROP POLICY IF EXISTS "sponsor_placements_staff_write" ON public.sponsor_placements;
DROP POLICY IF EXISTS "sponsor_placements_platform_admin_global" ON public.sponsor_placements;

-- Limite a staff_all para verificação correta de is_store_staff
CREATE POLICY "sponsor_placements_staff_write" ON public.sponsor_placements
  FOR ALL USING (public.is_store_staff(store_id));

-- Placements sem store_id (globais) só alterados por platform_admin/master
CREATE POLICY "sponsor_placements_platform_admin_global" ON public.sponsor_placements
  FOR ALL USING (
    store_id IS NULL AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('platform_admin', 'master')
    )
  );
