-- =============================================================================
-- Migration: 20270317000000_cms_unified_pages_menus_styling_and_timers.sql
-- Purpose: Unify Admin Master CMS Page-by-Page, Modular Sub-Editors, Custom
--          Buttons, Styling (bg/text/gradient/shadow), Timers, Geotargeting,
--          and Omni Builder Document Bridge (AGENTS.md B.20, B.29, B.32, B.51)
-- =============================================================================

BEGIN;

-- 1. Convert marketplace_sections.type from restrictive ENUM to flexible TEXT
-- so all 18+ section types (bento_grid, custom_buttons_rail, banner_single_21_9,
-- promo_strip_timer, etc.) persist without enum violation.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'marketplace_sections'
      AND column_name = 'type'
      AND data_type = 'USER-DEFINED'
  ) THEN
    ALTER TABLE public.marketplace_sections
      ALTER COLUMN type TYPE TEXT USING type::TEXT;
  END IF;
END $$;

-- 2. Ensure marketplace_sections has all scheduling, geotargeting, badge & config columns
ALTER TABLE public.marketplace_sections
  ADD COLUMN IF NOT EXISTS badge_tag TEXT,
  ADD COLUMN IF NOT EXISTS city_filter TEXT,
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_archive_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 3. Ensure marketplace_surfaces supports Omni Builder document link & surface config
ALTER TABLE public.marketplace_surfaces
  ADD COLUMN IF NOT EXISTS experience_doc_id UUID,
  ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 4. Ensure home_page_sections has scheduling, geotargeting & metadata columns
ALTER TABLE public.home_page_sections
  ADD COLUMN IF NOT EXISTS city_filter TEXT,
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_archive_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 5. Ensure home_section_items has styling, geotargeting, scheduling & metadata columns
ALTER TABLE public.home_section_items
  ALTER COLUMN image_url DROP NOT NULL;

ALTER TABLE public.home_section_items
  ADD COLUMN IF NOT EXISTS subtitle TEXT,
  ADD COLUMN IF NOT EXISTS badge_text TEXT,
  ADD COLUMN IF NOT EXISTS icon_name TEXT,
  ADD COLUMN IF NOT EXISTS bg_color TEXT,
  ADD COLUMN IF NOT EXISTS text_color TEXT,
  ADD COLUMN IF NOT EXISTS button_shape TEXT DEFAULT 'squircle',
  ADD COLUMN IF NOT EXISTS city_filter TEXT,
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_archive_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMIT;
