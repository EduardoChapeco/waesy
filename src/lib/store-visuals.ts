/**
 * store-visuals.ts — Resolvedor Defensivo Universal de Imagens e Logos de Lojas e Estabelecimentos
 *
 * Mapeia com prioridade estrita os diferentes esquemas do Supabase:
 * - directory_listings: avatar_url (logo), banner_url (capa)
 * - stores: settings.logoUrl / settings.logo_url / avatar_url
 * - unified_listings: cover_url / media_urls
 * - places: logo_url / cover_image
 */

export function resolveStoreLogo(storeOrPlace: any): string | null {
  if (!storeOrPlace) return null;

  const rawLogo =
    storeOrPlace.avatar_url ||
    storeOrPlace.logoUrl ||
    storeOrPlace.logo_url ||
    storeOrPlace.stores?.settings?.logoUrl ||
    storeOrPlace.stores?.settings?.logo_url ||
    storeOrPlace.stores?.avatar_url ||
    storeOrPlace.settings?.logoUrl ||
    storeOrPlace.settings?.logo_url ||
    storeOrPlace.image_url ||
    storeOrPlace.banner_url ||
    storeOrPlace.cover_image ||
    (Array.isArray(storeOrPlace.media_urls) ? storeOrPlace.media_urls[0] : null) ||
    null;

  if (typeof rawLogo === "string" && rawLogo.trim().length > 0) {
    return rawLogo.trim();
  }

  return null;
}

export function resolveStoreCover(storeOrPlace: any): string | null {
  if (!storeOrPlace) return null;

  // Prioridade para fotos de alta qualidade de pratos e capas reais
  const photoFromArray =
    Array.isArray(storeOrPlace.photos) && storeOrPlace.photos.length > 0
      ? storeOrPlace.photos.find((p: any) => typeof p === "string" && p.trim().length > 0)
      : null;

  const rawCover =
    storeOrPlace.banner_url ||
    storeOrPlace.coverUrl ||
    storeOrPlace.cover_url ||
    storeOrPlace.cover_image ||
    photoFromArray ||
    (Array.isArray(storeOrPlace.media_urls) ? storeOrPlace.media_urls[0] : null) ||
    storeOrPlace.avatar_url ||
    storeOrPlace.logoUrl ||
    storeOrPlace.logo_url ||
    storeOrPlace.image_url ||
    null;

  if (typeof rawCover === "string" && rawCover.trim().length > 0) {
    return rawCover.trim();
  }

  return null;
}
