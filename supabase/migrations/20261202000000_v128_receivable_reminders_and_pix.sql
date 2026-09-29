-- ============================================================================
-- V128: RECEIVABLE INSTALLMENT REMINDERS, TRACKING & PIX COPIA-E-COLA
-- ============================================================================
-- Adiciona colunas para controle de régua de cobrança automatizada (WhatsApp/SMS),
-- contadores de lembretes enviados, data do último lembrete e payload Pix Copia e Cola.
-- ============================================================================

ALTER TABLE public.receivable_installments
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminders_sent_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pix_copy_paste TEXT;

CREATE INDEX IF NOT EXISTS idx_installments_reminders 
  ON public.receivable_installments (last_reminder_sent_at)
  WHERE status IN ('pending', 'late');

COMMENT ON COLUMN public.receivable_installments.last_reminder_sent_at IS 'Data/hora do último lembrete ou notificação de cobrança enviado ao cliente';
COMMENT ON COLUMN public.receivable_installments.reminders_sent_count IS 'Quantidade total de lembretes de cobrança enviados para esta parcela';
COMMENT ON COLUMN public.receivable_installments.pix_copy_paste IS 'Linha digitável do PIX Copia e Cola específica para quitação desta parcela';
