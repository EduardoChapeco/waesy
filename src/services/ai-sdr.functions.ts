/**
 * ai-sdr.functions.ts — Funções de IA para Classificados
 *
 * 1. createListingWithAI   — Pré-preenche anúncio a partir de texto livre (integrado ao pool)
 * 2. chatWithSDR           — Agente SDR com regras estritas de negociação e anti-injection
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { sanitizeForAI } from "@/lib/ai/openrouter";
import { getNextActiveKey, executeUnifiedAiCall } from "@/services/api-orchestrator.functions";
import { getAiPersonaContextInternal } from "@/services/ai-persona.functions";

// ─── Schema do Anúncio Pré-preenchido (Omni-Extractor V121) ─────────────────
const AIClassifiedSchema = z.object({
  category: z.enum([
    "sale",
    "vehicle",
    "real_estate",
    "service",
    "job",
    "travel",
    "equipment",
    "donation",
  ]).default("sale").describe("Categoria base estrutural do anúncio."),
  niche: z.string().default("desapego").describe("O id do nicho (ex: desapego, imovel, veiculo, digital)."),
  subcategory: z.string().optional().describe("Subcategoria opcional."),
  title: z.string().default("Anúncio sem título").describe("Título otimizado para o anúncio."),
  content: z.string().optional().default("").describe("Descrição clara e bem estruturada."),
  description: z.string().optional().default("").describe("Descrição alternativa."),
  price_cents: z.number().nullable().optional().default(null).describe("Preço estimado em centavos, ou null se indefinido."),
  location: z.string().optional().default("").describe("Bairro, cidade ou região inferida do anúncio."),
  delivery_type: z.enum(["pickup", "shipping", "hand_delivery", "online", "negotiable"]).default("pickup").describe("Modalidade logística inferida."),
  seo_meta_tags: z.array(z.string()).default([]).describe("Tags de indexação e busca SEO."),
  search_tags: z.array(z.string()).default([]).describe("Palavras-chave de busca interna."),
  attributes: z.record(z.any()).optional().default({}).describe("Atributos extras baseados no texto."),
}).transform((val) => ({
  ...val,
  content: val.content || val.description || "",
  description: val.description || val.content || "",
}));

// ─── Fallback heurístico estruturado (sem IA) ────────────────────────────────
function parsePromptFallback(rawPrompt: string) {
  const prompt = rawPrompt.trim();
  const lower = prompt.toLowerCase();
  let category: "sale" | "vehicle" | "real_estate" | "service" | "job" | "travel" | "equipment" | "donation" = "sale";
  let niche = "desapego";

  if (/(carro|moto|ve[ií]culo|caminh[aã]o|km\b|manual|autom[aá]tico|flex|gasolina|honda|toyota|fiat|chevrolet|volkswagen|yamaha)/i.test(lower)) {
    category = "vehicle"; niche = "veiculo";
  } else if (/(apto|apartamento|casa|terreno|im[oó]vel|aluguel|temporada|kitnet|sobrado|quarto|su[ií]te)/i.test(lower)) {
    category = "real_estate"; niche = /(temporada|di[aá]ria)/i.test(lower) ? "hospedagem" : "imovel";
  } else if (/(servi[cç]o|reparo|conserto|manuten[cç][aã]o|pintor|eletricista|diarista|frete|aula|consultoria)/i.test(lower)) {
    category = "service"; niche = "servico";
  } else if (/(vaga|emprego|contrata-se|contratando|est[aá]gio|desenvolvedor|vendedor|atendente)/i.test(lower)) {
    category = "job"; niche = "vaga";
  } else if (/(viagem|pacote|hotel|resort|passagem|turismo|passeio|excurs[aã]o)/i.test(lower)) {
    category = "travel"; niche = "viagem";
  } else if (/(doa[cç][aã]o|doar|gr[aá]tis|de\s+gra[cç]a)/i.test(lower)) {
    category = "donation"; niche = "doacao";
  } else if (/(curso|ebook|template|c[oó]digo|software|mentoria)/i.test(lower)) {
    category = "sale"; niche = "digital";
  }

  let price_cents: number | null = null;
  const priceMatch = prompt.match(/(?:r\$\s*|por\s+r\$\s*|valor\s*:?\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:,\d{2})?)/i);
  if (priceMatch && !/(iphone|ano|\d{4}\b)/i.test(priceMatch[0])) {
    const rawVal = priceMatch[1].replace(/\./g, "").replace(",", ".");
    const parsed = parseFloat(rawVal);
    if (!isNaN(parsed)) price_cents = Math.round(parsed * 100);
  }

  // Extração de localização inferida
  let location = "";
  const locMatch = prompt.match(/(?:moro no|moro em|bairro|no centro|em|na regi[aã]o d[eoa])\s+([a-zA-ZÀ-ÿ\s]{3,25})(?:,|\.|\be\b|$)/i);
  if (locMatch && locMatch[1]) {
    location = locMatch[1].trim();
  }

  // Extração de logística inferida
  let delivery_type: "pickup" | "shipping" | "hand_delivery" | "online" | "negotiable" = "pickup";
  if (/entrego em m[aã]os|em m[aã]os/i.test(lower)) {
    delivery_type = "hand_delivery";
  } else if (/envio|correios|sedex|frete/i.test(lower)) {
    delivery_type = "shipping";
  } else if (/online|download|acesso imediato|digital/i.test(lower)) {
    delivery_type = "online";
  } else if (/retirada|retirar|buscar/i.test(lower)) {
    delivery_type = "pickup";
  }

  let title = prompt;
  if (priceMatch) title = title.replace(priceMatch[0], "").trim();
  title = title.replace(/^(quero\s+vender|vendo|vende-se|anuncio|anunciar|procuro|ofere[cç]o)\s+/i, "");
  title = title.charAt(0).toUpperCase() + title.slice(1);
  if (title.length > 70) title = title.slice(0, 67) + "...";

  const search_tags = prompt
    .toLowerCase()
    .replace(/[^\w\sà-ÿ]/gi, "")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 6);

  return {
    category,
    niche,
    title,
    content: prompt,
    description: prompt,
    price_cents,
    location,
    delivery_type,
    seo_meta_tags: search_tags,
    search_tags,
    attributes: {},
  };
}

// ─── [REQ-1] Criar Anúncio com IA — Integrado ao Pool ──────────────────────────
export const createListingWithAI = createServerFn({ method: "POST" })
  .validator(
    z.union([
      z.object({ prompt: z.string().min(3).max(250) }),
      z.object({ data: z.object({ prompt: z.string().min(3).max(250) }) }).transform((v) => v.data),
    ])
  )
  .handler(async (ctx) => {
    const rawPrompt = typeof ctx.data === "object" && "prompt" in ctx.data
      ? (ctx.data as any).prompt
      : String(ctx.data || "");

    if (!rawPrompt.trim()) {
      throw new Error("O texto descritivo do anúncio é obrigatório.");
    }

    // Sanitiza o input antes de enviar à IA
    const sanitizedPrompt = sanitizeForAI(rawPrompt, 250);

    // Identidade opcional — não barrar visitantes
    await getServerIdentity().catch(() => null);

    const systemPrompt = `Você é o Omni-Extractor de IA da plataforma Waesy.
O usuário enviará uma frase dizendo o que deseja anunciar (ex: "Vendo PS5 semi novo por 3000 reais, moro no centro e entrego em mãos").
Extraia e infira TODAS as dimensões estruturadas: categoria, nicho, subcategoria, título, descrição, preço em centavos, localização, tipo de entrega, tags de SEO e busca.

Regras de Nicho e Categoria:
- "niche" DEVE ser OBRIGATORIAMENTE um destes valores canônicos:
  * "desapego": roupas, celulares, computadores, videogames, eletrônicos, móveis, eletrodomésticos. (category: "sale")
  * "veiculo": carros, motos, barcos, utilitários, peças. (category: "vehicle")
  * "imovel": casas, apartamentos, terrenos, salas comerciais. (category: "real_estate")
  * "hospedagem": chalés, diárias, pousadas, casas de temporada. (category: "real_estate")
  * "servico": prestadores de serviço, autônomos, assistências, fretes. (category: "service")
  * "vaga": vagas de emprego, estágios e contratações. (category: "job")
  * "viagem": pacotes de turismo, passagens, excursões. (category: "travel")
  * "equipamento": máquinas industriais, equipamentos pesados e agro. (category: "equipment")
  * "digital": infoprodutos, cursos, e-books, softwares, templates. (category: "sale")
  * "doacao": itens gratuitos e desapego solidário. (category: "donation")
  * "negocios": repasse de ponto comercial, venda de empresas ou cotas. (category: "sale")

Regras de Logística ("delivery_type"):
- "pickup": retirada no local
- "shipping": envio por correios/transportadora
- "hand_delivery": entrega em mãos na região
- "online": entrega digital/remota
- "negotiable": a combinar

Retorne APENAS UM JSON VÁLIDO:
{
  "category": "sale",
  "niche": "desapego",
  "subcategory": "games_consoles",
  "title": "PlayStation 5 825GB Semi Novo com Controle",
  "description": "PlayStation 5 semi novo em excelente estado...",
  "price_cents": 300000,
  "location": "Centro",
  "delivery_type": "hand_delivery",
  "seo_meta_tags": ["ps5", "playstation 5", "games", "sony", "videogame"],
  "search_tags": ["ps5", "console", "seminovo", "videogame"],
  "attributes": {}
}
Sem blocos markdown adicionais. Apenas o JSON puro.`;

    try {
      const response = await executeUnifiedAiCall({
        systemPrompt,
        userPrompt: sanitizedPrompt,
        responseFormat: "json_object",
        maxTokens: 600,
        temperature: 0.2,
      });
      const parsedData = response.parsedJson || JSON.parse(response.content);

      // Normalização defensiva caso o modelo use nomes alternativos
      if (!parsedData.content && (parsedData.description || parsedData.descricao)) {
        parsedData.content = parsedData.description || parsedData.descricao;
      }
      if (!parsedData.title && parsedData.titulo) {
        parsedData.title = parsedData.titulo;
      }
      if (parsedData.price_cents === undefined && parsedData.price !== undefined) {
        const num = typeof parsedData.price === "number" ? parsedData.price : parseFloat(String(parsedData.price).replace(/[^\d.,]/g, "").replace(",", "."));
        if (!isNaN(num)) {
          parsedData.price_cents = Math.round(num < 1000 ? num * 100 : num);
        }
      }

      const DESAPEGO_SUBS = ["celulares", "computadores", "moveis", "eletrodomesticos", "moda_brecho", "tenis_calcados", "joias_relogios", "eletronicos", "games_consoles", "instrumentos", "esportes_fitness", "bebes_criancas", "ferramentas", "outros"];
      if (DESAPEGO_SUBS.includes(parsedData.niche)) {
        parsedData.subcategory = parsedData.niche;
        parsedData.niche = "desapego";
        parsedData.category = "sale";
      }

      const validatedData = AIClassifiedSchema.parse(parsedData);
      return { success: true, listing: validatedData };
    } catch (e: any) {
      console.warn("[ai-sdr] Fallback heurístico acionado:", e?.message);
      return { success: true, listing: parsePromptFallback(sanitizedPrompt) };
    }
  });

// ─── [REQ-2][REQ-6][REQ-7][REQ-19][REQ-20] Chat SDR Polimórfico (Produto / Classificado / Loja) ────────
export const chatWithSDR = createServerFn({ method: "POST" })
  .validator(z.object({
    classifiedId: z.string().uuid().optional(),
    productId: z.string().uuid().optional(),
    storeId: z.string().uuid().optional(),
    messages: z.array(z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().max(2000),
    })).max(50),
    sessionId: z.string().optional(),
  }))
  .handler(async (ctx) => {
    const { classifiedId, productId, storeId, messages, sessionId } = ctx.data;
    if (!classifiedId && !productId && !storeId) {
      throw new Error("Identificador do item ou loja não informado.");
    }
    const db = getServerClient();

    let userId: string | null = null;
    try {
      const identity = await getServerIdentity();
      userId = identity.user_id || null;
    } catch { /* visitante anônimo */ }

    let itemTitle = "";
    let basePriceCents = 0;
    let itemNiche = "geral";
    let itemDescription = "";
    let isPickupOnly = false;
    let maxDiscountPct = 0;
    let storeData: any = null;
    let targetStoreId: string | null = null;
    let customAiInstructions = "";
    let isDonationListing = false;
    let isTravel = false;

    // 1. Resolução polimórfica da entidade (Produto Workspace Pro, Classificado ou Loja)
    if (productId) {
      const { data: prod, error } = await db
        .from("products")
        .select(`
          id, title, description, short_description, price_cents, compare_at_cents,
          attributes, is_physical, store_id,
          store:stores (id, name, slug, phone, ai_knowledge_base, ai_sales_agent_enabled, settings)
        `)
        .eq("id", productId)
        .maybeSingle();

      if (error || !prod) throw new Error("Produto não encontrado.");
      storeData = Array.isArray(prod.store) ? prod.store[0] : prod.store;
      targetStoreId = prod.store_id || null;
      itemTitle = prod.title;
      basePriceCents = prod.price_cents || 0;
      itemDescription = prod.description || prod.short_description || "";
      const storeSettings = storeData?.settings || {};
      itemNiche = storeSettings.niche || storeSettings.segment || "lojas";
      isTravel = Boolean(
        itemNiche === "tourism" ||
        itemNiche === "viagem" ||
        itemTitle.toLowerCase().includes("resort") ||
        itemTitle.toLowerCase().includes("viagem") ||
        prod.attributes?.travel
      );
      isPickupOnly = false;
      customAiInstructions = storeSettings.ai_instructions || "";
    } else if (classifiedId) {
      const { data: classified, error } = await db
        .from("classifieds")
        .select(`
          id, title, content, price_cents, category, sub_category, deal_type, attributes,
          ai_agent_enabled, ai_instructions, max_discount_pct,
          delivery_type, contact_whatsapp, store_id,
          store:stores (id, name, ai_knowledge_base, ai_sales_agent_enabled)
        `)
        .eq("id", classifiedId)
        .maybeSingle();

      if (error || !classified) throw new Error("Anúncio não encontrado.");
      storeData = Array.isArray(classified.store) ? classified.store[0] : classified.store;
      targetStoreId = classified.store_id || null;
      itemTitle = classified.title;
      basePriceCents = classified.price_cents || 0;
      itemDescription = classified.content || "";
      itemNiche = (classified.attributes as any)?.niche || classified.sub_category || classified.category || "desapego";
      isTravel = Boolean(
        itemNiche === "viagem" ||
        itemNiche === "turismo" ||
        itemTitle.toLowerCase().includes("pacote") ||
        itemTitle.toLowerCase().includes("resort")
      );
      isPickupOnly = classified.delivery_type === "pickup" || classified.delivery_type === "local_pickup";
      maxDiscountPct = classified.max_discount_pct ?? 0;
      customAiInstructions = classified.ai_instructions || "";
      isDonationListing = classified.deal_type === "doacao" || classified.category === "donation" || basePriceCents === 0;
    } else if (storeId) {
      const { data: store, error } = await db
        .from("stores")
        .select("id, name, slug, phone, ai_knowledge_base, ai_sales_agent_enabled, settings, description")
        .eq("id", storeId)
        .maybeSingle();

      if (error || !store) throw new Error("Loja não encontrada.");
      storeData = store;
      targetStoreId = store.id;
      itemTitle = `Atendimento da Empresa ${store.name}`;
      basePriceCents = 0;
      itemDescription = store.description || "";
      const storeSettings = store.settings || {};
      itemNiche = storeSettings.niche || storeSettings.segment || "lojas";
      isTravel = itemNiche === "tourism" || itemNiche === "viagem";
    }

    // Buscar produtos complementares da loja para cross-selling no SDR
    let complementaryProducts: Array<{ title: string; price_cents: number; slug?: string }> = [];
    if (targetStoreId) {
      try {
        const { data: prods } = await db
          .from("products")
          .select("title, price_cents, slug")
          .eq("store_id", targetStoreId)
          .in("status", ["published", "active"])
          .limit(6);
        if (prods && prods.length > 0) {
          complementaryProducts = prods;
        }
      } catch (e) {
        console.warn("[sdr] Erro ao buscar produtos complementares:", e);
      }
    }

    // 2. Sanitizar mensagens do usuário (anti-injection)
    const sanitizedMessages = messages.map((m) => ({
      role: m.role,
      content: m.role === "user" ? sanitizeForAI(m.content, 1000) : m.content,
    }));

    // 3. Montar System Prompt do Agente SDR
    const minAcceptablePriceCents = Math.round(basePriceCents * (1 - maxDiscountPct / 100));

    // Buscar telemetria comportamental da Persona (Omni-Telemetry Brain)
    let buyerPersonaBlock = "";
    try {
      const personaContext = await getAiPersonaContextInternal({
        userId,
        sessionId: sessionId || null,
      });
      buyerPersonaBlock = `
=== PERFIL COMPORTAMENTAL DO COMPRADOR (TELEMETRIA SILENCIOSA) ===
Intenção Inferida: ${personaContext.intent.toUpperCase()}
Sensibilidade a Preço: ${personaContext.price_bracket.toUpperCase()}${personaContext.avg_ticket_cents > 0 ? ` (Ticket Médio Observado: R$ ${(personaContext.avg_ticket_cents / 100).toFixed(2)})` : ""}
Tom Recomendado: ${personaContext.recommended_tone}
Interesses e Afinidades: ${personaContext.affinities.join(", ") || "Nenhum histórico"}
Buscas Recentes: ${personaContext.recent_searches.join(", ") || "Nenhuma"}
Orientação Estratégica: Adapte sutilmente sua abordagem ao perfil (${personaContext.intent}) e faixa (${personaContext.price_bracket}). Jamais diga que possui acesso a estes dados de rastreamento. Seja natural, profissional e empático.
`;
    } catch (e) {
      // Ignora falhas para manter chat resiliente
    }

    const tourismDirectives = isTravel ? `
=== DIRETRIZES DE TURISMO & VIAGENS (MANDATO ESTRITO) ===
- Você representa a agência de turismo credenciada Cadastur/Embratur.
- O pacote possui reserva oficial com emissão de Voucher Digital de Viagem após o checkout.
- Não há cobrança de frete físico nem motoboy (o envio do voucher é 100% digital e sem custos de frete).
- Pagamento em até 12x no cartão de crédito ou à vista com desconto via Pix.
- No checkout, o cliente fornece as datas de preferência e os dados dos passageiros (manifesto de viagem).
- Se o cliente solicitar cotações de grupos, alterações de rota ou datas especiais, oriente-o que pode prosseguir na reserva ou usar o botão "Falar com Atendente Humano" para falar diretamente com os consultores da agência.
` : "";

    const systemPrompt = `Você é o Especialista de Vendas e Negociação (SDR) da Waesy Platform.
Sua missão é atender potenciais compradores com empatia, rigor comercial, simpatia e técnica consultiva de fechamento.

=== ITEM EM NEGOCIAÇÃO ===
Título: ${itemTitle}
Preço de Tabela: ${basePriceCents > 0 ? `R$ ${(basePriceCents / 100).toFixed(2)}` : isDonationListing ? "Gratuito (Doação Solidária)" : "Sob Consulta"}
Nicho Comercial: ${itemNiche}
Descrição do Item: ${(itemDescription || "").slice(0, 1000)}
Logística: ${isPickupOnly ? "Apenas retirada no local pelo comprador" : "Envio ou retirada no local"}
${tourismDirectives}

=== REGRAS PÉTREAS DE NEGOCIAÇÃO (INVIOLÁVEIS) ===
1. FRETE E LOGÍSTICA:
   - Se for turismo ou produto digital: informe que o voucher/acesso é digital e NÃO tem taxa de entrega ou frete.
   - Para produtos físicos: informe que o envio/retirada segue as regras e raio de cobertura da loja.
2. PREÇO E DESCONTOS:
   ${isDonationListing
     ? "- Este item é uma DOAÇÃO GRATUITA (R$ 0,00). O objetivo é combinar a retirada com quem precisa."
     : `- O item possui preço de venda oficial.
