-- 20270515000000_food_delivery_platforms_and_orders_sync.sql
-- Expande constraints de canais de delivery brasileiros (99Food, TriDelivery, Amo Ofertas, Amo Delivery, Rappi, aiqfome, iFood)
-- e garante colunas de despacho direto em marketplace_external_orders.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_channel_origin') THEN
    ALTER TABLE public.orders DROP CONSTRAINT chk_orders_channel_origin;
  END IF;
  ALTER TABLE public.orders ADD CONSTRAINT chk_orders_channel_origin CHECK (
    channel_origin = ANY (ARRAY[
      'mercadolivre'::text,
      'amazon'::text,
      'magalu'::text,
      'shopee'::text,
      'ifood'::text,
      '99food'::text,
      'tridelivery'::text,
      'amoofertas'::text,
      'amodelivery'::text,
      'rappi'::text,
      'aiqfome'::text,
      'correios'::text,
      'balcao_pos'::text,
      'vitrine_online'::text,
      'web'::text,
      'whatsapp'::text,
      'outros'::text
    ])
  );

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_origin_channel_check') THEN
    ALTER TABLE public.orders DROP CONSTRAINT orders_origin_channel_check;
  END IF;
  ALTER TABLE public.orders ADD CONSTRAINT orders_origin_channel_check CHECK (
    origin_channel = ANY (ARRAY[
      'waesy_app'::text,
      'pdv'::text,
      'whatsapp'::text,
      'mercadolivre'::text,
      'ifood'::text,
      'shopee'::text,
      'magalu'::text,
      'amazon'::text,
      'rappi'::text,
      'amodelivery'::text,
      'amoofertas'::text,
      '99food'::text,
      'tridelivery'::text,
      'aiqfome'::text,
      'direct_link'::text
    ])
  );

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'marketplace_connectors_platform_check') THEN
    ALTER TABLE public.marketplace_connectors DROP CONSTRAINT marketplace_connectors_platform_check;
  END IF;
  ALTER TABLE public.marketplace_connectors ADD CONSTRAINT marketplace_connectors_platform_check CHECK (
    platform = ANY (ARRAY[
      'mercadolivre'::text,
      'ifood'::text,
      'shopee'::text,
      'magalu'::text,
      'amazon'::text,
      'rappi'::text,
      'amodelivery'::text,
      '99food'::text,
      'amoofertas'::text,
      'tridelivery'::text,
      'aiqfome'::text,
      'bling'::text,
      'tiny'::text,
      'melhorenvio'::text,
      'correios'::text,
      'kangu'::text,
      'frenet'::text,
      'loggi'::text,
      'jadlog'::text,
      'google_business'::text
    ])
  );
END $$;

ALTER TABLE public.marketplace_external_orders
  ADD COLUMN IF NOT EXISTS shipping_carrier text,
  ADD COLUMN IF NOT EXISTS dispatched_at timestamp with time zone;
