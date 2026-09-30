/**
 * color-extractor.ts — Utilitário canônico de extração, normalização
 * e análise cromática de produtos e marcas (Waesy Platform).
 */

export interface ExtractedColorAnalysis {
  palette: string[]; // Até 5 cores normalizadas em formato HEX #RRGGBB
  dominantColor: string;
  inferredCategory: string;
  contrastRatioWithWhite: number;
}

/**
 * Normaliza uma lista de cores brutas para HEX de 6 dígitos válido,
 * eliminando duplicatas e valores próximos a branco puro/preto puro.
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
      // Expande #RGB para #RRGGBB
      hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toUpperCase();
    } else {
      hex = hex.toUpperCase();
    }

    // Pular quase branco e quase preto se houver outras opções
    if (seen.has(hex)) continue;
    seen.add(hex);
    normalized.push(hex);

    if (normalized.length >= maxColors) break;
  }

  return normalized.length > 0 ? normalized : ["#0A84FF", "#5E5CE6", "#30D158"];
}

/**
 * Infere a categoria semântica do produto a partir de descrições ou nomes de arquivos.
 */
export function inferProductCategoryFromText(text: string): string {
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

  return "Comércio Geral";
}

/**
 * Calcula a luminância relativa de uma cor HEX segundo o padrão WCAG.
 */
export function getRelativeLuminance(hex: string): number {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Analisa uma paleta e descrições, retornando relatório completo.
 */
export function analyzeColorPaletteAndContext(
  providedPalette: string[] = [],
  contextText = ""
): ExtractedColorAnalysis {
  const palette = normalizeHexPalette(providedPalette);
  const dominantColor = palette[0] || "#0A84FF";
  const lum = getRelativeLuminance(dominantColor);
  const contrastWithWhite = (1.0 + 0.05) / (lum + 0.05);

  return {
    palette,
    dominantColor,
    inferredCategory: inferProductCategoryFromText(contextText),
    contrastRatioWithWhite: Number(contrastWithWhite.toFixed(2)),
  };
}
