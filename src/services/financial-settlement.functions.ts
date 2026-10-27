import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

export const SettleCommercialInvoiceSchema = z.object({
  invoiceId: z.string().uuid(),
  paymentMethod: z.enum(["pix", "card", "cash", "transfer", "carne", "other"]).default("pix"),
  paidAmountCents: z.number().int().positive().optional(),
  operatorNetCents: z.number().int().nonnegative().optional(),
  consultantPercent: z.number().min(0).max(100).optional(),
  consultantId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
});

export type SettleCommercialInvoiceDTO = z.infer<typeof SettleCommercialInvoiceSchema>;

export type SettleCommercialInvoiceResult = {
  success: boolean;
  invoiceId: string;
  invoiceCode: string;
  grossAmountCents: number;
  operatorNetCents: number;
  agencyGrossMarginCents: number;
  consultantCommissionCents: number;
  cashRegisterUpdated: boolean;
  contractUpdated: boolean;
  commissionRegistered: boolean;
};

export const settleCommercialInvoicePayment = createServerFn({ method: "POST" })
  .validator((data: unknown) => SettleCommercialInvoiceSchema.parse(data))
  .handler(async ({ data }): Promise<SettleCommercialInvoiceResult> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "finance", "seller"]);

    const storeId = identity.store_id;

    // 1. Busca fatura comercial soberana
    const { data: invoice, error: invoiceErr } = await supabase
      .from("commercial_invoices")
      .select("id, store_id, creator_id, contract_id, invoice_code, total_cents, payment_terms, customer_snapshot, status")
      .eq("id", data.invoiceId)
      .eq("store_id", storeId)
      .single();

    if (invoiceErr || !invoice) {
      throw new Error(`Fatura comercial não encontrada: ${invoiceErr?.message || "ID inválido"}`);
    }

    const grossAmountCents = data.paidAmountCents || Number(invoice.total_cents || 0);
    const operatorNetCents = data.operatorNetCents ?? 0;
    const agencyGrossMarginCents = Math.max(0, grossAmountCents - operatorNetCents);
    const consultantPercent = data.consultantPercent ?? 0;
    const consultantCommissionCents = consultantPercent > 0
      ? Math.round(agencyGrossMarginCents * (consultantPercent / 100))
      : 0;

    const currentTerms = (invoice.payment_terms as Record<string, any>) || {};
    const updatedTerms = {
      ...currentTerms,
      settled_at: new Date().toISOString(),
      settled_method: data.paymentMethod,
      settled_by: identity.id,
      gross_amount_cents: grossAmountCents,
      operator_net_cents: operatorNetCents,
      agency_margin_cents: agencyGrossMarginCents,
      consultant_commission_cents: consultantCommissionCents,
      settlement_notes: data.notes || null,
    };

    // 2. Atualiza fatura para status pago
    const { error: updateInvoiceErr } = await supabase
      .from("commercial_invoices")
      .update({
        status: "paid",
        payment_terms: updatedTerms,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoice.id)
      .eq("store_id", storeId);

    if (updateInvoiceErr) {
      throw new Error(`Falha ao liquidar fatura comercial: ${updateInvoiceErr.message}`);
    }

    // 3. Se houver contrato digital vinculado, avança para ativo / em execução
    let contractUpdated = false;
    if (invoice.contract_id) {
      try {
        const { error: contractErr } = await supabase
          .from("contracts")
          .update({
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", invoice.contract_id)
          .eq("store_id", storeId);

        if (!contractErr) {
          contractUpdated = true;
        }
      } catch (cErr) {
        console.warn("[settlement] notice updating linked contract:", cErr);
      }
    }

    // 4. Lança entrada no Caixa Central se houver caixa aberto
    let cashRegisterUpdated = false;
    try {
      const { data: openRegister } = await supabase
        .from("cash_registers")
        .select("id")
        .eq("store_id", storeId)
        .eq("status", "open")
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (openRegister?.id) {
        const customerName = (invoice.customer_snapshot as any)?.name || "Cliente";
        const { error: entryErr } = await supabase
          .from("cash_register_entries")
          .insert({
            cash_register_id: openRegister.id,
            amount_cents: grossAmountCents,
            entry_type: data.paymentMethod,
            notes: `Liquidação Fatura ${invoice.invoice_code} - ${customerName}`,
            channel_source: "commercial_invoice",
          });

        if (!entryErr) {
          cashRegisterUpdated = true;
        }
      }
    } catch (cashErr) {
      console.warn("[settlement] notice creating cash register entry:", cashErr);
    }

    // 5. Registra comissão do consultor / vendedor se aplicável
    let commissionRegistered = false;
    const targetConsultantId = data.consultantId || invoice.creator_id;
    if (consultantCommissionCents > 0 && targetConsultantId) {
      try {
        const { error: commErr } = await supabase
          .from("commissions")
          .insert({
            store_id: storeId,
            employee_id: targetConsultantId,
            amount_cents: consultantCommissionCents,
            status: "pending",
          });

        if (!commErr) {
          commissionRegistered = true;
        }
      } catch (commErr) {
        console.warn("[settlement] notice creating seller commission:", commErr);
      }
    }

    return {
      success: true,
      invoiceId: invoice.id,
      invoiceCode: invoice.invoice_code,
      grossAmountCents,
      operatorNetCents,
      agencyGrossMarginCents,
      consultantCommissionCents,
      cashRegisterUpdated,
      contractUpdated,
      commissionRegistered,
    };
  });
