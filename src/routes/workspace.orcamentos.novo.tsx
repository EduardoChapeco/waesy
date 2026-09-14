import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
 ArrowLeft,
 Loader2,
 Plus,
 Trash2,
 User,
 Plane,
 Building2,
 MapPin,
 Calendar,
 DollarSign,
 FileSpreadsheet,
 CheckCircle2,
 ShieldCheck,
 Luggage,
 Clock,
 Car,
 Compass,
 ArrowRight,
 FileCheck2,
 Image as ImageIcon,
 FileText,
 Boxes,
 Wrench,
 Package,
 MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { CurrencyField } from "@/components/ui/currency-field";
import { PageHeader } from "@/components/commerce/page-header";
import { ImageUpload } from "@/components/ui/image-upload";
import { useQuery } from "@tanstack/react-query";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
 createTravelProposal,
 updateTravelProposal,
 type FlightSegmentDTO,
 type HotelOptionDTO,
 type ItineraryDayDTO,
 type PricingBreakdownDTO,
} from "@/services/travel-proposal.functions";
import { createQuote, type QuoteItemInput } from "@/services/quotes.functions";
import { getStoreSettings } from "@/services/store.functions";
import { listCustomers } from "@/services/crm.functions";
import { listAdminProducts } from "@/services/admin-catalog.functions";
import { getNicheSemantics } from "@/lib/niche-semantics";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
 CANONICAL_DESTINATIONS,
 type CanonicalDestination,
} from "@/lib/destinations-catalog";

export const Route = createFileRoute("/workspace/orcamentos/novo")({
 head: () => ({ meta: [{ title: "Novo Orçamento Comercial | Workspace Waesy" }] }),
 loader: async () => {
   try {
 const store = await getStoreSettings().catch(() => null);
 return { store };
   } catch (err) {
     console.error("[loader:workspace.orcamentos.novo] Unhandled loader error:", err);
     return { store: null };
   }
 },
 component: NovoOrcamentoRouterPage,
});

function NovoOrcamentoRouterPage() {
 const { store } = ((Route.useLoaderData?.() as any) || {});
 const semantics = getNicheSemantics(store);
 const isTourism =
 semantics.nicheId === "tourism" ||
 (store?.segment || store?.type || "").toLowerCase().includes("turis") ||
 (store?.segment || store?.type || "").toLowerCase().includes("viag");

 const [activeMode, setActiveMode] = useState<"commercial" | "travelos">("commercial");

 return (
 <div className="space-y-6 w-full max-w-7xl mx-auto px-0 sm:px-0">
 {isTourism && (
 <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-2xl bg-card border border-border/70 gap-3 shadow-xs">
 <div className="flex items-center gap-2.5">
 <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
 <Compass className="size-4" />
 </div>
 <div>
 <p className="text-xs font-bold text-foreground">Modo de Orçamento / Proposta</p>
 <p className="text-[11px] text-muted-foreground">Escolha o formato comercial ideal para este atendimento</p>
 </div>
 </div>
 <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/50 text-xs w-full sm:w-auto justify-center">
 <button
 type="button"
 onClick={() => setActiveMode("commercial")}
 className={cn(
 "px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer",
 activeMode === "commercial"
 ? "bg-background text-foreground shadow-xs"
 : "text-muted-foreground hover:text-foreground",
 )}
 >
 Orçamento de Produtos / Serviços
 </button>
 <button
 type="button"
 onClick={() => setActiveMode("travelos")}
 className={cn(
 "px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5",
 activeMode === "travelos"
 ? "bg-primary text-primary-foreground shadow-xs"
 : "text-muted-foreground hover:text-foreground",
 )}
 >
 <Plane className="size-3.5" />
 <span>Roteiro Completo (TravelOS)</span>
 </button>
 </div>
 </div>
 )}

 {activeMode === "travelos" ? (
 <NovoOrcamentoTravelosPage />
 ) : (
 <NovoOrcamentoComercialUniversalPage store={store} />
 )}
 </div>
 );
}

