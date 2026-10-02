/**
 * brand-kit.functions.ts — BFF Server Functions para Gestão Canônica de Brand Kit,
 * Extração de DNA de Marca via URL, Tipografia, Paletas e Arquétipos Junguianos.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { executeUnifiedAiCall } from "@/services/api-orchestrator.functions";
import { normalizeHexPalette, inferProductCategoryFromText } from "@/lib/color-extractor";

// ── 1. SCHEMAS E TIPOS CANÔNICOS ─────────────────────────────────────────────

export interface BrandKitProfileColorsDTO {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  palette: string[];
}

export interface BrandKitProfileTypographyDTO {
  heading: string;
  body: string;
  mono: string;
  display?: string;
}

export interface BrandKitProfileLogosDTO {
  main_url: string | null;
  dark_url: string | null;
  icon_url: string | null;
  light_url: string | null;
}

export interface BrandKitProfileVoiceDTO {
  tone_of_voice: string;
  tone_rules: string[];
  do_words: string[];
  dont_words: string[];
}

type BrandKitColorsDTO = BrandKitProfileColorsDTO;
type BrandKitTypographyDTO = BrandKitProfileTypographyDTO;
type BrandKitLogosDTO = BrandKitProfileLogosDTO;
type BrandKitVoiceDTO = BrandKitProfileVoiceDTO;

export interface BrandKitProfileDTO {
  id: string;
  store_id: string;
  company_name?: string;
  archetype: string;
  archetype_justification: string;
  colors: BrandKitColorsDTO;
  typography: BrandKitTypographyDTO;
  logos: BrandKitLogosDTO;
  voice: BrandKitVoiceDTO;
  content_pillars: string[];
  visual_style: {
    border_radius: "none" | "small" | "medium" | "large" | "full";
    shadow: "none" | "subtle" | "medium";
    icon_set: "lucide" | "phosphor";
  };
  swot_analysis: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  seven_sins_triggers: Record<string, string>;
  edited_by_human: boolean;
  updated_at: string;
}

type BrandKitDTO = BrandKitProfileDTO;

const DEFAULT_BRAND_KIT_COLORS: BrandKitColorsDTO = {
  primary: "#0A84FF",
  secondary: "#5E5CE6",
  accent: "#30D158",
  background: "#09090B",
  text: "#FAFAFA",
  palette: ["#0A84FF", "#5E5CE6", "#30D158", "#FF9F0A", "#FF453A"],
};

const DEFAULT_BRAND_KIT_TYPOGRAPHY: BrandKitTypographyDTO = {
  heading: "Inter",
  body: "Inter",
  mono: "JetBrains Mono",
  display: "Playfair Display",
};

const DEFAULT_BRAND_KIT_LOGOS: BrandKitLogosDTO = {
  main_url: null,
  dark_url: null,
  icon_url: null,
  light_url: null,
};

// ── 2. HELPER DE PARSE SEGURO ───────────────────────────────────────────────
function safeJson<T>(value: any, fallback: T): T {
  if (!value) return fallback;
  if (typeof value === "object") return value as T;
  try {
    let p = JSON.parse(value);
    if (typeof p === "string") p = JSON.parse(p);
    return (p || fallback) as T;
  } catch {
    return fallback;
  }
}

// ── 3. SERVER FUNCTION: OBTER BRAND KIT DA LOJA ─────────────────────────────
export const getStoreBrandKit = createServerFn({ method: "GET" })
  .validator((d: unknown) =>
    z
      .object({
        storeId: z.string().uuid().optional(),
      })
      .optional()
      .parse(d)
  )
  .handler(async ({ data }): Promise<BrandKitDTO> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity().catch(() => null);
    const storeId = data?.storeId || identity?.store_id;

    if (!storeId) {
      throw new Error("Loja não informada para carregar o Brand Kit.");
    }

    const { data: profile } = await supabase
      .from("brand_dna_profiles")
      .select("*")
      .eq("store_id", storeId)
      .maybeSingle();

    if (profile) {
      const colors = safeJson<BrandKitColorsDTO>(profile.color_palette, DEFAULT_BRAND_KIT_COLORS);
      const typography = safeJson<BrandKitTypographyDTO>(profile.typography, DEFAULT_BRAND_KIT_TYPOGRAPHY);
      const logos = safeJson<BrandKitLogosDTO>(profile.logos, DEFAULT_BRAND_KIT_LOGOS);
      const visualStyle = safeJson<BrandKitDTO["visual_style"]>(profile.visual_style, {
        border_radius: "medium",
        shadow: "none",
        icon_set: "lucide",
      });

      return {
        id: profile.id,
        store_id: profile.store_id,
        archetype: profile.archetype || "O Criador",
        archetype_justification:
          profile.archetype_justification || "Marca focada em padrão estético impecável e originalidade.",
        colors,
        typography,
        logos,
        voice: {
          tone_of_voice: profile.tone_of_voice || "Confiante, elegante e direto",
          tone_rules: profile.tone_rules || [],
          do_words: ["Exclusivo", "Qualidade", "Agilidade", "Transparência"],
          dont_words: profile.forbidden_words || ["Baratinho", "Garantimos o menor preço"],
        },
        content_pillars: profile.content_pillars || ["Qualidade Impecável", "Velocidade & Respeito", "Exclusividade"],
        visual_style: visualStyle,
        swot_analysis: safeJson(profile.swot_analysis, {
          strengths: ["Atendimento humanizado de excelência"],
          weaknesses: ["Orçamento inicial de tráfego pago"],
          opportunities: ["Expansão de catálogo hiperlocal"],
          threats: ["Concorrência predatória de plataformas genéricas"],
        }),
        seven_sins_triggers: safeJson(profile.seven_sins_triggers, {}),
        edited_by_human: profile.edited_by_human || false,
        updated_at: profile.updated_at || new Date().toISOString(),
      };
    }

    // Se ainda não existir, criar registro canônico padrão
    const initialColors = DEFAULT_BRAND_KIT_COLORS;
    const initialTypo = DEFAULT_BRAND_KIT_TYPOGRAPHY;

    const { data: created } = await supabase
      .from("brand_dna_profiles")
      .insert({
        store_id: storeId,
        archetype: "O Criador",
        archetype_justification: "Marca focada em inovação, sofisticação e soluções práticas para a comunidade local.",
        tone_of_voice: "Confiante, elegante e direto",
        tone_rules: ["Frases curtas e de alto impacto", "Zero jargões vazios", "Foco no benefício real"],
        content_pillars: ["Qualidade Garantida", "Atendimento Ágil", "Confiança Local"],
        forbidden_words: ["Baratinho", "Promessa milagrosa"],
        color_palette: initialColors,
        typography: initialTypo,
        logos: DEFAULT_BRAND_KIT_LOGOS,
        visual_style: { border_radius: "medium", shadow: "none", icon_set: "lucide" },
      })
      .select()
      .single();

    return {
      id: created?.id || crypto.randomUUID(),
      store_id: storeId,
      archetype: created?.archetype || "O Criador",
      archetype_justification: created?.archetype_justification || "Marca focada em inovação e padrão estético.",
      colors: initialColors,
      typography: initialTypo,
      logos: DEFAULT_BRAND_KIT_LOGOS,
      voice: {
        tone_of_voice: "Confiante, elegante e direto",
        tone_rules: ["Frases curtas", "Zero enrolação"],
        do_words: ["Qualidade", "Agilidade"],
        dont_words: ["Baratinho"],
      },
      content_pillars: ["Qualidade Garantida", "Atendimento Ágil", "Confiança Local"],
      visual_style: { border_radius: "medium", shadow: "none", icon_set: "lucide" },
      swot_analysis: {
        strengths: ["Atendimento humanizado de excelência"],
        weaknesses: ["Orçamento inicial de tráfego pago"],
        opportunities: ["Expansão de catálogo hiperlocal"],
        threats: ["Concorrência predatória de plataformas genéricas"],
      },
      seven_sins_triggers: {},
      edited_by_human: false,
      updated_at: new Date().toISOString(),
    };
  });

// ── 4. SERVER FUNCTION: SALVAR BRAND KIT (AUTO-SAVE) ─────────────────────────
export const saveStoreBrandKit = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        storeId: z.string().uuid().optional(),
        archetype: z.string().min(2),
        archetype_justification: z.string().optional(),
        colors: z.object({
          primary: z.string(),
          secondary: z.string(),
          accent: z.string(),
          background: z.string(),
          text: z.string(),
          palette: z.array(z.string()).default([]),
        }),
        typography: z.object({
          heading: z.string(),
          body: z.string(),
          mono: z.string(),
          display: z.string().optional(),
        }),
        logos: z.object({
          main_url: z.string().nullable().optional(),
          dark_url: z.string().nullable().optional(),
          icon_url: z.string().nullable().optional(),
          light_url: z.string().nullable().optional(),
        }),
        voice: z.object({
          tone_of_voice: z.string(),
          tone_rules: z.array(z.string()).default([]),
          do_words: z.array(z.string()).default([]),
          dont_words: z.array(z.string()).default([]),
        }),
        content_pillars: z.array(z.string()).default([]),
        visual_style: z
          .object({
            border_radius: z.enum(["none", "small", "medium", "large", "full"]).default("medium"),
            shadow: z.enum(["none", "subtle", "medium"]).default("none"),
            icon_set: z.enum(["lucide", "phosphor"]).default("lucide"),
          })
          .default({ border_radius: "medium", shadow: "none", icon_set: "lucide" }),
      })
      .parse(d)
  )
  .handler(async ({ data }): Promise<{ success: boolean; updated_at: string }> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    const storeId = data.storeId || identity.store_id;

    if (!storeId) {
      throw new Error("Não autorizado: loja não informada.");
    }
    assertStoreAccess(identity);

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("brand_dna_profiles")
      .upsert(
        {
          store_id: storeId,
          archetype: data.archetype,
          archetype_justification: data.archetype_justification || "",
          tone_of_voice: data.voice.tone_of_voice,
          tone_rules: data.voice.tone_rules,
          content_pillars: data.content_pillars,
          forbidden_words: data.voice.dont_words,
          color_palette: data.colors,
          typography: data.typography,
          logos: data.logos,
          visual_style: data.visual_style,
          edited_by_human: true,
          updated_at: now,
        },
        { onConflict: "store_id" }
      );

    if (error) {
      throw new Error(`Erro ao salvar Brand Kit: ${error.message}`);
    }

    return { success: true, updated_at: now };
  });

// ── 5. SERVER FUNCTION: EXTRAÇÃO DE DNA DE MARCA VIA URL ────────────────────
export const extractBrandDnaFromUrl = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        storeId: z.string().uuid().optional(),
        url: z.string().url(),
      })
      .parse(d)
  )
  .handler(async ({ data }): Promise<BrandKitDTO> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity().catch(() => null);
    const storeId = data.storeId || identity?.store_id;

    if (!storeId) {
      throw new Error("Loja não informada para associar o Brand DNA extraído.");
    }
    if (identity) assertStoreAccess(identity);

    let targetUrl = data.url.trim();
    if (!targetUrl.startsWith("http")) targetUrl = `https://${targetUrl}`;

    // 1. Fetch da URL pública para extrair metadados e CSS inline
    let html = "";
    try {
      const res = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Waesy-BrandBot/2.0; +https://usewaesy.com)",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(9000),
      });
      if (res.ok) {
        html = await res.text();
      }
    } catch (err: any) {
      console.warn("[brand-kit] Fetch direto falhou ou bloqueado por CORS, usando fallback semântico:", err.message);
    }

    // 2. Extração de Cores do HTML
    const colorMatches = Array.from(html.matchAll(/#([0-9a-fA-F]{3,6})\b/g));
    const rawColors: string[] = [];
    for (const m of colorMatches) {
      rawColors.push(`#${m[1]}`);
    }

    const themeColorMatch = (html.match(/<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i) ?? [])[1];
    if (themeColorMatch && themeColorMatch.startsWith("#")) {
      rawColors.unshift(themeColorMatch);
    }

    const normalizedPalette = normalizeHexPalette(rawColors);

    // 3. Extração de Fontes
    const fontMatches = Array.from(html.matchAll(/font-family\s*:\s*["']?([^"';,\n]+)/gi));
    const discoveredFonts: string[] = [];
    for (const m of fontMatches) {
      const name = m[1].trim().replace(/["']/g, "").split(",")[0].trim();
      if (name && name.length > 2 && !/sans-serif|serif|inherit|initial/i.test(name)) {
        if (!discoveredFonts.includes(name)) discoveredFonts.push(name);
      }
    }

    // 4. Extração de Títulos e Textos
    const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i) ?? [])[1]?.trim() || new URL(targetUrl).hostname;
    const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ?? [])[1]?.replace(/<[^>]+>/g, "").trim() || "";
    const description =
      (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ?? [])[1]?.trim() || "";

    const inferredCategory = inferProductCategoryFromText(`${title} ${h1} ${description}`);

    // 5. Acionar o "Identity Engineer" via Unified AI Call
    const aiSystemPrompt = `
NOME DO AGENTE: "The Identity Engineer" (Waesy Platform)
CURRÍCULO: Especialista em Arquétipos de Carl Jung, Estrategista de Marcas e Head of Branding.
MISSÃO: Analisar os dados extraídos de uma URL de referência e sintetizar um Brand DNA denso, acionável e psicológico.

REGRAS RÍGIDAS:
- Retorne APENAS um JSON válido no formato solicitado, sem crases markdown ou conversas.
- Selecione 1 dos 12 arquétipos junguianos clássicos: O Criador, O Herói, O Rebelde, O Mago, O Sábio, O Amante, O Cuidador, O Explorador, O Governante, O Cara Comum, O Inocente, O Bobo da Corte.
- Tom de voz: direto, confiante e empático (estilo Apple e Linear).
- Proibido inventar métricas financeiras.
`;

    const aiUserPrompt = `
URL: ${targetUrl}
Título: ${title}
Headline (H1): ${h1}
Meta Description: ${description}
Categoria Inferida: ${inferredCategory}
Cores Detectadas: ${normalizedPalette.join(", ")}
Fontes Detectadas: ${discoveredFonts.slice(0, 3).join(", ") || "Inter"}

Gere a estrutura completa em JSON:
{
  "archetype": "string",
  "archetype_justification": "string (máximo 2 frases)",
  "tone_of_voice": "string (3 a 5 adjetivos com foco em ação)",
  "tone_rules": ["string", "string", "string"],
  "content_pillars": ["string", "string", "string"],
  "forbidden_words": ["string", "string"],
  "primary_color": "HEX",
  "secondary_color": "HEX",
  "accent_color": "HEX",
  "heading_font": "string",
  "body_font": "string"
}
`;

    let aiResult: any = null;
    try {
      const aiRes = await executeUnifiedAiCall({
        systemPrompt: aiSystemPrompt,
        userPrompt: aiUserPrompt,
        responseFormat: "json_object",
        temperature: 0.3,
      });
      aiResult = aiRes.parsedJson;
      if (!aiResult && aiRes.content) {
        const cleanJson = aiRes.content.replace(/```(?:json)?\s*([\s\S]*?)```/i, "$1").trim();
        aiResult = JSON.parse(cleanJson);
      }
    } catch (err: any) {
      console.warn("[brand-kit] AI call falhou ou retornou texto inválido, aplicando fallback robusto:", err.message);
      aiResult = {
        archetype: "O Criador",
        archetype_justification: `Marca estruturada com foco em originalidade e credibilidade no segmento de ${inferredCategory}.`,
        tone_of_voice: "Confiante, dinâmico e direto",
        tone_rules: ["Frases curtas de alto impacto", "Zero jargões vazios", "Benefício evidente no primeiro parágrafo"],
        content_pillars: ["Qualidade Superior", "Transparência Total", "Respeito ao Cliente"],
        forbidden_words: ["Baratinho", "Garantia mágica"],
        primary_color: normalizedPalette[0] || "#0A84FF",
        secondary_color: normalizedPalette[1] || "#5E5CE6",
        accent_color: normalizedPalette[2] || "#30D158",
        heading_font: discoveredFonts[0] || "Inter",
        body_font: "Inter",
      };
    }

    const finalColors: BrandKitColorsDTO = {
      primary: aiResult.primary_color || normalizedPalette[0] || "#0A84FF",
      secondary: aiResult.secondary_color || normalizedPalette[1] || "#5E5CE6",
      accent: aiResult.accent_color || normalizedPalette[2] || "#30D158",
      background: "#09090B",
      text: "#FAFAFA",
      palette: normalizedPalette,
    };

    const finalTypography: BrandKitTypographyDTO = {
      heading: aiResult.heading_font || discoveredFonts[0] || "Inter",
      body: aiResult.body_font || "Inter",
      mono: "JetBrains Mono",
      display: "Playfair Display",
    };

    const now = new Date().toISOString();

    // 6. Gravar perfil enriquecido no banco
    const { data: updated } = await supabase
      .from("brand_dna_profiles")
      .upsert(
        {
          store_id: storeId,
          archetype: aiResult.archetype || "O Criador",
          archetype_justification: aiResult.archetype_justification || "DNA deduzido via engenharia reversa de website.",
          tone_of_voice: aiResult.tone_of_voice || "Elegante e direto",
          tone_rules: aiResult.tone_rules || ["Clareza máxima", "Sem atrito"],
          content_pillars: aiResult.content_pillars || ["Qualidade", "Agilidade"],
          forbidden_words: aiResult.forbidden_words || ["Baratinho"],
          color_palette: finalColors,
          typography: finalTypography,
          logos: DEFAULT_BRAND_KIT_LOGOS,
          visual_style: { border_radius: "medium", shadow: "none", icon_set: "lucide" },
          ai_model: "gemini-flash / unified-ai-orchestrator",
          confidence: 0.92,
          edited_by_human: false,
          updated_at: now,
        },
        { onConflict: "store_id" }
      )
      .select()
      .single();

    return {
      id: updated?.id || crypto.randomUUID(),
      store_id: storeId,
      archetype: updated?.archetype || aiResult.archetype,
      archetype_justification: updated?.archetype_justification || aiResult.archetype_justification,
      colors: finalColors,
      typography: finalTypography,
      logos: DEFAULT_BRAND_KIT_LOGOS,
      voice: {
        tone_of_voice: updated?.tone_of_voice || aiResult.tone_of_voice,
        tone_rules: updated?.tone_rules || aiResult.tone_rules,
        do_words: ["Exclusivo", "Qualidade", "Confiança"],
        dont_words: updated?.forbidden_words || aiResult.forbidden_words,
      },
      content_pillars: updated?.content_pillars || aiResult.content_pillars,
      visual_style: { border_radius: "medium", shadow: "none", icon_set: "lucide" },
      swot_analysis: {
        strengths: ["Posicionamento autêntico extraído"],
        weaknesses: ["Ajuste manual de identidade visual recomendado"],
        opportunities: ["Diferenciação contra concorrentes genéricos"],
        threats: ["Oscilações de custo de aquisição"],
      },
      seven_sins_triggers: {},
      edited_by_human: false,
      updated_at: now,
    };
  });
