/**
 * whatsapp-ai-agent-tools.server.ts
 * Ferramentas (MCP Tools) para Agentes de IA Autônomos de Atendimento Nível 1 no WhatsApp/Chat.
 * Permite que a IA consulte estoque, emita PIX, verifique pedidos, agende serviços e faça transbordo para humanos.
 */

import { getServerClient } from "@/lib/supabase";
import { formatMoney } from "@/lib/money";
import { generatePixBrCode } from "@/lib/pix-payload";

export interface StockCheckInput {
  storeId: string;
  query: string;
  limit?: number;
}

export interface StockItemResult {
  productId: string;
  title: string;
  priceCents: number;
  priceDisplay: string;
  stockQuantity: number;
  inStock: boolean;
  sku?: string;
}

export interface PixChargeInput {
  storeId: string;
  customerPhone: string;
  amountCents: number;
  description: string;
  orderId?: string;
}

export interface PixChargeResult {
  chargeId: string;
  pixCopyPaste: string;
  qrCodeUrl?: string;
  expiresInMinutes: number;
  amountDisplay: string;
}

export interface OrderStatusInput {
  storeId: string;
  customerPhone: string;
}

export interface OrderStatusResult {
  orders: Array<{
    orderId: string;
    displayId: string;
    status: string;
    statusLabel: string;
    totalDisplay: string;
    itemsSummary: string;
    createdAt: string;
    trackingUrl?: string;
  }>;
}

export interface HandoffInput {
  storeId: string;
  threadId: string;
  targetDepartment: string;
  summaryReason: string;
  priority?: "normal" | "high" | "urgent";
}

/**
 * 1. Tool: Consultar Estoque e Preços
 */
export async function toolCheckInventory(input: StockCheckInput): Promise<StockItemResult[]> {
  const db = getServerClient();
  const q = input.query.trim().toLowerCase();

  const { data: products } = await db
    .from("products")
    .select("id, title, price_cents, status, product_variants(sku, stock_on_hand, allow_backorder)")
    .eq("store_id", input.storeId)
    .in("status", ["published", "active"])
    .ilike("title", `%${q}%`)
    .limit(input.limit || 5);

  if (!products || products.length === 0) return [];

  return products.map((p: any) => {
    const variants = Array.isArray(p.product_variants) ? p.product_variants : [];
    const qty =
      variants.length > 0
        ? variants.reduce((sum: number, v: any) => sum + (v.allow_backorder ? 99 : Math.max(0, Number(v.stock_on_hand ?? 0))), 0)
        : 0;
    const priceCents = Number(p.price_cents ?? 0);
    return {
      productId: p.id,
      title: p.title,
      priceCents,
      priceDisplay: formatMoney(priceCents),
      stockQuantity: qty,
      inStock: qty > 0 || p.status === "published" || p.status === "active",
      sku: variants[0]?.sku || undefined,
    };
  });
}

export function buildStoreAgentPixPayload(params: {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amountCents: number;
  chargeId: string;
  description: string;
}): string {
  return generatePixBrCode({
    pixKey: params.pixKey,
    amountCents: params.amountCents,
    merchantName: params.merchantName,
    merchantCity: params.merchantCity,
    txId: params.chargeId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 25),
    description: params.description,
  });
}

/**
 * 2. Tool: Emitir Cobrança / Carnê PIX Imediato
 */