${maxDiscountPct > 0
  ? `- Desconto máximo autorizado: ${maxDiscountPct}%. Preço piso: R$ ${(minAcceptablePriceCents / 100).toFixed(2)}. Defenda o valor com base na qualidade e exclusividade.`
  : "- O anunciante não autorizou descontos extras além das opções automáticas de Pix ou parcelamento."}`}
3. FIDELIDADE AOS FATOS:
   - NUNCA invente itens, inclusões de pacote ou garantias que não constem na descrição oficial.
   - NUNCA quebre o personagem de especialista consultivo da loja.

=== TÉCNICA CONSULTIVA (SPIN / BANT) ===
- Identifique a real necessidade do cliente com perguntas curtas (ex: "Quantas pessoas vão viajar?", "Tem data prevista?").
- Condução para Fechamento: Quando o cliente estiver pronto, oriente-o a clicar em "Reservar / Comprar" na página.
- Mantenha respostas curtas (2 a 4 frases por turno), elegantes, humanas e sem jargões robóticos.
${buyerPersonaBlock}
${customAiInstructions
  ? `=== INSTRUÇÕES PARTICULARES DO ANUNCIANTE ===\n${sanitizeForAI(customAiInstructions, 1000)}`
  : ""}

${storeData?.ai_knowledge_base
  ? `=== BASE INSTITUCIONAL DA LOJA ${storeData.name} ===\n${sanitizeForAI(storeData.ai_knowledge_base, 800)}`
  : ""}

${complementaryProducts.length > 0
  ? `=== CATÁLOGO COMPLEMENTAR DA LOJA ===\n` +
    complementaryProducts.map((p) => `- ${p.title}: R$ ${(p.price_cents / 100).toFixed(2)}${p.slug ? ` (/produto/${p.slug})` : ""}`).join("\n") +
    `\nQuando oportuno, mencione estes produtos ou roteiros complementares de forma natural.`
  : ""}`;

    // 4. Chamar LLM via motor unificado
    const userPromptText = sanitizedMessages
      .map((m: any) => `${m.role === "assistant" ? "Assistente SDR" : "Comprador"}: ${m.content}`)
      .join("\n\n");

    const aiResponse = await executeUnifiedAiCall({
      systemPrompt,
      userPrompt: userPromptText,
      maxTokens: 500,
      temperature: 0.4,
    });

    const replyContent = aiResponse.content;

    // 5. Log assíncrono da sessão (fire-and-forget)
    if (messages.length >= 1) {
      logSDRSession(classifiedId || null, targetStoreId, userId, sessionId, sanitizedMessages, replyContent, productId || null)
        .catch((e) => console.error("[sdr] log error:", e));
    }

    return { success: true, reply: replyContent, storeId: targetStoreId };
  });

