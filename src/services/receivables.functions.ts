import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getIdentity } from "./identity.functions";
import { getServerIdentity, assertStoreAccess, requirePlatformAdmin } from "@/lib/server-access";
import { recordLedgerEntryCore } from "@/services/immutable-ledger.functions";

// ==============================================================================
// 1. FUNÇÕES LEGADAS / COMPATIBILIDADE DE NEGOCIAÇÕES DIRETAS
// ==============================================================================

export const listUserReceivables = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  const identity = await getIdentity();
  if (!identity?.id) throw new Error("Não autenticado");

  const { data, error } = await supabase
    .from("receivables")
    .select(
      `
      *,
      creditor:creditor_id (id, full_name, avatar_url),
      debtor:debtor_id (id, full_name, avatar_url),
      store:store_id (id, name, logo_url),
      contract:contract_id (id, title, status, verification_code),
      installments:receivable_installments (*)
    `,
    )
    .or(`creditor_id.eq.${identity.id},debtor_id.eq.${identity.id}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[receivables] listUserReceivables error:", error);
    throw new Error("Erro ao carregar cobranças e parcelas.");
  }

  return data || [];
});

export const registerInstallmentPayment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      installmentId: z.string().uuid(),
      paymentMethod: z.string().default("PIX"),
      paymentProofUrl: z.string().optional(),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getIdentity();
    if (!identity?.id) throw new Error("Não autenticado");

    // Fetch installment
    const { data: inst, error: instErr } = await supabase
      .from("receivable_installments")
      .select("*, receivable:receivable_id(*)")
      .eq("id", input.installmentId)
      .single();

    if (instErr || !inst) throw new Error("Parcela não encontrada.");

    const receivable = inst.receivable as any;
    if (receivable.creditor_id !== identity.id && receivable.debtor_id !== identity.id) {
      throw new Error("Acesso negado.");
    }

    // Update installment
    const { data: updatedInst, error: upErr } = await supabase
      .from("receivable_installments")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        payment_method: input.paymentMethod,
        payment_proof_url: input.paymentProofUrl,
        notes: input.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", inst.id)
      .select()
      .single();

    if (upErr) throw new Error("Erro ao registrar quitação da parcela.");

    // Check if all installments are paid to settle receivable
    const { data: allInsts } = await supabase
      .from("receivable_installments")
      .select("status")
      .eq("receivable_id", receivable.id);

    const allSettled = allInsts?.every((i) => i.status === "paid" || i.status === "waived");
    if (allSettled) {
      await supabase
        .from("receivables")
        .update({ status: "settled", updated_at: new Date().toISOString() })
        .eq("id", receivable.id);
    }

    return updatedInst;
  });

// ==============================================================================
// 2. CARNÊ DIGITAL DO CLIENTE (/conta/carnes)
// ==============================================================================

export interface ClientCarneMetric {
  totalDebtCents: number;
  totalPaidCents: number;
  activeCarnesCount: number;
  overdueInstallmentsCount: number;
  pendingConciliationCount: number;
  nextDueInstallment: {
    carneTitle: string;
    storeName: string;
    installmentNumber: number;
    amountCents: number;
    dueDate: string;
    isLate: boolean;
  } | null;
}

export const listClientCarnes = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  const identity = await getIdentity();
  if (!identity?.id) throw new Error("Usuário não autenticado");

  const { data: carnes, error } = await supabase
    .from("receivables")
    .select(
      `
      *,
      creditor:creditor_id (id, full_name, avatar_url),
      store:store_id (id, name, logo_url, phone),
      contract:contract_id (id, title, status, verification_code),
      installments:receivable_installments (*)
    `,
    )
    .eq("debtor_id", identity.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[receivables] listClientCarnes error:", error);
    throw new Error("Erro ao carregar seus carnês digitais.");
  }

  const now = new Date();
  let totalDebtCents = 0;
  let totalPaidCents = 0;
  let activeCarnesCount = 0;
  let overdueInstallmentsCount = 0;
  let pendingConciliationCount = 0;
  let nextDueCandidate: any = null;

  const enrichedCarnes = (carnes || []).map((carne: any) => {
    const installments = (carne.installments || []).sort(
      (a: any, b: any) => a.installment_number - b.installment_number,
    );

    let carnePaidCents = 0;
    let carneRemainingCents = 0;
    let carnePaidCount = 0;
    let carneLateCount = 0;

    installments.forEach((inst: any) => {
      const isPaid = inst.status === "paid";
      const isPendingConciliation = inst.conciliation_status === "pending";
      const dueDate = new Date(inst.due_date);
      const isOverdue = !isPaid && dueDate < now;

      if (isPaid) {
        const amt = Number(inst.final_amount_cents || inst.original_amount_cents || inst.amount_cents || 0);
        carnePaidCents += amt;
        totalPaidCents += amt;
        carnePaidCount++;
      } else {
        const amt = Number(inst.final_amount_cents || inst.original_amount_cents || inst.amount_cents || 0);
        carneRemainingCents += amt;
        totalDebtCents += amt;

        if (isOverdue || inst.status === "late") {
          carneLateCount++;
          overdueInstallmentsCount++;
        }

        if (isPendingConciliation) {
          pendingConciliationCount++;
        }

        // Determinar próximo vencimento
        if (!nextDueCandidate || dueDate < new Date(nextDueCandidate.dueDate)) {
          nextDueCandidate = {
            carneTitle: carne.title,
            storeName: carne.store?.name || carne.creditor?.full_name || "Loja",
            installmentNumber: inst.installment_number,
            amountCents: amt,
            dueDate: inst.due_date,
            isLate: isOverdue,
          };
        }
      }
    });

    if (carne.status === "active") {
      activeCarnesCount++;
    }

    return {
      ...carne,
      installments,
      summary: {
        paidCents: carnePaidCents,
        remainingCents: carneRemainingCents,
        paidCount: carnePaidCount,
        totalCount: installments.length,
        lateCount: carneLateCount,
        progressPercent:
          installments.length > 0 ? Math.round((carnePaidCount / installments.length) * 100) : 0,
      },
    };
  });

  const metrics: ClientCarneMetric = {
    totalDebtCents,
    totalPaidCents,
    activeCarnesCount,
    overdueInstallmentsCount,
    pendingConciliationCount,
    nextDueInstallment: nextDueCandidate,
  };

  return { carnes: enrichedCarnes, metrics };
});

export const submitInstallmentProof = createServerFn({ method: "POST" })
  .validator(
    z.object({
      installmentId: z.string().uuid(),
      proofUrl: z.string().url("URL de comprovante inválida"),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getIdentity();
    if (!identity?.id) throw new Error("Usuário não autenticado");

    // Fetch installment + receivable to verify debtor
    const { data: inst, error: instErr } = await supabase
      .from("receivable_installments")
      .select("*, receivable:receivable_id(*)")
      .eq("id", input.installmentId)
      .single();

    if (instErr || !inst) throw new Error("Parcela não encontrada.");

    const rec = inst.receivable as any;
    if (rec.debtor_id !== identity.id) {
      throw new Error("Você não tem autorização para anexar comprovante a esta parcela.");
    }

    if (inst.status === "paid") {
      throw new Error("Esta parcela já se encontra quitada.");
    }

    // Atualiza status para pending conciliation
    const { data: updated, error: updateErr } = await supabase
      .from("receivable_installments")
      .update({
        conciliation_status: "pending",
        conciliation_proof_url: input.proofUrl,
        payment_proof_url: input.proofUrl,
        notes: input.notes || inst.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", inst.id)
      .select()
      .single();

    if (updateErr) {
      console.error("[receivables] submitInstallmentProof error:", updateErr);
      throw new Error("Erro ao enviar comprovante para análise.");
    }

    // Notificar o lojista/credor sobre o comprovante
    try {
      const creditorTargetId = rec.creditor_id;
      if (creditorTargetId && creditorTargetId !== identity.id) {
        await supabase.from("notifications").insert({
          user_id: creditorTargetId,
          type: "receivable_proof_submitted",
          title: "Novo Comprovante de Pagamento",
          message: `O cliente enviou o comprovante da Parcela ${inst.installment_number} de "${rec.title}". Acesse o Workspace para conciliar.`,
          link_url: "/workspace/financeiro/recebiveis",
        });
      }
    } catch (notifErr) {
      console.warn("[receivables] Failed to dispatch creditor notification:", notifErr);
    }

    return { success: true, installment: updated };
  });

// ==============================================================================
// 3. GESTÃO DE CARNÊS NO WORKSPACE DA LOJA (/workspace/financeiro/recebiveis)
// ==============================================================================

export const listStoreCarnes = createServerFn({ method: "GET" })
  .validator(
    z.object({
      storeId: z.string().uuid().optional(),
      filter: z.enum(["all", "due_soon", "late", "pending_conciliation", "settled"]).default("all"),
      search: z.string().optional(),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const serverIdentity = await getServerIdentity();
    if (!serverIdentity?.id) throw new Error("Não autenticado");

    const targetStoreId = input.storeId || serverIdentity.store_id;
    if (targetStoreId) {
      assertStoreAccess(serverIdentity, undefined, targetStoreId);
    }

    let query = supabase
      .from("receivables")
      .select(
        `
        *,
        debtor:debtor_id (id, full_name, avatar_url, phone, username, cpf),
        creditor:creditor_id (id, full_name, avatar_url),
        contract:contract_id (id, title, status, verification_code),
        installments:receivable_installments (*)
      `,
      )
      .order("created_at", { ascending: false });

    if (targetStoreId) {
      query = query.eq("store_id", targetStoreId);
    } else {
      query = query.eq("creditor_id", serverIdentity.id);
    }

    const { data: carnes, error } = await query;
    if (error) {
      console.error("[receivables] listStoreCarnes error:", error);
      throw new Error("Erro ao listar contas e carnês da loja.");
    }

    const now = new Date();
    const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const enriched = (carnes || []).map((carne: any) => {
      const installments = (carne.installments || []).sort(
        (a: any, b: any) => a.installment_number - b.installment_number,
      );

      let pendingConciliationCount = 0;
      let lateCount = 0;
      let dueSoonCount = 0;
      let paidCount = 0;

      installments.forEach((i: any) => {
        const dueDate = new Date(i.due_date);
        if (i.status === "paid") {
          paidCount++;
        } else {
          if (i.conciliation_status === "pending") pendingConciliationCount++;
          if (dueDate < now || i.status === "late") lateCount++;
          if (dueDate >= now && dueDate <= sevenDaysAhead) dueSoonCount++;
        }
      });

      return {
        ...carne,
        installments,
        stats: {
          pendingConciliationCount,
          lateCount,
          dueSoonCount,
          paidCount,
          totalCount: installments.length,
        },
      };
    });

    // Filtros
    let filtered = enriched;
    if (input.filter === "due_soon") {
      filtered = enriched.filter((c: any) => c.stats.dueSoonCount > 0);
    } else if (input.filter === "late") {
      filtered = enriched.filter((c: any) => c.stats.lateCount > 0);
    } else if (input.filter === "pending_conciliation") {
      filtered = enriched.filter((c: any) => c.stats.pendingConciliationCount > 0);
    } else if (input.filter === "settled") {
      filtered = enriched.filter((c: any) => c.status === "settled");
    }

    // Busca textual por título ou devedor
    if (input.search && input.search.trim() !== "") {
      const term = input.search.toLowerCase().trim();
      filtered = filtered.filter(
        (c: any) =>
          c.title?.toLowerCase().includes(term) ||
          c.debtor?.full_name?.toLowerCase().includes(term) ||
          c.debtor?.username?.toLowerCase().includes(term) ||
          c.debtor?.phone?.includes(term),
      );
    }

    return filtered;
  });

export const approveInstallmentPayment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      installmentId: z.string().uuid(),
      finalAmountCents: z.number().int().positive().optional(),
      waiveInterest: z.boolean().default(false),
      discountCents: z.number().int().min(0).default(0),
      paymentMethod: z.string().default("pix"),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const serverIdentity = await getServerIdentity();
    if (!serverIdentity?.id) throw new Error("Não autenticado");

    // 1. Obter a parcela e validar permissão da loja
    const { data: inst, error: instErr } = await supabase
      .from("receivable_installments")
      .select("*, receivable:receivable_id(*)")
      .eq("id", input.installmentId)
      .single();

    if (instErr || !inst) throw new Error("Parcela não encontrada.");

    const rec = inst.receivable as any;
    if (rec.store_id) {
      assertStoreAccess(serverIdentity, rec.store_id);
    } else if (rec.creditor_id !== serverIdentity.id) {
      throw new Error("Apenas o credor ou a equipe da loja pode aprovar a conciliação.");
    }

    // 2. Chamar a Stored Procedure RPC atômica
    const finalAmount =
      input.finalAmountCents ||
      (input.waiveInterest
        ? inst.original_amount_cents || inst.amount_cents
        : inst.final_amount_cents || inst.original_amount_cents || inst.amount_cents) -
        input.discountCents;

    const { data: rpcResult, error: rpcErr } = await supabase.rpc(
      "approve_installment_conciliation",
      {
        p_installment_id: inst.id,
        p_approved_by: serverIdentity.id,
        p_final_amount_cents: finalAmount,
        p_payment_method: input.paymentMethod,
        p_notes: input.notes || null,
      },
    );

    if (rpcErr) {
      console.error("[receivables] approve_installment_conciliation error:", rpcErr);
      throw new Error("Falha na transação atômica de conciliação: " + rpcErr.message);
    }

    // 3. Registrar no log de ajustes se houve isenção de juros ou desconto
    if (input.waiveInterest || input.discountCents > 0) {
      await supabase.from("receivable_adjustment_log").insert({
        receivable_id: rec.id,
        installment_id: inst.id,
        adjusted_by: serverIdentity.id,
        adjustment_type: input.waiveInterest ? "waive_interest" : "discount",
        previous_amount_cents: inst.final_amount_cents || inst.original_amount_cents,
        new_amount_cents: finalAmount,
        reason: input.notes || "Desconto/Isenção concedida na conciliação pela loja",
      });
    }

    // 4. Notificar o devedor
    try {
      await supabase.from("notifications").insert({
        user_id: rec.debtor_id,
        type: "installment_paid_approved",
        title: "Pagamento Confirmado!",
        message: `Seu pagamento da Parcela ${inst.installment_number} de "${rec.title}" foi aprovado pela loja. O comprovante foi arquivado no seu Financeiro Pessoal.`,
        link_url: "/conta/carnes",
      });
    } catch (notifErr) {
      console.warn("[receivables] Error notifying debtor:", notifErr);
    }

    // 5. Registro Criptográfico no Ledger Imutável (Bacen / SHA-256)
    try {
      await recordLedgerEntryCore({
        transactionType: "carne_installment_paid",
        amountCents: finalAmount,
        senderId: rec.debtor_id || null,
        receiverId: rec.creditor_id || null,
        storeId: rec.store_id || null,
        actorId: serverIdentity.id,
        actorRole: serverIdentity.role,
        referenceEntityType: "receivable_installments",
        referenceEntityId: inst.id,
        metadata: {
          receivable_id: rec.id,
          installment_number: inst.installment_number,
          payment_method: input.paymentMethod,
          discount_cents: input.discountCents,
          waived_interest: input.waiveInterest,
        },
      });
    } catch (ledgerErr) {
      console.warn("[receivables] Falha ao selar parcela no ledger imutável:", ledgerErr);
    }

    return rpcResult;
  });

export const rejectInstallmentPayment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      installmentId: z.string().uuid(),
      reason: z.string().min(3, "Informe a justificativa da recusa"),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const serverIdentity = await getServerIdentity();
    if (!serverIdentity?.id) throw new Error("Não autenticado");

    const { data: inst, error: instErr } = await supabase
      .from("receivable_installments")
      .select("*, receivable:receivable_id(*)")
      .eq("id", input.installmentId)
      .single();

    if (instErr || !inst) throw new Error("Parcela não encontrada.");

    const rec = inst.receivable as any;
    if (rec.store_id) {
      assertStoreAccess(serverIdentity, rec.store_id);
    } else if (rec.creditor_id !== serverIdentity.id) {
      throw new Error("Acesso negado.");
    }

    // Reverte o status de conciliação para rejected
    const { data: updated, error: updateErr } = await supabase
      .from("receivable_installments")
      .update({
        conciliation_status: "rejected",
        conciliation_notes: input.reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", inst.id)
      .select()
      .single();

    if (updateErr) throw new Error("Erro ao recusar comprovante.");

    // Registrar no log
    await supabase.from("receivable_adjustment_log").insert({
      receivable_id: rec.id,
      installment_id: inst.id,
      adjusted_by: serverIdentity.id,
      adjustment_type: "rejected_reopen",
      previous_amount_cents: inst.final_amount_cents || inst.original_amount_cents,
      new_amount_cents: inst.final_amount_cents || inst.original_amount_cents,
      reason: input.reason,
    });

    // Notificar devedor sobre a recusa
    try {
      await supabase.from("notifications").insert({
        user_id: rec.debtor_id,
        type: "installment_proof_rejected",
        title: "Comprovante Recusado",
        message: `O comprovante da Parcela ${inst.installment_number} de "${rec.title}" não foi aceito. Motivo: ${input.reason}. Por favor, envie um novo comprovante.`,
        link_url: "/conta/carnes",
      });
    } catch (notifErr) {
      console.warn("[receivables] Error notifying debtor:", notifErr);
    }

    return updated;
  });

export const adjustInstallmentAmount = createServerFn({ method: "POST" })
  .validator(
    z.object({
      installmentId: z.string().uuid(),
      discountCents: z.number().int().min(0).default(0),
      waiveInterest: z.boolean().default(false),
      reason: z.string().min(3, "Justificativa obrigatória"),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const serverIdentity = await getServerIdentity();
    if (!serverIdentity?.id) throw new Error("Não autenticado");

    const { data: inst, error: instErr } = await supabase
      .from("receivable_installments")
      .select("*, receivable:receivable_id(*)")
      .eq("id", input.installmentId)
      .single();

    if (instErr || !inst) throw new Error("Parcela não encontrada.");

    const rec = inst.receivable as any;
    if (rec.store_id) {
      assertStoreAccess(serverIdentity, rec.store_id);
    } else if (rec.creditor_id !== serverIdentity.id) {
      throw new Error("Acesso negado.");
    }

    const previousAmount = inst.final_amount_cents || inst.original_amount_cents;
    let newInterest = inst.interest_accrued_cents || 0;
    let newFine = inst.fine_cents || 0;

    if (input.waiveInterest) {
      newInterest = 0;
      newFine = 0;
    }

    const newFinalAmount = Math.max(
      0,
      Number(inst.original_amount_cents || inst.amount_cents) +
        newInterest +
        newFine -
        input.discountCents,
    );

    const { data: updated, error: updateErr } = await supabase
      .from("receivable_installments")
      .update({
        interest_accrued_cents: newInterest,
        fine_cents: newFine,
        discount_cents: input.discountCents,
        final_amount_cents: newFinalAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", inst.id)
      .select()
      .single();

    if (updateErr) throw new Error("Erro ao renegociar valor da parcela.");

    // Auditoria
    await supabase.from("receivable_adjustment_log").insert({
      receivable_id: rec.id,
      installment_id: inst.id,
      adjusted_by: serverIdentity.id,
      adjustment_type: input.waiveInterest ? "waive_interest" : "discount",
      previous_amount_cents: previousAmount,
      new_amount_cents: newFinalAmount,
      reason: input.reason,
    });

    return updated;
  });

export const sendMassBillingReminders = createServerFn({ method: "POST" })
  .validator(
    z.object({
      installmentIds: z.array(z.string().uuid()).min(1, "Selecione ao menos uma parcela"),
      template: z.enum(["friendly", "due_warning", "overdue_discount", "custom"]),
      customMessage: z.string().optional(),
      discountOfferedPercent: z.number().min(0).max(100).optional(),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const serverIdentity = await getServerIdentity();
    if (!serverIdentity?.id) throw new Error("Não autenticado");

    // Fetch installments with debtor info
    const { data: installments, error } = await supabase
      .from("receivable_installments")
      .select("id, installment_number, due_date, final_amount_cents, original_amount_cents, amount_cents, receivable:receivable_id(id, title, store_id, creditor_id, debtor_id, debtor:debtor_id(id, full_name))")
      .in("id", input.installmentIds);

    if (error || !installments) {
      throw new Error("Erro ao localizar parcelas selecionadas.");
    }

    let sentCount = 0;
    const notificationsToInsert: any[] = [];

    for (const inst of installments) {
      const rec = inst.receivable as any;
      if (!rec || !rec.debtor_id) continue;

      let title = "Lembrete de Vencimento";
      let message = "";

      const amountFormatted = (
        Number(inst.final_amount_cents || inst.original_amount_cents || inst.amount_cents) / 100
      ).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

      if (input.template === "friendly") {
        title = "📅 Lembrete de Parcela";
        message = `Olá! A Parcela ${inst.installment_number} de "${rec.title}" (${amountFormatted}) vence em breve. Você pode emitir o PIX ou anexar o comprovante direto no seu Carnê Digital.`;
      } else if (input.template === "due_warning") {
        title = "⚠️ Aviso de Vencimento";
        message = `Sua Parcela ${inst.installment_number} de "${rec.title}" no valor de ${amountFormatted} está com vencimento próximo/vencida. Evite juros adicionais regularizando pelo aplicativo.`;
      } else if (input.template === "overdue_discount") {
        const disc = input.discountOfferedPercent || 10;
        title = `🎁 Desconto Especial de ${disc}% para Quitação`;
        message = `Regularize a Parcela ${inst.installment_number} de "${rec.title}" com ${disc}% de desconto oferecido pela loja! Envie seu comprovante pelo app.`;
      } else {
        title = "📢 Mensagem da Loja sobre seu Carnê";
        message =
          input.customMessage ||
          `Aviso sobre a Parcela ${inst.installment_number} de "${rec.title}" (${amountFormatted}).`;
      }

      notificationsToInsert.push({
        user_id: rec.debtor_id,
        type: "billing_reminder",
        title,
        message,
        link_url: "/conta/carnes",
      });
      sentCount++;
    }

    if (notificationsToInsert.length > 0) {
      await supabase.from("notifications").insert(notificationsToInsert);
    }

    return { success: true, sentCount };
  });

export const createStoreCarne = createServerFn({ method: "POST" })
  .validator(
    z.object({
      debtorId: z.string().uuid("Selecione um cliente válido"),
      title: z.string().min(2, "Título do carnê é obrigatório"),
      description: z.string().optional(),
      totalCents: z.number().int().positive("Valor total deve ser positivo"),
      installmentsCount: z.number().int().min(1).max(72, "Máximo de 72 parcelas"),
      firstDueDate: z.string(),
      interestRateMonthly: z.number().min(0).default(0),
      finePercent: z.number().min(0).default(0),
      graceDays: z.number().int().min(0).default(0),
      contractId: z.string().uuid().optional(),
      dealId: z.string().uuid().optional(),
      storeId: z.string().uuid().optional(),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const serverIdentity = await getServerIdentity();
    if (!serverIdentity?.id) throw new Error("Não autenticado");

    const storeId = input.storeId || serverIdentity.store_id;
    if (storeId) {
      assertStoreAccess(serverIdentity, undefined, storeId);
    }

    const { data: result, error } = await supabase.rpc("create_receivable_with_installments", {
      p_creditor_id: serverIdentity.id,
      p_debtor_id: input.debtorId,
      p_store_id: storeId || null,
      p_contract_id: input.contractId || null,
      p_deal_id: input.dealId || null,
      p_title: input.title,
      p_description: input.description || null,
      p_total_cents: input.totalCents,
      p_installments_count: input.installmentsCount,
      p_first_due_date: new Date(input.firstDueDate).toISOString(),
      p_interest_rate_monthly: input.interestRateMonthly,
      p_fine_percent: input.finePercent,
      p_grace_days: input.graceDays,
    });

    if (error) {
      console.error("[receivables] create_receivable_with_installments error:", error);
      throw new Error("Erro ao emitir carnê digital: " + error.message);
    }

    // Notificar o devedor sobre o novo carnê gerado
    try {
      await supabase.from("notifications").insert({
        user_id: input.debtorId,
        type: "carne_created",
        title: "Novo Carnê Disponível",
        message: `A loja gerou um carnê de ${input.installmentsCount} parcelas para você: "${input.title}". Acompanhe seus vencimentos no menu Carnês & Parcelamentos.`,
        link_url: "/conta/carnes",
      });
    } catch (notifErr) {
      console.warn("[receivables] Error notifying debtor of new carne:", notifErr);
    }

    // Registro Criptográfico no Ledger Imutável (Bacen / SHA-256)
    try {
      await recordLedgerEntryCore({
        transactionType: "carne_issued",
        amountCents: input.totalCents,
        senderId: input.debtorId,
        receiverId: serverIdentity.id,
        storeId: storeId || null,
        actorId: serverIdentity.id,
        actorRole: serverIdentity.role,
        referenceEntityType: "receivables",
        referenceEntityId: result && typeof result === "object" && "id" in result ? String(result.id) : null,
        metadata: {
          title: input.title,
          installments_count: input.installmentsCount,
          interest_rate_monthly: input.interestRateMonthly,
          fine_percent: input.finePercent,
        },
      });
    } catch (ledgerErr) {
      console.warn("[receivables] Falha ao selar emissão de carnê no ledger imutável:", ledgerErr);
    }

    return result;
  });

export const getCarnesReportSummary = createServerFn({ method: "GET" })
  .validator(z.object({ storeId: z.string().uuid().optional() }))
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const serverIdentity = await getServerIdentity();
    if (!serverIdentity?.id) throw new Error("Não autenticado");

    const storeId = input.storeId || serverIdentity.store_id;
    if (storeId) {
      assertStoreAccess(serverIdentity, undefined, storeId);
    }

    let query = supabase
      .from("receivables")
      .select("*, installments:receivable_installments(*)");

    if (storeId) {
      query = query.eq("store_id", storeId);
    } else {
      query = query.eq("creditor_id", serverIdentity.id);
    }

    const { data: carnes, error } = await query;
    if (error) {
      throw new Error("Erro ao calcular métricas financeiras.");
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    let totalReceivableCents = 0;
    let overdueAmountCents = 0;
    let overdueCount = 0;
    let receivedThisMonthCents = 0;
    let dueSoon7DaysCents = 0;
    let pendingConciliationCount = 0;
    let totalNominalCents = 0;

    const agingBuckets = {
      current: 0,
      days_1_30: 0,
      days_31_60: 0,
      days_61_90: 0,
      days_90_plus: 0,
    };

    (carnes || []).forEach((c: any) => {
      (c.installments || []).forEach((inst: any) => {
        const amt = Number(inst.final_amount_cents || inst.original_amount_cents || inst.amount_cents || 0);
        totalNominalCents += amt;

        if (inst.status === "paid") {
          if (inst.paid_at) {
            const pDate = new Date(inst.paid_at);
            if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
              receivedThisMonthCents += amt;
            }
          }
        } else {
          totalReceivableCents += amt;
          const dueDate = new Date(inst.due_date);

          if (inst.conciliation_status === "pending") {
            pendingConciliationCount++;
          }

          if (dueDate < now || inst.status === "late") {
            overdueAmountCents += amt;
            overdueCount++;
            const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= 30) agingBuckets.days_1_30 += amt;
            else if (diffDays <= 60) agingBuckets.days_31_60 += amt;
            else if (diffDays <= 90) agingBuckets.days_61_90 += amt;
            else agingBuckets.days_90_plus += amt;
          } else {
            agingBuckets.current += amt;
            if (dueDate <= sevenDaysAhead) {
              dueSoon7DaysCents += amt;
            }
          }
        }
      });
    });

    const defaultRatePercent =
      totalReceivableCents > 0
        ? Math.min(100, Math.round((overdueAmountCents / totalReceivableCents) * 100))
        : 0;

    return {
      totalReceivableCents,
      overdueAmountCents,
      overdueCount,
      receivedThisMonthCents,
      dueSoon7DaysCents,
      pendingConciliationCount,
      defaultRatePercent,
      agingBuckets,
    };
  });

export const searchCustomersForCarne = createServerFn({ method: "GET" })
  .validator(z.object({ query: z.string().min(1) }))
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, phone, username, avatar_url, cpf")
      .or(`full_name.ilike.%${input.query}%,username.ilike.%${input.query}%,phone.ilike.%${input.query}%,cpf.ilike.%${input.query}%`)
      .limit(10);
    return data || [];
  });

// ==============================================================================
// 4. GOVERNANÇA BILATERAL ADMIN MASTER (/admin-master/carnes)
// ==============================================================================

export const listMasterCarnes = createServerFn({ method: "GET" })
  .validator(
    z.object({
      storeId: z.string().uuid().optional(),
      status: z.enum(["all", "active", "settled", "overdue", "pending_conciliation"]).default("all"),
      search: z.string().optional(),
    }),
  )
  .handler(async ({ data: input }) => {
    await requirePlatformAdmin();
    const supabase = getServerClient();

    let query = supabase
      .from("receivables")
      .select(
        `
        *,
        debtor:debtor_id (id, full_name, avatar_url, phone, username, cpf),
        creditor:creditor_id (id, full_name, avatar_url),
        store:store_id (id, name, logo_url, phone),
        contract:contract_id (id, title, status, verification_code),
        installments:receivable_installments (*)
      `,
      )
      .order("created_at", { ascending: false });

    if (input.storeId) {
      query = query.eq("store_id", input.storeId);
    }

    const { data: carnes, error } = await query;
    if (error) {
      console.error("[receivables] listMasterCarnes error:", error);
      throw new Error("Erro ao carregar todos os carnês da rede.");
    }

    const now = new Date();
    const enriched = (carnes || []).map((carne: any) => {
      const installments = (carne.installments || []).sort(
        (a: any, b: any) => a.installment_number - b.installment_number,
      );

      let pendingConciliationCount = 0;
      let lateCount = 0;
      let paidCount = 0;
      let totalOverdueCents = 0;

      installments.forEach((i: any) => {
        const dueDate = new Date(i.due_date);
        const isLate = i.status === "late" || (i.status !== "paid" && dueDate < now);
        if (i.status === "paid") {
          paidCount++;
        } else {
          if (i.conciliation_status === "pending") pendingConciliationCount++;
          if (isLate) {
            lateCount++;
            totalOverdueCents += Number(i.final_amount_cents || i.original_amount_cents || i.amount_cents || 0);
          }
        }
      });

      return {
        ...carne,
        installments,
        stats: {
          pendingConciliationCount,
          lateCount,
          paidCount,
          totalCount: installments.length,
          totalOverdueCents,
        },
      };
    });

    let filtered = enriched;
    if (input.status === "active") {
      filtered = enriched.filter((c: any) => c.status === "active");
    } else if (input.status === "settled") {
      filtered = enriched.filter((c: any) => c.status === "settled");
    } else if (input.status === "overdue") {
      filtered = enriched.filter((c: any) => c.stats.lateCount > 0);
    } else if (input.status === "pending_conciliation") {
      filtered = enriched.filter((c: any) => c.stats.pendingConciliationCount > 0);
    }

    if (input.search && input.search.trim() !== "") {
      const term = input.search.toLowerCase().trim();
      filtered = filtered.filter(
        (c: any) =>
          c.title?.toLowerCase().includes(term) ||
          c.store?.name?.toLowerCase().includes(term) ||
          c.debtor?.full_name?.toLowerCase().includes(term) ||
          c.debtor?.username?.toLowerCase().includes(term) ||
          c.debtor?.phone?.includes(term),
      );
    }

    return filtered;
  });

export const getMasterCarnesOverview = createServerFn({ method: "GET" }).handler(async () => {
  await requirePlatformAdmin();
  const supabase = getServerClient();

  const { data: carnes, error } = await supabase
    .from("receivables")
    .select(
      `
      id, store_id, total_cents, status,
      store:store_id (id, name, logo_url),
      installments:receivable_installments (id, amount_cents, original_amount_cents, final_amount_cents, status, conciliation_status, due_date, paid_at)
    `,
    );

  if (error) {
    throw new Error("Erro ao compilar visão financeira global de carnês.");
  }

  const now = new Date();
  let totalIssuedCents = 0;
  let totalSettledCents = 0;
  let totalOutstandingCents = 0;
  let totalOverdueCents = 0;
  let pendingConciliationCount = 0;
  const storeMap: Record<string, any> = {};

  (carnes || []).forEach((c: any) => {
    totalIssuedCents += Number(c.total_cents || 0);
    if (c.status === "settled") {
      totalSettledCents += Number(c.total_cents || 0);
    }

    const storeId = c.store_id || "direto_acordo";
    const storeName = c.store?.name || "Acordo Comercial Direto";

    if (!storeMap[storeId]) {
      storeMap[storeId] = {
        storeId,
        storeName,
        logoUrl: c.store?.logo_url,
        totalIssuedCents: 0,
        totalOverdueCents: 0,
        activeCarnesCount: 0,
        pendingConciliationCount: 0,
      };
    }
    storeMap[storeId].totalIssuedCents += Number(c.total_cents || 0);
    if (c.status === "active") storeMap[storeId].activeCarnesCount++;

    (c.installments || []).forEach((inst: any) => {
      const amt = Number(inst.final_amount_cents || inst.original_amount_cents || inst.amount_cents || 0);
      const isPaid = inst.status === "paid";
      const isLate = !isPaid && new Date(inst.due_date) < now;

      if (!isPaid) {
        totalOutstandingCents += amt;
        if (isLate) {
          totalOverdueCents += amt;
          storeMap[storeId].totalOverdueCents += amt;
        }
        if (inst.conciliation_status === "pending") {
          pendingConciliationCount++;
          storeMap[storeId].pendingConciliationCount++;
        }
      }
    });
  });

  const globalDefaultRatePercent =
    totalOutstandingCents > 0
      ? Math.min(100, Math.round((totalOverdueCents / totalOutstandingCents) * 100))
      : 0;

  const storeRankings = Object.values(storeMap).sort(
    (a: any, b: any) => b.totalOverdueCents - a.totalOverdueCents,
  );

  return {
    totalIssuedCents,
    totalSettledCents,
    totalOutstandingCents,
    totalOverdueCents,
    globalDefaultRatePercent,
    pendingConciliationCount,
    totalCarnesCount: carnes?.length || 0,
    storeRankings,
  };
});

export const forceMasterConciliation = createServerFn({ method: "POST" })
  .validator(
    z.object({
      installmentId: z.string().uuid(),
      action: z.enum(["force_approve", "force_reject", "reopen"]),
      finalAmountCents: z.number().int().min(0).optional(),
      reason: z.string().min(5, "Justificativa obrigatória da intervenção master"),
    }),
  )
  .handler(async ({ data: input }) => {
    const admin = await requirePlatformAdmin();
    const supabase = getServerClient();

    // 1. Obter parcela e carnê
    const { data: inst, error: instErr } = await supabase
      .from("receivable_installments")
      .select("*, receivable:receivable_id(*)")
      .eq("id", input.installmentId)
      .single();

    if (instErr || !inst) throw new Error("Parcela não encontrada.");
    const rec = inst.receivable as any;

    if (input.action === "force_approve") {
      const finalAmount = input.finalAmountCents || inst.final_amount_cents || inst.original_amount_cents || inst.amount_cents;
      const { data: rpcRes, error: rpcErr } = await supabase.rpc("approve_installment_conciliation", {
        p_installment_id: inst.id,
        p_approved_by: admin.id,
        p_final_amount_cents: finalAmount,
        p_payment_method: "pix",
        p_notes: `[INTERVENÇÃO MASTER ADMIN] ${input.reason}`,
      });

      if (rpcErr) throw new Error("Erro na aprovação master: " + rpcErr.message);

      // Log de intervenção
      await supabase.from("receivable_adjustment_log").insert({
        receivable_id: rec.id,
        installment_id: inst.id,
        adjusted_by: admin.id,
        adjustment_type: "manual_override",
        previous_amount_cents: inst.final_amount_cents || inst.original_amount_cents,
        new_amount_cents: finalAmount,
        reason: `[INTERVENÇÃO SUPER-ADMIN MASTER] ${input.reason}`,
      });

      // Notificar cliente e credor
      await supabase.from("notifications").insert([
        {
          user_id: rec.debtor_id,
          type: "master_conciliation_approved",
          title: "Intervenção Master: Parcela Liquidada",
          message: `O Administrador Master da plataforma aprovou a quitação da Parcela ${inst.installment_number} de "${rec.title}". Motivo: ${input.reason}`,
          link_url: "/conta/carnes",
        },
        {
          user_id: rec.creditor_id,
          type: "master_conciliation_approved",
          title: "Intervenção Master: Parcela Liquidada",
          message: `A administração da plataforma liquidou a Parcela ${inst.installment_number} de "${rec.title}". Justificativa: ${input.reason}`,
          link_url: "/workspace/financeiro/recebiveis",
        },
      ]);

      return { success: true, action: "force_approve", result: rpcRes };
    } else if (input.action === "force_reject") {
      await supabase
        .from("receivable_installments")
        .update({
          conciliation_status: "rejected",
          conciliation_notes: `[RECUSA MASTER ADMIN] ${input.reason}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", inst.id);

      await supabase.from("receivable_adjustment_log").insert({
        receivable_id: rec.id,
        installment_id: inst.id,
        adjusted_by: admin.id,
        adjustment_type: "rejected_reopen",
        previous_amount_cents: inst.final_amount_cents || inst.original_amount_cents,
        new_amount_cents: inst.final_amount_cents || inst.original_amount_cents,
        reason: `[RECUSA MASTER ADMIN] ${input.reason}`,
      });

      return { success: true, action: "force_reject" };
    } else {
      // Reopen
      await supabase
        .from("receivable_installments")
        .update({
          status: "pending",
          conciliation_status: "none",
          conciliation_notes: `[REABERTO MASTER] ${input.reason}`,
          paid_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", inst.id);

      return { success: true, action: "reopen" };
    }
  });

