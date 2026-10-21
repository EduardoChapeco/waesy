-- ==============================================================================
-- Migration: Service Packages & Passes Hardening, Snapshots & Operational RPCs
-- ==============================================================================

-- 1. Extensões e Snapshots na Carteira de Passes do Cliente
ALTER TABLE public.customer_service_passes
ADD COLUMN IF NOT EXISTS package_snapshot JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS unit_price_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_customer_service_passes_order ON public.customer_service_passes(order_id);
CREATE INDEX IF NOT EXISTS idx_customer_service_passes_status ON public.customer_service_passes(status);
CREATE INDEX IF NOT EXISTS idx_customer_service_passes_expires ON public.customer_service_passes(expires_at);

-- 2. Atualizar constraint de movement_type no ledger para suportar ajustes manuais e auditoria
ALTER TABLE public.service_pass_ledger
DROP CONSTRAINT IF EXISTS service_pass_ledger_movement_type_check;

ALTER TABLE public.service_pass_ledger
ADD CONSTRAINT service_pass_ledger_movement_type_check
CHECK (movement_type IN (
    'credit_grant',
    'session_booked',
    'session_completed',
    'session_cancelled_refund',
    'no_show_penalty',
    'no_show_courtesy_refund',
    'expired_forfeit',
    'manual_adjustment'
));

-- 3. Stored Procedure: Ajuste Manual de Saldo pelo Lojista com Trilha Auditável
CREATE OR REPLACE FUNCTION public.adjust_service_pass_credits(
    p_pass_id UUID,
    p_credits_delta INTEGER,
    p_reason TEXT,
    p_operator_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pass RECORD;
    v_new_balance INTEGER;
BEGIN
    IF p_credits_delta = 0 THEN
        RAISE EXCEPTION 'A alteração de saldo não pode ser zero.';
    END IF;

    IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
        RAISE EXCEPTION 'A justificativa do ajuste é obrigatória para compliance.';
    END IF;

    -- 1. Lock pessimista no passe do cliente
    SELECT * INTO v_pass
    FROM public.customer_service_passes
    WHERE id = p_pass_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Passe de serviços não encontrado.';
    END IF;

    v_new_balance := v_pass.remaining_credits + p_credits_delta;

    IF v_new_balance < 0 THEN
        RAISE EXCEPTION 'Saldo insuficiente no passe. O saldo não pode ficar negativo (Atual: %, Ajuste: %).', v_pass.remaining_credits, p_credits_delta;
    END IF;

    -- 2. Atualiza passe do cliente
    UPDATE public.customer_service_passes
    SET 
        remaining_credits = v_new_balance,
        total_credits = CASE 
            WHEN p_credits_delta > 0 THEN total_credits + p_credits_delta 
            ELSE total_credits 
        END,
        status = CASE 
            WHEN v_new_balance = 0 THEN 'exhausted' 
            WHEN v_pass.expires_at < NOW() THEN 'expired'
            ELSE 'active' 
        END,
        updated_at = NOW()
    WHERE id = p_pass_id;

    -- 3. Registra lançamento auditável no Ledger
    INSERT INTO public.service_pass_ledger (
        pass_id,
        appointment_id,
        movement_type,
        credits_delta,
        balance_after,
        reason
    ) VALUES (
        p_pass_id,
        NULL,
        'manual_adjustment',
        p_credits_delta,
        v_new_balance,
        FORMAT('Ajuste manual de %s crédito(s) pelo operador (%s): %s', p_credits_delta, p_operator_id, TRIM(p_reason))
    );

    RETURN jsonb_build_object(
        'success', true,
        'pass_id', p_pass_id,
        'previous_balance', v_pass.remaining_credits,
        'new_balance', v_new_balance,
        'credits_delta', p_credits_delta
    );
END;
$$;

-- 4. Stored Procedure: Marcação de No-Show e Gestão de Penalidade de Crédito
CREATE OR REPLACE FUNCTION public.mark_appointment_no_show(
    p_appointment_id UUID,
    p_operator_id UUID,
    p_forfeit_credit BOOLEAN DEFAULT TRUE,
    p_reason TEXT DEFAULT 'Não comparecimento do cliente (No-Show)'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_appt RECORD;
    v_pass RECORD;
    v_new_balance INTEGER;
BEGIN
    SELECT * INTO v_appt
    FROM public.booking_appointments
    WHERE id = p_appointment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Agendamento não encontrado.';
    END IF;

    IF v_appt.status IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'Não é possível marcar no-show em agendamento com status "%".', v_appt.status;
    END IF;

    -- 1. Atualiza status do agendamento
    UPDATE public.booking_appointments
    SET 
        status = 'no_show',
        updated_at = NOW()
    WHERE id = p_appointment_id;

    -- 2. Tratamento do Passe vinculado
    IF v_appt.pass_id IS NOT NULL THEN
        SELECT * INTO v_pass
        FROM public.customer_service_passes
        WHERE id = v_appt.pass_id
        FOR UPDATE;

        IF p_forfeit_credit THEN
            -- Penalidade: crédito consumido definitivamente como no-show
            INSERT INTO public.service_pass_ledger (
                pass_id,
                appointment_id,
                movement_type,
                credits_delta,
                balance_after,
                reason
            ) VALUES (
                v_appt.pass_id,
                p_appointment_id,
                'no_show_penalty',
                0,
                v_pass.remaining_credits,
                FORMAT('Penalidade de no-show registrada pelo operador (%s): %s', p_operator_id, p_reason)
            );
            v_new_balance := v_pass.remaining_credits;
        ELSE
            -- Cortesia do prestador: crédito devolvido ao passe
            v_new_balance := v_pass.remaining_credits + 1;
            UPDATE public.customer_service_passes
            SET 
                remaining_credits = v_new_balance,
                status = 'active',
                updated_at = NOW()
            WHERE id = v_appt.pass_id;

            INSERT INTO public.service_pass_ledger (
                pass_id,
                appointment_id,
                movement_type,
                credits_delta,
                balance_after,
                reason
            ) VALUES (
                v_appt.pass_id,
                p_appointment_id,
                'no_show_courtesy_refund',
                1,
                v_new_balance,
                FORMAT('Cortesia de reposição pós no-show concedida pelo operador (%s): %s', p_operator_id, p_reason)
            );
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'appointment_id', p_appointment_id,
        'status', 'no_show',
        'credit_forfeited', p_forfeit_credit,
        'remaining_credits', v_new_balance
    );
END;
$$;

-- 5. Stored Procedure: Varredura e Expiração Idempotente de Passes Vencidos
CREATE OR REPLACE FUNCTION public.expire_outdated_service_passes()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER := 0;
    v_rec RECORD;
BEGIN
    FOR v_rec IN 
        SELECT id, remaining_credits
        FROM public.customer_service_passes
        WHERE expires_at < NOW()
        AND status = 'active'
        FOR UPDATE
    LOOP
        UPDATE public.customer_service_passes
        SET status = 'expired', updated_at = NOW()
        WHERE id = v_rec.id;

        IF v_rec.remaining_credits > 0 THEN
            INSERT INTO public.service_pass_ledger (
                pass_id,
                appointment_id,
                movement_type,
                credits_delta,
                balance_after,
                reason
            ) VALUES (
                v_rec.id,
                NULL,
                'expired_forfeit',
                0,
                v_rec.remaining_credits,
                FORMAT('Validade do pacote expirada com %s crédito(s) remanescente(s)', v_rec.remaining_credits)
            );
        END IF;

        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'expired_passes_count', v_count,
        'executed_at', NOW()
    );
END;
$$;
