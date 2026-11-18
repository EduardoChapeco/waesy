-- Waesy Security Hardening: Revoke anon/PUBLIC execute on sensitive SECURITY DEFINER RPCs
-- All of these RPCs are invoked strictly server-side via service_role (BFF)

DO $$
DECLARE
  fn_sig TEXT;
  sensitive_fns TEXT[] := ARRAY[
    'public.accept_deal_proposal_atomic(uuid, uuid, text, bigint)',
    'public.begin_idempotent_event(text, text, text, text, integer)',
    'public.complete_idempotent_event(text, jsonb)',
    'public.fail_idempotent_event(text, text)',
    'public.idempotent_event_begin(text, text, uuid)',
    'public.idempotent_event_complete(text, jsonb)',
    'public.idempotent_event_fail(text, text)',
    'public.claim_crawl_queue_batch(text, integer, integer)',
    'public.consume_pass_credit_atomic(uuid, uuid, uuid, uuid)',
    'public.consume_reservation_atomic(uuid, uuid)',
    'public.release_reservation_atomic(uuid)',
    'public.create_quote(uuid, uuid, text, text, text, timestamp with time zone, text, text, uuid, text, text, text, jsonb)',
    'public.get_next_commercial_invoice_number(uuid, text)',
    'public.record_cash_entry_atomic(uuid, uuid, bigint, text, text, uuid, text, text)',
    'public.settle_order_payout_atomic(uuid, uuid, text)',
    'public.transition_order_status_atomic(uuid, uuid, text, text, uuid, text)',
    'public.match_copilot_semantic_memory(extensions.vector, double precision, integer, uuid)'
  ];
BEGIN
  FOREACH fn_sig IN ARRAY sensitive_fns LOOP
    IF to_regprocedure(fn_sig) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon;', fn_sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role;', fn_sig);
    END IF;
  END LOOP;
END;
$$;