export async function toolCreatePixCharge(input: PixChargeInput): Promise<PixChargeResult> {
  if (!Number.isFinite(input.amountCents) || input.amountCents <= 0) {
    throw new Error("O valor da cobrança PIX deve ser maior que zero.");
  }

  const db = getServerClient();
  const { data: storeRow, error: storeErr } = await db
    .from("stores")
    .select("id, name, city, pix_key, settings")
    .eq("id", input.storeId)
    .single();

  if (storeErr || !storeRow) {
    throw new Error(`Loja não encontrada para emissão PIX: ${storeErr?.message || input.storeId}`);
  }

  const storeSettings = (storeRow.settings && typeof storeRow.settings === "object" ? storeRow.settings : {}) as Record<string, any>;
  const realPixKey = String(storeRow.pix_key || storeSettings.pix_key || storeSettings.pixKey || "").trim();
  if (!realPixKey) {
    throw new Error(
      "Chave PIX da loja não configurada. Acesse Configurações > Pagamentos ou Dados Financeiros para definir a chave PIX antes de emitir cobranças."
    );
  }

  const chargeId = `pix_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const brCode = buildStoreAgentPixPayload({
    pixKey: realPixKey,
    merchantName: String(storeRow.name || "Waesy Loja"),
    merchantCity: String(storeRow.city || "Brasil"),
    amountCents: input.amountCents,
    chargeId,
    description: input.description,
  });

  const { error: txErr } = await db.from("payment_transactions").insert({
    store_id: input.storeId,
    order_id: input.orderId || null,
    amount_cents: input.amountCents,
    payment_method: "pix",
    status: "pending",
    metadata: {
      charge_id: chargeId,
      customer_phone: input.customerPhone,
      description: input.description,
      pix_copy_paste: brCode,
      pix_key: realPixKey,
    },
  });

  if (txErr) {
    throw new Error(`Falha ao registrar cobrança PIX no banco de dados: ${txErr.message}`);
  }

  return {
    chargeId,
    pixCopyPaste: brCode,
    expiresInMinutes: 30,
    amountDisplay: formatMoney(input.amountCents),
  };
}

/**
 * 3. Tool: Consultar Status de Pedidos Recentes pelo Telefone
 */
export async function toolGetOrderStatus(input: OrderStatusInput): Promise<OrderStatusResult> {
  const db = getServerClient();
  const cleanPhone = input.customerPhone.replace(/\D/g, "");

  const { data: orders } = await db
    .from("orders")
    .select("id, order_number, status, total_cents, created_at, customer_snapshot, order_items(product_title, qty)")
    .eq("store_id", input.storeId)
    .or(`customer_snapshot->>phone.ilike.%${cleanPhone}%,custom_fields->>customer_phone.ilike.%${cleanPhone}%`)
    .order("created_at", { ascending: false })
    .limit(3);

  const STATUS_LABELS: Record<string, string> = {
    pending: "Aguardando Pagamento",
    paid: "Pagamento Confirmado",
    preparing: "Em Preparação",
    in_transit: "A Caminho / Em Rota",
    delivered: "Entregue",
    cancelled: "Cancelado",
  };

  const formatted = (orders || []).map((o: any) => {
    const items = (o.order_items || [])
      .map((it: any) => `${it.qty ?? it.quantity ?? 1}x ${it.product_title || it.title || "Item"}`)
      .join(", ");

    return {
      orderId: o.id,
      displayId: `#${o.order_number || o.id.slice(0, 6)}`,
      status: o.status,
      statusLabel: STATUS_LABELS[o.status] || o.status,
      totalDisplay: formatMoney(Number(o.total_cents || 0)),
      itemsSummary: items || "Pedido Geral",
      createdAt: o.created_at,
      trackingUrl: `/pedidos/rastreio/${o.id}`,
    };
  });

  return { orders: formatted };
}

/**
 * 4. Tool: Transbordo para Atendente Humano (Handoff Inteligente)
 */
