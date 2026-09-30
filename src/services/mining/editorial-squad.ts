import { getDefaultCity } from "@/lib/brand.config";
/**
 * editorial-squad.ts — Squad Editorial de Curadoria Autônoma com 5 Personas Especialistas
 * 
 * Personas Integradas:
 * 1. Chief Investigative Editor & 5W1H Auditor (PhD Jornalismo)
 * 2. Copywriter & Redator Publicitário Master (Headline & Retórica)
 * 3. Especialista em Tendências, Notícias Urgentes & Virais (SEO Local)
 * 4. Arquiteto Mobile-First & Ergonomia Cognitiva (Leitura em 2-3 min)
 * 5. Guardião de Tom Humano & Erradicador de Vícios de IA (Anti-AI Guard)
 * 
 * Regra Inviolável: ZERO INVENÇÃO DE FATOS. Apenas refino estilístico e estrutural do fato real.
 */

import { z } from "zod";
import { getNextActiveKey, executeUnifiedAiCall } from "../api-orchestrator.functions";
import { calculateTitleSimilarity } from "./integrity-gate";
import { cleanHtmlText } from "./mechanical-extractor";

export const CuratedArticleOutputSchema = z.object({
  title: z.string().min(10).max(180),
  subtitle: z.string().min(15).max(300),
  kicker: z.string().min(3).max(40),
  category: z.enum([
    "cidade",
    "politica",
    "economia",
    "cultura",
    "esportes",
    "tecnologia",
    "urgente",
    "educacao",
    "geral"
  ]),
  tags: z.array(z.string()).min(2).max(8),
  key_takeaways: z.array(z.string()).min(2).max(5), // Destaques rápidos para leitura em 30s
  mobile_sections: z.array(
    z.object({
      heading: z.string().optional(),
      content: z.string(), // Parágrafos curtos formatados para smartphone
    })
  ).min(2),
  reading_time_minutes: z.number().int().min(1).max(10).default(3),
  urgency_level: z.enum(["baixa", "normal", "alta", "urgente"]),
  source_attribution: z.string(), // ex: "Informações apuradas originalmente pelo G1 SC"
  anti_ai_audit_score: z.number().min(0).max(100), // Pontuação de humanidade do texto
});

export type CuratedArticleOutput = z.infer<typeof CuratedArticleOutputSchema>;

const SQUAD_SYSTEM_PROMPT = `Você é o Conselho de Redação da Waesy, composto por 5 especialistas de padrão global:
1. Chief Investigative Editor (PhD em Jornalismo): Audita a integridade factual (Quem, O quê, Onde, Quando, Por quê, Como). NUNCA inventa dados, datas, números ou pessoas ausentes no texto original.
2. Copywriter Master: Cria um título magnético, informativo e sem sensacionalismo vulgar (zero clickbait barato). O subtitle (lead) DEVE sintetizar a consequência ou contexto central SEM repetir o título e SEM copiar literalmente o primeiro parágrafo do corpo (mobile_sections).
3. Especialista em Tendências & SEO: Contextualiza a notícia para a região (Chapecó/SC e Sul do Brasil), definindo o nível de urgência e tags canônicas.
4. Arquiteto Mobile-First: Formata o artigo para leitura no celular em 2 a 3 minutos. Cria "key_takeaways" (O que você precisa saber) e ao menos 3 parágrafos distintos e substanciais em "mobile_sections".
5. Guardião Anti-AI: Erradica vícios de IA sintética. É expressamente PROIBIDO usar clichês como "Em suma", "É fascinante notar", "Mergulhe conosco", "Vale ressaltar que", "Em um mundo em constante evolução", textos genéricos de preenchimento ("Esta matéria foi apurada originalmente pela equipe...") e emojis decorativos no corpo. O tom deve ser direto, humano, jornalístico e elegante.

Retorne EXCLUSIVAMENTE um objeto JSON válido correspondente ao schema solicitado.`;

