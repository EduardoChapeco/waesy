import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
 ExternalLink,
 Smartphone,
 Laptop,
 ArrowRight,
 Plus,
 Search,
 MoreVertical,
 Copy,
 Eye,
 Trash2,
 Grid,
 List as ListIcon,
 Globe,
 Settings,
 SlidersHorizontal,
 CheckCircle2,
 Clock,
 Layers,
 Flame,
 Tag,
 Zap,
 Percent,
 Compass,
 Store,
 Share2,
} from "lucide-react";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuSeparator,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
 Sheet,
 SheetContent,
 SheetHeader,
 SheetTitle,
 SheetDescription,
 SheetFooter,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
 listExperienceDocuments,
 getOrCreateStorefrontExperienceDocument,
 getOrCreateBiolinkExperienceDocument,
 createExperienceDocument,
 duplicateExperienceDocument,
 deleteExperienceDocument,
 setActiveStorefrontDocument,
} from "@/services/builder.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/marketing/vitrine")({
 head: () => ({ meta: [{ title: "Sites, Vitrines & Hotpages | Workspace Waesy" }] }),
 loader: async () => {
   try {
 const [docs, storefrontRes, biolinkRes] = await Promise.all([
 listExperienceDocuments().catch(() => []),
 getOrCreateStorefrontExperienceDocument().catch(() => ({ documentId: "" })),
 getOrCreateBiolinkExperienceDocument().catch(() => ({ documentId: "" })),
 ]);

 return {
 documents: (docs as any[]) || [],
 primaryStorefrontId: storefrontRes?.documentId || "",
 primaryBiolinkId: biolinkRes?.documentId || "",
 };
   } catch (err) {
     console.error("[loader:workspace.marketing.vitrine] Unhandled loader error:", err);
     return { documents: null, primaryStorefrontId: null, primaryBiolinkId: null };
   }
 },
 component: WorkspaceSitesHubPage,
});

interface TemplateItem {
 id: string;
 title: string;
 niche: string;
 category: "hotpage" | "turismo" | "varejo" | "food" | "servicos" | "editorial" | "imoveis";
 tagline: string;
 badge: string;
 imageUrl: string;
 features: string[];
}

