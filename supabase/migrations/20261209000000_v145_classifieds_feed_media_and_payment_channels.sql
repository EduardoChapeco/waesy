-- ==============================================================================
-- MIGRATION: v145_classifieds_feed_media_and_payment_channels.sql
-- DESCRIÇÃO: 
--  1. Adiciona coluna feed_media (jsonb) para até 12 mídias exclusivas do feed 
--     (fotos, GIFs e vídeos MP4/WebM) no template editorial sem duplicar o hero.
--  2. Adiciona payment_settings (jsonb) em classifieds para canais de recebimento direto
--     do anunciante (PIX direto, link de pagamento, gateway de loja integrada).
--  3. Adiciona pix_settings (jsonb) em profiles para preferências padrão do anunciante.
-- IDEMPOTÊNCIA: Colunas aditivas com IF NOT EXISTS.
-- ==============================================================================

DO $$
BEGIN
    -- 1. Coluna feed_media em classifieds
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'classifieds' 
          AND column_name = 'feed_media'
    ) THEN
        ALTER TABLE public.classifieds 
        ADD COLUMN feed_media jsonb DEFAULT '[]'::jsonb;
        COMMENT ON COLUMN public.classifieds.feed_media IS 'Galeria exclusiva do feed (até 12 mídias: fotos, GIFs, vídeos MP4/WebM) desacoplada do carrossel do topo';
    END IF;

    -- 2. Coluna payment_settings em classifieds
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'classifieds' 
          AND column_name = 'payment_settings'
    ) THEN
        ALTER TABLE public.classifieds 
        ADD COLUMN payment_settings jsonb DEFAULT '{}'::jsonb;
        COMMENT ON COLUMN public.classifieds.payment_settings IS 'Configurações de recebimento do anunciante: pix_key, payment_link, gateway_mode, etc.';
    END IF;

    -- 3. Coluna pix_settings em profiles
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'pix_settings'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN pix_settings jsonb DEFAULT '{}'::jsonb;
        COMMENT ON COLUMN public.profiles.pix_settings IS 'Chave PIX e dados bancários padrão do anunciante para recebimentos rápidos';
    END IF;

    -- 4. Garantir índice GIN para buscas eficientes em feed_media e payment_settings
    CREATE INDEX IF NOT EXISTS idx_classifieds_feed_media_gin 
    ON public.classifieds USING gin (feed_media);

    CREATE INDEX IF NOT EXISTS idx_classifieds_payment_settings_gin 
    ON public.classifieds USING gin (payment_settings);
END $$;
