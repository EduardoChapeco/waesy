/**
 * Theme Factory & Artifact Styling Engine
 * 
 * Provides 10 canonical high-fidelity styling themes, on-the-fly custom theme generation,
 * WCAG 2.2 AA contrast validation, and CSS variables injection.
 * Reference: .agents/skills/theme-factory/SKILL.md & docs/THEME_FACTORY.md
 */

export interface ThemeColors {
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  textMuted: string;
}

export interface ThemeTypography {
  headingFont: string;
  bodyFont: string;
  codeFont?: string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
  typography: ThemeTypography;
}

export const CANONICAL_THEMES: ThemeDefinition[] = [
  {
    id: 'ocean-depths',
    name: 'Profundezas do Oceano',
    description: 'Tema marítimo profissional, relaxante e de alta autoridade institucional.',
    colors: {
      background: '#0f172a',
      surface: '#1e293b',
      primary: '#0284c7',
      secondary: '#06b6d4',
      accent: '#38bdf8',
      text: '#f8fafc',
      textMuted: '#94a3b8',
    },
    typography: {
      headingFont: 'Plus Jakarta Sans',
      bodyFont: 'Inter',
      codeFont: 'JetBrains Mono',
    },
  },
  {
    id: 'sunset-boulevard',
    name: 'Sunset Boulevard',
    description: 'Cores quentes, vibrantes e cinematográficas do pôr do sol.',
    colors: {
      background: '#2e1065',
      surface: '#3b0764',
      primary: '#db2777',
      secondary: '#f97316',
      accent: '#fbbf24',
      text: '#fff7ed',
      textMuted: '#fdba74',
    },
    typography: {
      headingFont: 'Syne',
      bodyFont: 'DM Sans',
      codeFont: 'Fira Code',
    },
  },
  {
    id: 'forest-canopy',
    name: 'Copa da Floresta',
    description: 'Tons terrosos naturais, ecológicos e equilibrados.',
    colors: {
      background: '#052e16',
      surface: '#14532d',
      primary: '#16a34a',
      secondary: '#84cc16',
      accent: '#eab308',
      text: '#fefce8',
      textMuted: '#bef264',
    },
    typography: {
      headingFont: 'Fraunces',
      bodyFont: 'Outfit',
      codeFont: 'JetBrains Mono',
    },
  },
  {
    id: 'modern-minimal',
    name: 'Minimalismo Moderno',
    description: 'Tons de cinza limpos, contemporâneos e hiper-refinados (Apple / Vercel style).',
    colors: {
      background: '#09090b',
      surface: '#18181b',
      primary: '#fafafa',
      secondary: '#71717a',
      accent: '#e4e4e7',
      text: '#ffffff',
      textMuted: '#a1a1aa',
    },
    typography: {
      headingFont: 'Geist',
      bodyFont: 'Inter',
      codeFont: 'Geist Mono',
    },
  },
  {
    id: 'golden-hour',
    name: 'Hora Dourada',
    description: 'Paleta outonal rica, quente, nobre e luxuosa.',
    colors: {
      background: '#451a03',
      surface: '#78350f',
      primary: '#d97706',
      secondary: '#fbbf24',
      accent: '#f59e0b',
      text: '#fffbeb',
      textMuted: '#fde68a',
    },
    typography: {
      headingFont: 'Playfair Display',
      bodyFont: 'Lora',
      codeFont: 'JetBrains Mono',
    },
  },
  {
    id: 'arctic-frost',
    name: 'Geada Ártica',
    description: 'Tema inspirado no inverno glacial, fresco, translúcido e revigorante.',
    colors: {
      background: '#082f49',
      surface: '#0c4a6e',
      primary: '#38bdf8',
      secondary: '#bae6fd',
      accent: '#7dd3fc',
      text: '#f0f9ff',
      textMuted: '#e0f2fe',
    },
    typography: {
      headingFont: 'Cabinet Grotesk',
      bodyFont: 'Satoshi',
      codeFont: 'JetBrains Mono',
    },
  },
  {
    id: 'desert-rose',
    name: 'Rosa do Deserto',
    description: 'Tons suaves, sofisticados, terrosos e acolhedores em pó.',
    colors: {
      background: '#4c0519',
      surface: '#881337',
      primary: '#f43f5e',
      secondary: '#fb7185',
      accent: '#fecdd3',
      text: '#fff1f2',
      textMuted: '#ffe4e6',
    },
    typography: {
      headingFont: 'Cormorant Garamond',
      bodyFont: 'Plus Jakarta Sans',
      codeFont: 'Fira Code',
    },
  },
  {
    id: 'tech-innovation',
    name: 'Inovação Tecnológica',
    description: 'Estética tecnológica arrojada, cibernética e de alta energia (Linear / Stripe style).',
    colors: {
      background: '#020617',
      surface: '#0f172a',
      primary: '#6366f1',
      secondary: '#06b6d4',
      accent: '#a855f7',
      text: '#f8fafc',
      textMuted: '#94a3b8',
    },
    typography: {
      headingFont: 'Space Grotesk',
      bodyFont: 'JetBrains Mono',
      codeFont: 'JetBrains Mono',
    },
  },
  {
    id: 'botanical-garden',
    name: 'Jardim Botânico',
    description: 'Cores frescas, orgânicas, vivas e revigorantes de estufa botânica.',
    colors: {
      background: '#022c22',
      surface: '#064e3b',
      primary: '#10b981',
      secondary: '#34d399',
      accent: '#a7f3d0',
      text: '#f0fdf4',
      textMuted: '#bbf7d0',
    },
    typography: {
      headingFont: 'Newsreader',
      bodyFont: 'Manrope',
      codeFont: 'JetBrains Mono',
    },
  },
  {
    id: 'midnight-galaxy',
    name: 'Galáxia da Meia-Noite',
    description: 'Tons cósmicos profundos, dramáticos, espaciais e estelares.',
    colors: {
      background: '#030712',
      surface: '#111827',
      primary: '#7c3aed',
      secondary: '#ec4899',
      accent: '#c084fc',
      text: '#fdf4ff',
      textMuted: '#d8b4fe',
    },
    typography: {
      headingFont: 'Clash Display',
      bodyFont: 'Inter',
      codeFont: 'JetBrains Mono',
    },
  },
];

