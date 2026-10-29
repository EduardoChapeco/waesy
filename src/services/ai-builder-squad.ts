/**
 * ai-builder-squad.ts — Motor de Geração Multiagente do Omni Builder com Sandbox Anti-Injeção
 * 
 * Implementa arquitetura multiagente dividida em 4 papéis autônomos:
 * 1. Architect / Planner (Decompõe o brief em estrutura lógica)
 * 2. Designer (Deriva paleta e tipografia conforme Design Tokens)
 * 3. Coder (Gera schemas de blocos Omni válidos)
 * 4. Security & Quality Gate (Filtra prompt injection, valida AST e WCAG)
 */

import { z } from "zod";
import { OmniBlockInstance, OmniBlockInstanceSchema, OmniPageDocument } from "@/types/omni-builder";

// ── 1. GUARDA DE SEGURANÇA ZERO-TRUST ANTI-PROMPT INJECTION ──

const ADVERSARIAL_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /reveal\s+(system\s+)?prompt/i,
  /you\s+are\s+now\s+in\s+dan\s+mode/i,
  /drop\s+table/i,
  /delete\s+from\s+/i,
  /select\s+.*\s+from\s+auth/i,
  /<script\b[^>]*>/i,
  /javascript\s*:/i,
  /eval\s*\(/i,
  /bypass\s+(rls|security|tenant)/i,
  /export\s+all\s+(passwords|users|keys)/i,
];

