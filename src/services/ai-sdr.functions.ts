import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { callOpenRouter } from "@/lib/ai/openrouter";

// Schema do Anúncio Pré-preenchido
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
  ]).describe("Categoria base estrutural do anúncio."),
  niche: z.string().describe("O id do nicho (ex: desapego, imovel, veiculo, digital)."),
  title: z.string().describe("Título otimizado para o anúncio."),
  content: z.string().describe("Descrição clara e bem estruturada."),
  price_cents: z.number().nullable().describe("Preço estimado em centavos (ex: 50 reais = 5000), ou null se indefinido."),
  attributes: z.record(z.any()).describe("Atributos extras baseados no texto (ex: se veículo: marca, ano)."),
});

function parsePromptFallback(rawPrompt: string) {
  const prompt = rawPrompt.trim();
  const lower = prompt.toLowerCase();
  let category: "sale" | "vehicle" | "real_estate" | "service" | "job" | "travel" | "equipment" | "donation" = "sale";
  let niche = "desapego";

  if (/(carro|moto|ve[ií]culo|caminh[aã]o|km\b|manual|autom[aá]tico|flex|gasolina|honda|toyota|fiat|chevrolet|volkswagen|yamaha)/i.test(lower)) {
    category = "vehicle";
    niche = "veiculo";
  } else if (/(apto|apartamento|casa|terreno|im[oó]vel|aluguel|temporada|kitnet|sobrado|quarto|su[ií]te)/i.test(lower)) {
    category = "real_estate";
    niche = /(temporada|di[aá]ria)/i.test(lower) ? "hospedagem" : "imovel";
  } else if (/(servi[cç]o|reparo|conserto|manuten[cç][aã]o|pintor|eletricista|diarista|frete|aula|consultoria)/i.test(lower)) {
    category = "service";
    niche = "servico";
  } else if (/(vaga|emprego|contrata-se|contratando|est[aá]gio|desenvolvedor|vendedor|atendente|balconista)/i.test(lower)) {
    category = "job";
    niche = "vaga";
  } else if (/(viagem|pacote|hotel|resort|passagem|turismo|passeio|excurs[aã]o)/i.test(lower)) {
    category = "travel";
    niche = "viagem";
  } else if (/(doa[cç][aã]o|doar|gr[aá]tis|0800|de\s+gra[cç]a)/i.test(lower)) {
    category = "donation";
    niche = "doacao";
  } else if (/(curso|ebook|template|c[oó]digo|software|mentoria\s+online)/i.test(lower)) {
    category = "sale";
    niche = "digital";
  }

  // Extração defensiva de preço
  let price_cents: number | null = null;
  const priceMatch = prompt.match(/(?:r\$\s*|por\s+r\$\s*|valor\s*:?\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:,\d{2})?)/i);
  if (priceMatch && !/(iphone|ano|\d{4}\b)/i.test(priceMatch[0])) {
    const rawVal = priceMatch[1].replace(/\./g, "").replace(",", ".");
    const num = parseFloat(rawVal);
    if (!isNaN(num) && num > 0 && num < 100000000) {
      price_cents = Math.round(num * 100);
    }
  }

  // Limpeza de título
  let title = prompt;
  title = title.replace(/^(quero\s+vender|vendo|estou\s+vendendo|anunciar|passo)\s+/i, "");
  title = title.charAt(0).toUpperCase() + title.slice(1);
  if (title.length > 70) {
    title = title.slice(0, 67) + "...";
  }

  return {
    category,
    niche,
    title,
    content: prompt,
    price_cents,
    attributes: {},
  };
}

const aiListingInputSchema = z.union([
  z.object({ prompt: z.string() }),
  z.object({ data: z.object({ prompt: z.string() }) }).transform((v) => v.data),
]);

/**
 * Função para gerar um pré-preenchimento de anúncio baseado no input do usuário.
 */
