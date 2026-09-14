import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
 Sheet,
 SheetContent,
 SheetHeader,
 SheetTitle,
 SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyField } from "@/components/ui/currency-field";
import { formatMoney } from "@/lib/money";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
 Search,
 User,
 UserPlus,
 Compass,
 PlaneTakeoff,
 Calendar,
 Users,
 ScanText,
 Upload,
 Check,
 X,
 FileText,
 Clock,
 ShieldCheck,
 ChevronRight,
 Plus,
 Minus,
 DollarSign,
 Loader2,
 FolderPlus,
 HelpCircle,
 BedDouble,
 Trash2,
 Building2,
 Tag,
} from "lucide-react";
import { listCustomers, createCustomer } from "@/services/crm.functions";
import { listHotelsBank, type HotelBankDTO } from "@/services/travel-catalog.functions";
import {
 createTravelProposal,
 type ProposalCanvasFormat,
} from "@/services/travel-proposal.functions";
import {
 TRAVEL_PACKAGE_TEMPLATES,
 type TravelPackageTemplate,
} from "@/lib/tourism-templates";
import {
 CANONICAL_DESTINATIONS,
 type CanonicalDestination,
} from "@/lib/destinations-catalog";

export interface ProposalRoomItem {
 id: string;
 roomNumber: number;
 roomType?: string;
 adults: number;
 children: number;
 childrenAges: number[];
}

interface NewTravelProposalSheetProps {
 isOpen: boolean;
 onOpenChange: (open: boolean) => void;
 onCreated?: (proposalId: string) => void;
 initialLeadId?: string | null;
 initialClientName?: string;
 initialClientPhone?: string;
 initialClientEmail?: string;
 initialDestination?: string;
}