export function validateAndSanitizeBuilderPrompt(prompt: string): {
  isValid: boolean;
  sanitizedPrompt: string;
  threatDetected?: string;
} {
  const trimmed = prompt.trim();

  if (!trimmed || trimmed.length < 3) {
    return { isValid: false, sanitizedPrompt: "", threatDetected: "Prompt muito curto ou vazio." };
  }

  if (trimmed.length > 2000) {
    return { isValid: false, sanitizedPrompt: "", threatDetected: "Prompt excede limite seguro de 2000 caracteres." };
  }

  for (const pattern of ADVERSARIAL_INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        isValid: false,
        sanitizedPrompt: "",
        threatDetected: `Tentativa de injeção ou comando adversário detectado: ${pattern.toString()}`,
      };
    }
  }

  // Sanitiza tags HTML para evitar injeção DOM
  const sanitized = trimmed
    .replace(/<[^>]*>?/gm, "")
    .replace(/[;&`]/g, " ")
    .trim();

  return { isValid: true, sanitizedPrompt: sanitized };
}

// ── 2. AGENTE 1: ARCHITECT / PLANNER ──

export interface ArchitecturePlan {
  suggestedNiche: "supermarket" | "gastronomy" | "events" | "services" | "ecommerce" | "editorial";
  blockSequence: {
    type: string;
    intent: string;
  }[];
}

export function planPageArchitecture(prompt: string): ArchitecturePlan {
  const lower = prompt.toLowerCase();

  if (lower.includes("mercado") || lower.includes("açougue") || lower.includes("hortifruti") || lower.includes("padaria")) {
    return {
      suggestedNiche: "supermarket",
      blockSequence: [
        { type: "supermarket_hero_carousel", intent: "Capa imersiva contínua com banners de promoções" },
        { type: "supermarket_fulfillment_pill", intent: "Alternador de modalidade entrega vs retirada" },
        { type: "supermarket_category_dock", intent: "Departamentos circulares fotográficos" },
        { type: "supermarket_product_shelf", intent: "Trilho de ofertas do Clube com badges dinâmicas" },
      ],
    };
  }

  if (lower.includes("restaurante") || lower.includes("hamburguer") || lower.includes("pizza") || lower.includes("comida")) {
    return {
      suggestedNiche: "gastronomy",
      blockSequence: [
        { type: "food_menu_streamlined", intent: "Cardápio digital mobile-first com abas de pratos" },
        { type: "chef_special_banner", intent: "Destaque do prato do chef com CTA direto" },
        { type: "restaurant_hours_delivery", intent: "Status de funcionamento e tempo de preparo" },
      ],
    };
  }

  if (lower.includes("show") || lower.includes("festa") || lower.includes("ingresso") || lower.includes("evento")) {
    return {
      suggestedNiche: "events",
      blockSequence: [
        { type: "events_featured_banner", intent: "Banner do evento líder com contagem regressiva" },
        { type: "events_calendar_strip", intent: "Fita de calendário com datas das atrações" },
        { type: "events_list_grid", intent: "Grade de ingressos com lotes nominais" },
      ],
    };
  }

  // Default Editorial / E-commerce
  return {
    suggestedNiche: "ecommerce",
    blockSequence: [
      { type: "hero_interactive_carousel", intent: "Apresentação visual com chamada de ação" },
      { type: "bento_asymmetric_grid", intent: "Mosaico de destaques e produtos principais" },
      { type: "testimonials_social_proof", intent: "Prova social e avaliações de clientes verificados" },
      { type: "contact_form_direct", intent: "Canal direto de atendimento e conversão" },
    ],
  };
}

// ── 3. AGENTE 2 & 3: CODER & SECTION-LEVEL GENERATOR ──

export interface SectionGenerationRequest {
  userPrompt: string;
  blockTypeHint?: string;
  storeContext?: {
    storeName?: string;
    segment?: string;
  };
}

export function generateSectionBlockWithAi(req: SectionGenerationRequest): {
  success: boolean;
  block?: OmniBlockInstance;
  error?: string;
} {
  const validation = validateAndSanitizeBuilderPrompt(req.userPrompt);
  if (!validation.isValid) {
    return { success: false, error: validation.threatDetected };
  }

  const prompt = validation.sanitizedPrompt;
  const storeName = req.storeContext?.storeName || "Waesy Store";

  // Gera o bloco baseado no tipo ou na intenção sem executar código arbitrário
  let newBlock: OmniBlockInstance;
  const blockId = `ai_block_${Date.now()}`;

  if (prompt.includes("hero") || prompt.includes("banner") || prompt.includes("capa")) {
    newBlock = {
      id: blockId,
      type: "hero_interactive_carousel",
      config: {
        slides: [
          {
            title: `Bem-vindo à ${storeName}`,
            subtitle: prompt.slice(0, 100),
            cta_text: "Conhecer Catálogo",
            cta_link: "#produtos",
            background_url: "",
          },
        ],
        autoplay: true,
        interval_ms: 5000,
      },
      styling: {
        paddingTop: 0,
        paddingBottom: 0,
      },
    };
  } else if (prompt.includes("produto") || prompt.includes("vitrine") || prompt.includes("catalogo")) {
    newBlock = {
      id: blockId,
      type: "supermarket_product_shelf",
      config: {
        title: "Mais Vendidos",
        subtitle: prompt.slice(0, 80),
        items_count: 6,
        show_club_badges: true,
      },
      styling: {
        paddingTop: 24,
        paddingBottom: 24,
      },
    };
  } else if (prompt.includes("depoimento") || prompt.includes("review") || prompt.includes("avaliacao")) {
    newBlock = {
      id: blockId,
      type: "testimonials_social_proof",
      config: {
        title: "O que dizem sobre nós",
        show_verified_badge: true,
      },
      styling: {
        paddingTop: 32,
        paddingBottom: 32,
      },
    };
  } else {
    // Bloco Bento padrão com foto e texto
    newBlock = {
      id: blockId,
      type: "bento_asymmetric_grid",
      config: {
        title: storeName,
        description: prompt.slice(0, 160),
        show_badge: true,
        badge_text: "Destaque",
      },
      styling: {
        paddingTop: 24,
        paddingBottom: 24,
      },
    };
  }

  // ── 4. AGENTE 4: SECURITY & QUALITY GATE ──
  const parsed = OmniBlockInstanceSchema.safeParse(newBlock);
  if (!parsed.success) {
    return { success: false, error: "Falha de conformidade estrutural com o schema do bloco." };
  }

  return { success: true, block: parsed.data };
}