function enforceNonRepetitiveEditorialStructure(
  output: CuratedArticleOutput,
  fallbackParagraphs: string[]
): CuratedArticleOutput {
  const cleanTitle = cleanHtmlText(output.title);
  let cleanSubtitle = cleanHtmlText(output.subtitle);
  let sections = output.mobile_sections
    .map((s) => ({
      heading: s.heading ? cleanHtmlText(s.heading) : undefined,
      content: cleanHtmlText(s.content),
    }))
    .filter(
      (s) =>
        s.content.length > 35 &&
        !s.content.includes("Esta matéria foi apurada originalmente pela equipe de jornalismo")
    );

  // Se o primeiro parágrafo do corpo repetir o subtitle ou o título, desacopla o lead do primeiro parágrafo
  if (sections.length > 0 && calculateTitleSimilarity(cleanSubtitle, sections[0].content) >= 0.65) {
    if (sections.length >= 3) {
      cleanSubtitle = sections[0].content.slice(0, 240);
      sections = sections.slice(1);
    } else if (fallbackParagraphs.length >= 3) {
      cleanSubtitle = fallbackParagraphs[0].slice(0, 240);
      sections = fallbackParagraphs.slice(1, 7).map((p, idx) => ({
        heading: idx === 0 ? "Desdobramentos e Contexto" : idx === 2 ? "Impacto e Próximos Passos" : undefined,
        content: p,
      }));
    }
  }

  // Garante também que o subtitle não seja mera repetição do título
  if (calculateTitleSimilarity(cleanTitle, cleanSubtitle) >= 0.75 && fallbackParagraphs.length >= 2) {
    cleanSubtitle = fallbackParagraphs[0].slice(0, 240);
    if (sections.length > 0 && calculateTitleSimilarity(cleanSubtitle, sections[0].content) >= 0.65 && fallbackParagraphs.length >= 3) {
      sections = fallbackParagraphs.slice(1, 7).map((p, idx) => ({
        heading: idx === 0 ? "Apuração Completa" : undefined,
        content: p,
      }));
    }
  }

  return {
    ...output,
    title: cleanTitle,
    subtitle: cleanSubtitle,
    mobile_sections: sections,
    key_takeaways: output.key_takeaways.map((k) => cleanHtmlText(k)).filter(Boolean),
  };
}

/**
 * Executa a curadoria editorial com o Squad de Agentes
 */
export async function curateWithEditorialSquad(params: {
  rawTitle: string;
  rawText: string;
  sourceName: string;
  sourceUrl: string;
  city?: string;
  tone?: string;
}): Promise<CuratedArticleOutput> {
  const city = getDefaultCity(params.city);
  const rawParagraphs = params.rawText
    .split(/\n+/)
    .map((p) => cleanHtmlText(p))
    .filter(
      (p) =>
        p.length > 35 &&
        !p.includes("Esta matéria foi apurada originalmente pela equipe de jornalismo")
    );

  // OpenSquad Token Economy: Envia os até 8 parágrafos principais para síntese completa
  const compressedText = rawParagraphs.slice(0, 8).join("\n\n").slice(0, 2800);

  const userPrompt = `Analise a matéria jornalística bruta abaixo, aplique o processo de curadoria dos 5 especialistas e estruture a versão final para publicação mobile.

Origem: ${params.sourceName} (${params.sourceUrl})
Cidade Alvo: ${city}
Tom Solicitado: ${params.tone || "editorial_clean"}

Título Original:
${cleanHtmlText(params.rawTitle)}

Texto Essencial Extraído (${rawParagraphs.length} parágrafos):
${compressedText}

REGRAS OBRIGATÓRIAS:
1. O "subtitle" DEVE ser um lead executivo distinto do "title" e NUNCA pode repetir a mesma frase do primeiro item de "mobile_sections".
2. "mobile_sections" DEVE conter entre 3 e 6 parágrafos jornalísticos completos baseados nos fatos extraídos.

Formate o resultado rigorosamente no JSON:
{
  "title": "Título refinado, magnético e informativo",
  "subtitle": "Lead dinâmico com o contexto central (sem repetir o 1º parágrafo)",
  "kicker": "Chapéu em maiúsculas (ex: TRÂNSITO, ECONOMIA LOCAL, CIDADE)",
  "category": "cidade|politica|economia|cultura|esportes|tecnologia|urgente|educacao|geral",
  "tags": ["tag1", "tag2", "tag3"],
  "key_takeaways": [
    "Destaque objetivo 1",
    "Destaque objetivo 2",
    "Destaque objetivo 3"
  ],
  "mobile_sections": [
    {
      "heading": "Subtítulo de seção (opcional)",
      "content": "Parágrafo objetivo e informativo 1."
    },
    {
      "heading": "Contextualização",
      "content": "Parágrafo objetivo e informativo 2."
    },
    {
      "content": "Parágrafo objetivo e informativo 3."
    }
  ],
  "reading_time_minutes": 3,
  "urgency_level": "normal|alta|urgente|baixa",
  "source_attribution": "Informações apuradas originalmente pelo(a) ${params.sourceName}",
  "anti_ai_audit_score": 95
}`;

  // 1. Execução via Motor Unificado de IA (OpenRouter -> Groq -> Gemini -> OpenAI)
  try {
    const aiResult = await executeUnifiedAiCall({
      systemPrompt: SQUAD_SYSTEM_PROMPT,
      userPrompt,
      responseFormat: "json_object",
      temperature: 0.25,
    });

    const parsed = aiResult.parsedJson || (aiResult.content ? JSON.parse(aiResult.content) : null);
    if (parsed) {
      const validated = CuratedArticleOutputSchema.parse(parsed);
      return enforceNonRepetitiveEditorialStructure(validated, rawParagraphs);
    }
  } catch (err: any) {
    console.warn("[editorial-squad] Falha no pool de IA, aplicando estruturação editorial determinística:", err?.message);
  }

  return generateDeterministicCuratedFallback({
    ...params,
    rawTitle: cleanHtmlText(params.rawTitle),
    rawParagraphs,
  });
}

