/**
 * quote-corpus-fixtures.ts — Corpus de Regressão Baseado nos Orçamentos Reais
 * Extraído diretamente de C:\Users\Excelência Tour SMO\Downloads\orçamento (28 PNGs + Orcamento.pdf)
 * e dos cenários de bugs reportados (Fortaleza e Jericoacoara).
 */

export const CORPUS_FORTALEZA_COMBINED_CITY_TOUR = {
  operator_name: "FRT",
  origin: "Chapeco (XAP)",
  destination: "Fortaleza",
  travel_start: "2027-02-15",
  travel_end: "2027-02-21",
  adults_count: 2,
  children_count: 1,
  hotels: [
    {
      hotel_name: "Crocobeach Hotel",
      city: "Fortaleza",
      address: "Av. Clovis Arrais Maia Praia do Futuro, Fortaleza BR",
      room_category: "Quarto 1 - Luxo Piscina",
      meal_plan: "Café da Manhã",
      checkin_date: "2027-02-15",
      checkout_date: "2027-02-21",
      price_cents: 468338,
    },
  ],
  flights: [
    {
      airline_name: "Latam",
      origin_iata: "XAP",
      origin_city: "Chapeco",
      destination_iata: "FOR",
      destination_city: "Fortaleza",
      departure_date: "2027-02-15",
      departure_time: "13:05",
      arrival_time: "20:45",
      stops_count: 1,
    },
    {
      airline_name: "Latam",
      origin_iata: "FOR",
      origin_city: "Fortaleza",
      destination_iata: "XAP",
      destination_city: "Chapeco",
      departure_date: "2027-02-21",
      departure_time: "05:00",
      arrival_time: "17:00",
      stops_count: 2,
    },
  ],
  transfers: [
    {
      route_name:
        "BLACK FRIDAY FRT: Transporte Aeroporto de Fortaleza (FOR) / Hotel em Fortaleza / Aeroporto Fortaleza + Passeio City Tour Fortaleza",
      date: "2027-02-15",
      price_cents: 24306,
      is_private: false,
    },
  ],
  tours: [
    {
      title: "Passeio a Praia do Beach Park",
      date: "2027-02-16",
      price_cents: 20833,
      included: true,
    },
    {
      title: "Ingresso Combo-1 dia-Aqua Park - COMBO 2x Ingresso Adulto-1 dia-Aqua Park e 1x Ingresso Criança-1 dia-Aqua Park",
      date: "2027-02-16",
      price_cents: 89658,
      included: true,
    },
  ],
  gross_price_cents: 1041508,
  taxes_cents: 38619,
  products_subtotal_cents: 1002889,
};

export const CORPUS_PORTO_MULTI_TOURS = {
  operator_name: "FRT",
  origin: "Chapeco (XAP)",
  destination: "Porto de Galinhas",
  travel_start: "2027-02-18",
  travel_end: "2027-02-24",
  adults_count: 2,
  children_count: 0,
  hotels: [
    {
      hotel_name: "Pousada Jardins Tropical",
      city: "Porto de Galinhas",
      address: "Rua Tabajuba 4 Porto de Galinhas, Ipojuca BR",
      room_category: "Quarto 1 - Luxo Duplo",
      meal_plan: "Café da Manhã",
      checkin_date: "2027-02-18",
      checkout_date: "2027-02-24",
      price_cents: 173542,
    },
  ],
  flights: [
    {
      airline_name: "Azul",
      origin_iata: "XAP",
      origin_city: "Chapeco",
      destination_iata: "REC",
      destination_city: "Recife",
      departure_date: "2027-02-18",
      departure_time: "10:35",
      arrival_time: "21:10",
      stops_count: 1,
    },
    {
      airline_name: "Azul",
      origin_iata: "REC",
      origin_city: "Recife",
      destination_iata: "XAP",
      destination_city: "Chapeco",
      departure_date: "2027-02-24",
      departure_time: "10:00",
      arrival_time: "18:30",
      stops_count: 1,
    },
  ],
  transfers: [
    {
      route_name: "Transfer In+Out regular (Aeroporto Recife / Hotéis em Porto de Galinhas / Aeroporto Recife)",
      date: "2027-02-18",
      price_cents: 58056,
      is_private: false,
    },
  ],
  tours: [
    {
      title: "Passeio ao Cabo de Sto Agostinho (PGA)",
      date: "2027-02-19",
      price_cents: 26111,
      included: true,
    },
    {
      title: "Praia de São José da Coroa Grande (PGA)",
      date: "2027-02-20",
      price_cents: 34722,
      included: true,
    },
    {
      title: "Praia dos Carneiros (PGA)",
      date: "2027-02-22",
      price_cents: 35000,
      included: true,
    },
    {
      title: "Praia de Maragogi/AL (PGA)",
      date: "2027-02-23",
      price_cents: 35000,
      included: true,
    },
  ],
  gross_price_cents: 666151,
  taxes_cents: 25876,
};