/**
 * Retrieves a canonical theme by its ID or localized name (case-insensitive & accent-insensitive).
 */
export function getThemeByIdOrName(query: string): ThemeDefinition | undefined {
  if (!query || typeof query !== 'string') return undefined;

  const strip = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const normalized = strip(query);
  const normalizedKebab = normalized.replace(/\s+/g, '-');

  return CANONICAL_THEMES.find((t) => {
    const idClean = strip(t.id);
    const nameClean = strip(t.name);
    const nameKebab = nameClean.replace(/\s+/g, '-');

    return (
      idClean === normalized ||
      idClean === normalizedKebab ||
      nameClean === normalized ||
      nameKebab === normalized ||
      nameKebab === normalizedKebab
    );
  });
}

/**
 * Calculates relative luminance from hex color string (W3C formula).
 */
export function getRelativeLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '').trim();
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const rLin = toLinear(r);
  const gLin = toLinear(g);
  const bLin = toLinear(b);

  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

/**
 * Calculates contrast ratio between two hex colors (e.g. 4.5:1 -> 4.5).
 */
export function calculateContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getRelativeLuminance(hex1);
  const lum2 = getRelativeLuminance(hex2);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  const ratio = (brightest + 0.05) / (darkest + 0.05);
  return Math.round(ratio * 10) / 10;
}

/**
 * Validates WCAG 2.2 AA contrast compliance for text and UI against the background.
 */
export function validateThemeContrast(theme: ThemeDefinition): {
  passesWcagAa: boolean;
  normalTextRatio: number;
  uiRatio: number;
  errors: string[];
} {
  const errors: string[] = [];
  const normalTextRatio = calculateContrastRatio(theme.colors.text, theme.colors.background);
  const uiRatio = calculateContrastRatio(theme.colors.primary, theme.colors.background);

  if (normalTextRatio < 4.5) {
    errors.push(
      `Contraste de texto regular (${normalTextRatio}:1) abaixo do mínimo exigido de 4.5:1 (WCAG 2.2 AA).`
    );
  }

  if (uiRatio < 3.0) {
    errors.push(
      `Contraste de elemento primário/UI (${uiRatio}:1) abaixo do mínimo exigido de 3.0:1 (WCAG 2.2 AA).`
    );
  }

  return {
    passesWcagAa: errors.length === 0,
    normalTextRatio,
    uiRatio,
    errors,
  };
}

/**
 * Converts a theme specification into CSS custom properties.
 */
export function applyThemeToCssVariables(theme: ThemeDefinition): Record<string, string> {
  return {
    '--theme-id': theme.id,
    '--color-background': theme.colors.background,
    '--color-surface': theme.colors.surface,
    '--color-primary': theme.colors.primary,
    '--color-secondary': theme.colors.secondary,
    '--color-accent': theme.colors.accent,
    '--color-text': theme.colors.text,
    '--color-text-muted': theme.colors.textMuted,
    '--font-heading': `'${theme.typography.headingFont}', sans-serif`,
    '--font-body': `'${theme.typography.bodyFont}', sans-serif`,
    '--font-code': `'${theme.typography.codeFont || 'JetBrains Mono'}', monospace`,
  };
}

/**
 * Generates a custom bespoke theme on-the-fly based on a concept or custom palette.
 */
export function generateCustomTheme(
  conceptName: string,
  overrides?: Partial<ThemeDefinition>
): ThemeDefinition {
  const safeId = conceptName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'custom-theme';

  return {
    id: safeId,
    name: conceptName,
    description: `Tema sob demanda sintetizado para o conceito "${conceptName}".`,
    colors: {
      background: overrides?.colors?.background || '#09090b',
      surface: overrides?.colors?.surface || '#18181b',
      primary: overrides?.colors?.primary || '#3b82f6',
      secondary: overrides?.colors?.secondary || '#60a5fa',
      accent: overrides?.colors?.accent || '#93c5fd',
      text: overrides?.colors?.text || '#ffffff',
      textMuted: overrides?.colors?.textMuted || '#a1a1aa',
    },
    typography: {
      headingFont: overrides?.typography?.headingFont || 'Plus Jakarta Sans',
      bodyFont: overrides?.typography?.bodyFont || 'Inter',
      codeFont: overrides?.typography?.codeFont || 'JetBrains Mono',
    },
  };
}

/**
 * Formats a Markdown Theme Showcase catalog for presentation to the user.
 */
export function formatThemeShowcaseMarkdown(): string {
  const lines: string[] = [
    '## 🎨 Vitrine de Temas da Fábrica (Theme Showcase)',
    '',
    '| # | ID | Nome | Descrição | Título | Corpo | Primária | Fundo |',
    '|---|---|---|---|---|---|---|---|',
  ];

  CANONICAL_THEMES.forEach((t, i) => {
    lines.push(
      `| ${i + 1} | \`${t.id}\` | **${t.name}** | ${t.description} | ${t.typography.headingFont} | ${t.typography.bodyFont} | \`${t.colors.primary}\` | \`${t.colors.background}\` |`
    );
  });

  return lines.join('\n');
}
