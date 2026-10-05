import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sliders, Plane, Hotel, Calendar, Users, MapPin, DollarSign, CheckCircle2, Copy, Plus, Minus, Coffee, Utensils, ShieldCheck, Luggage, Bus, Ship, Car, Compass, Check } from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/money";
import { createAgencyTravelQuote } from "@/services/tourism.functions";
import { listHotelsBank } from "@/services/travel-catalog.functions";
import { cn } from "@/lib/utils";

import { CANONICAL_DESTINATIONS, MAJOR_IATA_AIRPORTS, type CanonicalDestination } from "@/lib/destinations-catalog";

export interface QuotationBuilderSheetProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 destinations?: any[];
 store?: any;
 onSuccess?: (newQuoteId?: string) => void;
 initialLeadName?: string;
 initialLeadPhone?: string;
 initialLeadEmail?: string;
}

const COMMON_ORIGINS = [
 { city: "Chapecó", iata: "XAP", uf: "SC", label: "Chapecó (XAP)" },
 { city: "Porto Alegre", iata: "POA", uf: "RS", label: "Porto Alegre (POA)" },
 { city: "Curitiba", iata: "CWB", uf: "PR", label: "Curitiba (CWB)" },
 { city: "Florianópolis", iata: "FLN", uf: "SC", label: "Florianópolis (FLN)" },
 { city: "São Paulo", iata: "GRU", uf: "SP", label: "São Paulo (GRU)" },
 { city: "Brasília", iata: "BSB", uf: "DF", label: "Brasília (BSB)" },
];

