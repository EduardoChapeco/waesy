-- Drafts reutilizáveis do Waesy Studio; acesso somente por funções server-side autenticadas.
CREATE TABLE IF NOT EXISTS public.studio_template_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  template_id text NOT NULL CHECK (char_length(template_id) BETWEEN 2 AND 96),
  template_version text NOT NULL CHECK (template_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  manifest jsonb NOT NULL CHECK (jsonb_typeof(manifest) = 'object'),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT studio_template_library_store_template_version_uidx
    UNIQUE (store_id, template_id, template_version)
);

CREATE INDEX IF NOT EXISTS studio_template_library_store_updated_idx
  ON public.studio_template_library (store_id, updated_at DESC);

ALTER TABLE public.studio_template_library ENABLE ROW LEVEL SECURITY;

-- Clientes browser não acessam a tabela diretamente. O backend valida o usuário e o tenant.
REVOKE ALL ON TABLE public.studio_template_library FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.studio_template_library TO service_role;
