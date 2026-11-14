export interface BrandThemeInput {
  primary_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
  theme_style?: string | null;
}

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

export function sanitizeHexColor(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return HEX_COLOR_RE.test(trimmed) ? trimmed : null;
}

export function resolveThemeStyleAttr(themeStyle?: string | null): string {
  const clean = themeStyle?.trim();
  if (!clean) return "azure_minimal";
  return clean.replace(/[^a-zA-Z0-9_-]/g, "") || "azure_minimal";
}

/**
 * Generates root CSS variable overrides synchronized with Admin Master brand settings.
 * Preserves Tailwind neutral `--color-accent` hover backgrounds so interactive Ghost/Menu contrast stays intact.
 */
export function buildBrandThemeCss(brand?: BrandThemeInput | null): string {
  const accent = sanitizeHexColor(brand?.accent_color);
  const primary = sanitizeHexColor(brand?.primary_color);
  const secondary = sanitizeHexColor(brand?.secondary_color);

  if (!accent && !primary && !secondary) {
    return "";
  }

  const resolvedHover = secondary || accent;
  const lightVars: string[] = [];
  const darkVars: string[] = [];

  if (accent) {
    lightVars.push(
      `--magic-accent-primary: ${accent};`,
      `--primary: ${accent};`,
      `--color-primary: ${accent};`,
      `--ring: ${accent};`,
      `--border-focus: ${accent};`,
      `--accent-soft: color-mix(in srgb, ${accent} 10%, transparent);`,
    );
    darkVars.push(
      `--magic-accent-primary: ${accent};`,
      `--primary: ${accent};`,
      `--color-primary: ${accent};`,
      `--ring: ${accent};`,
      `--border-focus: ${accent};`,
      `--accent-soft: color-mix(in srgb, ${accent} 18%, transparent);`,
    );
  }

  if (resolvedHover) {
    lightVars.push(`--magic-accent-hover: ${resolvedHover};`);
    darkVars.push(`--magic-accent-hover: ${resolvedHover};`);
  }

  if (primary) {
    lightVars.push(`--brand-primary: ${primary};`);
    darkVars.push(`--brand-primary: ${primary};`);
  }

  if (secondary) {
    lightVars.push(`--brand-secondary: ${secondary};`);
    darkVars.push(`--brand-secondary: ${secondary};`);
  }

  return `
    :root {
      ${lightVars.join("\n      ")}
    }
    .dark, [data-theme="dark"] {
      ${darkVars.join("\n      ")}
    }
  `.trim();
}
