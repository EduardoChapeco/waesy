/**
 * src/lib/studio-machine-constants.ts
 * Constantes e Prompts Arquiteturais do Sistema Studio Machine & ESCAMAS (8 Camadas).
 * Extraído diretamente do módulo studiomachine/constants.ts.
 */

import type { StudioBrandProfile } from "@/types/studio-machine";

export const VISUAL_STYLES = {
  escamas_ultra: "Escamas (Hyper-Layered 3D)",
  editorial_impact: "Editorial Impact (Zine & Notícias)",
  paper_collage: "Paper & Collage (Artesanal)",
  glass_corporate: "Glass & Corporate (Executivo)",
  noir_drama: "Noir & Drama (Cinematográfico)",
  brutalist_raw: "Brutalist Raw (Tipografia Pura)",
};

export const GOAL_OPTIONS = [
  { id: "leads", label: "Gerar Leads", desc: "Foco em conversão e contato no WhatsApp" },
  { id: "viral", label: "Viralização", desc: "Foco em compartilhamento e salvamentos" },
  { id: "education", label: "Educativo / Pauta", desc: "Foco em instruir e gerar autoridade" },
  { id: "civic_impact", label: "Impacto Cívico", desc: "Foco em transparência pública e utilidade municipal" },
];

export const ESCAMAS_ARCHITECT_PROMPT = `Você é o Arquiteto do Sistema ESCAMAS (Waesy Studio Machine).
Sua função é decompor o post ou carrossel solicitado em uma estrutura visual de exatamente 8 camadas dinâmicas.

TIPOS DE CAMADA PERMITIDOS:
- atmospheric: Efeitos como névoa, partículas de luz, glow ambiente.
- design: Elementos gráficos, molduras, badges de transparência, formas orgânicas.
- subject: O objeto ou produto principal da matéria (gráfico, documento, foto de impacto).
- person: Seres humanos, porta-vozes, figuras de destaque.
- dynamic: Linhas de movimento, flechas direcionais, rastros de energia.
- textfx: Tipografia de impacto, carimbos, marcadores de pauta, títulos em caixa alta.

REGRAS:
1. Retorne APENAS JSON válido.
2. Posicione as camadas usando coordenadas X/Y em porcentagem (0 a 100).
3. O Z-Index varia estritamente de 1 (fundo) a 8 (frente).`;

export const CONTENT_ARCHITECT_SYSTEM_PROMPT = `Você é o Diretor de Conteúdo Editorial do Waesy Studio.
Crie roteiros virais e informativos para carrosséis de Instagram no formato 4:5 (1080x1350) em Português do Brasil.
Cada slide deve ter um papel narrativo claro:
- Slide 1: Hook / Manchete de impacto que interrompe a rolagem.
- Slide 2: O Fato e o Contexto (números, dados, o que está acontecendo).
- Slide 3: O Impacto Real (por que isso importa para o leitor / consumidor).
- Slide 4: Aprofundamento / Oportunidade prática.
- Slide 5: CTA / Chamada clara para ação (leia mais no portal, comente, compartilhe).`;

export const DEFAULT_BRAND_PROFILE: StudioBrandProfile = {
  id: "waesy-default",
  name: "Waesy Notícias & Hub",
  niche: "Jornalismo & Comércio Local",
  handle: "@waesybrasil",
  primaryColor: "#0f172a",
  secondaryColor: "#38bdf8",
  accentColor: "#f59e0b",
  fontHeading: "Inter",
  fontBody: "Inter",
  mood: "Clean, editorial, autoridade de dados, alto contraste",
  logoLetter: "W",
  logoUrl: "/icon-192.png",
};
