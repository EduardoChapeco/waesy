-- ==============================================================================
-- MIGRAÇÃO: INTEGRIDADE DE NDAs, DOCUMENTOS RESTRITOS & TELEMETRIA DE PONTOS
-- Timestamp: 20261108000000
-- ==============================================================================

BEGIN;

-- 1. Garantir que classified_nda_signatures referencia a tabela real public.classifieds(id)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'classified_nda_signatures_classified_id_fkey' 
          AND table_name = 'classified_nda_signatures'
    ) THEN
        ALTER TABLE public.classified_nda_signatures 
            DROP CONSTRAINT classified_nda_signatures_classified_id_fkey;
    END IF;

    ALTER TABLE public.classified_nda_signatures
        ADD CONSTRAINT classified_nda_signatures_classified_id_fkey
        FOREIGN KEY (classified_id) REFERENCES public.classifieds(id) ON DELETE CASCADE;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Constraint update handled safely: %', SQLERRM;
END $$;

-- 2. Garantir índices de performance para busca de NDAs e pontos comerciais
CREATE INDEX IF NOT EXISTS idx_classified_nda_sig_lookup 
    ON public.classified_nda_signatures(classified_id, user_id, status);

CREATE INDEX IF NOT EXISTS idx_comm_points_norm_addr 
    ON public.commercial_point_records(address_normalized, city);

-- 3. Inserir tabela ou campos para metadados de auditoria se não existirem
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cnpj_market_audits' AND column_name = 'raw_receita_data'
    ) THEN
        ALTER TABLE public.cnpj_market_audits 
            ADD COLUMN raw_receita_data JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

COMMIT;
