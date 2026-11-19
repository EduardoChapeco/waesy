import { getUnifiedNicheSpec, resolveUnifiedNicheId } from "@/lib/niches/niche-ssot";
import { parseTravelIntentDeterministically } from "@/lib/travel/travel-intent-parser";
import { buildBrazilPhoneVariants, sanitizePhoneDigits } from "@/lib/phone-match";
import { executeUnifiedAiCall } from "@/services/api-orchestrator.functions";
import { toolGetTourismAviationPolicies, toolLookupTourismPackages } from "@/services/whatsapp-ai-agent-tools.server";

export type CopilotBuyerIntent = "hot" | "warm" | "cold" | "support" | "financial";

export interface MultiNicheCopilotInsight {
  suggestedReply: string;
  buyerIntent: CopilotBuyerIntent;
  sdrScore: number;
  detectedObjections: string[];
  recommendedNextStep: string;
  nicheId: string;
  catalogMatchTitle: string | null;
  aiProviderUsed: string;
  generatedAt: string;
}

export interface LeadDossierAiExtractionPreview {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  destination: string | null;
  originCity: string | null;
  travelStart: string | null;
  travelEnd: string | null;
  interestType: string | null;
  paxAdults: number | null;
  paxChildren: number | null;
  estimatedValueCents: number | null;
  notesSummary: string | null;
  nicheId: string;
  nicheFields: Record<string, string | number | boolean | null>;
  source: "llm" | "deterministic";
  confidenceNotes: string[];
}

function buildNichePersonaDirectives(nicheId: string): {
  roleLabel: string;
  keyFocus: string;
  closingQuestion: string;
} {
  switch (nicheId) {
    case "tourism":
      return {
        roleLabel: "Consultor Especialista em Viagens e Roteiros",
        keyFocus: "destino, período/datas, origem, quantidade de adultos/crianças e padrão de hospedagem/aéreo",
        closingQuestion: "Qual período e quantas pessoas viajariam com você para eu já montar a melhor opção?",
      };
    case "real_estate":
      return {
        roleLabel: "Corretor e Especialista Imobiliário Consultivo",
        keyFocus: "tipo de imóvel, bairro/região, objetivo (compra ou locação), faixa de valor e disponibilidade para visita",
        closingQuestion: "Você prefere agendar uma visita presencial/por vídeo ou receber a ficha técnica completa e simulação de financiamento?",
      };
    case "automotive":
      return {
        roleLabel: "Consultor Automotivo SDR",
        keyFocus: "modelo/versão de interesse, ano/faixa de preço, se possui veículo na troca e forma de pagamento/financiamento",
        closingQuestion: "Você avalia colocar algum veículo na troca ou prefere simular financiamento/PIX com test-drive agendado?",
      };
    case "gastronomy":
      return {
        roleLabel: "Atendente de Pedidos & Reservas",
        keyFocus: "itens do cardápio, restrições, retirada ou entrega (bairro) e confirmação rápida do pedido",
        closingQuestion: "Quer que eu feche seu pedido agora para entrega ou retirada, ou prefere consultar mais algum item do cardápio?",
      };
    case "retail":
      return {
        roleLabel: "Consultor de Vendas & Catálogo",
        keyFocus: "produto/modelo, variação (tamanho/cor), disponibilidade em estoque, frete/entrega e condição no PIX/cartão",
        closingQuestion: "Qual variação ou quantidade você precisa para eu separar no estoque e passar o valor com entrega?",
      };
    case "services":
      return {
        roleLabel: "Especialista de Triagem Técnica e Orçamentos",
        keyFocus: "escopo do serviço/atendimento, urgência, localidade e melhor horário na agenda",
        closingQuestion: "Qual o melhor dia e horário para encaixarmos na agenda ou avançarmos com seu orçamento detalhado?",
      };
    case "health":
      return {
        roleLabel: "Concierge de Atendimento & Agendamento Clínico",
        keyFocus: "especialidade/procedimento buscado, convênio ou particular e melhor janela de horário",
        closingQuestion: "Prefere consultar os horários disponíveis ainda esta semana para garantirmos seu atendimento?",
      };
    default:
      return {
        roleLabel: "Consultor Comercial Omnichannel SDR",
        keyFocus: "necessidade principal, prazo desejado, orçamento e próximo passo claro para fechamento",
        closingQuestion: "Como prefere seguir — posso enviar a proposta organizada com condições ou tirar alguma dúvida específica?",
      };
  }
}