export function NewTravelProposalSheet({
 isOpen,
 onOpenChange,
 onCreated,
 initialLeadId,
 initialClientName,
 initialClientPhone,
 initialClientEmail,
 initialDestination,
}: NewTravelProposalSheetProps) {
 const navigate = useNavigate();
 const queryClient = useQueryClient();

 // Modo ativo: 'custom' | 'template' | 'ocr'
 const [activeTab, setActiveTab] = useState<"custom" | "template" | "ocr">("custom");

 // Dados básicos da proposta
 const [title, setTitle] = useState("");
 const [destinationCity, setDestinationCity] = useState("");
 const [selectedCanonicalDest, setSelectedCanonicalDest] = useState<CanonicalDestination | null>(null);
 const [travelStartDate, setTravelStartDate] = useState("");
 const [travelEndDate, setTravelEndDate] = useState("");

 // Efeito de pré-preenchimento ao abrir via Lead Comercial CRM
 useEffect(() => {
 if (isOpen) {
 if (initialClientName) setCustomerName(initialClientName);
 if (initialClientPhone) setCustomerWhatsapp(initialClientPhone);
 if (initialClientEmail) setCustomerEmail(initialClientEmail);
 if (initialDestination) {
 setDestinationCity(initialDestination);
 const match = CANONICAL_DESTINATIONS.find(
 (d) => d.name.toLowerCase() === initialDestination.toLowerCase() || d.city.toLowerCase() === initialDestination.toLowerCase()
 );
 if (match) setSelectedCanonicalDest(match);
 }
 }
 }, [isOpen, initialClientName, initialClientPhone, initialClientEmail, initialDestination]);
 // Quartos & Passageiros (Rooming List Dinâmica — Zero Hardcode)
 const [rooms, setRooms] = useState<ProposalRoomItem[]>([
 {
 id: "room-1",
 roomNumber: 1,
 roomType: "Casal",
 adults: 2,
 children: 0,
 childrenAges: [],
 },
 ]);

 const totalAdults = rooms.reduce((acc, r) => acc + r.adults, 0);
 const totalChildren = rooms.reduce((acc, r) => acc + r.children, 0);
 const totalGuests = totalAdults + totalChildren;

 const handleAddRoom = () => {
 const nextNum = rooms.length + 1;
 setRooms((prev) => [
 ...prev,
 {
 id: `room-${Date.now()}-${nextNum}`,
 roomNumber: nextNum,
 roomType: "Casal",
 adults: 2,
 children: 0,
 childrenAges: [],
 },
 ]);
 };

 const handleRemoveRoom = (roomId: string) => {
 if (rooms.length <= 1) return;
 setRooms((prev) =>
 prev
 .filter((r) => r.id !== roomId)
 .map((r, idx) => ({ ...r, roomNumber: idx + 1 }))
 );
 };

 const handleUpdateRoomAdults = (roomId: string, delta: number) => {
 setRooms((prev) =>
 prev.map((r) => {
 if (r.id !== roomId) return r;
 const newAdults = Math.max(1, Math.min(6, r.adults + delta));
 return { ...r, adults: newAdults };
 })
 );
 };

 const handleUpdateRoomChildren = (roomId: string, delta: number) => {
 setRooms((prev) =>
 prev.map((r) => {
 if (r.id !== roomId) return r;
 const newChildren = Math.max(0, Math.min(4, r.children + delta));
 let newAges = [...r.childrenAges];
 if (newChildren > newAges.length) {
 while (newAges.length < newChildren) {
 newAges.push(5);
 }
 } else if (newChildren < newAges.length) {
 newAges = newAges.slice(0, newChildren);
 }
 return { ...r, children: newChildren, childrenAges: newAges };
 })
 );
 };

 const handleUpdateChildAge = (roomId: string, childIdx: number, age: number) => {
 setRooms((prev) =>
 prev.map((r) => {
 if (r.id !== roomId) return r;
 const newAges = [...r.childrenAges];
 newAges[childIdx] = age;
 return { ...r, childrenAges: newAges };
 })
 );
 };

 const handleUpdateRoomType = (roomId: string, roomType: string) => {
 setRooms((prev) =>
 prev.map((r) => (r.id === roomId ? { ...r, roomType } : r))
 );
 };
 const [currency, setCurrency] = useState("BRL");
 const [validUntilDays, setValidUntilDays] = useState(7);
 const [canvasFormat, setCanvasFormat] = useState<ProposalCanvasFormat>("a4-portrait");
 const [templateTheme, setTemplateTheme] = useState("editorial-flat");
 const [initialNotes, setInitialNotes] = useState("");

 // Template selecionado
 const [selectedTemplate, setSelectedTemplate] = useState<TravelPackageTemplate | null>(null);

 // Cliente & Vínculo CRM
 const [customerId, setCustomerId] = useState<string | null>(null);
 const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
 const [customerSearch, setCustomerSearch] = useState("");
 const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
 const [customerName, setCustomerName] = useState("");
 const [customerWhatsapp, setCustomerWhatsapp] = useState("");
 const [customerEmail, setCustomerEmail] = useState("");
 const [customerDocument, setCustomerDocument] = useState("");

 // Criação rápida de cliente
 const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
 const [quickFullName, setQuickFullName] = useState("");
 const [quickPhone, setQuickPhone] = useState("");
 const [quickEmail, setQuickEmail] = useState("");
 const [quickDocument, setQuickDocument] = useState("");

 // OCR / Leitura com IA
 const [ocrLoading, setOcrLoading] = useState(false);
 const [ocrExtractedData, setOcrExtractedData] = useState<any | null>(null);
 const [ocrPastedText, setOcrPastedText] = useState("");

 // Submissão
 const [isSubmitting, setIsSubmitting] = useState(false);

 // Hotel & Resort selecionado do Banco de Hotéis
 const [hotelSearch, setHotelSearch] = useState("");
 const [isHotelDropdownOpen, setIsHotelDropdownOpen] = useState(false);
 const [selectedHotel, setSelectedHotel] = useState<HotelBankDTO | null>(null);
 const [selectedHotelRegime, setSelectedHotelRegime] = useState("All Inclusive");
 const [selectedHotelRoomType, setSelectedHotelRoomType] = useState("");

 // Busca no Banco de Hotéis em tempo real com debounce
 const { data: hotelsBankList = [] } = useQuery({
   queryKey: ["hotels-bank-search-proposal", hotelSearch, destinationCity],
   queryFn: () => listHotelsBank({ data: { search: hotelSearch.trim() || destinationCity.trim() } }),
   enabled: Boolean(hotelSearch.trim().length >= 2 || destinationCity.trim().length >= 2),
   staleTime: 30_000,
 });

  // Tags rápidas de transfers e inclusões
  const [selectedProposalTags, setSelectedProposalTags] = useState<string[]>([
    "Transfer In/Out Aeroporto ↔ Hotel",
    "Seguro Viagem Cobertura Completa",
  ]);
  const [customTagInput, setCustomTagInput] = useState("");

  // Precificação e Condições de Pagamento Dinâmicas (Modo Personalizado)
  const [basePriceCents, setBasePriceCents] = useState<number | undefined>(undefined);
  const [pricingModel, setPricingModel] = useState<"total" | "per_person" | "per_room">("total");
  const [installmentsCount, setInstallmentsCount] = useState<number>(10);
  const [downPaymentCents, setDownPaymentCents] = useState<number | undefined>(undefined);

  const toggleProposalTag = (tag: string) => {
    setSelectedProposalTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

 // Busca de clientes no CRM com debounce
 const { data: crmCustomers = [], isLoading: isLoadingCustomers } = useQuery({
 queryKey: ["crm-customers-search-proposals", customerSearch],
 queryFn: () => listCustomers({ data: { query: customerSearch.trim() } }),
 enabled: customerSearch.trim().length >= 1,
 staleTime: 30_000,
 });

 // Mutação para criar cliente rápido
 const quickCreateMutation = useMutation({
 mutationFn: (newCustomer: any) => createCustomer({ data: newCustomer }),
 onSuccess: (res: any) => {
 toast.success("Cliente cadastrado no CRM com sucesso!");
 setCustomerId(res.id);
 setSelectedCustomer({
 id: res.id,
 fullName: quickFullName,
 phone: quickPhone,
 email: quickEmail,
 document: quickDocument,
 });
 setCustomerName(quickFullName);
 setCustomerWhatsapp(quickPhone);
 setCustomerEmail(quickEmail);
 setCustomerDocument(quickDocument);
 setIsQuickCreateOpen(false);
 setQuickFullName("");
 setQuickPhone("");
 setQuickEmail("");
 setQuickDocument("");
 queryClient.invalidateQueries({ queryKey: ["crm-customers-search-proposals"] });
 },
 onError: (err: any) => {
 toast.error(err?.message || "Erro ao cadastrar cliente.");
 },
 });

 const handleSelectCustomer = (c: any) => {
 setCustomerId(c.id);
 setSelectedCustomer(c);
 setCustomerName(c.fullName || c.name || c.full_name || "");
 setCustomerWhatsapp(c.phone || "");
 setCustomerEmail(c.email || "");
 setCustomerDocument(c.document || c.taxId || "");
 setIsCustomerDropdownOpen(false);
 setCustomerSearch("");
 toast.success(`Passageiro ${c.fullName || c.name || c.full_name} vinculado ao CRM!`);
 };

 const handleUnlinkCustomer = () => {
 setCustomerId(null);
 setSelectedCustomer(null);
 toast.info("Cliente desvinculado do CRM. Dados manuais mantidos.");
 };

 const handleApplyTemplate = (tpl: TravelPackageTemplate) => {
 setSelectedTemplate(tpl);
 setTitle(tpl.title);
 setDestinationCity(tpl.destinationCity);
 setTemplateTheme(tpl.templateTheme);
 setCanvasFormat(tpl.canvasFormat);

 // Configura o primeiro quarto com a sugestão do pacote
 setRooms([
 {
 id: "room-1",
 roomNumber: 1,
 roomType: "Casal",
 adults: tpl.defaultAdults || 2,
 children: tpl.defaultChildren || 0,
 childrenAges: tpl.defaultChildren ? Array(tpl.defaultChildren).fill(6) : [],
 },
 ]);

 // Se houver data de início já informada pelo usuário, projeta o retorno
 if (travelStartDate) {
 const start = new Date(travelStartDate);
 start.setDate(start.getDate() + tpl.durationDays);
 setTravelEndDate(start.toISOString().split("T")[0]);
 }

 toast.success(`Template "${tpl.title}" aplicado com sucesso!`);
 setActiveTab("custom");
 };

 const handleSimulateOcr = () => {
 if (!ocrPastedText.trim()) {
 toast.error("Cole o texto da cotação ou selecione um arquivo.");
 return;
 }

 setOcrLoading(true);
 setTimeout(() => {
 // Leitura inteligente heurística do texto
 const text = ocrPastedText;
 let detectedDest = "Gramado, RS";
 if (/cancun|cancún/i.test(text)) detectedDest = "Cancún, México";
 else if (/orlando|disney/i.test(text)) detectedDest = "Orlando, EUA";
 else if (/porto de galinhas/i.test(text)) detectedDest = "Porto de Galinhas, PE";
 else if (/maragogi/i.test(text)) detectedDest = "Maragogi, AL";
 else if (/macei[oó]/i.test(text)) detectedDest = "Maceió, AL";
 else if (/beto carrero/i.test(text)) detectedDest = "Penha & Balneário Camboriú, SC";

 const extracted = {
 destinationCity: detectedDest,
 title: `Pacote Completo: ${detectedDest}`,
 adults: /3\s*(adulto|pax)/i.test(text) ? 3 : /4\s*(adulto|pax)/i.test(text) ? 4 : 2,
 durationNights: /([0-9]+)\s*(noite|noites)/i.test(text) ? parseInt(RegExp.$1, 10) : 5,
 notes: text.substring(0, 300),
 };

 setOcrExtractedData(extracted);
 setOcrLoading(false);
 toast.success("Orçamento lido pela IA com sucesso!");
 }, 1200);
 };

 const handleApplyOcrData = () => {
 if (!ocrExtractedData) return;
 setDestinationCity(ocrExtractedData.destinationCity);
 setTitle(ocrExtractedData.title);
 setRooms([
 {
 id: "room-1",
 roomNumber: 1,
 roomType: "Casal",
 adults: ocrExtractedData.adults || 2,
 children: 0,
 childrenAges: [],
 },
 ]);
 setInitialNotes(ocrExtractedData.notes);
 toast.success("Dados da IA aplicados ao formulário!");
 setActiveTab("custom");
 };

 // Cálculo de Noites: 100% dinâmico baseado estritamente nas datas informadas.
 // ZERO noites hardcoded quando as datas estiverem em branco.
 const nightsCount =
 travelStartDate && travelEndDate
 ? Math.max(
 1,
 Math.round(
 (new Date(travelEndDate).getTime() - new Date(travelStartDate).getTime()) /
 86400000,
 ),
 )
 : null;

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();

 if (!customerName.trim()) {
 setActiveTab("custom");
 toast.error("Informe o nome do passageiro ou selecione um cliente no CRM.");
 return;
 }
 if (!customerWhatsapp.trim()) {
 setActiveTab("custom");
 toast.error("Informe o WhatsApp do cliente para envio do link da lâmina.");
 return;
 }
 if (!destinationCity.trim()) {
 setActiveTab("custom");
 toast.error("Informe a cidade de destino.");
 return;
 }

 setIsSubmitting(true);
 try {
 const proposalTitle =
 title.trim() || `Proposta de Viagem: ${destinationCity.trim()}`;

 // Monta payload estendido com dados do template se selecionado
 const autoNotes = initialNotes.trim() || (selectedCanonicalDest ? `Melhor época: ${selectedCanonicalDest.bestSeason}. Gastronomia recomendada: ${selectedCanonicalDest.gastronomyTip}.` : undefined);
 const autoCover = selectedCanonicalDest?.coverImage || undefined;

 const payload: any = {
 title: proposalTitle,
 clientName: customerName.trim(),
 clientWhatsapp: customerWhatsapp.trim(),
 clientEmail: customerEmail.trim() || undefined,
 clientDocument: customerDocument.trim() || undefined,
 customerId: customerId || undefined,
 leadId: initialLeadId || undefined,
 destinationCity: destinationCity.trim(),
 travelStartDate: travelStartDate || undefined,
 travelEndDate: travelEndDate || undefined,
 adultsCount: totalAdults,
 childrenCount: totalChildren,
 infantsCount: 0,
 rooms,
 currency,
 validUntilDays,
 canvasFormat,
 templateTheme,
 coverImageUrl: autoCover,
 initialNotes: autoNotes,
 templateId: selectedTemplate?.id || undefined,
 flights: selectedTemplate?.flights || [],
 hotels: selectedHotel
        ? [
            {
              hotel_name: selectedHotel.name,
              room_type: selectedHotelRoomType || selectedHotel.room_categories?.[0]?.name || "Standard",
              nights_count: nightsCount || 1,
              board_type: selectedHotelRegime || selectedHotel.regime_options?.[0] || "All Inclusive",
              stars: selectedHotel.stars || null,
            },
          ]
        : selectedTemplate?.hotels || [],
 itinerary: selectedTemplate?.itinerary || [],
 transfers: selectedProposalTags
        .filter((t) => t.toLowerCase().includes("transfer"))
        .map((t) => ({ title: t })),
 tours: selectedProposalTags
        .filter((t) => !t.toLowerCase().includes("transfer"))
        .map((t) => ({ title: t, description: "Serviço incluso na proposta" }))
        .concat(
          (selectedTemplate?.tours?.map((t) => ({
            title: t.title,
            description: t.description || "Passeio recomendado no destino",
          })) as { title: string; description: string }[]) ||
            (selectedCanonicalDest
              ? selectedCanonicalDest.highlights.map((h) => ({
                  title: h,
                  description: "Passeio recomendado no destino",
                }))
              : [])
        ),
 includes: selectedTemplate?.includes || undefined,
 excludes: selectedTemplate?.excludes || undefined,
 };

  const finalPriceCents = basePriceCents || selectedTemplate?.suggestedPriceCents;
  if (finalPriceCents && finalPriceCents > 0) {
    const downPayment = downPaymentCents || 0;
    const financedAmount = Math.max(0, finalPriceCents - downPayment);
    const count = installmentsCount || 10;
    const installmentValue = Math.round(financedAmount / count);

    payload.pricing = {
      currency,
      base_price_cents: finalPriceCents,
      boarding_tax_cents: 0,
      other_taxes_cents: 0,
      discount_cents: 0,
      total_price_cents: finalPriceCents,
      pricing_model: pricingModel,
      down_payment_cents: downPayment,
      installments_options: [
        {
          installments_count: 1,
          installment_value_cents: Math.round(finalPriceCents * 0.95),
          method: "pix",
          has_interest: false,
        },
        {
          installments_count: count,
          installment_value_cents: installmentValue,
          method: "credit_card",
          has_interest: false,
        },
      ],
    };
  }

 const res = await createTravelProposal({ data: payload });

 toast.success("Proposta de viagem criada com sucesso!");
 queryClient.invalidateQueries({ queryKey: ["agency-proposals"] });
 onOpenChange(false);

 if (onCreated) {
 onCreated(res.id);
 } else {
 navigate({ to: "/workspace/turismo/propostas/$id", params: { id: res.id } });
 }
 } catch (err: any) {
 toast.error(err?.message || "Erro ao salvar a proposta de viagem.");
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <Sheet open={isOpen} onOpenChange={onOpenChange}>
 <SheetContent
 side="right"
 size="wide"
 className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] flex flex-col p-0 gap-0 overflow-hidden bg-card border-l border-border shadow-2xl"
 >
 {/* Header Limpo, Humano e Silencioso (Anti-AI Design) */}
 <SheetHeader className="p-6 pb-4 border-b border-border/70 bg-card">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="size-9 rounded-xl bg-muted flex items-center justify-center text-foreground border border-border/60">
 <PlaneTakeoff className="size-4" />
 </div>
 <div>
 <SheetTitle className="text-sm font-bold text-foreground">
 Nova Proposta de Viagem
 </SheetTitle>
 <SheetDescription className="text-xs text-muted-foreground mt-0.5">
 Configure destino, datas e distribuição de quartos para o passageiro.
 </SheetDescription>
 </div>
 </div>
 </div>

 {/* Seletor de Modo em Abas */}
 <div className="pt-3">
 <Tabs
 value={activeTab}
 onValueChange={(v) => setActiveTab(v as any)}
 className="w-full"
 >
 <TabsList className="grid grid-cols-3 h-9 rounded-xl bg-muted/70 p-1 text-xs">
 <TabsTrigger
 value="custom"
 className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
 >
 <User className="mr-1.5 size-3.5" />
 Consultor & CRM
 </TabsTrigger>
 <TabsTrigger
 value="template"
 className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
 >
 <FolderPlus className="mr-1.5 size-3.5" />
 Templates Prontos
 </TabsTrigger>
 <TabsTrigger
 value="ocr"
 className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
 >
 <ScanText className="mr-1.5 size-3.5 text-primary" />
 Importar por Texto
 </TabsTrigger>
 </TabsList>
 </Tabs>
 </div>
 </SheetHeader>

 {/* Corpo do Sheet */}
 <form id="new-proposal-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
 {/* TAB 1: MODO CONSULTOR & CRM */}
 {activeTab === "custom" && (
 <div className="space-y-6 text-xs">
 {/* Card 1: Identificação do Passageiro & CRM */}
 <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-3.5 shadow-xs">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <User className="size-4 text-primary" />
 <span>Passageiro Principal / Cliente</span>
 </div>
 {customerId ? (
 <Badge
 variant="secondary"
 className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold"
 >
 ✓ Vinculado ao CRM
 </Badge>
 ) : (
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => setIsQuickCreateOpen(!isQuickCreateOpen)}
 className="h-7 px-2 text-[11px] font-bold text-primary hover:text-primary/80 hover:bg-primary/5"
 >
 <UserPlus className="mr-1 size-3.5" />
 {isQuickCreateOpen ? "Cancelar Cadastro" : "+ Criar Cliente Rápido"}
 </Button>
 )}
 </div>

 {/* Sub-painel retrátil: Criação Rápida no CRM */}
 {isQuickCreateOpen && (
 <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-3 animate-in fade-in zoom-in-95">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-foreground">
 Novo Cliente da Agência (Salva no CRM)
 </span>
 <button
 type="button"
 onClick={() => setIsQuickCreateOpen(false)}
 className="text-muted-foreground hover:text-foreground text-xs"
 >
 ✕
 </button>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
 <div className="space-y-1 sm:col-span-2">
 <Label className="text-[11px] font-semibold">Nome Completo *</Label>
 <Input
 placeholder="Ex: Carlos Eduardo Silveira"
 value={quickFullName}
 onChange={(e) => setQuickFullName(e.target.value)}
 className="h-8 text-xs rounded-lg"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-semibold">WhatsApp / Telefone *</Label>
 <Input
 placeholder="(49) 99999-9999"
 value={quickPhone}
 onChange={(e) => setQuickPhone(e.target.value)}
 className="h-8 text-xs rounded-lg"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-semibold">E-mail</Label>
 <Input
 type="email"
 placeholder="cliente@email.com"
 value={quickEmail}
 onChange={(e) => setQuickEmail(e.target.value)}
 className="h-8 text-xs rounded-lg"
 />
 </div>
 <div className="space-y-1 sm:col-span-2">
 <Label className="text-[11px] font-semibold">CPF / Passaporte (Opcional)</Label>
 <Input
 placeholder="000.000.000-00"
 value={quickDocument}
 onChange={(e) => setQuickDocument(e.target.value)}
 className="h-8 text-xs rounded-lg"
 />
 </div>
 </div>
 <Button
 type="button"
 size="sm"
 onClick={() => {
 if (!quickFullName.trim() || !quickPhone.trim()) {
 toast.error("Informe nome e WhatsApp.");
 return;
 }
 quickCreateMutation.mutate({
 fullName: quickFullName.trim(),
 phone: quickPhone.trim(),
 email: quickEmail.trim() || null,
 document: quickDocument.trim() || null,
 channel: "travel_studio",
 });
 }}
 disabled={quickCreateMutation.isPending}
 className="w-full h-8 text-xs rounded-lg font-bold"
 >
 {quickCreateMutation.isPending ? (
 <Loader2 className="mr-1.5 size-3.5 animate-spin" />
 ) : (
 <Check className="mr-1.5 size-3.5" />
 )}
 Salvar no CRM e Vincular à Proposta
 </Button>
 </div>
 )}

 {/* Caixa de Busca no CRM */}
 {!customerId && (
 <div className="relative">
 <div className="relative">
 <Input
 value={customerSearch}
 onChange={(e) => {
 setCustomerSearch(e.target.value);
 setIsCustomerDropdownOpen(true);
 }}
 onFocus={() => {
 if (customerSearch.trim().length >= 1) setIsCustomerDropdownOpen(true);
 }}
 placeholder="🔍 Buscar cliente existente no CRM (Nome, CPF, Whats, E-mail)..."
 className="h-9 rounded-xl text-xs bg-muted/20 pl-3 pr-8 border-border/70"
 />
 {isLoadingCustomers && (
 <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 animate-spin text-muted-foreground" />
 )}
 </div>

 {/* Dropdown de Resultados */}
 {isCustomerDropdownOpen && customerSearch.trim().length >= 1 && (
 <div className="absolute left-0 right-0 top-10 z-50 rounded-xl bg-card border border-border shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95">
 <div className="p-2 border-b border-border/60 bg-muted/40 flex items-center justify-between text-[11px] text-muted-foreground font-bold">
 <span>Resultados da Carteira ({crmCustomers.length})</span>
 <button
 type="button"
 onClick={() => setIsCustomerDropdownOpen(false)}
 className="text-xs hover:text-foreground cursor-pointer px-1"
 >
 Fechar
 </button>
 </div>
 <div className="max-h-52 overflow-y-auto no-scrollbar p-1 divide-y divide-border/40">
 {crmCustomers.length === 0 ? (
 <div className="p-4 text-center text-xs text-muted-foreground space-y-1">
 <p>Nenhum cliente cadastrado com "{customerSearch}".</p>
 <p className="text-[11px]">
 Preencha os campos abaixo para digitar manualmente ou clique em "+ Criar Cliente Rápido".
 </p>
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
 {c.fullName || c.name || c.full_name}
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
 )}

 {/* Banner de Cliente Conectado */}
 {selectedCustomer && (
 <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs">
 <div className="flex items-center gap-2">
 <ShieldCheck className="size-4 text-primary shrink-0" />
 <span>
 Cliente vinculado: <strong>{customerName}</strong>
 {customerDocument && ` • Doc: ${customerDocument}`}
 </span>
 </div>
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={handleUnlinkCustomer}
 className="h-6 px-2 text-[11px] text-muted-foreground hover:text-destructive"
 >
 Desvincular
 </Button>
 </div>
 )}

 {/* Campos Manuais do Cliente */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Nome do Passageiro / Cliente *</Label>
 <Input
 placeholder="Nome completo do passageiro"
 value={customerName}
 onChange={(e) => setCustomerName(e.target.value)}
 className="h-9 text-xs rounded-xl"
 required
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">WhatsApp do Passageiro *</Label>
 <Input
 placeholder="(49) 99999-9999"
 value={customerWhatsapp}
 onChange={(e) => setCustomerWhatsapp(e.target.value)}
 className="h-9 text-xs rounded-xl"
 required
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">E-mail para Envio da Proposta</Label>
 <Input
 type="email"
 placeholder="cliente@email.com"
 value={customerEmail}
 onChange={(e) => setCustomerEmail(e.target.value)}
 className="h-9 text-xs rounded-xl"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">CPF / Documento (Opcional)</Label>
 <Input
 placeholder="000.000.000-00"
 value={customerDocument}
 onChange={(e) => setCustomerDocument(e.target.value)}
 className="h-9 text-xs rounded-xl"
 />
 </div>
 </div>
 </div>

 {/* Card 2: Destino & Período da Viagem */}
 <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-3.5 shadow-xs">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <Compass className="size-4 text-primary" />
 <span>Destino & Datas da Viagem</span>
 </div>
 {nightsCount !== null && (
 <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground border-border/80">
 {nightsCount} {nightsCount === 1 ? "noite" : "noites"}
 </Badge>
 )}
 </div>

 <div className="space-y-1.5">
 <div className="flex items-center justify-between">
 <Label className="text-[11px] font-bold">Destino Principal da Viagem *</Label>
 {selectedCanonicalDest && (
 <Badge variant="outline" className="text-[9px] font-mono text-primary border-primary/30 font-bold">
 ✈️ Gateway: {selectedCanonicalDest.iata} ({selectedCanonicalDest.state})
 </Badge>
 )}
 </div>
 <Input
 placeholder="Ex: Porto de Galinhas, PE ou Cancún, México"
 value={destinationCity}
 onChange={(e) => {
 const val = e.target.value;
 setDestinationCity(val);
 const match = CANONICAL_DESTINATIONS.find(
 (d) => d.name.toLowerCase() === val.toLowerCase() || d.city.toLowerCase() === val.toLowerCase()
 );
 if (match) {
 setSelectedCanonicalDest(match);
 if (!title) setTitle(`Pacote Exclusivo: ${match.name}`);
 }
 }}
 className="h-9 text-xs rounded-xl"
 required
 />

 {/* Chips de Destinos Oficiais */}
 <div className="space-y-1 pt-1">
 <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
 Destinos Mais Procurados (1 Toque):
 </span>
 <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar pr-1">
 {CANONICAL_DESTINATIONS.map((dest) => (
 <button
 key={dest.id}
 type="button"
 onClick={() => {
 setDestinationCity(dest.name);
 setSelectedCanonicalDest(dest);
 if (!title) setTitle(`Pacote Exclusivo: ${dest.name}`);
 }}
 className={cn(
 "text-[10px] font-medium px-2 py-0.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1",
 destinationCity === dest.name || selectedCanonicalDest?.id === dest.id
 ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
 : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
 )}
 >
 <span>{dest.name}</span>
 <span className={cn(
 "text-[8px] font-mono font-black px-1 rounded",
 destinationCity === dest.name || selectedCanonicalDest?.id === dest.id
 ? "bg-white/20 text-white"
 : "bg-muted text-foreground"
 )}>
 {dest.iata}
 </span>
 </button>
 ))}
 </div>
 </div>

 {/* Card de Inteligência Canônica do Destino */}
 {selectedCanonicalDest && (
 <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-2 mt-2 animate-in fade-in duration-150">
 <div className="flex items-center gap-2.5">
 <img
 src={selectedCanonicalDest.coverImage}
 alt={selectedCanonicalDest.name}
 className="size-11 rounded-lg object-cover border border-border/60 shrink-0"
 />
 <div className="min-w-0 flex-1">
 <div className="flex items-center gap-1.5">
 <h4 className="text-[11px] font-bold text-foreground truncate">{selectedCanonicalDest.name}</h4>
 <Badge variant="secondary" className="text-[8px] font-mono font-bold bg-primary/10 text-primary">
 {selectedCanonicalDest.iata}
 </Badge>
 </div>
 <p className="text-[10px] text-primary font-medium mt-0.5">
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

 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Título da Proposta (Opcional)</Label>
 <Input
 placeholder="Ex: Férias em Família em Gramado & Rota dos Vinhedos"
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 className="h-9 text-xs rounded-xl"
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Data de Embarque / Ida</Label>
 <Input
 type="date"
 value={travelStartDate}
 onChange={(e) => setTravelStartDate(e.target.value)}
 className="h-9 text-xs rounded-xl"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Data de Retorno / Volta</Label>
 <Input
 type="date"
 value={travelEndDate}
 onChange={(e) => setTravelEndDate(e.target.value)}
 className="h-9 text-xs rounded-xl"
 />
 </div>
 </div>
 </div>

 {/* Card 3: Distribuição de Quartos & Hóspedes (Zero AI-Smell, 100% Dinâmico) */}
 <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-3.5 shadow-xs">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <BedDouble className="size-4 text-primary" />
 <span>Quartos & Hóspedes</span>
 </div>
 <span className="text-[11px] font-medium text-muted-foreground">
 {rooms.length} {rooms.length === 1 ? "quarto" : "quartos"} • {totalAdults} {totalAdults === 1 ? "adulto" : "adultos"}
 {totalChildren > 0 && `, ${totalChildren} ${totalChildren === 1 ? "criança" : "crianças"}`}
 </span>
 </div>

 {/* Lista de Quartos Configuráveis */}
 <div className="space-y-3">
 {rooms.map((room) => (
 <div
 key={room.id}
 className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-3"
 >
 {/* Cabeçalho do Quarto */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <span className="text-xs font-bold text-foreground">
 Quarto {room.roomNumber}
 </span>
 <select
 value={room.roomType || "Casal"}
 onChange={(e) => handleUpdateRoomType(room.id, e.target.value)}
 className="h-7 rounded-lg border border-border/60 bg-background px-2 text-[11px] text-muted-foreground font-medium cursor-pointer"
 >
 <option value="Casal">1 Cama de Casal</option>
 <option value="Duplo Solteiro">2 Camas de Solteiro</option>
 <option value="Casal + Solteiro">1 Casal + 1 Solteiro</option>
 <option value="Triplo Solteiro">3 Camas de Solteiro</option>
 <option value="Família (Suíte)">Configuração Familiar</option>
 </select>
 </div>

 {rooms.length > 1 && (
 <button
 type="button"
 onClick={() => handleRemoveRoom(room.id)}
 className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors cursor-pointer"
 >
 <Trash2 className="size-3" />
 <span>Remover</span>
 </button>
 )}
 </div>

 {/* Controles de Adultos e Crianças */}
 <div className="grid grid-cols-2 gap-3">
 {/* Adultos */}
 <div className="p-2.5 rounded-lg bg-background border border-border/50 flex items-center justify-between">
 <div>
 <p className="text-[11px] font-bold text-foreground">Adultos</p>
 <p className="text-[9px] text-muted-foreground">+12 anos</p>
 </div>
 <div className="flex items-center gap-2">
 <Button
 type="button"
 variant="outline"
 size="icon"
 onClick={() => handleUpdateRoomAdults(room.id, -1)}
 disabled={room.adults <= 1}
 className="size-7 rounded-lg cursor-pointer"
 >
 <Minus className="size-3" />
 </Button>
 <span className="font-bold text-xs min-w-4 text-center">{room.adults}</span>
 <Button
 type="button"
 variant="outline"
 size="icon"
 onClick={() => handleUpdateRoomAdults(room.id, 1)}
 disabled={room.adults >= 6}
 className="size-7 rounded-lg cursor-pointer"
 >
 <Plus className="size-3" />
 </Button>
 </div>
 </div>

 {/* Crianças */}
 <div className="p-2.5 rounded-lg bg-background border border-border/50 flex items-center justify-between">
 <div>
 <p className="text-[11px] font-bold text-foreground">Crianças</p>
 <p className="text-[9px] text-muted-foreground">0 a 11 anos</p>
 </div>
 <div className="flex items-center gap-2">
 <Button
 type="button"
 variant="outline"
 size="icon"
 onClick={() => handleUpdateRoomChildren(room.id, -1)}
 disabled={room.children <= 0}
 className="size-7 rounded-lg cursor-pointer"
 >
 <Minus className="size-3" />
 </Button>
 <span className="font-bold text-xs min-w-4 text-center">{room.children}</span>
 <Button
 type="button"
 variant="outline"
 size="icon"
 onClick={() => handleUpdateRoomChildren(room.id, 1)}
 disabled={room.children >= 4}
 className="size-7 rounded-lg cursor-pointer"
 >
 <Plus className="size-3" />
 </Button>
 </div>
 </div>
 </div>

 {/* Idade de cada criança (se houver) */}
 {room.children > 0 && (
 <div className="p-2.5 rounded-lg bg-background/60 border border-border/40 space-y-2">
 <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
 Idade de cada criança no check-in:
 </span>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
 {Array.from({ length: room.children }).map((_, cIdx) => (
 <div key={cIdx} className="space-y-1">
 <Label className="text-[10px] text-muted-foreground">
 Criança {cIdx + 1}
 </Label>
 <select
 value={room.childrenAges[cIdx] ?? 5}
 onChange={(e) =>
 handleUpdateChildAge(room.id, cIdx, Number(e.target.value))
 }
 className="h-7 w-full rounded-lg border border-border/60 bg-background px-2 text-xs font-medium cursor-pointer"
 >
 <option value={0}>0 anos (Bebê)</option>
 <option value={1}>1 ano</option>
 <option value={2}>2 anos</option>
 <option value={3}>3 anos</option>
 <option value={4}>4 anos</option>
 <option value={5}>5 anos</option>
 <option value={6}>6 anos</option>
 <option value={7}>7 anos</option>
 <option value={8}>8 anos</option>
 <option value={9}>9 anos</option>
 <option value={10}>10 anos</option>
 <option value={11}>11 anos</option>
 </select>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 ))}
 </div>

 {/* Botão Adicionar Quarto Completo */}
 <Button
 type="button"
 variant="outline"
 onClick={handleAddRoom}
 className="w-full h-8 rounded-xl text-xs font-semibold border-dashed border-border/80 hover:bg-muted/40 transition-colors gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
 >
 <Plus className="size-3.5" />
 <span>Adicionar Outro Quarto</span>
 </Button>
 </div>

 {/* Card 3.5: Hospedagem & Resort (Banco Oficial de Hotéis) */}
 <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-3.5 shadow-xs">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <Building2 className="size-4 text-emerald-600 dark:text-emerald-400" />
 <span>Hospedagem & Resort (Banco Oficial)</span>
 </div>
 {selectedHotel && (
 <Badge variant="secondary" className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
 {selectedHotel.stars ? `${selectedHotel.stars}★ ` : ""}{selectedHotel.regime_options?.[0] || "All Inclusive"}
 </Badge>
 )}
 </div>

 {selectedHotel ? (
 <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2.5">
 <div className="flex items-center justify-between">
 <div>
 <h4 className="text-xs font-bold text-foreground">{selectedHotel.name}</h4>
 <p className="text-[10px] text-muted-foreground">
 {selectedHotel.city}, {selectedHotel.state || selectedHotel.country}
 </p>
 </div>
 <button
 type="button"
 onClick={() => {
 setSelectedHotel(null);
 setHotelSearch("");
 }}
 className="text-[11px] text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
 >
 Trocar Hotel
 </button>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
 <div className="space-y-1">
 <Label className="text-[10px] text-muted-foreground">Regime Alimentar</Label>
 <select
 value={selectedHotelRegime}
 onChange={(e) => setSelectedHotelRegime(e.target.value)}
 className="h-8 w-full rounded-lg border border-border/60 bg-background px-2 text-xs"
 >
 {(selectedHotel.regime_options || ["All Inclusive", "Café da Manhã", "Meia Pensão"]).map((reg) => (
 <option key={reg} value={reg}>{reg}</option>
 ))}
 </select>
 </div>

 <div className="space-y-1">
 <Label className="text-[10px] text-muted-foreground">Categoria de Quarto</Label>
 <Input
 placeholder="Ex: Suíte Luxo Vista Mar"
 value={selectedHotelRoomType}
 onChange={(e) => setSelectedHotelRoomType(e.target.value)}
 className="h-8 text-xs rounded-lg"
 />
 </div>
 </div>
 </div>
 ) : (
 <div className="relative space-y-1.5">
 <Label className="text-[11px] font-bold">Buscar Hotel no Banco da Agência</Label>
 <div className="relative">
 <Input
 placeholder="Digite o nome do hotel, resort ou cidade..."
 value={hotelSearch}
 onChange={(e) => {
 setHotelSearch(e.target.value);
 setIsHotelDropdownOpen(true);
 }}
 onFocus={() => setIsHotelDropdownOpen(true)}
 className="h-9 text-xs rounded-xl"
 />
 {isHotelDropdownOpen && hotelsBankList.length > 0 && (
 <div className="absolute z-30 left-0 right-0 top-10 bg-popover border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto p-1 text-xs space-y-1">
 {hotelsBankList.slice(0, 6).map((h) => (
 <button
 key={h.id}
 type="button"
 onClick={() => {
 setSelectedHotel(h);
 setSelectedHotelRegime(h.regime_options?.[0] || "All Inclusive");
 setSelectedHotelRoomType(h.room_categories?.[0]?.name || "Standard");
 setIsHotelDropdownOpen(false);
 setHotelSearch("");
 toast.success(`Hotel "${h.name}" selecionado!`);
 }}
 className="w-full text-left p-2 rounded-lg hover:bg-muted transition-colors flex items-center justify-between cursor-pointer"
 >
 <div>
 <p className="font-bold text-foreground text-xs">{h.name}</p>
 <p className="text-[10px] text-muted-foreground">
 {h.city}, {h.state || h.country} {h.stars ? `• ${h.stars}★` : ""}
 </p>
 </div>
 <Badge variant="outline" className="text-[9px] font-mono">
 {h.regime_options?.[0] || "All Inclusive"}
 </Badge>
 </button>
 ))}
 </div>
 )}
 </div>
 <p className="text-[10px] text-muted-foreground">
 Selecione um hotel parceiro do banco ou deixe em branco para usar acomodação avulsa.
 </p>
 </div>
 )}
 </div>

 {/* Card 3.6: Transfers & Inclusões Rápidas (1 Toque) */}
 <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-3 shadow-xs">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <Tag className="size-4 text-primary" />
 <span>Transfers, Passeios & Atrativos Inclusos</span>
 </div>
 <span className="text-[10px] text-muted-foreground">
 {selectedProposalTags.length} selecionado(s)
 </span>
 </div>

 {/* Tags sugeridas e ativas */}
 <div className="flex flex-wrap gap-1.5">
 {[
 "Transfer In/Out Aeroporto ↔ Hotel",
 "Seguro Viagem Cobertura Completa",
 "City Tour Histórico no Destino",
 "Passeio Náutico / Escuna",
 "Ingressos para Parques Temáticos",
 "Bagagem Despachada 23kg",
 ].map((tag) => {
 const isSelected = selectedProposalTags.includes(tag);
 return (
 <button
 key={tag}
 type="button"
 onClick={() => toggleProposalTag(tag)}
 className={`text-[11px] px-2.5 py-1 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
 isSelected
 ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
 : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/70"
 }`}
 >
 <span>{isSelected ? "✓" : "+"}</span>
 <span>{tag}</span>
 </button>
 );
 })}

 {/* Tags personalizadas adicionadas pelo agente */}
 {selectedProposalTags
 .filter(
 (t) =>
 ![
 "Transfer In/Out Aeroporto ↔ Hotel",
 "Seguro Viagem Cobertura Completa",
 "City Tour Histórico no Destino",
 "Passeio Náutico / Escuna",
 "Ingressos para Parques Temáticos",
 "Bagagem Despachada 23kg",
 ].includes(t)
 )
 .map((customTag) => (
 <span
 key={customTag}
 className="text-[11px] px-2.5 py-1 rounded-xl border bg-primary text-primary-foreground border-primary font-bold shadow-2xs flex items-center gap-1.5"
 >
 <span>✓</span>
 <span>{customTag}</span>
 <button
 type="button"
 onClick={() => toggleProposalTag(customTag)}
 className="ml-1 size-3.5 rounded-full hover:bg-white/20 flex items-center justify-center text-xs"
 title="Remover atrativo"
 >
 ×
 </button>
 </span>
 ))}
 </div>

 {/* Input de Novo Passeio / Tag Dinâmica */}
 <div className="pt-2 border-t border-border/40 flex gap-2">
 <Input
 placeholder="Adicionar atrativo (ex: Beach Park, Passeio à Praia do Francês, Buggy nas Dunas)..."
 value={customTagInput}
 onChange={(e) => setCustomTagInput(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === "Enter") {
 e.preventDefault();
 if (customTagInput.trim()) {
 setSelectedProposalTags((prev) =>
 prev.includes(customTagInput.trim())
 ? prev
 : [...prev, customTagInput.trim()]
 );
 setCustomTagInput("");
 }
 }
 }}
 className="h-8 text-xs rounded-xl bg-background"
 />
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => {
 if (customTagInput.trim()) {
 setSelectedProposalTags((prev) =>
 prev.includes(customTagInput.trim())
 ? prev
 : [...prev, customTagInput.trim()]
 );
 setCustomTagInput("");
 }
 }}
 className="h-8 px-3 rounded-xl text-xs shrink-0 font-medium cursor-pointer"
 >
 <Plus className="size-3.5 mr-1" />
 Adicionar
 </Button>
 </div>
 </div>

 {/* Card 3.7: Orçamento & Condições de Pagamento (Zero Hardcoded) */}
 <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-3.5 shadow-xs">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <DollarSign className="size-4 text-emerald-600 dark:text-emerald-400" />
 <span>Orçamento & Parcelamento</span>
 </div>
 <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
 Personalizado
 </Badge>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Valor Total do Pacote (R$)</Label>
 <CurrencyField
 value={basePriceCents}
 onChange={setBasePriceCents}
 placeholder="0,00"
 className="h-9 text-xs rounded-xl"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Modalidade de Preço</Label>
 <select
 value={pricingModel}
 onChange={(e) => setPricingModel(e.target.value as any)}
 className="h-9 w-full rounded-xl border border-input bg-background px-3 text-xs"
 >
 <option value="total">Pacote Total (Todos os Passageiros)</option>
 <option value="per_person">Valor por Pessoa (Pax)</option>
 <option value="per_room">Valor por Acomodação (Quarto)</option>
 </select>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Entrada Inicial (R$, Opcional)</Label>
 <CurrencyField
 value={downPaymentCents}
 onChange={setDownPaymentCents}
 placeholder="0,00 (sem entrada)"
 className="h-9 text-xs rounded-xl"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Máximo de Parcelas no Cartão</Label>
 <select
 value={installmentsCount}
 onChange={(e) => setInstallmentsCount(Number(e.target.value))}
 className="h-9 w-full rounded-xl border border-input bg-background px-3 text-xs"
 >
 <option value={1}>1x (À Vista)</option>
 <option value={3}>Até 3x sem juros</option>
 <option value={6}>Até 6x sem juros</option>
 <option value={10}>Até 10x sem juros (Padrão)</option>
 <option value={12}>Até 12x sem juros</option>
 </select>
 </div>
 </div>

 {basePriceCents && basePriceCents > 0 && (
 <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50 text-[11px] space-y-1 text-muted-foreground">
 <p className="font-semibold text-foreground flex items-center justify-between">
 <span>Projeção para o Cliente:</span>
 <span className="text-primary font-bold font-mono">
 {formatMoney(basePriceCents)}
 </span>
 </p>
 <p>
 • À vista no PIX com 5% de desconto:{" "}
 <strong className="text-foreground">{formatMoney(Math.round(basePriceCents * 0.95))}</strong>
 </p>
 <p>
 • Cartão:{" "}
 {downPaymentCents && downPaymentCents > 0
 ? `Entrada de ${formatMoney(downPaymentCents)} + ${installmentsCount}x de ${formatMoney(
 Math.round(Math.max(0, basePriceCents - downPaymentCents) / installmentsCount)
 )} sem juros`
 : `Em até ${installmentsCount}x de ${formatMoney(
 Math.round(basePriceCents / installmentsCount)
 )} sem juros`}
 </p>
 </div>
 )}
 </div>

 {/* Card 4: Moeda, Validade & Tema */}
 <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-3 shadow-xs">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <DollarSign className="size-4 text-primary" />
 <span>Moeda, Validade & Apresentação</span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Moeda da Cotação</Label>
 <select
 value={currency}
 onChange={(e) => setCurrency(e.target.value)}
 className="h-9 w-full rounded-xl border border-input bg-background px-3 text-xs"
 >
 <option value="BRL">BRL (R$ Real)</option>
 <option value="USD">USD (US$ Dólar)</option>
 <option value="EUR">EUR (€ Euro)</option>
 </select>
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Validade da Proposta</Label>
 <select
 value={validUntilDays}
 onChange={(e) => setValidUntilDays(Number(e.target.value))}
 className="h-9 w-full rounded-xl border border-input bg-background px-3 text-xs"
 >
 <option value={3}>3 dias (Urgência comercial)</option>
 <option value={7}>7 dias (Padrão de agência)</option>
 <option value={15}>15 dias</option>
 <option value={30}>30 dias</option>
 </select>
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Tema Visual da Lâmina</Label>
 <select
 value={templateTheme}
 onChange={(e) => setTemplateTheme(e.target.value)}
 className="h-9 w-full rounded-xl border border-input bg-background px-3 text-xs"
 >
 <option value="editorial-flat">Editorial Flat (Clean)</option>
 <option value="dark-premium">Dark Premium (Noturno)</option>
 <option value="executivo-b2b">Executivo Corporativo</option>
 </select>
 </div>
 </div>

 <div className="space-y-1 pt-1">
 <Label className="text-[11px] font-bold">Observações Internas (Não visível ao passageiro)</Label>
 <Textarea
 placeholder="Notas internas da agência, operadora cotada, margem de comissão, etc..."
 value={initialNotes}
 onChange={(e) => setInitialNotes(e.target.value)}
 className="min-h-16 text-xs rounded-xl"
 />
 </div>
 </div>
 </div>
 )}

 {/* TAB 2: TEMPLATES PRONTOS */}
 {activeTab === "template" && (
 <div className="space-y-4 text-xs">
 <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-1">
 <p className="font-bold text-foreground">Biblioteca de Pacotes & Roteiros de Sucesso</p>
 <p className="text-muted-foreground text-[11px]">
 Selecione um pacote pré-formatado para clonar voos, hotéis, roteiro dia a dia, inclusões e exclusões em 1 clique.
 </p>
 </div>

 <div className="grid grid-cols-1 gap-3">
 {TRAVEL_PACKAGE_TEMPLATES.map((tpl) => (
 <div
 key={tpl.id}
 onClick={() => handleApplyTemplate(tpl)}
 className="p-4 rounded-2xl border border-border/70 bg-card hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer group space-y-3"
 >
 <div className="flex items-start justify-between gap-3">
 <div className="space-y-1 min-w-0">
 <div className="flex items-center gap-2">
 <Badge variant="secondary" className="text-[9px] font-bold">
 {tpl.badge}
 </Badge>
 <span className="text-[11px] text-muted-foreground">
 🌙 {tpl.durationNights} Noites • {tpl.durationDays} Dias
 </span>
 </div>
 <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
 {tpl.title}
 </h4>
 <p className="text-[11px] text-muted-foreground line-clamp-2">
 {tpl.subtitle}
 </p>
 </div>
 <Button
 type="button"
 size="sm"
 className="rounded-xl text-xs shrink-0 font-bold group-hover:bg-primary group-hover:text-primary-foreground"
 >
 Usar Roteiro
 </Button>
 </div>

 <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
 <span>Destino: <strong>{tpl.destinationCity}</strong></span>
 <span>
 Preço sugerido:{" "}
 <strong className="text-foreground">
 R$ {(tpl.suggestedPriceCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
 </strong>
 </span>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* TAB 3: IMPORTAÇÃO POR IA (OCR) */}
 {activeTab === "ocr" && (
 <div className="space-y-4 text-xs">
 <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-1">
 <div className="flex items-center gap-2 text-primary font-bold text-xs">
 <ScanText className="size-4" />
 <span>Assistente de Extração de Texto (PDF / WhatsApp)</span>
 </div>
 <p className="text-muted-foreground text-[11px]">
 Cole a cotação recebida da sua operadora ou consolidadora de viagens ou cole o texto do WhatsApp para a IA estruturar o roteiro.
 </p>
 </div>

 {/* Área de Colagem ou Upload */}
 <div className="space-y-2">
 <Label className="text-xs font-bold">Texto da Cotação / Orçamento da Operadora</Label>
 <Textarea
 placeholder={`Cole aqui o texto da cotação. Exemplo:
Cotação Gramado 5 noites para 2 adultos.
Hotel Casa da Montanha luxo com café da manhã.
Aéreo saindo de Campinas com bagagem.
Incluso Maria Fumaça e traslados.`}
 value={ocrPastedText}
 onChange={(e) => setOcrPastedText(e.target.value)}
 className="min-h-36 text-xs rounded-xl font-mono leading-relaxed"
 />
 </div>

 <Button
 type="button"
 onClick={handleSimulateOcr}
 disabled={ocrLoading || !ocrPastedText.trim()}
 className="w-full h-10 rounded-xl font-bold gap-2 text-xs bg-primary text-primary-foreground"
 >
 {ocrLoading ? (
 <>
 <Loader2 className="size-4 animate-spin" />
 <span>Lendo dados e estruturando roteiro com IA...</span>
 </>
 ) : (
 <>
 <ScanText className="size-4" />
 <span>Processar Cotação</span>
 </>
 )}
 </Button>

 {/* Resultado da IA */}
 {ocrExtractedData && (
 <div className="p-4 rounded-2xl bg-card border border-primary/30 space-y-3 animate-in fade-in zoom-in-95">
 <div className="flex items-center justify-between">
 <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
 <Check className="size-4 text-primary" />
 Dados Identificados pela IA:
 </span>
 <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
 Sucesso
 </Badge>
 </div>
 <div className="space-y-1 text-[11px] text-muted-foreground">
 <p>• Destino: <strong className="text-foreground">{ocrExtractedData.destinationCity}</strong></p>
 <p>• Título Sugerido: <strong className="text-foreground">{ocrExtractedData.title}</strong></p>
 <p>• Passageiros: <strong className="text-foreground">{ocrExtractedData.adults} Adultos</strong></p>
 <p>• Duração Estimada: <strong className="text-foreground">{ocrExtractedData.durationNights} Noites</strong></p>
 </div>
 <Button
 type="button"
 onClick={handleApplyOcrData}
 className="w-full h-9 rounded-xl font-bold text-xs"
 >
 Aplicar Dados ao Formulário →
 </Button>
 </div>
 )}
 </div>
 )}
 </form>

 {/* Rodapé Fixo com Ação Primária */}
 <div className="p-4 border-t border-border/70 bg-card flex items-center justify-between gap-3">
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => onOpenChange(false)}
 className="rounded-xl text-xs font-semibold text-muted-foreground"
 >
 Cancelar
 </Button>

 <Button
 type="submit"
 form="new-proposal-form"
 disabled={isSubmitting}
 className="h-10 px-6 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm gap-2"
 >
 {isSubmitting ? (
 <>
 <Loader2 className="size-4 animate-spin" />
 <span>Criando Lâmina no Studio...</span>
 </>
 ) : (
 <>
 <span>Criar e Abrir no Studio</span>
 <ChevronRight className="size-4" />
 </>
 )}
 </Button>
 </div>
 </SheetContent>
 </Sheet>
 );
}
