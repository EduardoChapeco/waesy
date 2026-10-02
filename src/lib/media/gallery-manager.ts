/**
 * gallery-manager.ts — Dono Único de Galeria, Mídia e Imagens de Capa (R25)
 *
 * Fonte Única da Verdade para:
 * - Sanitização e validação de URLs de mídia (imagens e vídeos)
 * - Ordenação canônica e atribuição de foto de capa (primary/cover)
 * - Limites de upload por tipo de entidade/origem (classificado, produto, pacote)
 * - Reordenação de galerias com preservação de posições relativas
 *
 * Regra B.2: src/lib/ é utilitário puro.
 * Regra R25: Dono único das operações sobre galerias de imagens.
 */

export interface GalleryMediaItem {
  id: string;
  url: string;
  altText?: string;
  isCover: boolean;
  order: number;
  width?: number;
  height?: number;
}

export interface GalleryLimitsConfig {
  maxImages: number;
  maxFileSizeMb: number;
  allowedMimeTypes: string[];
}

export const GALLERY_LIMITS_BY_ORIGIN: Record<string, GalleryLimitsConfig> = {
  classified: {
    maxImages: 10,
    maxFileSizeMb: 5,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  workspace_product: {
    maxImages: 15,
    maxFileSizeMb: 10,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  tourism_package: {
    maxImages: 25,
    maxFileSizeMb: 12,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
  },
  default: {
    maxImages: 8,
    maxFileSizeMb: 5,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
};

/**
 * Utilitário canônico de gerenciamento de galeria
 */
export const GALLERY_MANAGER = {
  /**
   * Retorna os limites operacionais de galeria para a origem especificada
   */
  getLimits(origin = 'default'): GalleryLimitsConfig {
    return GALLERY_LIMITS_BY_ORIGIN[origin] || GALLERY_LIMITS_BY_ORIGIN.default;
  },

  /**
   * Sanitiza e normaliza uma lista de strings de URLs ou itens parciais
   */
  normalizeMediaList(
    rawUrls: (string | Partial<GalleryMediaItem>)[]
  ): GalleryMediaItem[] {
    if (Boolean(Array.isArray(rawUrls)) === false) return [];

    const validItems: GalleryMediaItem[] = [];

    rawUrls.forEach((entry, index) => {
      const url = typeof entry === 'string' ? entry : entry.url;
      if (typeof url === 'string' && url.trim().length > 5) {
        const cleanUrl = url.trim();
        validItems.push({
          id: typeof entry !== 'string' && entry.id ? entry.id : `img-${index}-${Date.now()}`,
          url: cleanUrl,
          altText: typeof entry !== 'string' ? entry.altText : undefined,
          isCover: index === 0, // A primeira é a capa por padrão
          order: index + 1,
          width: typeof entry !== 'string' ? entry.width : undefined,
          height: typeof entry !== 'string' ? entry.height : undefined,
        });
      }
    });

    return validItems;
  },

  /**
   * Define uma imagem específica como capa principal da galeria
   */
  setCoverImage(
    items: GalleryMediaItem[],
    targetMediaId: string
  ): GalleryMediaItem[] {
    return items.map((item) => ({
      ...item,
      isCover: item.id === targetMediaId,
    }));
  },

  /**
   * Move um item da galeria para nova posição e recalcula ordens
   */
  reorderMedia(
    items: GalleryMediaItem[],
    fromIndex: number,
    toIndex: number
  ): GalleryMediaItem[] {
    if (
      fromIndex < 0 ||
      fromIndex >= items.length ||
      toIndex < 0 ||
      toIndex >= items.length ||
      fromIndex === toIndex
    ) {
      return items;
    }

    const reordered = [...items];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    return reordered.map((item, idx) => ({
      ...item,
      order: idx + 1,
      // Se a primeira posição mudou, a nova primeira se torna capa por padrão caso nenhuma esteja marcada
      isCover: idx === 0,
    }));
  },

  /**
   * Extrai a URL da imagem de capa principal
   */
  resolveCoverUrl(items: GalleryMediaItem[]): string | null {
    if (items.length === 0) return null;
    const cover = items.find((i) => i.isCover);
    return cover ? cover.url : items[0].url;
  },

  /**
   * Valida se a quantidade de imagens respeita os limites da origem
   */
  validateLimits(
    count: number,
    origin = 'default'
  ): { isValid: boolean; maxAllowed: number; message?: string } {
    const limits = this.getLimits(origin);
    const isValid = count <= limits.maxImages;

    return {
      isValid,
      maxAllowed: limits.maxImages,
      message: isValid
        ? undefined
        : `Limite de ${limits.maxImages} imagens excedido para este tipo de publicação.`,
    };
  },
};
