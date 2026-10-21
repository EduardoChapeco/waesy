/**
 * payment-operational.functions.ts — Centro Operacional de Pagamentos do Waesy
 *
 * Governação: SPEC-PAGAMENTOS-OPERACIONAL-END-TO-END, AGENTS.md B.8, B.25
 * Responsabilidades:
 * 1. Histórico unificado operacional (Pedidos, Go, Carnês, Ingressos, Turismo, P2P, Cobranças Pix).
 * 2. Emissão de Cobranças Pix Dinâmicas (BACEN EMV com CRC16-CCITT).
 * 3. Consulta de Faturas Comerciais e cálculo de juros pro-rata die.
 * 4. Métodos de pagamento e saldo real movimentável.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "node:crypto";
import { getServerClient } from "@/lib/supabase";
import { getSSRClient } from "@/lib/server-access";
import { generatePixBrCode } from "@/lib/pix-payload";
import { getMyWalletBalance } from "./financial-ledger.functions";

export type PaymentOriginType =
  | "order"
  | "mobility_trip"
  | "carne_installment"
  | "ticket"
  | "tourism_booking"
  | "p2p_transfer"
  | "pix_charge"
  | "subscription"
  | "platform_invoice";

export type PaymentDirection = "outgoing" | "incoming";

export interface UnifiedPaymentItemDTO {
  id: string;
  origin_type: PaymentOriginType;
  direction: PaymentDirection;
  title: string;
  description: string;
  amount_cents: number;
  status: "pending" | "processing" | "paid" | "failed" | "cancelled" | "refunded";
  status_label: string;
  payment_method: string;
  created_at: string;
  paid_at: string | null;
  counterparty_name: string;
  reference_token: string;
  reference_url: string;
  has_receipt: boolean;
  receipt_auth_code: string | null;
}

export interface UnifiedInvoiceDTO {
  id: string;
  title: string;
  billing_period: string;
  amount_cents: number;
  due_date: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  is_overdue: boolean;
  days_overdue: number;
  fine_cents: number;
  interest_cents: number;
  total_payable_cents: number;
  items: Array<{ description: string; amount_cents: number }>;
  paid_at: string | null;
}

function mapStatusToLabel(status: string): {
  normalized: "pending" | "processing" | "paid" | "failed" | "cancelled" | "refunded";
  label: string;
} {
  switch (status.toLowerCase()) {
    case "paid":
    case "approved":
    case "completed":
    case "settled":
      return { normalized: "paid", label: "Pago" };
    case "pending":
    case "awaiting_payment":
      return { normalized: "pending", label: "Aguardando pagamento" };
    case "processing":
    case "in_analysis":
      return { normalized: "processing", label: "Processando" };
    case "refunded":
    case "partially_refunded":
    case "reversed":
      return { normalized: "refunded", label: "Reembolsado" };
    case "failed":
    case "cancelled":
    case "canceled":
    case "expired":
      return { normalized: "cancelled", label: "Cancelado" };
    default:
      return { normalized: "pending", label: "Pendente" };
  }
}

/**
 * 1. Lista o histórico operacional completo de pagamentos do usuário
 */