// ─── [ESCALADA] Transição para Atendente Humano no Chat Unificado ─────────────────
export const escalateSdrToHuman = createServerFn({ method: "POST" })
  .validator(z.object({
    storeId: z.string().uuid(),
    subject: z.string().min(1).default("Atendimento via Assistente Virtual"),
    itemTitle: z.string().optional(),
    summary: z.string().default("Cliente solicitou atendimento com consultor humano."),
    lastQuestion: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const db = getServerClient();
    let userId: string | null = null;
    let userName = "Cliente";
    let userEmail: string | null = null;

    try {
      const identity = await getServerIdentity();
      userId = identity.user_id || null;
      if (userId) {
        const { data: profile } = await db.from("profiles").select("full_name, email").eq("id", userId).maybeSingle();
        if (profile) {
          userName = profile.full_name || "Cliente";
          userEmail = profile.email || null;
        }
      }
    } catch { /* visitante anônimo */ }

    // Localizar thread existente ou criar nova thread na tabela chat_threads
    let threadQuery = db
      .from("chat_threads")
      .select("id")
      .eq("store_id", data.storeId)
      .eq("status", "open");

    if (userId) {
      threadQuery = threadQuery.eq("customer_id", userId);
    }

    const { data: existing } = await threadQuery.maybeSingle();

    let threadId = existing?.id;

    if (!threadId) {
      const { data: newThread, error } = await db
        .from("chat_threads")
        .insert({
          store_id: data.storeId,
          customer_id: userId,
          guest_name: userName,
          guest_email: userEmail,
          subject: data.itemTitle ? `Interesse: ${data.itemTitle}` : data.subject,
          department: "vendas",
          thread_type: "store",
          status: "open",
        })
        .select()
        .single();

      if (error || !newThread) {
        throw new Error(error?.message || "Falha ao iniciar canal com atendente da loja.");
      }
      threadId = newThread.id;
    }

    // Inserir mensagem de contexto inicial da escalada
    const escalationMessage = `[Transferência do Assistente SDR]\n${data.summary}${data.lastQuestion ? `\nÚltima dúvida do cliente: "${data.lastQuestion}"` : ""}`;

    await db.from("chat_messages").insert({
      thread_id: threadId,
      sender_id: userId,
      message: escalationMessage,
      message_type: "text",
      is_staff_reply: false,
    });

    await db.from("chat_threads").update({
      last_message_text: escalationMessage,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", threadId);

    return { success: true, threadId };
  });

// ─── Worker assíncrono de log e classificação de intenção ──────────────────────
async function logSDRSession(
  classifiedId: string | null,
  storeId: string | null,
  userId: string | null,
  sessionId: string | undefined,
  messages: any[],
  latestReply: string,
  productId?: string | null
) {
  try {
    const fullConversation = messages.map((m) => `${m.role}: ${m.content}`).join("\n") + `\nassistant: ${latestReply}`;

    const intentPrompt = `Analise a conversa de vendas e classifique a intenção do comprador.
Retorne APENAS JSON: {"intent":"curious"|"warm"|"ready_to_buy"|"support"|"complaint","summary":"resumo em 1 frase"}
Conversa:\n${fullConversation.slice(0, 3000)}`;

    const intentResponse = await executeUnifiedAiCall({
      systemPrompt: intentPrompt,
      userPrompt: "Classifique a intenção desta conversa.",
      responseFormat: "json_object",
      maxTokens: 100,
      temperature: 0.1,
    }).catch(() => null);

    const parsed = intentResponse?.parsedJson || (intentResponse?.content ? JSON.parse(intentResponse.content) : {});
    const intent = parsed.intent || "curious";
    const summary = (parsed.summary || "").slice(0, 200);

    const db = getServerClient();

    // Buscar sessão existente
    let query: any = db.from("sdr_chat_sessions").select("id, message_count, messages_log");
    if (classifiedId) query = query.eq("classified_id", classifiedId);
    else if (storeId) query = query.eq("store_id", storeId);

    if (userId) query = query.eq("user_id", userId);
    else if (sessionId) query = query.eq("anonymous_session_id", sessionId);

    const { data: existing } = await query.maybeSingle();

    const messagesLog = messages.map((m) => ({
      role: m.role,
      content: m.content,
      at: new Date().toISOString(),
    }));
    messagesLog.push({ role: "assistant", content: latestReply, at: new Date().toISOString() });

    if (existing) {
      await db.from("sdr_chat_sessions").update({
        intent_classification: intent,
        summary,
        message_count: (existing.message_count || 0) + messages.length,
        messages_log: [...(existing.messages_log || []), ...messagesLog],
        updated_at: new Date().toISOString(),
      }).eq("id", existing.id);
    } else {
      await db.from("sdr_chat_sessions").insert({
        classified_id: classifiedId,
        store_id: storeId,
        user_id: userId,
        anonymous_session_id: sessionId,
        intent_classification: intent,
        summary,
        message_count: messages.length,
        messages_log: messagesLog,
        metadata: productId ? { product_id: productId } : {},
      });
    }
  } catch (e) {
    console.error("[sdr] Erro ao gravar log de sessão:", e);
  }
}

// ─── [REQ-6] Listagem de Sessões SDR para Atendimento & Workspace ─────────────
export interface SdrChatSessionDTO {
  id: string;
  classified_id: string;
  store_id: string | null;
  user_id: string | null;
  anonymous_session_id: string | null;
  intent_classification: "ready_to_buy" | "warm" | "curious" | "support" | "complaint";
  summary: string;
  message_count: number;
  messages_log: Array<{ role: string; content: string; at: string }>;
  created_at: string;
  updated_at: string;
  classified?: {
    id: string;
    title: string;
    slug?: string;
    price_cents?: number | null;
    category?: string;
    city?: string;
  } | null;
}

export async function internalListSdrChatSessions(params?: {
  storeId?: string | null;
  userId?: string | null;
  intent?: string;
  limit?: number;
}): Promise<{
  sessions: SdrChatSessionDTO[];
  metrics: {
    total: number;
    readyToBuy: number;
    warm: number;
    curious: number;
  };
}> {
  const db = getServerClient();
  let query = db
    .from("sdr_chat_sessions")
    .select(`
      id,
      classified_id,
      store_id,
      user_id,
      anonymous_session_id,
      intent_classification,
      summary,
      message_count,
      messages_log,
      created_at,
      updated_at,
      classifieds:classified_id (
        id,
        title,
        slug,
        price_cents,
        category,
        city
      )
    `)
    .order("updated_at", { ascending: false })
    .limit(params?.limit || 50);

  if (params?.storeId) {
    query = query.eq("store_id", params.storeId);
  } else if (params?.userId) {
    query = query.eq("user_id", params.userId);
  }

  if (params?.intent && params.intent !== "all") {
    query = query.eq("intent_classification", params.intent);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("[ai-sdr.functions] Erro ao listar sessões SDR:", error);
    return {
      sessions: [],
      metrics: { total: 0, readyToBuy: 0, warm: 0, curious: 0 },
    };
  }

  const rawSessions = data || [];
  const sessions: SdrChatSessionDTO[] = rawSessions.map((row: any) => ({
    id: row.id,
    classified_id: row.classified_id,
    store_id: row.store_id,
    user_id: row.user_id,
    anonymous_session_id: row.anonymous_session_id,
    intent_classification: row.intent_classification || "curious",
    summary: row.summary || "",
    message_count: row.message_count || 0,
    messages_log: row.messages_log || [],
    created_at: row.created_at,
    updated_at: row.updated_at,
    classified: row.classifieds || null,
  }));

  const metrics = {
    total: sessions.length,
    readyToBuy: sessions.filter((s) => s.intent_classification === "ready_to_buy").length,
    warm: sessions.filter((s) => s.intent_classification === "warm").length,
    curious: sessions.filter((s) => s.intent_classification === "curious").length,
  };

  return { sessions, metrics };
}

export const listSdrChatSessions = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        store_id: z.string().uuid().optional(),
        intent: z
          .enum(["all", "ready_to_buy", "warm", "curious", "support", "complaint"])
          .default("all")
          .optional(),
        limit: z.number().int().min(1).max(100).default(50).optional(),
      })
      .optional()
  )
  .handler(async ({ data: params }) => {
    const identity = await getServerIdentity().catch(() => null);
    const storeId = params?.store_id || identity?.store_id || null;
    return internalListSdrChatSessions({
      storeId,
      userId: identity?.id || null,
      intent: params?.intent || "all",
      limit: params?.limit || 50,
    });
  });
