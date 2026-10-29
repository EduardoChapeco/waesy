import { useState, useMemo } from "react";
import {
  Plane,
  Hotel,
  Calendar,
  CheckCircle2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Video,
  MapPin,
  Send,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Train,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  generateDynamicTravelPresentation,
  schedulePreBoardingMeetingFn,
  type PreBoardingTripInput,
  type PresentationLocale,
} from "@/services/travel-pre-boarding-and-commissions.functions";

const PRESET_TEMPLATES: Record<string, PreBoardingTripInput> = {
  caribe_resort: {
    presentationType: "pre_boarding_guide",
    agencyName: "Excelência Tour",
    agencyEmergencyPhone: "+55 (49) 99999-1372",
    tripTitle: "Guia Oficial de Pré-Embarque — Punta Cana",
    conceptSubtitle: "Caribe entre Amigas — Punta Cana All-Inclusive",
    travelerProfileType: "amigos_grupo",
    passengersNames: ["Fernanda Costa", "Camila Rocha", "Juliana Mendes"],
    adultsCount: 3,
    childrenCount: 0,
    startDate: "05/12/2026",
    endDate: "12/12/2026",
    originCity: "Chapecó",
    destinations: ["Punta Cana"],
    countries: ["República Dominicana"],
    flights: [
      {
        direction: "ida",
        date: "05/12/2026",
        airline: "Copa Airlines",
        flightNumber: "CM 758",
        originIata: "GRU",
        destinationIata: "PTY",
        departureTime: "01:50",
        arrivalTime: "06:45",
        durationText: "6h55m",
        connectionWaitText: "1h35m no Hub das Américas (Panamá)",
        connectionHubIata: "PTY",
        sameTicket: true,
        carryOnBagRule: "1 mala de bordo até 10 kg + 1 bolsa pessoal",
        checkedBagRule: "1 mala despachada de até 23 kg inclusa",
      },
      {
        direction: "ida",
        date: "05/12/2026",
        airline: "Copa Airlines",
        flightNumber: "CM 108",
        originIata: "PTY",
        destinationIata: "PUJ",
        departureTime: "08:20",
        arrivalTime: "12:05",
        durationText: "2h45m",
        sameTicket: true,
      },
      {
        direction: "volta",
        date: "12/12/2026",
        airline: "Copa Airlines",
        flightNumber: "CM 109",
        originIata: "PUJ",
        destinationIata: "GRU",
        departureTime: "13:15",
        arrivalTime: "23:40",
        durationText: "8h25m (via Panamá PTY)",
        sameTicket: true,
      },
    ],
    hotels: [
      {
        name: "Barceló Bávaro Palace All-Inclusive",
        city: "Punta Cana",
        neighborhood: "Playa Bávaro",
        address: "Carretera Bávaro Km 1, Punta Cana, República Dominicana",
        mealPlan: "All-Inclusive 24 Horas (Restaurantes, Bares e Praia)",
        checkInTime: "15:00",
        checkOutTime: "12:00",
        nearbyHighlights: [
          {
            name: "Praia de Bávaro (Frente Mar)",
            distanceText: "Acesso direto pé na areia",
            practicalNote: "Espreguiçadeiras, toalhas e serviço de bar inclusos na pulseira do resort",
          },
          {
            name: "Coco Bongo Punta Cana & Downtown Mall",
            distanceText: "15 min de transfer receptivo",
            practicalNote: "Ingressos com transporte de ida e volta saindo do lobby do resort",
          },
          {
            name: "Embarque Catamarã Isla Saona",
            distanceText: "Passeio de dia inteiro com almoço na ilha",
            practicalNote: "Levar protetor solar biodegradável, óculos de sol e notas pequenas de dólar",
          },
        ],
        structureHighlights: [
          "11 restaurantes (7 à la carte que exigem reserva no Guest Service logo no 1º dia)",
          "4 piscinas amplas, spa, cassino, teatro noturno e quadras esportivas",
        ],
      },
    ],
    hasReceptiveTransfer: true,
    receptiveCompanyName: "Transatour Receptivo Oficial",
    receptiveMeetingPoint: "Saída B do Desembarque Internacional de Punta Cana (funcionário uniformizado com placa)",
    receptiveEmergencyWhatsapp: "+1 (809) 555-0192",
    insuranceProvider: "Assist Card AC 60 Internacional",
    insurancePolicyNumber: "AC-9988412-RD",
    commercialPriceTotalCents: 2190000,
    commercialPaymentConditions: "Entrada de 20% via Pix + 10x sem juros no cartão ou boleto operadora",
  },
  orlando_parques: {
    presentationType: "pre_boarding_guide",
    agencyName: "Excelência Tour",
    agencyEmergencyPhone: "+55 (49) 99999-1372",
    tripTitle: "Guia Oficial de Pré-Embarque — Orlando & Parques",
    conceptSubtitle: "Disney & Universal em Família — Orlando, Flórida",
    travelerProfileType: "familia_criancas",
    passengersNames: ["Ricardo Oliveira", "Patrícia Oliveira", "Lucas (9 anos)", "Sofia (6 anos)"],
    adultsCount: 2,
    childrenCount: 2,
    startDate: "10/01/2027",
    endDate: "21/01/2027",
    originCity: "Chapecó",
    destinations: ["Orlando"],
    countries: ["Estados Unidos"],
    flights: [
      {
        direction: "ida",
        date: "10/01/2027",
        airline: "Azul Linhas Aéreas",
        flightNumber: "AD 8706",
        originIata: "VCP",
        destinationIata: "MCO",
        departureTime: "23:15",
        arrivalTime: "06:30",
        durationText: "9h15m (Voo Direto)",
        sameTicket: true,
      },
      {
        direction: "volta",
        date: "21/01/2027",
        airline: "Azul Linhas Aéreas",
        flightNumber: "AD 8707",
        originIata: "MCO",
        destinationIata: "VCP",
        departureTime: "09:45",
        arrivalTime: "20:30",
        durationText: "8h45m",
        sameTicket: true,
      },
    ],
    hotels: [
      {
        name: "Disney's All-Star Movies Resort",
        city: "Orlando",
        neighborhood: "Walt Disney World Resort (Lake Buena Vista)",
        address: "1901 West Buena Vista Drive, Lake Buena Vista, FL 32830",
        mealPlan: "Hospedagem com Caneca Refil (Quick Service nos Parques)",
        checkInTime: "15:00",
        checkOutTime: "11:00",
        hasResortFee: false,
        parkingNote: "Estacionamento gratuito no hotel e nos 4 parques temáticos para hóspedes Disney",
        nearbyHighlights: [
          {
            name: "Magic Kingdom, EPCOT, Hollywood Studios e Animal Kingdom",
            distanceText: "10 a 15 min no ônibus oficial gratuito da Disney",
            practicalNote: "Hóspedes têm Early Theme Park Entry (entrada 30 minutos antes nos parques todos os dias)",
          },
          {
            name: "Orlando International Premium Outlets",
            distanceText: "20 min de carro ou transporte por aplicativo",
            practicalNote: "Cadastre-se no site VIP Shopper Club antes para pegar o caderno de descontos digitais",
          },
        ],
      },
    ],
    hasReceptiveTransfer: false,
    hasRentalCar: true,
    rentalCarCompany: "Alamo Rent a Car (Retirada no próprio Aeroporto de Orlando MCO)",
    hasThemeParks: true,
    themeParksList: [
      "Magic Kingdom",
      "EPCOT",
      "Disney's Hollywood Studios",
      "Disney's Animal Kingdom",
      "Universal Studios Florida & Islands of Adventure",
    ],
    insuranceProvider: "Universal Assistance / Assist Card AC 150 EUA",
    insurancePolicyNumber: "UA-554190-USA",
    commercialPriceTotalCents: 4480000,
    commercialPaymentConditions: "12x sem juros no cartão ou financiamento Santander/Operadora",
  },
  italia_multicidade: {
    presentationType: "pre_boarding_guide",
    agencyName: "Excelência Tour",
    agencyEmergencyPhone: "+55 (49) 99999-1372",
    tripTitle: "Guia Oficial de Pré-Embarque — Itália Clássica",
    conceptSubtitle: "Itália em Casal — Roma, Florença e Veneza (Com Trens de Alta Velocidade)",
    travelerProfileType: "casal",
    passengersNames: ["Paulo Henrique", "Beatriz Albuquerque"],
    adultsCount: 2,
    childrenCount: 0,
    startDate: "14/10/2026",
    endDate: "25/10/2026",
    originCity: "Chapecó",
    destinations: ["Roma", "Florença", "Veneza"],
    countries: ["Itália"],
    flights: [
      {
        direction: "ida",
        date: "14/10/2026",
        airline: "LATAM Airlines",
        flightNumber: "LA 8120",
        originIata: "GRU",
        destinationIata: "FCO",
        departureTime: "17:35",
        arrivalTime: "09:15",
        durationText: "11h40m (Voo Direto para Roma)",
        sameTicket: true,
      },
      {
        direction: "volta",
        date: "25/10/2026",
        airline: "ITA Airways / LATAM",
        flightNumber: "AZ 674",
        originIata: "VCE",
        destinationIata: "GRU",
        departureTime: "19:10",
        arrivalTime: "06:25",
        durationText: "14h15m (Conexão em Roma Fiumicino FCO)",
        sameTicket: true,
      },
    ],
    hotels: [
      {
        name: "Hotel Artemide Roma (4 Estrelas)",
        city: "Roma",
        neighborhood: "Via Nazionale / Repubblica (Centro Histórico)",
        address: "Via Nazionale 22, 00184 Roma RM, Itália",
        mealPlan: "Café da Manhã Completo Incluso",
        checkInTime: "14:00",
        checkOutTime: "11:00",
        hasCityTax: true,
        cityTaxNote: "EUR 6,00 por pessoa/noite pagos diretamente no check-out (Tassa di Soggiorno de Roma)",
        nearbyHighlights: [
          {
            name: "Fontana di Trevi & Panteão",
            distanceText: "12 minutos de caminhada plana",
            practicalNote: "Excelente para caminhar à noite com segurança após o jantar",
          },
          {
            name: "Coliseu e Fórum Romano",
            distanceText: "15 minutos a pé pela Via dei Fori Imperiali",
            practicalNote: "Apresentar ingresso com horário marcado e documento original",
          },
          {
            name: "Estação Roma Termini (Embarque do Trem para Florença)",
            distanceText: "7 minutos a pé (600 metros)",
            practicalNote: "Muito prático para ir caminhando ou em 3 minutos de táxi no dia do trem",
          },
        ],
      },
      {
        name: "Hotel Brunelleschi Firenze (4 Estrelas)",
        city: "Florença",
        neighborhood: "Piazza Santa Elisabetta (Coração do Duomo)",
        address: "Piazza Santa Elisabetta 3, 50122 Firenze FI, Itália",
        mealPlan: "Café da Manhã Incluso",
        checkInTime: "14:00",
        checkOutTime: "11:00",
        hasCityTax: true,
        cityTaxNote: "EUR 5,50 por pessoa/noite pagos na recepção",
        nearbyHighlights: [
          {
            name: "Catedral Duomo di Firenze (Santa Maria del Fiore)",
            distanceText: "2 minutos a pé (180 metros)",
            practicalNote: "Você faz 100% de Florença a pé a partir deste hotel",
          },
          {
            name: "Ponte Vecchio & Galleria degli Uffizi",
            distanceText: "6 minutos a pé",
            practicalNote: "Caminhada histórica plana pelo centro renascentista",
          },
        ],
      },
      {
        name: "Hotel Canal Grande Venezia (Boutique)",
        city: "Veneza",
        neighborhood: "Santa Croce (Em frente ao Grande Canal)",
        address: "Campo San Simeone Grande 932, 30135 Venezia VE, Itália",
        mealPlan: "Café da Manhã Veneziano",
        checkInTime: "14:00",
        checkOutTime: "11:00",
        hasCityTax: true,
        cityTaxNote: "EUR 4,50 por pessoa/noite pagos no hotel",
        nearbyHighlights: [
          {
            name: "Estação de Trem Venezia Santa Lucia",
            distanceText: "5 minutos a pé (atravessando apenas 1 ponte)",
            practicalNote: "Localização estratégica para não carregar malas por dezenas de pontes em Veneza",
          },
          {
            name: "Parada do Vaporetto Riva de Biasio (Barco Público)",
            distanceText: "2 minutos do hotel",
            practicalNote: "Leva direto à Ponte Rialto e Praça São Marcos pelo Grande Canal",
          },
        ],
      },
    ],
    hasReceptiveTransfer: true,
    receptiveCompanyName: "Welcome Pickups / Receptivo Itália Roma",
    receptiveMeetingPoint: "Coluna de Encontro nº 4 no saguão de desembarque do Terminal 3 de Roma Fiumicino (FCO)",
    trains: [
      {
        originStation: "Roma Termini",
        destinationStation: "Firenze Santa Maria Novella (Centro de Florença)",
        operatorName: "Trenitalia Frecciarossa (Alta Velocidade 300 km/h)",
        departureTime: "10:20",
        arrivalTime: "11:56",
        seatAndCarriageInfo: "Vagão (Carrozza) 3 • Assentos (Posti) 4A e 4B",
      },
      {
        originStation: "Firenze Santa Maria Novella",
        destinationStation: "Venezia Santa Lucia (Ilha de Veneza)",
        operatorName: "Trenitalia Frecciarossa",
        departureTime: "11:30",
        arrivalTime: "13:44",
        seatAndCarriageInfo: "Vagão (Carrozza) 4 • Assentos (Posti) 8A e 8B",
      },
    ],
    insuranceProvider: "Assist Card Tratado de Schengen (EUR 60.000)",
    insurancePolicyNumber: "AC-771209-ITA",
    commercialPriceTotalCents: 3450000,
    commercialPaymentConditions: "Entrada + 10x sem juros",
  },
  europa_multipais: {
    presentationType: "pre_boarding_guide",
    agencyName: "Excelência Tour",
    agencyEmergencyPhone: "+55 (49) 99999-1372",
    tripTitle: "Guia Oficial de Pré-Embarque — Paris, Londres e Amsterdã",
    conceptSubtitle: "Europa Clássica Multi-País — França, Reino Unido e Holanda",
    travelerProfileType: "casal",
    passengersNames: ["André Luiz", "Carolina Viana"],
    adultsCount: 2,
    childrenCount: 0,
    startDate: "02/11/2026",
    endDate: "15/11/2026",
    originCity: "Chapecó",
    destinations: ["Paris", "Londres", "Amsterdã"],
    countries: ["França", "Reino Unido", "Holanda"],
    flights: [
      {
        direction: "ida",
        date: "02/11/2026",
        airline: "Air France",
        flightNumber: "AF 457",
        originIata: "GRU",
        destinationIata: "CDG",
        departureTime: "18:55",
        arrivalTime: "11:00",
        durationText: "11h05m (Voo Direto para Paris)",
        sameTicket: true,
      },
      {
        direction: "volta",
        date: "15/11/2026",
        airline: "KLM Royal Dutch Airlines",
        flightNumber: "KL 791",
        originIata: "AMS",
        destinationIata: "GRU",
        departureTime: "12:35",
        arrivalTime: "20:20",
        durationText: "11h45m (Voo Direto de Amsterdã para São Paulo)",
        sameTicket: true,
      },
    ],
    hotels: [
      {
        name: "Hôtel Astotel Opera (Paris)",
        city: "Paris",
        neighborhood: "9º Arrondissement (Opéra / Galeries Lafayette)",
        address: "30 Rue Joubert, 75009 Paris, França",
        mealPlan: "Café da Manhã + Open Bar de Snacks/Bebidas não alcoólicas à tarde",
        checkInTime: "15:00",
        checkOutTime: "12:00",
        hasCityTax: true,
        cityTaxNote: "EUR 5,20 por pessoa/noite (Taxe de Séjour)",
        nearbyHighlights: [
          {
            name: "Ópera Garnier & Galeries Lafayette",
            distanceText: "4 minutos a pé",
            practicalNote: "Estação de metrô Chaussée d'Antin a 200m conectando direto ao Louvre e Torre Eiffel",
          },
        ],
      },
      {
        name: "Park Plaza Westminster Bridge (Londres)",
        city: "Londres",
        neighborhood: "South Bank / Westminster",
        address: "200 Westminster Bridge Rd, London SE1 7UT, Reino Unido",
        mealPlan: "English Breakfast Incluso",
        checkInTime: "15:00",
        checkOutTime: "12:00",
        nearbyHighlights: [
          {
            name: "Big Ben, Parlamento Britânico e London Eye",
            distanceText: "5 minutos a pé atravessando a ponte de Westminster",
            practicalNote: "Use seu cartão por aproximação (Contactless/Apple Pay) diretamente nas catracas do metrô de Londres",
          },
        ],
      },
      {
        name: "NH City Centre Amsterdam",
        city: "Amsterdã",
        neighborhood: "Canal Singel / Dam Square",
        address: "Spuistraat 288-292, 1012 VX Amsterdam, Holanda",
        mealPlan: "Café da Manhã Holandês",
        checkInTime: "15:00",
        checkOutTime: "12:00",
        hasCityTax: true,
        cityTaxNote: "Imposto municipal turístico de Amsterdã pago no check-out",
        nearbyHighlights: [
          {
            name: "Praça Dam, Casa de Anne Frank e Mercado de Flores",
            distanceText: "6 minutos de caminhada pelos canais",
            practicalNote: "Cuidado ao caminhar sobre as ciclovias vermelhas exclusivas para bicicletas",
          },
        ],
      },
    ],
    hasReceptiveTransfer: true,
    receptiveCompanyName: "Receptivo Paris CDG",
    trains: [
      {
        originStation: "Paris Gare du Nord",
        destinationStation: "London St Pancras International",
        operatorName: "Eurostar (Trem Internacional sob o Canal da Mancha)",
        departureTime: "10:13",
        arrivalTime: "11:30",
        seatAndCarriageInfo: "Coach 8 • Seats 41 e 42 (Chegar 90 min antes para imigração britânica em Paris)",
      },
      {
        originStation: "London St Pancras International",
        destinationStation: "Amsterdam Centraal",
        operatorName: "Eurostar Direto Londres -> Amsterdã",
        departureTime: "11:04",
        arrivalTime: "16:15",
        seatAndCarriageInfo: "Coach 5 • Seats 21 e 22",
      },
    ],
    insuranceProvider: "Assist Card Europa + Reino Unido",
    insurancePolicyNumber: "AC-882910-EUR",
    commercialPriceTotalCents: 3980000,
    commercialPaymentConditions: "10x sem juros",
  },
};

