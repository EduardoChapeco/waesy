export interface TravelHighlightCircle {
 id: string;
 label: string;
 imageUrl: string;
}

export interface TravelItineraryDay {
 id: string;
 day: number;
 date?: string;
 period?: string;
 title: string;
 description: string;
 imageUrl?: string;
 highlights?: string[];
}

export interface TravelNearbyRecommendation {
 id: string;
 title: string;
 category: string;
 distance: string;
 rating?: number;
 imageUrl?: string;
}

export interface TravelWeatherDay {
 day: string;
 icon: "sunny" | "partly_cloudy" | "rainy" | "cloudy";
 temp: string;
}

export interface PaymentConditions {
 installments_max?: number;
 installments_fee_free?: number;
 accepts_pix?: boolean;
 pix_discount_percent?: number;
 accepts_credit_card?: boolean;
 accepts_bank_transfer?: boolean;
 accepts_financing?: boolean;
 deposit_percent?: number;
 deposit_deadline_days?: number;
 balance_deadline_days?: number;
}

export interface FlightDetails {
 // Modalidade Aérea
 departure_airport?: string;
 destination_airport?: string;
 departure_iata?: string;
 arrival_iata?: string;
 airline_name?: string;
 flight_number_out?: string;
 departure_time_out?: string;
 arrival_time_out?: string;
 flight_number_return?: string;
 departure_time_return?: string;
 arrival_time_return?: string;
 transfer_pickup_time?: string;
 transfer_dropoff_time?: string;
 transfer_return_time?: string;

 // Modalidade Terrestre (Ônibus / Van / Transfer Rodoviário)
 bus_company?: string;
 bus_category?: string;
 bus_departure_terminal?: string;
 bus_arrival_terminal?: string;
 bus_departure_time_out?: string;
 bus_arrival_time_out?: string;
 bus_departure_time_return?: string;
 bus_arrival_time_return?: string;
 bus_seat_number?: string;

 // Modalidade Cruzeiro (Marítimo / Fluvial)
 cruise_line?: string;
 ship_name?: string;
 cabin_category?: string;
 embarkation_port?: string;
 disembarkation_port?: string;
 boarding_checkin_time?: string;
 ship_departure_time?: string;
 ship_arrival_time?: string;
 port_taxes_included?: boolean;

 // Modalidade Mista / Multimodal
 mixed_transport_summary?: string;

 // Legacy compat
 origin_airport?: string;
 destination_iata?: string;
 flight_type?: "Direto" | "Com Conexão" | "Fretamento Exclusivo";
 baggage_included?: boolean;
 transfer_included?: boolean;
 flight_duration?: string;
 airline_partner?: string;
}

export interface TravelDestinationDetails {
 name: string;
 region?: string;
 country?: string;
 description?: string;
 iata_gateway?: string;
 flight_summary?: string;
 flight_duration?: string;
 flight_price_estimate?: string;
 weather_forecast?: TravelWeatherDay[];
 gallery_urls?: string[];
 location_name?: string;
 location_region?: string;
 map_coordinates?: { latitude: number; longitude: number };
}

export interface TravelResortDetails {
 name: string;
 handle?: string;
 location?: string;
 verified?: boolean;
 cover_image_url?: string;
 duration_text?: string;
 meal_plan?: string;
 guests_text?: string;
 bio_bullets?: string[];
 badges?: string[];
 highlights?: TravelHighlightCircle[];
 photos?: string[];
}

export interface TravelPricingInstallments {
 max_installments: number;
 installment_cents: number;
 total_cents: number;
 pax_note?: string;
}

export type TransportType = "aereo" | "terrestre" | "cruzeiro" | "misto";

export interface TravelPackageData {
 destination: TravelDestinationDetails;
 resort: TravelResortDetails;
 inclusions: string[];
 exclusions?: string[];
 itinerary_days: TravelItineraryDay[];
 recommendations?: TravelNearbyRecommendation[];
 flight_details?: FlightDetails;
 installments?: TravelPricingInstallments;
 payment_conditions?: PaymentConditions;
 /** Tipo modal do transporte: aereo (padrão), terrestre (ônibus/van), cruzeiro (marítimo) ou misto. */
 transport_type?: TransportType;
}

