import type { SupabaseClient } from "@supabase/supabase-js";

export type InternalSearchKind = "product" | "store" | "event" | "classified" | "travel";

export interface InternalSearchCard {
  id: string;
  kind: InternalSearchKind;
  title: string;
  subtitle?: string;
  description?: string;
  image_url?: string | null;
  price_cents?: number | null;
  location?: string | null;
  source_table: string;
  source_id: string;
  slug?: string | null;
  action?: {
    id: string;
    label: string;
    action_type: "navigate" | "add_to_cart" | "rsvp_event";
    payload: Record<string, unknown>;
  };
}

export interface InternalSearchResult {
  query: string;
  cards: InternalSearchCard[];
  searchedKinds: InternalSearchKind[];
  searchedTables: string[];
  unavailableTables: string[];
  source: "platform";
}

const SEARCH_TERMS = /\b(onde|onde fica|onde tem|procuro|buscar|busco|encontre|encontrar|quero|tem|produto|produtos|loja|lojas|evento|eventos|show|shows|classificado|classificados|comprar|cardápio|restaurante|mercado|serviço|servicos|perto|disponível|disponivel|viagem|viagens|turismo|roteiro|roteiros|pacote|pacotes|hotel|hotéis|pousada|destino|destinos|oktoberfest)\b/i;
const STORE_TERMS = /\b(loja|lojas|empresa|restaurante|mercado|cafeteria|academia|oficina|serviço|servicos|perto|onde fica|onde tem)\b/i;
const EVENT_TERMS = /\b(evento|eventos|show|shows|feira|festival|agenda|hoje|amanhã|amanha|fim de semana|oktoberfest)\b/i;
const CLASSIFIED_TERMS = /\b(classificado|classificados|usado|usados|vendo|vendo-se|alugo|aluguel|imóvel|imovel|carro|moto|emprego|vaga|vagas)\b/i;
const PRODUCT_TERMS = /\b(produto|produtos|comprar|compro|cardápio|cardapio|pizza|lanche|preço|preco|valor|oferta|ofertas)\b/i;
const TRAVEL_TERMS = /\b(viagem|viagens|turismo|passeio|passeios|roteiro|roteiros|pacote|pacotes|hotel|hotéis|hoteis|pousada|pousadas|destino|destinos|resort|resorts|praia|serra|oktoberfest|blumenau|gramado|voo|aéreo)\b/i;

