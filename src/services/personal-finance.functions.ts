import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { executeUnifiedAiCall } from "@/services/api-orchestrator.functions";

export interface PersonalFinancialCategoryDTO {
  id: string;
  profileId: string | null;
  name: string;
  icon: string;
  color: string;
  type: "income" | "expense" | "both";
  isSystem: boolean;
}

export interface PersonalFinancialEntryDTO {
  id: string;
  profileId: string;
  categoryId: string | null;
  category?: PersonalFinancialCategoryDTO | null;
  type: "income" | "expense";
  amountCents: number;
  description: string;
  entryDate: string;
  receiptUrl: string | null;
  tags: string[];
  notes: string | null;
  paymentMethod: string;
  isLocked: boolean;
  transactionToken: string | null;
  referenceType: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OcrReceiptResult {
  amountCents: number | null;
  description: string | null;
  establishmentName: string | null;
  cnpj: string | null;
  entryDate: string | null;
  suggestedCategory: string | null;
  rawText: string;
  confidence: "high" | "medium" | "low";
}

export interface PersonalFinanceSummaryDTO {
  totalIncomeCents: number;
  totalExpenseCents: number;
  balanceCents: number;
  entriesCount: number;
  month: number;
  year: number;
  byCategory: Array<{
    categoryId: string | null;
    name: string;
    icon: string;
    color: string;
    type: string;
    totalCents: number;
    percentage: number;
    count: number;
  }>;
  dailyTrend: Array<{
    date: string;
    incomeCents: number;
    expenseCents: number;
  }>;
}

/**
 * 1. Lista todas as categorias disponíveis para o usuário autenticado
 * (categorias padrão globais do sistema + categorias customizadas criadas pelo perfil)
 */
export const listPersonalFinanceCategories = createServerFn({ method: "GET" })
  .handler(async (): Promise<PersonalFinancialCategoryDTO[]> => {
    const identity = await getServerIdentity().catch(() => ({ id: null }));
    const supabase = getServerClient();

    let query = supabase
      .from("personal_financial_categories")
      .select("*");

    if (identity.id) {
      query = query.or(`profile_id.is.null,profile_id.eq.${identity.id}`);
    } else {
      query = query.is("profile_id", null);
    }

    const { data, error } = await query.order("name", { ascending: true });

    if (error) {
      console.error("[personal-finance] Erro ao listar categorias:", error);
      return [];
    }

    return (data || []).map((c: any) => ({
      id: c.id,
      profileId: c.profile_id,
      name: c.name,
      icon: c.icon || "Receipt",
      color: c.color || "#6366f1",
      type: c.type,
      isSystem: c.profile_id === null,
    }));
  });

/**
 * 2. Retorna o resumo consolidado de finanças do mês (Receitas, Despesas, Saldo, Distribuição por Categoria)
 */
export const getPersonalFinanceSummary = createServerFn({ method: "GET" })
  .validator(
    z.object({
      month: z.number().int().min(1).max(12),
      year: z.number().int().min(2020).max(2100),
    })
  )
  .handler(async ({ data: { month, year } }): Promise<PersonalFinanceSummaryDTO> => {
    const identity = await getServerIdentity();
    if (!identity.id) {
      throw new Error("Faça login para acessar o resumo de finanças pessoais.");
    }

    const supabase = getServerClient();

    const startStr = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endStr = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const { data: entries, error } = await supabase
      .from("personal_financial_entries")
      .select("id, type, amount_cents, entry_date, category_id, personal_financial_categories(id, name, icon, color, type)")
      .eq("profile_id", identity.id)
      .gte("entry_date", startStr)
      .lte("entry_date", endStr);

    if (error) {
      console.error("[personal-finance] Erro ao calcular resumo:", error);
      throw new Error("Não foi possível carregar o resumo financeiro.");
    }

    let totalIncomeCents = 0;
    let totalExpenseCents = 0;
    const categoryMap = new Map<
      string,
      {
        categoryId: string | null;
        name: string;
        icon: string;
        color: string;
        type: string;
        totalCents: number;
        count: number;
      }
    >();

    const dailyMap = new Map<string, { incomeCents: number; expenseCents: number }>();

    for (const item of entries || []) {
      const cents = Number(item.amount_cents) || 0;
      const isIncome = item.type === "income";

      if (isIncome) {
        totalIncomeCents += cents;
      } else {
        totalExpenseCents += cents;
      }

      // Distribuição por Categoria
      const cat = (item as any).personal_financial_categories;
      const catKey = cat?.id || "outros";
      const catName = cat?.name || (isIncome ? "Outras Receitas" : "Outras Despesas");
      const catIcon = cat?.icon || "Receipt";
      const catColor = cat?.color || (isIncome ? "#22c55e" : "#64748b");

      const existingCat = categoryMap.get(catKey) || {
        categoryId: cat?.id || null,
        name: catName,
        icon: catIcon,
        color: catColor,
        type: item.type,
        totalCents: 0,
        count: 0,
      };

      existingCat.totalCents += cents;
      existingCat.count += 1;
      categoryMap.set(catKey, existingCat);

      // Tendência diária
      const dayKey = item.entry_date;
      const existingDay = dailyMap.get(dayKey) || { incomeCents: 0, expenseCents: 0 };
      if (isIncome) {
        existingDay.incomeCents += cents;
      } else {
        existingDay.expenseCents += cents;
      }
      dailyMap.set(dayKey, existingDay);
    }

    // Calcula percentual das despesas por categoria
    const byCategory = Array.from(categoryMap.values())
      .map((c) => ({
        ...c,
        percentage:
          totalExpenseCents > 0 && c.type === "expense"
            ? Math.round((c.totalCents / totalExpenseCents) * 100)
            : totalIncomeCents > 0 && c.type === "income"
            ? Math.round((c.totalCents / totalIncomeCents) * 100)
            : 0,
      }))
      .sort((a, b) => b.totalCents - a.totalCents);

    const dailyTrend = Array.from(dailyMap.entries())
      .map(([date, vals]) => ({ date, ...vals }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalIncomeCents,
      totalExpenseCents,
      balanceCents: totalIncomeCents - totalExpenseCents,
      entriesCount: (entries || []).length,
      month,
      year,
      byCategory,
      dailyTrend,
    };
  });

/**
 * 3. Lista detalhada de lançamentos com filtros de mês/ano, tipo e busca textual
 */
export const listPersonalFinanceEntries = createServerFn({ method: "GET" })
  .validator(
    z.object({
      month: z.number().int().min(1).max(12).optional(),
      year: z.number().int().min(2020).max(2100).optional(),
      type: z.enum(["all", "income", "expense"]).optional(),
      categoryId: z.string().uuid().optional(),
      query: z.string().optional(),
      limit: z.number().int().min(1).max(200).optional(),
    })
  )
  .handler(async ({ data }): Promise<PersonalFinancialEntryDTO[]> => {
    const identity = await getServerIdentity();
    if (!identity.id) return [];

    const supabase = getServerClient();

    let qb = supabase
      .from("personal_financial_entries")
      .select("*, personal_financial_categories(*)")
      .eq("profile_id", identity.id)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (data.month && data.year) {
      const startStr = `${data.year}-${String(data.month).padStart(2, "0")}-01`;
      const lastDay = new Date(data.year, data.month, 0).getDate();
      const endStr = `${data.year}-${String(data.month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      qb = qb.gte("entry_date", startStr).lte("entry_date", endStr);
    }

    if (data.type && data.type !== "all") {
      qb = qb.eq("type", data.type);
    }

    if (data.categoryId) {
      qb = qb.eq("category_id", data.categoryId);
    }

    if (data.query && data.query.trim()) {
      qb = qb.ilike("description", `%${data.query.trim()}%`);
    }

    if (data.limit) {
      qb = qb.limit(data.limit);
    } else {
      qb = qb.limit(100);
    }

    const { data: entries, error } = await qb;

    if (error) {
      console.error("[personal-finance] Erro ao listar lançamentos:", error);
      return [];
    }

    return (entries || []).map((e: any) => {
      const isConfidential = !!e.is_confidential_tokenized;
      const displayDesc = isConfidential
        ? `Transação Confidencial [${(e.anonymized_token || e.id).slice(0, 8).toUpperCase()}]`
        : e.description;

      return {
        id: e.id,
        profileId: e.profile_id,
        categoryId: e.category_id,
        type: e.type,
        amountCents: Number(e.amount_cents),
        description: displayDesc,
        entryDate: e.entry_date,
        receiptUrl: isConfidential ? null : e.receipt_url,
        tags: e.tags || [],
        notes: isConfidential ? "Detalhes protegidos sob camada de sigilo comercial." : e.notes,
        paymentMethod: e.payment_method || "pix",
        isLocked: !!e.is_locked,
        isConfidentialTokenized: isConfidential,
        anonymizedToken: e.anonymized_token || null,
        transactionToken: e.transaction_token || null,
        referenceType: e.reference_type || null,
        createdAt: e.created_at,
        updatedAt: e.updated_at,
        category: e.personal_financial_categories
          ? {
              id: e.personal_financial_categories.id,
              profileId: e.personal_financial_categories.profile_id,
              name: e.personal_financial_categories.name,
              icon: e.personal_financial_categories.icon || "Receipt",
              color: e.personal_financial_categories.color || "#6366f1",
              type: e.personal_financial_categories.type,
              isSystem: e.personal_financial_categories.profile_id === null,
            }
          : null,
      };
    });
  });

/**
 * 4. Criação atômica de novo lançamento com valor estrito em centavos
 */
export const createPersonalFinanceEntry = createServerFn({ method: "POST" })
  .validator(
    z.object({
      type: z.enum(["income", "expense"]),
      amountCents: z.number().int().positive("O valor deve ser maior que zero."),
      description: z.string().min(2, "Informe uma descrição válida com no mínimo 2 letras."),
      categoryId: z.string().uuid().nullable().optional(),
      entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data no formato YYYY-MM-DD"),
      receiptUrl: z.string().url().nullable().optional().or(z.literal("")),
      paymentMethod: z
        .enum(["pix", "credit_card", "debit_card", "cash", "transfer", "boleto", "other"])
        .default("pix"),
      notes: z.string().optional().nullable(),
      tags: z.array(z.string()).optional(),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity.id) {
      throw new Error("Faça login para registrar lançamentos financeiros.");
    }

    const supabase = getServerClient();

    const { data: entry, error } = await supabase
      .from("personal_financial_entries")
      .insert({
        profile_id: identity.id,
        type: data.type,
        amount_cents: data.amountCents,
        description: data.description.trim(),
        category_id: data.categoryId || null,
        entry_date: data.entryDate,
        receipt_url: data.receiptUrl || null,
        payment_method: data.paymentMethod,
        notes: data.notes?.trim() || null,
        tags: data.tags || [],
      })
      .select("*, personal_financial_categories(*)")
      .single();

    if (error) {
      console.error("[personal-finance] Erro ao criar lançamento:", error);
      throw new Error("Falha ao salvar lançamento financeiro.");
    }

    return {
      success: true,
      entry,
    };
  });

/**
 * 5. Atualização atômica de lançamento existente pertencente ao usuário
 */
export const updatePersonalFinanceEntry = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      type: z.enum(["income", "expense"]).optional(),
      amountCents: z.number().int().positive().optional(),
      description: z.string().min(2).optional(),
      categoryId: z.string().uuid().nullable().optional(),
      entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      receiptUrl: z.string().url().nullable().optional().or(z.literal("")),
      paymentMethod: z
        .enum(["pix", "credit_card", "debit_card", "cash", "transfer", "boleto", "other"])
        .optional(),
      notes: z.string().optional().nullable(),
      tags: z.array(z.string()).optional(),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity.id) {
      throw new Error("Faça login para atualizar lançamentos.");
    }

    const supabase = getServerClient();

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (data.type) updatePayload.type = data.type;
    if (data.amountCents) updatePayload.amount_cents = data.amountCents;
    if (data.description) updatePayload.description = data.description.trim();
    if (data.categoryId !== undefined) updatePayload.category_id = data.categoryId || null;
    if (data.entryDate) updatePayload.entry_date = data.entryDate;
    if (data.receiptUrl !== undefined) updatePayload.receipt_url = data.receiptUrl || null;
    if (data.paymentMethod) updatePayload.payment_method = data.paymentMethod;
    if (data.notes !== undefined) updatePayload.notes = data.notes?.trim() || null;
    if (data.tags !== undefined) updatePayload.tags = data.tags;

    const { data: updated, error } = await supabase
      .from("personal_financial_entries")
      .update(updatePayload)
      .eq("id", data.id)
      .eq("profile_id", identity.id)
      .select("*, personal_financial_categories(*)")
      .single();

    if (error) {
      console.error("[personal-finance] Erro ao atualizar lançamento:", error);
      throw new Error("Falha ao atualizar lançamento financeiro.");
    }

    return {
      success: true,
      entry: updated,
    };
  });

/**
 * 6. Exclusão segura de lançamento — BLOQUEADA para lançamentos imutáveis (is_locked = true)
 * Lançamentos originados de pedidos, checkouts e pagamentos do app são imutáveis por auditoria.
 */
export const deletePersonalFinanceEntry = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data: { id } }) => {
    const identity = await getServerIdentity();
    if (!identity.id) {
      throw new Error("Faça login para excluir lançamentos.");
    }

    const supabase = getServerClient();

    // 🔒 Auditoria anti-exclusão: Verificar se o lançamento é imutável
    const { data: existing, error: fetchErr } = await supabase
      .from("personal_financial_entries")
      .select("id, is_locked, reference_type, transaction_token")
      .eq("id", id)
      .eq("profile_id", identity.id)
      .maybeSingle();

    if (fetchErr || !existing) {
      throw new Error("Lançamento não encontrado ou sem permissão.");
    }

    if (existing.is_locked) {
      throw new Error(
        `Este lançamento é imutável (originado de ${existing.reference_type || "sistema"}) e não pode ser excluído. Ele faz parte do ledger de auditoria financeira.`
      );
    }

    const { error } = await supabase
      .from("personal_financial_entries")
      .delete()
      .eq("id", id)
      .eq("profile_id", identity.id)
      .eq("is_locked", false); // Dupla garantia

    if (error) {
      console.error("[personal-finance] Erro ao excluir lançamento:", error);
      throw new Error("Falha ao excluir o lançamento.");
    }

    return { success: true };
  });

/**
 * 7. Criação de Categoria Personalizada pelo Usuário
 */
export const createPersonalFinanceCategory = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().min(2, "Nome da categoria deve ter no mínimo 2 caracteres."),
      icon: z.string().default("Receipt"),
      color: z.string().default("#6366f1"),
      type: z.enum(["income", "expense", "both"]).default("expense"),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity.id) {
      throw new Error("Faça login para criar categorias.");
    }

    const supabase = getServerClient();

    const { data: cat, error } = await supabase
      .from("personal_financial_categories")
      .insert({
        profile_id: identity.id,
        name: data.name.trim(),
        icon: data.icon,
        color: data.color,
        type: data.type,
      })
      .select()
      .single();

    if (error) {
      console.error("[personal-finance] Erro ao criar categoria:", error);
      throw new Error("Falha ao cadastrar categoria.");
    }

    return {
      success: true,
      category: cat,
    };
  });

// ============================================================
// OCR Multimodal — Análise de Comprovantes via Gemini Vision
// ============================================================

/**
 * 8. Analisa um comprovante/recibo via OCR multimodal usando Gemini Vision.
 * Extrai valor em centavos, data, estabelecimento, CNPJ e categoria sugerida.
 * [REQ-1] — Conectado ao pool de chaves via getNextActiveKey("gemini").
 */
export const analyzeReceiptWithAI = createServerFn({ method: "POST" })
  .validator(
    z.object({
      imageUrl: z.string().url("URL da imagem inválida"),
    })
  )
  .handler(async ({ data: { imageUrl } }): Promise<OcrReceiptResult> => {
    const identity = await getServerIdentity();
    if (!identity.id) {
      throw new Error("Faça login para usar o OCR de comprovantes.");
    }

    // 1. Baixa a imagem e converte para base64 para envio multimodal
    let imageBase64 = "";
    let mimeType = "image/jpeg";
    try {
      const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) });
      if (!imgRes.ok) throw new Error(`Não foi possível baixar a imagem (status ${imgRes.status})`);
      const contentType = imgRes.headers.get("content-type") || "image/jpeg";
      mimeType = contentType.split(";")[0].trim() || "image/jpeg";
      const arrayBuf = await imgRes.arrayBuffer();
      imageBase64 = Buffer.from(arrayBuf).toString("base64");
    } catch (err: any) {
      throw new Error(`Falha ao processar imagem do comprovante: ${err.message}`);
    }

    const systemPrompt = `Você é um especialista em OCR e análise de comprovantes fiscais brasileiros.
Analise a imagem do comprovante e extraia as informações em formato JSON estrito.
Sempre retorne um JSON com os campos especificados, usando null quando não encontrar a informação.
Para o valor, converta para centavos inteiros (ex: R$ 34,90 = 3490).
Para a data, use o formato YYYY-MM-DD.
Seja preciso e não invente dados que não estejam claramente visíveis no comprovante.`;

    const userPrompt = `Analise este comprovante e retorne um JSON com exatamente estes campos:
{
  "amountCents": <número inteiro em centavos ou null>,
  "description": "<descrição curta do que é o comprovante>",
  "establishmentName": "<nome do estabelecimento/empresa ou null>",
  "cnpj": "<CNPJ formatado XX.XXX.XXX/XXXX-XX ou null>",
  "entryDate": "<data no formato YYYY-MM-DD ou null>",
  "suggestedCategory": "<uma das opções: Alimentação, Transporte, Saúde, Educação, Lazer, Moradia, Compras, Serviços, Transferência, Outro>",
  "rawText": "<texto bruto legível extraído do comprovante, resumido em até 200 caracteres>",
  "confidence": "<'high' se tiver certeza dos dados principais, 'medium' se parcial, 'low' se pouco legível>"
}`;

    try {
      const aiRes = await executeUnifiedAiCall({
        systemPrompt,
        userPrompt,
        images: [{ mimeType, base64: imageBase64 }],
        temperature: 0.1,
        expectJson: true,
        preferProvider: "gemini",
      });

      const parsed = (aiRes.parsedJson || {}) as OcrReceiptResult;

      if (!parsed || (!parsed.description && !parsed.amountCents)) {
        throw new Error("A IA não retornou dados legíveis do comprovante.");
      }

      // Sanitiza: garante amountCents como inteiro
      if (parsed.amountCents !== null && !Number.isInteger(parsed.amountCents)) {
        parsed.amountCents = Math.round(Number(parsed.amountCents));
      }

      return parsed;
    } catch (err: any) {
      console.warn("[personal-finance] Erro no OCR unificado:", err.message);
      throw new Error(`Erro ao analisar comprovante com IA: ${err.message}`);
    }
  });

// ============================================================
// Espelho de Pedidos → Ledger Financeiro Pessoal (Telemetria)
// ============================================================

/**
 * 9. Espelha um pedido/transação do app no Financeiro Pessoal do usuário.
 * [REQ-5] — Tokenizador de transações: toda transação originada no app
 * é registrada de forma imutável (is_locked = true) no ledger pessoal.
 * Deve ser chamado internamente pelo BFF de checkout após persistência.
 */
export async function mirrorOrderToPersonalFinance(params: {
  profileId: string;
  amountCents: number;
  description: string;
  referenceType: "order" | "ticket" | "booking" | "subscription" | "cashback" | "refund";
  referenceId: string;
  transactionToken: string;
  entryDate?: string;
  categoryHint?: string;
}): Promise<{ success: boolean; entryId?: string }> {
  const supabase = getServerClient();

  const isRefund = params.referenceType === "refund" || params.referenceType === "cashback";
  const entryType = isRefund ? "income" : "expense";
  const dateStr = params.entryDate || new Date().toISOString().split("T")[0];

  // Verifica idempotência: não duplicar se já espelhado
  const { data: existing } = await supabase
    .from("personal_financial_entries")
    .select("id")
    .eq("profile_id", params.profileId)
    .eq("transaction_token", params.transactionToken)
    .maybeSingle();

  if (existing?.id) {
    console.log(`[personal-finance] Mirror idempotente: ${params.transactionToken} já registrado.`);
    return { success: true, entryId: existing.id };
  }

  const { data: entry, error } = await supabase
    .from("personal_financial_entries")
    .insert({
      profile_id: params.profileId,
      type: entryType,
      amount_cents: Math.abs(params.amountCents),
      description: params.description,
      entry_date: dateStr,
      payment_method: "pix",
      is_locked: true, // Imutável — lançamento originado do sistema
      reference_type: params.referenceType,
      transaction_token: params.transactionToken,
      tags: [params.referenceType, "app"],
      notes: `Registrado automaticamente via ${params.referenceType} #${params.referenceId}`,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[personal-finance] Falha ao espelhar pedido no ledger:", error);
    return { success: false };
  }

  return { success: true, entryId: entry.id };
}

// ============================================================
// Contratos Assinados do Usuário
// ============================================================

export interface SignedContractDTO {
  id: string;
  title: string;
  status: string;
  signedAt: string | null;
  certificateHash: string | null;
  storeName: string | null;
  storeSlug: string | null;
  createdAt: string;
}

/**
 * 10. Lista os contratos assinados pelo usuário autenticado.
 * [REQ-11] — Portal de Contratos do usuário.
 */
export const listMySignedContracts = createServerFn({ method: "GET" }).handler(
  async (): Promise<SignedContractDTO[]> => {
    const identity = await getServerIdentity();
    if (!identity.id) return [];

    const supabase = getServerClient();

    const { data, error } = await supabase
      .from("contract_envelopes")
      .select(
        `id, status, signed_at, certificate_hash, created_at,
        contracts!inner(title, stores(name, slug))`
      )
      .eq("signer_profile_id", identity.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[personal-finance] Erro ao listar contratos assinados:", error);
      return [];
    }

    return (data || []).map((env: any) => ({
      id: env.id,
      title: env.contracts?.title || "Contrato",
      status: env.status,
      signedAt: env.signed_at,
      certificateHash: env.certificate_hash,
      storeName: env.contracts?.stores?.name || null,
      storeSlug: env.contracts?.stores?.slug || null,
      createdAt: env.created_at,
    }));
  }
);