export const CORPUS_JERI_4X4 = {
  operator_name: "FRT",
  destination: "Jericoacoara",
  origin: "Chapeco (XAP)",
  travel_start: "2027-05-04",
  travel_end: "2027-05-09",
  adults_count: 2,
  hotels: [
    {
      hotel_name: "Pousada Matusa",
      city: "Jericoacoara",
      checkin_date: "2027-05-04",
      checkout_date: "2027-05-09",
      meal_plan: "Café da Manhã",
      price_cents: 154688,
    },
  ],
  transfers: [
    {
      route_name: "TRANSFER IDA E VOLTA - AEROPORTO DE JERI/VILA DE JERI/AEROPORTO DE JERI - 4X4",
      date: "2027-05-04",
      price_cents: 50000,
    },
  ],
  gross_price_cents: 616960,
  taxes_cents: 23238,
};

export const CORPUS_ORC_PDF_SANTIAGO = {
  operator_name: "FRT",
  quote_reference_number: "642225",
  origin: "Chapeco (XAP)",
  destination: "Santiago (Chile)",
  travel_start: "2027-07-13",
  travel_end: "2027-07-19",
  adults_count: 2,
  children_count: 0,
  hotels: [
    {
      hotel_name: "Torremayor Lyon",
      city: "Santiago de Chile",
      address: "Ricardo Lyon 322 Providencia - Santiago Chile",
      room_category: "Twin standard",
      meal_plan: "ALOJAMENTO E CAFÉ DA MANHÃ",
      checkin_date: "2027-07-13",
      checkout_date: "2027-07-18",
      nights_count: 5,
      stars: 4,
    },
  ],
  flights: [
    {
      airline_name: "Latam",
      flight_number: "3279 / 3302 / 723",
      origin_iata: "XAP",
      destination_iata: "SCL",
      departure_date: "2027-07-13",
      departure_time: "10:45",
      arrival_time: "20:35",
      stops_count: 2,
      baggage_included: "1x Item Pessoal + 1x Mala de mão + 0x Mala despachada",
    },
    {
      airline_name: "Latam",
      flight_number: "714 / 3238",
      origin_iata: "SCL",
      destination_iata: "XAP",
      departure_date: "2027-07-18",
      departure_time: "15:55",
      arrival_time: "00:20",
      stops_count: 1,
      baggage_included: "1x Item Pessoal + 1x Mala de mão + 0x Mala despachada",
    },
  ],
  products_subtotal_cents: 964701,
  taxes_cents: 84432,
  gross_price_cents: 1049133,
  card_installments: 10,
};

export const CORPUS_FORTALEZA_JERI_MULTI_TRANSFER_AND_LEGACY_OPTIONS = {
  title: "Proposta Fortaleza e Jericoacoara",
  destination_city: "Fortaleza e Jericoacoara",
  hotels: [
    {
      hotel_name: "Hotel Diogo",
      checkin_date: "2027-03-16",
      checkout_date: "2027-03-22",
      images: [
        "https://cdn.waesy.com/diogo-1.jpg",
        "https://cdn.waesy.com/diogo-2.jpg",
        "https://cdn.waesy.com/diogo-3.jpg",
      ],
    },
    {
      hotel_name: "Pousada Angélica",
      checkin_date: "2027-03-16",
      checkout_date: "2027-03-22",
      images: ["https://cdn.waesy.com/angelica-1.jpg"],
    },
    {
      hotel_name: "Hotel Diogo",
      checkin_date: "2027-03-16",
      checkout_date: "2027-03-22",
      images: [],
    },
  ],
  transfers: [
    { id: "tr-1", type: "in_out", route_name: "Traslado Aeroporto Fortaleza / Hotel Diogo (Ida)", vehicle: "Transfer Regular", is_private: true },
    { id: "tr-2", type: "in_out", route_name: "Traslado Fortaleza / Jericoacoara (Ida e Volta)", vehicle: "4x4 Executivo", is_private: true },
    { id: "tr-3", type: "in_out", name: "Serviço Cadeirinha para Crianças — Trecho 1", vehicle: "Privativo", is_private: true, price_cents: 15000 },
    { id: "tr-4", type: "in_out", name: "Serviço Cadeirinha para Crianças — Trecho 2", vehicle: "Privativo", is_private: true, price_cents: 15000 },
  ],
  options: [
    {
      id: "opt-1",
      name: "Opção 1 — Hotel Diogo",
      hotel_name: "Hotel Diogo",
      is_recommended: true,
      hotels: [{ hotel_name: "Hotel Diogo" }],
      pricing: { currency: "BRL", base_price_cents: 620304, boarding_tax_cents: 0, other_taxes_cents: 0, discount_cents: 0, total_price_cents: 620304, installments_options: [] },
    },
    {
      id: "opt-2",
      name: "Opção 2 — Pousada Angélica",
      hotel_name: "Pousada Angélica",
      is_recommended: false,
      hotels: [{ hotel_name: "Pousada Angélica" }],
      pricing: { currency: "BRL", base_price_cents: 620304, boarding_tax_cents: 0, other_taxes_cents: 0, discount_cents: 0, total_price_cents: 620304, installments_options: [] },
    },
    {
      id: "opt-3",
      name: "Opção 3 — Hotel Diogo",
      hotel_name: "Hotel Diogo",
      is_recommended: false,
      hotels: [{ hotel_name: "Hotel Diogo" }],
      pricing: { currency: "BRL", base_price_cents: 620304, boarding_tax_cents: 0, other_taxes_cents: 0, discount_cents: 0, total_price_cents: 620304, installments_options: [] },
    },
  ],
};