export async function toolHandoffToHuman(input: HandoffInput): Promise<{ success: boolean; message: string }> {
  const db = getServerClient();

  // 1. Atualiza departamento da thread
  await db
    .from("chat_threads")
    .update({
      department: input.targetDepartment,
      priority: input.priority || "normal",
      status: "open",
      internal_notes: `[Transbordo IA]: ${input.summaryReason}`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.threadId)
    .eq("store_id", input.storeId);

  // 2. Insere nota interna (whisper) com resumo contextual para o atendente humano
  await db.from("chat_messages").insert({
    thread_id: input.threadId,
    message: `[TRANSBORDO IA para ${input.targetDepartment.toUpperCase()}]: ${input.summaryReason}`,
    message_type: "system_event",
    is_staff_reply: true,
    payload: {
      is_whisper: true,
      transferred_by_ai: true,
      department: input.targetDepartment,
      reason: input.summaryReason,
    },
  });

  return {
    success: true,
    message: `Atendimento transferido para a fila ${input.targetDepartment} com nota de contexto.`,
  };
}

export interface PackageLookupInput {
  storeId: string;
  query?: string;
  destination?: string;
  limit?: number;
}

export interface PackageItemResult {
  packageId: string;
  title: string;
  destination: string;
  priceCents: number;
  priceDisplay: string;
  installmentTerms: string;
  datesDescription?: string;
  itinerarySummary?: string;
  includedItems?: string[];
  status: string;
}

/**
 * 5. Tool: Consultar Pacotes Turísticos, Roteiros & Viagens
 */
export async function toolLookupTourismPackages(input: PackageLookupInput): Promise<PackageItemResult[]> {
  const db = getServerClient();
  const q = (input.query || input.destination || "").trim().toLowerCase();

  // 1. Busca em tourism_trips (viagens e pacotes próprios da agência)
  let tripsQuery = db
    .from("tourism_trips")
    .select("id, title, destination_city, total_cents, travel_start_date, travel_end_date, status, itinerary, includes, financial_details, notes")
    .eq("store_id", input.storeId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(input.limit || 5);

  if (q) {
    tripsQuery = tripsQuery.or(`title.ilike.%${q}%,destination_city.ilike.%${q}%`);
  }

  const { data: trips } = await tripsQuery;

  if (trips && trips.length > 0) {
    return trips.map((t: any) => {
      const priceCents = Number(t.total_cents || 0);
      const meta = (t.financial_details && typeof t.financial_details === "object" ? t.financial_details : {}) as Record<string, any>;
      const maxInstallments = Number(meta.max_installments || 10);
      const installmentVal = priceCents > 0 ? formatMoney(Math.round(priceCents / maxInstallments)) : "";
      const installmentTerms = priceCents > 0
        ? `Até ${maxInstallments}x de ${installmentVal} sem juros ou entrada + saldo facilitado no PIX/Boleto`
        : "Condições sob consulta com a equipe";

      return {
        packageId: t.id,
        title: t.title || "Pacote Turístico Especial",
        destination: t.destination_city || "Destino Nacional/Internacional",
        priceCents,
        priceDisplay: formatMoney(priceCents),
        installmentTerms,
        datesDescription: t.travel_start_date
          ? `Saída: ${new Date(t.travel_start_date).toLocaleDateString("pt-BR")}${t.travel_end_date ? ` até ${new Date(t.travel_end_date).toLocaleDateString("pt-BR")}` : ""}`
          : "Datas flexíveis",
        itinerarySummary: t.notes || meta.itinerary_summary || "Roteiro completo com passeios inclusos",
        includedItems: Array.isArray(t.includes) && t.includes.length > 0 ? t.includes : ["Hospedagem", "Transfer", "Seguro viagem"],
        status: t.status || "active",
      };
    });
  }

  // 2. Fallback para tourism_experiences (passeios, tours e vivências)
  const { data: experiences } = await db
    .from("tourism_experiences")
    .select("id, title, destination, price_cents, duration, included_items, status")
    .eq("store_id", input.storeId)
    .eq("status", "active")
    .ilike("title", `%${q}%`)
    .limit(input.limit || 5);

  return (experiences || []).map((exp: any) => {
    const priceCents = Number(exp.price_cents || 0);
    return {
      packageId: exp.id,
      title: exp.title,
      destination: exp.destination || "Região Local",
      priceCents,
      priceDisplay: formatMoney(priceCents),
      installmentTerms: priceCents > 0 ? "Pagamento à vista com desconto via PIX ou em até 6x no cartão" : "Sob consulta",
      datesDescription: exp.duration ? `Duração: ${exp.duration}` : "Passeio regular",
      itinerarySummary: "Experiência turística guiada com guias credenciados",
      includedItems: Array.isArray(exp.included_items) ? exp.included_items : ["Ingresso", "Guia turístico"],
      status: exp.status || "active",
    };
  });
}

export interface AviationPolicyResult {
  regulation: string;
  authority: string;
  policies: Array<{
    topic: string;
    rules: string[];
    importantNotice: string;
  }>;
}

/**
 * 6. Tool: Base Normativa de Aviação Civil (Resolução 400 da ANAC & Regras de Cias Aéreas)
 */
export function toolGetTourismAviationPolicies(): AviationPolicyResult {
  return {
    regulation: "Resolução nº 400/2016 e Código de Defesa do Consumidor (CDC)",
    authority: "Agência Nacional de Aviação Civil (ANAC)",
    policies: [
      {
        topic: "Franquia de Bagagem (Mão e Despachada)",
        rules: [
          "Bagagem de mão: Todo passageiro tem direito garantido a levar gratuitamente 1 mala de mão de até 10 kg na cabine (dimensões padrão recomendadas: 55 x 35 x 25 cm).",
          "Item pessoal: É permitido levar 1 item pessoal adicional gratuito (como bolsa, pasta de notebook ou mochila pequena) que caiba sob o assento à frente.",
          "Bagagem despachada: As franquias despachadas (geralmente 23 kg para voos nacionais ou 23 kg/32 kg internacionais) dependem da classe tarifária adquirida (Promo, Light, Plus ou Max).",
          "Comprar bagagem com antecedência pelo sistema da agência ou da companhia aérea é até 50% mais barato do que pagar no balcão do aeroporto.",
        ],
        importantNotice: "Líquidos em voos internacionais devem estar em frascos de até 100 ml acondicionados em embalagem plástica transparente selada.",
      },
      {
        topic: "Direito de Arrependimento e Cancelamento sem Multa (24 horas)",
        rules: [
          "O passageiro pode desistir da compra da passagem aérea em até 24 horas a contar do recebimento do comprovante de emissão, sem qualquer custo ou penalidade.",
          "Requisito legal ANAC: A compra precisa ter sido efetuada com antecedência mínima de 7 (sete) dias em relação à data do voo.",
          "O reembolso das passagens canceladas dentro desta regra de 24h é integral, inclusive a taxa de embarque.",
        ],
        importantNotice: "Após o prazo de 24 horas, aplicam-se as regras tarifárias do bilhete emitido (multas de cancelamento ou retenção de crédito).",
      },
      {
        topic: "Alterações de Horário e Malha Aérea pela Companhia",
        rules: [
          "A companhia aérea deve informar o passageiro sobre alterações de horário ou itinerário com pelo menos 72 horas de antecedência do voo original.",
          "Alteração superior a 30 minutos em voos domésticos ou superior a 1 hora em voos internacionais dá ao passageiro o direito de escolher entre:",
          "1. Reacomodação gratuita no voo mais conveniente da mesma empresa ou de terceiros.",
          "2. Reembolso integral de todos os trechos não voados, sem qualquer taxa ou retenção.",
        ],
        importantNotice: "Caso a companhia não avise com 72h de antecedência e o passageiro compareça ao aeroporto, tem direito à assistência material imediata.",
      },
      {
        topic: "Atrasos de Voo e Assistência Material Escalonada",
        rules: [
          "Atraso a partir de 1 hora: Direito a facilidades de comunicação (acesso a internet, chamadas telefônicas).",
          "Atraso a partir de 2 horas: Direito a alimentação adequada (lanches, refeições ou vouchers fornecidos pela cia).",
          "Atraso a partir de 4 horas: Direito a serviço de hospedagem (em caso de pernoite), traslado de ida e volta ao hotel, além da opção de reacomodação em outro voo ou reembolso integral.",
        ],
        importantNotice: "A assistência material é devida mesmo em casos de condições meteorológicas adversas ou manutenção não programada da aeronave.",
      },
      {
        topic: "Proteção contra Cancelamento Automático por No-Show na Ida",
        rules: [
          "Se o passageiro não comparecer ao trecho de ida (no-show), a companhia aérea NÃO PODE cancelar automaticamente o trecho de volta.",
          "Requisito obrigatório: O passageiro deve notificar formalmente a companhia aérea ou a agência antes do horário programado do voo de ida informando que utilizará o trecho de volta.",
          "Esta proteção está consolidada pela jurisprudência pacificada do Superior Tribunal de Justiça (STJ) e normas de proteção ao consumidor.",
        ],
        importantNotice: "Sempre oriente o cliente a registrar o aviso de não comparecimento do voo de ida nos canais da companhia para blindar seu retorno.",
      },
      {
        topic: "Regras de Parcelamento e Condições Comerciais do Pacote",
        rules: [
          "Pacotes com voo + hotel podem ser parcelados em até 10x sem juros no cartão de crédito emitido no Brasil.",
          "Opção de boleto parcelado ou carnê sujeito a análise prévia de crédito com quitação antes da data do embarque.",
          "Seguro viagem internacional é obrigatório em diversos destinos (ex: Tratado de Schengen na Europa exige cobertura mínima de 30 mil euros para despesas médicas).",
        ],
        importantNotice: "Passaportes para viagens internacionais devem possuir validade mínima de 6 meses a contar da data prevista de retorno.",
      },
    ],
  };
}