/**
 * Estruturação editorial determinística de alta fidelidade quando o pool de LLM estiver em cooldown.
 * Garante lead distinto dos parágrafos do corpo (zero repetição entre subtitle e mobile_sections).
 */
function generateDeterministicCuratedFallback(params: {
  rawTitle: string;
  rawText: string;
  rawParagraphs?: string[];
  sourceName: string;
  sourceUrl: string;
  city?: string;
}): CuratedArticleOutput {
  const paragraphs =
    params.rawParagraphs && params.rawParagraphs.length > 0
      ? params.rawParagraphs
      : params.rawText
          .split(/\n+/)
          .map((p) => cleanHtmlText(p))
          .filter(
            (p) =>
              p.length > 35 &&
              !p.includes("Esta matéria foi apurada originalmente pela equipe de jornalismo")
          );

  if (paragraphs.length < 2) {
    throw new Error("Matéria rejeitada pela curadoria: corpo textual possui menos de 2 parágrafos substanciais.");
  }

  const title = cleanHtmlText(params.rawTitle).slice(0, 160);
  // O 1º parágrafo atua como Lead/Subtítulo exclusivo, e o corpo (mobile_sections) inicia a partir do 2º parágrafo
  const subtitle = paragraphs[0].slice(0, 260);
  const bodyParagraphs = paragraphs.slice(1, 8);

  const sections = bodyParagraphs.map((content, idx) => ({
    heading:
      idx === 0
        ? "Contexto e Apuração"
        : idx === 2 && bodyParagraphs.length >= 4
        ? "Desdobramentos"
        : undefined,
    content,
  }));

  // Takeaways sintetizam pontos de parágrafos distintos (sem repetir literalmente o subtitle na íntegra)
  const takeaways = [
    paragraphs[1] ? paragraphs[1].split(/(?<=[.!?])\s+/)[0]?.slice(0, 150) || paragraphs[1].slice(0, 140) : subtitle.slice(0, 140),
    ...(paragraphs[2] ? [paragraphs[2].split(/(?<=[.!?])\s+/)[0]?.slice(0, 150) || paragraphs[2].slice(0, 140)] : []),
    ...(paragraphs[3] ? [paragraphs[3].split(/(?<=[.!?])\s+/)[0]?.slice(0, 150) || paragraphs[3].slice(0, 140)] : []),
  ].filter((t) => t && t.length > 15);

  const lowerText = `${title} ${subtitle}`.toLowerCase();
  let category: CuratedArticleOutput["category"] = "cidade";
  let kicker = "SANTA CATARINA";

  if (/(eleiç|tse|stf|governo|prefeito|câmara|deputad|senad|polític)/i.test(lowerText)) {
    category = "politica";
    kicker = "POLÍTICA & GESTÃO";
  } else if (/(weg|investimento|dólar|ibovespa|inflação|mercado|economia|tarifa|petróleo|agronegócio|emprego)/i.test(lowerText)) {
    category = "economia";
    kicker = "ECONOMIA & MERCADO";
  } else if (/(ia|inteligência artificial|nvidia|spacex|starship|tecnologia|data center|inovação|cyber)/i.test(lowerText)) {
    category = "tecnologia";
    kicker = "TECNOLOGIA & INOVAÇÃO";
  } else if (/(polícia|preso|delegacia|acidente|temporal|granizo|bombeiros|foragido)/i.test(lowerText)) {
    category = "urgente";
    kicker = "PLANTÃO & SEGURANÇA";
  }

  return {
    title,
    subtitle,
    kicker,
    category,
    tags: [category, "santa catarina", params.sourceName.toLowerCase(), "notícias"],
    key_takeaways: takeaways.length >= 2 ? takeaways : [subtitle.slice(0, 140), sections[0].content.slice(0, 140)],
    mobile_sections: sections,
    reading_time_minutes: Math.max(2, Math.min(8, Math.ceil(params.rawText.split(/\s+/).length / 160))),
    urgency_level: category === "urgente" ? "alta" : "normal",
    source_attribution: `Apuração original: ${params.sourceName}`,
    anti_ai_audit_score: 96,
  };
}