export function QuotationBuilderSheet({
 open,
 onOpenChange,
 destinations = [],
 store,
 onSuccess,
 initialLeadName,
 initialLeadPhone,
 initialLeadEmail,
}: QuotationBuilderSheetProps) {
 const queryClient = useQueryClient();

 // Tab State
 const [activeTab, setActiveTab] = useState<"viajantes" | "hospedagem" | "transporte" | "condicoes">("viajantes");

 // AI Parser State
 const [aiText, setAiText] = useState("");
 const [isAiParsing, setIsAiParsing] = useState(false);

 // Tab 1: Viajantes & Destino
 const [name, setName] = useState(initialLeadName || "");
 const [whatsapp, setWhatsapp] = useState(initialLeadPhone || "");
 const [email, setEmail] = useState(initialLeadEmail || "");

 useEffect(() => {
 if (initialLeadName && !name) setName(initialLeadName);
 if (initialLeadPhone && !whatsapp) setWhatsapp(initialLeadPhone);
 if (initialLeadEmail && !email) setEmail(initialLeadEmail);
 }, [initialLeadName, initialLeadPhone, initialLeadEmail]);
 const [originCity, setOriginCity] = useState("Chapecó");
 const [originIata, setOriginIata] = useState("XAP");
 const [destinationCity, setDestinationCity] = useState("");
 const [destinationIata, setDestinationIata] = useState("");
 const [selectedCanonicalDest, setSelectedCanonicalDest] = useState<CanonicalDestination | null>(null);
 const [destFilterQuery, setDestFilterQuery] = useState("");
 const [departureDate, setDepartureDate] = useState("");
 const [returnDate, setReturnDate] = useState("");

  // Tab 2: Hospedagem
  const [hotelName, setHotelName] = useState("");
  const [hotelSearchQuery, setHotelSearchQuery] = useState("");
  const [hotelSuggestions, setHotelSuggestions] = useState<any[]>([]);
  const [showHotelDropdown, setShowHotelDropdown] = useState(false);
  const [hotelCategory, setHotelCategory] = useState<"pousada" | "padrao" | "superior" | "resort">("superior");
  const [mealPlan, setMealPlan] = useState<"all_inclusive" | "meia_pensao" | "cafe" | "sem_refeicao">("cafe");
  const [roomType, setRoomType] = useState<"standard" | "vista_mar" | "suite" | "bangalo">("standard");
  // Room distribution: each room has { adults, children: [{age}] }
  const [roomDistribution, setRoomDistribution] = useState<Array<{ adults: number; children: number[] }>>([{ adults: 2, children: [] }]);
  const hotelSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleHotelSearch = useCallback(async (query: string) => {
    setHotelSearchQuery(query);
    setHotelName(query);
    if (!query.trim() || query.length < 2) {
      setHotelSuggestions([]);
      setShowHotelDropdown(false);
      return;
    }
    if (hotelSearchTimeout.current) clearTimeout(hotelSearchTimeout.current);
    hotelSearchTimeout.current = setTimeout(async () => {
      try {
        const results = await listHotelsBank({ data: { search: query } });
        setHotelSuggestions(results.slice(0, 8));
        setShowHotelDropdown(results.length > 0);
      } catch {
        setHotelSuggestions([]);
      }
    }, 280);
  }, []);

  const handleSelectHotel = (hotel: any) => {
    setHotelName(hotel.name);
    setHotelSearchQuery(hotel.name);
    setShowHotelDropdown(false);
    // Auto-fill category
    const stars = hotel.stars || 4;
    if (stars <= 3) setHotelCategory("pousada");
    else if (stars === 4) setHotelCategory("superior");
    else setHotelCategory("resort");
    // Auto-fill meal plan if hotel has a regime
    if (hotel.regime_options?.includes("All Inclusive")) setMealPlan("all_inclusive");
    else if (hotel.regime_options?.includes("Café da Manhã")) setMealPlan("cafe");
  };

  const totalRoomsAdults = roomDistribution.reduce((s, r) => s + r.adults, 0);
  const totalRoomsChildren = roomDistribution.reduce((s, r) => s + r.children.length, 0);

 // Tab 3: Transporte & Logística
 const [tripType, setTripType] = useState<"air_package" | "hotel_only" | "cruise" | "bus" | "visa_assistance">("air_package");
 const [preferredAirline, setPreferredAirline] = useState<"qualquer" | "azul" | "latam" | "gol">("qualquer");
 const [baggage, setBaggage] = useState<"mao" | "despachada">("mao");
 const [includeTransfer, setIncludeTransfer] = useState(true);
 const [includeInsurance, setIncludeInsurance] = useState(true);
 // excursions/activities as dynamic tags
 const [excursionTags, setExcursionTags] = useState<string[]>([]);
 const [excursionInput, setExcursionInput] = useState("");
 const addExcursion = (val: string) => {
 const t = val.trim();
 if (t && !excursionTags.includes(t)) setExcursionTags(prev => [...prev, t]);
 setExcursionInput("");
 };
 const removeExcursion = (val: string) => setExcursionTags(prev => prev.filter(t => t !== val));
 const presetExcursions = useMemo(() => {
 const dest = (destinationCity || "").toLowerCase();
 if (dest.includes("porto de galinhas")) return ["Jangada com Piscinas Naturais", "Passeio de Buggy", "Snorkeling", "Merepe", "Praia Maracaípe"];
 if (dest.includes("maragogi")) return ["Galés de Maragogi", "Passeio de Buggy", "Dunas de Marapé", "Japaratinga"];
 if (dest.includes("gramado")) return ["Mini Mundo", "Snowland (ingresso)", "Garibaldi", "Cascata do Caracol", "Beto Carrero"];
 if (dest.includes("foz do iguaçu") || dest.includes("foz do iguacu")) return ["Cataratas Brasileira", "Cataratas Argentina", "Parque das Aves", "Itaipu", "Rafain Show"];
 if (dest.includes("beach park")) return ["Beach Park (ingresso)", "Aquapark (day use)", "Cabana Premium", "Área VIP"];
 if (dest.includes("bonito")) return ["Gruta do Lago Azul", "Mergulho no Rio", "Boia Cross", "Nascente Azul"];
 if (dest.includes("noronha") || dest.includes("fernando")) return ["Mergulho Autônomo", "Passeio de Barco", "Baía dos Porcos", "Snorkeling"];
 return ["City Tour", "Passeio de Barco", "Mergulho / Snorkeling", "Ingresso Parque Aquático", "Transfer Aeroporto", "Guia Local Bilíngue", "Jantar Temático", "Trilha Ecológica"];
 }, [destinationCity]);

 // Tab 4: Condições Comerciais
 const [budgetTier, setBudgetTier] = useState<"economy" | "standard" | "premium" | "luxury">("standard");
 const [quoteAmountStr, setQuoteAmountStr] = useState("");
 const [specialNotes, setSpecialNotes] = useState("");
 const [agencyNotes, setAgencyNotes] = useState("");

 // Cálculo de noites de hospedagem
 const nightsCount = useMemo(() => {
 if (!departureDate || !returnDate) return null;
 const d1 = new Date(departureDate).getTime();
 const d2 = new Date(returnDate).getTime();
 if (isNaN(d1) || isNaN(d2) || d2 <= d1) return null;
 return Math.max(1, Math.round((d2 - d1) / 86400000));
 }, [departureDate, returnDate]);

 // Cálculo de valor numérico
 const quoteAmountCents = useMemo(() => {
 if (!quoteAmountStr) return 0;
 const clean = quoteAmountStr.replace(/\D/g, "");
 return clean ? parseInt(clean, 10) : 0;
 }, [quoteAmountStr]);

 // Parser Inteligente de Linguagem Natural / WhatsApp
 const handleParseAi = () => {
 if (!aiText.trim()) return;
 setIsAiParsing(true);

 try {
 const text = aiText;
 const lower = text.toLowerCase();

 // 1. WhatsApp / Telefone
 const phoneMatch = text.match(/(?:\(?([1-9]{2})\)?\s?)?(?:9\s?)?([0-9]{4,5})[-.\s]?([0-9]{4})/);
 if (phoneMatch) setWhatsapp(phoneMatch[0].trim());

 // 2. Nome
 const nameMatch = text.match(/(?:nome|cliente|passageiro|contato)[\s:]+([A-Za-zÀ-ÖØ-öø-ÿ\s]{3,30})/i);
 if (nameMatch) setName(nameMatch[1].trim());

 // 3. Origem & IATA
 const originMatch = text.match(/(?:saindo de|saída de|partindo de|origem)[\s:]+([A-Za-zÀ-ÖØ-öø-ÿ\s]{3,25})/i);
 if (originMatch) {
 const origName = originMatch[1].trim();
 setOriginCity(origName);
 const matchOrig = COMMON_ORIGINS.find((o) => origName.toLowerCase().includes(o.city.toLowerCase()));
 if (matchOrig) setOriginIata(matchOrig.iata);
 } else if (lower.includes("chapecó") || lower.includes("chapeco") || lower.includes("xap")) {
 setOriginCity("Chapecó");
 setOriginIata("XAP");
 }

 // 4. Destino & Gateway IATA Canônico
 let foundDest: CanonicalDestination | undefined = undefined;
 for (const cd of CANONICAL_DESTINATIONS) {
 if (
 lower.includes(cd.name.toLowerCase()) ||
 lower.includes(cd.city.toLowerCase()) ||
 (cd.iata && lower.includes(cd.iata.toLowerCase()))
 ) {
 foundDest = cd;
 break;
 }
 }

 if (foundDest) {
 setDestinationCity(foundDest.name);
 setDestinationIata(foundDest.iata);
 setSelectedCanonicalDest(foundDest);
 } else {
 const destKeywords = [
 "porto de galinhas", "maceió", "maceio", "maragogi", "gramado", "cancun", "cancún",
 "orlando", "jericoacoara", "jeri", "natal", "fortaleza", "salvador", "porto seguro",
 "rio de janeiro", "foz do iguaçu", "foz do iguacu", "beto carrero", "fernando de noronha",
 "balneário camboriú", "balneario camboriu", "morro de são paulo", "arraial d'ajuda",
 "jalapão", "jalapao", "bonito", "santiago", "buenos aires", "paris", "roma"
 ];
 for (const kw of destKeywords) {
 if (lower.includes(kw)) {
 const formatted = kw.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
 setDestinationCity(formatted);
 break;
 }
 }
 }

 // 5. Passageiros → atualiza distribuição do quarto 1
  let aiAdults = 2;
  let aiChildren = 0;
  if (lower.includes("casal") || lower.includes("2 adultos") || lower.includes("duas pessoas")) aiAdults = 2;
  else if (lower.includes("1 adulto") || lower.includes("sozinho") || lower.includes("individual")) aiAdults = 1;
  else if (lower.includes("3 adultos")) aiAdults = 3;
  else if (lower.includes("4 adultos")) aiAdults = 4;

  const childMatch = text.match(/([0-9]+)\s*(?:crianças?|filhos?|kids?)/i);
  if (childMatch) aiChildren = parseInt(childMatch[1], 10);
  else if (lower.includes("com crianca") || lower.includes("com criança") || lower.includes("1 filho")) aiChildren = 1;

  setRoomDistribution([{ adults: aiAdults, children: Array.from({ length: aiChildren }, () => 7) }]);

 // 6. Datas
 const datePattern = /([0-9]{1,2})[\/\.-]([0-9]{1,2})(?:[\/\.-]([0-9]{2,4}))?/g;
 const matches = [...text.matchAll(datePattern)];
 const currentYear = new Date().getFullYear();
 if (matches.length >= 1) {
 const d = matches[0][1].padStart(2, "0");
 const m = matches[0][2].padStart(2, "0");
 const y = matches[0][3] ? (matches[0][3].length === 2 ? `20${matches[0][3]}` : matches[0][3]) : currentYear.toString();
 setDepartureDate(`${y}-${m}-${d}`);
 }
 if (matches.length >= 2) {
 const d = matches[1][1].padStart(2, "0");
 const m = matches[1][2].padStart(2, "0");
 const y = matches[1][3] ? (matches[1][3].length === 2 ? `20${matches[1][3]}` : matches[1][3]) : currentYear.toString();
 setReturnDate(`${y}-${m}-${d}`);
 }

 // 7. Orçamento
 const budgetMatch = text.match(/(?:r\$|orçamento|limite|até|valor)\s*([0-9]{1,3}(?:\.?[0-9]{3})*(?:,[0-9]{2})?)/i);
 if (budgetMatch) {
 setQuoteAmountStr(budgetMatch[1].replace(/\./g, ""));
 }

 // 8. Regime
 if (lower.includes("all inclusive") || lower.includes("all-inclusive")) {
 setMealPlan("all_inclusive");
 setBudgetTier("luxury");
 } else if (lower.includes("meia pensão") || lower.includes("meia pensao")) {
 setMealPlan("meia_pensao");
 }

 // 9. Categoria
 if (lower.includes("5 estrelas") || lower.includes("resort") || lower.includes("luxo")) setHotelCategory("resort");
 else if (lower.includes("3 estrelas") || lower.includes("pousada") || lower.includes("economico")) setHotelCategory("pousada");

 // 10. Bagagem & Transfer
 if (lower.includes("bagagem despachada") || lower.includes("mala 23kg")) setBaggage("despachada");
 if (lower.includes("transfer") || lower.includes("traslado")) setIncludeTransfer(true);

 toast.success(" Cotação interpretada com sucesso! Destino e aeroportos identificados.");
 } catch (e: any) {
 toast.error("Erro ao interpretar texto: " + e.message);
 } finally {
 setIsAiParsing(false);
 }
 };

 // Reset Form
 const resetForm = () => {
 setAiText("");
 setName("");
 setWhatsapp("");
 setEmail("");
 setOriginCity("Chapecó");
 setOriginIata("XAP");
 setDestinationCity("");
 setDestinationIata("");
 setSelectedCanonicalDest(null);
 setDestFilterQuery("");
 setDepartureDate("");
 setReturnDate("");
 setHotelName("");
 setHotelCategory("superior");
 setMealPlan("cafe");
 setRoomType("standard");
 setRoomDistribution([{ adults: 2, children: [] }]);
 setTripType("air_package");
 setPreferredAirline("qualquer");
 setBaggage("mao");
 setIncludeTransfer(true);
 setIncludeInsurance(true);
 setExcursionTags([]);
 setExcursionInput("");
 setHotelSearchQuery("");
 setQuoteAmountStr("");
 setSpecialNotes("");
 setAgencyNotes("");
 setActiveTab("viajantes");
 };

 // Copiar Resumo Formatado para WhatsApp
 const copyFormattedWhatsApp = () => {
 if (!destinationCity) {
 toast.error("Preencha ao menos o destino da viagem.");
 return;
 }

 const agencyName = store?.name || "Excelência Tour";
 const mealPlanLabel =
 mealPlan === "all_inclusive" ? "All Inclusive 🍹 (Comidas e Bebidas liberadas)" :
 mealPlan === "meia_pensao" ? "Meia Pensão 🍽️ (Café da manhã + Almoço ou Jantar)" :
 mealPlan === "cafe" ? "Café da Manhã Incluso ☕" : "Somente Hospedagem 🏨";

 const nightsStr = nightsCount ? ` (${nightsCount} noites)` : "";
 const totalDisplay = quoteAmountCents > 0 ? formatMoney(quoteAmountCents) : "Sob Consulta";
 const pixDisplay = quoteAmountCents > 0 ? formatMoney(Math.round(quoteAmountCents * 0.95)) : "Desconto à vista";
 const installmentDisplay = quoteAmountCents > 0 ? `10x de ${formatMoney(Math.round(quoteAmountCents / 10))} sem juros` : "10x sem juros no cartão";

 const totalPax = Math.max(1, totalRoomsAdults + totalRoomsChildren);
 const perPersonTotal = quoteAmountCents > 0 ? Math.round(quoteAmountCents / totalPax) : 0;
 const perPersonInstallment = perPersonTotal > 0 ? Math.round(perPersonTotal / 10) : 0;
 const perRoomTotal = quoteAmountCents > 0 && roomDistribution.length > 1 ? Math.round(quoteAmountCents / roomDistribution.length) : null;
 const perRoomInstallment = perRoomTotal ? Math.round(perRoomTotal / 10) : null;

 const originDisplay = originIata ? `${originCity} (${originIata})` : originCity;
 const destDisplay = destinationIata ? `${destinationCity} (${destinationIata})` : destinationCity;
 const seasonTip = selectedCanonicalDest ? `\n☀️ *Melhor época para viajar:* ${selectedCanonicalDest.bestSeason}` : "";
 const gastroTip = selectedCanonicalDest ? `\n🍽️ *Dica gastronômica local:* ${selectedCanonicalDest.gastronomyTip}` : "";

 const template = `✈️ *PROPOSTA DE VIAGEM EXCLUSIVA*
📍 *Origem:* ${originDisplay} ➔ *Destino:* ${destDisplay}
📅 *Período:* ${departureDate || "Data a definir"} até ${returnDate || "Data a definir"}${nightsStr}
👥 *Viajantes:* ${totalRoomsAdults} Adultos${totalRoomsChildren > 0 ? `, ${totalRoomsChildren} Crianças` : ""}

🏨 *Hospedagem:* ${hotelName || "Hotel Selecionado"} (${hotelCategory})
🍽️ *Regime:* ${mealPlanLabel}
🛏️ *Acomodação:* Quarto ${roomType.toUpperCase()}
✈️ *Aéreo & Logística:* ${preferredAirline !== "qualquer" ? `Voo ${preferredAirline.toUpperCase()}` : "Melhor Tarifa Aérea"} com ${baggage === "despachada" ? "🧳 Mala Despachada (23kg)" : "🧳 Bagagem de Mão (10kg)"}
${includeTransfer ? "🚗 *Transfer:* Incluso Aeroporto ↔ Hotel In/Out\n" : ""}${includeInsurance ? "🛡️ *Seguro Viagem:* Incluso com assistência médica completa\n" : ""}${excursionTags.length > 0 ? `🎫 *Passeios & Ingressos:* ${excursionTags.join(", ")}\n` : ""}${seasonTip}${gastroTip}
💰 *Investimento Total:* ${totalDisplay}
💳 *Condições:* ${installmentDisplay}
${totalPax > 1 && quoteAmountCents > 0 ? `👥 *Por Pessoa (${totalPax} viajantes):* ${formatMoney(perPersonTotal)} ou 10x de ${formatMoney(perPersonInstallment)} sem juros\n` : ""}${perRoomTotal ? `🛏️ *Por Quarto (${roomDistribution.length} acomodações):* ${formatMoney(perRoomTotal)} ou 10x de ${formatMoney(perRoomInstallment)} sem juros\n` : ""}⚡ *À vista no Pix:* ${pixDisplay} (5% off)

_Valores sujeitos a reajuste tarifário sem aviso prévio. Garanta sua reserva!_
📲 *${agencyName}*`;

 navigator.clipboard.writeText(template);
 toast.success("📋 Resumo formatado copiado! Cole diretamente no WhatsApp do cliente.");
 };

 // Salvar no Banco via Server Function
 const createMutation = useMutation({
 mutationFn: () => {
 // Monta notas estruturadas
 const mealPlanLabel =
 mealPlan === "all_inclusive" ? "All Inclusive" :
 mealPlan === "meia_pensao" ? "Meia Pensão" :
 mealPlan === "cafe" ? "Café da Manhã" : "Só Hospedagem";

 const structuredNotes = [
 specialNotes ? `Solicitação: ${specialNotes}` : null,
 hotelName ? `Hotel: ${hotelName} (${hotelCategory})` : `Padrão: ${hotelCategory}`,
 `Regime: ${mealPlanLabel}`,
 `Quarto: ${roomType}`,
 `Aéreo/Bagagem: ${preferredAirline.toUpperCase()} - ${baggage === "despachada" ? "Mala Despachada 23kg" : "Bagagem de Mão 10kg"}`,
 originIata ? `Origem IATA: ${originIata}` : null,
 destinationIata ? `Destino IATA: ${destinationIata}` : null,
 includeTransfer ? "Transfer In/Out Incluso" : null,
 includeInsurance ? "Seguro Viagem Incluso" : null,
 excursionTags.length > 0 ? `Passeios: ${excursionTags.join(", ")}` : null,
 ].filter(Boolean).join(" | ");

 return createAgencyTravelQuote({
 data: {
 contact_name: name.trim(),
 contact_whatsapp: whatsapp.trim(),
 contact_email: email.trim() || null,
 origin_city: originCity.trim(),
 origin_iata: originIata.trim() || null,
 destination_city: destinationCity.trim(),
 destination_iata: destinationIata.trim() || null,
 departure_date: departureDate || null,
 return_date: returnDate || null,
 adults_count: totalRoomsAdults,
 children_count: totalRoomsChildren,
 rooms_count: roomDistribution.length,
 trip_type: tripType,
 budget_tier: budgetTier,
 special_notes: structuredNotes || null,
 agency_notes: agencyNotes.trim() || null,
 quote_amount_cents: quoteAmountCents > 0 ? quoteAmountCents : null,
 status: "new",
 },
 });
 },
 onSuccess: (res) => {
 toast.success("Cotação cadastrada com sucesso no CRM!");
 queryClient.invalidateQueries({ queryKey: ["agency-travel-quotes"] });
 onOpenChange(false);
 resetForm();
 onSuccess?.(res?.id);
 },
 onError: (err: any) => toast.error(err?.message || "Erro ao cadastrar cotação."),
 });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        size="wide"
        className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] max-sm:!h-[100dvh] max-sm:!inset-0 max-sm:!rounded-none border-l p-0 overflow-y-auto no-scrollbar bg-card flex flex-col justify-between shadow-2xl"
      >
 {/* ── 1. Top Header ── */}
 <SheetHeader className="p-5 sm:p-6 border-b border-border/80 bg-muted/20 text-left space-y-2">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
 <Plane className="size-5" />
 </div>
 <div>
 <SheetTitle className="text-base font-bold text-foreground flex items-center gap-2">
 <span>Quotation Builder • Cotação Inteligente</span>
 <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
 Turismo e CRM
 </Badge>
 </SheetTitle>
 <SheetDescription className="text-xs text-muted-foreground">
 Atendimento balcão ou WhatsApp com cálculo em tempo real e IA
 </SheetDescription>
 </div>
 </div>
 </div>
 </SheetHeader>

 {/* ── 2. AI Parser Box (WhatsApp / Texto Livre) ── */}
 <div className="p-4 mx-5 sm:mx-6 mt-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-primary flex items-center gap-2">
 <Sliders className="size-3.5" />
 <span>Interpretar com IA (WhatsApp ou Texto Livre)</span>
 </span>
 <Badge variant="secondary" className="text-[9px] py-0 px-2 font-mono">
 Auto-Preenchimento
 </Badge>
 </div>
 <Textarea
 placeholder="Cole aqui a mensagem do WhatsApp do passageiro... Ex: 'Casal quer ir pra Porto de Galinhas em novembro saindo de Chapecó, hotel com café da manhã e transfer, orçamento até 8 mil. Carlos whats (49) 99912-3456'"
 value={aiText}
 onChange={(e) => setAiText(e.target.value)}
 className="min-h-[65px] text-xs bg-background rounded-lg resize-none"
 />
 <div className="flex items-center justify-between gap-2 pt-1">
 <span className="text-[10px] text-muted-foreground">
 Detecta automaticamente destino, datas, passageiros, regime e orçamento.
 </span>
 <Button
 type="button"
 size="sm"
 disabled={!aiText.trim() || isAiParsing}
 onClick={handleParseAi}
 className="h-8 rounded-lg font-bold text-xs gap-2 bg-primary text-primary-foreground cursor-pointer shadow-xs shrink-0"
 >
 <Sliders className="size-3.5" />
 <span>{isAiParsing ? "Interpretando..." : "Interpretar Texto"}</span>
 </Button>
 </div>
 </div>

 {/* ── 3. Tabs Navigation ── */}
 <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full px-5 sm:px-6 pt-3 flex-1 flex flex-col">
 <TabsList className="grid grid-cols-4 bg-muted/60 p-1 rounded-lg h-10 mb-4 shrink-0">
 <TabsTrigger value="viajantes" className="rounded-lg text-xs font-bold gap-2">
 <MapPin className="size-3.5" />
 <span className="hidden sm:inline">Destino</span>
 </TabsTrigger>
 <TabsTrigger value="hospedagem" className="rounded-lg text-xs font-bold gap-2">
 <Hotel className="size-3.5" />
 <span className="hidden sm:inline">Hotel</span>
 </TabsTrigger>
 <TabsTrigger value="transporte" className="rounded-lg text-xs font-bold gap-2">
 <Plane className="size-3.5" />
 <span className="hidden sm:inline">Logística</span>
 </TabsTrigger>
 <TabsTrigger value="condicoes" className="rounded-lg text-xs font-bold gap-2">
 <DollarSign className="size-3.5" />
 <span className="hidden sm:inline">Valores</span>
 </TabsTrigger>
 </TabsList>

 {/* ── ABA 1: DESTINO & VIAJANTES ── */}
 <TabsContent value="viajantes" className="space-y-4 m-0 flex-1">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="text-xs font-bold text-foreground">Passageiro Principal *</Label>
 <Input
 value={name}
 onChange={(e) => setName(e.target.value)}
 placeholder="Ex: Carlos Eduardo de Souza"
 className="h-9 rounded-lg text-xs bg-background"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-xs font-bold text-foreground">WhatsApp / Celular *</Label>
 <Input
 value={whatsapp}
 onChange={(e) => setWhatsapp(e.target.value)}
 placeholder="(49) 99999-9999"
 className="h-9 rounded-lg text-xs bg-background"
 />
 </div>
 </div>

 {/* Origem e Destino com Gateways IATA */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {/* Origem */}
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <Label className="text-xs font-bold text-foreground">Origem da Viagem</Label>
 {originIata && (
 <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30 font-bold">
 ✈️ {originIata}
 </Badge>
 )}
 </div>
 <div className="grid grid-cols-3 gap-2">
 <div className="col-span-2">
 <Input
 value={originCity}
 onChange={(e) => setOriginCity(e.target.value)}
 placeholder="Chapecó"
 className="h-9 rounded-lg text-xs bg-background"
 />
 </div>
 <div>
 <Input
 value={originIata}
 onChange={(e) => setOriginIata(e.target.value.toUpperCase())}
 placeholder="IATA"
 maxLength={3}
 className="h-9 rounded-lg text-xs font-mono font-bold bg-background text-center uppercase"
 />
 </div>
 </div>

 {/* Atalhos Rápidos de Origem */}
 <div className="flex flex-wrap gap-1 pt-1">
 {COMMON_ORIGINS.map((orig) => (
 <button
 key={orig.iata}
 type="button"
 onClick={() => {
 setOriginCity(orig.city);
 setOriginIata(orig.iata);
 }}
 className={cn(
 "text-[10px] font-medium px-2 py-1 rounded-lg border transition-all cursor-pointer",
 originIata === orig.iata
 ? "bg-primary/10 border-primary text-primary font-bold"
 : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
 )}
 >
 {orig.label}
 </button>
 ))}
 </div>
 </div>

 {/* Destino */}
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <Label className="text-xs font-bold text-foreground">Destino Almejado *</Label>
 {destinationIata && (
 <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold">
 ✈️ {destinationIata}
 </Badge>
 )}
 </div>
 <div className="grid grid-cols-3 gap-2">
 <div className="col-span-2">
 <Input
 value={destinationCity}
 onChange={(e) => {
 const val = e.target.value;
 setDestinationCity(val);
 const match = CANONICAL_DESTINATIONS.find(
 (d) => d.name.toLowerCase() === val.toLowerCase() || d.city.toLowerCase() === val.toLowerCase()
 );
 if (match) {
 setDestinationIata(match.iata);
 setSelectedCanonicalDest(match);
 }
 }}
 placeholder="Ex: Porto de Galinhas, PE"
 className="h-9 rounded-lg text-xs bg-background"
 />
 </div>
 <div>
 <Input
 value={destinationIata}
 onChange={(e) => setDestinationIata(e.target.value.toUpperCase())}
 placeholder="IATA"
 maxLength={3}
 className="h-9 rounded-lg text-xs font-mono font-bold bg-background text-center uppercase"
 />
 </div>
 </div>
 </div>
 </div>

 {/* Datas com Cálculo de Noites */}
 <div className="p-4 rounded-lg bg-muted/30 border border-border/60 space-y-2 mt-4">
 <div className="flex items-center justify-between">
 <Label className="text-xs font-bold text-foreground flex items-center gap-2">
 <Calendar className="size-3.5 text-primary" />
 <span>Janela de Datas Prevista</span>
 </Label>
 {nightsCount && (
 <Badge variant="secondary" className="text-[10px] font-mono bg-primary/10 text-primary border-primary/20">
 🌙 {nightsCount} {nightsCount === 1 ? "noite" : "noites"}
 </Badge>
 )}
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <span className="text-[10px] text-muted-foreground block mb-1">Ida Prevista:</span>
 <Input
 type="date"
 value={departureDate}
 onChange={(e) => setDepartureDate(e.target.value)}
 className="h-9 rounded-lg text-xs bg-background"
 />
 </div>
 <div>
 <span className="text-[10px] text-muted-foreground block mb-1">Volta Prevista:</span>
 <Input
 type="date"
 value={returnDate}
 onChange={(e) => setReturnDate(e.target.value)}
 className="h-9 rounded-lg text-xs bg-background"
 />
 </div>
 </div>
 </div>
 </TabsContent>

 {/* ── ABA 2: HOSPEDAGEM & CONFORTO ── */}
  <TabsContent value="hospedagem" className="space-y-4 m-0 flex-1">

  {/* Hotel Autocomplete */}
  <div className="space-y-1 relative">
  <Label className="text-xs font-bold text-foreground">Hospedagem</Label>
  <div className="relative">
  <Hotel className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
  <Input
  value={hotelSearchQuery}
  onChange={(e) => handleHotelSearch(e.target.value)}
  onFocus={() => hotelSearchQuery.length >= 2 && setShowHotelDropdown(hotelSuggestions.length > 0)}
  onBlur={() => setTimeout(() => setShowHotelDropdown(false), 180)}
  placeholder="Digite o nome do hotel ou resort..."
  className="h-10 rounded-lg text-xs bg-background pl-8"
  />
  </div>
  {showHotelDropdown && hotelSuggestions.length > 0 && (
  <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border border-border/80 rounded-lg shadow-xl overflow-hidden">
  {hotelSuggestions.map((h) => (
  <button
  key={h.id}
  type="button"
  onMouseDown={() => handleSelectHotel(h)}
  onClick={() => handleSelectHotel(h)}
  className="w-full px-4 py-3 min-h-11 text-left hover:bg-muted/50 flex items-center justify-between gap-3 transition-colors border-b border-border/40 last:border-0 focus-visible:outline-none focus-visible:bg-muted/50"
  >
  <div>
  <span className="text-xs font-bold text-foreground block">{h.name}</span>
  <span className="text-[10px] text-muted-foreground">{h.city}{h.state ? `, ${h.state}` : ""}</span>
  </div>
  {h.regime_options?.[0] && (
  <Badge variant="secondary" className="text-[9px] shrink-0">{h.regime_options[0]}</Badge>
  )}
  </button>
  ))}
  </div>
  )}
  <p className="text-[10px] text-muted-foreground pt-1">Digite para buscar hotéis cadastrados ou escreva livremente.</p>
  </div>

  {/* Categoria sem estrelas */}
  <div className="space-y-2">
  <Label className="text-xs font-bold text-foreground">Categoria</Label>
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
  {[
  { id: "pousada", label: "Pousada", sub: "Econômico" },
  { id: "padrao", label: "Hotel Padrão", sub: "Conforto básico" },
  { id: "superior", label: "Superior", sub: "Conforto / Boutique" },
  { id: "resort", label: "Resort / Luxo", sub: "Experiência premium" },
  ].map((cat) => (
  <button
  key={cat.id}
  type="button"
  onClick={() => setHotelCategory(cat.id as any)}
  className={cn(
  "p-3 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer",
  hotelCategory === cat.id
  ? "bg-primary/10 border-primary text-foreground shadow-2xs"
  : "bg-card border-border/70 text-muted-foreground hover:bg-muted/40"
  )}
  >
  <span className="text-xs font-bold block">{cat.label}</span>
  <span className="text-[10px] leading-snug">{cat.sub}</span>
  </button>
  ))}
  </div>
  </div>

  {/* Regime de Alimentação */}
  <div className="space-y-2">
  <Label className="text-xs font-bold text-foreground">Regime de Alimentação</Label>
  <div className="grid grid-cols-2 gap-2">
  {[
  { id: "cafe", label: "Café da Manhã", icon: Coffee },
  { id: "meia_pensao", label: "Meia Pensão", icon: Utensils },
  { id: "all_inclusive", label: "All Inclusive", icon: CheckCircle2 },
  { id: "sem_refeicao", label: "Só Hospedagem", icon: Hotel },
  ].map((plan) => {
  const Icon = plan.icon;
  return (
  <button
  key={plan.id}
  type="button"
  onClick={() => setMealPlan(plan.id as any)}
  className={cn(
  "p-3 rounded-lg border text-left flex items-start gap-3 transition-all cursor-pointer",
  mealPlan === plan.id
  ? "bg-primary/10 border-primary text-foreground shadow-2xs font-bold"
  : "bg-card border-border/70 text-muted-foreground hover:bg-muted/40"
  )}
  >
  <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-1">
  <Icon className="size-3.5" />
  </div>
  <div>
  <span className="text-xs font-bold block">{plan.label}</span>
  </div>
  </button>
  );
  })}
  </div>
  </div>

  {/* Distribuição de Viajantes por Quarto */}
  <div className="space-y-2">
  <div className="flex items-center justify-between">
  <Label className="text-xs font-bold text-foreground">Distribuição de Quartos</Label>
  <div className="flex items-center gap-2">
  <Button
  type="button"
  variant="outline"
  size="sm"
  onClick={() => setRoomDistribution(prev => [...prev, { adults: 2, children: [] }])}
  className="h-7 rounded-lg text-xs gap-1"
  >
  <Plus className="size-3" /> Quarto
  </Button>
  {roomDistribution.length > 1 && (
  <Button
  type="button"
  variant="outline"
  size="sm"
  onClick={() => setRoomDistribution(prev => prev.slice(0, -1))}
  className="h-7 rounded-lg text-xs gap-1 text-destructive border-destructive/40"
  >
  <Minus className="size-3" /> Remover
  </Button>
  )}
  </div>
  </div>

  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
  <Users className="size-3.5" />
  <span>{roomDistribution.length} {roomDistribution.length === 1 ? "quarto" : "quartos"} • {totalRoomsAdults} adulto{totalRoomsAdults !== 1 ? "s" : ""}{totalRoomsChildren > 0 ? ` • ${totalRoomsChildren} criança${totalRoomsChildren !== 1 ? "s" : ""}` : ""}</span>
  </div>

  <div className="space-y-2">
  {roomDistribution.map((room, ri) => (
  <div key={ri} className="p-3 rounded-lg border border-border/70 bg-card space-y-2">
  <div className="flex items-center justify-between">
  <span className="text-[11px] font-bold text-foreground">Quarto {ri + 1}</span>
  <Badge variant="secondary" className="text-[9px]">
  {room.adults} adulto{room.adults !== 1 ? "s" : ""}{room.children.length > 0 ? ` + ${room.children.length} criança${room.children.length !== 1 ? "s" : ""}` : ""}
  </Badge>
  </div>
  <div className="grid grid-cols-2 gap-3">
  <div className="space-y-1">
  <span className="text-[10px] text-muted-foreground">Adultos (+12 anos)</span>
  <div className="flex items-center gap-2">
  <Button type="button" variant="outline" size="icon"
  onClick={() => setRoomDistribution(prev => prev.map((r, i) => i === ri ? { ...r, adults: Math.max(1, r.adults - 1) } : r))}
  className="size-7 rounded-lg"><Minus className="size-3" /></Button>
  <span className="text-sm font-bold font-mono w-4 text-center">{room.adults}</span>
  <Button type="button" variant="outline" size="icon"
  onClick={() => setRoomDistribution(prev => prev.map((r, i) => i === ri ? { ...r, adults: r.adults + 1 } : r))}
  className="size-7 rounded-lg"><Plus className="size-3" /></Button>
  </div>
  </div>
  <div className="space-y-1">
  <span className="text-[10px] text-muted-foreground">Crianças (0-11 anos)</span>
  <div className="flex items-center gap-2">
  <Button type="button" variant="outline" size="icon"
  onClick={() => setRoomDistribution(prev => prev.map((r, i) => i === ri ? { ...r, children: r.children.slice(0, -1) } : r))}
  disabled={room.children.length === 0}
  className="size-7 rounded-lg"><Minus className="size-3" /></Button>
  <span className="text-sm font-bold font-mono w-4 text-center">{room.children.length}</span>
  <Button type="button" variant="outline" size="icon"
  onClick={() => setRoomDistribution(prev => prev.map((r, i) => i === ri ? { ...r, children: [...r.children, 7] } : r))}
  className="size-7 rounded-lg"><Plus className="size-3" /></Button>
  </div>
  </div>
  </div>
  {room.children.length > 0 && (
  <div className="pt-1 space-y-1">
  <span className="text-[10px] text-muted-foreground">Idades das crianças:</span>
  <div className="flex flex-wrap gap-2">
  {room.children.map((age, ci) => (
  <div key={ci} className="flex items-center gap-1">
  <span className="text-[10px] text-muted-foreground">C{ci + 1}:</span>
  <select
  value={age}
  onChange={(e) => setRoomDistribution(prev => prev.map((r, i) => i === ri ? { ...r, children: r.children.map((a, j) => j === ci ? parseInt(e.target.value) : a) } : r))}
  className="h-6 px-2 rounded-lg border border-input bg-background text-xs font-medium cursor-pointer"
  >
  {Array.from({ length: 12 }, (_, a) => a).map(a => (
  <option key={a} value={a}>{a === 0 ? "< 1 ano" : `${a} anos`}</option>
  ))}
  </select>
  </div>
  ))}
  </div>
  </div>
  )}
  </div>
  ))}
  </div>
  </div>
  </TabsContent>

 {/* ── ABA 3: TRANSPORTE & LOGÍSTICA ── */}
 <TabsContent value="transporte" className="space-y-4 m-0 flex-1">
 <div className="space-y-2">
 <Label className="text-xs font-bold text-foreground">Modalidade de Transporte</Label>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
 {[
 { id: "air_package", label: "Aéreo", icon: Plane },
 { id: "bus", label: "Rodoviário", icon: Bus },
 { id: "cruise", label: "Cruzeiro", icon: Ship },
 { id: "hotel_only", label: "Sem Transporte", icon: Hotel },
 ].map((t) => {
 const Icon = t.icon;
 return (
 <button
 key={t.id}
 type="button"
 onClick={() => setTripType(t.id as any)}
 className={cn(
 "p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer",
 tripType === t.id
 ? "bg-primary/10 border-primary text-primary font-bold shadow-2xs"
 : "bg-card border-border/70 text-muted-foreground hover:bg-muted/40"
 )}
 >
 <Icon className="size-4" />
 <span className="text-xs">{t.label}</span>
 </button>
 );
 })}
 </div>
 </div>

 {/* Preferência de Aéreo & Bagagem */}
 {tripType === "air_package" && (
 <div className="p-4 rounded-lg bg-muted/30 border border-border/60 space-y-3">
 <div className="space-y-2">
 <span className="text-xs font-bold text-foreground block">Cia Aérea Preferencial</span>
 <div className="grid grid-cols-4 gap-2">
 {[
 { id: "qualquer", label: "Melhor Tarifa" },
 { id: "azul", label: "Azul" },
 { id: "latam", label: "LATAM" },
 { id: "gol", label: "GOL" },
 ].map((air) => (
 <button
 key={air.id}
 type="button"
 onClick={() => setPreferredAirline(air.id as any)}
 className={cn(
 "h-8 text-xs font-semibold rounded-lg border transition-all cursor-pointer",
 preferredAirline === air.id
 ? "bg-primary text-primary-foreground border-primary font-bold"
 : "bg-background text-muted-foreground border-border/60 hover:text-foreground"
 )}
 >
 {air.label}
 </button>
 ))}
 </div>
 </div>

 <div className="space-y-2 pt-1">
 <span className="text-xs font-bold text-foreground block">Franquia de Bagagem</span>
 <div className="grid grid-cols-2 gap-2">
 <button
 type="button"
 onClick={() => setBaggage("mao")}
 className={cn(
 "p-3 rounded-lg border text-left flex items-center gap-2 cursor-pointer transition-all",
 baggage === "mao"
 ? "bg-primary/10 border-primary text-foreground font-bold"
 : "bg-card border-border/60 text-muted-foreground"
 )}
 >
 <Luggage className="size-4 text-primary" />
 <div>
 <span className="text-xs block">Bagagem de Mão (10kg)</span>
 </div>
 </button>

 <button
 type="button"
 onClick={() => setBaggage("despachada")}
 className={cn(
 "p-3 rounded-lg border text-left flex items-center gap-2 cursor-pointer transition-all",
 baggage === "despachada"
 ? "bg-primary/10 border-primary text-foreground font-bold"
 : "bg-card border-border/60 text-muted-foreground"
 )}
 >
 <Luggage className="size-4 text-primary" />
 <div>
 <span className="text-xs block">Mala Despachada (23kg)</span>
 </div>
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Serviços Inclusos */}
 <div className="space-y-2">
 <Label className="text-xs font-bold text-foreground">Serviços Inclusos</Label>
 <div className="space-y-2">
 {[
 {
 checked: includeTransfer,
 toggle: () => setIncludeTransfer(!includeTransfer),
 icon: Car,
 title: "Transfer Aeroporto ↔ Hospedagem",
 desc: "Recepção privativa ou regular no destino",
 },
 {
 checked: includeInsurance,
 toggle: () => setIncludeInsurance(!includeInsurance),
 icon: ShieldCheck,
 title: "Seguro Viagem e Assistência Médica",
 desc: "Cobertura de saúde, extravio de bagagem e imprevistos",
 },
 ].map((item, idx) => {
 const Icon = item.icon;
 return (
 <button
 key={idx}
 type="button"
 onClick={item.toggle}
 className={cn(
 "w-full p-3 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer",
 item.checked ? "bg-primary/5 border-primary/40 text-foreground" : "bg-card border-border/60 text-muted-foreground"
 )}
 >
 <div className="flex items-center gap-3">
 <div className={cn("size-8 rounded-lg flex items-center justify-center shrink-0", item.checked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
 <Icon className="size-4" />
 </div>
 <div>
 <span className="text-xs font-bold block">{item.title}</span>
 <span className="text-[10px] text-muted-foreground block">{item.desc}</span>
 </div>
 </div>
 <div className={cn("size-5 rounded-md border flex items-center justify-center", item.checked ? "bg-primary text-primary-foreground border-primary" : "border-border/80")}>
 {item.checked && <Check className="size-3.5" />}
 </div>
 </button>
 );
 })}
 </div>
 </div>

 {/* Passeios & Ingressos como Tags Dinâmicas */}
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <Label className="text-xs font-bold text-foreground">Passeios e Ingressos</Label>
 {excursionTags.length > 0 && (
 <Badge variant="secondary" className="text-[9px] font-mono">{excursionTags.length} item{excursionTags.length !== 1 ? "s" : ""}</Badge>
 )}
 </div>

 {/* Tags Adicionadas */}
 {excursionTags.length > 0 && (
 <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
 {excursionTags.map((tag) => (
 <span
 key={tag}
 className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold border border-primary/20"
 >
 {tag}
 <button
 type="button"
 onClick={() => removeExcursion(tag)}
 className="ml-1 text-primary/60 hover:text-primary cursor-pointer leading-none"
 >
 ×
 </button>
 </span>
 ))}
 </div>
 )}

 {/* Atalhos rápidos */}
 <div className="space-y-2">
 <span className="text-[10px] text-muted-foreground">Adicionar rapidamente:</span>
 <div className="flex flex-wrap gap-2">
 {presetExcursions.filter((p) => !excursionTags.includes(p)).slice(0, 8).map((preset) => (
 <button
 key={preset}
 type="button"
 onClick={() => addExcursion(preset)}
 className="px-3 py-1 rounded-full bg-card border border-border/70 text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer"
 >
 + {preset}
 </button>
 ))}
 </div>
 </div>

 {/* Input livre */}
 <div className="flex gap-2">
 <Input
 value={excursionInput}
 onChange={(e) => setExcursionInput(e.target.value)}
 onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addExcursion(excursionInput); } }}
 placeholder="Ex: Mergulho em Noronha, Passeio à Praia do Francês..."
 className="h-9 rounded-lg text-xs bg-background flex-1"
 />
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => addExcursion(excursionInput)}
 disabled={!excursionInput.trim()}
 className="h-9 rounded-lg text-xs shrink-0"
 >
 <Plus className="size-3.5" />
 </Button>
 </div>
 </div>
 </TabsContent>

 {/* ── ABA 4: VALORES & CONDIÇÕES ── */}
 <TabsContent value="condicoes" className="space-y-4 m-0 flex-1">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="text-xs font-bold text-foreground">Valor Total do Orçamento (R$)</Label>
 <Input
 value={quoteAmountStr}
 onChange={(e) => setQuoteAmountStr(e.target.value)}
 placeholder="Ex: 8500,00"
 className="h-10 rounded-lg text-sm font-bold font-mono bg-background"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-xs font-bold text-foreground">Padrão Orçamentário</Label>
 <div className="grid grid-cols-2 gap-1 pt-1">
 {[
 { id: "economy", label: "Econômico" },
 { id: "standard", label: "Conforto" },
 { id: "premium", label: "Superior" },
 { id: "luxury", label: "Luxo" },
 ].map((b) => (
 <button
 key={b.id}
 type="button"
 onClick={() => setBudgetTier(b.id as any)}
 className={cn(
 "h-8 text-xs font-semibold rounded-lg border transition-all cursor-pointer",
 budgetTier === b.id
 ? "bg-primary text-primary-foreground border-primary font-bold"
 : "bg-background text-muted-foreground border-border/60 hover:text-foreground"
 )}
 >
 {b.label}
 </button>
 ))}
 </div>
 </div>
 </div>

 {/* Simulador de Parcelas Automático */}
 {quoteAmountCents > 0 && (
 <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-950 dark:text-emerald-200 space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
 <DollarSign className="size-3.5" />
 <span>Simulação de Pagamento Automática</span>
 </span>
 <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
 Condição Comercial
 </Badge>
 </div>

 <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
 <div className="p-3 rounded-lg bg-background border border-emerald-500/20 text-foreground">
 <span className="text-[10px] text-muted-foreground block">À Vista no Pix (5% off)</span>
 <span className="text-xs font-black text-emerald-600 font-mono">
 {formatMoney(Math.round(quoteAmountCents * 0.95))}
 </span>
 </div>

 <div className="p-3 rounded-lg bg-background border border-emerald-500/20 text-foreground">
 <span className="text-[10px] text-muted-foreground block">10x sem juros (Cartão)</span>
 <span className="text-xs font-black text-foreground font-mono">
 10x de {formatMoney(Math.round(quoteAmountCents / 10))}
 </span>
 </div>

 <div className="p-3 rounded-lg bg-background border border-emerald-500/20 text-foreground col-span-2 sm:col-span-1">
 <span className="text-[10px] text-muted-foreground block">Entrada 20% + Saldo 10x</span>
 <span className="text-xs font-bold text-foreground font-mono">
 {formatMoney(Math.round(quoteAmountCents * 0.2))} + 10x {formatMoney(Math.round((quoteAmountCents * 0.8) / 10))}
 </span>

            {Math.max(1, totalRoomsAdults + totalRoomsChildren) > 1 && (
              <div className="p-3 rounded-lg bg-background border border-emerald-500/20 text-foreground">
                <span className="text-[10px] text-muted-foreground block">Por Pessoa ({Math.max(1, totalRoomsAdults + totalRoomsChildren)} pax)</span>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                  {formatMoney(Math.round(quoteAmountCents / Math.max(1, totalRoomsAdults + totalRoomsChildren)))}
                  <span className="text-[10px] font-normal text-muted-foreground block">ou 10x {formatMoney(Math.round(quoteAmountCents / (10 * Math.max(1, totalRoomsAdults + totalRoomsChildren))))}</span>
                </span>
              </div>
            )}

            {roomDistribution.length > 1 && (
              <div className="p-3 rounded-lg bg-background border border-emerald-500/20 text-foreground">
                <span className="text-[10px] text-muted-foreground block">Por Quarto ({roomDistribution.length} qtos)</span>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                  {formatMoney(Math.round(quoteAmountCents / roomDistribution.length))}
                  <span className="text-[10px] font-normal text-muted-foreground block">ou 10x {formatMoney(Math.round(quoteAmountCents / (10 * roomDistribution.length)))}</span>
                </span>
              </div>
            )}
 </div>
 </div>
 </div>
 )}

 <div className="space-y-1">
 <Label className="text-xs font-bold text-foreground">Solicitação / Preferências Especiais do Passageiro</Label>
 <Textarea
 value={specialNotes}
 onChange={(e) => setSpecialNotes(e.target.value)}
 placeholder="Ex: Quarto com berço para bebê, hotel pé na areia com piscina aquecida..."
 className="rounded-lg text-xs resize-none bg-background"
 rows={2}
 />
 </div>

 <div className="space-y-1">
 <Label className="text-xs font-bold text-foreground">Notas Internas do Consultor (Privado)</Label>
 <Textarea
 value={agencyNotes}
 onChange={(e) => setAgencyNotes(e.target.value)}
 placeholder="Ex: Cotação de operadora de viagens. Passageiro com flexibilidade de voo noturno."
 className="rounded-lg text-xs resize-none bg-background"
 rows={2}
 />
 </div>
 </TabsContent>
 </Tabs>

 {/* ── 4. Footer Action Bar ── */}
 <div className="p-4 sm:p-5 border-t border-border/80 bg-card flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={copyFormattedWhatsApp}
 className="w-full sm:w-auto h-10 px-4 rounded-lg text-xs font-bold gap-2 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
 >
 <Copy className="size-3.5" />
 <span>Copiar para WhatsApp</span>
 </Button>

 <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => onOpenChange(false)}
 className="h-10 rounded-lg text-xs font-semibold"
 >
 Cancelar
 </Button>
 <Button
 type="button"
 disabled={!name || !whatsapp || !destinationCity || createMutation.isPending}
 onClick={() => createMutation.mutate()}
 className="h-10 px-5 rounded-lg text-xs font-bold gap-2 bg-primary text-primary-foreground shadow-2xs cursor-pointer"
 >
 <CheckCircle2 className="size-4" />
 <span>{createMutation.isPending ? "Salvando..." : "Salvar no CRM"}</span>
 </Button>
 </div>
 </div>
 </SheetContent>
 </Sheet>
 );
}