export const createListingWithAI = createServerFn({ method: "POST" })
  .validator(aiListingInputSchema)
  .handler(async (ctx) => {
    const rawPrompt = typeof ctx.data === "object" && "prompt" in ctx.data ? ctx.data.prompt : String(ctx.data || "");
    if (!rawPrompt.trim()) {
      throw new Error("O texto descritivo do anúncio é obrigatório.");
    }

    // Identidade opcional/verificada para não barrar visitantes
    await getServerIdentity().catch(() => null);

    const systemPrompt = `Você é um Assistente Criativo especializado em classificados da plataforma Waesy.
O usuário enviará uma frase curta dizendo o que quer anunciar.
Sua missão é extrair a intenção e gerar um JSON com os dados do anúncio pré-preenchidos.

Categorias disponíveis:
- desapego: para roupas, celulares, eletrônicos, móveis (mapeia para sale).
- veiculo: para carros e motos (mapeia para vehicle).
- imovel: venda ou aluguel (mapeia para real_estate).
- servico: prestação de serviços (mapeia para service).
- vaga: vagas de emprego (mapeia para job).
- viagem: pacotes turísticos e viagens (mapeia para travel).
- equipamento: máquinas e ferramentas (mapeia para equipment).
- doacao: itens para doação gratuita (mapeia para donation).

Você DEVE retornar APENAS UM JSON VÁLIDO seguindo estritamente esta estrutura:
{
  "category": "sale",
  "niche": "desapego",
  "title": "Título chamativo",
  "content": "Descrição bem feita com as poucas infos que temos...",
  "price_cents": 10000,
  "attributes": {} 
}
Sem blocos markdown ( \`\`\` ). Apenas o JSON puro.`;

    try {
      const response = await callOpenRouter(
        [{ role: "user", content: rawPrompt }],
        {
          systemPrompt,
          responseFormat: "json_object",
          maxTokens: 800,
          temperature: 0.3,
        }
      );

      const parsedData = JSON.parse(response.content);
      const validatedData = AIClassifiedSchema.parse(parsedData);
      return { success: true, listing: validatedData };
    } catch (e: any) {
      console.warn("OpenRouter/AI fallback acionado para anúncio:", e?.message);
      // Fallback heurístico resiliente garantindo 0 falhas para o anunciante
      const fallbackListing = parsePromptFallback(rawPrompt);
      return { success: true, listing: fallbackListing };
    }
  });

/**
 * Chat SDR para conversar com compradores.
 */