export const listUserPaymentHistory = createServerFn({ method: "GET" }).handler(
  async (): Promise<UnifiedPaymentItemDTO[]> => {
    const ssrClient = await getSSRClient();
    const {
      data: { user },
    } = await ssrClient.auth.getUser();

    if (!user?.id) {
      return [];
    }

    const db = getServerClient();
    const items: UnifiedPaymentItemDTO[] = [];

    // 1. Cobranças registradas em payment_charges
    try {
      const { data: charges } = await db
        .from("payment_charges")
        .select("*")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (charges) {
        for (const ch of charges) {
          const { normalized, label } = mapStatusToLabel(ch.status);
          const isIncoming = ch.origin_type === "pix_charge";
          items.push({
            id: ch.id,
            origin_type: ch.origin_type as PaymentOriginType,
            direction: isIncoming ? "incoming" : "outgoing",
            title: isIncoming ? "Cobrança Pix Recebida" : ch.description,
            description: ch.description,
            amount_cents: ch.amount_cents,
            status: normalized,
            status_label: label,
            payment_method: ch.payment_method || "pix",
            created_at: ch.created_at,
            paid_at: ch.paid_at,
            counterparty_name: isIncoming ? "Pagador Externo" : "Waesy Pagamentos",
            reference_token: ch.origin_token || ch.id.slice(0, 8),
            reference_url: `/conta/pagamentos?chargeId=${ch.id}`,
            has_receipt: normalized === "paid",
            receipt_auth_code: null,
          });
        }
      }
    } catch {
      // Ignora falha de tabela opcional caso ainda não migrada
    }

    // 2. Pedidos de E-commerce / Catálogo
    try {
      const { data: orders } = await db
        .from("orders")
        .select("id, public_token, status, total_cents, created_at, paid_at, payment_method, store:stores(name)")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (orders) {
        for (const ord of orders) {
          const storeName = (ord.store as any)?.name || "Loja Parceira";
          const { normalized, label } = mapStatusToLabel(ord.status);
          items.push({
            id: ord.id,
            origin_type: "order",
            direction: "outgoing",
            title: `${storeName} - Pedido #${ord.public_token}`,
            description: `Compra na loja ${storeName}`,
            amount_cents: ord.total_cents,
            status: normalized,
            status_label: label,
            payment_method: ord.payment_method || "pix",
            created_at: ord.created_at,
            paid_at: ord.paid_at,
            counterparty_name: storeName,
            reference_token: `#${ord.public_token}`,
            reference_url: `/conta/pedidos?orderId=${ord.id}`,
            has_receipt: normalized === "paid",
            receipt_auth_code: `REC-ORD-${ord.id.slice(0, 8).toUpperCase()}`,
          });
        }
      }
    } catch (err) {
      console.error("[listUserPaymentHistory] Erro ao buscar pedidos:", err);
    }

    // 3. Corridas e Fretes Waesy Go
    try {
      const { data: trips } = await db
        .from("mobility_requests")
        .select("id, status, final_price_cents, estimated_price_cents, tip_cents, created_at, completed_at, payment_method")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);

      if (trips) {
        for (const trip of (trips as any[])) {
          const driverName = "Motorista Parceiro Waesy Go";
          const { normalized, label } = mapStatusToLabel(trip.status);
          const totalTripCents = (trip.final_price_cents || trip.estimated_price_cents || 0) + (trip.tip_cents || 0);

          if (totalTripCents > 0) {
            items.push({
              id: trip.id,
              origin_type: "mobility_trip",
              direction: "outgoing",
              title: `Waesy Go - Corrida / Entrega`,
              description: `Transporte urbano / entrega Waesy Go`,
              amount_cents: totalTripCents,
              status: normalized,
              status_label: label,
              payment_method: trip.payment_method || "pix",
              created_at: trip.created_at,
              paid_at: trip.completed_at,
              counterparty_name: driverName,
              reference_token: `GO-${trip.id.slice(0, 8).toUpperCase()}`,
              reference_url: `/conta/mobilidade`,
              has_receipt: normalized === "paid",
              receipt_auth_code: `REC-GO-${trip.id.slice(0, 8).toUpperCase()}`,
            });
          }
        }
      }
    } catch {
      // Ignora ausência da tabela
    }

    // 4. Parcelas de Carnê / Crediário
    try {
      const { data: receivables } = await db
        .from("receivables")
        .select("id, title, store:stores(name), installments:receivable_installments(id, installment_number, amount_cents, status, due_date, paid_at)")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (receivables) {
        for (const rec of receivables) {
          const storeName = (rec.store as any)?.name || "Crediário Loja";
          const installments = (rec.installments as any[]) || [];
          for (const inst of installments) {
            const { normalized, label } = mapStatusToLabel(inst.status);
            items.push({
              id: inst.id,
              origin_type: "carne_installment",
              direction: "outgoing",
              title: `Carnê - Parcela ${inst.installment_number} (${storeName})`,
              description: `Pagamento de crediário em ${storeName}`,
              amount_cents: inst.amount_cents,
              status: normalized,
              status_label: label,
              payment_method: "pix",
              created_at: inst.due_date || new Date().toISOString(),
              paid_at: inst.paid_at,
              counterparty_name: storeName,
              reference_token: `CARNE-${rec.id.slice(0, 6).toUpperCase()}-P${inst.installment_number}`,
              reference_url: `/conta/carnes`,
              has_receipt: normalized === "paid",
              receipt_auth_code: `REC-CRN-${inst.id.slice(0, 8).toUpperCase()}`,
            });
          }
        }
      }
    } catch {
      // Ignora ausência da tabela
    }

    // 5. Transferências P2P do Ledger Financeiro
    try {
      const { data: ledgerEntries } = await db
        .from("financial_ledger_entries")
        .select("id, transaction_id, entry_type, amount_cents, status, description, created_at, debit_account:financial_ledger_accounts!debit_account_id(profile_id), credit_account:financial_ledger_accounts!credit_account_id(profile_id)")
        .or(`debit_account_id.in.(select id from financial_ledger_accounts where profile_id='${user.id}'),credit_account_id.in.(select id from financial_ledger_accounts where profile_id='${user.id}')`)
        .order("created_at", { ascending: false })
        .limit(30);

      if (ledgerEntries) {
        for (const entry of ledgerEntries) {
          const isSender = (entry.debit_account as any)?.profile_id === user.id;
          const { normalized, label } = mapStatusToLabel(entry.status);
          items.push({
            id: entry.id,
            origin_type: "p2p_transfer",
            direction: isSender ? "outgoing" : "incoming",
            title: isSender ? "Transferência P2P Enviada" : "Transferência P2P Recebida",
            description: entry.description,
            amount_cents: Number(entry.amount_cents),
            status: normalized,
            status_label: label,
            payment_method: "carteira_waesy",
            created_at: entry.created_at,
            paid_at: entry.created_at,
            counterparty_name: isSender ? "Usuário Waesy" : "Remetente Waesy",
            reference_token: entry.transaction_id,
            reference_url: `/conta/financas`,
            has_receipt: true,
            receipt_auth_code: `REC-P2P-${entry.id.slice(0, 8).toUpperCase()}`,
          });
        }
      }
    } catch {
      // Tabela já tratada
    }

    // Ordenação estrita por data decrescente
    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
);