function safeSearchTerm(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/[%,()\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function extractQuery(prompt: string): string {
  return safeSearchTerm(
    prompt
      .replace(/(onde\s+fica|onde\s+tem|tem\s+alguma|procuro|gostaria\s+de|perto\s+de\s+mim|na\s+minha\s+cidade|por favor)/gi, "")
      .replace(/\b(em|no|na|nos|nas)\s+[a-zà-ÿ\s-]{2,40}$/i, "")
  );
}

function uniqueKinds(prompt: string): InternalSearchKind[] {
  const kinds = new Set<InternalSearchKind>();
  if (PRODUCT_TERMS.test(prompt)) kinds.add("product");
  if (STORE_TERMS.test(prompt)) kinds.add("store");
  if (EVENT_TERMS.test(prompt)) kinds.add("event");
  if (CLASSIFIED_TERMS.test(prompt)) kinds.add("classified");
  if (TRAVEL_TERMS.test(prompt)) kinds.add("travel");
  if (kinds.size === 0) {
    kinds.add("product");
    kinds.add("store");
    kinds.add("event");
    kinds.add("classified");
    kinds.add("travel");
  }
  return [...kinds];
}

function firstImage(row: Record<string, any>): string | null {
  const images = row.images ?? row.image_urls ?? row.gallery;
  if (Array.isArray(images)) return typeof images[0] === "string" ? images[0] : images[0]?.url ?? null;
  return row.image_url ?? row.cover_image ?? row.banner_url ?? row.avatar_url ?? null;
}

function firstText(row: Record<string, any>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function productCard(row: Record<string, any>): InternalSearchCard | null {
  if (!row.id || !row.title) return null;
  return {
    id: `product:${row.id}`,
    kind: "product",
    title: row.title,
    subtitle: firstText(row, ["category", "selling_unit"]),
    description: firstText(row, ["description"]),
    image_url: firstImage(row),
    price_cents: typeof row.price_cents === "number" ? row.price_cents : null,
    source_table: "products",
    source_id: row.id,
    slug: row.slug ?? null,
    action: {
      id: `open-product:${row.id}`,
      label: "Ver produto",
      action_type: "navigate",
      payload: { href: row.slug ? `/produto/${encodeURIComponent(row.slug)}` : `/produto/${row.id}`, product_id: row.id, store_id: row.store_id ?? null },
    },
  };
}

function storeCard(row: Record<string, any>): InternalSearchCard | null {
  const title = firstText(row, ["business_name", "name", "store_name", "title"]);
  if (!row.id || !title) return null;
  return {
    id: `store:${row.id}`,
    kind: "store",
    title,
    subtitle: firstText(row, ["category", "segment", "business_type"]),
    description: firstText(row, ["description", "short_description"]),
    image_url: firstImage(row),
    location: firstText(row, ["address", "formatted_address", "city"]),
    source_table: row.business_name ? "directory_listings" : "stores",
    source_id: row.id,
    slug: row.slug ?? null,
    action: {
      id: `open-store:${row.id}`,
      label: "Ver loja",
      action_type: "navigate",
      payload: { href: row.slug ? `/loja/${encodeURIComponent(row.slug)}` : `/loja/${row.id}`, store_id: row.store_id ?? row.id },
    },
  };
}

function eventCard(row: Record<string, any>): InternalSearchCard | null {
  const title = firstText(row, ["title", "name", "event_name"]);
  if (!row.id || !title) return null;
  return {
    id: `event:${row.id}`,
    kind: "event",
    title,
    subtitle: firstText(row, ["category", "event_type"]),
    description: firstText(row, ["description", "summary"]),
    image_url: firstImage(row),
    location: firstText(row, ["venue", "location", "address", "city"]),
    source_table: "events",
    source_id: row.id,
    slug: row.slug ?? null,
    action: {
      id: `open-event:${row.id}`,
      label: "Ver evento",
      action_type: "navigate",
      payload: { href: row.slug ? `/eventos/${encodeURIComponent(row.slug)}` : `/eventos/${row.id}`, event_id: row.id },
    },
  };
}

function classifiedCard(row: Record<string, any>): InternalSearchCard | null {
  const title = firstText(row, ["title", "name"]);
  if (!row.id || !title) return null;
  return {
    id: `classified:${row.id}`,
    kind: "classified",
    title,
    subtitle: firstText(row, ["category", "subcategory"]),
    description: firstText(row, ["description"]),
    image_url: firstImage(row),
    price_cents: typeof row.price_cents === "number" ? row.price_cents : null,
    location: firstText(row, ["address", "city", "neighborhood"]),
    source_table: "classifieds",
    source_id: row.id,
    slug: row.slug ?? null,
    action: {
      id: `open-classified:${row.id}`,
      label: "Ver anúncio",
      action_type: "navigate",
      payload: { href: row.slug ? `/classificados/${encodeURIComponent(row.slug)}` : `/classificados/${row.id}`, classified_id: row.id },
    },
  };
}

function travelCard(row: Record<string, any>): InternalSearchCard | null {
  const title = firstText(row, ["title", "name", "destination_name", "package_name"]);
  if (!row.id || !title) return null;
  return {
    id: `travel:${row.id}`,
    kind: "travel",
    title,
    subtitle: firstText(row, ["state", "country", "category", "region"]),
    description: firstText(row, ["description", "short_description", "summary"]),
    image_url: firstImage(row),
    price_cents: typeof row.price_cents === "number" ? row.price_cents : (typeof row.base_price_cents === "number" ? row.base_price_cents : null),
    location: firstText(row, ["city", "destination", "location", "address"]),
    source_table: row.destination_name || row.state ? "destinations" : "tourism_trips",
    source_id: row.id,
    slug: row.slug ?? null,
    action: {
      id: `open-travel:${row.id}`,
      label: "Ver viagem",
      action_type: "navigate",
      payload: { href: row.slug ? `/viagens/${encodeURIComponent(row.slug)}` : `/viagens/${row.id}`, travel_id: row.id },
    },
  };
}

const PORTUGUESE_STOP_WORDS = new Set([
  "a", "o", "as", "os", "um", "uma", "uns", "umas",
  "de", "da", "do", "das", "dos", "em", "na", "no", "nas", "nos",
  "por", "para", "com", "sem", "sob", "sobre", "entre", "ate", "até",
  "que", "se", "ou", "e", "mas", "como", "mais", "menos", "muito",
  "qual", "quais", "quem", "onde", "quando", "quanto", "quantos",
  "quero", "queria", "gostaria", "preciso", "favor", "por favor",
  "tem", "temos", "têm", "ter", "está", "estou", "estão",
  "viagem", "viagens", "viajar", "passeio", "passeios", "turismo",
  "produto", "produtos", "servico", "servicos", "serviço", "serviços",
  "coisa", "coisas", "algo", "ver", "olhar", "buscar", "procurar", "achar"
]);

function extractDiscriminatorTokens(query: string): string[] {
  return query
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[\s,.;:!?/\\-]+/)
    .map((t) => t.trim())
    .filter((token) => token.length >= 3 && !PORTUGUESE_STOP_WORDS.has(token));
}

async function searchTable(
  db: SupabaseClient,
  table: string,
  query: string,
  kind: InternalSearchKind,
): Promise<{ cards: InternalSearchCard[]; unavailable: boolean }> {
  let request = db.from(table).select("*").limit(24);
  if (table === "products") request = request.eq("is_active", true);

  const { data, error } = await request;
  if (error) {
    console.warn(`[copilot-internal-search] tabela indisponível: ${table}`, error.message);
    return { cards: [], unavailable: true };
  }

  const discriminatorTokens = extractDiscriminatorTokens(query);

  const scoredRows = (data ?? []).map((row: Record<string, any>) => {
    if (table === "classifieds" || table === "events" || table === "directory_listings") {
      const status = String(row.status ?? row.visibility ?? "").toLowerCase();
      if (status && !["active", "published", "approved", "live", "public"].includes(status)) return null;
    }

    // Se não há tokens discriminatórios na busca do usuário, exibe registros padrão
    if (discriminatorTokens.length === 0) {
      return { row, score: 1 };
    }

    const titleHaystack = [row.title, row.name, row.business_name, row.store_name, row.destination_name, row.package_name]
      .filter(Boolean).join(" ").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const locationHaystack = [row.address, row.city, row.state, row.venue, row.destination]
      .filter(Boolean).join(" ").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const bodyHaystack = [row.category, row.description, row.summary, row.short_description]
      .filter(Boolean).join(" ").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    let score = 0;
    for (const token of discriminatorTokens) {
      if (titleHaystack.includes(token)) score += 10;
      else if (locationHaystack.includes(token)) score += 6;
      else if (bodyHaystack.includes(token)) score += 2;
    }

    if (score === 0) return null;
    return { row, score };
  }).filter((item): item is { row: Record<string, any>; score: number } => Boolean(item));

  // Ordena por maior relevância discriminatória
  scoredRows.sort((a, b) => b.score - a.score);

  const mapper = kind === "product" ? productCard : kind === "store" ? storeCard : kind === "event" ? eventCard : kind === "travel" ? travelCard : classifiedCard;
  return {
    cards: scoredRows.map(({ row }) => mapper(row)).filter((item): item is InternalSearchCard => Boolean(item)).slice(0, 6),
    unavailable: false,
  };
}

export function shouldSearchPlatform(prompt: string): boolean {
  return SEARCH_TERMS.test(prompt) || prompt.trim().split(/\s+/).length >= 3;
}

export async function searchPlatformForCopilot(db: SupabaseClient, prompt: string): Promise<InternalSearchResult> {
  const query = extractQuery(prompt);
  const kinds = uniqueKinds(prompt);
  const tableByKind: Record<InternalSearchKind, string[]> = {
    product: ["products"],
    store: ["directory_listings", "stores"],
    event: ["events"],
    classified: ["classifieds"],
    travel: ["destinations", "tourism_trips"],
  };
  const searches = await Promise.all(kinds.flatMap((kind) => tableByKind[kind].map(async (table) => ({ kind, table, result: await searchTable(db, table, query, kind) }))));
  const cards = searches.flatMap(({ result }) => result.cards);
  const deduped = [...new Map(cards.map((card) => [card.id, card])).values()].slice(0, 12);

  return {
    query,
    cards: deduped,
    searchedKinds: kinds,
    searchedTables: [...new Set(searches.map(({ table }) => table))],
    unavailableTables: searches.filter(({ result }) => result.unavailable).map(({ table }) => table),
    source: "platform",
  };
}
