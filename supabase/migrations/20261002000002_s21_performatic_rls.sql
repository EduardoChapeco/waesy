-- ==============================================================================
-- Migração S21: RLS Performático, Resolução de InitPlan e Consolidação de Políticas
-- Data: 2026-10-02
-- Invariantes: M01, M08, M09, M13
-- Reduz Planning Time e elimina reavaliação de auth.uid() por linha (InitPlan O(1))
-- ==============================================================================

-- 1. Correção de Views de Segurança (security_definer_view -> security_invoker = true)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_verified_marketplace_stores') THEN
    ALTER VIEW public.v_verified_marketplace_stores SET (security_invoker = true);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'unified_listings_view') THEN
    ALTER VIEW public.unified_listings_view SET (security_invoker = true);
  END IF;
END $$;

-- 2. Tabela: orders
-- Drop de políticas legadas/redundantes que executam auth.uid() sem InitPlan
DROP POLICY IF EXISTS "orders_customer_read" ON public.orders;
DROP POLICY IF EXISTS "orders_staff_read" ON public.orders;
DROP POLICY IF EXISTS "orders_staff_update" ON public.orders;
DROP POLICY IF EXISTS "orders_update_store_member" ON public.orders;
DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_authenticated" ON public.orders;
DROP POLICY IF EXISTS "orders_select_canonical" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_canonical" ON public.orders;
DROP POLICY IF EXISTS "orders_update_canonical" ON public.orders;

CREATE POLICY "orders_select_canonical" ON public.orders
FOR SELECT TO authenticated
USING (
  is_platform_admin() 
  OR customer_id = (SELECT auth.uid()) 
  OR store_id = ANY (auth_user_store_ids())
);

CREATE POLICY "orders_insert_canonical" ON public.orders
FOR INSERT TO authenticated
WITH CHECK (
  customer_id = (SELECT auth.uid()) 
  OR (store_id = ANY (auth_user_store_ids()))
  OR is_platform_admin()
);

CREATE POLICY "orders_update_canonical" ON public.orders
FOR UPDATE TO authenticated
USING (
  is_platform_admin() 
  OR (store_id = ANY (auth_user_store_ids()))
);

-- 3. Tabela: order_items
DROP POLICY IF EXISTS "order_items_customer_read" ON public.order_items;
DROP POLICY IF EXISTS "order_items_select" ON public.order_items;
DROP POLICY IF EXISTS "order_items_update_store" ON public.order_items;
DROP POLICY IF EXISTS "order_items_insert" ON public.order_items;
DROP POLICY IF EXISTS "order_items_select_canonical" ON public.order_items;
DROP POLICY IF EXISTS "order_items_insert_canonical" ON public.order_items;
DROP POLICY IF EXISTS "order_items_update_canonical" ON public.order_items;

CREATE POLICY "order_items_select_canonical" ON public.order_items
FOR SELECT TO authenticated
USING (
  is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (o.customer_id = (SELECT auth.uid()) OR o.store_id = ANY (auth_user_store_ids()))
  )
);

CREATE POLICY "order_items_insert_canonical" ON public.order_items
FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "order_items_update_canonical" ON public.order_items
FOR UPDATE TO authenticated
USING (
  is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.store_id = ANY (auth_user_store_ids())
  )
);

-- 4. Tabela: products
DROP POLICY IF EXISTS "products_select_public" ON public.products;
DROP POLICY IF EXISTS "products_public_read" ON public.products;
DROP POLICY IF EXISTS "products_staff_read" ON public.products;
DROP POLICY IF EXISTS "products_staff_write" ON public.products;
DROP POLICY IF EXISTS "products_write_store" ON public.products;
DROP POLICY IF EXISTS "products_select_canonical" ON public.products;
DROP POLICY IF EXISTS "products_write_canonical" ON public.products;

CREATE POLICY "products_select_canonical" ON public.products
FOR SELECT TO public
USING (
  status = 'published'
  OR is_platform_admin()
  OR store_id = ANY (auth_user_store_ids())
);