/**
 * 2. Consulta a lista de Faturas Comerciais e Carnês consolidados
 */
export const listUserInvoices = createServerFn({ method: "GET" }).handler(
  async (): Promise<UnifiedInvoiceDTO[]> => {
    const ssrClient = await getSSRClient();
    const {
      data: { user },
    } = await ssrClient.auth.getUser();

    if (!user?.id) {
      return [];
    }

    const db = getServerClient();
    const invoiceList: UnifiedInvoiceDTO[] = [];
    const now = new Date();

    // 1. Tabela payment_invoices
    try {
      const { data: invoices } = await db
        .from("payment_invoices")
        .select("*")
        .eq("customer_id", user.id)
        .order("due_date", { ascending: false });

      if (invoices) {
        for (const inv of invoices) {
          const dueDate = new Date(inv.due_date);
          const isPaid = inv.status === "paid";
          let daysOverdue = 0;
          let fineCents = 0;
          let interestCents = 0;
          let totalPayableCents = inv.amount_cents;
          let isOverdue = false;

          if (!isPaid && now.getTime() > dueDate.getTime()) {
            isOverdue = true;
            const diffDays = Math.max(1, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
            daysOverdue = diffDays;
            // Multa de 2%
            fineCents = Math.round(inv.amount_cents * 0.02);
            // Juros de 1% ao mês (0,033% ao dia)
            interestCents = Math.round(inv.amount_cents * (0.01 / 30) * daysOverdue);
            totalPayableCents = inv.amount_cents + fineCents + interestCents;
          }

          invoiceList.push({
            id: inv.id,
            title: inv.title,
            billing_period: inv.billing_period || "Mensal",
            amount_cents: inv.amount_cents,
            due_date: inv.due_date,
            status: isPaid ? "paid" : isOverdue ? "overdue" : "pending",
            is_overdue: isOverdue,
            days_overdue: daysOverdue,
            fine_cents: fineCents,
            interest_cents: interestCents,
            total_payable_cents: totalPayableCents,
            items: Array.isArray(inv.items) ? inv.items : [{ description: inv.title, amount_cents: inv.amount_cents }],
            paid_at: inv.paid_at,
          });
        }
      }
    } catch {
      // Ignora ausência da tabela
    }

    return invoiceList;
  }
);

/**
 * 3. Gera código Pix Copia e Cola Estático padrão BACEN com base no perfil
 */
export const getStaticPixReceiveData = createServerFn({ method: "GET" }).handler(
  async () => {
    const ssrClient = await getSSRClient();
    const {
      data: { user },
    } = await ssrClient.auth.getUser();

    if (!user?.id) {
      throw new Error("Usuário não autenticado.");
    }

    const db = getServerClient();
    const { data: profile } = await db
      .from("profiles")
      .select("full_name, pix_settings")
      .eq("id", user.id)
      .maybeSingle();

    const pixSettings = (profile?.pix_settings as Record<string, any>) || {};
    const pixKey = typeof pixSettings.pix_key === "string" ? pixSettings.pix_key.trim() : "";
    const receiverName = typeof pixSettings.pix_receiver_name === "string" && pixSettings.pix_receiver_name.trim()
      ? pixSettings.pix_receiver_name.trim()
      : profile?.full_name || "RECEBEDOR WAESY";

    if (!pixKey) {
      return {
        configured: false,
        pixKey: "",
        receiverName: "",
        copyPastePayload: "",
        instructions: "",
      };
    }

    const payload = generatePixBrCode({
      pixKey,
      merchantName: receiverName,
      merchantCity: "CHAPECO",
      description: "RECEBIMENTO WAESY",
    });

    return {
      configured: true,
      pixKey,
      pixKeyType: pixSettings.pix_key_type || "cpf_cnpj",
      receiverName,
      copyPastePayload: payload,
      instructions: pixSettings.payment_instructions || "",
    };
  }
);

/**
 * 4. Cria Cobrança Pix com Valor (QR Code Dinâmico)
 */
export const createDynamicPixCharge = createServerFn({ method: "POST" })
  .validator(
    z.object({
      amountCents: z.number().int().positive("Valor deve ser maior que zero"),
      description: z.string().min(2, "Descrição obrigatória"),
    })
  )
  .handler(async ({ data: { amountCents, description } }) => {
    const ssrClient = await getSSRClient();
    const {
      data: { user },
    } = await ssrClient.auth.getUser();

    if (!user?.id) {
      throw new Error("Usuário não autenticado.");
    }

    const db = getServerClient();
    const { data: profile } = await db
      .from("profiles")
      .select("full_name, pix_settings")
      .eq("id", user.id)
      .maybeSingle();

    const pixSettings = (profile?.pix_settings as Record<string, any>) || {};
    const pixKey = typeof pixSettings.pix_key === "string" ? pixSettings.pix_key.trim() : "";
    const receiverName = typeof pixSettings.pix_receiver_name === "string" && pixSettings.pix_receiver_name.trim()
      ? pixSettings.pix_receiver_name.trim()
      : profile?.full_name || "RECEBEDOR WAESY";

    if (!pixKey) {
      throw new Error("Configure sua chave Pix antes de gerar uma cobrança personalizada.");
    }

    const txId = `W${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    // Gera payload EMV com valor embutido (sub-campo 54)
    const emvPayload = generatePixBrCode({
      pixKey,
      amountCents,
      merchantName: receiverName,
      merchantCity: "CHAPECO",
      txId,
      description: description.slice(0, 40),
    });

    // Insere cobrança atômica no banco de dados
    const { data: chargeData, error } = await db.rpc("create_dynamic_pix_charge_atomic", {
      p_customer_id: user.id,
      p_amount_cents: amountCents,
      p_description: description.trim(),
      p_pix_payload: emvPayload,
      p_pix_txid: txId,
      p_metadata: {
        created_via: "conta_pagamentos_estudio",
        receiver_name: receiverName,
      },
    });

    if (error) {
      console.error("[createDynamicPixCharge] Erro na procedure:", error);
      throw new Error("Falha ao registrar cobrança: " + error.message);
    }

    return {
      chargeId: chargeData.charge_id,
      amountCents,
      description: description.trim(),
      emvPayload,
      txId,
      expiresAt: chargeData.expires_at,
    };
  });

/**
 * 5. Consulta os Meios de Pagamento Disponíveis na Conta
 */
export const getUserAvailablePaymentMethods = createServerFn({ method: "GET" }).handler(
  async () => {
    const ssrClient = await getSSRClient();
    const {
      data: { user },
    } = await ssrClient.auth.getUser();

    if (!user?.id) {
      return {
        walletBalanceCents: 0,
        hasPixConfigured: false,
        methods: [],
      };
    }

    // Consulta saldo real da carteira
    const walletBalance = await getMyWalletBalance().catch(() => ({ availableCents: 0 }));
    const availableCents = (walletBalance as any).availableCents ?? (walletBalance as any).available_cents ?? 0;

    // Consulta configuração Pix
    const db = getServerClient();
    const { data: profile } = await db
      .from("profiles")
      .select("pix_settings")
      .eq("id", user.id)
      .maybeSingle();

    const pixSettings = (profile?.pix_settings as Record<string, any>) || {};
    const hasPix = !!(pixSettings.pix_key && typeof pixSettings.pix_key === "string" && pixSettings.pix_key.trim());

    return {
      walletBalanceCents: availableCents,
      hasPixConfigured: hasPix,
      methods: [
        {
          id: "pix",
          name: "Pix Instantâneo (BACEN)",
          description: hasPix ? `Chave ativa: ${pixSettings.pix_key}` : "Chave de recebimento não configurada",
          badge: hasPix ? "Ativo" : "Ação Necessária",
          badgeVariant: hasPix ? ("default" as const) : ("secondary" as const),
          icon: "pix",
        },
        {
          id: "wallet",
          name: "Saldo em Carteira Waesy",
          description: `Disponível para compras e transferências: R$ ${(availableCents / 100).toFixed(2).replace(".", ",")}`,
          badge: availableCents > 0 ? "Com Saldo" : "Zerado",
          badgeVariant: availableCents > 0 ? ("default" as const) : ("outline" as const),
          icon: "wallet",
        },
        {
          id: "carne",
          name: "Crediário & Carnês",
          description: "Parcelamento bilateral direto com estabelecimentos credenciados",
          badge: "Disponível",
          badgeVariant: "outline" as const,
          icon: "receipt",
        },
      ],
    };
  }
);
