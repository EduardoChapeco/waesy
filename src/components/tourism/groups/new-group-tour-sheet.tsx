import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bus, FolderPlus, MapPin, Calendar, Clock, DollarSign, Plus, Trash, CheckCircle2, ShieldCheck, Building, Image as ImageIcon, Users, Compass } from "lucide-react";
import { toast } from "sonner";
import { ImageUpload } from "@/components/ui/image-upload";
import { createGroupTour } from "@/services/group-tours.functions";

interface NewGroupTourSheetProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 layouts: any[];
 defaultDepartureCity?: string;
 onSuccess: (newTourId: string) => void;
}

// 5 Presets canônicos de viagens rodoviárias no Sul/Brasil
const TOUR_PRESETS = [
 {
 id: "beto_carrero",
 title: "Excursão Beto Carrero World e Praias",
 destination: "Penha / Balneário Camboriú, SC",
 departureTime: "19:30",
 returnTime: "22:00",
 priceBrl: "790,00",
 priceCents: 79000,
 coverImage: "",
 included: [
 "Transporte Rodoviário Semi-Leito",
 "02 Diárias de Hotel com Café da Manhã",
 "Passaporte Beto Carrero 01 Dia",
 "Seguro Viagem & ANTT",
 "Guia Cadastur Acompanhante",
 "Serviço de Bordo",
 ],
 boardingPoints: [
 { city: "São Miguel do Oeste, SC", time: "19:30", location: "Posto Central / Rodoviária" },
 { city: "Maravilha, SC", time: "20:30", location: "Trevo de Acesso BR-282" },
 { city: "Chapecó, SC", time: "21:45", location: "Posto Carga Pesada" },
 ],
 payment: "Entrada R$ 190 + 6x de R$ 100 no cartão ou carnê",
 },
 {
 id: "gramado_canela",
 title: "Gramado e Canela — Serra Gaúcha & Natal Luz",
 destination: "Gramado / Canela, RS",
 departureTime: "20:00",
 returnTime: "23:00",
 priceBrl: "1.150,00",
 priceCents: 115000,
 coverImage: "",
 included: [
 "Transporte Rodoviário Leito Turismo",
 "03 Noites em Hotel Central com Café",
 "Passeio Trem Maria Fumaça com Degustação",
 "Noite Gaúcha com Churrasco e Show",
 "Seguro Viagem & ANTT",
 "Guia Credenciado",
 ],
 boardingPoints: [
 { city: "São Miguel do Oeste, SC", time: "20:00", location: "Agência / Rodoviária" },
 { city: "Chapecó, SC", time: "22:00", location: "Trevo Chapecó" },
 { city: "Erechim, RS", time: "23:30", location: "Posto Master" },
 ],
 payment: "Entrada R$ 250 + 9x de R$ 100 sem juros",
 },
 {
 id: "aparecida",
 title: "Aparecida do Norte e Frei Galvão — Circuito da Fé",
 destination: "Aparecida / Guaratinguetá, SP",
 departureTime: "12:00",
 returnTime: "18:00",
 priceBrl: "980,00",
 priceCents: 98000,
 coverImage: "",
 included: [
 "Transporte Double Decker Leito Cama",
 "03 Diárias em Hotel Próximo à Basílica",
 "Pensão Completa (Café, Almoço e Jantar)",
 "Visita ao Santuário Frei Galvão",
 "Seguro Viagem ANTT",
 "Acompanhamento Pastoral",
 ],
 boardingPoints: [
 { city: "São Miguel do Oeste, SC", time: "12:00", location: "Rodoviária Municipal" },
 { city: "Chapecó, SC", time: "14:30", location: "Shopping Pátio Chapecó" },
 { city: "Curitiba, PR", time: "22:00", location: "Posto Pelanda BR-116" },
 ],
 payment: "Em até 10x de R$ 98 no cartão ou Pix com 5% de desconto",
 },
 {
 id: "foz_cataratas",
 title: "Foz do Iguaçu, Cataratas e Compras Paraguai",
 destination: "Foz do Iguaçu, PR / CDE",
 departureTime: "22:00",
 returnTime: "23:30",
 priceBrl: "890,00",
 priceCents: 89000,
 coverImage: "",
 included: [
 "Transporte Rodoviário Executivo",
 "02 Diárias de Hotel com Piscina e Café",
 "Ingresso Parque Nacional das Cataratas",
 "Transporte Seguro para Compras em Ciudad del Este",
 "Visita ao Marco das Três Fronteiras",
 "Guia Bilíngue",
 ],
 boardingPoints: [
 { city: "São Miguel do Oeste, SC", time: "22:00", location: "Rodoviária" },
 { city: "Dionísio Cerqueira, SC", time: "23:00", location: "Aduana / Trevo" },
 { city: "Cascavel, PR", time: "02:00", location: "Posto Pra Frente Brasil" },
 ],
 payment: "Entrada R$ 190 + 7x de R$ 100 no cartão",
 },
 {
 id: "piratuba",
 title: "Termas de Piratuba e Machadinho — Águas Termais",
 destination: "Piratuba, SC",
 departureTime: "06:00",
 returnTime: "20:00",
 priceBrl: "680,00",
 priceCents: 68000,
 coverImage: "",
 included: [
 "Transporte Rodoviário Semi-Leito",
 "02 Diárias de Hotel com Piscinas Termais",
 "Café da Manhã e Jantar Inclusos",
 "Passeio de Maria Fumaça Histórica",
 "Seguro Viagem",
 "Guia da Agência",
 ],
 boardingPoints: [
 { city: "São Miguel do Oeste, SC", time: "06:00", location: "Praça Central" },
 { city: "Maravilha, SC", time: "07:00", location: "Trevo BR-282" },
 { city: "Chapecó, SC", time: "08:15", location: "Terminal Rodoviário" },
 ],
 payment: "Entrada R$ 180 + 5x de R$ 100 sem juros",
 },
];