export const chatWithSDR = createServerFn({ method: "POST" })
  .validator(z.object({
    classifiedId: z.string().uuid(),
    messages: z.array(z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })),
    sessionId: z.string().optional(), // Para usuários anônimos
  }))
  .handler(async (ctx) => {
    const { classifiedId, messages, sessionId } = ctx.data;
    const db = getServerClient();
    
    // Tentamos pegar identidade, se não houver, ok, pode ser visitante.
    let userId = null;
    try {
      const identity = await getServerIdentity();
      userId = identity.user_id;
    } catch (e) {
      // Ignorar, visitante anônimo
    }

    // 1. Buscar o Classificado e suas Instruções
    const { data: classified, error } = await db
      .from("classifieds")
      .select(`
        *,
        store:stores (
          id,
          name,
          ai_knowledge_base,
          ai_sales_agent_enabled
        )
      `)
      .eq("id", classifiedId)
      .single();

    if (error || !classified) {
      throw new Error("Classificado não encontrado.");
    }

    if (!classified.ai_agent_enabled) {
      throw new Error("O Assistente SDR não está habilitado para este anúncio.");
    }

    // 2. Montar o System Prompt blindado
    const baseContext = `
      Você é um Assistente SDR (Sales Development Representative) atuando em nome do vendedor na plataforma Waesy.
      Você DEVE responder as dúvidas do comprador BASEADO ESTRITAMENTE nas informações abaixo.
      Se o usuário perguntar algo fora deste escopo, diga educadamente que não possui essa informação e ofereça contato humano.
      NUNCA invente características, preços ou condições de pagamento que não estejam listadas.
      Se o cliente demonstrar intenção forte de compra ou pedir desconto e não houver regras para isso, diga que ele pode fazer uma proposta oficial na plataforma.
      
      === DADOS DO ANÚNCIO ===
      Título: ${classified.title}
      Preço Original: R$ ${(classified.price_cents / 100).toFixed(2)}
      Descrição: ${classified.content}
    `;

    let customInstructions = "";
    if (classified.ai_instructions) {
      customInstructions += `\n=== INSTRUÇÕES ESPECÍFICAS DO VENDEDOR PARA ESTE ANÚNCIO ===\n${classified.ai_instructions}\n`;
    }

    if (classified.store?.ai_knowledge_base) {
       customInstructions += `\n=== BASE DE CONHECIMENTO DA LOJA (${classified.store.name}) ===\n${classified.store.ai_knowledge_base}\n`;
    }

    const systemPrompt = baseContext + customInstructions;

    // 3. Chamar LLM (OpenRouter)
    // Extra: Vamos usar ferramentas de extração/intent tagging rodando em paralelo no LLM (SimLabs).
    const aiResponse = await callOpenRouter(messages as any, {
      systemPrompt,
      maxTokens: 1000,
    });

    const replyContent = aiResponse.content;

    // 4. Integrar com SimLabs (Telemetria). Avaliar Intenção da conversa com um 2º call assíncrono (Fire and Forget)
    if (messages.length >= 2) { // Só avalia intenção se houver algum engajamento
      analyzeIntentAndLogSession(classifiedId, classified.store_id, userId, sessionId, messages, replyContent).catch(e => console.error("SimLabs Intent Error:", e));
    }

    return { success: true, reply: replyContent };
  });

/**
 * Worker background para classificar a intenção e atualizar o RAG/Memória SimLabs.
 */
async function analyzeIntentAndLogSession(
  classifiedId: string,
  storeId: string | null,
  userId: string | null,
  sessionId: string | undefined,
  messages: any[],
  latestReply: string
) {
  try {
    const fullConversation = messages.map(m => `${m.role}: ${m.content}`).join("\n") + `\nassistant: ${latestReply}`;
    
    // Classificador ultra-rápido (usa gemma ou um model pequeno)
    const intentPrompt = `
      Analise a conversa de vendas abaixo e classifique a intenção atual do comprador.
      Retorne APENAS UM JSON VÁLIDO no formato: {"intent": "curious" | "warm" | "ready_to_buy" | "support" | "complaint", "summary": "breve resumo da necessidade"}
      Conversa:\n${fullConversation}
    `;

    const intentResponse = await callOpenRouter([], {
      systemPrompt: intentPrompt,
      responseFormat: "json_object",
      maxTokens: 150,
      temperature: 0.1,
    });

    const parsed = JSON.parse(intentResponse.content);
    const intent = parsed.intent || "curious";
    const summary = parsed.summary || "";

    const db = getServerClient();
    
    // Fazer upsert ou insert na tabela sdr_chat_sessions
    // Para simplificar, assumimos que sessionId (se anônimo) ou userId identificam a sessão de forma única por anúncio.
    const query = db.from("sdr_chat_sessions").select("id").eq("classified_id", classifiedId);
    if (userId) query.eq("user_id", userId);
    else if (sessionId) query.eq("anonymous_session_id", sessionId);
    
    const { data: existing } = await query.maybeSingle();

    if (existing) {
       await db.from("sdr_chat_sessions").update({
         intent_classification: intent,
         summary,
         message_count: messages.length + 1,
       }).eq("id", existing.id);
    } else {
       await db.from("sdr_chat_sessions").insert({
         classified_id: classifiedId,
         store_id: storeId,
         user_id: userId,
         anonymous_session_id: sessionId,
         intent_classification: intent,
         summary,
         message_count: messages.length + 1,
       });
    }

  } catch (error) {
    console.error("Erro na telemetria assíncrona do SimLabs:", error);
  }
}
