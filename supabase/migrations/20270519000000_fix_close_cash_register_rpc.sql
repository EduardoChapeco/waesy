-- Fix close_cash_register RPC schema drift:
-- - cash_register_entries uses cash_register_id (not register_id)
-- - cash_registers uses expected_closing_balance_cents / actual_closing_balance_cents

CREATE OR REPLACE FUNCTION public.close_cash_register(
  p_register_id uuid,
  p_counted_cents integer,
  p_user_id uuid,
  p_notes text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_register public.cash_registers;
  v_expected_cents integer;
  v_discrepancy boolean;
BEGIN
  -- Validate register exists and is open with row lock
  SELECT * INTO v_register
  FROM public.cash_registers
  WHERE id = p_register_id
  FOR UPDATE;

  IF v_register IS NULL THEN
    RAISE EXCEPTION 'Register not found';
  END IF;

  IF v_register.status != 'open' THEN
    RAISE EXCEPTION 'Register is not open';
  END IF;

  -- Calculate expected balance using canonical column cash_register_id
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_expected_cents
  FROM public.cash_register_entries
  WHERE cash_register_id = p_register_id;

  v_expected_cents := COALESCE(v_register.initial_balance_cents, 0) + v_expected_cents;
  v_discrepancy := v_expected_cents != p_counted_cents;

  -- Close register using canonical closing balance columns
  UPDATE public.cash_registers
  SET
    status = 'closed',
    closed_at = NOW(),
    closed_by = p_user_id,
    expected_closing_balance_cents = v_expected_cents,
    actual_closing_balance_cents = p_counted_cents,
    notes = p_notes,
    updated_at = NOW()
  WHERE id = p_register_id;

  RETURN json_build_object(
    'status', 'success',
    'expected', v_expected_cents,
    'counted', p_counted_cents,
    'discrepancy', v_discrepancy
  );
END;
$function$;
