-- ============================================================================
-- S20: Índices Canônicos de Alta Performance para Listagens e Escala BigTech
--
-- Elimina full-table scans e sorts em memória nas 5 listagens mais volumosas:
-- 1. orders(store_id, created_at DESC)
-- 2. products(store_id, status, created_at DESC)
-- 3. classifieds(status, created_at DESC)
-- 4. customers_crm(store_id, created_at DESC)
-- 5. events(status, event_date ASC)
-- ============================================================================

-- 1. Orders: Listagens por loja ordenadas por criação (Paginação keyset)
CREATE INDEX IF NOT EXISTS idx_orders_store_created_at
  ON public.orders(store_id, created_at DESC);

-- 2. Products: Listagens ativas da loja com ordenação cronológica
CREATE INDEX IF NOT EXISTS idx_products_store_status_created_at
  ON public.products(store_id, status, created_at DESC);

-- 3. Classifieds: Vitrines públicas ativas ordenadas por data de criação
CREATE INDEX IF NOT EXISTS idx_classifieds_status_created_at
  ON public.classifieds(status, created_at DESC);

-- 4. Customers CRM: Listagens de clientes por loja com ordenação cronológica
CREATE INDEX IF NOT EXISTS idx_customers_crm_store_created_at
  ON public.customers_crm(store_id, created_at DESC);

-- 5. Events: Eventos públicos ordenados por data futura do evento
CREATE INDEX IF NOT EXISTS idx_events_status_event_date
  ON public.events(status, event_date ASC);