const COMMON_INCLUSIONS = [
 "Transporte Rodoviário Leito/Semi-Leito",
 "Hospedagem com Café da Manhã",
 "Seguro Viagem & ANTT",
 "Guia Cadastur Acompanhante",
 "Serviço de Bordo",
 "Passaportes / Ingressos Inclusos",
 "Passeios Locais Inclusos",
 "Almoço ou Jantar Incluso",
 "Kit Lanche no Embarque",
 "Translado Hotel/Parques",
];

export function NewGroupTourSheet({
 open,
 onOpenChange,
 layouts = [],
 defaultDepartureCity = "São Miguel do Oeste, SC",
 onSuccess,
}: NewGroupTourSheetProps) {
 const [activeTab, setActiveTab] = useState("roteiro");

 // Form State — Aba 1: Roteiro
 const [title, setTitle] = useState("");
 const [destination, setDestination] = useState("");
 const [departureCity, setDepartureCity] = useState(defaultDepartureCity);
 const [departureDate, setDepartureDate] = useState("");
 const [departureTime, setDepartureTime] = useState("06:00");
 const [returnDate, setReturnDate] = useState("");
 const [returnTime, setReturnTime] = useState("20:00");
 const [coverImageUrl, setCoverImageUrl] = useState("");

 // Form State — Aba 2: Frota & Ônibus
 const [selectedLayoutId, setSelectedLayoutId] = useState<string>("");
 const [fallbackCapacity, setFallbackCapacity] = useState<number>(46);
 const [busCompany, setBusCompany] = useState("");
 const [busPlate, setBusPlate] = useState("");
 const [driverName, setDriverName] = useState("");
 const [driverPhone, setDriverPhone] = useState("");

 // Form State — Aba 3: Embarque & Inclusões
 const [boardingPoints, setBoardingPoints] = useState<
 Array<{ city: string; time: string; location: string }>
 >([
 { city: defaultDepartureCity, time: "06:00", location: "Rodoviária Municipal / Ponto Central" },
 ]);
 const [includedItems, setIncludedItems] = useState<string[]>([
 "Transporte Rodoviário Semi-Leito",
 "Seguro Viagem & ANTT",
 "Guia Cadastur Acompanhante",
 ]);

 // Form State — Aba 4: Tarifário & Condições
 const [priceBrl, setPriceBrl] = useState("850,00");
 const [paymentConditions, setPaymentConditions] = useState(
 "Entrada de 20% + até 10x sem juros no cartão ou carnê da agência"
 );
 const [notes, setNotes] = useState("");

 // Cálculo da capacidade e nome do layout selecionado
 const selectedLayout = useMemo(() => {
 return layouts.find((l) => l.id === selectedLayoutId) || null;
 }, [layouts, selectedLayoutId]);

 const effectiveTotalSeats = selectedLayout ? selectedLayout.total_capacity : fallbackCapacity;

 // Cálculo de duração
 const tripDuration = useMemo(() => {
 if (!departureDate || !returnDate) return null;
 const start = new Date(departureDate);
 const end = new Date(returnDate);
 const diffTime = end.getTime() - start.getTime();
 const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
 const nights = days > 1 ? days - 1 : 0;
 if (days <= 0) return null;
 return `${days} ${days === 1 ? "Dia" : "Dias"} e ${nights} ${nights === 1 ? "Noite" : "Noites"}`;
 }, [departureDate, returnDate]);

 // Aplica preset canônico em 1 clique
 const applyPreset = (preset: (typeof TOUR_PRESETS)[0]) => {
 setTitle(preset.title);
 setDestination(preset.destination);
 setDepartureTime(preset.departureTime);
 setReturnTime(preset.returnTime);
 setPriceBrl(preset.priceBrl);
 setCoverImageUrl(preset.coverImage);
 setIncludedItems(preset.included);
 setBoardingPoints(preset.boardingPoints);
 setPaymentConditions(preset.payment);
 toast.success(`Modelo "${preset.title}" carregado!`);
 };

 // Máscara e conversão de moeda
 const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 let val = e.target.value.replace(/\D/g, "");
 if (!val) {
 setPriceBrl("0,00");
 return;
 }
 const num = parseFloat(val) / 100;
 setPriceBrl(
 num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
 );
 };

 const priceCents = useMemo(() => {
 const clean = priceBrl.replace(/\./g, "").replace(",", ".");
 return Math.round((parseFloat(clean) || 0) * 100);
 }, [priceBrl]);

 // Gestão de Pontos de Embarque
 const addBoardingPoint = () => {
 setBoardingPoints([
 ...boardingPoints,
 { city: "", time: "07:00", location: "Trevo / Posto de Combustível" },
 ]);
 };

 const updateBoardingPoint = (index: number, field: string, value: string) => {
 const updated = [...boardingPoints];
 updated[index] = { ...updated[index], [field]: value };
 setBoardingPoints(updated);
 };

 const removeBoardingPoint = (index: number) => {
 if (boardingPoints.length <= 1) {
 toast.error("A viagem deve possuir pelo menos 1 ponto de embarque.");
 return;
 }
 setBoardingPoints(boardingPoints.filter((_, i) => i !== index));
 };

 // Toggle inclusões
 const toggleInclusion = (item: string) => {
 if (includedItems.includes(item)) {
 setIncludedItems(includedItems.filter((i) => i !== item));
 } else {
 setIncludedItems([...includedItems, item]);
 }
 };

 // Mutação de criação
 const createMutation = useMutation({
 mutationFn: () => {
 if (!title.trim() || !destination.trim() || !departureDate || !returnDate) {
 throw new Error("Preencha título, destino, data de saída e data de retorno.");
 }

 return createGroupTour({
 data: {
 title: title.trim(),
 destination: destination.trim(),
 departureCity: departureCity.trim(),
 departureDate,
 departureTime,
 returnDate,
 returnTime,
 totalSeats: effectiveTotalSeats,
 priceCents,
 includedItems,
 coverImageUrl: coverImageUrl.trim() || undefined,
 vehicleLayoutId: selectedLayoutId || undefined,
 vehicleLayoutName: selectedLayout?.name || undefined,
 boardingPoints,
 paymentConditions: paymentConditions.trim() || undefined,
 busCompanyName: busCompany.trim() || undefined,
 busPlate: busPlate.trim() || undefined,
 driverName: driverName.trim() || undefined,
 driverPhone: driverPhone.trim() || undefined,
 notes: notes.trim() || undefined,
 },
 });
 },
 onSuccess: (res) => {
 toast.success("Excursão cadastrada com sucesso!");
 onOpenChange(false);
 onSuccess(res.id);
 },
 onError: (err: any) => toast.error(err?.message || "Erro ao cadastrar excursão."),
 });

 return (
 <Sheet open={open} onOpenChange={onOpenChange}>
 <SheetContent
 side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] md:max-w-3xl flex flex-col p-0 gap-0 overflow-hidden bg-card border-l border-border"
 >
 {/* ── 1. HEADER DO STUDIO ── */}
 <SheetHeader className="p-5 pb-4 border-b border-border/80 bg-muted/20">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
 <Bus className="size-5" />
 </div>
 <div>
 <SheetTitle className="text-base font-bold text-foreground">
 Nova Excursão
 </SheetTitle>
 <SheetDescription className="text-xs text-muted-foreground">
 Configuração de roteiro, ônibus da frota, pontos de embarque e precificação.
 </SheetDescription>
 </div>
 </div>
 {tripDuration && (
 <Badge variant="outline" className="text-xs font-bold font-mono">
 {tripDuration}
 </Badge>
 )}
 </div>
 </SheetHeader>

 {/* ── 2. ABAS DE CONFIGURAÇÃO ── */}
 <Tabs
 value={activeTab}
 onValueChange={setActiveTab}
 className="flex-1 flex flex-col overflow-hidden"
 >
 <div className="px-5 pt-3 pb-2 border-b border-border/60 bg-card">
 <TabsList className="grid grid-cols-4 w-full h-9 rounded-xl p-1 bg-muted/50">
 <TabsTrigger value="roteiro" className="text-xs font-bold rounded-lg gap-1.5 py-1">
 <Compass className="size-3.5" />
 <span>1. Roteiro</span>
 </TabsTrigger>
 <TabsTrigger value="frota" className="text-xs font-bold rounded-lg gap-1.5 py-1">
 <Bus className="size-3.5" />
 <span>2. Frota</span>
 </TabsTrigger>
 <TabsTrigger value="embarque" className="text-xs font-bold rounded-lg gap-1.5 py-1">
 <MapPin className="size-3.5" />
 <span>3. Embarque</span>
 </TabsTrigger>
 <TabsTrigger value="tarifario" className="text-xs font-bold rounded-lg gap-1.5 py-1">
 <DollarSign className="size-3.5" />
 <span>4. Tarifário</span>
 </TabsTrigger>
 </TabsList>
 </div>

 <div className="flex-1 overflow-y-auto no-scrollbar p-5 text-xs space-y-6">
 {/* ── ABA 1: ROTEIRO & PRESETS ── */}
 <TabsContent value="roteiro" className="m-0 space-y-5">
 {/* Presets de 1 Clique */}
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
 <FolderPlus className="size-3.5 text-primary" />
 Modelos Prontos de Excursão (1 Clique)
 </span>
 <span className="text-[10px] text-muted-foreground">Preenche roteiro, fotos e inclusões</span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
 {TOUR_PRESETS.map((preset) => (
 <div
 key={preset.id}
 onClick={() => applyPreset(preset)}
 className="p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/40 hover:border-primary/40 transition-all cursor-pointer space-y-1 text-left"
 >
 <div className="flex items-center justify-between">
 <span className="font-bold text-foreground text-xs">{preset.title}</span>
 <Badge variant="secondary" className="text-[10px] font-mono font-bold">
 R$ {preset.priceBrl}
 </Badge>
 </div>
 <p className="text-[11px] text-muted-foreground flex items-center gap-1">
 <MapPin className="size-3 shrink-0" />
 <span>{preset.destination}</span>
 </p>
 </div>
 ))}
 </div>
 </div>

 <hr className="border-border/60" />

 {/* Informações Principais */}
 <div className="space-y-3">
 <div className="space-y-1">
 <Label className="text-xs font-bold">Título da Excursão *</Label>
 <Input
 placeholder="Ex: Excursão Beto Carrero & Praias de Santa Catarina"
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 className="h-10 text-xs rounded-xl"
 required
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="text-xs font-bold">Cidade de Origem / Saída *</Label>
 <Input
 value={departureCity}
 onChange={(e) => setDepartureCity(e.target.value)}
 className="h-10 text-xs rounded-xl"
 required
 />
 </div>
 <div className="space-y-1">
 <Label className="text-xs font-bold">Destino Principal *</Label>
 <Input
 placeholder="Ex: Penha / Balneário Camboriú, SC"
 value={destination}
 onChange={(e) => setDestination(e.target.value)}
 className="h-10 text-xs rounded-xl"
 required
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="text-xs font-bold">Data & Horário de Saída *</Label>
 <div className="flex gap-2">
 <Input
 type="date"
 value={departureDate}
 onChange={(e) => setDepartureDate(e.target.value)}
 className="h-10 text-xs rounded-xl font-mono flex-1"
 required
 />
 <Input
 type="time"
 value={departureTime}
 onChange={(e) => setDepartureTime(e.target.value)}
 className="h-10 text-xs rounded-xl font-mono w-24"
 required
 />
 </div>
 </div>

 <div className="space-y-1">
 <Label className="text-xs font-bold">Data & Horário de Retorno *</Label>
 <div className="flex gap-2">
 <Input
 type="date"
 value={returnDate}
 onChange={(e) => setReturnDate(e.target.value)}
 className="h-10 text-xs rounded-xl font-mono flex-1"
 required
 />
 <Input
 type="time"
 value={returnTime}
 onChange={(e) => setReturnTime(e.target.value)}
 className="h-10 text-xs rounded-xl font-mono w-24"
 required
 />
 </div>
 </div>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold flex items-center justify-between">
 <span>Foto de Capa da Excursão (Panorâmica 16:9)</span>
 <span className="text-[10px] text-muted-foreground font-normal">
 Exibida na vitrine e vouchers
 </span>
 </Label>
 <ImageUpload
 value={coverImageUrl}
 onChange={setCoverImageUrl}
 onRemove={() => setCoverImageUrl("")}
 aspectPreset="widescreen"
 bucket="cms-media"
 helperText="Foto panorâmica 16:9 em alta resolução para capa da excursão"
 />
 </div>
 </div>
 </TabsContent>

 {/* ── ABA 2: FROTA & ÔNIBUS VIRTUAL ── */}
 <TabsContent value="frota" className="m-0 space-y-5">
 {/* Seleção do Ônibus da Frota */}
 <div className="space-y-3">
 <div className="space-y-1">
 <Label className="text-xs font-bold">Ônibus da Frota da Agência</Label>
 <p className="text-[11px] text-muted-foreground">
 Selecione um veículo cadastrado no seu Editor 2D da Frota para importar as poltronas exatas.
 </p>
 </div>

 {layouts.length > 0 ? (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
 {layouts.map((layout) => {
 const isSelected = selectedLayoutId === layout.id;
 return (
 <div
 key={layout.id}
 onClick={() => setSelectedLayoutId(layout.id)}
 className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
 isSelected
 ? "bg-primary/5 border-primary shadow-xs"
 : "bg-card border-border/70 hover:border-primary/40"
 }`}
 >
 <div className="flex items-center justify-between">
 <span className="font-bold text-foreground text-xs">{layout.name}</span>
 {isSelected && (
 <Badge className="bg-primary text-primary-foreground text-[10px] font-bold">
 Selecionado
 </Badge>
 )}
 </div>

 <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
 <Badge variant="outline" className="text-[10px] font-mono">
 {layout.total_capacity} Assentos
 </Badge>
 <span>•</span>
 <span>{layout.is_double_decker ? "Double Decker (2 Pisos)" : "Piso Único"}</span>
 </div>
 </div>
 );
 })}
 </div>
 ) : (
 <div className="p-4 rounded-xl bg-muted/30 border border-dashed border-border text-center space-y-1.5">
 <Bus className="size-6 mx-auto text-muted-foreground/60" />
 <p className="text-xs font-bold text-foreground">Nenhum veículo cadastrado na frota</p>
 <p className="text-[11px] text-muted-foreground">
 Usaremos a capacidade padrão de 46 lugares (Semi-Leito). Você pode cadastrar modelos em "Frota & Ônibus (Assentos 2D)".
 </p>
 </div>
 )}

 {/* Opção de Capacidade Manual se não usar veículo da frota */}
 {!selectedLayoutId && (
 <div className="space-y-1 pt-2">
 <Label className="text-xs font-bold">Padrão de Capacidade Rodoviária</Label>
 <select
 value={fallbackCapacity}
 onChange={(e) => setFallbackCapacity(Number(e.target.value))}
 className="w-full h-10 rounded-xl bg-background border border-border px-3 text-xs"
 >
 <option value={42}>42 Lugares — Leito Turismo (Piso Único)</option>
 <option value={46}>46 Lugares — Semi-Leito Executivo (Padrão)</option>
 <option value={50}>50 Lugares — Executivo Rodoviário</option>
 <option value={60}>60 Lugares — Double Decker (DD Panorâmico)</option>
 </select>
 </div>
 )}
 </div>

 <hr className="border-border/60" />

 {/* Dados Operacionais do Transporte */}
 <div className="space-y-3">
 <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
 Identificação Operacional (Para Manifesto ANTT)
 </span>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="text-xs font-bold">Empresa de Transporte / Viação</Label>
 <Input
 placeholder="Ex: Viação Catarinense / Frota Própria"
 value={busCompany}
 onChange={(e) => setBusCompany(e.target.value)}
 className="h-10 text-xs rounded-xl"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-xs font-bold">Placa do Ônibus</Label>
 <Input
 placeholder="Ex: ABC-1D23"
 value={busPlate}
 onChange={(e) => setBusPlate(e.target.value.toUpperCase())}
 className="h-10 text-xs rounded-xl font-mono uppercase"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="text-xs font-bold">Nome do Motorista Titular</Label>
 <Input
 placeholder="Ex: Valdir Pereira"
 value={driverName}
 onChange={(e) => setDriverName(e.target.value)}
 className="h-10 text-xs rounded-xl"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-xs font-bold">WhatsApp do Motorista</Label>
 <Input
 placeholder="(49) 99999-9999"
 value={driverPhone}
 onChange={(e) => setDriverPhone(e.target.value)}
 className="h-10 text-xs rounded-xl font-mono"
 />
 </div>
 </div>
 </div>
 </TabsContent>

 {/* ── ABA 3: EMBARQUE & INCLUSÕES ── */}
 <TabsContent value="embarque" className="m-0 space-y-5">
 {/* Pontos de Embarque Dinâmicos */}
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <div className="space-y-0.5">
 <Label className="text-xs font-bold">Pontos de Embarque no Trajeto</Label>
 <p className="text-[11px] text-muted-foreground">
 Locais e horários onde o ônibus fará paradas para embarcar passageiros.
 </p>
 </div>
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={addBoardingPoint}
 className="rounded-xl text-xs font-bold h-8 gap-1"
 >
 <Plus className="size-3.5" />
 <span>Adicionar Ponto</span>
 </Button>
 </div>

 <div className="space-y-2">
 {boardingPoints.map((bp, idx) => (
 <div
 key={idx}
 className="p-3 rounded-xl border border-border/70 bg-card space-y-2"
 >
 <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
 <span>Ponto #{idx + 1}</span>
 {boardingPoints.length > 1 && (
 <button
 type="button"
 onClick={() => removeBoardingPoint(idx)}
 className="text-destructive hover:underline cursor-pointer"
 >
 Remover
 </button>
 )}
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
 <div className="space-y-1 sm:col-span-1">
 <Label className="text-[10px] text-muted-foreground">Cidade *</Label>
 <Input
 placeholder="Ex: Maravilha, SC"
 value={bp.city}
 onChange={(e) => updateBoardingPoint(idx, "city", e.target.value)}
 className="h-9 text-xs rounded-lg"
 />
 </div>

 <div className="space-y-1 sm:col-span-1">
 <Label className="text-[10px] text-muted-foreground">Horário de Saída</Label>
 <Input
 type="time"
 value={bp.time}
 onChange={(e) => updateBoardingPoint(idx, "time", e.target.value)}
 className="h-9 text-xs rounded-lg font-mono"
 />
 </div>

 <div className="space-y-1 sm:col-span-1">
 <Label className="text-[10px] text-muted-foreground">Ponto de Encontro</Label>
 <Input
 placeholder="Ex: Trevo de Acesso"
 value={bp.location}
 onChange={(e) => updateBoardingPoint(idx, "location", e.target.value)}
 className="h-9 text-xs rounded-lg"
 />
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>

 <hr className="border-border/60" />

 {/* Itens Inclusos */}
 <div className="space-y-3">
 <div className="space-y-0.5">
 <Label className="text-xs font-bold">O Que Está Incluso no Pacote</Label>
 <p className="text-[11px] text-muted-foreground">
 Clique para ativar ou desativar os benefícios inclusos nesta excursão.
 </p>
 </div>

 <div className="flex flex-wrap gap-2">
 {COMMON_INCLUSIONS.map((item) => {
 const isSelected = includedItems.includes(item);
 return (
 <Badge
 key={item}
 variant={isSelected ? "default" : "outline"}
 onClick={() => toggleInclusion(item)}
 className={`cursor-pointer text-xs py-1.5 px-3 rounded-xl transition-all ${
 isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
 }`}
 >
 {isSelected && <CheckCircle2 className="size-3.5 mr-1" />}
 <span>{item}</span>
 </Badge>
 );
 })}
 </div>
 </div>
 </TabsContent>

 {/* ── ABA 4: TARIFÁRIO & CONDIÇÕES ── */}
 <TabsContent value="tarifario" className="m-0 space-y-5">
 <div className="space-y-3">
 <div className="space-y-1">
 <Label className="text-xs font-bold">Valor por Pessoa (Por Assento) *</Label>
 <div className="relative">
 <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs text-muted-foreground">
 R$
 </span>
 <Input
 value={priceBrl}
 onChange={handlePriceChange}
 className="h-11 pl-9 text-base font-mono font-bold rounded-xl"
 placeholder="0,00"
 required
 />
 </div>
 <p className="text-[11px] text-muted-foreground">
 Capacidade total: <strong className="text-foreground">{effectiveTotalSeats} lugares</strong> • Volume estimado:{" "}
 <strong className="text-foreground font-mono">
 {(priceCents * effectiveTotalSeats / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
 </strong>
 </p>
 </div>

 <div className="space-y-1">
 <Label className="text-xs font-bold">Condições de Pagamento e Parcelamento</Label>
 <Input
 placeholder="Ex: Entrada de 20% + até 10x sem juros no cartão ou 4x no carnê"
 value={paymentConditions}
 onChange={(e) => setPaymentConditions(e.target.value)}
 className="h-10 text-xs rounded-xl"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-xs font-bold">Observações e Informações Gerais</Label>
 <Textarea
 placeholder="Ex: Saída pontual com tolerância de 15 minutos. Levar documento com foto original."
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 className="rounded-xl text-xs resize-none"
 rows={4}
 />
 </div>
 </div>
 </TabsContent>
 </div>
 </Tabs>

 {/* ── 3. RODAPÉ FIXO DE AÇÃO ── */}
 <div className="p-4 px-5 border-t border-border/80 bg-card flex items-center justify-between">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => onOpenChange(false)}
 className="rounded-xl text-xs h-10 px-4"
 >
 Cancelar
 </Button>

 <Button
 type="button"
 size="sm"
 disabled={createMutation.isPending || !title || !destination || !departureDate || !returnDate}
 onClick={() => createMutation.mutate()}
 className="rounded-xl text-xs font-bold h-10 px-6 bg-foreground text-background hover:bg-foreground/90 gap-2 cursor-pointer"
 >
 <CheckCircle2 className="size-4 text-emerald-500" />
 <span>{createMutation.isPending ? "Cadastrando Excursão..." : "Cadastrar e Abrir Mapa 2D"}</span>
 </Button>
 </div>
 </SheetContent>
 </Sheet>
 );
}
