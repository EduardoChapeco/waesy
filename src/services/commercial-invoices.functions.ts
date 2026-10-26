/**
 * commercial-invoices.functions.ts — BFF Server Functions para Faturas Comerciais e Bloco de Orçamento
 * 
 * Permite ao lojista, vendedor e atendente:
 * 1. Obter numeração sequencial contínua automática (#ORC-2026-0001, #FAT-2026-0001) por loja
 * 2. Criar e gerenciar faturas e orçamentos em formato bloco de papel A4
 * 3. Consultar faturas com acesso público seguro via public_token
 * 4. Converter orçamento em contrato digital na íntegra com 1 clique (ponte direta)
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, getAnonServerClient } from "@/lib/supabase";
import { requireStaff, getServerIdentity } from "@/lib/server-access";
import { interpolateContractVariables } from "@/lib/contracts/contract-semantic-dictionary";
import { ADVANCED_CONTRACT_TEMPLATES } from "@/lib/data/advanced-contract-templates";
import { formatMoney } from "@/lib/money";

// ─── Schemas Zod ─────────────────────────────────────────────────────────────

export const CommercialInvoiceItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Descrição do item é obrigatória"),
  sku: z.string().optional().default(""),
  unit: z.string().optional().default("un"),
  quantity: z.number().positive().default(1),
  unitPriceCents: z.number().int().nonnegative().default(0),
  discountCents: z.number().int().nonnegative().default(0),
  totalPriceCents: z.number().int().nonnegative().default(0),
  category: z.string().optional().default(""),
});

export const CommercialCustomerSnapshotSchema = z.object({
  name: z.string().min(2, "Nome do cliente é obrigatório"),
  companyName: z.string().optional().default(""),
  cpfOrCnpj: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  email: z.string().optional().default(""),
  address: z.string().optional().default(""),
  cityState: z.string().optional().default(""),
});

export type CommercialInvoiceItemDTO = z.infer<typeof CommercialInvoiceItemSchema>;
export type CommercialCustomerSnapshotDTO = z.infer<typeof CommercialCustomerSnapshotSchema>;

export interface CommercialInvoiceDTO {
  id: string;
  store_id: string;
  invoice_code: string;
  document_type: "budget" | "invoice" | "receipt" | "work_order";
  status: "draft" | "sent" | "approved" | "converted_to_contract" | "rejected" | "paid" | "cancelled";
  customer_id?: string | null;
  lead_id?: string | null;
  customer_snapshot: CommercialCustomerSnapshotDTO;
  items: CommercialInvoiceItemDTO[];
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  total_cents: number;
  payment_terms: Record<string, any>;
  notes?: string | null;
  valid_until?: string | null;
  public_token: string;
  contract_id?: string | null;
  converted_at?: string | null;
  issuer_snapshot?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export const CommercialPaymentTermsSchema = z.object({
  method: z.string().default("pix"),
  methodLabel: z.string().optional().default("PIX"),
  installmentsCount: z.number().int().min(1).max(24).optional().default(1),
  installmentValueCents: z.number().int().optional().default(0),
  notes: z.string().optional().default(""),
  pixKey: z.string().optional().default(""),
  paymentInstructions: z.string().optional().default(""),
  discountPercentage: z.number().optional().default(0),
  surchargePercentage: z.number().optional().default(0),
});

const createInvoiceSchema = z.object({
  storeId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional().nullable(),
  leadId: z.string().uuid().optional().nullable(),
  documentType: z.enum(["budget", "invoice", "receipt", "work_order"]).default("budget"),
  customer: CommercialCustomerSnapshotSchema,
  items: z.array(CommercialInvoiceItemSchema).min(1, "Adicione pelo menos um item ao bloco"),
  subtotalCents: z.number().int().nonnegative(),
  discountCents: z.number().int().nonnegative().default(0),
  shippingCents: z.number().int().nonnegative().default(0),
  totalCents: z.number().int().nonnegative(),
  paymentTerms: CommercialPaymentTermsSchema,
  notes: z.string().optional().default(""),
  validUntil: z.string().optional().nullable(),
});

// ─── 1. GERADOR DE SEQUÊNCIA CONTÍNUA ────────────────────────────────────────

export const getNextInvoiceSequence = createServerFn({ method: "POST" })
  .validator(
    z.object({
      documentType: z.enum(["budget", "invoice", "receipt", "work_order"]).default("budget"),
      storeId: z.string().uuid().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const documentType = data?.documentType || "budget";
    const identity = await requireStaff();
    const storeId = data?.storeId || identity.store_id;

    if (!storeId) {
      throw new Error("Loja não encontrada no contexto autenticado.");
    }

    const supabase = getServerClient();
    const { data: seqData, error } = await supabase.rpc(
      "get_next_commercial_invoice_number",
      {
        p_store_id: storeId,
        p_doc_type: documentType,
      },
    );

    if (error || !seqData || seqData.length === 0) {
      const year = new Date().getFullYear();
      const prefix = documentType === "invoice" ? "FAT" : documentType === "receipt" ? "REC" : "ORC";
      return {
        nextSeq: 1,
        nextCode: `#${prefix}-${year}-0001`,
      };
    }

    return {
      nextSeq: seqData[0].next_seq,
      nextCode: seqData[0].next_code,
    };
  });

// ─── 1.1 CONFIGURAÇÕES E FORMAS DE PAGAMENTO DA LOJA (SSOT) ──────────────────

export interface StoreCommercialPaymentConfig {
  storeId: string;
  pixKey: string;
  pixKeyType: string;
  paymentInstructions: string;
  paymentProcessingMode: "platform_gateway" | "direct_store";
  pixDiscountPercentage: number;
  maxInstallments: number;
  interestFreeInstallments: number;
  installmentInterestRate: number;
  availableMethods: Array<{
    id: string;
    label: string;
    type: "pix" | "boleto" | "cartao" | "dinheiro" | "carne" | "transferencia" | "custom";
    instructions?: string;
    discountPercentage?: number;
    surchargePercentage?: number;
  }>;
}

export const getStoreCommercialPaymentConfig = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid().optional(),
    }).optional(),
  )
  .handler(async ({ data }): Promise<StoreCommercialPaymentConfig> => {
    const identity = await requireStaff();
    const storeId = data?.storeId || identity.store_id;

    if (!storeId) {
      throw new Error("Loja não identificada.");
    }

    const supabase = getServerClient();

    // 1. Carrega dados e settings da loja
    const { data: store } = await supabase
      .from("stores")
      .select("id, name, cnpj, phone, pix_key, payment_instructions, settings")
      .eq("id", storeId)
      .maybeSingle();

    const settings = (store?.settings as Record<string, any>) || {};
    const paySettings = settings.payment_settings || {};

    const effectivePixKey = (
      store?.pix_key ||
      paySettings.pix_key ||
      store?.cnpj ||
      store?.phone ||
      ""
    ).trim();

    const maxInstallments = Number(paySettings.max_installments ?? 12);
    const interestFreeInstallments = Number(paySettings.interest_free_installments ?? 3);
    const installmentInterestRate = Number(paySettings.installment_interest_rate ?? 2.99);
    const pixDiscountPercentage = Number(paySettings.pix_discount_percentage ?? 0);
    const paymentInstructions = (store?.payment_instructions || paySettings.instructions || "").trim();

    // 2. Carrega formas manuais cadastradas ativas (maquininha na entrega, dinheiro com troco, crediário, etc.)
    const { data: manualMethods } = await supabase
      .from("manual_payment_methods")
      .select("id, name, instructions, surcharge_percentage, discount_percentage")
      .eq("store_id", storeId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    // 3. Monta catálogo canônico com base nas configurações reais
    const availableMethods: StoreCommercialPaymentConfig["availableMethods"] = [];

    // Pix Instantâneo (sempre disponível se houver chave cadastrada ou padrão de loja)
    availableMethods.push({
      id: "pix",
      label: pixDiscountPercentage > 0
        ? `PIX Instantâneo (${pixDiscountPercentage}% desc.)`
        : "PIX Instantâneo (À Vista)",
      type: "pix",
      instructions: paymentInstructions || (effectivePixKey ? `Chave Pix: ${effectivePixKey}` : undefined),
      discountPercentage: pixDiscountPercentage,
    });

    // Cartão de Crédito com regras reais de parcelamento
    availableMethods.push({
      id: "cartao",
      label: `Cartão de Crédito (até ${maxInstallments}x)`,
      type: "cartao",
      instructions: interestFreeInstallments > 1
        ? `Até ${interestFreeInstallments}x sem juros.`
        : undefined,
    });

    // Boleto Bancário
    availableMethods.push({
      id: "boleto",
      label: "Boleto Bancário (À Vista)",
      type: "boleto",
      instructions: "Vencimento em até 3 dias úteis após emissão.",
    });

    // Métodos manuais / customizados configurados pelo lojista
    if (manualMethods && manualMethods.length > 0) {
      for (const m of manualMethods) {
        const lowerName = m.name.toLowerCase();
        let derivedType: StoreCommercialPaymentConfig["availableMethods"][0]["type"] = "custom";
        if (lowerName.includes("dinheiro")) derivedType = "dinheiro";
        else if (lowerName.includes("carnê") || lowerName.includes("carne") || lowerName.includes("crediário")) derivedType = "carne";
        else if (lowerName.includes("transferência") || lowerName.includes("transferencia") || lowerName.includes("ted")) derivedType = "transferencia";
        else if (lowerName.includes("maquininha") || lowerName.includes("cartão") || lowerName.includes("cartao")) derivedType = "cartao";

        availableMethods.push({
          id: m.id,
          label: m.name,
          type: derivedType,
          instructions: m.instructions || undefined,
          discountPercentage: Number(m.discount_percentage || 0),
          surchargePercentage: Number(m.surcharge_percentage || 0),
        });
      }
    } else {
      // Defaults caso não tenha cadastrado manual ainda
      availableMethods.push(
        { id: "carne", label: "Carnê / Crediário Próprio", type: "carne" },
        { id: "dinheiro", label: "Dinheiro em Espécie", type: "dinheiro" },
      );
    }

    return {
      storeId,
      pixKey: effectivePixKey,
      pixKeyType: paySettings.pix_key_type || "cpf_cnpj",
      paymentInstructions,
      paymentProcessingMode: settings.payment_processing_mode || "platform_gateway",
      pixDiscountPercentage,
      maxInstallments,
      interestFreeInstallments,
      installmentInterestRate,
      availableMethods,
    };
  });

// ─── 2. CRIAÇÃO DE FATURA / BLOCO DE ORÇAMENTO ───────────────────────────────

export const createCommercialInvoice = createServerFn({ method: "POST" })
  .validator((data: unknown) => createInvoiceSchema.parse(data))
  .handler(async ({ data }) => {
    const identity = await requireStaff();
    const storeId = data.storeId || identity.store_id;

    if (!storeId) {
      throw new Error("Loja não associada.");
    }

    const supabase = getServerClient();

    // 1. Obter dados da loja para snapshot do emissor
    const { data: store } = await supabase
      .from("stores")
      .select("id, name, cnpj, phone, email, address, city, state, logo_url, pix_key, payment_instructions, settings")
      .eq("id", storeId)
      .maybeSingle();

    const storeSettings = (store?.settings as Record<string, any>) || {};
    const storePaySettings = storeSettings.payment_settings || {};

    const effectivePix = (
      data.paymentTerms.pixKey ||
      store?.pix_key ||
      storePaySettings.pix_key ||
      store?.cnpj ||
      store?.phone ||
      ""
    ).trim();

    const issuerSnapshot = {
      companyName: store?.name || "Empresa Parceira",
      tradingName: store?.name || "",
      cnpjOrCpf: store?.cnpj || "",
      address: store?.address || "",
      cityState: `${store?.city || ""} - ${store?.state || ""}`.trim(),
      phoneOrWhatsapp: store?.phone || "",
      email: store?.email || "",
      logoUrl: store?.logo_url || null,
      pixKey: effectivePix,
      paymentInstructions: store?.payment_instructions || storePaySettings.instructions || "",
    };

    // 2. Gerar próximo código contínuo seguro
    const { data: seqData } = await supabase.rpc(
      "get_next_commercial_invoice_number",
      {
        p_store_id: storeId,
        p_doc_type: data.documentType,
      },
    );

    const nextSeq = seqData?.[0]?.next_seq || 1;
    const nextCode =
      seqData?.[0]?.next_code ||
      `#${data.documentType === "invoice" ? "FAT" : "ORC"}-${new Date().getFullYear()}-${String(nextSeq).padStart(4, "0")}`;

    // 3. Persistir fatura comercial
    const { data: invoice, error: insertErr } = await supabase
      .from("commercial_invoices")
      .insert({
        store_id: storeId,
        creator_id: identity.id,
        customer_id: data.customerId || null,
        lead_id: data.leadId || null,
        invoice_code: nextCode,
        sequential_number: nextSeq,
        document_type: data.documentType,
        status: "draft",
        customer_snapshot: data.customer,
        issuer_snapshot: issuerSnapshot,
        items: data.items,
        subtotal_cents: data.subtotalCents,
        discount_cents: data.discountCents,
        shipping_cents: data.shippingCents,
        total_cents: data.totalCents,
        payment_terms: data.paymentTerms,
        notes: data.notes || null,
        valid_until: data.validUntil || null,
      })
      .select()
      .single();

    if (insertErr || !invoice) {
      console.error("[commercial-invoices] Error inserting invoice:", insertErr);
      throw new Error(`Falha ao registrar fatura/orçamento: ${insertErr?.message || "Erro desconhecido"}`);
    }

    return {
      success: true,
      invoice,
    };
  });

// ─── 3. LISTAGEM DE FATURAS DA LOJA ──────────────────────────────────────────

export const listCommercialInvoices = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        search: z.string().optional(),
        documentType: z.enum(["all", "budget", "invoice", "receipt", "work_order"]).optional().default("all"),
        status: z.string().optional().default("all"),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      })
      .optional(),
  )
  .handler(async ({ data }) => {
    const identity = await requireStaff();
    const storeId = identity.store_id;
    if (!storeId) throw new Error("Loja não associada.");

    const supabase = getServerClient();
    let query = supabase
      .from("commercial_invoices")
      .select("id, invoice_code, sequential_number, document_type, status, public_token, customer_snapshot, total_cents, valid_until, issued_at, contract_id, created_at", { count: "exact" })
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .range(data?.offset || 0, (data?.offset || 0) + (data?.limit || 50) - 1);

    if (data?.documentType && data.documentType !== "all") {
      query = query.eq("document_type", data.documentType);
    }
    if (data?.status && data.status !== "all") {
      query = query.eq("status", data.status);
    }
    if (data?.search && data.search.trim()) {
      const q = `%${data.search.trim()}%`;
      query = query.or(`invoice_code.ilike.${q},customer_snapshot->>name.ilike.${q},customer_snapshot->>cpfOrCnpj.ilike.${q}`);
    }

    const { data: invoices, error, count } = await query;
    if (error) {
      throw new Error(`Erro ao listar faturas: ${error.message}`);
    }

    return {
      invoices: invoices || [],
      total: count || 0,
    };
  });

// ─── 4. CONSULTA PÚBLICA POR TOKEN (SEM LOGIN) ────────────────────────────────

export const getCommercialInvoiceByPublicToken = createServerFn({ method: "GET" })
  .validator(z.object({ token: z.string().min(16).max(200) }))
  .handler(async ({ data }) => {
    const token = data.token.trim();
    const supabase = getAnonServerClient();

    const { data: invoice, error } = await supabase
      .from("commercial_invoices")
      .select("*")
      .eq("public_token", token)
      .maybeSingle();

    if (error || !invoice) {
      throw new Error("Fatura ou orçamento não encontrado.");
    }

    let contractSigningToken: string | null = null;
    let contractVerificationCode: string | null = null;

    if (invoice.contract_id) {
      const { data: contract } = await supabase
        .from("contracts")
        .select(`
          verification_code,
          versions:contract_versions (
            envelopes:signature_envelopes (signing_token, status)
          )
        `)
        .eq("id", invoice.contract_id)
        .maybeSingle();

      if (contract) {
        contractVerificationCode = contract.verification_code || null;
        const versions = (contract.versions || []) as any[];
        const latestVersion = versions[0];
        const envelopes = (latestVersion?.envelopes || []) as any[];
        const pendingOrSent =
          envelopes.find((e: any) => e.status === "pending" || e.status === "sent") ||
          envelopes[0];
        if (pendingOrSent?.signing_token) {
          contractSigningToken = pendingOrSent.signing_token;
        }
      }
    }

    return {
      invoice,
      contractSigningToken,
      contractVerificationCode,
    };
  });

// ─── 5. PONTE DIRETA: CONVERTER FATURA EM CONTRATO DIGITAL ────────────────────

export const convertInvoiceToContract = createServerFn({ method: "POST" })
  .validator(
    z.object({
      invoiceId: z.string().uuid(),
      templateId: z.string().optional().default("template-prestacao-servicos"),
      customTitle: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await requireStaff();
    const storeId = identity.store_id;
    if (!storeId) throw new Error("Loja não associada.");

    const supabase = getServerClient();

    // 1. Carregar a fatura
    const { data: invoice, error: invErr } = await supabase
      .from("commercial_invoices")
      .select("*")
      .eq("id", data.invoiceId)
      .eq("store_id", storeId)
      .single();

    if (invErr || !invoice) {
      throw new Error("Fatura comercial não encontrada.");
    }

    const customer = (invoice.customer_snapshot as Record<string, any>) || {};
    const issuer = (invoice.issuer_snapshot as Record<string, any>) || {};
    const items = (Array.isArray(invoice.items) ? invoice.items : []) as Array<Record<string, any>>;

    // 2. Localizar template jurídico
    const template =
      ADVANCED_CONTRACT_TEMPLATES.find((t) => t.id === data.templateId) ||
      ADVANCED_CONTRACT_TEMPLATES[0];

    // 3. Montar descrição dos itens e tabela Markdown
    const itemsDescription = items
      .map(
        (it) =>
          `• ${it.quantity || 1}x ${it.title || "Item"} (${it.unit || "un"}) — ${formatMoney(Number(it.unitPriceCents || 0))} cada (Total: ${formatMoney(Number(it.totalPriceCents || 0))})`,
      )
      .join("\n");

    const itemsTable = [
      "| Item / Descrição | Qtd | Un | Valor Unit. | Total |",
      "| :--- | :---: | :---: | :---: | :---: |",
      ...items.map(
        (it) =>
          `| ${it.title || "Item"} | ${it.quantity || 1} | ${it.unit || "un"} | ${formatMoney(Number(it.unitPriceCents || 0))} | ${formatMoney(Number(it.totalPriceCents || 0))} |`,
      ),
    ].join("\n");

    const totalMoneyStr = formatMoney(Number(invoice.total_cents || 0));
    const dataExtenso = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date());

    const paymentTerms = (invoice.payment_terms as Record<string, any>) || {};
    const paymentStr = `${(paymentTerms.method || "PIX").toUpperCase()} — ${paymentTerms.notes || `${paymentTerms.installmentsCount || 1}x de ${formatMoney(Number(paymentTerms.installmentValueCents || invoice.total_cents || 0))}`}`;

    // 4. Montar conteúdo completo com cláusulas do template
    const headerMarkdown = `# ${data.customTitle || `Contrato Comercial · Ref: ${invoice.invoice_code}`}

**CONTRATADA:** ${issuer.companyName || "Empresa"} — CNPJ/CPF: ${issuer.cnpjOrCpf || "Não informado"}
**ENDEREÇO:** ${issuer.address || "Endereço comercial da contratada"} • ${issuer.cityState || ""}
**CONTATO:** ${issuer.phoneOrWhatsapp || ""} • ${issuer.email || ""}

**CONTRATANTE:** ${customer.name || "Cliente"} — CPF/CNPJ: ${customer.cpfOrCnpj || "Identificado no ato da assinatura"}
**ENDEREÇO:** ${customer.address || "Não informado"} • ${customer.cityState || ""}
**CONTATO:** ${customer.phone || ""} • ${customer.email || ""}

---

### OBJETO E DISCRIMINAÇÃO DOS ITENS
Conforme ajustado na fatura comercial nº ${invoice.invoice_code}:

${itemsTable}

---
`;

    const clausesMarkdown = template.clauses
      .sort((a, b) => a.order - b.order)
      .map((c) => `### ${c.title}\n${c.content}`)
      .join("\n\n");

    const footerMarkdown = `\n\n---
### CONDIÇÕES FINANCEIRAS & RESUMO
- **Valor Total do Instrumento:** ${totalMoneyStr}
- **Condições de Pagamento:** ${paymentStr}
- **Vigência / Validade:** ${invoice.valid_until ? `Até ${invoice.valid_until}` : "Imediata"}
- **Data de Emissão:** ${dataExtenso}

O presente instrumento constitui título executivo extrajudicial (Art. 784, III do Código de Processo Civil), respaldado pela MP 2.200-2/2001 e Lei Federal nº 14.063/2020.
`;

    const rawContent = `${headerMarkdown}\n${clausesMarkdown}\n${footerMarkdown}`;

    // Interpolação semântica com fallback
    const interpolatedContent = interpolateContractVariables(rawContent, {
      contratante_nome: customer.name || "Cliente",
      contratante_documento: customer.cpfOrCnpj || "",
      contratante_endereco: customer.address || "",
      contratado_nome: issuer.companyName || "Empresa",
      contratado_documento: issuer.cnpjOrCpf || "",
      contratado_endereco: issuer.address || "",
      descricao_servicos: itemsDescription,
      tabela_itens: itemsTable,
      valor_total: totalMoneyStr,
      forma_pagamento: paymentStr,
      data_extenso: dataExtenso,
      foro_cidade: issuer.cityState || "São Miguel do Oeste - SC",
    });

    // 5. Inserir em contracts
    const contractTitle = data.customTitle || `Contrato Comercial · Ref: ${invoice.invoice_code}`;
    const categoryMapping: Record<string, any> = {
      "template-prestacao-servicos": "service_agreement",
      "template-pacote-turistico": "tourism_package",
      "template-locacao-residencial": "real_estate_rental",
      "template-compra-venda-imovel": "real_estate_sale",
      "template-compra-venda-veiculo": "vehicle_sale",
      "template-consignacao-veiculo": "vehicle_consignation",
      "template-carne-crediario": "pos_retail",
    };

    const category = categoryMapping[data.templateId] || "general_deal";

    const { data: newContract, error: contractErr } = await supabase
      .from("contracts")
      .insert({
        store_id: storeId,
        creator_id: identity.id,
        title: contractTitle,
        category,
        status: "draft",
        current_version: 1,
        dispatch_settings: {
          signing_order: "parallel",
          send_reminders: true,
          reminder_days: 3,
          delivery_channels: ["whatsapp", "email"],
        },
      })
      .select()
      .single();

    if (contractErr || !newContract) {
      console.error("[commercial-invoices] Error creating contract from invoice:", contractErr);
      throw new Error(`Erro ao gerar contrato: ${contractErr?.message || "Erro desconhecido"}`);
    }

    // 6. Inserir primeira versão do contrato
    const { data: version, error: verErr } = await supabase
      .from("contract_versions")
      .insert({
        contract_id: newContract.id,
        version_number: 1,
        title: contractTitle,
        content_markdown: interpolatedContent,
        clauses: template.clauses,
        variables: {
          invoice_id: invoice.id,
          invoice_code: invoice.invoice_code,
          customer,
          issuer,
        },
        page_count: 2,
        is_sealed: false,
      })
      .select()
      .single();

    if (verErr || !version) {
      throw new Error("Erro ao criar versão inicial do contrato.");
    }

    // 7. Atualizar a fatura comercial vinculando o contract_id
    await supabase
      .from("commercial_invoices")
      .update({
        contract_id: newContract.id,
        status: "converted_to_contract",
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoice.id);

    return {
      success: true,
      contractId: newContract.id,
      versionId: version.id,
      invoiceCode: invoice.invoice_code,
    };
  });