const TEMPLATES_GALLERY: TemplateItem[] = [
 {
 id: "hotpage_flash_sale",
 title: "Hotpage Flash • Queima de Estoque 50% OFF",
 niche: "Ofertas Relâmpago & Campanhas",
 category: "hotpage",
 tagline: "Countdown timer regressivo, cupons de desconto automáticos e grade de produtos em promoção.",
 badge: "🔥 Hotpage",
 imageUrl: "",
 features: ["Countdown Timer", "Filtro 50% OFF", "Cupom 1-Toque", "Banners Dinâmicos"],
 },
 {
 id: "hotpage_free_shipping",
 title: "Hotpage Regional • Frete Grátis na Sua Cidade",
 niche: "Logística & Fidelização",
 category: "hotpage",
 tagline: "Regras de entrega expressa, valor mínimo no carrinho e produtos elegíveis para entrega grátis.",
 badge: "🚚 Hotpage",
 imageUrl: "",
 features: ["Aviso de Frete Grátis", "Regiões Atendidas", "Carrinho Integrado"],
 },
 {
 id: "tourism_excelencia",
 title: "Excelência Tour • Agência Boutique & Pacotes",
 niche: "Agências de Turismo & Viagens",
 category: "turismo",
 tagline: "Roteiros com saídas 2027/28, cotação rápida WhatsApp, captura de leads e galeria da loja física.",
 badge: "Novo • Alta Conversão",
 imageUrl: "",
 features: ["Cotação Rápida WhatsApp", "Captura de Leads", "Galeria Loja Física", "8 Serviços de Turismo"],
 },
 {
 id: "classic_commerce",
 title: "Aura Premium • Moda & Varejo",
 niche: "Moda & Vestuário",
 category: "varejo",
 tagline: "Lookbook interativo, hero 21:9, bento grid de coleções e carrinho lateral.",
 badge: "Mais Popular",
 imageUrl: "",
 features: ["Hero 21:9", "Bento Grid", "Lookbook", "Filtros de Grade"],
 },
 {
 id: "minimalist_fashion",
 title: "Sapore • Gastronomia & Delivery",
 niche: "Restaurantes & Cafés",
 category: "food",
 tagline: "Cardápio dinâmico com fotos apetitosas, pedidos via WhatsApp e combos.",
 badge: "Delivery 1-Toque",
 imageUrl: "",
 features: ["Cardápio 1-Click", "WhatsApp Checkout", "Combos do Chef"],
 },
 {
 id: "institutional_profile",
 title: "Monochrome • Editorial & Zine",
 niche: "Branding & Estúdios",
 category: "editorial",
 tagline: "Storytelling autêntico, manifesto de marca, timeline histórica e depoimentos.",
 badge: "Design Award",
 imageUrl: "",
 features: ["Manifesto de Marca", "Timeline Histórica", "Vídeo Hero"],
 },
 {
 id: "services_studio",
 title: "Atelier • Serviços & Bem-Estar",
 niche: "Clínicas, Salões & Spas",
 category: "servicos",
 tagline: "Agendamento integrado de horários, equipe profissional e tabela de pacotes.",
 badge: "Agendamento",
 imageUrl: "",
 features: ["Grade de Horários", "Equipe & Salas", "Pacotes Multi-Sessão"],
 },
 {
 id: "real_estate_luxury",
 title: "Habitat • Imóveis & Arquitetura",
 niche: "Imobiliárias & Corretores",
 category: "imoveis",
 tagline: "Showcase de empreendimentos de alto padrão, tour virtual e formulário de visita.",
 badge: "Premium",
 imageUrl: "",
 features: ["Plantas & Vistorias", "Agendar Visita", "Filtro de Bairros"],
 },
];

type DocTypeFilter = "all" | "storefront" | "biolink" | "landing_page" | "campaign";

