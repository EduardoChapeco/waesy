-- Migration: 20261211000000_cart_merge_options_aware
-- Ensures merge_guest_cart handles multi-tenant store carts, selected_options preservation,
-- and conflict resolution on (cart_id, variant_id, COALESCE(selected_options, '{}'::jsonb)).

CREATE OR REPLACE FUNCTION public.merge_guest_cart(
  p_guest_session TEXT,
  p_customer_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_guest_cart RECORD;
  v_user_cart_id UUID;
BEGIN
  IF p_guest_session IS NULL OR p_customer_id IS NULL THEN
    RETURN;
  END IF;

  -- Iterate over all active guest carts (one per store_id)
  FOR v_guest_cart IN
    SELECT id, store_id, seller_id, coupon_code, discount_cents
    FROM public.carts
    WHERE session_token = p_guest_session AND status = 'active'
  LOOP
    -- Check if user already has an active cart for this specific store
    SELECT id INTO v_user_cart_id
    FROM public.carts
    WHERE customer_id = p_customer_id 
      AND store_id = v_guest_cart.store_id 
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_user_cart_id IS NULL THEN
      -- No existing cart for this store. Claim the guest cart directly.
      UPDATE public.carts
      SET customer_id = p_customer_id,
          session_token = NULL,
          updated_at = now()
      WHERE id = v_guest_cart.id;
    ELSE
      -- Move items into existing user cart, preserving selected_options
      INSERT INTO public.cart_items (cart_id, variant_id, qty, price_snapshot_cents, selected_options)
      SELECT v_user_cart_id, variant_id, qty, price_snapshot_cents, selected_options
      FROM public.cart_items
      WHERE cart_id = v_guest_cart.id
      ON CONFLICT (cart_id, variant_id, COALESCE(selected_options, '{}'::jsonb)) DO UPDATE
      SET qty = public.cart_items.qty + EXCLUDED.qty,
          price_snapshot_cents = EXCLUDED.price_snapshot_cents,
          updated_at = now();

      -- Clean up the guest cart and its items
      DELETE FROM public.cart_items WHERE cart_id = v_guest_cart.id;
      DELETE FROM public.carts WHERE id = v_guest_cart.id;
    END IF;
  END LOOP;
END;
$$;