CREATE POLICY "products_write_canonical" ON public.products
FOR ALL TO authenticated
USING (
  is_platform_admin()
  OR store_id = ANY (auth_user_store_ids())
)
WITH CHECK (
  is_platform_admin()
  OR store_id = ANY (auth_user_store_ids())
);

-- 5. Tabela: classifieds
DROP POLICY IF EXISTS "classifieds_auth_all" ON public.classifieds;
DROP POLICY IF EXISTS "classifieds_select_public" ON public.classifieds;
DROP POLICY IF EXISTS "classifieds_public_select" ON public.classifieds;
DROP POLICY IF EXISTS "classifieds_public_read" ON public.classifieds;
DROP POLICY IF EXISTS "Public can read active classifieds" ON public.classifieds;
DROP POLICY IF EXISTS "classifieds_author_all" ON public.classifieds;
DROP POLICY IF EXISTS "classifieds_admin_all" ON public.classifieds;
DROP POLICY IF EXISTS "classifieds_select_canonical" ON public.classifieds;
DROP POLICY IF EXISTS "classifieds_insert_canonical" ON public.classifieds;
DROP POLICY IF EXISTS "classifieds_manage_canonical" ON public.classifieds;

CREATE POLICY "classifieds_select_canonical" ON public.classifieds
FOR SELECT TO public
USING (
  status = ANY (ARRAY['active'::text, 'published'::text, 'reserved'::text, 'featured'::text])
  OR author_profile_id = (SELECT auth.uid())
  OR is_platform_admin()
);

CREATE POLICY "classifieds_insert_canonical" ON public.classifieds
FOR INSERT TO authenticated
WITH CHECK (
  author_profile_id = (SELECT auth.uid())
  OR is_platform_admin()
);

CREATE POLICY "classifieds_manage_canonical" ON public.classifieds
FOR ALL TO authenticated
USING (
  author_profile_id = (SELECT auth.uid())
  OR is_platform_admin()
)
WITH CHECK (
  author_profile_id = (SELECT auth.uid())
  OR is_platform_admin()
);

-- 6. Tabela: notifications
DROP POLICY IF EXISTS "notifications_self_read" ON public.notifications;
DROP POLICY IF EXISTS "notifications_self_update" ON public.notifications;
DROP POLICY IF EXISTS "notif_own" ON public.notifications;
DROP POLICY IF EXISTS "notif_update_own" ON public.notifications;

CREATE POLICY "notif_own" ON public.notifications
FOR SELECT TO authenticated
USING (
  is_platform_admin()
  OR user_id = (SELECT auth.uid())
);

CREATE POLICY "notif_update_own" ON public.notifications
FOR UPDATE TO authenticated
USING (
  is_platform_admin()
  OR user_id = (SELECT auth.uid())
);

-- 7. Tabela: cart_items
DROP POLICY IF EXISTS "cart_items_via_cart" ON public.cart_items;
DROP POLICY IF EXISTS "cart_items_own" ON public.cart_items;

CREATE POLICY "cart_items_own" ON public.cart_items
FOR ALL TO public
USING (
  is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.carts c
    WHERE c.id = cart_items.cart_id
      AND (c.customer_id = (SELECT auth.uid()) OR c.session_token IS NOT NULL)
  )
)
WITH CHECK (
  is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.carts c
    WHERE c.id = cart_items.cart_id
      AND (c.customer_id = (SELECT auth.uid()) OR c.session_token IS NOT NULL)
  )
);

-- 8. Tabela: profiles
DROP POLICY IF EXISTS "profiles_self_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_staff" ON public.profiles;
DROP POLICY IF EXISTS "profiles_platform_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_canonical" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_canonical" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_canonical" ON public.profiles;

CREATE POLICY "profiles_select_canonical" ON public.profiles
FOR SELECT TO public
USING (true);

CREATE POLICY "profiles_insert_canonical" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (
  id = (SELECT auth.uid())
  OR is_platform_admin()
);

CREATE POLICY "profiles_update_canonical" ON public.profiles
FOR UPDATE TO authenticated
USING (
  id = (SELECT auth.uid())
  OR is_platform_admin()
)
WITH CHECK (
  id = (SELECT auth.uid())
  OR is_platform_admin()
);