export const DEFAULT_TRAVEL_INCLUSIONS_PRESETS = [
 { id: "flight", label: "Voo Ida e Volta", emoji: "\u2708\uFE0F" },
 { id: "hotel", label: "Hospedagem Selecionada", emoji: "\uD83C\uDFE8" },
 { id: "all_inclusive", label: "Regime All Inclusive", emoji: "\uD83C\uDF79" },
 { id: "full_board", label: "Pens\u00E3o Completa (3 Refei\u00E7\u00F5es)", emoji: "\uD83C\uDF7D\uFE0F" },
 { id: "breakfast", label: "Caf\u00E9 da Manh\u00E3 no Hotel", emoji: "\u2615" },
 { id: "transfer", label: "Transfer Aeroporto / Hotel (In/Out)", emoji: "\uD83D\uDE90" },
 { id: "city_tour", label: "City Tour Hist\u00F3rico", emoji: "\uD83D\uDDFA\uFE0F" },
 { id: "insurance", label: "Seguro Viagem Completo", emoji: "\uD83D\uDEE1\uFE0F" },
 { id: "tickets", label: "Ingressos de Passeios Inclusos", emoji: "\uD83C\uDF9F\uFE0F" },
 { id: "guide", label: "Guia Especializado Local", emoji: "\uD83D\uDC68\u200D\u2708\uFE0F" },
 { id: "beach_access", label: "Acesso P\u00E9 na Areia Privativo", emoji: "\uD83C\uDFD6\uFE0F" },
 { id: "baggage", label: "Bagagem Despachada 23kg", emoji: "\uD83E\uDDF3" },
];

export const DEFAULT_TRAVEL_EXCLUSIONS_PRESETS = [
 { id: "extras", label: "Despesas Pessoais e Frigobar", emoji: "\uD83D\uDCB3" },
 { id: "meals_out", label: "Refei\u00E7\u00F5es N\u00E3o Mencionadas", emoji: "\uD83C\uDF7D\uFE0F" },
 { id: "drinks_out", label: "Bebidas Alco\u00F3licas Premium Fora do Regime", emoji: "\uD83C\uDF77" },
 { id: "tours_opt", label: "Passeios Opcionais / Ecoturismo", emoji: "\u26F5" },
 { id: "local_tax", label: "Taxas Tur\u00EDsticas Municipais Locais", emoji: "\uD83C\uDFDB\uFE0F" },
 { id: "tips", label: "Gorjetas para Carregadores e Guias", emoji: "\uD83D\uDCB5" },
 { id: "early_checkin", label: "Check-in Antecipado ou Late Check-out", emoji: "\u23F0" },
];

export const CANONICAL_AIRLINES = [
 "LATAM Airlines",
 "Gol Linhas A\u00E9reas",
 "Azul Linhas A\u00E9reas",
 "TAP Air Portugal",
 "Air France",
 "American Airlines",
 "Copa Airlines",
 "Fretamento Exclusivo",
 "A Confirmar com a Ag\u00EAncia",
];

export const CANONICAL_CRUISE_LINES = [
 "MSC Cruzeiros",
 "Costa Cruzeiros",
 "Royal Caribbean International",
 "Norwegian Cruise Line",
 "Celebrity Cruises",
 "Princess Cruises",
 "Disney Cruise Line",
 "Fretamento Fluvial Especial",
 "Outra Companhia Marítima",
];

export const CANONICAL_BUS_CATEGORIES = [
 "Leito Cama (Prime / 180°)",
 "Leito Total",
 "Semi-Leito Especial",
 "Executivo Conforto",
 "Van Executiva VIP",
 "Ônibus Convencional",
];

export const CANONICAL_CABIN_CATEGORIES = [
 "Cabine Interna (Standard)",
 "Cabine Externa com Vista para o Mar",
 "Cabine com Varanda Privativa",
 "Suíte Áurea / Luxo",
 "MSC Yacht Club / Área VIP Exclusiva",
];
