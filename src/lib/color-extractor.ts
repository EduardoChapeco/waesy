/**
 * color-extractor.ts — Utilitário canônico de extração, normalização
 * e análise cromática de produtos e marcas.
 */

export interface ExtractedColorAnalysis {
  palette: string[]; // Até 5 cores observadas em formato HEX #RRGGBB; vazio se não houver evidência.
  dominantColor: string | null;
  inferredCategory: string | null;
  contrastRatioWithWhite: number | null;
}

/**
 * Normaliza uma lista de cores brutas para HEX de 6 dígitos válido,
 * eliminando duplicatas e retornando lista vazia se nenhuma cor foi observada.
 */
export function normalizeHexPalette(rawPalette: string[] = [], maxColors = 5): string[] {
  const hexRegex = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const item of rawPalette) {
    const trimmed = item.trim();
    if (!hexRegex.test(trimmed)) continue;

    let hex = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    if (hex.length === 4) {
      hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toUpperCase();
    } else {
      hex = hex.toUpperCase();
    }

    if (seen.has(hex)) continue;
    seen.add(hex);
    normalized.push(hex);

    if (normalized.length >= maxColors) break;
  }

  return normalized;
}

/** Infere uma categoria apenas quando o texto tem um sinal conhecido. */
export function inferProductCategoryFromText(text: string): string | null {
  const normalized = text.toLowerCase();

  if (/perfume|skincare|serum|cosmetic|cosmetico|maquiagem|batom|creme|hidratante|beleza/.test(normalized)) {
    return "Cosméticos & Beleza";
  }
  if (/chocolate|snack|comida|lanche|pizza|hamburguer|bebida|cookie|cafe|suco|refeicao|restaurante/.test(normalized)) {
    return "Gastronomia & Alimentos";
  }
  if (/camisa|camiseta|vestido|calca|tenis|sapato|moda|vestuario|jaqueta|roupa|acessorio/.test(normalized)) {
    return "Moda & Vestuário";
  }
  if (/smartphone|celular|phone|tech|fone|notebook|computador|gadget|hardware|eletronico/.test(normalized)) {
    return "Tecnologia & Eletrônicos";
  }
  if (/hotel|viagem|passagem|excursao|voo|hospedagem|pousada|resort|turismo|passeio/.test(normalized)) {
    return "Turismo & Viagens";
  }
  if (/imovel|casa|apartamento|terreno|locacao|aluguel|venda|imobiliaria/.test(normalized)) {
    return "Imóveis & Locação";
  }
  if (/advocacia|juridico|advogado|processo|consulta|honorario|direito/.test(normalized)) {
    return "Serviços Jurídicos";
  }

  return null;
}

/** Calcula luminância relativa WCAG para um HEX válido. */
export function getRelativeLuminance(hex: string): number {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** Analisa apenas dados fornecidos; ausências permanecem null/vazias. */
export function analyzeColorPaletteAndContext(
  providedPalette: string[] = [],
  contextText = ""
): ExtractedColorAnalysis {
  const palette = normalizeHexPalette(providedPalette);
  const dominantColor = palette[0] ?? null;
  const lum = dominantColor ? getRelativeLuminance(dominantColor) : null;
  const contrastWithWhite = lum == null ? null : Number(((1.0 + 0.05) / (lum + 0.05)).toFixed(2));

  return {
    palette,
    dominantColor,
    inferredCategory: inferProductCategoryFromText(contextText),
    contrastRatioWithWhite: contrastWithWhite,
  };
}
