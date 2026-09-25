import { createFileRoute, Link, redirect, isRedirect } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Store, ArrowLeft, ArrowRight, Loader2, Check, Sliders, Clock, Truck, FileText, Trash2, Plus, Users, Mail, Shield, CheckCircle2, Search, CheckCircle, Building2, ChevronRight, UserPlus, Bike, ShieldCheck, Zap, BadgePercent, Star, MapPin, Phone, Eye, Layers } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyField } from "@/components/ui/currency-field";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { CitySelect } from "@/components/ui/city-select";
import { ImageUpload } from "@/components/ui/image-upload";
import {
 BusinessLocationPicker,
 type BusinessLocationData,
 type BusinessModelType,
} from "@/components/commerce/business-location-picker";
import {
 BUSINESS_SEGMENTS,
 BUSINESS_CATEGORIES,
 type BusinessSegment,
} from "@/lib/constants/business-segments";
import { BusinessHoursEditor } from "@/components/commerce/business-hours-editor";
import { getPresetForSegment, type WeeklySchedule } from "@/lib/business-hours";
import { setTenantContext } from "@/services/identity.functions";
import { provisionBusiness } from "@/services/onboarding.functions";
import { lookupCnpj } from "@/services/public-apis.functions";
import { formatCnpj, formatCpf, formatCep, cleanDocument, validateCnpjMod11 } from "@/lib/document-validator";
import { uploadStoreMedia } from "@/services/storage.functions";
import { getUserSession } from "@/services/auth.functions";
import { getPublicLogisticsPresentation } from "@/services/master.functions";
import { NeighborhoodsManager, type NeighborhoodItem } from "@/components/commerce/neighborhoods-manager";
import { CHAPECO_NEIGHBORHOODS } from "@/lib/constants/cities";
import { useMasterLocation } from "@/components/location/location-master-pill";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_store/criar-negocio/avancado")({
 head: () => ({ meta: [{ title: "Cadastrar Novo Negócio | Waesy" }] }),
 validateSearch: (search: Record<string, unknown>): { segment?: string } => {
 return {
 segment: (search.segment as string) || undefined,
 };
 },
 beforeLoad: async ({ location }) => {
 let session: any = null;
 try {
 session = await getUserSession();
 } catch {
 session = null;
 }

 if (!session?.user) {
 throw redirect({
 to: "/entrar",
 search: { returnUrl: location.pathname + location.searchStr },
 });
 }
 return { session };
 },
 loader: async ({ location }) => {
   try {
 let session: any = null;
 try {
 session = await getUserSession();
 } catch {
 session = null;
 }

 if (!session?.user) {
 throw redirect({
 to: "/entrar",
 search: { returnUrl: location.pathname + location.searchStr },
 });
 }

 const logisticsInfo = await getPublicLogisticsPresentation().catch(() => null);
 return { logisticsInfo, session };
    } catch (err) {
      if (isRedirect(err)) throw err;
      console.error("[loader:_store.criar-negocio.avancado] Unhandled loader error:", err);
      return { logisticsInfo: null, session: null };
    }
  },
 component: CriarNegocioPage,
});

type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6;

interface InvitedTeamMember {
 email: string;
 fullName: string;
 role: "admin" | "manager" | "seller" | "finance" | "content" | "support" | "stock";
}

