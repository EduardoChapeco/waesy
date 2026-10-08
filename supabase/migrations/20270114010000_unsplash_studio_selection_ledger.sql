-- Ledger server-authoritative: o cliente não pode forjar que chamou o endpoint de tracking.
CREATE TABLE IF NOT EXISTS public.unsplash_studio_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  photo_id text NOT NULL CHECK (char_length(photo_id) BETWEEN 1 AND 100),
  usage_slot text NOT NULL CHECK (char_length(usage_slot) BETWEEN 1 AND 120),
  image_url text NOT NULL CHECK (image_url LIKE 'https://images.unsplash.com/%'),
  photo_page_url text NOT NULL CHECK (photo_page_url LIKE 'https://unsplash.com/%'),
  creator_name text NOT NULL CHECK (char_length(creator_name) BETWEEN 1 AND 240),
  creator_profile_url text NOT NULL CHECK (creator_profile_url LIKE 'https://unsplash.com/%'),
  license_id text NOT NULL CHECK (license_id = 'unsplash-license'),
  license_url text NOT NULL CHECK (license_url = 'https://unsplash.com/license'),
  selected_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  tracked_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unsplash_studio_selections_store_photo_slot_uidx UNIQUE (store_id, photo_id, usage_slot)
);

CREATE INDEX IF NOT EXISTS unsplash_studio_selections_store_photo_idx
  ON public.unsplash_studio_selections (store_id, photo_id);

ALTER TABLE public.unsplash_studio_selections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.unsplash_studio_selections FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.unsplash_studio_selections TO service_role;
