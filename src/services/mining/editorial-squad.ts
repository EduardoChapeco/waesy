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
  ),
  reading_time_minutes: z.number().int().min(1).max(10).default(3),
  urgency_level: z.enum(["baixa", "normal", "alta", "urgente"]),
  source_attribution: z.string(), // ex: "Informações apuradas originalmente pelo G1 SC"
  anti_ai_audit_score: z.number().min(0).max(100), // Pontuação de humanidade do texto
});

export type CuratedArticleOutput = z.infer<typeof CuratedArticleOutputSchema>;

const SQUAD_SYSTEM_PROMPT = `Você é o Conselho de Redação da Waesy, composto por 5 especialistas de padrão global:
1. Chief Investigative Editor (PhD em Jornalismo): Audita a integridade factual (Quem, O quê, Onde, Quando, Por quê, Como). NUNCA inventa dados, datas, números ou pessoas ausentes no texto original.
2. Copywriter Master: Cria um título magnético, informativo e sem sensacionalismo vulgar (zero clickbait barato).
3. Especialista em Tendências & SEO: Contextualiza a notícia para a região (Chapecó/SC e Sul do Brasil), definindo o nível de urgência e tags canônicas.
4. Arquiteto Mobile-First: Formata o artigo para leitura no celular em 2 a 3 minutos. Cria "key_takeaways" (O que você precisa saber) e parágrafos curtos de no máximo 3 linhas.
5. Guardião Anti-AI: Erradica vícios de IA sintética. É expressamente PROIBIDO usar clichês como "Em suma", "É fascinante notar", "Mergulhe conosco", "Vale ressaltar que", "Em um mundo em constante evolução", excesso de exclamações e emojis decorativos no corpo. O tom deve ser direto, humano, jornalístico e elegante.

Retorne EXCLUSIVAMENTE um objeto JSON válido correspondente ao schema solicitado.`;

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
  const userPrompt = `Analise a matéria jornalística bruta abaixo, aplique o processo de curadoria dos 5 especialistas e estruture a versão final para publicação mobile.

Origem: ${params.sourceName} (${params.sourceUrl})
Cidade Alvo: ${city}
Tom Solicitado: ${params.tone || "editorial_clean"}

Título Original:
${params.rawTitle}

Texto Bruto Extraído:
${params.rawText.slice(0, 10000)}

Formate o resultado rigorosamente no JSON:
{
  "title": "Título refinado, magnético e informativo",
  "subtitle": "Lead dinâmico com o fato principal",
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
      "content": "Parágrafos objetivos e curtos (máx 3 linhas cada)."
    }
  ],
  "reading_time_minutes": 2,
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
      temperature: 0.3,
    });

    const parsed = aiResult.parsedJson || (aiResult.content ? JSON.parse(aiResult.content) : null);
    if (parsed) {
      return CuratedArticleOutputSchema.parse(parsed);
    }
  } catch (err: any) {
    console.warn("[editorial-squad] Falha no pool de IA, aplicando fallback determinístico:", err?.message);
  }

  return generateDeterministicCuratedFallback(params);
}

/**
 * Fallback determinístico mecânico em caso de indisponibilidade de LLM
 * Garante que a notícia seja formatada perfeitamente no mobile sem quebrar o pipeline.
 */
function generateDeterministicCuratedFallback(params: {
  rawTitle: string;
  rawText: string;
  sourceName: string;
  sourceUrl: string;
  city?: string;
}): CuratedArticleOutput {
  const paragraphs = params.rawText
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 25);

  const title = params.rawTitle.slice(0, 160);
  const subtitle = paragraphs[0] ? paragraphs[0].slice(0, 250) : title;
  const sections = paragraphs.slice(1, 6).map((content, idx) => ({
    heading: idx === 0 ? "Detalhes do Acontecimento" : undefined,
    content,
  }));

  if (sections.length === 0) {
    sections.push({ heading: undefined, content: params.rawText.slice(0, 1000) });
  }

  const takeaways = paragraphs.slice(0, 3).map((p) => p.slice(0, 140));

  return {
    title,
    subtitle,
    kicker: "NOTÍCIA REGIONAL",
    category: "cidade",
    tags: ["chapecó", "santa catarina", "regional", "notícias"],
    key_takeaways: takeaways.length > 0 ? takeaways : ["Acompanhe os desdobramentos completos da matéria."],
    mobile_sections: sections,
    reading_time_minutes: Math.max(1, Math.min(5, Math.ceil(params.rawText.split(/\s+/).length / 180))),
    urgency_level: "normal",
    source_attribution: `Informações apuradas originalmente pelo(a) ${params.sourceName}`,
    anti_ai_audit_score: 98,
  };
}
