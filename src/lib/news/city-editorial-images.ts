/**
 * city-editorial-images.ts — SSOT de Resolução Editorial de Imagens para Notícias
 * 
 * Invariante B.8 e B.33: Proibido usar imagens de estoque (Unsplash, Pexels) como fallback silencioso.
 * Itens jornalísticos sem capa autêntica fornecida pela fonte legítima DEVEM renderizar
 * exclusivamente layout editorial tipográfico honesto (retorna null).
 */

export interface ResolveCityNewsCoverParams {
  coverUrl?: string | null;
  city?: string | null;
  state?: string | null;
  category?: string | null;
  tags?: string[] | null;
  title?: string | null;
}

/**
 * Resolve com segurança a imagem de capa de uma notícia:
 * 1. Se a notícia já possuir capa legítima (URL válida de imagem e NÃO for estoque do Unsplash), preserva a original.
 * 2. Se não possuir capa legítima ou for estoque sintético (Unsplash), retorna null para layout textual honesto.
 */
export function resolveCityNewsCover(params?: ResolveCityNewsCoverParams | null): string | null {
  if (!params) return null;

  const rawCover = params.coverUrl ? String(params.coverUrl).trim() : null;
  if (!rawCover) return null;

  // Sanitiza URLs inválidas, miniaturas de avatar/ícone ou estoque sintético (Unsplash/Pexels)
  const lowerCover = rawCover.toLowerCase();
  const isInvalid =
    rawCover === "undefined" ||
    rawCover === "null" ||
    rawCover.includes("1511707171634-5f897ff02560") ||
    lowerCover.includes("images.unsplash.com") ||
    lowerCover.includes("unsplash.com") ||
    lowerCover.includes("images.pexels.com") ||
    lowerCover.includes("pexels.com") ||
    lowerCover.includes("-150x150.") ||
    lowerCover.includes("-100x100.") ||
    lowerCover.includes("icon_pdf") ||
    lowerCover.includes("pixel.gif") ||
    lowerCover.includes("spacer.gif");

  if (isInvalid) {
    return null;
  }

  const isValidUrl =
    rawCover.startsWith("http://") ||
    rawCover.startsWith("https://") ||
    rawCover.startsWith("/");

  if (isValidUrl) {
    return rawCover;
  }

  return null;
}