function CriarNegocioPage() {
  const { logisticsInfo = null, session = null } = (Route.useLoaderData() as any) || {};
 const search = Route.useSearch();
 const initialSegment = search?.segment || "";
 const foundInitial = BUSINESS_SEGMENTS.find((s) => s.id === initialSegment);

 const { location: masterLoc } = useMasterLocation();
 const detectedCity = masterLoc.city && masterLoc.city.toLowerCase() !== "global" ? masterLoc.city : "";
 const detectedState = masterLoc.state || "";

 const [step, setStep] = useState<OnboardingStep>(foundInitial ? 2 : 1);
 const [selectedSegmentId, setSelectedSegmentId] = useState<string>(
 foundInitial ? foundInitial.id : "gastronomy"
 );
 const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("todas");
 const [searchQuery, setSearchQuery] = useState("");

 // Etapa 2: Dados Básicos, Endereço no Mapa & Modelo de Atendimento
 const [name, setName] = useState("");
 const [docNumber, setDocNumber] = useState("");
 const [phone, setPhone] = useState("");
 const [email, setEmail] = useState("");
 const [locationData, setLocationData] = useState<BusinessLocationData>({
 businessModel: "physical_and_delivery",
 isAddressPublic: true,
 zipCode: "",
 street: "",
 number: "",
 complement: "",
 neighborhood: "",
 city: detectedCity,
 state: detectedState,
 fullAddress: "",
 latitude: masterLoc.lat || undefined,
 longitude: masterLoc.lng || undefined,
 serviceRadiusKm: 15,
 coverageCities: detectedCity ? [detectedCity] : [],
 });

 // Etapa 3: Identidade Visual
 const [logoUrl, setLogoUrl] = useState("");
 const [bannerUrl, setBannerUrl] = useState("");

 // Etapa 4: Operação & Entrega / Atendimento
 const [hasDelivery, setHasDelivery] = useState(true);
 const [hasPickup, setHasPickup] = useState(true);
 const [hasInPersonService, setHasInPersonService] = useState(true);
 const [hasOnlineService, setHasOnlineService] = useState(true);
 const [neighborhoods, setNeighborhoods] = useState<NeighborhoodItem[]>(CHAPECO_NEIGHBORHOODS);
 const [workingHours, setWorkingHours] = useState<WeeklySchedule>(() =>
 getPresetForSegment("gastronomia")
 );

 // Etapa 5: Documentos Opcionais
 const [complianceDocs, setComplianceDocs] = useState<Array<{ name: string; url: string }>>([]);
 const [isUploadingDoc, setIsUploadingDoc] = useState(false);

 // Etapa 6: Equipe & Membros
 const [teamMembers, setTeamMembers] = useState<InvitedTeamMember[]>([]);
 const [newMemberEmail, setNewMemberEmail] = useState("");
 const [newMemberName, setNewMemberName] = useState("");
 const [newMemberRole, setNewMemberRole] = useState<InvitedTeamMember["role"]>("seller");

 const [isSubmitting, setIsSubmitting] = useState(false);

 const selectedSegment =
 BUSINESS_SEGMENTS.find((s) => s.id === selectedSegmentId) || BUSINESS_SEGMENTS[0];

 const isDeliverySegment = useMemo(() => {
 return (
 selectedSegment.category === "alimentacao" ||
 selectedSegment.id === "ecommerce" ||
 selectedSegment.id === "pet" ||
 selectedSegment.id === "pharmacy"
 );
 }, [selectedSegment]);

 // Filtro de nichos na Etapa 1
 const filteredSegments = useMemo(() => {
 return BUSINESS_SEGMENTS.filter((seg) => {
 const matchesCategory =
 activeCategoryFilter === "todas" || seg.category === activeCategoryFilter;
 const matchesSearch =
 !searchQuery.trim() ||
 seg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
 seg.shortDesc.toLowerCase().includes(searchQuery.toLowerCase()) ||
 seg.badge.toLowerCase().includes(searchQuery.toLowerCase());
 return matchesCategory && matchesSearch;
 });
 }, [activeCategoryFilter, searchQuery]);

 const handleSelectNicheAndProceed = (nicheId: string) => {
 setSelectedSegmentId(nicheId);
 setWorkingHours(getPresetForSegment(nicheId));
 setStep(2);
 if (typeof window !== "undefined") {
 window.scrollTo({ top: 0, behavior: "smooth" });
 }
 };

 const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;

 setIsUploadingDoc(true);
 try {
 const reader = new FileReader();
 reader.onload = async () => {
 try {
 const base64Data = reader.result as string;
 const res = await uploadStoreMedia({
 data: {
 fileName: file.name,
 fileType: file.type,
 base64Data,
 bucket: "cms-media",
 },
 });
 if (res?.url) {
 setComplianceDocs((prev) => [...prev, { name: file.name, url: res.url }]);
 toast.success("Documento anexado com sucesso!");
 }
 } catch (err: any) {
 toast.error(err.message || "Erro no upload.");
 } finally {
 setIsUploadingDoc(false);
 }
 };
 reader.readAsDataURL(file);
 } catch {
 setIsUploadingDoc(false);
 toast.error("Falha ao ler arquivo.");
 }
 };

 const handleToggleNeighborhood = (index: number) => {
 setNeighborhoods((prev) =>
 prev.map((item, i) => (i === index ? { ...item, active: !item.active } : item))
 );
 };

 const handleUpdateNeighborhoodFee = (index: number, feeCents: number) => {
 setNeighborhoods((prev) =>
 prev.map((item, i) => (i === index ? { ...item, defaultFeeCents: feeCents } : item))
 );
 };

 const handleAddTeamMember = () => {
 const cleanEmail = newMemberEmail.trim().toLowerCase();
 if (!cleanEmail || !cleanEmail.includes("@")) {
 toast.error("Informe um e-mail válido para o colaborador.");
 return;
 }

 if (teamMembers.some((m) => m.email === cleanEmail)) {
 toast.error("Este e-mail já foi adicionado à lista.");
 return;
 }

 setTeamMembers((prev) => [
 ...prev,
 {
 email: cleanEmail,
 fullName: newMemberName.trim(),
 role: newMemberRole,
 },
 ]);
 setNewMemberEmail("");
 setNewMemberName("");
 setNewMemberRole("seller");
 toast.success("Membro adicionado à lista de convites!");
 };

 const handleRemoveTeamMember = (emailToRemove: string) => {
 setTeamMembers((prev) => prev.filter((m) => m.email !== emailToRemove));
 };

 const handleSubmitAll = async () => {
 if (!name || name.trim().length < 2) {
 toast.error("Informe o nome do seu negócio.");
 setStep(2);
 return;
 }

 setIsSubmitting(true);
 try {
 const result = await provisionBusiness({
 data: {
 name: name.trim(),
 type: selectedSegment.id as any,
 document: docNumber ? docNumber.trim() : undefined,
 city: locationData.city || detectedCity || "Sua Cidade",
 state: locationData.state || detectedState || "",
 street: locationData.street || undefined,
 number: locationData.number || undefined,
 complement: locationData.complement || undefined,
 neighborhood: locationData.neighborhood || undefined,
 zipCode: locationData.zipCode || undefined,
 address: locationData.fullAddress || (locationData.street ? `${locationData.street}, ${locationData.number || "S/N"}` : undefined),
 latitude: locationData.latitude,
 longitude: locationData.longitude,
 businessModel: locationData.businessModel,
 isAddressPublic: locationData.isAddressPublic,
 serviceRadiusKm: locationData.serviceRadiusKm,
 coverageCities: locationData.coverageCities,
 phone: phone.trim() || undefined,
 email: email.trim() || undefined,
 logoUrl: logoUrl || undefined,
 bannerUrl: bannerUrl || undefined,
 workingHours,
 deliveryZones: hasDelivery ? neighborhoods.filter((n) => n.active) : [],
 complianceDocuments: complianceDocs,
 teamMembers: teamMembers.length > 0 ? teamMembers : undefined,
 },
 });

 if (result?.storeId) {
 if (typeof window !== "undefined") {
 window.document.cookie = `waesy_active_tenant=${result.storeId}; path=/; max-age=31536000; SameSite=Lax`;
 }
 await setTenantContext({ data: { store_id: result.storeId } }).catch(() => null);
 }

 toast.success(`Negócio "${result?.storeName || name}" cadastrado com sucesso! Redirecionando...`);
 window.location.href = "/workspace";
 } catch (err: unknown) {
 toast.error(
 (err instanceof Error ? err.message : String(err)) || "Erro ao cadastrar negócio."
 );
 setIsSubmitting(false);
 }
 };

 const stepsList = [
 { number: 1, label: "Nicho" },
 { number: 2, label: "Identificação" },
 { number: 3, label: "Identidade Visual" },
 { number: 4, label: "Operação" },
 { number: 5, label: "Documentos" },
 { number: 6, label: "Equipe" },
 ];

 return (
 <div className="w-full max-w-6xl mx-auto py-2 space-y-6 animate-in fade-in duration-200">
 {/* ── Top Bar de Retorno / Atalho ao Workspace ou Início ── */}
 <div className="flex items-center justify-between">
 <Button asChild variant="ghost" size="sm" className="rounded-xl text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground min-h-[44px] sm:min-h-[36px] h-11 sm:h-9">
 <Link to={session?.memberships && session.memberships.length > 0 ? "/workspace" : "/"}>
 <ArrowLeft className="size-3.5" />
 <span>{session?.memberships && session.memberships.length > 0 ? "Voltar ao Workspace" : "Voltar ao Início"}</span>
 </Link>
 </Button>
 </div>
 {step > 1 && (
 <div className="bg-card p-4 rounded-2xl border border-border/70 space-y-3">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div className="flex items-center gap-3">
 <Button
 variant="ghost"
 size="sm"
 onClick={() => setStep((prev) => Math.max(1, prev - 1) as OnboardingStep)}
 className="h-8 rounded-xl px-2.5 text-xs font-bold text-muted-foreground hover:text-foreground gap-1.5"
 >
 <ArrowLeft className="size-3.5" />
 <span>Voltar</span>
 </Button>
 <div className="h-4 w-px bg-border/80" />
 <div className="flex items-center gap-2">
 <div className={cn("size-6 rounded-lg flex items-center justify-center text-xs font-bold", selectedSegment.iconBg, selectedSegment.iconColor)}>
 <selectedSegment.icon className="size-3.5" />
 </div>
 <span className="text-xs font-bold text-foreground truncate max-w-[200px] sm:max-w-none">
 {name || selectedSegment.title}
 </span>
 <Badge variant="outline" className="text-[10px] hidden sm:inline-flex bg-muted/30">
 {selectedSegment.badge}
 </Badge>
 </div>
 </div>

 <Button
 variant="outline"
 size="sm"
 onClick={() => setStep(1)}
 className="h-8 rounded-xl text-[11px] font-medium text-muted-foreground hover:text-foreground ml-auto sm:ml-0"
 >
 Trocar Segmento
 </Button>
 </div>

 {/* Stepper Horizontal */}
 <div className="overflow-x-auto no-scrollbar pt-1">
 <div className="flex sm:grid sm:grid-cols-6 gap-2 min-w-max sm:min-w-0">
 {stepsList.map((s) => {
 const isActive = step === s.number;
 const isPassed = step > s.number;

 return (
 <button
 key={s.number}
 type="button"
 onClick={() => {
 if (isPassed || s.number === 1) {
 setStep(s.number as OnboardingStep);
 }
 }}
 className={cn(
 "flex items-center gap-2 p-2 rounded-xl text-left transition-all",
 isActive && "bg-primary text-primary-foreground font-bold shadow-xs",
 isPassed && "bg-muted/40 text-foreground hover:bg-muted/60 cursor-pointer",
 !isActive && !isPassed && "text-muted-foreground/60 opacity-60 cursor-default"
 )}
 >
 <div
 className={cn(
 "size-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
 isActive && "bg-white/20 text-white",
 isPassed && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
 !isActive && !isPassed && "bg-muted/50 text-muted-foreground"
 )}
 >
 {isPassed ? <Check className="size-3.5" /> : s.number}
 </div>
 <span className="text-xs truncate font-medium">{s.label}</span>
 </button>
 );
 })}
 </div>
 </div>
 </div>
 )}

 {/* ═════════════════════════════════════════════════════════════════════ */}
 {/* ── ETAPA 1: SELETOR DE NICHOS COM STORY CARDS (MAX-W-6XL 4 COLS) ── */}
 {/* ═════════════════════════════════════════════════════════════════════ */}
 {step === 1 && (
 <div className="space-y-6">
 <div className="text-center max-w-2xl mx-auto space-y-2 py-4">
 <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-bold px-3 py-1">
 Etapa 1 • Escolha seu Nicho
 </Badge>
 <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
 Criar Negócio
 </h1>
 <p className="text-xs sm:text-sm text-muted-foreground">
 Selecione o segmento principal para configurarmos automaticamente o catálogo, estoque, PDV e regras operacionais.
 </p>
 </div>

 {/* Filtros e Busca */}
 <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/70">
 <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
 {BUSINESS_CATEGORIES.map((cat) => (
 <button
 key={cat.id}
 type="button"
 onClick={() => setActiveCategoryFilter(cat.id)}
 className={cn(
 "px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all",
 activeCategoryFilter === cat.id
 ? "bg-foreground text-background font-bold"
 : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70"
 )}
 >
 {cat.label}
 </button>
 ))}
 </div>

 <div className="relative w-full sm:w-64 shrink-0">
 <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
 <Input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Buscar segmento..."
 className="h-9 pl-9 rounded-xl text-xs bg-background"
 />
 </div>
 </div>

 {/* Grid de 4 Colunas de Nichos */}
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
 {filteredSegments.map((segment) => {
 const isSelected = selectedSegmentId === segment.id;
 const IconComp = segment.icon;

 return (
 <div
 key={segment.id}
 onClick={() => handleSelectNicheAndProceed(segment.id)}
 className={cn(
 "group relative h-64 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 border flex flex-col justify-between p-5 select-none active:scale-[0.98]",
 isSelected
 ? "border-primary ring-2 ring-primary shadow-xs"
 : "border-border/60 hover:border-foreground/30 hover:shadow-xs"
 )}
 >
 <img
 src={segment.coverImage}
 alt={segment.title}
 className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
 />
 <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />

 <div className="relative z-10 flex items-start justify-between gap-2">
 <div className="size-9 rounded-xl flex items-center justify-center backdrop-blur-md bg-black/40 border border-white/15 text-white">
 <IconComp className="size-4" />
 </div>
 <Badge className="bg-white/15 backdrop-blur-md text-white border-white/20 text-[10px] font-semibold px-2 py-0.5">
 {segment.badge}
 </Badge>
 </div>

 <div className="relative z-10 space-y-1 text-white">
 <h3 className="font-bold text-sm tracking-tight leading-snug">
 {segment.title}
 </h3>
 <p className="text-[11px] text-white/80 line-clamp-2 leading-relaxed">
 {segment.shortDesc}
 </p>
 </div>
 </div>
 );
 })}
 </div>

 {filteredSegments.length === 0 && (
 <div className="p-12 text-center bg-card rounded-2xl border border-dashed border-border/80 space-y-2">
 <p className="text-sm font-bold text-foreground">Nenhum segmento encontrado</p>
 <p className="text-xs text-muted-foreground">
 Tente buscar com outros termos ou selecione "Todas as Categorias".
 </p>
 <Button
 variant="outline"
 size="sm"
 onClick={() => {
 setActiveCategoryFilter("todas");
 setSearchQuery("");
 }}
 className="mt-2 rounded-xl text-xs font-bold"
 >
 Limpar Filtros
 </Button>
 </div>
 )}
 </div>
 )}

 {/* ═════════════════════════════════════════════════════════════════════ */}
 {/* ── ETAPAS 2 A 6: GRID 12-COL MASTER-DETAIL COM LIVE STORE PREVIEW ── */}
 {/* ═════════════════════════════════════════════════════════════════════ */}
 {step > 1 && (
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
 {/* ── COLUNA ESQUERDA: FORMULÁRIO ATUAL (7 COLS) ── */}
 <div className="lg:col-span-7 space-y-6 w-full min-w-0">
 {/* ETAPA 2: IDENTIFICAÇÃO */}
 {step === 2 && (
 <div className="bg-card p-6 sm:p-8 rounded-2xl border border-border/70 space-y-6 shadow-xs">
 <div className="space-y-1 pb-2 border-b border-border/60">
 <h2 className="text-lg font-bold text-foreground">Identificação do Negócio</h2>
 <p className="text-xs text-muted-foreground">
 Informe o nome oficial e a localização onde sua unidade atenderá clientes e entregas.
 </p>
 </div>

 <div className="space-y-4">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">
 Nome da Loja / Estabelecimento *
 </Label>
 <Input
 value={name}
 onChange={(e) => setName(e.target.value)}
 placeholder="Ex: Armazém do Sabor, Boutique Chic, Dr. Pet..."
 className="h-11 rounded-xl text-sm bg-background font-medium"
 autoFocus
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-muted-foreground">
 CNPJ ou CPF (Opcional)
 </Label>
 <Input
 value={docNumber}
 onChange={(e) => setDocNumber(e.target.value)}
 placeholder="00.000.000/0001-00"
 className="h-11 rounded-xl text-xs bg-background font-mono"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-muted-foreground">
 WhatsApp / Telefone de Contato
 </Label>
 <Input
 value={phone}
 onChange={(e) => setPhone(e.target.value)}
 placeholder="(49) 99999-9999"
 className="h-11 rounded-xl text-xs bg-background font-mono"
 />
 </div>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-muted-foreground">
 E-mail Comercial da Loja
 </Label>
 <Input
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 placeholder="contato@sualoja.com.br"
 className="h-11 rounded-xl text-xs bg-background"
 />
 </div>

 {/* Componente Canônico de Modelo de Atendimento, Busca de CEP, Mapa Interativo e Raio */}
 <div className="pt-2">
 <BusinessLocationPicker
 value={locationData}
 onChange={setLocationData}
 segment={selectedSegmentId}
 />
 </div>
 </div>

 <div className="flex items-center justify-between pt-4 border-t border-border/60">
 <Button
 variant="ghost"
 onClick={() => setStep(1)}
 className="rounded-xl text-xs font-bold gap-1"
 >
 <ArrowLeft className="size-3.5" /> Escolher outro nicho
 </Button>
 <Button
 onClick={() => {
 if (!name.trim()) {
 toast.error("Informe o nome do seu negócio.");
 return;
 }
 if (!locationData.city.trim()) {
 toast.error("Informe a cidade sede do negócio.");
 return;
 }
 setStep(3);
 }}
 className="rounded-xl text-xs font-bold h-11 px-6 gap-2 bg-primary text-primary-foreground shadow-xs"
 >
 <span>Avançar para Identidade Visual</span>
 <ArrowRight className="size-3.5" />
 </Button>
 </div>
 </div>
 )}

 {/* ETAPA 3: IDENTIDADE VISUAL */}
 {step === 3 && (
 <div className="bg-card p-6 sm:p-8 rounded-2xl border border-border/70 space-y-6 shadow-xs">
 <div className="space-y-1 pb-2 border-b border-border/60">
 <h2 className="text-lg font-bold text-foreground">Identidade Visual da Loja</h2>
 <p className="text-xs text-muted-foreground">
 Personalize a capa panorâmica e o logotipo oficial. Use o controle de corte e zoom interativo.
 </p>
 </div>

 <div className="space-y-6">
 {/* Banner de Capa Panorâmico */}
 <div className="space-y-2">
 <Label className="text-xs font-bold text-foreground">Capa de Cabeçalho (Banner da Loja)</Label>
 <ImageUpload
 value={bannerUrl}
 onChange={(url) => {
 setBannerUrl(url);
 toast.success("Capa da loja configurada!");
 }}
 onRemove={() => setBannerUrl("")}
 bucket="cms-media"
 variant="banner"
 aspectPreset="banner"
 helperText="Formato panorâmico (21:9). Aparece no topo do seu catálogo e vitrine."
 />
 </div>

 {/* Logotipo Oficial */}
 <div className="space-y-2 pt-2 border-t border-border/40">
 <Label className="text-xs font-bold text-foreground">Logotipo Oficial da Loja</Label>
 <div className="flex items-center gap-5 p-4 rounded-2xl bg-muted/20 border border-border/60">
 <ImageUpload
 value={logoUrl}
 onChange={(url) => {
 setLogoUrl(url);
 toast.success("Logotipo atualizado!");
 }}
 onRemove={() => setLogoUrl("")}
 bucket="cms-media"
 variant="avatar"
 aspectPreset="square"
 className="w-24 h-24 sm:w-28 sm:h-28"
 />
 <div className="space-y-1 text-left">
 <p className="text-xs font-bold text-foreground">Ícone / Avatar Quadrado (1:1)</p>
 <p className="text-[11px] text-muted-foreground leading-relaxed">
 Recomendado: 512x512px. Exibido na busca, no topo do cardápio e nos comprovantes de pedido.
 </p>
 </div>
 </div>
 </div>
 </div>

 <div className="flex items-center justify-between pt-4 border-t border-border/60">
 <Button
 variant="ghost"
 onClick={() => setStep(2)}
 className="rounded-xl text-xs font-bold gap-1"
 >
 <ArrowLeft className="size-3.5" /> Voltar aos dados
 </Button>
 <Button
 onClick={() => setStep(4)}
 className="rounded-xl text-xs font-bold h-11 px-6 gap-2 bg-primary text-primary-foreground shadow-xs"
 >
 <span>Avançar para Operação & Entrega</span>
 <ArrowRight className="size-3.5" />
 </Button>
 </div>
 </div>
 )}

 {/* ETAPA 4: OPERAÇÃO & ATENDIMENTO */}
 {step === 4 && (
 <div className="space-y-6">
 {/* Banner de Logística — EXCLUSIVO para negócios de Delivery/Varejo */}
 {isDeliverySegment && (
 <div className="relative rounded-2xl overflow-hidden border border-border/80 bg-card shadow-xs">
 <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-black">
 {logisticsInfo?.image_desktop_url && (
 <img
 src={logisticsInfo.image_desktop_url}
 alt="Logística Integrada e Entregadores"
 className="size-full object-cover"
 />
 )}
 <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

 <div className="absolute inset-x-0 bottom-0 p-5 text-white space-y-1.5">
 <div className="flex items-center gap-2">
 <Badge className="bg-emerald-500 text-white text-[10px] font-extrabold px-2.5 py-0.5 border-none">
 Zero Taxa de Intermediação
 </Badge>
 </div>
 <h2 className="text-base sm:text-xl font-black tracking-tight text-white">
 {logisticsInfo?.title || "Logística Integrada & MotoLink"}
 </h2>
 <p className="text-xs text-white/90 line-clamp-2 leading-relaxed">
 {logisticsInfo?.subtitle ||
 "Conecte-se aos entregadores autônomos da sua cidade com 1 clique sem taxas abusivas."}
 </p>
 </div>
 </div>
 </div>
 )}

 {/* Configurações Operacionais */}
 <div className="bg-card p-6 sm:p-8 rounded-2xl border border-border/70 space-y-6 shadow-xs">
 <div className="space-y-1 pb-2 border-b border-border/60">
 <h3 className="text-base font-bold text-foreground">
 {isDeliverySegment ? "Configurações de Entrega & Atendimento" : "Modalidades de Atendimento & Horários"}
 </h3>
 <p className="text-xs text-muted-foreground">
 {isDeliverySegment
 ? "Selecione as modalidades que sua loja atenderá no catálogo e defina horários de entrega."
 : "Defina como seus clientes serão atendidos e o horário comercial de funcionamento da sua empresa."}
 </p>
 </div>

 <div className="space-y-5">
 {/* Modalidades Condicionais */}
 {isDeliverySegment ? (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/60">
 <div className="space-y-0.5">
 <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <Truck className="size-4 text-primary" />
 <span>Delivery & MotoLink</span>
 </p>
 <p className="text-[11px] text-muted-foreground">
 Entregas no endereço do cliente via motoboys ou frota própria.
 </p>
 </div>
 <Switch checked={hasDelivery} onCheckedChange={setHasDelivery} />
 </div>

 <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/60">
 <div className="space-y-0.5">
 <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <Store className="size-4 text-primary" />
 <span>Retirada no Balcão</span>
 </p>
 <p className="text-[11px] text-muted-foreground">
 Permita que clientes retirem pessoalmente na sua loja.
 </p>
 </div>
 <Switch checked={hasPickup} onCheckedChange={setHasPickup} />
 </div>
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/60">
 <div className="space-y-0.5">
 <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <Building2 className="size-4 text-primary" />
 <span>Atendimento Presencial no Escritório / Sede</span>
 </p>
 <p className="text-[11px] text-muted-foreground">
 Receba clientes e viajantes pessoalmente no seu endereço físico.
 </p>
 </div>
 <Switch checked={hasInPersonService} onCheckedChange={setHasInPersonService} />
 </div>

 <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/60">
 <div className="space-y-0.5">
 <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <Phone className="size-4 text-primary" />
 <span>Atendimento Online / WhatsApp / Remoto</span>
 </p>
 <p className="text-[11px] text-muted-foreground">
 Cotações, reservas e suporte digital direto via canais virtuais.
 </p>
 </div>
 <Switch checked={hasOnlineService} onCheckedChange={setHasOnlineService} />
 </div>
 </div>
 )}

 {/* Horário de Atendimento */}
 <div className="space-y-3 pt-2">
 <div className="flex items-center justify-between">
 <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <Clock className="size-4 text-primary" />
 <span>Grade de Horários de Funcionamento</span>
 </Label>
 </div>

 <BusinessHoursEditor
 value={workingHours}
 onChange={(newHours) => setWorkingHours(newHours)}
 showPresets={true}
 showStatusPreview={true}
 />
 </div>

 {/* Bairros e Taxas de Entrega — APENAS SE FOR DELIVERY ATIVO */}
 {isDeliverySegment && hasDelivery && (
 <div className="pt-4 border-t border-border/60">
 <NeighborhoodsManager
 cityName={locationData.city || detectedCity || "Sua Cidade"}
 value={neighborhoods}
 onChange={setNeighborhoods}
 />
 </div>
 )}
 </div>

 <div className="flex items-center justify-between pt-4 border-t border-border/60">
 <Button
 variant="ghost"
 onClick={() => setStep(3)}
 className="rounded-xl text-xs font-bold gap-1"
 >
 <ArrowLeft className="size-3.5" /> Voltar
 </Button>
 <Button
 onClick={() => setStep(5)}
 className="rounded-xl text-xs font-bold h-11 px-6 gap-2 bg-primary text-primary-foreground shadow-xs"
 >
 <span>Avançar para Documentos</span>
 <ArrowRight className="size-3.5" />
 </Button>
 </div>
 </div>
 </div>
 )}

 {/* ETAPA 5: DOCUMENTOS OPCIONAIS */}
 {step === 5 && (
 <div className="bg-card p-6 sm:p-8 rounded-2xl border border-border/70 space-y-6 shadow-xs">
 <div className="space-y-1 pb-2 border-b border-border/60">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-bold text-foreground">Documentos & Regularização</h2>
 <Badge variant="outline" className="text-[10px]">Opcional</Badge>
 </div>
 <p className="text-xs text-muted-foreground">
 Anexe cartão CNPJ, alvarás ou documentos de sócios. Você também pode anexar depois nas configurações.
 </p>
 </div>

 <div className="space-y-4">
 <div className="border-2 border-dashed border-border/80 rounded-2xl p-6 text-center bg-muted/20 hover:bg-muted/40 transition-colors">
 <FileText className="size-8 mx-auto text-muted-foreground opacity-50 mb-2" />
 <p className="text-xs font-bold text-foreground">
 Anexar Cartão CNPJ, Alvará ou Contrato Social
 </p>
 <p className="text-[11px] text-muted-foreground mt-0.5">
 Formatos aceitos: PDF, PNG ou JPG (até 10MB)
 </p>
 <label className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity shadow-xs">
 {isUploadingDoc ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
 <span>{isUploadingDoc ? "Enviando..." : "Selecionar Arquivo"}</span>
 <input
 type="file"
 accept=".pdf,image/*"
 className="hidden"
 onChange={handleDocUpload}
 disabled={isUploadingDoc}
 />
 </label>
 </div>

 {complianceDocs.length > 0 && (
 <div className="space-y-2">
 <p className="text-xs font-bold text-foreground">Documentos Anexados ({complianceDocs.length})</p>
 <div className="space-y-1.5">
 {complianceDocs.map((doc, dIdx) => (
 <div
 key={dIdx}
 className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/60 text-xs"
 >
 <div className="flex items-center gap-2 truncate">
 <FileText className="size-4 text-primary shrink-0" />
 <span className="font-medium truncate">{doc.name}</span>
 </div>
 <Button
 variant="ghost"
 size="icon"
 onClick={() => setComplianceDocs((prev) => prev.filter((_, i) => i !== dIdx))}
 className="size-7 text-muted-foreground hover:text-destructive"
 >
 <Trash2 className="size-3.5" />
 </Button>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>

 <div className="flex items-center justify-between pt-4 border-t border-border/60">
 <Button
 variant="ghost"
 onClick={() => setStep(4)}
 className="rounded-xl text-xs font-bold gap-1"
 >
 <ArrowLeft className="size-3.5" /> Voltar
 </Button>
 <Button
 onClick={() => setStep(6)}
 className="rounded-xl text-xs font-bold h-11 px-6 gap-2 bg-primary text-primary-foreground shadow-xs"
 >
 <span>Avançar para Convite de Equipe</span>
 <ArrowRight className="size-3.5" />
 </Button>
 </div>
 </div>
 )}

 {/* ETAPA 6: EQUIPE & PERMISSÕES */}
 {step === 6 && (
 <div className="bg-card p-6 sm:p-8 rounded-2xl border border-border/70 space-y-6 shadow-xs">
 <div className="space-y-1 pb-2 border-b border-border/60">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-bold text-foreground">Equipe & Permissões</h2>
 <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
 Última Etapa
 </Badge>
 </div>
 <p className="text-xs text-muted-foreground">
 Convide sócios, gerentes, atendentes e operadores para colaborar no gerenciamento da loja.
 </p>
 </div>

 <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-3">
 <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <UserPlus className="size-3.5 text-primary" />
 <span>Adicionar Colaborador à Loja</span>
 </p>

 <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
 <div className="sm:col-span-5 space-y-1">
 <Label className="text-[11px] text-muted-foreground">E-mail *</Label>
 <Input
 type="email"
 value={newMemberEmail}
 onChange={(e) => setNewMemberEmail(e.target.value)}
 placeholder="colaborador@email.com"
 className="h-10 rounded-xl text-xs bg-background"
 />
 </div>

 <div className="sm:col-span-4 space-y-1">
 <Label className="text-[11px] text-muted-foreground">Nome</Label>
 <Input
 value={newMemberName}
 onChange={(e) => setNewMemberName(e.target.value)}
 placeholder="Nome completo"
 className="h-10 rounded-xl text-xs bg-background"
 />
 </div>

 <div className="sm:col-span-3 space-y-1">
 <Label className="text-[11px] text-muted-foreground">Cargo</Label>
 <Select
 value={newMemberRole}
 onValueChange={(val: any) => setNewMemberRole(val)}
 >
 <SelectTrigger className="h-10 rounded-xl text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="admin">Administrador</SelectItem>
 <SelectItem value="manager">Gerente</SelectItem>
 <SelectItem value="seller">Vendedor / PDV</SelectItem>
 <SelectItem value="finance">Financeiro</SelectItem>
 <SelectItem value="stock">Estoquista</SelectItem>
 <SelectItem value="support">Suporte</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 <div className="flex justify-end pt-1">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={handleAddTeamMember}
 className="rounded-xl text-xs font-bold gap-1.5"
 >
 <Plus className="size-3.5" /> Adicionar à Lista
 </Button>
 </div>
 </div>

 {teamMembers.length > 0 ? (
 <div className="space-y-2">
 <p className="text-xs font-bold text-foreground">
 Membros Prontos para Convite ({teamMembers.length})
 </p>
 <div className="space-y-2">
 {teamMembers.map((m, mIdx) => (
 <div
 key={mIdx}
 className="flex items-center justify-between p-3 rounded-2xl bg-background border border-border/70 text-xs"
 >
 <div className="flex items-center gap-3">
 <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
 {m.fullName ? m.fullName.charAt(0).toUpperCase() : m.email.charAt(0).toUpperCase()}
 </div>
 <div>
 <p className="font-bold text-foreground">{m.fullName || m.email}</p>
 <p className="text-[11px] text-muted-foreground font-mono">{m.email}</p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <Badge variant="outline" className="text-[10px] font-bold capitalize bg-muted/40">
 {m.role}
 </Badge>
 <Button
 variant="ghost"
 size="icon"
 onClick={() => handleRemoveTeamMember(m.email)}
 className="size-7 text-muted-foreground hover:text-destructive"
 >
 <Trash2 className="size-3.5" />
 </Button>
 </div>
 </div>
 ))}
 </div>
 </div>
 ) : (
 <div className="p-6 text-center rounded-2xl border border-dashed border-border/70 space-y-1">
 <Users className="size-6 mx-auto text-muted-foreground opacity-40 mb-1" />
 <p className="text-xs font-medium text-foreground">Nenhum membro adicionado ainda</p>
 <p className="text-[11px] text-muted-foreground">
 Você pode convidar sócios e colaboradores a qualquer momento pelo Workspace.
 </p>
 </div>
 )}

 <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-border/60">
 <Button
 variant="ghost"
 onClick={() => setStep(5)}
 disabled={isSubmitting}
 className="w-full sm:w-auto rounded-xl text-xs font-bold gap-1 order-2 sm:order-1"
 >
 <ArrowLeft className="size-3.5" /> Voltar
 </Button>

 <Button
 onClick={handleSubmitAll}
 disabled={isSubmitting}
 className="w-full sm:w-auto rounded-xl text-xs font-bold h-11 px-8 gap-2 bg-primary text-primary-foreground order-1 sm:order-2"
 >
 {isSubmitting ? (
 <>
 <Loader2 className="size-4 animate-spin" />
 <span>Criando Loja & Provisionando...</span>
 </>
 ) : (
 <>
 <Sliders className="size-4" />
 <span>Concluir e Abrir Meu Negócio</span>
 </>
 )}
 </Button>
 </div>
 </div>
 )}
 </div>

 {/* ── COLUNA DIREITA STICKY: THE TRUTHFUL STORE PREVIEW (5 COLS) ── */}
 <div className="lg:col-span-5 sticky top-24 space-y-4 w-full min-w-0">
 <div className="bg-card rounded-2xl border border-border/80 overflow-hidden">
 {/* Header do Mockup */}
 <div className="p-3.5 bg-muted/40 border-b border-border/60 flex items-center justify-between">
 <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
 <Eye className="size-3.5 text-primary" />
 <span>Prévia da Loja ao Vivo</span>
 </div>
 <Badge variant="outline" className="text-[10px] font-mono bg-background">
 Vitrine Waesy
 </Badge>
 </div>

 {/* Capa Panorâmica da Loja */}
 <div className="relative aspect-[21/9] sm:aspect-[16/7] w-full bg-muted overflow-hidden">
 {bannerUrl ? (
 <img src={bannerUrl} alt="Capa da Loja" className="size-full object-cover" />
 ) : (
 <img
 src={selectedSegment.coverImage}
 alt={selectedSegment.title}
 className="size-full object-cover opacity-80"
 />
 )}
 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

 {/* Badge de Nicho sobre a Foto */}
 <div className="absolute top-3 left-3">
 <Badge className="bg-black/60 backdrop-blur-md text-white border-white/20 text-[10px] font-bold gap-1">
 <selectedSegment.icon className="size-3" />
 <span>{selectedSegment.badge}</span>
 </Badge>
 </div>
 </div>

 {/* Corpo da Loja com Logo Sobreposto */}
 <div className="p-5 pt-0 relative space-y-4">
 <div className="flex items-end justify-between -mt-8 mb-2">
 {/* Logotipo Redondo/Squircle */}
 <div className="size-16 sm:size-20 rounded-2xl overflow-hidden border-[3px] border-card bg-background flex items-center justify-center shrink-0">
 {logoUrl ? (
 <img src={logoUrl} alt={name || "Logo"} className="size-full object-cover" />
 ) : (
 <div className={cn("size-full flex items-center justify-center font-black text-xl text-white", selectedSegment.gradient)}>
 {name ? name.charAt(0).toUpperCase() : <Store className="size-8 text-white/80" />}
 </div>
 )}
 </div>

 <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold gap-1">
 <ShieldCheck className="size-3" />
 <span>Verificado</span>
 </Badge>
 </div>

 {/* Nome & Detalhes */}
 <div className="space-y-1">
 <h3 className="text-base sm:text-lg font-black text-foreground tracking-tight leading-snug truncate">
 {name || "Nome do seu negócio..."}
 </h3>
 <p className="text-xs text-muted-foreground flex items-center gap-1">
 <MapPin className="size-3 shrink-0 text-primary" />
 <span>
 {locationData.isAddressPublic && locationData.street
 ? `${locationData.street}, ${locationData.number || "S/N"} • `
 : locationData.neighborhood
 ? `${locationData.neighborhood} • `
 : ""}
 {locationData.city}, {locationData.state}
 </span>
 </p>
 {!locationData.isAddressPublic && (
 <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
 <Eye className="size-2.5" />
 <span>Endereço protegido (Atendimento remoto/delivery)</span>
 </p>
 )}
 </div>

 {/* Badges de Atendimento & Modelo Dinâmicos por Nicho */}
 <div className="flex flex-wrap gap-1.5 pt-1">
 {isDeliverySegment ? (
 <>
 <Badge variant="secondary" className="text-[10px] font-bold gap-1 bg-primary/10 text-primary border-primary/20">
 {locationData.businessModel === "physical_and_delivery" && "Loja Física"}
 {locationData.businessModel === "delivery_only" && "Apenas Delivery"}
 {locationData.businessModel === "home_office" && "Home Office"}
 {locationData.businessModel === "service_at_client" && "Em Domicílio"}
 {locationData.businessModel === "digital_only" && "100% Online"}
 </Badge>
 {hasDelivery && (
 <Badge variant="secondary" className="text-[10px] font-semibold gap-1 bg-muted/60">
 <Truck className="size-3 text-primary" />
 <span>Delivery ({locationData.serviceRadiusKm > 0 ? `${locationData.serviceRadiusKm} km` : "Nacional"})</span>
 </Badge>
 )}
 {hasPickup && locationData.businessModel === "physical_and_delivery" && (
 <Badge variant="secondary" className="text-[10px] font-semibold gap-1 bg-muted/60">
 <Store className="size-3 text-primary" />
 <span>Retirada no Balcão</span>
 </Badge>
 )}
 </>
 ) : (
 <>
 {hasInPersonService && (
 <Badge variant="secondary" className="text-[10px] font-bold gap-1 bg-primary/10 text-primary border-primary/20">
 <Building2 className="size-3" />
 <span>Atendimento Presencial</span>
 </Badge>
 )}
 {hasOnlineService && (
 <Badge variant="secondary" className="text-[10px] font-semibold gap-1 bg-muted/60">
 <Phone className="size-3 text-primary" />
 <span>Atendimento Online / WhatsApp</span>
 </Badge>
 )}
 <Badge variant="secondary" className="text-[10px] font-semibold gap-1 bg-muted/60">
 <Sliders className="size-3 text-primary" />
 <span>{selectedSegment.badge}</span>
 </Badge>
 </>
 )}
 </div>

 {/* Botões de Ação do Catálogo Simulado Dinâmicos */}
 <div className="pt-3 border-t border-border/50 grid grid-cols-2 gap-2">
 {selectedSegment.id === "tourism" ? (
 <>
 <div className="py-2 px-3 rounded-xl bg-muted/40 text-center text-[11px] font-bold text-foreground border border-border/40 truncate">
 Ver Roteiros & Pacotes
 </div>
 <div className="py-2 px-3 rounded-xl bg-primary text-center text-[11px] font-bold text-primary-foreground shadow-xs truncate">
 Solicitar Cotação
 </div>
 </>
 ) : selectedSegment.category === "servicos" ? (
 <>
 <div className="py-2 px-3 rounded-xl bg-muted/40 text-center text-[11px] font-bold text-foreground border border-border/40 truncate">
 Conhecer Serviços
 </div>
 <div className="py-2 px-3 rounded-xl bg-primary text-center text-[11px] font-bold text-primary-foreground shadow-xs truncate">
 Agendar Horário
 </div>
 </>
 ) : (
 <>
 <div className="py-2 px-3 rounded-xl bg-muted/40 text-center text-[11px] font-bold text-foreground border border-border/40 truncate">
 Ver Catálogo
 </div>
 <div className="py-2 px-3 rounded-xl bg-primary text-center text-[11px] font-bold text-primary-foreground shadow-xs truncate">
 Fazer Pedido
 </div>
 </>
 )}
 </div>
 </div>
 </div>

 {/* Box Informativo / Dica Contextual */}
 <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 space-y-1.5 text-xs text-muted-foreground">
 <p className="font-bold text-foreground flex items-center gap-1.5">
 <Sliders className="size-3.5 text-primary" />
 <span>Configuração Automática</span>
 </p>
 <p className="text-[11px] leading-relaxed">
 Ao concluir o cadastro, o seu PDV, controle de estoque e catálogo já nascem pré-configurados para o nicho de <strong>{selectedSegment.title}</strong>.
 </p>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
