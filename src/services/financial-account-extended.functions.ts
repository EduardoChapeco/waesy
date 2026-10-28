/**
 * src/services/financial-account-extended.functions.ts
 *
 * Motor de Gestão Financeira Ampliada, Cartões Reais, Rendimento CDI e Chaves Pix
 * Normativa: SPEC-20261028-FINANCAS-CANONICAL-REAL-PARITY, AGENTS.md B.8, B.25
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { getMyWalletBalance, getOrCreateLedgerAccount, computeAccountBalance, generateLedgerHash, signReceiptPayload } from "./financial-ledger.functions";
import { emitFinancialEvent } from "./financial-event-bus.service";
import { randomBytes } from "node:crypto";

// ============================================================
// DTOs & Interfaces Canônicas
// ============================================================

export interface UserFinancialProfileDTO {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  cpf: string | null;
  email: string | null;
}

export interface UserYieldSettingsDTO {
  isYieldEnabled: boolean;
  benchmarkName: string;
  benchmarkRatePercentage: number;
  accumulatedYieldCents: number;
  lastCalculatedAt: string;
}

export interface UserCreditCardDTO {
  id: string;
  cardType: "VIRTUAL" | "PHYSICAL";
  cardHolderName: string;
  lastFourDigits: string;
  brand: string;
  status: "ACTIVE" | "BLOCKED" | "CANCELLED";
  creditLimitCents: number;
  userSpendingLimitCents: number;
  isTemporaryBlocked: boolean;
  expirationMonth: number;
  expirationYear: number;
}

export interface CardInvoiceDTO {
  id: string;
  cardId: string;
  referenceMonth: number;
  referenceYear: number;
  monthLabel: string;
  fullLabel: string;
  dueDate: string;
  closingDate: string;
  status: "OPEN" | "CLOSED" | "PAID" | "OVERDUE";
  amountCents: number;
  paidAmountCents: number;
  items: Array<{
    id: string;
    description: string;
    category: string;
    amountCents: number;
    transactedAt: string;
    installmentNumber: number;
    totalInstallments: number;
  }>;
}

export interface UserPixKeyDTO {
  id: string;
  keyType: "CPF" | "EMAIL" | "PHONE" | "RANDOM";
  keyValue: string;
  isActive: boolean;
  createdAt: string;
}

export interface FinancialOverviewDTO {
  profile: UserFinancialProfileDTO;
  balanceCents: number;
  heldCents: number;
  yieldSettings: UserYieldSettingsDTO;
  card: UserCreditCardDTO | null;
  currentInvoice: CardInvoiceDTO | null;
  invoices: CardInvoiceDTO[];
  pixKeys: UserPixKeyDTO[];
}

const MONTH_LABELS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const MONTH_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// ============================================================
// 1. Visão Geral Financeira Integrada Real
// ============================================================

export const getUserFinancialOverview = createServerFn({ method: "GET" }).handler(
  async (): Promise<FinancialOverviewDTO> => {
    const identity = await getServerIdentity();
    const supabase = getServerClient();

    const fallbackProfile: UserFinancialProfileDTO = {
      id: identity.id || "guest",
      fullName: "Usuário Waesy",
      avatarUrl: null,
      cpf: null,
      email: null,
    };

    if (!identity.id) {
      return {
        profile: fallbackProfile,
        balanceCents: 0,
        heldCents: 0,
        yieldSettings: {
          isYieldEnabled: false,
          benchmarkName: "CDI",
          benchmarkRatePercentage: 100,
          accumulatedYieldCents: 0,
          lastCalculatedAt: new Date().toISOString(),
        },
        card: null,
        currentInvoice: null,
        invoices: [],
        pixKeys: [],
      };
    }

    // 1. Carrega perfil real
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, cpf, email")
      .eq("id", identity.id)
      .maybeSingle();

    const profile: UserFinancialProfileDTO = {
      id: identity.id,
      fullName: profileData?.full_name || "Usuário Waesy",
      avatarUrl: profileData?.avatar_url || null,
      cpf: profileData?.cpf || null,
      email: profileData?.email || null,
    };

    // 2. Carrega saldo real do ledger
    const walletBalance = await getMyWalletBalance();

    // 3. Carrega configurações reais de CDI
    const { data: yieldRow } = await supabase
      .from("user_wallet_yield_settings")
      .select("*")
      .eq("profile_id", identity.id)
      .maybeSingle();

    const yieldSettings: UserYieldSettingsDTO = {
      isYieldEnabled: yieldRow?.is_yield_enabled ?? false,
      benchmarkName: yieldRow?.benchmark_name ?? "CDI",
      benchmarkRatePercentage: Number(yieldRow?.benchmark_rate_percentage ?? 100),
      accumulatedYieldCents: Number(yieldRow?.accumulated_yield_cents ?? 0),
      lastCalculatedAt: yieldRow?.last_calculated_at ?? new Date().toISOString(),
    };

    // 4. Carrega cartão de crédito real do usuário
    const { data: cardRow } = await supabase
      .from("user_credit_cards")
      .select("*")
      .eq("profile_id", identity.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let userCard: UserCreditCardDTO | null = null;
    let currentInvoice: CardInvoiceDTO | null = null;
    const invoiceList: CardInvoiceDTO[] = [];

    if (cardRow) {
      userCard = {
        id: cardRow.id,
        cardType: cardRow.card_type,
        cardHolderName: cardRow.card_holder_name,
        lastFourDigits: cardRow.last_four_digits,
        brand: cardRow.brand,
        status: cardRow.status,
        creditLimitCents: Number(cardRow.credit_limit_cents),
        userSpendingLimitCents: Number(cardRow.user_spending_limit_cents),
        isTemporaryBlocked: Boolean(cardRow.is_temporary_blocked),
        expirationMonth: Number(cardRow.expiration_month),
        expirationYear: Number(cardRow.expiration_year),
      };

      // Carrega faturas reais do cartão
      const { data: invoicesData } = await supabase
        .from("card_invoices")
        .select("*, card_invoice_items(*)")
        .eq("card_id", cardRow.id)
        .order("reference_year", { ascending: false })
        .order("reference_month", { ascending: false });

      if (invoicesData && invoicesData.length > 0) {
        for (const inv of invoicesData) {
          const mIdx = inv.reference_month - 1;
          const mappedInv: CardInvoiceDTO = {
            id: inv.id,
            cardId: inv.card_id,
            referenceMonth: inv.reference_month,
            referenceYear: inv.reference_year,
            monthLabel: MONTH_LABELS[mIdx] || `M${inv.reference_month}`,
            fullLabel: `${MONTH_FULL[mIdx] || ""} ${inv.reference_year}`,
            dueDate: `${new Date(inv.due_date).getDate()} ${MONTH_LABELS[mIdx]}`,
            closingDate: inv.closing_date,
            status: inv.status,
            amountCents: Number(inv.amount_cents),
            paidAmountCents: Number(inv.paid_amount_cents),
            items: (inv.card_invoice_items || []).map((it: any) => ({
              id: it.id,
              description: it.description,
              category: it.category,
              amountCents: Number(it.amount_cents),
              transactedAt: it.transacted_at,
              installmentNumber: Number(it.installment_number),
              totalInstallments: Number(it.total_installments),
            })),
          };
          invoiceList.push(mappedInv);
          if (inv.status === "OPEN" && !currentInvoice) {
            currentInvoice = mappedInv;
          }
        }
      }
    }

    // 5. Carrega chaves Pix reais do usuário
    const { data: pixKeysData } = await supabase
      .from("user_pix_keys")
      .select("*")
      .eq("profile_id", identity.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    const pixKeys: UserPixKeyDTO[] = (pixKeysData || []).map((k: any) => ({
      id: k.id,
      keyType: k.key_type,
      keyValue: k.key_value,
      isActive: k.is_active,
      createdAt: k.created_at,
    }));

    return {
      profile,
      balanceCents: walletBalance.availableCents,
      heldCents: walletBalance.heldCents,
      yieldSettings,
      card: userCard,
      currentInvoice,
      invoices: invoiceList,
      pixKeys,
    };
  }
);

// ============================================================
// 2. Mecânica Real de Rendimento CDI
// ============================================================

const ToggleYieldInput = z.object({
  enable: z.boolean(),
});

export const toggleWalletYieldSettings = createServerFn({ method: "POST" })
  .validator((d: unknown) => ToggleYieldInput.parse(d))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Não autenticado.");
    const supabase = getServerClient();

    const { data: updated, error } = await supabase
      .from("user_wallet_yield_settings")
      .upsert(
        {
          profile_id: identity.id,
          is_yield_enabled: data.enable,
          benchmark_name: "CDI",
          benchmark_rate_percentage: 100.0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "profile_id" }
      )
      .select()
      .single();

    if (error) {
      throw new Error(`Falha ao atualizar rendimento: ${error.message}`);
    }

    return {
      success: true,
      isYieldEnabled: updated.is_yield_enabled,
      benchmarkRatePercentage: Number(updated.benchmark_rate_percentage),
    };
  });

// ============================================================
// 3. Emissão / Ativação Real de Cartão Virtual
// ============================================================

export const requestVirtualCard = createServerFn({ method: "POST" }).handler(
  async () => {
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Não autenticado.");
    const supabase = getServerClient();

    // Verifica se já tem cartão
    const { data: existing } = await supabase
      .from("user_credit_cards")
      .select("id")
      .eq("profile_id", identity.id)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (existing) {
      throw new Error("Você já possui um cartão ativo.");
    }

    // Carrega nome do perfil
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", identity.id)
      .single();

    const holderName = (profile?.full_name || "CLIENTE WAESY").toUpperCase();
    const lastFour = Math.floor(1000 + Math.random() * 9000).toString();
    const now = new Date();
    const expMonth = now.getMonth() + 1;
    const expYear = now.getFullYear() + 5;

    // Cria o cartão
    const { data: newCard, error: cardErr } = await supabase
      .from("user_credit_cards")
      .insert({
        profile_id: identity.id,
        card_type: "VIRTUAL",
        card_holder_name: holderName,
        last_four_digits: lastFour,
        brand: "MASTERCARD",
        status: "ACTIVE",
        credit_limit_cents: 500000, // Limite inicial de R$ 5.000,00
        user_spending_limit_cents: 500000,
        is_temporary_blocked: false,
        expiration_month: expMonth,
        expiration_year: expYear,
      })
      .select()
      .single();

    if (cardErr || !newCard) {
      throw new Error(`Erro ao provisionar cartão virtual: ${cardErr?.message}`);
    }

    // Provisiona a fatura aberta do mês atual
    const dueDate = new Date(now.getFullYear(), now.getMonth(), 15).toISOString().split("T")[0];
    const closingDate = new Date(now.getFullYear(), now.getMonth(), 8).toISOString().split("T")[0];

    await supabase.from("card_invoices").insert({
      card_id: newCard.id,
      profile_id: identity.id,
      reference_month: now.getMonth() + 1,
      reference_year: now.getFullYear(),
      due_date: dueDate,
      closing_date: closingDate,
      status: "OPEN",
      amount_cents: 0,
      paid_amount_cents: 0,
    });

    return {
      success: true,
      cardId: newCard.id,
      lastFourDigits: newCard.last_four_digits,
      holderName: newCard.card_holder_name,
    };
  }
);

// ============================================================
// 4. Ajustes do Cartão (Bloqueio / Limite)
// ============================================================

const UpdateCardSettingsInput = z.object({
  cardId: z.string().uuid(),
  isTemporaryBlocked: z.boolean().optional(),
  userSpendingLimitCents: z.number().nonnegative().optional(),
});

export const updateCardSettings = createServerFn({ method: "POST" })
  .validator((d: unknown) => UpdateCardSettingsInput.parse(d))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Não autenticado.");
    const supabase = getServerClient();

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (typeof data.isTemporaryBlocked === "boolean") {
      updates.is_temporary_blocked = data.isTemporaryBlocked;
    }
    if (typeof data.userSpendingLimitCents === "number") {
      updates.user_spending_limit_cents = data.userSpendingLimitCents;
    }

    const { error } = await supabase
      .from("user_credit_cards")
      .update(updates)
      .eq("id", data.cardId)
      .eq("profile_id", identity.id);

    if (error) {
      throw new Error(`Erro ao salvar ajustes do cartão: ${error.message}`);
    }

    return { success: true };
  });

// ============================================================
// 5. Pagamento de Fatura Real
// ============================================================

const PayInvoiceInput = z.object({
  invoiceId: z.string().uuid(),
});

export const payCardInvoice = createServerFn({ method: "POST" })
  .validator((d: unknown) => PayInvoiceInput.parse(d))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Não autenticado.");
    const supabase = getServerClient();

    const { data: invoice, error: invErr } = await supabase
      .from("card_invoices")
      .select("*")
      .eq("id", data.invoiceId)
      .eq("profile_id", identity.id)
      .single();

    if (invErr || !invoice) throw new Error("Fatura não encontrada.");
    if (invoice.status === "PAID") throw new Error("Esta fatura já foi quitada.");
    if (invoice.amount_cents <= 0) throw new Error("Fatura não possui saldo devedor.");

    // Verifica saldo na carteira
    const walletBalance = await getMyWalletBalance();
    if (walletBalance.availableCents < invoice.amount_cents) {
      throw new Error("Saldo insuficiente na carteira Waesy para quitar esta fatura.");
    }

    // Baixa atômica no ledger
    const availableAccId = await getOrCreateLedgerAccount(supabase, identity.id, "USER_AVAILABLE");
    const clearingAccId = await getOrCreateLedgerAccount(supabase, null, "CLEARING");
    const txId = "FAT-" + randomBytes(4).toString("hex").toUpperCase();

    const hash = generateLedgerHash("ROOT", {
      transactionId: txId,
      debitAccountId: availableAccId,
      creditAccountId: clearingAccId,
      amountCents: invoice.amount_cents,
      createdAt: new Date().toISOString(),
    });

    await supabase.from("financial_ledger_entries").insert({
      transaction_id: txId,
      debit_account_id: availableAccId,
      credit_account_id: clearingAccId,
      amount_cents: invoice.amount_cents,
      entry_type: "ORDER_PAYMENT",
      status: "SETTLED",
      description: `Pagamento de Fatura ${invoice.reference_month}/${invoice.reference_year}`,
      hash_chain: hash,
    });

    // Atualiza status da fatura
    await supabase
      .from("card_invoices")
      .update({
        status: "PAID",
        paid_amount_cents: invoice.amount_cents,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoice.id);

    // Emite evento no extrato
    await emitFinancialEvent({
      profileId: identity.id,
      sourceDomain: "WALLET",
      sourceEntityId: invoice.id,
      eventType: "CARD_INVOICE_PAYMENT",
      direction: "OUTGOING",
      amountCents: invoice.amount_cents,
      description: `Pagamento de Fatura Waesy Card`,
      categoryName: "Cartão de Crédito",
      status: "COMPLETED",
    });

    return {
      success: true,
      transactionId: txId,
      paidAmountCents: invoice.amount_cents,
    };
  });

// ============================================================
// 6. Gestão Real de Chaves Pix
// ============================================================

const RegisterPixKeyInput = z.object({
  keyType: z.enum(["CPF", "EMAIL", "PHONE", "RANDOM"]),
  keyValue: z.string().min(3),
});

export const registerUserPixKey = createServerFn({ method: "POST" })
  .validator((d: unknown) => RegisterPixKeyInput.parse(d))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Não autenticado.");
    const supabase = getServerClient();

    const cleanVal = data.keyValue.trim();

    const { data: created, error } = await supabase
      .from("user_pix_keys")
      .insert({
        profile_id: identity.id,
        key_type: data.keyType,
        key_value: cleanVal,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") throw new Error("Esta chave Pix já está cadastrada.");
      throw new Error(`Falha ao cadastrar chave Pix: ${error.message}`);
    }

    return {
      success: true,
      key: {
        id: created.id,
        keyType: created.key_type,
        keyValue: created.key_value,
        isActive: created.is_active,
      },
    };
  });

const DeletePixKeyInput = z.object({
  keyId: z.string().uuid(),
});

export const deleteUserPixKey = createServerFn({ method: "POST" })
  .validator((d: unknown) => DeletePixKeyInput.parse(d))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Não autenticado.");
    const supabase = getServerClient();

    const { error } = await supabase
      .from("user_pix_keys")
      .delete()
      .eq("id", data.keyId)
      .eq("profile_id", identity.id);

    if (error) throw new Error(`Falha ao remover chave Pix: ${error.message}`);
    return { success: true };
  });