function WorkspaceSitesHubPage() {
 const { documents, primaryStorefrontId, primaryBiolinkId } = ((Route.useLoaderData?.() as any) || {});
 const navigate = useNavigate();
 const router = useRouter();

 const [search, setSearch] = useState("");
 const [activeTab, setActiveTab] = useState<"sites" | "templates">("sites");
 const [docTypeFilter, setDocTypeFilter] = useState<DocTypeFilter>("all");
 const [templateNicheFilter, setTemplateNicheFilter] = useState<string>("all");
 const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
 const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
 const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
 const [isSubmittingPage, setIsSubmittingPage] = useState(false);

 const [newPageData, setNewPageData] = useState({
 title: "",
 slug: "",
 template_id: "blank",
 document_type: "storefront" as "storefront" | "biolink" | "campaign" | "landing_page" | "custom",
 });

 // Filtro de Documentos Reais de experience_documents
 const filteredDocuments = useMemo(() => {
 return documents.filter((doc: any) => {
 const matchesSearch =
 doc.title?.toLowerCase().includes(search.toLowerCase()) ||
 doc.slug?.toLowerCase().includes(search.toLowerCase());

 if (!matchesSearch) return false;

 if (docTypeFilter === "all") return true;
 if (docTypeFilter === "landing_page") {
 return doc.document_type === "landing_page" || doc.document_type === "custom";
 }
 return doc.document_type === docTypeFilter;
 });
 }, [documents, search, docTypeFilter]);

 const storefrontsCount = documents.filter((d: any) => d.document_type === "storefront").length;
 const biolinksCount = documents.filter((d: any) => d.document_type === "biolink").length;
 const landingPagesCount = documents.filter(
 (d: any) => d.document_type === "landing_page" || d.document_type === "custom"
 ).length;
 const campaignsCount = documents.filter((d: any) => d.document_type === "campaign").length;

 const filteredTemplates = useMemo(() => {
 return TEMPLATES_GALLERY.filter((tpl) => {
 if (templateNicheFilter === "all") return true;
 return tpl.category === templateNicheFilter;
 });
 }, [templateNicheFilter]);

 const handleOpenBuilder = (docId: string) => {
 if (!docId) {
 toast.error("Documento não encontrado.");
 return;
 }
 navigate({
 to: "/workspace/builder/$documentId/editor",
 params: { documentId: docId },
 });
 };

 const handleApplyTemplate = async (templateId: string) => {
 if (!window.confirm("Deseja criar e editar uma nova página com este modelo no Construtor Visual?")) return;
 setIsApplyingTemplate(true);
 try {
 const isHotpage = templateId.startsWith("hotpage_");
 const isTourism = templateId.startsWith("tourism_");
 const docType = isHotpage ? "campaign" : isTourism ? "landing_page" : "storefront";

 const res = await createExperienceDocument({
 data: {
 title: isHotpage ? "Nova Hotpage Promocional" : isTourism ? "Roteiro de Viagens & Turismo" : "Nova Vitrine Modelo",
 slug: `${isHotpage ? "ofertas" : isTourism ? "viagens" : "vitrine"}-${Date.now().toString().slice(-4)}`,
 document_type: docType,
 template_id: templateId,
 },
 });

 const targetDocId = (res as any)?.data?.document?.id || (res as any)?.documentId;
 if (targetDocId) {
 toast.success("Página criada no Construtor Visual!");
 router.invalidate();
 navigate({
 to: "/workspace/builder/$documentId/editor",
 params: { documentId: targetDocId },
 });
 }
 } catch (err: any) {
 toast.error(err.message || "Erro ao aplicar modelo.");
 } finally {
 setIsApplyingTemplate(false);
 }
 };

 const handleCreatePage = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!newPageData.title.trim()) {
 toast.error("Informe o título da página ou vitrine.");
 return;
 }

 const cleanSlug = (newPageData.slug || newPageData.title)
 .toLowerCase()
 .normalize("NFD")
 .replace(/[̀-ͯ]/g, "")
 .replace(/[^a-z0-9]+/g, "-")
 .replace(/(^-|-$)+/g, "");

 setIsSubmittingPage(true);
 try {
 const res = await createExperienceDocument({
 data: {
 title: newPageData.title.trim(),
 slug: cleanSlug,
 document_type: newPageData.document_type,
 template_id: newPageData.template_id,
 },
 });

 const targetDocId = (res as any)?.data?.document?.id || (res as any)?.documentId;
 if (targetDocId) {
 toast.success("Página criada com sucesso!");
 setIsCreateSheetOpen(false);
 setNewPageData({
 title: "",
 slug: "",
 template_id: "blank",
 document_type: "storefront",
 });
 router.invalidate();
 navigate({
 to: "/workspace/builder/$documentId/editor",
 params: { documentId: targetDocId },
 });
 }
 } catch (err: any) {
 toast.error(err.message || "Erro ao criar página.");
 } finally {
 setIsSubmittingPage(false);
 }
 };

 const handleDuplicatePage = async (pageId: string) => {
 try {
 await duplicateExperienceDocument({ data: { id: pageId } });
 toast.success("Página duplicada com sucesso!");
 router.invalidate();
 } catch (err: any) {
 toast.error(err.message || "Erro ao duplicar página.");
 }
 };

 const handleDeletePage = async (pageId: string) => {
 if (!window.confirm("Deseja realmente excluir este documento do Construtor Visual?")) return;
 try {
 await deleteExperienceDocument({ data: { id: pageId } });
 toast.success("Documento excluído com sucesso.");
 router.invalidate();
 } catch (err: any) {
 toast.error(err.message || "Erro ao excluir documento.");
 }
 };

 const handleSetActive = async (pageId: string) => {
 try {
 await setActiveStorefrontDocument({ data: { id: pageId } });
 toast.success("Documento definido como ativo principal!");
 router.invalidate();
 } catch (err: any) {
 toast.error(err.message || "Erro ao ativar documento.");
 }
 };

 const getDocTypeBadge = (type: string) => {
 switch (type) {
 case "storefront":
 return <Badge variant="default" className="text-[11px] font-medium bg-primary/10 text-primary border-primary/20">Vitrine Virtual</Badge>;
 case "biolink":
 return <Badge variant="outline" className="text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">Link da Bio</Badge>;
 case "campaign":
 return <Badge variant="outline" className="text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">Hotpage / Oferta</Badge>;
 case "landing_page":
 case "custom":
 return <Badge variant="outline" className="text-[11px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">Landing Page</Badge>;
 default:
 return <Badge variant="outline" className="text-[11px] font-medium">Página</Badge>;
 }
 };

 return (
 <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-28 animate-in fade-in duration-200">
 {/* ── Header Canônico Studio Apple HIG ── */}
 <PageHeader
 eyebrow="Marketing & Design"
 title="Sites, Vitrines & Hotpages"
 actions={
 <div className="flex items-center gap-2">
 <Button
 onClick={() => setIsCreateSheetOpen(true)}
 size="sm"
 className="rounded-xl text-xs font-semibold gap-1.5 shadow-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
 >
 <Plus className="size-3.5" />
 <span>Criar Nova Página</span>
 </Button>
 </div>
 }
 />

 {/* ── Abas Principais: Minhas Páginas vs Modelos Prontos ── */}
 <div className="flex items-center justify-between border-b border-border/60 pb-3 gap-4">
 <div className="flex items-center gap-2">
 <Button
 variant={activeTab === "sites" ? "secondary" : "ghost"}
 size="sm"
 onClick={() => setActiveTab("sites")}
 className="rounded-xl text-xs font-semibold h-8 cursor-pointer"
 >
 Minhas Páginas ({documents.length})
 </Button>
 <Button
 variant={activeTab === "templates" ? "secondary" : "ghost"}
 size="sm"
 onClick={() => setActiveTab("templates")}
 className="rounded-xl text-xs font-semibold h-8 cursor-pointer gap-1.5"
 >
 <Grid className="size-3 text-primary" />
 <span>Biblioteca de Modelos</span>
 </Button>
 </div>

 {activeTab === "sites" && (
 <div className="flex items-center gap-2">
 <div className="relative w-48 sm:w-64">
 <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
 <Input
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="Buscar por título ou slug..."
 className="h-8 pl-8 text-xs rounded-xl bg-background border-border/80"
 />
 </div>

 <div className="flex items-center border border-border/80 rounded-xl p-0.5 bg-muted/30">
 <button
 type="button"
 onClick={() => setViewMode("grid")}
 className={cn(
 "p-1 rounded-lg transition-colors cursor-pointer",
 viewMode === "grid" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
 )}
 aria-label="Grade"
 >
 <Grid className="size-3.5" />
 </button>
 <button
 type="button"
 onClick={() => setViewMode("list")}
 className={cn(
 "p-1 rounded-lg transition-colors cursor-pointer",
 viewMode === "list" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
 )}
 aria-label="Lista"
 >
 <ListIcon className="size-3.5" />
 </button>
 </div>
 </div>
 )}
 </div>

 {/* ── TAB 1: MINHAS PÁGINAS (MULTI-TIPO CANÔNICO) ── */}
 {activeTab === "sites" && (
 <div className="flex flex-col gap-5">
 {/* Sub-filtros por Tipo de Documento */}
 <div className="flex flex-wrap items-center gap-1.5">
 <Button
 variant={docTypeFilter === "all" ? "default" : "outline"}
 size="sm"
 onClick={() => setDocTypeFilter("all")}
 className="h-7 text-[11px] rounded-lg cursor-pointer"
 >
 Todas ({documents.length})
 </Button>
 <Button
 variant={docTypeFilter === "storefront" ? "default" : "outline"}
 size="sm"
 onClick={() => setDocTypeFilter("storefront")}
 className="h-7 text-[11px] rounded-lg cursor-pointer gap-1"
 >
 <Store className="size-3" />
 <span>Vitrines Virtuais ({storefrontsCount})</span>
 </Button>
 <Button
 variant={docTypeFilter === "biolink" ? "default" : "outline"}
 size="sm"
 onClick={() => setDocTypeFilter("biolink")}
 className="h-7 text-[11px] rounded-lg cursor-pointer gap-1"
 >
 <Smartphone className="size-3" />
 <span>Links da Bio ({biolinksCount})</span>
 </Button>
 <Button
 variant={docTypeFilter === "landing_page" ? "default" : "outline"}
 size="sm"
 onClick={() => setDocTypeFilter("landing_page")}
 className="h-7 text-[11px] rounded-lg cursor-pointer gap-1"
 >
 <Laptop className="size-3" />
 <span>Landing Pages ({landingPagesCount})</span>
 </Button>
 <Button
 variant={docTypeFilter === "campaign" ? "default" : "outline"}
 size="sm"
 onClick={() => setDocTypeFilter("campaign")}
 className="h-7 text-[11px] rounded-lg cursor-pointer gap-1"
 >
 <Flame className="size-3" />
 <span>Campanhas & Hotpages ({campaignsCount})</span>
 </Button>
 </div>

 {/* Estado de Documentos */}
 {filteredDocuments.length === 0 ? (
 <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border/80 rounded-2xl bg-muted/10 gap-3">
 <Layers className="size-10 text-muted-foreground/60" />
 <div className="space-y-1 max-w-sm">
 <p className="font-semibold text-foreground text-sm">Nenhuma página encontrada</p>
 <p className="text-xs text-muted-foreground">
 Você ainda não possui páginas nesta categoria ou o termo de busca não retornou resultados.
 </p>
 </div>
 <Button
 onClick={() => setIsCreateSheetOpen(true)}
 size="sm"
 className="mt-2 rounded-xl text-xs font-semibold gap-1.5"
 >
 <Plus className="size-3.5" />
 <span>Criar Primeira Página</span>
 </Button>
 </div>
 ) : viewMode === "grid" ? (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {/* Card de Criação Rápida */}
 <div
 onClick={() => setIsCreateSheetOpen(true)}
 className="flex flex-col items-center justify-center p-8 border border-dashed border-border/80 hover:border-primary/50 rounded-2xl bg-background hover:bg-muted/30 transition-all cursor-pointer text-center gap-3 min-h-[220px] group"
 >
 <div className="size-10 rounded-xl bg-muted/60 group-hover:bg-primary/10 group-hover:text-primary transition-colors flex items-center justify-center text-muted-foreground">
 <Plus className="size-5" />
 </div>
 <div className="space-y-0.5">
 <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
 Nova Página ou Vitrine
 </p>
 <p className="text-xs text-muted-foreground max-w-[200px]">
 Crie uma nova vitrine, link da bio ou landing page customizada.
 </p>
 </div>
 </div>

 {/* Cards de Páginas Reais */}
 {filteredDocuments.map((doc: any) => {
 const isPrimary =
 doc.id === primaryStorefrontId || doc.id === primaryBiolinkId || doc.is_active;

 return (
 <div
 key={doc.id}
 className="flex flex-col border border-border/70 rounded-2xl bg-background overflow-hidden hover:border-border transition-all shadow-2xs group"
 >
 {/* Header do Card */}
 <div className="p-4 pb-3 flex items-start justify-between gap-3 border-b border-border/50 bg-muted/10">
 <div className="space-y-1 flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 {getDocTypeBadge(doc.document_type)}
 {isPrimary && (
 <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1">
 <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
 Ativa
 </Badge>
 )}
 </div>
 <h3 className="text-sm font-semibold text-foreground truncate">{doc.title}</h3>
 <p className="text-xs font-mono text-muted-foreground truncate">/{doc.slug}</p>
 </div>

 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant="ghost" size="icon" className="size-7 rounded-lg text-muted-foreground hover:text-foreground">
 <MoreVertical className="size-3.5" />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="w-48 text-xs">
 <DropdownMenuItem onClick={() => handleOpenBuilder(doc.id)} className="gap-2 cursor-pointer">
 <Layers className="size-3.5 text-primary" />
 <span>Editar no Studio</span>
 </DropdownMenuItem>
 <DropdownMenuItem onClick={() => handleDuplicatePage(doc.id)} className="gap-2 cursor-pointer">
 <Copy className="size-3.5 text-muted-foreground" />
 <span>Duplicar Página</span>
 </DropdownMenuItem>
 {!isPrimary && (
 <DropdownMenuItem onClick={() => handleSetActive(doc.id)} className="gap-2 cursor-pointer">
 <CheckCircle2 className="size-3.5 text-primary" />
 <span>Definir como Principal</span>
 </DropdownMenuItem>
 )}
 <DropdownMenuSeparator />
 <DropdownMenuItem
 onClick={() => handleDeletePage(doc.id)}
 className="gap-2 text-destructive focus:text-destructive cursor-pointer"
 >
 <Trash2 className="size-3.5" />
 <span>Excluir Documento</span>
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </div>

 {/* Preview / Informações Rápidas */}
 <div className="p-4 flex-1 flex flex-col justify-between gap-4">
 <div className="text-xs text-muted-foreground space-y-1">
 <div className="flex items-center justify-between text-[11px]">
 <span>Status:</span>
 <span className="font-medium text-foreground capitalize">{doc.is_active ? "Publicada" : "Rascunho"}</span>
 </div>
 <div className="flex items-center justify-between text-[11px]">
 <span>Criada em:</span>
 <span>{new Date(doc.created_at || Date.now()).toLocaleDateString("pt-BR")}</span>
 </div>
 </div>

 {/* Ações Inferiores */}
 <div className="flex items-center gap-2 pt-2 border-t border-border/50">
 <Button
 onClick={() => handleOpenBuilder(doc.id)}
 size="sm"
 className="flex-1 h-8 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 text-secondary-foreground cursor-pointer"
 >
 Abrir Studio
 </Button>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 ) : (
 /* Visualização em Lista */
 <div className="border border-border/70 rounded-2xl overflow-hidden bg-background divide-y divide-border/60">
 {filteredDocuments.map((doc: any) => {
 const isPrimary =
 doc.id === primaryStorefrontId || doc.id === primaryBiolinkId || doc.is_active;

 return (
 <div key={doc.id} className="p-4 flex items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
 <div className="flex items-center gap-3 min-w-0 flex-1">
 <div className="size-9 rounded-xl bg-muted/60 flex items-center justify-center shrink-0 text-muted-foreground">
 {doc.document_type === "storefront" ? <Store className="size-4" /> : <Smartphone className="size-4" />}
 </div>
 <div className="space-y-0.5 min-w-0 flex-1">
 <div className="flex items-center gap-2">
 <span className="text-sm font-semibold text-foreground truncate">{doc.title}</span>
 {getDocTypeBadge(doc.document_type)}
 {isPrimary && (
 <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
 Principal
 </Badge>
 )}
 </div>
 <p className="text-xs font-mono text-muted-foreground">/{doc.slug}</p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <Button
 onClick={() => handleOpenBuilder(doc.id)}
 size="sm"
 variant="secondary"
 className="h-8 rounded-xl text-xs font-semibold cursor-pointer"
 >
 Studio
 </Button>
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant="ghost" size="icon" className="size-8 rounded-lg text-muted-foreground">
 <MoreVertical className="size-3.5" />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="w-48 text-xs">
 <DropdownMenuItem onClick={() => handleDuplicatePage(doc.id)} className="gap-2 cursor-pointer">
 <Copy className="size-3.5" />
 <span>Duplicar</span>
 </DropdownMenuItem>
 {!isPrimary && (
 <DropdownMenuItem onClick={() => handleSetActive(doc.id)} className="gap-2 cursor-pointer">
 <CheckCircle2 className="size-3.5 text-primary" />
 <span>Definir como Principal</span>
 </DropdownMenuItem>
 )}
 <DropdownMenuSeparator />
 <DropdownMenuItem onClick={() => handleDeletePage(doc.id)} className="gap-2 text-destructive cursor-pointer">
 <Trash2 className="size-3.5" />
 <span>Excluir</span>
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 )}

 {/* ── TAB 2: BIBLIOTECA DE MODELOS PRONTOS ── */}
 {activeTab === "templates" && (
 <div className="flex flex-col gap-6">
 {/* Filtros de Nicho */}
 <div className="flex flex-wrap items-center gap-1.5">
 {["all", "turismo", "hotpage", "varejo", "food", "servicos", "editorial", "imoveis"].map((cat) => (
 <Button
 key={cat}
 variant={templateNicheFilter === cat ? "default" : "outline"}
 size="sm"
 onClick={() => setTemplateNicheFilter(cat)}
 className="h-7 text-[11px] rounded-lg capitalize cursor-pointer"
 >
 {cat === "all" ? "Todos os Nichos" : cat}
 </Button>
 ))}
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
 {filteredTemplates.map((tpl) => (
 <div
 key={tpl.id}
 className="flex flex-col border border-border/70 rounded-2xl bg-background overflow-hidden hover:border-border transition-all shadow-2xs group"
 >
 <div className="relative h-44 overflow-hidden bg-muted/40">
 <img
 src={tpl.imageUrl}
 alt={tpl.title}
 className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
 />
 <div className="absolute top-2.5 right-2.5">
 <Badge variant="secondary" className="text-[10px] font-semibold bg-background/90 backdrop-blur-md">
 {tpl.badge}
 </Badge>
 </div>
 </div>

 <div className="p-4 flex-1 flex flex-col justify-between gap-4">
 <div className="space-y-1.5">
 <div className="text-[11px] font-semibold text-primary uppercase tracking-wider">{tpl.niche}</div>
 <h3 className="text-sm font-semibold text-foreground leading-snug">{tpl.title}</h3>
 <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{tpl.tagline}</p>
 </div>

 <Button
 onClick={() => handleApplyTemplate(tpl.id)}
 disabled={isApplyingTemplate}
 className="w-full h-10 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer bg-primary text-primary-foreground"
 >
 <Plus className="size-3.5" />
 <span>Usar Este Modelo</span>
 </Button>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* ── SHEET DE CRIAÇÃO DE NOVA PÁGINA (MULTI-TIPO COMPLETO) ── */}
 <Sheet open={isCreateSheetOpen} onOpenChange={setIsCreateSheetOpen}>
 <SheetContent side="right" size="wide" className="w-full max-sm:!max-w-full max-sm:!w-screen sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] flex flex-col justify-between p-6">
 <div className="space-y-6">
 <SheetHeader className="p-0 text-left space-y-1">
 <SheetTitle className="text-base font-semibold">Criar Nova Página ou Vitrine</SheetTitle>
 <SheetDescription className="text-xs text-muted-foreground">
 Selecione o tipo de experiência que você quer criar e edite livremente no Visual Builder Studio.
 </SheetDescription>
 </SheetHeader>

 <form id="create-page-form" onSubmit={handleCreatePage} className="space-y-4">
 {/* Tipo de Documento */}
 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Tipo de Experiência</Label>
 <Select
 value={newPageData.document_type}
 onValueChange={(val: any) => setNewPageData((prev) => ({ ...prev, document_type: val }))}
 >
 <SelectTrigger className="h-9 text-xs rounded-xl">
 <SelectValue placeholder="Selecione o tipo de página" />
 </SelectTrigger>
 <SelectContent className="text-xs">
 <SelectItem value="storefront">Vitrine Virtual / Loja Completa</SelectItem>
 <SelectItem value="biolink">Link da Bio (Multi-links Mobile)</SelectItem>
 <SelectItem value="landing_page">Landing Page de Alta Conversão</SelectItem>
 <SelectItem value="campaign">Página de Campanha / Hotpage Oferta</SelectItem>
 <SelectItem value="custom">Hotsite Institucional & Portfólio</SelectItem>
 </SelectContent>
 </Select>
 </div>

 {/* Título */}
 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Título do Documento</Label>
 <Input
 value={newPageData.title}
 onChange={(e) => {
 const title = e.target.value;
 const autoSlug = title
 .toLowerCase()
 .normalize("NFD")
 .replace(/[\u0300-\u036f]/g, "")
 .replace(/[^a-z0-9]+/g, "-")
 .replace(/(^-|-$)+/g, "");
 setNewPageData((prev) => ({ ...prev, title, slug: autoSlug }));
 }}
 placeholder="Ex: Vitrine de Inverno 2026"
 className="h-9 text-xs rounded-xl"
 required
 />
 </div>

 {/* Slug (URL) */}
 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Slug da URL</Label>
 <div className="flex items-center">
 <span className="text-xs text-muted-foreground px-2.5 py-1.5 bg-muted rounded-l-xl border border-r-0 border-border">/</span>
 <Input
 value={newPageData.slug}
 onChange={(e) => setNewPageData((prev) => ({ ...prev, slug: e.target.value }))}
 placeholder="vitrine-inverno"
 className="h-9 text-xs rounded-l-none rounded-r-xl font-mono"
 required
 />
 </div>
 </div>

 {/* Modelo Inicial */}
 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Ponto de Partida</Label>
 <Select
 value={newPageData.template_id}
 onValueChange={(val) => setNewPageData((prev) => ({ ...prev, template_id: val }))}
 >
 <SelectTrigger className="h-9 text-xs rounded-xl">
 <SelectValue placeholder="Escolha um ponto de partida" />
 </SelectTrigger>
 <SelectContent className="text-xs">
 <SelectItem value="blank">Começar em Branco (Livre)</SelectItem>
 <SelectItem value="classic_commerce">Vitrine de Coleção Completa</SelectItem>
 <SelectItem value="hotpage_flash_sale">Hotpage com Cronômetro & Ofertas</SelectItem>
 <SelectItem value="tourism_excelencia">Roteiro de Viagens & Turismo</SelectItem>
 <SelectItem value="biolink_classic">Cartão de Links para Redes Sociais</SelectItem>
 <SelectItem value="institutional_profile">Institucional com História da Marca</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </form>
 </div>

 <SheetFooter className="p-0 pt-6 border-t border-border/60 flex items-center gap-2">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => setIsCreateSheetOpen(false)}
 className="flex-1 h-9 rounded-xl text-xs font-semibold"
 >
 Cancelar
 </Button>
 <Button
 form="create-page-form"
 type="submit"
 disabled={isSubmittingPage}
 size="sm"
 className="flex-1 h-9 rounded-xl text-xs font-semibold bg-primary text-primary-foreground"
 >
 {isSubmittingPage ? "Criando..." : "Criar no Studio"}
 </Button>
 </SheetFooter>
 </SheetContent>
 </Sheet>
 </div>
 );
}
