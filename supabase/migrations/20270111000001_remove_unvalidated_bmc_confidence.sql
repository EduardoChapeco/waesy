-- Remove scores de confiança exibidos como se fossem calibrados, embora fossem
-- defaults de aplicação/modelo. A ausência de score é preferível a certeza fictícia.
ALTER TABLE public.brand_dna_profiles
  ALTER COLUMN confidence DROP DEFAULT;

UPDATE public.brand_dna_profiles
SET confidence = NULL
WHERE confidence IS NOT NULL;

ALTER TABLE public.store_business_model_canvas
  ALTER COLUMN confidence DROP DEFAULT;

UPDATE public.store_business_model_canvas
SET confidence = NULL
WHERE confidence IS NOT NULL;

-- As nove colunas JSONB do BMC também receberam scores fixos item a item.
-- Remove somente a chave confidence, mantendo o texto e demais metadados.
DO $$
DECLARE
  col TEXT;
BEGIN
  FOREACH col IN ARRAY ARRAY[
    'key_partners',
    'key_activities',
    'key_resources',
    'value_propositions',
    'customer_relationships',
    'channels',
    'customer_segments',
    'cost_structure',
    'revenue_streams'
  ] LOOP
    EXECUTE format(
      'UPDATE public.store_business_model_canvas
       SET %1$I = CASE
         WHEN jsonb_typeof(%1$I) = ''array'' THEN (
           SELECT COALESCE(
             jsonb_agg(CASE WHEN jsonb_typeof(item) = ''object'' THEN item - ''confidence'' ELSE item END),
             ''[]''::jsonb
           )
           FROM jsonb_array_elements(%1$I) AS entry(item)
         )
         ELSE ''[]''::jsonb
       END
       WHERE jsonb_typeof(%1$I) IS DISTINCT FROM ''array''
          OR EXISTS (
            SELECT 1 FROM jsonb_array_elements(
              CASE WHEN jsonb_typeof(%1$I) = ''array'' THEN %1$I ELSE ''[]''::jsonb END
            ) AS entry(item)
            WHERE jsonb_typeof(item) = ''object'' AND item ? ''confidence''
          )',
      col
    );
  END LOOP;
END $$;