function formatTranscriptBlockFromMessages(messages: Array<Record<string, any>>): string {
  return messages
    .map((m) => {
      const role = m.is_staff_reply ? "Atendente" : "Cliente";
      const baseText = String(m.message || "").trim();
      const transcript =
        typeof m.payload?.transcript === "string" && m.payload.transcript.trim()
          ? `[Áudio transcrito: ${m.payload.transcript.trim()}]`
          : "";
      const visionSummary =
        typeof m.payload?.vision_summary === "string" && m.payload.vision_summary.trim()
          ? `[Print/Mídia analisada: ${m.payload.vision_summary.trim()}]`
          : "";
      const line = [baseText, transcript, visionSummary].filter(Boolean).join(" ");
      return `${role}: ${line}`.slice(0, 600);
    })
    .join("\n");
}

function inferIntentAndScoreHeuristic(messages: Array<Record<string, any>>, hasOpenLead: boolean): {
  buyerIntent: CopilotBuyerIntent;
  sdrScore: number;
  objections: string[];
} {
  const customerText = messages
    .filter((m) => !m.is_staff_reply)
    .map((m) => `${m.message || ""} ${m.payload?.transcript || ""} ${m.payload?.vision_summary || ""}`)
    .join(" ")
    .toLowerCase();

  const objections: string[] = [];
  if (/(caro|desconto|menor|parcela|entrada|orçamento|orcamento|preço|preco)/i.test(customerText)) {
    objections.push("Sensibilidade a preço / condição");
  }
  if (/(depois|pensar|ver com|marido|esposa|família|familia|sócios)/i.test(customerText)) {
    objections.push("Decisão compartilhada / prazo");
  }
  if (/(cancel|reembolso|reclama|atraso|problema|erro|sac)/i.test(customerText)) {
    return { buyerIntent: "support", sdrScore: 60, objections };
  }
  if (/(pix|boleto|fatura|pagamento|comprovante|nota fiscal)/i.test(customerText)) {
    return { buyerIntent: "financial", sdrScore: 86, objections };
  }
  if (/(quero|fechar|reservar|contratar|agendar|visita|comprar|pode mandar|disponível|valor|quanto)/i.test(customerText)) {
    return { buyerIntent: "hot", sdrScore: hasOpenLead ? 88 : 82, objections };
  }
  if (customerText.trim().length > 25) {
    return { buyerIntent: "warm", sdrScore: 64, objections };
  }
  return { buyerIntent: "cold", sdrScore: 40, objections };
}

/**
 * Motor Unificado Multi-Nicho do Copiloto IA SDR/BDR.
 * Adapta persona, catálogo real, áudio transcrito (Whisper) e prints (Vision/OCR) dinamicamente ao nicho da loja.
 */