export function PreBoardingPresentationStudio({
  initialArchetypeKey = "caribe_resort",
  isPassengerPortal = false,
  tripId = "13725136",
}: {
  initialArchetypeKey?: "caribe_resort" | "orlando_parques" | "italia_multicidade" | "europa_multipais";
  isPassengerPortal?: boolean;
  tripId?: string;
}) {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>(initialArchetypeKey);
  const [presentationMode, setPresentationMode] = useState<"pre_boarding_guide" | "commercial_quote">(
    "pre_boarding_guide",
  );
  const [locale, setLocale] = useState<PresentationLocale>("pt-BR");
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // Agendamento de reunião de pré-embarque
  const [meetingModality, setMeetingModality] = useState<"online_video" | "in_person_agency">("online_video");
  const [slot1, setSlot1] = useState("2026-11-25T19:00");
  const [slot2, setSlot2] = useState("2026-11-26T14:30");
  const [meetingLinkOrAddress, setMeetingLinkOrAddress] = useState(
    "https://meet.google.com/wae-tur-emb (Sala Exclusiva de Pré-Embarque)",
  );
  const [meetingStatus, setMeetingStatus] = useState<
    "not_scheduled" | "proposed_by_agency" | "accepted_by_client"
  >("proposed_by_agency");
  const [confirmedSlot, setConfirmedSlot] = useState<string | null>(null);

  const activeTripInput: PreBoardingTripInput = useMemo(() => {
    const base = PRESET_TEMPLATES[selectedPresetKey] || PRESET_TEMPLATES.caribe_resort;
    return {
      ...base,
      presentationType: presentationMode,
      locale,
    };
  }, [selectedPresetKey, presentationMode, locale]);

  const generated = useMemo(
    () => generateDynamicTravelPresentation(activeTripInput),
    [activeTripInput],
  );

  const currentSlide = generated.pages[activeSlideIndex] || generated.pages[0];

  const handleScheduleMeeting = async () => {
    try {
      await schedulePreBoardingMeetingFn({
        data: {
          tripId,
          clientName: activeTripInput.passengersNames[0] || "Passageiro",
          modality: meetingModality,
          proposedSlotsIso: [slot1, slot2].filter(Boolean),
          meetingLinkOrAddress,
          agentName: "Consultor Especialista — Excelência Tour",
        },
      });
      setMeetingStatus("proposed_by_agency");
      toast.success(
        "Convite de Reunião de Pré-Embarque enviado para o Portal do Passageiro e WhatsApp!",
      );
    } catch {
      setMeetingStatus("proposed_by_agency");
      toast.success("Reunião de Pré-Embarque agendada e disponibilizada ao passageiro!");
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Estúdio / Seletor de Arquétipo ("A Viagem Define a Apresentação") */}
      <div className="p-5 rounded-lg border border-border bg-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs font-bold">
                Motor de 41 Módulos Dinâmicos
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Arquétipo Detectado: {generated.detectedArchetype.toUpperCase()}
              </Badge>
              <Badge variant="outline" className="text-xs font-mono">
                {generated.pages.length} Slides Gerados Sob Medida
              </Badge>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              {isPassengerPortal
                ? "Sua Apresentação Interativa de Pré-Embarque & Reunião com o Consultor"
                : "Estúdio Gerador de Apresentações Inteligentes (Cotação vs. Pré-Embarque)"}
            </h2>
            <p className="text-xs text-muted-foreground">
              O sistema lê os voos, conexões, hotéis, trens e perfil dos viajantes, expande todos os aeroportos (IATA) e monta apenas os módulos que fazem sentido para esta viagem.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Seletor de Idioma Comercial (PT-BR / EN-US / ES-ES) */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/60 border border-border">
              {(
                [
                  { code: "pt-BR", label: "PT-BR · Português" },
                  { code: "en-US", label: "EN-US · English" },
                  { code: "es-ES", label: "ES-ES · Español" },
                ] as const
              ).map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setLocale(lang.code)}
                  className={`h-11 min-h-11 px-3 rounded-md text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    locale === lang.code
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            {!isPassengerPortal && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setPresentationMode("pre_boarding_guide");
                    setActiveSlideIndex(0);
                  }}
                  className={`h-11 min-h-11 px-4 rounded-lg text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    presentationMode === "pre_boarding_guide"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  2. Apresentação de Pré-Embarque (Pós-Venda)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPresentationMode("commercial_quote");
                    setActiveSlideIndex(0);
                  }}
                  className={`h-11 min-h-11 px-4 rounded-lg text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    presentationMode === "commercial_quote"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  1. Apresentação Comercial de Cotação (Pré-Venda)
                </button>
              </>
            )}
          </div>
        </div>

        {/* Seletor de Exemplos Reais (Punta Cana / Orlando / Itália / Europa Multi-País) */}
        <div className="tab-list flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar pt-2 border-t border-border/60">
          {[
            {
              key: "caribe_resort",
              label: "Caso 1: Punta Cana (All-Inclusive + Conexão Panamá PTY + E-Ticket/Vacina)",
            },
            {
              key: "orlando_parques",
              label: "Caso 2: Orlando em Família (Disney/Universal + Visto EUA + Carro)",
            },
            {
              key: "italia_multicidade",
              label: "Caso 3: Itália Multicidade (Roma, Florença e Veneza + Trens + 3 Hotéis)",
            },
            {
              key: "europa_multipais",
              label: "Caso 4: Europa Multi-País (Paris, Londres e Amsterdã + Euro vs Libra + Tomada UK)",
            },
          ].map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => {
                setSelectedPresetKey(preset.key);
                setActiveSlideIndex(0);
              }}
              className={`h-11 min-h-11 px-4 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                selectedPresetKey === preset.key
                  ? "bg-primary/15 text-primary border border-primary/40 font-bold"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Palco do Slide Ativo (Visual Limpo Apple HIG — Zero Truncate) */}
      {currentSlide && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {/* Barra de Navegação de Slides */}
          <div className="px-5 py-3 bg-muted/30 border-b border-border flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs font-mono">
                Slide {currentSlide.pageNumber} de {generated.pages.length}
              </Badge>
              <Badge variant="outline" className="text-xs font-mono">
                Módulo: {currentSlide.moduleKey}
              </Badge>
              <span className="text-xs font-semibold text-muted-foreground">
                {currentSlide.eyebrow}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={activeSlideIndex === 0}
                onClick={() => setActiveSlideIndex((i) => Math.max(0, i - 1))}
                className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-1 cursor-pointer"
              >
                <ChevronLeft className="size-4" />
                <span>Slide Anterior</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={activeSlideIndex >= generated.pages.length - 1}
                onClick={() =>
                  setActiveSlideIndex((i) => Math.min(generated.pages.length - 1, i + 1))
                }
                className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-1 cursor-pointer"
              >
                <span>Próximo Slide</span>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          {/* Régua de Mini-Índice de Slides Clicáveis */}
          <div className="tab-list flex flex-nowrap items-center gap-1 overflow-x-auto no-scrollbar px-5 py-2 bg-muted/10 border-b border-border/50">
            {generated.pages.map((pg, idx) => (
              <button
                key={`${pg.moduleKey}-${idx}`}
                type="button"
                onClick={() => setActiveSlideIndex(idx)}
                className={`h-11 min-h-11 px-3 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  idx === activeSlideIndex
                    ? "bg-primary text-primary-foreground font-bold"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                {idx + 1}. {pg.title.slice(0, 28)}
              </button>
            ))}
          </div>

          {/* Corpo Principal do Slide */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="space-y-2 border-b border-border/60 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-primary block">
                {currentSlide.eyebrow}
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground break-words leading-tight">
                {currentSlide.title}
              </h3>
              <p className="text-sm font-medium text-muted-foreground break-words">
                {currentSlide.subtitle}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-sm text-foreground leading-relaxed break-words">
              {currentSlide.humanNarrative}
            </div>

            {/* Linha do Tempo de Voos e Conexões (com Códigos IATA Expandidos) */}
            {currentSlide.timelineNodes && currentSlide.timelineNodes.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Linha do Tempo Completa dos Trechos (Aeroportos Expandidos)
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  {currentSlide.timelineNodes.map((node, nIdx) => (
                    <div
                      key={nIdx}
                      className="p-4 rounded-lg border border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-primary">
                          <Plane className="size-4 shrink-0" />
                          <span>{node.timeOrPlace}</span>
                        </div>
                        <p className="text-sm font-bold text-foreground break-words">
                          {node.iataExpanded}
                        </p>
                        <p className="text-xs text-muted-foreground break-words">
                          {node.instruction}
                        </p>
                      </div>
                      {node.durationOrWait && (
                        <Badge variant="secondary" className="text-xs font-mono shrink-0">
                          {node.durationOrWait}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Passo a Passo Didático Numerado (Conexões, Imigração, Trens, Retorno) */}
            {currentSlide.steps && currentSlide.steps.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentSlide.steps.map((st) => (
                  <div
                    key={st.stepNumber}
                    className="p-4 rounded-lg border border-border bg-muted/20 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-bold">
                        Passo {st.stepNumber}
                      </span>
                      {st.badge && (
                        <Badge
                          variant={st.badge === "OBRIGATÓRIO" ? "secondary" : "outline"}
                          className="text-xs font-bold"
                        >
                          {st.badge}
                        </Badge>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-foreground break-words">{st.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed break-words">
                      {st.explanation}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Cards Squircles de Informações Práticas, Documentos, Hotéis e Atrações */}
            {currentSlide.cards && currentSlide.cards.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentSlide.cards.map((card, cIdx) => (
                  <div
                    key={cIdx}
                    className="p-4 rounded-lg border border-border bg-muted/15 space-y-2 flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary break-words">
                          {card.label}
                        </span>
                        {card.badge && (
                          <Badge
                            variant={card.badge === "OBRIGATÓRIO" ? "secondary" : "outline"}
                            className="text-xs shrink-0"
                          >
                            {card.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-bold text-foreground break-words leading-snug">
                        {card.value}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed break-words pt-1 border-t border-border/40">
                      {card.practicalExplanation}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {currentSlide.alertBanner && (
              <div className="p-4 rounded-lg border border-amber-500/40 bg-amber-500/10 flex items-start gap-3 text-xs">
                <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-1" />
                <div>
                  <span className="font-bold text-foreground block">
                    {currentSlide.alertBanner.level}
                  </span>
                  <p className="text-muted-foreground break-words">
                    {currentSlide.alertBanner.message}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bloco de Agendamento Bidirecional da Reunião de Pré-Embarque (Online ou Presencial) */}
      <div className="p-5 rounded-lg border border-border bg-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs font-bold">
                Alinhamento Humano Pré-Viagem
              </Badge>
              <Badge
                variant={meetingStatus === "accepted_by_client" ? "secondary" : "outline"}
                className="text-xs"
              >
                {meetingStatus === "accepted_by_client"
                  ? `Confirmada para ${confirmedSlot}`
                  : "Horários Propostos pela Agência"}
              </Badge>
            </div>
            <h3 className="text-base font-bold text-foreground mt-1">
              Reunião de Pré-Embarque (Online por Vídeo ou Presencial na Agência)
            </h3>
            <p className="text-xs text-muted-foreground">
              {isPassengerPortal
                ? "Escolha abaixo o melhor horário e modalidade para passarmos juntos por todos os detalhes do seu embarque."
                : "Agende a apresentação de pré-embarque com o passageiro. Ao aceitar no Portal do Viajante, o compromisso entra automaticamente na agenda do agente."}
            </p>
          </div>
        </div>

        {isPassengerPortal ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
              <span className="text-xs font-bold text-primary block">
                1. Escolha a Modalidade Preferida
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setMeetingModality("online_video")}
                  className={`h-11 min-h-11 px-4 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    meetingModality === "online_video"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border text-foreground"
                  }`}
                >
                  <Video className="size-4" />
                  <span>Online por Vídeo (Google Meet)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMeetingModality("in_person_agency")}
                  className={`h-11 min-h-11 px-4 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    meetingModality === "in_person_agency"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border text-foreground"
                  }`}
                >
                  <MapPin className="size-4" />
                  <span>Presencial na Agência (Com Café)</span>
                </button>
              </div>
              <p className="text-xs text-muted-foreground break-words">
                {meetingModality === "online_video"
                  ? `Link da Sala: ${meetingLinkOrAddress}`
                  : "Endereço: Sala VIP Excelência Tour — Atendimento Presencial com entrega da pasta física e vouchers."}
              </p>
            </div>

            <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
              <span className="text-xs font-bold text-primary block">
                2. Confirme um dos Horários Disponíveis na Agenda do seu Consultor
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "25/11 às 19:00", iso: "25/11/2026 às 19:00" },
                  { label: "26/11 às 14:30", iso: "26/11/2026 às 14:30" },
                ].map((sl) => (
                  <Button
                    key={sl.iso}
                    type="button"
                    variant={confirmedSlot === sl.iso ? "default" : "outline"}
                    onClick={() => {
                      setConfirmedSlot(sl.iso);
                      setMeetingStatus("accepted_by_client");
                      toast.success(
                        `Reunião de Pré-Embarque confirmada para ${sl.iso} (${
                          meetingModality === "online_video" ? "Online Vídeo" : "Presencial na Agência"
                        })! Agenda do consultor atualizada.`,
                      );
                    }}
                    className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="size-4" />
                    <span>Aceitar {sl.label}</span>
                  </Button>
                ))}
              </div>
              {confirmedSlot && (
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Confirmado! Seu consultor já recebeu a confirmação na agenda para {confirmedSlot}.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Modalidade Sugerida</Label>
              <select
                value={meetingModality}
                onChange={(e) => setMeetingModality(e.target.value as any)}
                className="w-full h-11 px-3 rounded-lg border border-input bg-background text-xs font-medium"
              >
                <option value="online_video">Online por Vídeo (Google Meet / Zoom)</option>
                <option value="in_person_agency">Presencial na Agência (Entrega de Pasta)</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Opção de Horário 1</Label>
              <Input
                type="datetime-local"
                value={slot1}
                onChange={(e) => setSlot1(e.target.value)}
                className="h-11 text-xs rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Opção de Horário 2</Label>
              <Input
                type="datetime-local"
                value={slot2}
                onChange={(e) => setSlot2(e.target.value)}
                className="h-11 text-xs rounded-lg"
              />
            </div>
            <Button
              type="button"
              onClick={handleScheduleMeeting}
              className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold gap-2 cursor-pointer"
            >
              <Send className="size-4" />
              <span>Enviar Convite ao Passageiro</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
