/**
 * Presentation Presets & Post Themes (Waesy Themes Engine)
 * Permite ao autor escolher a cara pública do post sem alterar o dado canônico.
 * 
 * Regra B.8: Zero cores hexadecimais literais — estritamente tokens CSS var(--color-*).
 */

export interface PresentationTheme {
  id: string;
  name: string;
  category: "clean" | "editorial" | "noturno" | "cultural" | "comercial";
  description: string;
  badgeLabel?: string;
  colors: {
    primary: string;
    background: string;
    cardBg: string;
    text: string;
    accent: string;
    border: string;
  };
  gradient?: string;
  animation?: "none" | "glow" | "shimmer" | "float";
  fontFamily?: string;
  patternType?: "none" | "grid" | "halftone" | "zine_noise";
}

export const PRESENTATION_THEMES: PresentationTheme[] = [
  {
    id: "clean_standard",
    name: "Clean Padrão",
    category: "clean",
    description: "Design neutro e funcional com foco na leitura.",
    colors: {
      primary: "var(--color-primary)",
      background: "var(--color-background)",
      cardBg: "var(--color-card)",
      text: "var(--color-foreground)",
      accent: "var(--color-primary)",
      border: "var(--color-border)",
    },
    animation: "none",
    fontFamily: "Inter, sans-serif",
  },
  {
    id: "editorial_zine",
    name: "Zine Cultural / Lambe-Lambe",
    category: "editorial",
    description: "Estética independente lambe-lambe com tipografia de alto impacto.",
    badgeLabel: "Zine",
    colors: {
      primary: "var(--color-foreground)",
      background: "var(--color-muted)",
      cardBg: "var(--color-card)",
      text: "var(--color-foreground)",
      accent: "var(--color-primary)",
      border: "var(--color-border)",
    },
    patternType: "zine_noise",
    animation: "none",
    fontFamily: "Plus Jakarta Sans, sans-serif",
  },
  {
    id: "dark_glow",
    name: "Dark Glow / Noturno",
    category: "noturno",
    description: "Fundo profundo com iluminação neon suave para festas e música.",
    badgeLabel: "Night",
    colors: {
      primary: "var(--color-primary)",
      background: "var(--color-background)",
      cardBg: "var(--color-card)",
      text: "var(--color-foreground)",
      accent: "var(--color-primary)",
      border: "var(--color-border)",
    },
    animation: "glow",
    fontFamily: "Inter, sans-serif",
  },
  {
    id: "event_ticket",
    name: "Ticket de Evento",
    category: "cultural",
    description: "Formato de ingresso perfurado com foco em data e portaria.",
    badgeLabel: "Ingresso",
    colors: {
      primary: "var(--color-primary)",
      background: "var(--color-background)",
      cardBg: "var(--color-card)",
      text: "var(--color-foreground)",
      accent: "var(--color-primary)",
      border: "var(--color-border)",
    },
    animation: "none",
    fontFamily: "Inter, sans-serif",
  },
  {
    id: "gourmet_experience",
    name: "Experiência Gastronômica",
    category: "comercial",
    description: "Cores acolhedoras e elegantes para restaurantes e cafés.",
    badgeLabel: "Menu",
    colors: {
      primary: "var(--color-primary)",
      background: "var(--color-background)",
      cardBg: "var(--color-card)",
      text: "var(--color-foreground)",
      accent: "var(--color-primary)",
      border: "var(--color-border)",
    },
    animation: "none",
    fontFamily: "Inter, sans-serif",
  },
  {
    id: "underground_riot",
    name: "Underground Brutal",
    category: "editorial",
    description: "Cores ácidas contrastantes para o circuito de bandas e festivais.",
    badgeLabel: "Live",
    colors: {
      primary: "var(--color-primary)",
      background: "var(--color-background)",
      cardBg: "var(--color-card)",
      text: "var(--color-foreground)",
      accent: "var(--color-primary)",
      border: "var(--color-border)",
    },
    animation: "shimmer",
    fontFamily: "JetBrains Mono, monospace",
  },
];

export function getThemeById(id?: string): PresentationTheme {
  return PRESENTATION_THEMES.find((t) => t.id === id) || PRESENTATION_THEMES[0];
}
