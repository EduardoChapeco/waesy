-- ==============================================================================
-- 20270311000000_ad_campaigns_tenant_rls_lockdown.sql
--
-- Governança: AGENTS.md B.4, B.8, B.31 & Mandato Zero-Trust
-- Finalidade: Isolamento estrito de tenant (RLS) em ad_campaigns e ad_events
-- ==============================================================================

DO $$
BEGIN
  -- 1. ad_campaigns
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ad_campaigns') THEN
    ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;

    -- Drop legacy policies if present
    DROP POLICY IF EXISTS "Stores can manage their campaigns" ON public.ad_campaigns;
    DROP POLICY IF EXISTS "ad_campaigns_store_isolation" ON public.ad_campaigns;
    DROP POLICY IF EXISTS "ad_campaigns_select_active_public" ON public.ad_campaigns;

    -- Store members can manage campaigns
    CREATE POLICY "ad_campaigns_store_isolation" ON public.ad_campaigns
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.store_members sm
          WHERE sm.store_id = ad_campaigns.store_id AND sm.profile_id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.store_id = ad_campaigns.store_id
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.store_members sm
          WHERE sm.store_id = ad_campaigns.store_id AND sm.profile_id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.store_id = ad_campaigns.store_id
        )
      );

    -- Public can view active campaigns for rendering banners & boosts
    CREATE POLICY "ad_campaigns_select_active_public" ON public.ad_campaigns
      FOR SELECT
      TO public
      USING (
        status = 'active'
        AND (starts_at IS NULL OR starts_at <= now())
        AND (ends_at IS NULL OR ends_at >= now())
      );
  END IF;

  -- 2. ad_events
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ad_events') THEN
    ALTER TABLE public.ad_events ENABLE ROW LEVEL SECURITY;

    -- Drop legacy policies if present
    DROP POLICY IF EXISTS "Stores can view their ad events" ON public.ad_events;
    DROP POLICY IF EXISTS "ad_events_store_isolation" ON public.ad_events;
    DROP POLICY IF EXISTS "ad_events_insert_public" ON public.ad_events;

    -- Store members can view ad events for their campaigns
    CREATE POLICY "ad_events_store_isolation" ON public.ad_events
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.ad_campaigns ac
          JOIN public.store_members sm ON sm.store_id = ac.store_id
          WHERE ac.id = ad_events.campaign_id AND sm.profile_id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM public.ad_campaigns ac
          JOIN public.profiles p ON p.store_id = ac.store_id
          WHERE ac.id = ad_events.campaign_id AND p.id = auth.uid()
        )
      );

    -- Public / Clients can log view and click events for active campaigns
    CREATE POLICY "ad_events_insert_public" ON public.ad_events
      FOR INSERT
      TO public
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.ad_campaigns ac
          WHERE ac.id = ad_events.campaign_id AND ac.status = 'active'
        )
      );
  END IF;
END $$;