function NovoOrcamentoTravelosPage() {
 const navigate = useNavigate();
 const [activeTab, setActiveTab] = useState<"geral" | "voos" | "hospedagem" | "roteiro" | "financeiro">("geral");
 const [isSubmitting, setIsSubmitting] = useState(false);

 // 1. Dados Principais da Proposta / Cliente
 const [proposalData, setProposalData] = useState({
 title: "",
 subtitle: "",
 clientName: "",
 clientWhatsapp: "",
 clientEmail: "",
 destinationCity: "",
 travelStartDate: "",
 travelEndDate: "",
 adultsCount: 2,
 childrenCount: 0,
 coverImageUrl: "",
 });

 // Origem & Destino Canônico
 const [selectedCanonicalDest, setSelectedCanonicalDest] = useState<CanonicalDestination | null>(null);
 const [originCity, setOriginCity] = useState("Chapecó");
 const [originIata, setOriginIata] = useState("XAP");
 const [destinationIata, setDestinationIata] = useState("");

 // 2. Trechos Aéreos (Flight Segments)
 const [flights, setFlights] = useState<FlightSegmentDTO[]>([]);

 // 3. Hotéis e Resorts
 const [hotels, setHotels] = useState<HotelOptionDTO[]>([]);

 // 4. Roteiro Dia a Dia (Itinerário)
 const [itinerary, setItinerary] = useState<ItineraryDayDTO[]>([]);

 // 5. Precificação & Condições Financeiras (Integer Cents)
 const [currency, setCurrency] = useState<"BRL" | "USD" | "EUR">("BRL");
 const [exchangeRate, setExchangeRate] = useState<number>(0);
 const [costPerPersonCents, setCostPerPersonCents] = useState<number>(0);
 const [markupPercent, setMarkupPercent] = useState<number>(0);
 const [boardingTaxCents, setBoardingTaxCents] = useState<number>(0);
 const [discountCents, setDiscountCents] = useState<number>(0);
 const [maxInstallments, setMaxInstallments] = useState<number>(1);
 const [validUntilDays, setValidUntilDays] = useState<number>(3);

 // 6. Distribuição de Quartos
 const [roomDistribution, setRoomDistribution] = useState<string>("");

 // Cálculos Automáticos
 const totalPax = Math.max(1, proposalData.adultsCount + proposalData.childrenCount);
 const basePriceCents = Math.round(costPerPersonCents * (1 + markupPercent / 100)) * totalPax;
 const totalPriceCents = Math.max(0, basePriceCents + (boardingTaxCents * totalPax) - discountCents);
 const installmentValueCents = Math.round(totalPriceCents / maxInstallments);

 // Inclusos e Não Inclusos
 const [includesText, setIncludesText] = useState(
 "• Passagens aéreas ida e volta com bagagem despachada\n• Hospedagem com regime All-Inclusive\n• Traslados privativos Aeroporto / Hotel / Aeroporto\n• Seguro viagem internacional completo com cobertura médica\n• Suporte 24h da agência via WhatsApp durante toda a viagem"
 );
 const [excludesText, setExcludesText] = useState(
 "• Despesas de caráter pessoal e passeios opcionais não citados\n• Taxas turísticas governamentais locais pagas no destino"
 );

 // Seleção Inteligente de Destino Canônico
 const handleSelectCanonicalDestination = (dest: CanonicalDestination) => {
 setSelectedCanonicalDest(dest);
 setDestinationIata(dest.iata);
 setProposalData((prev) => ({
 ...prev,
 destinationCity: dest.name,
 coverImageUrl: dest.coverImage,
 title: prev.title || `Pacote Completo: ${dest.name}`,
 subtitle: prev.subtitle || `Melhor temporada: ${dest.bestSeason} • Gastronomia e Lazer`,
 }));

 // Se não houver voos, cria automaticamente ida e volta canônica
 if (flights.length === 0) {
 setFlights([
 {
 id: crypto.randomUUID(),
 type: "outbound",
 airline_name: "Azul Linhas Aéreas",
 origin_iata: originIata,
 origin_city: originCity,
 destination_iata: dest.iata,
 destination_city: dest.city,
 departure_time: "08:30",
 arrival_time: "13:45",
 baggage_included: "1x 23kg despachada + 1x 10kg mão",
 cabin_class: "Econômica",
 stops_count: 1,
 },
 {
 id: crypto.randomUUID(),
 type: "return",
 airline_name: "Azul Linhas Aéreas",
 origin_iata: dest.iata,
 origin_city: dest.city,
 destination_iata: originIata,
 destination_city: originCity,
 departure_time: "15:20",
 arrival_time: "20:30",
 baggage_included: "1x 23kg despachada + 1x 10kg mão",
 cabin_class: "Econômica",
 stops_count: 1,
 },
 ]);
 }

 // Se não houver itinerário, gera dias com os destaques reais do destino
 if (itinerary.length === 0 && dest.highlights.length > 0) {
 handleGenerateItineraryFromDestination(dest);
 }
 };

 // Geração Automática de Roteiro Canônico
 const handleGenerateItineraryFromDestination = (targetDest?: CanonicalDestination) => {
 const dest = targetDest || selectedCanonicalDest;
 if (!dest) {
 toast.error("Selecione um destino primeiro para gerar o roteiro.");
 return;
 }

 const generatedDays: ItineraryDayDTO[] = [
 {
 id: crypto.randomUUID(),
 day_number: 1,
 title: `Dia 1 — Chegada em ${dest.city} & Recepção`,
 description: `Desembarque no aeroporto (${dest.iata}), transfer privativo até a hospedagem e check-in. Restante do dia livre para aclimatação e jantar de boas-vindas com especialidade local (${dest.gastronomyTip}).`,
 included_meals: ["Jantar de Boas-Vindas"],
 },
 ...dest.highlights.slice(0, 4).map((hl, i) => ({
 id: crypto.randomUUID(),
 day_number: i + 2,
 title: `Dia ${i + 2} — ${hl}`,
 description: `Passeio guiado e dia dedicado a explorar ${hl}. Experiência imersiva no destino com guia credenciado e paradas para fotos e culinária típica.`,
 included_meals: ["Café da Manhã"],
 })),
 {
 id: crypto.randomUUID(),
 day_number: Math.min(dest.highlights.length + 2, 6),
 title: `Dia ${Math.min(dest.highlights.length + 2, 6)} — Check-out & Voo de Retorno`,
 description: `Café da manhã na hospedagem, transfer in/out até o aeroporto (${dest.iata}) e embarque no voo com destino a ${originCity} (${originIata}).`,
 included_meals: ["Café da Manhã"],
 },
 ];

 setItinerary(generatedDays);
 toast.success(`Roteiro com ${generatedDays.length} dias gerado com base em ${dest.name}!`);
 };

 // Ações de Adição e Remoção
 const handleAddFlight = () => {
 const isOutbound = flights.length % 2 === 0;
 setFlights((prev) => [
 ...prev,
 {
 id: crypto.randomUUID(),
 type: isOutbound ? "outbound" : "return",
 airline_name: "Azul Linhas Aéreas",
 origin_iata: isOutbound ? originIata : (destinationIata || "DEST"),
 origin_city: isOutbound ? originCity : (proposalData.destinationCity || "Destino"),
 destination_iata: isOutbound ? (destinationIata || "DEST") : originIata,
 destination_city: isOutbound ? (proposalData.destinationCity || "Destino") : originCity,
 departure_time: isOutbound ? "08:30" : "16:00",
 arrival_time: isOutbound ? "13:45" : "21:15",
 baggage_included: "1x 23kg despachada + 1x 10kg mão",
 cabin_class: "Econômica",
 stops_count: 1,
 },
 ]);
 };

 const handleAddHotel = () => {
 setHotels((prev) => [
 ...prev,
 {
 id: crypto.randomUUID(),
 hotel_name: "Hotel Boutique Central",
 stars: 4,
 room_type: "Suíte Standard",
 board_basis: "breakfast",
 checkin_date: "",
 checkout_date: "",
 nights_count: 3,
 amenities: ["Wi-Fi", "Piscina", "Café da Manhã"],
 },
 ]);
 };

 const handleAddItineraryDay = () => {
 setItinerary((prev) => [
 ...prev,
 {
 id: crypto.randomUUID(),
 day_number: prev.length + 1,
 title: `Dia ${prev.length + 1} — Exploração & Lazer`,
 description: "Dia dedicado a passeios guiados, gastronomia local e compras.",
 included_meals: ["Café da Manhã"],
 },
 ]);
 };

 // Submissão & Criação no Banco
 const handleSaveProposal = async (openStudio: boolean = true) => {
 if (!proposalData.clientName.trim() || !proposalData.clientWhatsapp.trim()) {
 toast.error("Preencha o Nome e WhatsApp do Cliente.");
 setActiveTab("geral");
 return;
 }

 setIsSubmitting(true);
 try {
 // 1. Cria a proposta/orçamento no banco
 const res = await createTravelProposal({
 data: {
 clientName: proposalData.clientName,
 clientWhatsapp: proposalData.clientWhatsapp,
 title: proposalData.title,
 destinationCity: proposalData.destinationCity || "Destino Especial",
 },
 });

 if (!res?.id) throw new Error("Falha ao gerar ID do orçamento");

 // 2. Atualiza todos os dados detalhados (voos, hotéis, roteiro, financeiro)
 const validUntilDate = new Date();
 validUntilDate.setDate(validUntilDate.getDate() + validUntilDays);

 await updateTravelProposal({
 data: {
 id: res.id,
 patch: {
 title: proposalData.title,
 subtitle: proposalData.subtitle,
 cover_image_url: proposalData.coverImageUrl,
 client_name: proposalData.clientName,
 client_whatsapp: proposalData.clientWhatsapp,
 client_email: proposalData.clientEmail || null,
 destination_city: proposalData.destinationCity,
 travel_start_date: proposalData.travelStartDate || null,
 travel_end_date: proposalData.travelEndDate || null,
 adults_count: proposalData.adultsCount,
 children_count: proposalData.childrenCount,
 flights,
 hotels,
 itinerary,
 includes: includesText.split("\n").filter((l) => l.trim().length > 0),
 excludes: excludesText.split("\n").filter((l) => l.trim().length > 0),
 pricing: {
 currency,
 base_price_cents: basePriceCents,
 boarding_tax_cents: boardingTaxCents * totalPax,
 other_taxes_cents: 0,
 discount_cents: discountCents,
 total_price_cents: totalPriceCents,
 installments_options: [
 {
 installments_count: maxInstallments,
 installment_value_cents: installmentValueCents,
 method: "credit_card",
 has_interest: false,
 },
 {
 installments_count: 1,
 installment_value_cents: Math.round(totalPriceCents * 0.95),
 method: "pix",
 has_interest: false,
 },
 ],
 },
 valid_until: validUntilDate.toISOString(),
 status: "draft",
 },
 },
 });

 toast.success("Orçamento Travelos criado com sucesso!");

 if (openStudio) {
 navigate({
 to: "/workspace/turismo/propostas/$id",
 params: { id: res.id },
 });
 } else {
 navigate({
 to: "/workspace/orcamentos/$id",
 params: { id: res.id },
 });
 }
 } catch (err: any) {
 toast.error(err.message || "Erro ao salvar proposta.");
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <div className="flex flex-col gap-6 w-full">
 {/* Topo / Breadcrumb & Ações */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div className="flex items-center gap-3">
 <Button asChild variant="ghost" size="icon" className="rounded-xl size-9">
 <Link to="/workspace/orcamentos">
 <ArrowLeft className="size-4" />
 </Link>
 </Button>
 <div>
 <div className="flex items-center gap-2">
 <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-lg border-primary/30 text-primary bg-primary/10 font-bold">
 Travelos & TravelAgências Standard
 </Badge>
 <span className="text-xs text-muted-foreground font-mono">
 Total: {formatMoney(totalPriceCents)}
 </span>
 </div>
 <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
 Novo Orçamento & Roteiro sob Medida
 </h1>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <Button
 onClick={() => handleSaveProposal(false)}
 disabled={isSubmitting}
 variant="outline"
 className="h-10 rounded-xl text-xs font-bold gap-1.5"
 >
 <span>Salvar Rascunho</span>
 </Button>
 <Button
 onClick={() => handleSaveProposal(true)}
 disabled={isSubmitting}
 className="h-10 rounded-xl text-xs font-bold gap-2 bg-primary text-primary-foreground shadow-sm cursor-pointer"
 >
 <FileSpreadsheet className="size-4" />
 <span>Salvar & Abrir Lâmina Visual</span>
 <ArrowRight className="size-4" />
 </Button>
 </div>
 </div>

 {/* Abas do Construtor Travelos */}
 <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full space-y-6">
 <TabsList className="flex items-center gap-1.5 w-full overflow-x-auto no-scrollbar p-1 bg-muted/60 rounded-2xl h-12">
 <TabsTrigger value="geral" className="rounded-xl font-bold text-xs gap-1.5 whitespace-nowrap shrink-0 px-3.5 h-10">
 <User className="size-3.5" />
 <span>1. Cliente & Destino</span>
 </TabsTrigger>
 <TabsTrigger value="voos" className="rounded-xl font-bold text-xs gap-1.5 whitespace-nowrap shrink-0 px-3.5 h-10">
 <Plane className="size-3.5" />
 <span>2. Aéreo & Voos ({flights.length})</span>
 </TabsTrigger>
 <TabsTrigger value="hospedagem" className="rounded-xl font-bold text-xs gap-1.5 whitespace-nowrap shrink-0 px-3.5 h-10">
 <Building2 className="size-3.5" />
 <span>3. Hotéis ({hotels.length})</span>
 </TabsTrigger>
 <TabsTrigger value="roteiro" className="rounded-xl font-bold text-xs gap-1.5 whitespace-nowrap shrink-0 px-3.5 h-10">
 <Compass className="size-3.5" />
 <span>4. Roteiro Dia a Dia ({itinerary.length})</span>
 </TabsTrigger>
 <TabsTrigger value="financeiro" className="rounded-xl font-bold text-xs gap-1.5 whitespace-nowrap shrink-0 px-3.5 h-10">
 <DollarSign className="size-3.5" />
 <span>5. Financeiro & Lâmina</span>
 </TabsTrigger>
 </TabsList>

 {/* ─── ABA 1: CLIENTE & DESTINO ─── */}
 <TabsContent value="geral" className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* Bloco Cliente */}
 <div className="p-6 rounded-2xl bg-card border border-border/80 space-y-4">
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <User className="size-4 text-primary" />
 <span>Passageiro Principal / Contratante</span>
 </h3>
 <div className="space-y-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Nome Completo *</Label>
 <Input
 value={proposalData.clientName}
 onChange={(e) => setProposalData({ ...proposalData, clientName: e.target.value })}
 placeholder="Ex: Carlos Eduardo Silva"
 className="h-10 rounded-xl text-xs"
 required
 />
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">WhatsApp / Celular *</Label>
 <Input
 value={proposalData.clientWhatsapp}
 onChange={(e) => setProposalData({ ...proposalData, clientWhatsapp: e.target.value })}
 placeholder="Ex: (11) 99999-8888"
 className="h-10 rounded-xl text-xs font-mono"
 required
 />
 </div>
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">E-mail (Opcional)</Label>
 <Input
 type="email"
 value={proposalData.clientEmail}
 onChange={(e) => setProposalData({ ...proposalData, clientEmail: e.target.value })}
 placeholder="cliente@email.com"
 className="h-10 rounded-xl text-xs"
 />
 </div>
 </div>
 </div>
 </div>

 {/* Bloco Destino e Datas */}
 <div className="p-6 rounded-2xl bg-card border border-border/80 space-y-4">
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <MapPin className="size-4 text-primary" />
 <span>Destino & Configuração da Viagem</span>
 </h3>
 <div className="space-y-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Título da Proposta *</Label>
 <Input
 value={proposalData.title}
 onChange={(e) => setProposalData({ ...proposalData, title: e.target.value })}
 placeholder="Ex: Férias em Cancún & Riviera Maya All-Inclusive"
 className="h-10 rounded-xl text-xs font-bold"
 />
 </div>
 <div className="space-y-1.5">
 <div className="flex items-center justify-between">
 <Label className="text-xs font-bold">Cidade / Destino Principal *</Label>
 {destinationIata && (
 <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30 font-bold">
 ✈️ Gateway: {destinationIata}
 </Badge>
 )}
 </div>
 <Input
 value={proposalData.destinationCity}
 onChange={(e) => {
 const val = e.target.value;
 setProposalData({ ...proposalData, destinationCity: val });
 const match = CANONICAL_DESTINATIONS.find(
 (d) => d.name.toLowerCase() === val.toLowerCase() || d.city.toLowerCase() === val.toLowerCase()
 );
 if (match) handleSelectCanonicalDestination(match);
 }}
 placeholder="Ex: Maceió & Maragogi, AL ou Cancún"
 className="h-10 rounded-xl text-xs font-bold"
 required
 />

 {/* Chips Rápidos do Catálogo Canônico */}
 <div className="space-y-1 pt-1">
 <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
 Destinos Populares (1 Toque com Voos & Roteiro):
 </span>
 <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar pr-1">
 {CANONICAL_DESTINATIONS.slice(0, 12).map((dest) => (
 <button
 key={dest.id}
 type="button"
 onClick={() => handleSelectCanonicalDestination(dest)}
 className={cn(
 "text-[10px] font-medium px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5",
 destinationIata === dest.iata || proposalData.destinationCity === dest.name
 ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
 : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
 )}
 >
 <span>{dest.name}</span>
 <span
 className={cn(
 "text-[8px] font-mono font-black px-1 rounded",
 destinationIata === dest.iata || proposalData.destinationCity === dest.name
 ? "bg-white/20 text-white"
 : "bg-muted text-foreground"
 )}
 >
 {dest.iata}
 </span>
 </button>
 ))}
 </div>
 </div>

 {/* Card Inteligente do Destino */}
 {selectedCanonicalDest && (
 <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5 mt-2 animate-in fade-in duration-150">
 <div className="flex items-center gap-2.5">
 <img
 src={selectedCanonicalDest.coverImage}
 alt={selectedCanonicalDest.name}
 className="size-10 rounded-lg object-cover border border-border/60 shrink-0"
 />
 <div className="min-w-0 flex-1">
 <div className="flex items-center gap-1.5">
 <h4 className="text-xs font-bold text-foreground truncate">{selectedCanonicalDest.name}</h4>
 <Badge variant="secondary" className="text-[8px] font-mono font-bold bg-primary/10 text-primary">
 {selectedCanonicalDest.iata} • {selectedCanonicalDest.state}
 </Badge>
 </div>
 <p className="text-[10px] text-primary font-medium">
 ☀️ <strong>Melhor época:</strong> {selectedCanonicalDest.bestSeason}
 </p>
 <p className="text-[10px] text-muted-foreground line-clamp-1">
 🍽️ {selectedCanonicalDest.gastronomyTip}
 </p>
 </div>
 </div>
 </div>
 )}
 </div>
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Foto de Capa da Proposta de Viagem</Label>
 <ImageUpload
 value={proposalData.coverImageUrl}
 onChange={(url) => setProposalData({ ...proposalData, coverImageUrl: url })}
 onRemove={() => setProposalData({ ...proposalData, coverImageUrl: "" })}
 bucket="cms-media"
 aspectPreset="widescreen"
 helperText="Foto panorâmica de capa da proposta que o cliente verá (16:9)"
 />
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Data de Ida</Label>
 <Input
 type="date"
 value={proposalData.travelStartDate}
 onChange={(e) => setProposalData({ ...proposalData, travelStartDate: e.target.value })}
 className="h-10 rounded-xl text-xs font-mono"
 />
 </div>
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Data de Retorno</Label>
 <Input
 type="date"
 value={proposalData.travelEndDate}
 onChange={(e) => setProposalData({ ...proposalData, travelEndDate: e.target.value })}
 className="h-10 rounded-xl text-xs font-mono"
 />
 </div>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Adultos (Pagantes)</Label>
 <Input
 type="number"
 min={1}
 value={proposalData.adultsCount}
 onChange={(e) => setProposalData({ ...proposalData, adultsCount: Number(e.target.value) || 1 })}
 className="h-10 rounded-xl text-xs font-mono"
 />
 </div>
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Crianças (CHD)</Label>
 <Input
 type="number"
 min={0}
 value={proposalData.childrenCount}
 onChange={(e) => setProposalData({ ...proposalData, childrenCount: Number(e.target.value) || 0 })}
 className="h-10 rounded-xl text-xs font-mono"
 />
 </div>
 </div>
 </div>
 </div>
 </div>
 </TabsContent>

 {/* ─── ABA 2: VOOS & AÉREO ─── */}
 <TabsContent value="voos" className="space-y-4">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-base font-bold text-foreground">Malha Aérea & Trechos de Voo</h3>
 <p className="text-xs text-muted-foreground">Adicione voos de ida, volta e conexões com horários e bagagem inclusa.</p>
 </div>
 <Button onClick={handleAddFlight} variant="outline" size="sm" className="rounded-xl text-xs font-bold gap-1.5">
 <Plus className="size-3.5" />
 <span>Adicionar Trecho</span>
 </Button>
 </div>

 {flights.map((flight, idx) => (
 <div key={flight.id} className="p-5 rounded-2xl bg-card border border-border/80 space-y-4">
 <div className="flex items-center justify-between border-b border-border/60 pb-3">
 <div className="flex items-center gap-2">
 <Badge variant="secondary" className="text-xs font-bold px-2 py-0.5 rounded-lg">
 Trecho {idx + 1}: {flight.type === "outbound" ? "Ida" : flight.type === "return" ? "Volta" : "Interno"}
 </Badge>
 <span className="text-xs font-bold text-foreground">{flight.airline_name}</span>
 </div>
 {flights.length > 1 && (
 <Button
 onClick={() => setFlights((prev) => prev.filter((f) => f.id !== flight.id))}
 variant="ghost"
 size="icon"
 className="size-8 text-destructive hover:bg-destructive/10 rounded-lg"
 >
 <Trash2 className="size-3.5" />
 </Button>
 )}
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Cia Aérea</Label>
 <Input
 value={flight.airline_name}
 onChange={(e) => {
 const val = e.target.value;
 setFlights((prev) => prev.map((f) => (f.id === flight.id ? { ...f, airline_name: val } : f)));
 }}
 placeholder="LATAM / Gol / Azul / TAP"
 className="h-9 rounded-xl text-xs"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Nº do Voo</Label>
 <Input
 value={flight.flight_number || ""}
 onChange={(e) => {
 const val = e.target.value;
 setFlights((prev) => prev.map((f) => (f.id === flight.id ? { ...f, flight_number: val } : f)));
 }}
 placeholder="LA8100"
 className="h-9 rounded-xl text-xs font-mono"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Origem (IATA / Cidade)</Label>
 <Input
 value={`${flight.origin_iata} - ${flight.origin_city}`}
 onChange={(e) => {
 const [iata, city] = e.target.value.split("-");
 setFlights((prev) =>
 prev.map((f) =>
 f.id === flight.id ? { ...f, origin_iata: (iata || "").trim(), origin_city: (city || "").trim() } : f
 )
 );
 }}
 placeholder="GRU - São Paulo"
 className="h-9 rounded-xl text-xs"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Destino (IATA / Cidade)</Label>
 <Input
 value={`${flight.destination_iata} - ${flight.destination_city}`}
 onChange={(e) => {
 const [iata, city] = e.target.value.split("-");
 setFlights((prev) =>
 prev.map((f) =>
 f.id === flight.id ? { ...f, destination_iata: (iata || "").trim(), destination_city: (city || "").trim() } : f
 )
 );
 }}
 placeholder="CUN - Cancún"
 className="h-9 rounded-xl text-xs"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Horário de Partida & Chegada</Label>
 <div className="flex items-center gap-2">
 <Input
 value={flight.departure_time}
 onChange={(e) => {
 const val = e.target.value;
 setFlights((prev) => prev.map((f) => (f.id === flight.id ? { ...f, departure_time: val } : f)));
 }}
 placeholder="08:30"
 className="h-9 rounded-xl text-xs font-mono"
 />
 <span>➔</span>
 <Input
 value={flight.arrival_time}
 onChange={(e) => {
 const val = e.target.value;
 setFlights((prev) => prev.map((f) => (f.id === flight.id ? { ...f, arrival_time: val } : f)));
 }}
 placeholder="14:45"
 className="h-9 rounded-xl text-xs font-mono"
 />
 </div>
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Franquia de Bagagem</Label>
 <Input
 value={typeof flight.baggage_included === "string" ? flight.baggage_included : flight.baggage_included ? "Inclusa" : ""}
 onChange={(e) => {
 const val = e.target.value;
 setFlights((prev) => prev.map((f) => (f.id === flight.id ? { ...f, baggage_included: val } : f)));
 }}
 placeholder="1x 23kg despachada + 10kg mão"
 className="h-9 rounded-xl text-xs"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Classe da Cabine</Label>
 <Select
 value={flight.cabin_class || "Econômica"}
 onValueChange={(val) =>
 setFlights((prev) => prev.map((f) => (f.id === flight.id ? { ...f, cabin_class: val } : f)))
 }
 >
 <SelectTrigger className="h-9 rounded-xl text-xs">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="Econômica">Econômica</SelectItem>
 <SelectItem value="Premium Economy">Premium Economy</SelectItem>
 <SelectItem value="Executiva (Business)">Executiva (Business)</SelectItem>
 <SelectItem value="Primeira Classe">Primeira Classe</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 </div>
 ))}
 </TabsContent>

 {/* ─── ABA 3: HOSPEDAGEM ─── */}
 <TabsContent value="hospedagem" className="space-y-4">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-base font-bold text-foreground">Hospedagem, Resorts & Hotéis</h3>
 <p className="text-xs text-muted-foreground">Cadastre as opções de hotel com regime de alimentação e noites.</p>
 </div>
 <Button onClick={handleAddHotel} variant="outline" size="sm" className="rounded-xl text-xs font-bold gap-1.5">
 <Plus className="size-3.5" />
 <span>Adicionar Hotel</span>
 </Button>
 </div>

 {hotels.map((hotel, idx) => (
 <div key={hotel.id} className="p-5 rounded-2xl bg-card border border-border/80 space-y-4">
 <div className="flex items-center justify-between border-b border-border/60 pb-3">
 <div className="flex items-center gap-2">
 <Badge variant="secondary" className="text-xs font-bold px-2 py-0.5 rounded-lg">
 Opção {idx + 1}
 </Badge>
 <span className="text-xs font-bold text-foreground">{hotel.hotel_name}</span>
 <span className="text-xs text-amber-500">{"★".repeat(hotel.stars || 5)}</span>
 </div>
 {hotels.length > 1 && (
 <Button
 onClick={() => setHotels((prev) => prev.filter((h) => h.id !== hotel.id))}
 variant="ghost"
 size="icon"
 className="size-8 text-destructive hover:bg-destructive/10 rounded-lg"
 >
 <Trash2 className="size-3.5" />
 </Button>
 )}
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Nome do Hotel / Resort</Label>
 <Input
 value={hotel.hotel_name}
 onChange={(e) => {
 const val = e.target.value;
 setHotels((prev) => prev.map((h) => (h.id === hotel.id ? { ...h, hotel_name: val } : h)));
 }}
 placeholder="Ex: Hard Rock Hotel Cancún"
 className="h-9 rounded-xl text-xs font-bold"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Tipo de Quarto / Acomodação</Label>
 <Input
 value={hotel.room_type}
 onChange={(e) => {
 const val = e.target.value;
 setHotels((prev) => prev.map((h) => (h.id === hotel.id ? { ...h, room_type: val } : h)));
 }}
 placeholder="Ex: Deluxe Vista Mar King"
 className="h-9 rounded-xl text-xs"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Regime de Alimentação</Label>
 <Select
 value={hotel.board_basis}
 onValueChange={(val: any) =>
 setHotels((prev) => prev.map((h) => (h.id === hotel.id ? { ...h, board_basis: val } : h)))
 }
 >
 <SelectTrigger className="h-9 rounded-xl text-xs">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all_inclusive">All-Inclusive (Tudo Incluso)</SelectItem>
 <SelectItem value="breakfast">Café da Manhã Incluso</SelectItem>
 <SelectItem value="half_board">Meia Pensão (Café + Jantar)</SelectItem>
 <SelectItem value="full_board">Pensão Completa (Café + Almoço + Jantar)</SelectItem>
 <SelectItem value="none">Apenas Hospedagem</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Foto de Capa do Hotel</Label>
 <ImageUpload
 value={hotel.image_url}
 onChange={(url) => setHotels((prev) => prev.map((h) => (h.id === hotel.id ? { ...h, image_url: url } : h)))}
 onRemove={() => setHotels((prev) => prev.map((h) => (h.id === hotel.id ? { ...h, image_url: "" } : h)))}
 bucket="cms-media"
 aspectPreset="widescreen"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Número de Noites</Label>
 <Input
 type="number"
 min={1}
 value={hotel.nights_count}
 onChange={(e) => {
 const val = Number(e.target.value) || 1;
 setHotels((prev) => prev.map((h) => (h.id === hotel.id ? { ...h, nights_count: val } : h)));
 }}
 className="h-9 rounded-xl text-xs font-mono"
 />
 </div>
 </div>
 </div>
 ))}
 </TabsContent>

 {/* ─── ABA 4: ROTEIRO DIA A DIA ─── */}
 <TabsContent value="roteiro" className="space-y-4">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-base font-bold text-foreground">Roteiro Visual & Itinerário Dia a Dia</h3>
 <p className="text-xs text-muted-foreground">Monte o cronograma diário com fotos dos pontos turísticos e atividades.</p>
 </div>
 <div className="flex items-center gap-2">
 {selectedCanonicalDest && (
 <Button
 type="button"
 onClick={() => handleGenerateItineraryFromDestination()}
 size="sm"
 className="rounded-xl text-xs font-bold gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 cursor-pointer"
 >
 <Compass className="size-3.5" />
 <span>Gerar Roteiro Sugerido ({selectedCanonicalDest.name})</span>
 </Button>
 )}
 <Button onClick={handleAddItineraryDay} variant="outline" size="sm" className="rounded-xl text-xs font-bold gap-1.5">
 <Plus className="size-3.5" />
 <span>Adicionar Dia</span>
 </Button>
 </div>
 </div>

 <div className="space-y-3">
 {itinerary.map((day, idx) => (
 <div key={day.id} className="p-5 rounded-2xl bg-card border border-border/80 space-y-3">
 <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
 <Badge variant="outline" className="text-xs font-bold px-2 py-0.5 rounded-lg border-primary/30 text-primary bg-primary/10">
 Dia {idx + 1}
 </Badge>
 {itinerary.length > 1 && (
 <Button
 onClick={() => setItinerary((prev) => prev.filter((d) => d.id !== day.id))}
 variant="ghost"
 size="icon"
 className="size-8 text-destructive hover:bg-destructive/10 rounded-lg"
 >
 <Trash2 className="size-3.5" />
 </Button>
 )}
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Título do Dia</Label>
 <Input
 value={day.title}
 onChange={(e) => {
 const val = e.target.value;
 setItinerary((prev) => prev.map((d) => (d.id === day.id ? { ...d, title: val } : d)));
 }}
 placeholder="Ex: Passeio em Chichén Itzá & Cenotes Sagrados"
 className="h-9 rounded-xl text-xs font-bold"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Foto de Destaque da Atração</Label>
 <ImageUpload
 value={day.image_url}
 onChange={(url) => setItinerary((prev) => prev.map((d) => (d.id === day.id ? { ...d, image_url: url } : d)))}
 onRemove={() => setItinerary((prev) => prev.map((d) => (d.id === day.id ? { ...d, image_url: "" } : d)))}
 bucket="cms-media"
 aspectPreset="widescreen"
 />
 </div>
 </div>

 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Descrição da Experiência</Label>
 <Textarea
 value={day.description}
 onChange={(e) => {
 const val = e.target.value;
 setItinerary((prev) => prev.map((d) => (d.id === day.id ? { ...d, description: val } : d)));
 }}
 placeholder="Descreva as atividades, horários de saída, paradas e dicas..."
 className="rounded-xl text-xs min-h-[60px]"
 />
 </div>
 </div>
 ))}
 </div>
 </TabsContent>

 {/* ─── ABA 5: FINANCEIRO & LÂMINA ─── */}
 <TabsContent value="financeiro" className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* Bloco de Valores e Margem */}
 <div className="p-6 rounded-2xl bg-card border border-border/80 space-y-4">
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <DollarSign className="size-4 text-emerald-600" />
 <span>Composição de Custos & Margem de Lucro</span>
 </h3>

 <div className="space-y-3">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Moeda Base</Label>
 <Select value={currency} onValueChange={(val: any) => setCurrency(val)}>
 <SelectTrigger className="h-10 rounded-xl text-xs font-bold">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="BRL">Real Brasileiro (BRL R$)</SelectItem>
 <SelectItem value="USD">Dólar Americano (USD $)</SelectItem>
 <SelectItem value="EUR">Euro (EUR €)</SelectItem>
 </SelectContent>
 </Select>
 </div>
 {currency !== "BRL" && (
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Câmbio Travado</Label>
 <Input
 type="number"
 step="0.01"
 value={exchangeRate}
 onChange={(e) => setExchangeRate(Number(e.target.value) || 1)}
 className="h-10 rounded-xl text-xs font-mono"
 />
 </div>
 )}
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Custo / Pessoa (R$)</Label>
 <Input
 type="number"
 value={costPerPersonCents / 100}
 onChange={(e) => setCostPerPersonCents(Math.round(Number(e.target.value) * 100) || 0)}
 className="h-10 rounded-xl text-xs font-mono font-bold"
 />
 </div>
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Margem / Markup (%)</Label>
 <Input
 type="number"
 value={markupPercent}
 onChange={(e) => setMarkupPercent(Number(e.target.value) || 0)}
 className="h-10 rounded-xl text-xs font-mono font-bold text-emerald-600"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Taxas de Embarque / Pessoa</Label>
 <Input
 type="number"
 value={boardingTaxCents / 100}
 onChange={(e) => setBoardingTaxCents(Math.round(Number(e.target.value) * 100) || 0)}
 className="h-10 rounded-xl text-xs font-mono"
 />
 </div>
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Desconto Geral (R$)</Label>
 <Input
 type="number"
 value={discountCents / 100}
 onChange={(e) => setDiscountCents(Math.round(Number(e.target.value) * 100) || 0)}
 className="h-10 rounded-xl text-xs font-mono text-destructive"
 />
 </div>
 </div>

 <div className="p-4 rounded-2xl bg-muted/50 border border-border/50 space-y-2 text-xs">
 <div className="flex justify-between">
 <span className="text-muted-foreground">Passageiros:</span>
 <span className="font-bold">{totalPax} pessoa(s)</span>
 </div>
 <div className="flex justify-between">
 <span className="text-muted-foreground">Valor por Passageiro:</span>
 <span className="font-bold">{formatMoney(Math.round(totalPriceCents / totalPax))}</span>
 </div>
 <div className="flex justify-between text-sm font-black pt-2 border-t border-border/60">
 <span className="text-foreground">Total do Pacote:</span>
 <span className="text-primary">{formatMoney(totalPriceCents)}</span>
 </div>
 <div className="flex justify-between text-[11px] text-muted-foreground">
 <span>Opção Parcelada:</span>
 <span className="font-mono">{maxInstallments}x de {formatMoney(installmentValueCents)} sem juros</span>
 </div>
 </div>
 </div>
 </div>

 {/* Inclusos e Condições */}
 <div className="p-6 rounded-2xl bg-card border border-border/80 space-y-4">
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <FileCheck2 className="size-4 text-primary" />
 <span>Itens Inclusos & Termos</span>
 </h3>

 <div className="space-y-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Itens Inclusos no Pacote</Label>
 <Textarea
 value={includesText}
 onChange={(e) => setIncludesText(e.target.value)}
 className="rounded-xl text-xs min-h-[90px] font-mono leading-relaxed"
 />
 </div>
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Itens Não Inclusos</Label>
 <Textarea
 value={excludesText}
 onChange={(e) => setExcludesText(e.target.value)}
 className="rounded-xl text-xs min-h-[60px] font-mono leading-relaxed"
 />
 </div>
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Validade da Cotação (Dias)</Label>
 <Input
 type="number"
 min={1}
 max={30}
 value={validUntilDays}
 onChange={(e) => setValidUntilDays(Number(e.target.value) || 3)}
 className="h-10 rounded-xl text-xs font-mono"
 />
 </div>
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Distribuição de Quartos (Acomodação)</Label>
 <Input
 value={roomDistribution}
 onChange={(e) => setRoomDistribution(e.target.value)}
 placeholder="Ex: 1 Quarto Duplo + 1 Quarto Triplo (Família)"
 className="h-10 rounded-xl text-xs"
 />
 <p className="text-[11px] text-muted-foreground">Detalhamento de quartos para o template do WhatsApp</p>
 </div>
 </div>
 </div>
 </div>

 {/* ─── AÇÃO DE SHARE WHATSAPP ─── */}
 <div className="p-5 rounded-2xl bg-card border border-border/80 space-y-3">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <span className="size-4 text-emerald-600 flex items-center justify-center text-sm">💬</span>
 <span>Compartilhar Cotação via WhatsApp</span>
 </div>
 <p className="text-[11px] text-muted-foreground leading-relaxed">
 Gere um template profissional de proposta turística e envie diretamente para o cliente via WhatsApp.
 O template inclui destino, datas, passageiros, hotéis, voos, valores e condições de pagamento.
 </p>
 <div className="flex flex-wrap gap-2">
 <button
 type="button"
 onClick={() => {
 const clientName = proposalData.clientName || 'Cliente';
 const dest = proposalData.destinationCity || selectedCanonicalDest?.name || 'Destino Especial';
 const startDate = proposalData.travelStartDate ? new Date(proposalData.travelStartDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
 const endDate = proposalData.travelEndDate ? new Date(proposalData.travelEndDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
 const adultsLabel = proposalData.adultsCount > 0 ? `${proposalData.adultsCount} adulto${proposalData.adultsCount > 1 ? 's' : ''}` : '';
 const childrenLabel = proposalData.childrenCount > 0 ? ` + ${proposalData.childrenCount} criança${proposalData.childrenCount > 1 ? 's' : ''}` : '';
 const paxLine = `${adultsLabel}${childrenLabel} (${totalPax} PAX)`;
 const flightLines = flights.length > 0
 ? flights.map(f => `   ✈ ${f.type === 'outbound' ? 'Ida' : f.type === 'return' ? 'Volta' : 'Conexão'}: ${f.origin_iata} → ${f.destination_iata} | ${f.airline_name} | ${f.departure_time} – ${f.arrival_time}${f.baggage_included ? ` | Bagagem: ${f.baggage_included}` : ''}`).join('\n')
 : '   Voos a confirmar';
 const hotelLines = hotels.length > 0
 ? hotels.map(h => `   🏨 ${h.hotel_name} (${h.stars ? '★'.repeat(h.stars) : ''}) | ${h.nights_count || 1} noite${(h.nights_count || 1) > 1 ? 's' : ''} | ${h.board_basis === 'all_inclusive' ? 'All-Inclusive' : h.board_basis === 'breakfast' ? 'Café da Manhã' : h.board_basis === 'half_board' ? 'Meia Pensão' : 'Hospedagem'}`).join('\n')
 : '   Hotel a confirmar';
 const pixPrice = Math.round(totalPriceCents * 0.95);
 const installLine = maxInstallments > 1 ? `   💳 Parcelado: ${maxInstallments}x de ${formatMoney(installmentValueCents)} sem juros` : '';

 const lines = [
 `✨ *PROPOSTA EXCLUSIVA — ${proposalData.title || `Pacote ${dest}`}* ✨`,
 ``,
 `Olá, *${clientName.split(' ')[0]}*! Segue seu roteiro personalizado:`,
 ``,
 `📍 *Destino:* ${dest}`,
 startDate ? `📅 *Período:* ${startDate}${endDate ? ` até ${endDate}` : ''}` : '',
 `👥 *Passageiros:* ${paxLine}`,
 roomDistribution ? `🛏️ *Quartos:* ${roomDistribution}` : '',
 ``,
 `✈️ *AÉREO*`,
 flightLines,
 ``,
 `🏨 *HOSPEDAGEM*`,
 hotelLines,
 ``,
 `💰 *VALORES DO PACOTE*`,
 `   👤 Por pessoa: ${formatMoney(Math.round(totalPriceCents / totalPax))}`,
 `   📦 Total do Pacote: *${formatMoney(totalPriceCents)}*`,
 `   ⚡ À Vista via Pix (5% OFF): *${formatMoney(pixPrice)}*`,
 installLine,
 ``,
 `📌 *INCLUSO:*`,
 ...includesText.split('\n').filter(l => l.trim()).map(l => `   ${l}`),
 ``,
 `📌 *NÃO INCLUSO:*`,
 ...excludesText.split('\n').filter(l => l.trim()).map(l => `   ${l}`),
 ``,
 `⏳ *Proposta válida por ${validUntilDays} dias.*`,
 ``,
 `Entre em contato para confirmar disponibilidade e reservar sua viagem! 🌎`,
 ].filter(l => l !== '').join('\n');

 const phone = proposalData.clientWhatsapp?.replace(/\D/g, '');
 const msg = encodeURIComponent(lines);
 if (phone) {
 window.open(`https://wa.me/55${phone}?text=${msg}`, '_blank');
 } else {
 window.open(`https://wa.me/?text=${msg}`, '_blank');
 }
 }}
 className="h-10 px-5 rounded-xl text-xs font-bold flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs"
 >
 <span>💬</span>
 <span>Enviar Proposta via WhatsApp</span>
 </button>

 <button
 type="button"
 onClick={() => {
 const clientName = proposalData.clientName || 'Cliente';
 const dest = proposalData.destinationCity || selectedCanonicalDest?.name || 'Destino Especial';
 const pixPrice = Math.round(totalPriceCents * 0.95);
 const installLine = maxInstallments > 1 ? ` | ${maxInstallments}x de ${formatMoney(installmentValueCents)} s/j` : '';
 const paxLine = `${totalPax} PAX${roomDistribution ? ` | ${roomDistribution}` : ''}`;

 const text = [
 `✨ *${proposalData.title || `Pacote ${dest}`}*`,
 `📍 ${dest} | 👥 ${paxLine}`,
 `💰 Total: *${formatMoney(totalPriceCents)}* | Pix: *${formatMoney(pixPrice)}*${installLine}`,
 `⏳ Válida por ${validUntilDays} dias.`,
 `Para mais detalhes, responda esta mensagem! 😊`,
 ].join('\n');

 navigator.clipboard?.writeText(text);
 toast.success('Texto copiado! Cole no WhatsApp, e-mail ou onde quiser.');
 }}
 className="h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2 bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition-colors cursor-pointer"
 >
 <span>📋</span>
 <span>Copiar Resumo</span>
 </button>
 </div>
 </div>
 </TabsContent>
 </Tabs>
 </div>
 );
}

interface QuoteLineItem {
 id: string;
 item_type: "product_variant" | "service" | "rental_equipment" | "manual_item";
 name: string;
 description: string;
 sku: string;
 unit_price_cents: number;
 quantity: number;
 discount_cents: number;
 product_variant_id?: string;
 image_url?: string;
}

function NovoOrcamentoComercialUniversalPage({ store }: { store?: any }) {
 const navigate = useNavigate();
 const [isSubmitting, setIsSubmitting] = useState(false);

 // Cliente & Vínculo CRM
 const [customerId, setCustomerId] = useState<string | null>(null);
 const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
 const [clientSearch, setClientSearch] = useState("");
 const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
 const [customerData, setCustomerData] = useState({
 name: "",
 email: "",
 phone: "",
 document: "",
 });

 // Busca de clientes no CRM em tempo real
 const { data: crmCustomers = [], isLoading: isLoadingCustomers } = useQuery({
 queryKey: ["crm-customers-search", clientSearch],
 queryFn: () => listCustomers({ data: { query: clientSearch.trim() } }),
 enabled: clientSearch.trim().length >= 1,
 staleTime: 30_000,
 });

 // Catálogo de Produtos da Loja
 const { data: catalogProducts = [], isLoading: isLoadingCatalog } = useQuery({
 queryKey: ["admin-products-catalog"],
 queryFn: () => listAdminProducts(),
 staleTime: 60_000,
 });

 // Modal do Catálogo
 const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
 const [catalogSearch, setCatalogSearch] = useState("");
 const [catalogCategory, setCatalogCategory] = useState("all");
 const [targetLineItemId, setTargetLineItemId] = useState<string | null>(null);

 // Condições & Termos
 const [conditions, setConditions] = useState("");
 const [internalNotes, setInternalNotes] = useState("");
 const [validUntilDays, setValidUntilDays] = useState(7);

 // Itens do Orçamento
 const [items, setItems] = useState<QuoteLineItem[]>([
 {
 id: crypto.randomUUID(),
 item_type: "manual_item",
 name: "",
 description: "",
 sku: "",
 unit_price_cents: 0,
 quantity: 1,
 discount_cents: 0,
 },
 ]);

 // Categorias do Catálogo
 const catalogCategories = Array.from(
 new Set(
 catalogProducts
 .map((p: any) => p.product_types?.name || p.category_name)
 .filter(Boolean),
 ),
 );

 const filteredCatalog = catalogProducts.filter((p: any) => {
 if (p.status === "archived") return false;
 if (catalogCategory !== "all") {
 const cat = p.product_types?.name || p.category_name;
 if (cat !== catalogCategory) return false;
 }
 if (!catalogSearch.trim()) return true;
 const q = catalogSearch.toLowerCase();
 return (
 p.title.toLowerCase().includes(q) ||
 (p.brand && p.brand.toLowerCase().includes(q)) ||
 (p.product_variants &&
 p.product_variants.some((v: any) => v.sku && v.sku.toLowerCase().includes(q)))
 );
 });

 const handleSelectCustomer = (c: any) => {
 setCustomerId(c.id);
 setSelectedCustomer(c);
 setCustomerData({
 name: c.full_name || c.legal_name || "",
 email: c.email || "",
 phone: c.phone || "",
 document: c.document || "",
 });
 setIsClientDropdownOpen(false);
 setClientSearch("");
 toast.success(`Cliente ${c.full_name || c.legal_name} vinculado ao orçamento!`);
 };

 const handleUnlinkCustomer = () => {
 setCustomerId(null);
 setSelectedCustomer(null);
 toast.info("Cliente desvinculado do CRM. Dados manuais mantidos.");
 };

 const handleOpenCatalogForNewItem = () => {
 setTargetLineItemId(null);
 setIsCatalogModalOpen(true);
 };

 const handleOpenCatalogForExistingItem = (lineId: string) => {
 setTargetLineItemId(lineId);
 setIsCatalogModalOpen(true);
 };

 const handleSelectProduct = (product: any, variant?: any) => {
 const chosenVariant = variant || product.product_variants?.[0];
 const unitPrice =
 chosenVariant?.price_override_cents ?? product.price_cents ?? 0;
 const sku = chosenVariant?.sku || "";
 const imageUrl = product.product_media?.[0]?.url || "";

 if (targetLineItemId) {
 setItems((prev) =>
 prev.map((i) =>
 i.id === targetLineItemId
 ? {
 ...i,
 item_type: "product_variant",
 name: product.title,
 sku: sku,
 unit_price_cents: unitPrice,
 product_variant_id: chosenVariant?.id,
 image_url: imageUrl,
 }
 : i,
 ),
 );
 } else {
 setItems((prev) => [
 ...prev,
 {
 id: crypto.randomUUID(),
 item_type: "product_variant",
 name: product.title,
 description: "",
 sku: sku,
 unit_price_cents: unitPrice,
 quantity: 1,
 discount_cents: 0,
 product_variant_id: chosenVariant?.id,
 image_url: imageUrl,
 },
 ]);
 }

 setIsCatalogModalOpen(false);
 setTargetLineItemId(null);
 toast.success(`"${product.title}" adicionado aos itens!`);
 };

 const handleAddItem = () => {
 setItems((prev) => [
 ...prev,
 {
 id: crypto.randomUUID(),
 item_type: "manual_item",
 name: "",
 description: "",
 sku: "",
 unit_price_cents: 0,
 quantity: 1,
 discount_cents: 0,
 },
 ]);
 };

 const handleRemoveItem = (id: string) => {
 if (items.length <= 1) {
 toast.error("O orçamento precisa de ao menos 1 item.");
 return;
 }
 setItems((prev) => prev.filter((i) => i.id !== id));
 };

 const handleUpdateItem = (id: string, updates: Partial<QuoteLineItem>) => {
 setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
 };

 // Cálculos
 const subtotalCents = items.reduce((acc, i) => acc + i.unit_price_cents * i.quantity, 0);
 const totalDiscountCents = items.reduce((acc, i) => acc + i.discount_cents, 0);
 const totalCents = Math.max(0, subtotalCents - totalDiscountCents);

 // Presets de Condições Comerciais
 const applyConditionPreset = (text: string) => {
 setConditions((prev) => (prev ? `${prev}\n\n${text}` : text));
 toast.success("Condição comercial adicionada!");
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();

 if (!customerData.name.trim()) {
 toast.error("Informe o nome do cliente ou selecione um cliente cadastrado.");
 return;
 }

 const validItems = items.filter((i) => i.name.trim().length > 0 && i.unit_price_cents > 0);
 if (validItems.length === 0) {
 toast.error("Informe ao menos 1 item com nome e valor válido.");
 return;
 }

 setIsSubmitting(true);
 try {
 const validUntilDate = new Date();
 validUntilDate.setDate(validUntilDate.getDate() + validUntilDays);

 const payload = {
 customer_id: customerId || undefined,
 guest_name: customerData.name.trim(),
 guest_email: customerData.email.trim() || undefined,
 guest_phone: customerData.phone.trim() || undefined,
 valid_until: validUntilDate.toISOString(),
 conditions: conditions.trim() || undefined,
 internal_notes: internalNotes.trim() || undefined,
 items: validItems.map((i, idx) => ({
 item_type: i.item_type,
 product_variant_id: i.product_variant_id || undefined,
 name: i.name.trim(),
 description: i.description.trim() || undefined,
 sku: i.sku.trim() || undefined,
 unit_price_cents: i.unit_price_cents,
 quantity: i.quantity,
 discount_cents: i.discount_cents,
 position: idx,
 })),
 };

 await createQuote({ data: payload });

 toast.success("Orçamento comercial criado e vinculado com sucesso!");
 navigate({ to: "/workspace/orcamentos" });
 } catch (err: any) {
 toast.error(err?.message || "Erro ao salvar o orçamento.");
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-in fade-in duration-200">
 <PageHeader
 eyebrow="Vendas & Propostas Comerciais"
 title="Novo Orçamento Comercial"
 actions={
 <div className="flex items-center gap-2">
 <Button variant="outline" asChild size="sm" className="rounded-xl text-xs font-bold">
 <Link to="/workspace/orcamentos">
 <ArrowLeft className="mr-1.5 size-3.5" />
 Voltar aos Orçamentos
 </Link>
 </Button>
 <Button
 onClick={handleSubmit}
 disabled={isSubmitting}
 size="sm"
 className="rounded-xl text-xs font-bold bg-primary text-primary-foreground gap-1.5 cursor-pointer shadow-xs"
 >
 {isSubmitting ? (
 <>
 <Loader2 className="size-3.5 animate-spin" />
 <span>Gerando Orçamento...</span>
 </>
 ) : (
 <>
 <CheckCircle2 className="size-3.5" />
 <span>Salvar Orçamento</span>
 </>
 )}
 </Button>
 </div>
 }
 />

 <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
 {/* Coluna Esquerda: Dados do Cliente + Tabela de Itens (8 Cols) */}
 <div className="lg:col-span-8 space-y-6">
 {/* Card 1: Identificação do Cliente & CRM */}
 <div className="p-6 rounded-2xl bg-card border border-border/70 space-y-4 shadow-xs">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <User className="size-4 text-primary" />
 <span>Destinatário / Cliente</span>
 </div>
 {customerId && (
 <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
 ✓ Cliente Vinculado ao CRM
 </Badge>
 )}
 </div>

 {/* Caixa de Busca no CRM */}
 <div className="relative">
 <div className="relative">
 <Input
 value={clientSearch}
 onChange={(e) => {
 setClientSearch(e.target.value);
 setIsClientDropdownOpen(true);
 }}
 onFocus={() => {
 if (clientSearch.trim().length >= 1) setIsClientDropdownOpen(true);
 }}
 placeholder="🔍 Buscar cliente no CRM (Nome, CPF/CNPJ, WhatsApp ou E-mail)..."
 className="h-10 rounded-xl text-xs bg-muted/30 pl-3 pr-8 border-border/70"
 />
 {isLoadingCustomers && (
 <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 animate-spin text-muted-foreground" />
 )}
 </div>

 {/* Dropdown de Resultados CRM */}
 {isClientDropdownOpen && clientSearch.trim().length >= 1 && (
 <div className="absolute left-0 right-0 top-11 z-50 rounded-xl bg-card border border-border/80 shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95">
 <div className="p-2 border-b border-border/60 bg-muted/40 flex items-center justify-between text-[11px] text-muted-foreground font-bold">
 <span>Resultados da Carteira de Clientes ({crmCustomers.length})</span>
 <button
 type="button"
 onClick={() => setIsClientDropdownOpen(false)}
 className="text-xs hover:text-foreground cursor-pointer px-1"
 >
 Fechar
 </button>
 </div>
 <div className="max-h-56 overflow-y-auto no-scrollbar p-1 divide-y divide-border/40">
 {crmCustomers.length === 0 ? (
 <div className="p-4 text-center text-xs text-muted-foreground">
 Nenhum cliente cadastrado encontrado com "{clientSearch}". Preencha os campos abaixo manualmente para novo cliente.
 </div>
 ) : (
 crmCustomers.map((c: any) => (
 <button
 key={c.id}
 type="button"
 onClick={() => handleSelectCustomer(c)}
 className="w-full text-left p-2.5 rounded-lg hover:bg-muted/60 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
 >
 <div className="space-y-0.5 min-w-0">
 <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
 {c.full_name || c.legal_name}
 </p>
 <p className="text-[11px] text-muted-foreground truncate">
 {c.document && `Doc: ${c.document} • `}
 {c.phone && `Whats: ${c.phone} • `}
 {c.email}
 </p>
 </div>
 <Badge variant="outline" className="text-[10px] shrink-0">
 Selecionar
 </Badge>
 </button>
 ))
 )}
 </div>
 </div>
 )}
 </div>

 {/* Banner de Cliente Selecionado */}
 {selectedCustomer && (
 <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs">
 <div className="flex items-center gap-2">
 <ShieldCheck className="size-4 text-primary shrink-0" />
 <span>
 Cliente conectado: <strong>{selectedCustomer.full_name || selectedCustomer.legal_name}</strong>
 {selectedCustomer.document && ` • Doc: ${selectedCustomer.document}`}
 </span>
 </div>
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={handleUnlinkCustomer}
 className="h-7 text-xs text-muted-foreground hover:text-destructive cursor-pointer"
 >
 Desvincular
 </Button>
 </div>
 )}

 {/* Inputs Individuais */}
 <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
 <div className="space-y-1 sm:col-span-4">
 <Label className="text-xs font-medium">Nome / Razão Social *</Label>
 <Input
 value={customerData.name}
 onChange={(e) => setCustomerData((p) => ({ ...p, name: e.target.value }))}
 placeholder="Ex: Ana Clara ou Empresa LTDA"
 className="h-10 rounded-xl text-xs"
 required
 />
 </div>
 <div className="space-y-1 sm:col-span-3">
 <Label className="text-xs font-medium">CPF / CNPJ</Label>
 <Input
 value={customerData.document}
 onChange={(e) => setCustomerData((p) => ({ ...p, document: e.target.value }))}
 placeholder="000.000.000-00"
 className="h-10 rounded-xl text-xs font-mono"
 />
 </div>
 <div className="space-y-1 sm:col-span-3">
 <Label className="text-xs font-medium">E-mail</Label>
 <Input
 type="email"
 value={customerData.email}
 onChange={(e) => setCustomerData((p) => ({ ...p, email: e.target.value }))}
 placeholder="contato@cliente.com"
 className="h-10 rounded-xl text-xs"
 />
 </div>
 <div className="space-y-1 sm:col-span-2">
 <Label className="text-xs font-medium">WhatsApp</Label>
 <Input
 value={customerData.phone}
 onChange={(e) => setCustomerData((p) => ({ ...p, phone: e.target.value }))}
 placeholder="(49) 99999-0000"
 className="h-10 rounded-xl text-xs font-mono"
 />
 </div>
 </div>
 </div>

 {/* Card 2: Itens, Produtos & Serviços do Catálogo */}
 <div className="p-6 rounded-2xl bg-card border border-border/70 space-y-4 shadow-xs">
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <Package className="size-4 text-primary" />
 <span>Itens, Produtos & Serviços ({items.length})</span>
 </div>
 <div className="flex items-center gap-2">
 <Button
 type="button"
 size="sm"
 onClick={handleOpenCatalogForNewItem}
 className="rounded-xl text-xs font-bold gap-1.5 h-8 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 cursor-pointer"
 >
 <Package className="size-3.5" />
 <span>+ Produto do Catálogo</span>
 </Button>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={handleAddItem}
 className="rounded-xl text-xs font-bold gap-1.5 h-8 cursor-pointer"
 >
 <Plus className="size-3.5" />
 <span>Item Avulso</span>
 </Button>
 </div>
 </div>

 <div className="space-y-3">
 {items.map((item, idx) => {
 const lineTotal = item.unit_price_cents * item.quantity - item.discount_cents;

 return (
 <div
 key={item.id}
 className="p-4 rounded-2xl bg-muted/20 border border-border/70 space-y-3 relative group transition-all hover:border-border"
 >
 <div className="flex items-center justify-between gap-2">
 <div className="flex items-center gap-2">
 <Badge variant="secondary" className="text-[10px] font-mono px-2 py-0.5">
 #{idx + 1}
 </Badge>
 <Select
 value={item.item_type}
 onValueChange={(val: any) => handleUpdateItem(item.id, { item_type: val })}
 >
 <SelectTrigger className="h-7 text-[11px] rounded-lg w-44 bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="product_variant">Produto do Catálogo</SelectItem>
 <SelectItem value="service">Serviço / Atendimento</SelectItem>
 <SelectItem value="rental_equipment">Locação de Equipamento</SelectItem>
 <SelectItem value="manual_item">Item Avulso / Personalizado</SelectItem>
 </SelectContent>
 </Select>

 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => handleOpenCatalogForExistingItem(item.id)}
 className="h-7 px-2 text-[11px] font-bold text-primary hover:bg-primary/10 rounded-lg cursor-pointer"
 >
 🔍 Conectar Catálogo
 </Button>

 {item.sku && (
 <Badge variant="outline" className="text-[10px] font-mono">
 SKU: {item.sku}
 </Badge>
 )}
 </div>

 {items.length > 1 && (
 <Button
 type="button"
 variant="ghost"
 size="icon"
 onClick={() => handleRemoveItem(item.id)}
 className="size-7 text-muted-foreground hover:text-destructive rounded-lg cursor-pointer"
 >
 <Trash2 className="size-3.5" />
 </Button>
 )}
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
 <div className="sm:col-span-5 space-y-1">
 <Label className="text-[11px] font-medium text-muted-foreground">
 Nome do Item / Descrição *
 </Label>
 <div className="flex items-center gap-2">
 {item.image_url && (
 <img
 src={item.image_url}
 alt=""
 className="size-9 rounded-lg object-cover border border-border shrink-0"
 />
 )}
 <Input
 value={item.name}
 onChange={(e) => handleUpdateItem(item.id, { name: e.target.value })}
 placeholder="Ex: Consultoria Técnica, Vestido de Noiva, Pacote Gramado"
 className="h-9 text-xs rounded-xl bg-background flex-1"
 required
 />
 </div>
 </div>

 <div className="sm:col-span-2 space-y-1">
 <Label className="text-[11px] font-medium text-muted-foreground">Qtd</Label>
 <Input
 type="number"
 min={1}
 value={item.quantity}
 onChange={(e) =>
 handleUpdateItem(item.id, { quantity: Math.max(1, Number(e.target.value) || 1) })
 }
 className="h-9 text-xs rounded-xl font-mono text-center bg-background"
 />
 </div>

 <div className="sm:col-span-2 space-y-1">
 <Label className="text-[11px] font-medium text-muted-foreground">Valor Un. (R$)</Label>
 <CurrencyField
 value={item.unit_price_cents}
 onChange={(val) => handleUpdateItem(item.id, { unit_price_cents: val })}
 className="h-9 text-xs rounded-xl font-mono bg-background"
 />
 </div>

 <div className="sm:col-span-3 space-y-1">
 <Label className="text-[11px] font-medium text-muted-foreground">Total da Linha</Label>
 <div className="h-9 px-3 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-end font-mono font-bold text-xs text-foreground">
 {formatMoney(Math.max(0, lineTotal))}
 </div>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>

 {/* Card 3: Condições Comerciais & Presets */}
 <div className="p-6 rounded-2xl bg-card border border-border/70 space-y-4 shadow-xs">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <FileCheck2 className="size-4 text-primary" />
 <span>Condições Comerciais & Termos de Pagamento</span>
 </div>

 {/* Presets Rápidos de Condição */}
 <div className="space-y-1.5">
 <span className="text-[11px] font-bold text-muted-foreground">Modelos de Pagamento Rápidos:</span>
 <div className="flex flex-wrap gap-1.5">
 {[
 { label: "⚡ Pix à Vista (5% OFF)", text: "Pagamento à vista via Pix com 5% de desconto. Chave PIX informada após aprovação." },
 { label: "💳 10x sem Juros", text: "Parcelamento em até 10x sem juros no cartão de crédito." },
 { label: "🤝 50% Entrada + 50% Entrega", text: "50% de entrada na aprovação do pedido e saldo de 50% na conclusão / entrega dos serviços." },
 { label: "📄 Boleto Faturado 30/60/90 Dias", text: "Faturamento corporativo em 3 parcelas (30/60/90 dias) via boleto bancário mediante aprovação cadastral." },
 { label: "✈️ 20% Entrada + Saldo Parcelado", text: "Entrada facilitada de 20% no ato da contratação e o saldo restante em até 10x no cartão." },
 ].map((preset) => (
 <button
 key={preset.label}
 type="button"
 onClick={() => applyConditionPreset(preset.text)}
 className="text-[10px] font-medium px-2.5 py-1 rounded-lg bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors border border-border/50"
 >
 {preset.label}
 </button>
 ))}
 </div>
 </div>

 <div className="space-y-3">
 <div className="space-y-1">
 <Label className="text-xs font-medium">Condições de Pagamento & Entrega</Label>
 <Textarea
 value={conditions}
 onChange={(e) => setConditions(e.target.value)}
 placeholder="Ex: Pagamento 50% de entrada e 50% na entrega. Prazo de execução: 15 dias úteis."
 className="rounded-xl text-xs min-h-[75px]"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-xs font-medium">Observações Internas (Uso Exclusivo da Equipe)</Label>
 <Textarea
 value={internalNotes}
 onChange={(e) => setInternalNotes(e.target.value)}
 placeholder="Ex: Negociação aprovada pelo gerente com 5% de margem extra."
 className="rounded-xl text-xs min-h-[50px]"
 />
 </div>
 </div>
 </div>
 </div>

 {/* Coluna Direita: Resumo Financeiro & Validade (4 Cols Sticky) */}
 <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-20">
 <div className="p-6 rounded-2xl bg-card border border-border/70 space-y-4 shadow-xs">
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <DollarSign className="size-4 text-primary" />
 <span>Balanço da Proposta</span>
 </h3>

 <div className="space-y-2 pt-2 border-t border-border/60 text-xs">
 <div className="flex justify-between text-muted-foreground">
 <span>Subtotal dos Itens:</span>
 <span className="font-mono font-bold text-foreground">{formatMoney(subtotalCents)}</span>
 </div>

 {totalDiscountCents > 0 && (
 <div className="flex justify-between text-destructive">
 <span>Descontos Aplicados:</span>
 <span className="font-mono font-bold">-{formatMoney(totalDiscountCents)}</span>
 </div>
 )}

 <div className="flex justify-between text-base font-black pt-3 border-t border-border/80 text-foreground">
 <span>Valor Total:</span>
 <span className="text-primary font-mono">{formatMoney(totalCents)}</span>
 </div>
 </div>

 <div className="pt-3 border-t border-border/60 space-y-1.5">
 <Label className="text-xs font-bold">Validade da Proposta (Dias)</Label>
 <Input
 type="number"
 min={1}
 max={90}
 value={validUntilDays}
 onChange={(e) => setValidUntilDays(Number(e.target.value) || 7)}
 className="h-10 rounded-xl text-xs font-mono"
 />
 <p className="text-[11px] text-muted-foreground leading-tight">
 Após este período, a proposta será marcada como expirada automaticamente.
 </p>
 </div>

 <Button
 type="submit"
 disabled={isSubmitting}
 className="w-full h-11 rounded-xl font-bold text-xs bg-primary text-primary-foreground gap-2 mt-4 cursor-pointer shadow-xs"
 >
 {isSubmitting ? (
 <>
 <Loader2 className="size-4 animate-spin" />
 <span>Processando...</span>
 </>
 ) : (
 <>
 <CheckCircle2 className="size-4" />
 <span>Salvar e Emitir Orçamento</span>
 </>
 )}
 </Button>

 {/* WhatsApp Share Rapido */}
 {customerData.phone && totalCents > 0 && (
 <button
 type="button"
 className="w-full h-11 mt-2 rounded-xl font-bold text-xs bg-[#25D366] hover:bg-[#128C7E] text-white flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
 onClick={() => {
   let msg = `*Orçamento Comercial*\n\n`;
   items.forEach(item => {
     msg += `• ${item.quantity}x ${item.name || 'Item'}\n`;
     if (item.description) msg += `  _${item.description}_\n`;
   });
   msg += `\n*Total: ${formatMoney(totalCents)}*\n`;
   
   
   const phone = customerData.phone.replace(/\D/g, '');
   window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
 }}
 >
 <MessageCircle className="size-4" />
 <span>Enviar via WhatsApp</span>
 </button>
 )}
 </div>
 </div>
 </form>

 {/* Modal de Conexão com Catálogo de Produtos */}
 <Dialog open={isCatalogModalOpen} onOpenChange={setIsCatalogModalOpen}>
 <DialogContent className="sm:max-w-2xl rounded-2xl p-0 overflow-hidden bg-card border-border">
 <DialogHeader className="p-5 border-b border-border/60 bg-muted/20">
 <DialogTitle className="text-base font-bold flex items-center gap-2">
 <Package className="size-4 text-primary" />
 <span>Conectar Produto do Catálogo</span>
 </DialogTitle>
 <DialogDescription className="text-xs text-muted-foreground">
 Selecione um produto cadastrado na sua loja para preencher nome, SKU e valor unitário automaticamente.
 </DialogDescription>

 {/* Busca no Catálogo */}
 <div className="mt-3 space-y-2">
 <Input
 value={catalogSearch}
 onChange={(e) => setCatalogSearch(e.target.value)}
 placeholder="Buscar por título, marca ou SKU..."
 className="h-9 text-xs rounded-xl bg-background"
 autoFocus
 />

 {catalogCategories.length > 0 && (
 <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
 <button
 type="button"
 onClick={() => setCatalogCategory("all")}
 className={cn(
 "px-2.5 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition-colors cursor-pointer",
 catalogCategory === "all"
 ? "bg-primary text-primary-foreground"
 : "bg-muted text-muted-foreground hover:text-foreground",
 )}
 >
 Todos
 </button>
 {catalogCategories.map((cat: any) => (
 <button
 key={cat}
 type="button"
 onClick={() => setCatalogCategory(cat)}
 className={cn(
 "px-2.5 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition-colors cursor-pointer",
 catalogCategory === cat
 ? "bg-primary text-primary-foreground"
 : "bg-muted text-muted-foreground hover:text-foreground",
 )}
 >
 {cat}
 </button>
 ))}
 </div>
 )}
 </div>
 </DialogHeader>

 <ScrollArea className="max-h-[60vh] p-4">
 {isLoadingCatalog ? (
 <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
 <Loader2 className="size-6 animate-spin text-primary" />
 <span className="text-xs">Carregando catálogo da loja...</span>
 </div>
 ) : filteredCatalog.length === 0 ? (
 <div className="py-12 text-center text-xs text-muted-foreground">
 Nenhum produto ativo encontrado no catálogo.
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
 {filteredCatalog.map((product: any) => {
 const variant = product.product_variants?.[0];
 const price = variant?.price_override_cents ?? product.price_cents ?? 0;
 const img = product.product_media?.[0]?.url;

 return (
 <div
 key={product.id}
 onClick={() => handleSelectProduct(product, variant)}
 className="p-3 rounded-xl border border-border/70 hover:border-primary/50 bg-card hover:bg-muted/30 transition-all flex items-center gap-3 cursor-pointer group"
 >
 {img ? (
 <img
 src={img}
 alt=""
 className="size-12 rounded-lg object-cover border border-border shrink-0"
 />
 ) : (
 <div className="size-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
 <Package className="size-5" />
 </div>
 )}

 <div className="min-w-0 flex-1 space-y-0.5">
 <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
 {product.title}
 </p>
 <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
 {variant?.sku && (
 <span className="font-mono bg-muted px-1 rounded">
 {variant.sku}
 </span>
 )}
 {product.product_types?.name && (
 <span>{product.product_types.name}</span>
 )}
 </div>
 <p className="text-xs font-mono font-bold text-primary">
 {formatMoney(price)}
 </p>
 </div>

 <Button
 type="button"
 size="sm"
 className="rounded-lg text-[10px] font-bold h-7 px-2.5 shrink-0"
 >
 Inserir
 </Button>
 </div>
 );
 })}
 </div>
 )}
 </ScrollArea>
 </DialogContent>
 </Dialog>
 </div>
 );
}