export async function buildMultiNicheCopilotContextAndReply(params: {
  db: any;
  storeId: string;
  threadId: string;
  ownerId?: string;
  customInstruction?: string;
  latestMessageText?: string;
  persistToThread?: boolean;
}): Promise<MultiNicheCopilotInsight> {
  const {
    db,
    storeId,
    threadId,
    ownerId,
    customInstruction,
    latestMessageText,
    persistToThread = true,
  } = params;

  const [{ data: store }, { data: thread }, { data: rawMessages }] = await Promise.all([
    db
      .from("stores")
      .select("id, name, niche, ai_knowledge_base, settings")
      .eq("id", storeId)
      .maybeSingle(),
    db
      .from("chat_threads")
      .select("id, store_id, customer_id, guest_name, primary_phone_e164, lead_id, department, metadata, attribution")
      .eq("id", threadId)
      .eq("store_id", storeId)
      .maybeSingle(),
    db
      .from("chat_messages")
      .select("id, message, message_type, is_staff_reply, created_at, payload")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: false })
      .limit(18),
  ]);

  const messages = [...(rawMessages || [])].reverse();
  const threadMeta = (thread?.metadata && typeof thread.metadata === "object" ? thread.metadata : {}) as Record<string, any>;
  const settings = (store?.settings && typeof store.settings === "object" ? store.settings : {}) as Record<string, any>;
  const storeName = String(store?.name || "Nossa Equipe").trim();
  const customerName = String(thread?.guest_name || threadMeta.push_name || "Cliente").trim();
  const rawNiche = String(store?.niche || settings.niche || settings.segment || "turismo");
  const nicheId = resolveUnifiedNicheId(rawNiche);
  const directives = buildNichePersonaDirectives(nicheId);
  const nicheSpec = getUnifiedNicheSpec(nicheId);

  const lastCustomerMsg = [...messages].reverse().find((m) => !m.is_staff_reply);
  const latestTranscript = typeof lastCustomerMsg?.payload?.transcript === "string" ? lastCustomerMsg.payload.transcript : "";
  const queryText = latestMessageText || latestTranscript || lastCustomerMsg?.message || customInstruction || "informações";

  // Carrega catálogo real do tenant (sempre dados reais do banco)
  const [listingsRes, tourismPkgs, linkedLeadRes] = await Promise.all([
    Promise.resolve(
      db
        .from("store_listings")
        .select("id, title, short_description, price_cents, currency")
        .eq("store_id", storeId)
        .eq("status", "published")
        .limit(10),
    ).catch(() => ({ data: [] })),
    nicheId === "tourism"
      ? toolLookupTourismPackages({ storeId, query: queryText, limit: 2 }).catch(() => [])
      : Promise.resolve([]),
    thread?.lead_id
      ? db
          .from("leads_crm")
          .select("id, title, status, destination, estimated_value_cents, custom_fields")
          .eq("id", thread.lead_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const catalogLines: string[] = [];
  let catalogMatchTitle: string | null = null;
  if (Array.isArray(tourismPkgs) && tourismPkgs.length > 0) {
    catalogMatchTitle = tourismPkgs[0].title;
    for (const p of tourismPkgs) {
      catalogLines.push(`${p.title} (${p.destination}) — ${p.priceDisplay} · ${p.installmentTerms}`);
    }
  }
  const storeListings = Array.isArray(listingsRes?.data) ? listingsRes.data : [];
  for (const item of storeListings.slice(0, 6)) {
    if (!catalogMatchTitle) catalogMatchTitle = item.title;
    const priceStr =
      typeof item.price_cents === "number" && item.price_cents > 0
        ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.price_cents / 100)
        : "sob consulta";
    catalogLines.push(`${item.title} — ${priceStr}`);
  }

  let aviationContext = "";
  if (nicheId === "tourism" && /(anac|bagagem|mala|cancelamento|arrependimento|no-show|atraso)/i.test(queryText)) {
    const aviation = toolGetTourismAviationPolicies();
    aviationContext = aviation.policies
      .slice(0, 2)
      .map((p) => `${p.topic}: ${p.rules[0]}`)
      .join(" | ");
  }

  const attr = (thread?.attribution && typeof thread.attribution === "object" ? thread.attribution : {}) as Record<string, any>;
  const campaignContext = [attr.campaign, attr.adset_name, attr.ad_name, attr.utm_campaign].filter(Boolean).join(" · ");
  const transcriptStr = formatTranscriptBlockFromMessages(messages);
  const heuristic = inferIntentAndScoreHeuristic(messages, Boolean(linkedLeadRes?.data?.id));
  const continuousEntries = Array.isArray(settings.continuous_knowledge_entries)
    ? (settings.continuous_knowledge_entries as Array<Record<string, any>>)
        .map((e) => (e?.catalog_title ? `[${e.catalog_title}] ${e.fact}` : String(e?.fact || "")))
        .filter(Boolean)
        .slice(0, 8)
    : [];
  const staticKb = typeof store?.ai_knowledge_base === "string" ? store.ai_knowledge_base.slice(0, 1200) : "";
  const knowledgeBase = [staticKb, continuousEntries.length > 0 ? `Fatos aprendidos:\n- ${continuousEntries.join("\n- ")}` : ""]
    .filter(Boolean)
    .join("\n\n");

  const aiRes = await executeUnifiedAiCall({
    storeId,
    ownerId,
    feature: "omnichannel_sdr_copilot",
    taskType: "fast_json",
    responseFormat: "json_object",
    temperature: 0.4,
    maxTokens: 700,
    systemPrompt: `Você é ${directives.roleLabel} (${nicheSpec.copilotProfile.systemPersona}) da empresa ${storeName} (Nicho: ${nicheSpec.label}, Tom: ${nicheSpec.copilotProfile.tone}, Foco de qualificação: ${directives.keyFocus}).
Regras:
- ${(nicheSpec.copilotProfile.sdrRules || []).slice(0, 3).join("\n- ")}
- Responda no WhatsApp de forma humana, direta, objetiva (máximo 3 a 4 frases curtas) sem clichês robóticos.
- Nunca invente preços, links ou estoque que não constem no catálogo real abaixo.
- Se houver transcrições de áudio ou prints analisados no histórico, considere-os integralmente.
- Retorne JSON estrito:
{
  "suggestedReply": "texto pronto para o atendente enviar ao cliente",
  "buyerIntent": "hot" | "warm" | "cold" | "support" | "financial",
  "sdrScore": número 0..100,
  "detectedObjections": ["objeção opcional"],
  "recommendedNextStep": "próxima ação tática curta para o atendente",
  "catalogMatchTitle": "título exato do item do catálogo relacionado ou null"
}`,
    userPrompt: `Cliente: ${customerName}
Campanha/Origem: ${campaignContext || "Orgânico / Direto"}
Lead CRM ativo: ${linkedLeadRes?.data ? `${linkedLeadRes.data.title || linkedLeadRes.data.destination || "Sim"} (${linkedLeadRes.data.status})` : "Ainda sem ficha vinculada"}
${customInstruction ? `Instrução do atendente: ${customInstruction}` : ""}
Catálogo real da loja:
${catalogLines.length > 0 ? catalogLines.join("\n") : "Nenhum item listado; qualifique a necessidade do cliente."}
${knowledgeBase ? `Base de conhecimento da loja:\n${knowledgeBase}` : ""}
${aviationContext ? `Normas ANAC:\n${aviationContext}` : ""}
Histórico recente (incluindo áudios transcritos e prints):
${transcriptStr || `Cliente: ${queryText}`}`,
  }).catch(() => ({ content: null, text: "", provider: null, model: "", error: "ai_unavailable" }));

  const nowIso = new Date().toISOString();
  let insight: MultiNicheCopilotInsight | null = null;

  if (aiRes && aiRes.content) {
    try {
      const clean = aiRes.content.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(clean) as Record<string, any>;
      if (typeof parsed.suggestedReply === "string" && parsed.suggestedReply.trim()) {
        const intentVal = parsed.buyerIntent;
        const buyerIntent: CopilotBuyerIntent =
          intentVal === "hot" ||
          intentVal === "warm" ||
          intentVal === "cold" ||
          intentVal === "support" ||
          intentVal === "financial"
            ? intentVal
            : heuristic.buyerIntent;
        const sdrScore =
          typeof parsed.sdrScore === "number" && Number.isFinite(parsed.sdrScore)
            ? Math.max(0, Math.min(100, Math.round(parsed.sdrScore)))
            : heuristic.sdrScore;
        insight = {
          suggestedReply: parsed.suggestedReply.trim(),
          buyerIntent,
          sdrScore,
          detectedObjections: Array.isArray(parsed.detectedObjections)
            ? parsed.detectedObjections.map((x: unknown) => String(x)).filter(Boolean).slice(0, 5)
            : heuristic.objections,
          recommendedNextStep:
            typeof parsed.recommendedNextStep === "string" && parsed.recommendedNextStep.trim()
              ? parsed.recommendedNextStep.trim()
              : "Qualificar interesse e avançar proposta comercial.",
          nicheId,
          catalogMatchTitle:
            typeof parsed.catalogMatchTitle === "string" && parsed.catalogMatchTitle.trim()
              ? parsed.catalogMatchTitle.trim()
              : catalogMatchTitle,
          aiProviderUsed: String((aiRes as any).provider || "llm"),
          generatedAt: nowIso,
        };
      }
    } catch {
      // Fall through to deterministic fallback using real context
    }
  }

  if (!insight) {
    const catalogSnippet = catalogLines.length > 0 ? `\n\nTemos disponível: ${catalogLines[0]}.` : "";
    insight = {
      suggestedReply: `Olá, ${customerName}! Aqui é da ${storeName}.${catalogSnippet}\n\n${directives.closingQuestion}`,
      buyerIntent: heuristic.buyerIntent,
      sdrScore: heuristic.sdrScore,
      detectedObjections: heuristic.objections,
      recommendedNextStep:
        heuristic.buyerIntent === "hot"
          ? "Enviar proposta/condições e avançar fechamento"
          : "Confirmar parâmetros principais do pedido e criar/atualizar lead",
      nicheId,
      catalogMatchTitle,
      aiProviderUsed: "fallback_deterministic",
      generatedAt: nowIso,
    };
  }

  if (persistToThread && thread?.id) {
    await db
      .from("chat_threads")
      .update({
        metadata: {
          ...threadMeta,
          ai_copilot_suggestion: {
            ...insight,
            createdAt: nowIso,
          },
        },
      })
      .eq("id", threadId)
      .eq("store_id", storeId)
      .then(() => null, () => null);
  }

  return insight;
}

/**
 * Consolida histórico completo do chat (incluindo áudios transcritos e prints analisados),
 * extrai campos estruturados para o nicho da loja e aplica na ficha do Lead (`leads_crm`) sob confirmação.
 */
export async function extractLeadDossierFromThreadServer(params: {
  db: any;
  storeId: string;
  threadId?: string | null;
  leadId?: string | null;
  ownerId?: string;
  apply?: boolean;
  overwriteExisting?: boolean;
}): Promise<{
  preview: LeadDossierAiExtractionPreview;
  applied: boolean;
  leadId: string | null;
}> {
  const {
    db,
    storeId,
    threadId,
    leadId,
    ownerId,
    apply = false,
    overwriteExisting = false,
  } = params;

  let resolvedLead: Record<string, any> | null = null;
  if (leadId) {
    const { data } = await db
      .from("leads_crm")
      .select("*")
      .eq("id", leadId)
      .eq("store_id", storeId)
      .maybeSingle();
    resolvedLead = data;
  }

  let resolvedThread: Record<string, any> | null = null;
  if (threadId) {
    const { data } = await db
      .from("chat_threads")
      .select("*")
      .eq("id", threadId)
      .eq("store_id", storeId)
      .maybeSingle();
    resolvedThread = data;
  } else if (resolvedLead) {
    const digits = sanitizePhoneDigits(resolvedLead.phone || "");
    const variants = buildBrazilPhoneVariants(resolvedLead.phone || "");
    const { data: thByLead } = await db
      .from("chat_threads")
      .select("*")
      .eq("store_id", storeId)
      .eq("lead_id", resolvedLead.id)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (thByLead) {
      resolvedThread = thByLead;
    } else if (digits.length >= 8 && variants.length > 0) {
      const orClause = variants.map((v) => `primary_phone_e164.eq.${v}`).join(",");
      const { data: thByPhone } = await db
        .from("chat_threads")
        .select("*")
        .eq("store_id", storeId)
        .or(orClause)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      resolvedThread = thByPhone;
    }
  }

  if (!resolvedLead && resolvedThread?.lead_id) {
    const { data } = await db
      .from("leads_crm")
      .select("*")
      .eq("id", resolvedThread.lead_id)
      .eq("store_id", storeId)
      .maybeSingle();
    resolvedLead = data;
  }

  const [{ data: store }, messagesRes] = await Promise.all([
    db.from("stores").select("id, name, niche, settings").eq("id", storeId).maybeSingle(),
    resolvedThread?.id
      ? db
          .from("chat_messages")
          .select("id, message, message_type, is_staff_reply, created_at, payload")
          .eq("thread_id", resolvedThread.id)
          .order("created_at", { ascending: false })
          .limit(35)
      : Promise.resolve({ data: [] }),
  ]);

  const rawNiche = String(store?.niche || store?.settings?.niche || "turismo");
  const nicheId = resolveUnifiedNicheId(rawNiche);
  const nicheSpec = getUnifiedNicheSpec(nicheId);
  const messages = [...(messagesRes.data || [])].reverse();
  const transcriptText = formatTranscriptBlockFromMessages(messages);

  const detParsed = parseTravelIntentDeterministically(
    [resolvedLead?.raw_intent_markdown, resolvedLead?.notes, transcriptText].filter(Boolean).join("\n"),
    { defaultOriginCity: resolvedLead?.origin_city || null },
  );

  const schemaFieldNames = (nicheSpec.dynamicFields?.clientFields || [])
    .map((f) => `${f.key} (${f.label})`)
    .join(", ");

  let preview: LeadDossierAiExtractionPreview = {
    fullName: detParsed.contact.fullName || resolvedThread?.guest_name || resolvedLead?.full_name || null,
    email: detParsed.contact.email || resolvedThread?.guest_email || resolvedLead?.email || null,
    phone: detParsed.contact.whatsapp || resolvedThread?.primary_phone_e164 || resolvedLead?.phone || null,
    title:
      detParsed.destinations.length > 0
        ? `Atendimento · ${detParsed.destinations.map((d) => d.label).join(", ")}`
        : resolvedLead?.title || null,
    destination:
      detParsed.destinations.length > 0
        ? detParsed.destinations.map((d) => d.label).join(", ")
        : resolvedLead?.destination || null,
    originCity: detParsed.contact.originCity || resolvedLead?.origin_city || null,
    travelStart: detParsed.period.startDate || resolvedLead?.travel_start || null,
    travelEnd: detParsed.period.endDate || resolvedLead?.travel_end || null,
    interestType: resolvedLead?.interest_type || null,
    paxAdults: detParsed.adultsCount || resolvedLead?.pax_adults || null,
    paxChildren: detParsed.childrenAges.length || resolvedLead?.pax_children || null,
    estimatedValueCents: detParsed.budget.maxTotalBudgetCents || resolvedLead?.estimated_value_cents || null,
    notesSummary: messages.length > 0 ? `Resumo do chat (${messages.length} msgs)` : null,
    nicheId,
    nicheFields: {},
    source: "deterministic",
    confidenceNotes: ["Extração determinística baseada em histórico e transcrições disponíveis."],
  };

  if (transcriptText.trim().length >= 8) {
    const aiRes = await executeUnifiedAiCall({
      storeId,
      ownerId,
      feature: "omnichannel_lead_autofill",
      taskType: "fast_json",
      responseFormat: "json_object",
      temperature: 0.1,
      maxTokens: 900,
      systemPrompt: `Extraia dados reais do cliente a partir do atendimento para preencher o card do CRM no nicho "${nicheSpec.label}".
Campos esperados para niche_fields: ${schemaFieldNames || "informações comerciais gerais"}.
REGRAS:
- Nunca invente nomes, datas, valores ou e-mails não mencionados no histórico. Se não souber, retorne null.
- Considere áudios transcritos e resumos de prints como fonte legítima.
Retorne JSON estrito:
{
  "full_name": string | null,
  "email": string | null,
  "phone": string | null,
  "title": string | null,
  "destination": string | null,
  "origin_city": string | null,
  "travel_start": "YYYY-MM-DD" | null,
  "travel_end": "YYYY-MM-DD" | null,
  "interest_type": string | null,
  "pax_adults": number | null,
  "pax_children": number | null,
  "estimated_value_brl": number | null,
  "notes_summary": string | null,
  "niche_fields": { ... }
}`,
      userPrompt: `Conversa completa (com transcrições e prints):\n${transcriptText.slice(-6000)}`,
    }).catch(() => ({ content: null, text: "", provider: null, model: "", error: "ai_unavailable" }));

    if (aiRes && aiRes.content) {
      try {
        const clean = aiRes.content.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
        const parsed = JSON.parse(clean) as Record<string, any>;
        const estReais = Number(parsed.estimated_value_brl);
        preview = {
          fullName: typeof parsed.full_name === "string" && parsed.full_name.trim() ? parsed.full_name.trim() : preview.fullName,
          email: typeof parsed.email === "string" && parsed.email.includes("@") ? parsed.email.trim() : preview.email,
          phone: typeof parsed.phone === "string" && parsed.phone.trim() ? parsed.phone.trim() : preview.phone,
          title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : preview.title,
          destination: typeof parsed.destination === "string" && parsed.destination.trim() ? parsed.destination.trim() : preview.destination,
          originCity: typeof parsed.origin_city === "string" && parsed.origin_city.trim() ? parsed.origin_city.trim() : preview.originCity,
          travelStart: typeof parsed.travel_start === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.travel_start) ? parsed.travel_start : preview.travelStart,
          travelEnd: typeof parsed.travel_end === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.travel_end) ? parsed.travel_end : preview.travelEnd,
          interestType: typeof parsed.interest_type === "string" && parsed.interest_type.trim() ? parsed.interest_type.trim() : preview.interestType,
          paxAdults: typeof parsed.pax_adults === "number" && parsed.pax_adults > 0 ? Math.round(parsed.pax_adults) : preview.paxAdults,
          paxChildren: typeof parsed.pax_children === "number" && parsed.pax_children >= 0 ? Math.round(parsed.pax_children) : preview.paxChildren,
          estimatedValueCents:
            Number.isFinite(estReais) && estReais > 0 ? Math.round(estReais * 100) : preview.estimatedValueCents,
          notesSummary:
            typeof parsed.notes_summary === "string" && parsed.notes_summary.trim()
              ? parsed.notes_summary.trim()
              : preview.notesSummary,
          nicheId,
          nicheFields:
            parsed.niche_fields && typeof parsed.niche_fields === "object"
              ? (parsed.niche_fields as Record<string, string | number | boolean | null>)
              : {},
          source: "llm",
          confidenceNotes: ["Extração consolidada via IA multimodal lendo chat, áudios e prints."],
        };
      } catch {
        // Preserve deterministic extraction
      }
    }
  }

  let applied = false;
  if (apply && resolvedLead?.id) {
    const curCustom =
      resolvedLead.custom_fields && typeof resolvedLead.custom_fields === "object"
        ? (resolvedLead.custom_fields as Record<string, any>)
        : {};
    const mergedNicheFields = {
      ...(curCustom.niche_fields && typeof curCustom.niche_fields === "object" ? curCustom.niche_fields : {}),
      ...Object.fromEntries(
        Object.entries(preview.nicheFields || {}).filter(([, val]) => val !== null && val !== undefined && val !== ""),
      ),
    };

    const pickValue = <T>(incoming: T | null | undefined, existing: T | null | undefined): T | undefined => {
      if (incoming === null || incoming === undefined || incoming === "") return undefined;
      if (!overwriteExisting && existing !== null && existing !== undefined && existing !== "") return undefined;
      return incoming;
    };

    const existingNotes = String(resolvedLead.notes || "").trim();
    const shouldAppendNotes =
      preview.notesSummary && !existingNotes.includes(preview.notesSummary.slice(0, 60));

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      last_contacted_at: new Date().toISOString(),
      custom_fields: {
        ...curCustom,
        niche_id: nicheId,
        niche_fields: mergedNicheFields,
        ai_autofill_meta: {
          source: preview.source,
          updated_at: new Date().toISOString(),
          thread_id: resolvedThread?.id || null,
        },
      },
    };

    const nextName = pickValue(preview.fullName, resolvedLead.full_name);
    if (nextName !== undefined) patch.full_name = nextName;
    const nextEmail = pickValue(preview.email, resolvedLead.email);
    if (nextEmail !== undefined) patch.email = nextEmail;
    const nextPhone = pickValue(preview.phone, resolvedLead.phone);
    if (nextPhone !== undefined) patch.phone = nextPhone;
    const nextTitle = pickValue(preview.title, resolvedLead.title);
    if (nextTitle !== undefined) patch.title = nextTitle;
    const nextDest = pickValue(preview.destination, resolvedLead.destination);
    if (nextDest !== undefined) patch.destination = nextDest;
    const nextOrigin = pickValue(preview.originCity, resolvedLead.origin_city);
    if (nextOrigin !== undefined) patch.origin_city = nextOrigin;
    const nextStart = pickValue(preview.travelStart, resolvedLead.travel_start);
    if (nextStart !== undefined) patch.travel_start = nextStart;
    const nextEnd = pickValue(preview.travelEnd, resolvedLead.travel_end);
    if (nextEnd !== undefined) patch.travel_end = nextEnd;
    const nextIntType = pickValue(preview.interestType, resolvedLead.interest_type);
    if (nextIntType !== undefined) patch.interest_type = nextIntType;
    const nextAdults = pickValue(preview.paxAdults, resolvedLead.pax_adults);
    if (nextAdults !== undefined) patch.pax_adults = nextAdults;
    const nextChildren = pickValue(preview.paxChildren, resolvedLead.pax_children);
    if (nextChildren !== undefined) patch.pax_children = nextChildren;
    const nextValue = pickValue(preview.estimatedValueCents, resolvedLead.estimated_value_cents);
    if (nextValue !== undefined) patch.estimated_value_cents = nextValue;
    if (shouldAppendNotes && preview.notesSummary) {
      patch.notes = existingNotes ? `${existingNotes}\n${preview.notesSummary}` : preview.notesSummary;
    }

    const { error: updateErr } = await db
      .from("leads_crm")
      .update(patch)
      .eq("id", resolvedLead.id)
      .eq("store_id", storeId);

    if (!updateErr) {
      applied = true;
    }
  }

  return {
    preview,
    applied,
    leadId: resolvedLead?.id || null,
  };
}
