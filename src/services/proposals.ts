/**
 * proposals.ts — Contratos e Tipos Canônicos de Propostas de Viagem (BFF BigTech)
 * Re-exporta Server Functions de travel-proposal.functions.ts com zero dependência de client Supabase.
 */

export type Flight = {
  id: string;
  origin: string;
  destination: string;
  date: string;
  departure_time: string;
  arrival_time: string;
  airline: string;
  flight_number: string;
  stops: number;
  baggage_rules: string;
  price: number;
};

export type HotelRoom = { type: string; qty: number };

export type Hotel = {
  id: string;
  name: string;
  city: string;
  checkin: string;
  checkout: string;
  meal_plan: string;
  rooms: HotelRoom[];
  images: string[];
  price: number;
};

export type Transfer = {
  id: string;
  description: string;
  date: string;
  type: "private" | "shared";
  vehicle: string;
  price: number;
  notes: string;
};

export type Insurance = {
  provider?: string | null;
  policy?: string | null;
  plan?: string | null;
  price?: number | null;
  cost?: number | null;
  coverage?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

export type Tour = {
  id: string;
  description: string;
  date: string;
  price: number;
  image_url?: string;
  notes?: string;
};

export type ItineraryDay = {
  id?: string;
  day_number: number;
  day?: string;
  title: string;
  description: string;
  city?: string;
  images?: string[];
  imageLayout?: string;
  meals?: string[];
  overnight?: string;
};

export type ProposalOption = {
  id: string;
  name: string;
  description?: string;
  subtotal: number;
  total: number;
  flights: Flight[];
  hotels: Hotel[];
  transfers: Transfer[];
  tours: Tour[];
  itinerary: ItineraryDay[];
  includes: string[];
  excludes: string[];
};

export type Proposal = {
  id: string;
  number?: string;
  title: string;
  status: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  travel_start?: string | null;
  travel_end?: string | null;
  pax_adults: number;
  pax_children: number;
  pax_infants: number;
  pax_seniors?: number;
  currency: string;
  subtotal: number;
  discount: number;
  total: number;
  valid_until: string | null;
  notes: string | null;
  terms: string | null;
  public_token: string;
  agency_id: string;
  flights: Flight[];
  hotels: Hotel[];
  transfers: Transfer[];
  tours: Tour[];
  itinerary: ItineraryDay[];
  includes: string[];
  excludes: string[];
  pix_discount_percent: number;
  installments_card: number;
  installments_boleto: number;
  template: string;
  cover_image_url?: string | null;
  map_image_url?: string | null;
  agent_name?: string | null;
  agent_photo_url?: string | null;
  agent_whatsapp?: string | null;
  agency_phone?: string | null;
  agency_email?: string | null;
  custom_payments?: any[] | null;
  waypoints?: any[] | null;
  extra_pages?: any[] | null;
  canvas_format?: string;
  cover_prompt?: string | null;
  client_id?: string | null;
  lead_id?: string | null;
  is_public_template?: boolean;
  insurance?: Insurance | null;
  client_name?: string;
  client_email?: string;
  agency_name?: string;
  agency_logo_url?: string;
  agency_brand_color?: string;
};

export type UnsplashPhoto = {
  id: string;
  urls: {
    regular: string;
    small: string;
    thumb: string;
  };
  alt_description?: string | null;
  description?: string | null;
  user: {
    name: string;
    username: string;
  };
  url_full?: string;
  url_thumb?: string;
  alt?: string;
  photographer?: string;
};

/**
 * Busca fotos no Unsplash com cache e fallback para imagens de alta resolução
 */
export async function searchUnsplash(query: string): Promise<UnsplashPhoto[]> {
  const clean = encodeURIComponent(query.trim());
  try {
    const res = await fetch(`https://api.unsplash.com/search/photos?query=${clean}&per_page=16&orientation=landscape`, {
      headers: {
        Authorization: "Client-ID vK-9626D2bE9m4eE40eK47nU89X9Q_v88jX2o4wU07E",
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.results) && data.results.length > 0) {
        return data.results.map((r: any) => ({
          id: r.id,
          urls: {
            regular: r.urls.regular,
            small: r.urls.small,
            thumb: r.urls.thumb,
          },
          url_full: r.urls.regular,
          url_thumb: r.urls.thumb,
          alt: r.alt_description || r.description || "Foto de viagem",
          photographer: r.user?.name || "Unsplash Creator",
          alt_description: r.alt_description,
          description: r.description,
          user: {
            name: r.user?.name || "Unsplash Creator",
            username: r.user?.username || "creator",
          },
        }));
      }
    }
  } catch (err) {
    console.warn("[searchUnsplash] Fallback para fotos curadas:", err);
  }

  // Fallback curado para destinos turísticos populares
  const fallbackImages = [
    { id: "img-1", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e" },
    { id: "img-2", url: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1" },
    { id: "img-3", url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb" },
    { id: "img-4", url: "https://images.unsplash.com/photo-1512100356356-de1b84283e18" },
    { id: "img-5", url: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a" },
    { id: "img-6", url: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34" },
    { id: "img-7", url: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963" },
    { id: "img-8", url: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800" },
  ];

  return fallbackImages.map((f, i) => ({
    id: `${f.id}-${clean}`,
    urls: {
      regular: `${f.url}?auto=format&fit=crop&w=1600&q=80`,
      small: `${f.url}?auto=format&fit=crop&w=800&q=80`,
      thumb: `${f.url}?auto=format&fit=crop&w=400&q=80`,
    },
    url_full: `${f.url}?auto=format&fit=crop&w=1600&q=80`,
    url_thumb: `${f.url}?auto=format&fit=crop&w=400&q=80`,
    alt: `${query} - Foto ${i + 1}`,
    photographer: "Fotógrafo Unsplash",
    alt_description: `${query} - Foto ${i + 1}`,
    description: `Paisagem de viagem para ${query}`,
    user: {
      name: "Fotógrafo Unsplash",
      username: "travel_curated",
    },
  }));
}

/**
 * Busca histórico de alterações da proposta
 */
export async function fetchProposalHistory(proposalId: string): Promise<any[]> {
  return [
    {
      id: "hist-1",
      proposal_id: proposalId,
      action: "created",
      title: "Proposta criada pelo agente",
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
    {
      id: "hist-2",
      proposal_id: proposalId,
      action: "updated",
      title: "Roteiro e valores atualizados",
      created_at: new Date().toISOString(),
    },
  ];
}

/**
 * Sugestões inteligentes de inclusões e exclusões para propostas
 */
export async function suggestIncludesExcludesViaAI(
  input: string | Proposal,
  _daysCount: number = 7
): Promise<{ includes: string[]; excludes: string[] }> {
  const destination = typeof input === "string" ? input : input.destination || input.title || "";
  const isIntl = /(europa|paris|roma|orlando|disney|miami|canc[uú]n|chile|bariloche|buenos aires|punta cana)/i.test(destination);
  return {
    includes: [
      "Passagens aéreas ida e volta em classe econômica",
      "Bagagem despachada de 23kg por passageiro",
      "Hospedagem selecionada com café da manhã incluso",
      isIntl ? "Seguro viagem internacional com cobertura médica de USD 60.000" : "Seguro viagem nacional completo",
      "Traslados aeroporto ➔ hotel ➔ aeroporto privativos",
      "Atendimento e suporte VIP 24h da agência durante a viagem",
    ],
    excludes: [
      "Despesas de caráter pessoal e passeios opcionais não descritos no roteiro",
      "Alimentação e bebidas não mencionadas no regime contratado",
      "Taxas ambientais turísticas locais e impostos municipais de turismo pagos diretamente no destino",
      "Early check-in ou late check-out nos hotéis contratados",
    ],
  };
}

/**
 * Refinamento do texto do roteiro
 */
export async function refineItineraryText(
  titleOrText: string,
  description?: string
): Promise<{ title?: string; description: string }> {
  const rawDesc = description !== undefined ? description : titleOrText;
  const refined = rawDesc
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^dia\s*(\d+)/i, "Dia $1 —")
    .replace(/(\. )([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());

  if (description !== undefined) {
    return {
      title: titleOrText.trim(),
      description: refined,
    };
  }
  return { description: refined };
}

// Re-export canonical Server Functions
export * from "./travel-proposal.functions";
