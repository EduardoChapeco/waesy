import type { RawVariant } from "@/types/catalog";

export interface ChannelStatusInfo {
  id: "google_merchant" | "meta_instagram" | "mercadolivre" | "ifood";
  name: string;
  desc: string;
  isConnected: boolean;
  configUrl: string;
}

export interface StoreChannelsStatusMap {
  google_merchant: ChannelStatusInfo;
  meta_instagram: ChannelStatusInfo;
  mercadolivre: ChannelStatusInfo;
  ifood: ChannelStatusInfo;
}

export interface MatrixPricingStockResult {
  hasVariants: boolean;
  minPriceCents: number;
  maxPriceCents: number;
  hasPriceRange: boolean;
  totalStock: number;
}

/**
 * Calcula o menor preço, maior preço e a soma do estoque a partir de uma matriz de variações.
 */
export function calculateMatrixPricingAndStock(
  basePriceCents: number,
  baseStock: number,
  variants?: RawVariant[] | null,
): MatrixPricingStockResult {
  if (!variants || variants.length === 0) {
    return {
      hasVariants: false,
      minPriceCents: Math.max(0, basePriceCents || 0),
      maxPriceCents: Math.max(0, basePriceCents || 0),
      hasPriceRange: false,
      totalStock: Math.max(0, baseStock || 0),
    };
  }

  let totalStock = 0;
  const effectivePrices: number[] = [];

  for (const v of variants) {
    totalStock += Math.max(0, Number(v.stock) || 0);

    const price =
      v.price_override_cents != null && Number(v.price_override_cents) > 0
        ? Number(v.price_override_cents)
        : Math.max(0, basePriceCents || 0);

    effectivePrices.push(price);
  }

  const validPrices = effectivePrices.filter((p) => p > 0);
  const minPriceCents =
    validPrices.length > 0 ? Math.min(...validPrices) : Math.max(0, basePriceCents || 0);
  const maxPriceCents =
    validPrices.length > 0 ? Math.max(...validPrices) : Math.max(0, basePriceCents || 0);

  return {
    hasVariants: true,
    minPriceCents,
    maxPriceCents,
    hasPriceRange: minPriceCents !== maxPriceCents,
    totalStock,
  };
}

/**
 * Normaliza os status dos canais com base nas credenciais e conectores da loja.
 */
export function resolveStoreChannelsStatus(
  credentials: Array<{ provider: string; is_active?: boolean }> = [],
  connectors: Array<{ platform: string; status?: string }> = [],
): StoreChannelsStatusMap {
  const isGoogleConnected = credentials.some(
    (c) =>
      (c.provider === "google_merchant_center" || c.provider === "google_merchant") &&
      c.is_active === true,
  );

  const isMetaConnected = credentials.some(
    (c) =>
      (c.provider === "meta_pixel" ||
        c.provider === "facebook_catalog" ||
        c.provider === "meta_instagram") &&
      c.is_active === true,
  );

  const isMeliConnected = connectors.some(
    (m) => m.platform === "mercadolivre" && m.status === "connected",
  );

  const isIfoodConnected = connectors.some(
    (m) => (m.platform === "ifood" || m.platform === "ifood_merchant") && m.status === "connected",
  );

  return {
    google_merchant: {
      id: "google_merchant",
      name: "Google Shopping (Merchant Center)",
      desc: "Exporta produtos para o catálogo do Google Shopping e Free Listings.",
      isConnected: isGoogleConnected,
      configUrl: "/workspace/configuracoes/integracoes",
    },
    meta_instagram: {
      id: "meta_instagram",
      name: "Instagram & Facebook Shopping",
      desc: "Sincroniza o catálogo para marcação de sacolinha em posts e stories.",
      isConnected: isMetaConnected,
      configUrl: "/workspace/configuracoes/integracoes",
    },
    mercadolivre: {
      id: "mercadolivre",
      name: "Mercado Livre",
      desc: "Sincronização bidirecional de anúncios, pedidos e saldo de estoque.",
      isConnected: isMeliConnected,
      configUrl: "/workspace/configuracoes/integracoes",
    },
    ifood: {
      id: "ifood",
      name: "Aplicativos de Delivery",
      desc: "Integração direta com iFood e aplicativos parceiros de entrega rápida.",
      isConnected: isIfoodConnected,
      configUrl: "/workspace/configuracoes/integracoes",
    },
  };
}

export interface VariantImageItem {
  url: string;
  label: string;
  sku?: string;
  attributes: Record<string, string>;
  isAlreadyInGallery: boolean;
}

export interface ExtractedVariantImagesResult {
  hasVariantImages: boolean;
  totalImages: number;
  newImagesCount: number;
  items: VariantImageItem[];
  allUrls: string[];
}

/**
 * Extrai todas as imagens únicas das variações, mapeando seus rótulos e se já constam na galeria principal.
 */
export function extractVariantImages(
  variants?: RawVariant[] | null,
  currentGalleryUrls: string[] = [],
): ExtractedVariantImagesResult {
  if (!variants || variants.length === 0) {
    return {
      hasVariantImages: false,
      totalImages: 0,
      newImagesCount: 0,
      items: [],
      allUrls: [],
    };
  }

  const gallerySet = new Set(currentGalleryUrls.map((u) => u.trim()));
  const seenUrls = new Set<string>();
  const items: VariantImageItem[] = [];

  for (const v of variants) {
    const rawUrl = v.image_url?.trim();
    if (!rawUrl || seenUrls.has(rawUrl)) continue;

    seenUrls.add(rawUrl);

    // Constrói rótulo descritivo amigável a partir dos atributos (ex: "Preto • 38" ou "Cor: Preto")
    const attrEntries = Object.entries(v.attributes || {}).filter(([_, val]) => Boolean(val));
    const label =
      attrEntries.length > 0
        ? attrEntries
            .map(([k, val]) => (attrEntries.length === 1 ? String(val) : `${k}: ${val}`))
            .join(" • ")
        : v.sku || "Variação";

    items.push({
      url: rawUrl,
      label,
      sku: v.sku,
      attributes: (v.attributes || {}) as Record<string, string>,
      isAlreadyInGallery: gallerySet.has(rawUrl),
    });
  }

  const allUrls = items.map((i) => i.url);
  const newImagesCount = items.filter((i) => !i.isAlreadyInGallery).length;

  return {
    hasVariantImages: items.length > 0,
    totalImages: items.length,
    newImagesCount,
    items,
    allUrls,
  };
}
