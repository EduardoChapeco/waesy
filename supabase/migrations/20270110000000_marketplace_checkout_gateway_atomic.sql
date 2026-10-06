begin;

alter table public.payments
  add column if not exists gateway_payload jsonb not null default '{}'::jsonb,
  add column if not exists webhook_event_id text,
  add column if not exists checkout_idempotency_key text;

create unique index if not exists payments_webhook_event_id_uq
  on public.payments (provider_name, webhook_event_id)
  where webhook_event_id is not null;

create unique index if not exists payments_checkout_idempotency_uq
  on public.payments (checkout_idempotency_key)
  where checkout_idempotency_key is not null;

create or replace function public.create_marketplace_checkout_atomic(
  p_store_id uuid,
  p_customer_id uuid,
  p_customer_snapshot jsonb,
  p_shipping_address jsonb,
  p_shipping_method text,
  p_shipping_cents integer,
  p_payment_method public.payment_method,
  p_items jsonb,
  p_idempotency_key text,
  p_notes text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing record;
  v_order record;
  v_product record;
  v_item jsonb;
  v_snapshot jsonb := '[]'::jsonb;
  v_subtotal integer := 0;
  v_qty integer;
  v_unit integer;
  v_total integer;
  v_variant_id uuid;
  v_variant_sku text;
  v_stock_on_hand integer;
  v_stock_reserved integer;
  v_store_settings jsonb;
  v_server_shipping integer;
  v_payment_id uuid;
  v_order_id uuid;
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception 'Chave de idempotência obrigatória';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Carrinho vazio';
  end if;
  if p_shipping_cents < 0 then raise exception 'Frete inválido'; end if;

  select p.id, p.order_id, o.public_token, o.total_cents, o.subtotal_cents, o.shipping_cents
    into v_existing
    from public.payments p join public.orders o on o.id = p.order_id
   where p.checkout_idempotency_key = p_idempotency_key
   limit 1;
  if found then
    return jsonb_build_object('status','already_created','order_id',v_existing.order_id,
      'public_token',v_existing.public_token,'payment_id',v_existing.id,
      'total_cents',v_existing.total_cents,'subtotal_cents',v_existing.subtotal_cents,
      'shipping_cents',v_existing.shipping_cents);
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    if v_qty is null or v_qty <= 0 then raise exception 'Quantidade inválida'; end if;
    select p.id, p.title, p.price_cents, p.status
      into v_product from public.products p
     where p.id = (v_item->>'productId')::uuid and p.store_id = p_store_id
     for update;
    if not found or v_product.status <> 'published' then
      raise exception 'Produto indisponível';
    end if;
    select pv.id, pv.sku, pv.stock_on_hand, pv.stock_reserved
      into v_variant_id, v_variant_sku, v_stock_on_hand, v_stock_reserved
      from public.product_variants pv
     where pv.product_id = v_product.id and pv.status = 'active'
     order by pv.created_at asc limit 1 for update;
    if not found then raise exception 'Produto sem variante vendável'; end if;
    if v_stock_on_hand - v_stock_reserved < v_qty then
      raise exception 'Estoque insuficiente para %', v_product.title;
    end if;
    v_unit := v_product.price_cents;
    v_subtotal := v_subtotal + (v_unit * v_qty);
    v_snapshot := v_snapshot || jsonb_build_array(jsonb_build_object(
      'product_id',v_product.id,'variant_id',v_variant_id,'title',v_product.title,'sku',coalesce(v_variant_sku,''),
      'qty',v_qty,'unit_price_cents',v_unit,'total_cents',v_unit*v_qty,
      'selected_options',coalesce(v_item->'selectedOptions','{}'::jsonb)));
    update public.product_variants
       set stock_on_hand = stock_on_hand - v_qty,
           updated_at = now()
     where id = v_variant_id;
  end loop;

  select coalesce(settings, '{}'::jsonb) into v_store_settings
    from public.stores where id = p_store_id;
  if not found then raise exception 'Loja não encontrada'; end if;
  if p_shipping_method = 'pickup' then
    v_server_shipping := 0;
  else
    v_server_shipping := nullif(v_store_settings->'shippingRates'->>p_shipping_method, '')::integer;
    if v_server_shipping is null then raise exception 'Frete não configurado para esta loja'; end if;
    if v_subtotal >= coalesce((v_store_settings->>'freeShippingThresholdCents')::integer, -1) then
      v_server_shipping := 0;
    end if;
  end if;
  if p_shipping_cents <> v_server_shipping then raise exception 'Cotação de frete expirada ou adulterada'; end if;
  p_shipping_cents := v_server_shipping;
  v_total := v_subtotal + p_shipping_cents;
  insert into public.orders (
    store_id, customer_id, status, items_snapshot, subtotal_cents, shipping_cents,
    discount_cents, total_cents, shipping_method, shipping_address, customer_snapshot
  ) values (
    p_store_id, p_customer_id, 'awaiting_payment', v_snapshot, v_subtotal, p_shipping_cents,
    0, v_total, p_shipping_method, p_shipping_address, p_customer_snapshot
  ) returning id, public_token, total_cents, subtotal_cents, shipping_cents into v_order;

  for v_item in select * from jsonb_array_elements(v_snapshot) loop
    insert into public.order_items (
      order_id, item_id, variant_id, product_title, variant_sku, variant_attributes,
      qty, unit_price_cents, total_cents, selected_options
    ) values (
      v_order.id, (v_item->>'product_id')::uuid, (v_item->>'variant_id')::uuid, v_item->>'title', coalesce(v_item->>'sku',''),
      '{}', (v_item->>'qty')::integer, (v_item->>'unit_price_cents')::integer,
      (v_item->>'total_cents')::integer, coalesce(v_item->'selected_options','{}'::jsonb)
    );
  end loop;

  insert into public.payments (
    order_id, store_id, method, status, amount_cents, idempotency_key,
    checkout_idempotency_key, provider_name
  ) values (
    v_order.id, p_store_id, p_payment_method, 'pending', v_total,
    'checkout:' || p_idempotency_key, p_idempotency_key, null
  ) returning id into v_payment_id;

  return jsonb_build_object('status','created','order_id',v_order.id,
    'public_token',v_order.public_token,'payment_id',v_payment_id,
    'total_cents',v_order.total_cents,'subtotal_cents',v_order.subtotal_cents,
    'shipping_cents',v_order.shipping_cents);
exception when unique_violation then
  select p.id, p.order_id, o.public_token, o.total_cents, o.subtotal_cents, o.shipping_cents
    into v_existing from public.payments p join public.orders o on o.id=p.order_id
   where p.checkout_idempotency_key=p_idempotency_key limit 1;
  if found then return jsonb_build_object('status','already_created','order_id',v_existing.order_id,
    'public_token',v_existing.public_token,'payment_id',v_existing.id,'total_cents',v_existing.total_cents,
    'subtotal_cents',v_existing.subtotal_cents,'shipping_cents',v_existing.shipping_cents); end if;
  raise;
end;
$$;

revoke all on function public.create_marketplace_checkout_atomic(uuid,uuid,jsonb,jsonb,text,integer,public.payment_method,jsonb,text,text) from public, anon, authenticated;
grant execute on function public.create_marketplace_checkout_atomic(uuid,uuid,jsonb,jsonb,text,integer,public.payment_method,jsonb,text,text) to service_role;


create or replace function public.mark_payment_failed_atomic(
  p_payment_id uuid, p_reason text
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_order_id uuid;
begin
  update public.payments set status='failed', failed_at=now(), failure_reason=left(p_reason,500), updated_at=now()
   where id=p_payment_id and status in ('pending','processing') returning order_id into v_order_id;
  if v_order_id is not null then
    update public.orders set status='payment_failed', updated_at=now() where id=v_order_id and status='awaiting_payment';
  end if;
end; $$;
revoke all on function public.mark_payment_failed_atomic(uuid,text) from public, anon, authenticated;
grant execute on function public.mark_payment_failed_atomic(uuid,text) to service_role;

create or replace function public.process_marketplace_payment_webhook_atomic(
  p_provider text, p_event_id text, p_provider_ref text, p_order_id uuid,
  p_status text, p_amount_cents integer, p_payload jsonb
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_payment record; v_order record; v_new_status public.payment_status;
begin
  if p_event_id is null or length(trim(p_event_id)) < 3 then raise exception 'Evento sem id'; end if;
  if exists (select 1 from public.payments where provider_name=p_provider and webhook_event_id=p_event_id) then
    return jsonb_build_object('status','already_processed','event_id',p_event_id);
  end if;
  select * into v_payment from public.payments
   where (p_provider_ref is not null and provider_ref=p_provider_ref)
      or (p_order_id is not null and order_id=p_order_id)
   order by created_at desc limit 1 for update;
  if not found then raise exception 'Pagamento não encontrado'; end if;
  if p_amount_cents is null or p_amount_cents <> v_payment.amount_cents then raise exception 'Valor do webhook divergente'; end if;
  v_new_status := case when lower(p_status) in ('approved','paid','confirmed','succeeded') then 'paid'::public.payment_status
    when lower(p_status) in ('rejected','cancelled','canceled','failed') then 'failed'::public.payment_status
    else 'processing'::public.payment_status end;
  update public.payments set provider_name=p_provider, provider_ref=coalesce(p_provider_ref,provider_ref),
    webhook_event_id=p_event_id, gateway_payload=p_payload, status=v_new_status,
    paid_at=case when v_new_status='paid' then now() else paid_at end,
    failed_at=case when v_new_status='failed' then now() else failed_at end, updated_at=now()
   where id=v_payment.id;
  if v_new_status='paid' then
    update public.orders set status='paid', paid_at=now(), updated_at=now() where id=v_payment.order_id and status in ('awaiting_payment','payment_failed','pending');
  elsif v_new_status='failed' then
    update public.orders set status='payment_failed', updated_at=now() where id=v_payment.order_id and status='awaiting_payment';
  end if;
  return jsonb_build_object('status','processed','payment_id',v_payment.id,'order_id',v_payment.order_id,'payment_status',v_new_status::text);
end; $$;
revoke all on function public.process_marketplace_payment_webhook_atomic(text,text,text,uuid,text,integer,jsonb) from public, anon, authenticated;
grant execute on function public.process_marketplace_payment_webhook_atomic(text,text,text,uuid,text,integer,jsonb) to service_role;

commit;
