import type { FilterChipOption } from "@/components/commerce/discovery-control-bar";
import type { HotpageDTO } from "@/services/hotpage.functions";
import { Tag } from "@phosphor-icons/react";

/**
 * resolveNicheDepartments — Conecta dinamicamente os botões/chips de subcategorias
 * de qualquer nicho (Gastronomia, Mercado, Farmácia, Moda, etc.) ao banco de dados Supabase.
 *
 * Qualquer alteração feita em /admin-master/botoes (upload de ícone PNG transparente,
 * mídia de fundo, badge, título ou reordenação) passa a ser refletida IMEDIATAMENTE
 * na vitrine pública do respectivo nicho.
 */
export function resolveNicheDepartments(
 defaultDepts: FilterChipOption[] = [],
 hotpages: HotpageDTO[] = [],
): FilterChipOption[] {
 if (!hotpages || hotpages.length === 0) {
 return defaultDepts;
 }

 const hasTodos = defaultDepts.find((d) => d.id === "todos");

 // Mapeia todas as hotpages cadastradas no admin para o módulo
 const dynamicList: FilterChipOption[] = hotpages.map((hp) => {
 const defaultMatch = defaultDepts.find(
 (d) => d.id === hp.slug || hp.slug.includes(d.id) || d.label.toLowerCase() === hp.title.toLowerCase(),
 );

 return {
 id: hp.slug,
 label: hp.title,
 icon: defaultMatch?.icon || Tag,
 icon_url: hp.custom_icon_url || hp.icon_url || defaultMatch?.icon_url || undefined,
 emoji: (hp as any).emoji || defaultMatch?.emoji || undefined,
 badge: hp.badge_label || defaultMatch?.badge || undefined,
 bg_media_type: hp.bg_media_type || "none",
 bg_media_url: hp.bg_media_url || undefined,
 bg_color: hp.bg_color || undefined,
 bg_overlay_opacity: hp.bg_overlay_opacity ?? 35,
 bg_texture: hp.bg_texture || "none",
 };
 });

 // Garante que o botão 'Tudo' permaneça no início caso exista nos defaults
 if (hasTodos && !dynamicList.some((d) => d.id === "todos")) {
 return [hasTodos, ...dynamicList];
 }

 return dynamicList;
}
