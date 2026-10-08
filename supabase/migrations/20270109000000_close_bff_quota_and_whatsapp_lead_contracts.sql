-- Close two active BFF contracts whose schemas were absent from the local snapshot.
-- No placeholder columns: every column below is observed in the BFF payloads/queries.

CREATE TABLE IF NOT EXISTS public.user_daily_token_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quota_date DATE NOT NULL,
  used_tokens BIGINT NOT NULL DEFAULT 0 CHECK (used_tokens >= 0),
  last_reset_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, quota_date)
);

CREATE INDEX IF NOT EXISTS user_daily_token_quotas_user_date_idx
  ON public.user_daily_token_quotas (user_id, quota_date DESC);

ALTER TABLE public.user_daily_token_quotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_daily_token_quotas_owner_select ON public.user_daily_token_quotas;
CREATE POLICY user_daily_token_quotas_owner_select
  ON public.user_daily_token_quotas FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_daily_token_quotas_owner_insert ON public.user_daily_token_quotas;
CREATE POLICY user_daily_token_quotas_owner_insert
  ON public.user_daily_token_quotas FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_daily_token_quotas_owner_update ON public.user_daily_token_quotas;
CREATE POLICY user_daily_token_quotas_owner_update
  ON public.user_daily_token_quotas FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.whatsapp_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp_cloud',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'claimed', 'closed')),
  notes TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_leads_store_created_idx
  ON public.whatsapp_leads (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS whatsapp_leads_store_phone_idx
  ON public.whatsapp_leads (store_id, phone);
CREATE INDEX IF NOT EXISTS whatsapp_leads_store_status_idx
  ON public.whatsapp_leads (store_id, status);

ALTER TABLE public.whatsapp_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS whatsapp_leads_staff_select ON public.whatsapp_leads;
CREATE POLICY whatsapp_leads_staff_select
  ON public.whatsapp_leads FOR SELECT
  USING (
    store_id = ANY(public.auth_user_store_ids())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('platform_admin', 'master')
    )
  );

DROP POLICY IF EXISTS whatsapp_leads_staff_insert ON public.whatsapp_leads;
CREATE POLICY whatsapp_leads_staff_insert
  ON public.whatsapp_leads FOR INSERT
  WITH CHECK (
    store_id = ANY(public.auth_user_store_ids())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('platform_admin', 'master')
    )
  );

DROP POLICY IF EXISTS whatsapp_leads_staff_update ON public.whatsapp_leads;
CREATE POLICY whatsapp_leads_staff_update
  ON public.whatsapp_leads FOR UPDATE
  USING (
    store_id = ANY(public.auth_user_store_ids())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('platform_admin', 'master')
    )
  )
  WITH CHECK (
    store_id = ANY(public.auth_user_store_ids())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('platform_admin', 'master')
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.user_daily_token_quotas TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.whatsapp_leads TO authenticated, service_role;
