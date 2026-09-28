import * as React from "react";
import { useState } from "react";
import { X, Search, Plus, ImageIcon, ShoppingBag, AlignLeft, Star, Zap, Store, LayoutTemplate, SlidersHorizontal, ArrowRight, Sliders, Grid, Film, CheckCircle2, Plane, Flame, Calendar, UtensilsCrossed, Shirt, Home, Link2, HelpCircle, Clock, Layers, MapPin, Mail, UserCheck, Route, Landmark, Map, Tags, Timer, FileText, ChevronDown, CheckSquare, MousePointer2, CreditCard, DollarSign, MessageCircle, Briefcase, Table as TableIcon, ClipboardList, Images } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sectionTemplates } from "@/lib/section-templates";
import type { SectionTemplate } from "@/lib/builder-types";

export interface BuilderAddPanel3ColProps {
 isOpen: boolean;
 onClose: () => void;
 onSelectTemplate: (template: SectionTemplate) => void;
 onInsertSingleBlock: (blockType: string) => void;
}

interface CategoryDefinition {
 id: string;
 label: string;
 icon: any;
 subcategories: {
 id: string;
 label: string;
 templateIds: string[];
 }[];
}

const CATEGORY_TREE: CategoryDefinition[] = [
 {
 id: "hero",
 label: "Faixas e Heros",
 icon: ImageIcon,
 subcategories: [
 { id: "hero_destaque", label: "Em Destaque", templateIds: ["hero_carousel", "split_banner", "flash_sale_hero"] },
 { id: "hero_classico", label: "Clássico", templateIds: ["hero_carousel", "split_banner"] },
 { id: "hero_anuncio", label: "Avisos e Topo", templateIds: ["announcement_bar"] },
 ],
 },
 {
 id: "products",
 label: "Vitrine e Produtos",
 icon: ShoppingBag,
 subcategories: [
 { id: "prod_hits", label: "Top Mais Vendidos (Hits)", templateIds: ["curated_hits_rail", "product_carousel"] },
 { id: "prod_grid", label: "Grade de Produtos", templateIds: ["product_grid", "product_carousel"] },
 { id: "prod_carousel", label: "Carrosséis", templateIds: ["product_carousel"] },
 { id: "prod_categories", label: "Categorias e Coleções", templateIds: ["category_cards_grid", "featured_collection_banner"] },
 ],
 },
 {
 id: "tourism",
 label: "Turismo e Viagens",
 icon: Plane,
 subcategories: [
 { id: "tourism_cotacao", label: "Cotação e Leads", templateIds: ["tourism_quote_hero", "tourism_services_grid"] },
 { id: "tourism_destinos", label: "Destinos e Pacotes", templateIds: ["tourism_destinations_carousel", "tourism_services_grid"] },
 { id: "tourism_roteiros", label: "Roteiros e Detalhes", templateIds: ["tourism_itinerary_timeline", "tourism_traveler_info"] },
 ],
 },
 {
 id: "gastronomy",
 label: "Gastronomia e Food",
 icon: UtensilsCrossed,
 subcategories: [
 { id: "gastro_streamlined", label: "Cardápio Mobile-First", templateIds: ["food_menu_streamlined", "food_menu_tabs"] },
 { id: "gastro_menu", label: "Cardápio por Abas", templateIds: ["food_menu_tabs", "chef_special_banner"] },
 { id: "gastro_comanda", label: "Comanda e QR Code Mesa", templateIds: ["table_order_comanda"] },
 { id: "gastro_special", label: "Prato do Chef", templateIds: ["chef_special_banner"] },
 { id: "gastro_hours", label: "Horários e Delivery", templateIds: ["restaurant_hours_delivery", "table_booking_card"] },
 { id: "gastro_reserva", label: "Reserva de Mesa", templateIds: ["table_booking_card"] },
 ],
 },
 {
 id: "fashion",
 label: "Moda e Lookbook",
 icon: Shirt,
 subcategories: [
 { id: "fashion_look", label: "Shop the Look", templateIds: ["shop_the_look_hotspots", "lookbook_masonry"] },
 { id: "fashion_sizes", label: "Guia de Medidas", templateIds: ["size_guide_table"] },
 { id: "fashion_gallery", label: "Mural de Estilo", templateIds: ["lookbook_masonry", "gallery_grid"] },
 ],
 },
 {
 id: "services",
 label: "Serviços e Clínicas",
 icon: Calendar,
 subcategories: [
 { id: "serv_pricing", label: "Tabela de Preços", templateIds: ["service_pricing_table", "service_catalog_list"] },
 { id: "serv_team", label: "Corpo Clínico e Equipe", templateIds: ["specialist_team_grid"] },
 { id: "serv_booking", label: "Agendamento Online", templateIds: ["booking_calendar"] },
 ],
 },
 {
 id: "real_estate",
 label: "Imóveis e Corretores",
 icon: Home,
 subcategories: [
 { id: "re_features", label: "Ficha do Imóvel", templateIds: ["property_features_grid", "property_schedule_visit"] },
 { id: "re_tour", label: "Tour e Galeria", templateIds: ["property_virtual_tour", "gallery_grid"] },
 { id: "re_contact", label: "Agendar Visita", templateIds: ["property_schedule_visit"] },
 ],
 },
 {
 id: "biolink",
 label: "Biolink e Social",
 icon: Link2,
 subcategories: [
 { id: "bio_profile", label: "Perfil e Apresentação", templateIds: ["biolink_profile_header", "biolink_featured_product"] },
 { id: "bio_links", label: "Botões e Links", templateIds: ["biolink_action_buttons", "biolink_pix_card"] },
 { id: "bio_pix", label: "Chave Pix e Pagamento", templateIds: ["biolink_pix_card"] },
 ],
 },
 {
 id: "conversion",
 label: "Ofertas e Hotpages",
 icon: Flame,
 subcategories: [
 { id: "conv_flash", label: "Oferta Relâmpago", templateIds: ["flash_sale_hero", "countdown_timer"] },
 { id: "conv_faq", label: "Perguntas Frequentes", templateIds: ["faq_accordion"] },
 ],
 },
 {
 id: "media",
 label: "Galeria e Mídia",
 icon: Film,
 subcategories: [
 { id: "media_video", label: "Vídeo Imersivo / GIF", templateIds: ["video_section"] },
				{ id: "media_galeria", label: "Mural e Fotos", templateIds: ["gallery_grid"] },
 { id: "media_comparador", label: "Antes e Depois", templateIds: ["before_after_slider"] },
 { id: "media_stories", label: "Stories no Topo", templateIds: ["stories_ring"] },
 ],
 },
 {
 id: "content",
 label: "Conteúdo e Layout",
 icon: AlignLeft,
 subcategories: [
 { id: "content_rich", label: "Artigo e Texto Editorial", templateIds: ["rich_text"] },
				{ id: "content_bento", label: "Bento Grid", templateIds: ["bento_grid"] },
 { id: "content_passos", label: "Passo a Passo", templateIds: ["routine_steps"] },
 { id: "content_location", label: "Localização e Mapa", templateIds: ["location_map_card"] },
 ],
 },
 {
 id: "blocos",
 label: "Blocos Individuais",
 icon: Layers,
 subcategories: [
 { id: "blocos_viagem", label: "Viagem e Turismo", templateIds: [] },
 { id: "blocos_negocios", label: "Negócios e E-commerce", templateIds: [] },
 { id: "blocos_basico", label: "Básicos e Utilitários", templateIds: [] },
 ],
 },
 {
 id: "social",
 label: "Social e Depoimentos",
 icon: Star,
 subcategories: [
 { id: "social_reviews", label: "Depoimentos de Clientes", templateIds: ["testimonial_carousel"] },
 { id: "social_news", label: "Captura de Leads", templateIds: ["newsletter_capture"] },
 ],
 },
];

// ── Catálogo de Blocos Individuais transplantado de cloudblock/BlockLibrary.tsx ──
// Fonte: projetos-referencias/cloudblock/src/components/editor/BlockLibrary.tsx
// Adaptação: usa onInsertSingleBlock do editor Waesy ao invés de useEditor() do cloudblock

interface SingleBlockDef {
 type: string;
 icon: any;
 label: string;
 template: Record<string, any>;
}

const SINGLE_BLOCKS: Record<"viagem" | "negocios" | "basico", SingleBlockDef[]> = {
 viagem: [
  { type: "itinerary", icon: Route, label: "Roteiro Completo", template: { title: "Meu Roteiro", destination: "Rio de Janeiro", startDate: new Date().toISOString(), endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), travelersCount: 2, showMap: true, mapCenter: { lat: -22.9068, lng: -43.1729 }, mapZoom: 12, days: [{ id: crypto.randomUUID(), dayNumber: 1, title: "Chegada e Exploração", description: "Primeiro dia na cidade", activities: [] }] } },
  { type: "destinationHeader", icon: MapPin, label: "Info Destino", template: { name: "Nome do Destino", country: "País", backgroundImage: "", temperature: [{ day: "SEG", value: "28°" }, { day: "TER", value: "29°" }] } },
  { type: "daySection", icon: Calendar, label: "Dia do Roteiro", template: { dayNumber: 1, title: "Chegada", description: "Descrição das atividades." } },
  { type: "attractionCard", icon: Landmark, label: "Card de Atração", template: { title: "Ponto Turístico", subtitle: "Localização", imageUrl: "" } },
  { type: "map", icon: Map, label: "Mapa", template: { address: "Digite o endereço", zoom: 15 } },
  { type: "transport", icon: Plane, label: "Voo/Transporte", template: { title: "Detalhes do Transporte", transportType: "aereo", tripType: "ida-volta", origin: "Origem", destination: "Destino", company: "Cia Aérea", departureTime: "08:00 - 10:00", returnOrigin: "Destino", returnDestination: "Origem", returnTime: "18:00 - 20:00" } },
  { type: "review", icon: Star, label: "Avaliações", template: { title: "Cliente Satisfeito", comment: "Viagem incrível!", rating: 5, authorImage: "", imageShape: "circle" } },
  { type: "highlightCard", icon: Star, label: "Card de Destaque", template: { title: "Nome do Destaque", description: "Hotel, restaurante ou atração.", rating: 4, imageUrl: "", buttonText: "Ver Ofertas", buttonLink: "#" } },
  { type: "thingsToDo", icon: Images, label: "O que Fazer", template: { title: "O que Fazer", items: [{ id: "1", name: "Ponto Turístico 1", imageUrl: "", description: "Descrição", price: "R$ 85,00", rating: 4.8, link: "" }] } },
 ],
 negocios: [
  { type: "product", icon: ShoppingBag, label: "Produto", template: { name: "Nome do Produto", description: "Descrição do produto", price: 9990, image_url: "", stock: 10, rating: 4.5 } },
  { type: "service", icon: Briefcase, label: "Serviço", template: { name: "Nome do Serviço", description: "Descrição do serviço", price: 15000, duration_minutes: 60, image_url: "" } },
  { type: "chatWidget", icon: MessageCircle, label: "Chat Widget", template: { welcomeMessage: "Olá! Como posso ajudar?", position: "bottom-right", primaryColor: "#6366f1" } },
  { type: "quotation", icon: ClipboardList, label: "Formulário de Cotação", template: { title: "Solicite sua Cotação", description: "Escolha o tipo de serviço", quotationTypes: [{ id: "1", type: "passagem_aerea", icon: "plane", label: "Passagem Aérea", enabled: true }, { id: "2", type: "cruzeiro", icon: "ship", label: "Cruzeiro", enabled: true }, { id: "3", type: "viagem_terrestre", icon: "car", label: "Viagem Terrestre", enabled: true }, { id: "4", type: "visto", icon: "file-text", label: "Visto", enabled: true }, { id: "5", type: "seguro_viagem", icon: "shield", label: "Seguro Viagem", enabled: true }, { id: "6", type: "passeios", icon: "map", label: "Passeios", enabled: true }], customFields: [], successMessage: "Cotação enviada! Entraremos em contato em breve.", buttonText: "Enviar Cotação" } },
  { type: "faq", icon: HelpCircle, label: "FAQ", template: { title: "Perguntas Frequentes", items: [{ id: "1", question: "Como funciona o processo de reserva?", answer: "Resposta detalhada aqui..." }, { id: "2", question: "Quais formas de pagamento são aceitas?", answer: "Resposta detalhada aqui..." }] } },
  { type: "pricing", icon: DollarSign, label: "Preços / Pacote", template: { title: "Pacote Completo", price: "999", currency: "R$", period: "pessoa", operatorImage: "", installments: 12, installmentValue: "83,25", installmentDescription: "sem juros", paymentMethods: { creditCard: true, debitCard: false, boleto: true, pix: true }, features: ["Passagens aéreas", "Hotel 4 estrelas", "Café da manhã"] } },
  { type: "hours", icon: Clock, label: "Horários", template: { title: "Horário de Funcionamento", schedule: [{ day: "Seg-Sex", hours: "9:00 - 18:00" }, { day: "Sáb", hours: "10:00 - 14:00" }] } },
  { type: "tags", icon: Tags, label: "Tags", template: { tags: ["Wi-Fi Grátis", "Pet Friendly", "Estacionamento"] } },
  { type: "payment", icon: CreditCard, label: "Pagamento PIX", template: { buttonText: "Realizar Pagamento", pixKey: "", entityType: "order", entityId: "" } },
 ],
 basico: [
  { type: "banner", icon: ImageIcon, label: "Banner", template: { title: "Título do Banner", subtitle: "Subtítulo descritivo", buttonText: "Saiba Mais", buttonLink: "#", backgroundColor: "hsl(263, 70%, 50%)", backgroundImage: "" } },
  { type: "text", icon: AlignLeft, label: "Texto Livre", template: { content: "Digite seu texto aqui..." } },
  { type: "imageUpload", icon: ImageIcon, label: "Imagem Principal", template: { title: "Título Principal", imageUrl: "", buttonText: "Upload" } },
  { type: "stories", icon: Images, label: "Stories", template: { stories: [{ id: "1", type: "image", url: "", thumbnail: "", title: "Story 1" }, { id: "2", type: "image", url: "", thumbnail: "", title: "Story 2" }] } },
  { type: "links", icon: Link2, label: "Links Bio", template: { links: [{ id: "1", text: "Meu Link 1", url: "https://example.com", icon: "" }, { id: "2", text: "Meu Link 2", url: "https://example.com", icon: "" }] } },
  { type: "video", icon: Film, label: "Vídeo", template: { title: "Meu Vídeo", videoUrl: "", youtubeUrl: "", vimeoUrl: "", thumbnail: "", autoplay: false } },
  { type: "carousel", icon: Images, label: "Carrossel", template: { title: "Galeria", items: [{ id: "1", imageUrl: "", title: "Item 1", description: "Descrição", link: "" }, { id: "2", imageUrl: "", title: "Item 2", description: "Descrição", link: "" }], style: "cards" } },
  { type: "buttons", icon: Zap, label: "Botões", template: { buttons: [{ id: "1", text: "Botão 1", url: "https://example.com", variant: "primary" }], layout: "vertical" } },
  { type: "gallery", icon: Images, label: "Galeria", template: { images: ["", "", ""] } },
  { type: "form", icon: FileText, label: "Formulário", template: { title: "Peça sua cotação", nameLabel: "Digite seu nome", buttonText: "Enviar", termsText: "Aceito os termos e condições" } },
  { type: "countdown", icon: Timer, label: "Contador Regressivo", template: { title: "A OFERTA TERMINA EM", endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), backgroundColor: "hsl(0, 84%, 60%)" } },
  { type: "divider", icon: AlignLeft, label: "Divisor", template: { style: "line", spacing: "md" } },
  { type: "table", icon: TableIcon, label: "Tabela", template: { title: "Tabela", headers: ["Produto", "Utilização", "Taxa", "Valor"], rows: [{ id: "1", cells: ["Item 1", "08/12/2025", "-", "R$ 999,00"] }] } },
  { type: "expandableText", icon: ChevronDown, label: "Texto Expansível", template: { title: "Clique para expandir", content: "Conteúdo detalhado aqui...", defaultExpanded: false } },
  { type: "acceptCheckbox", icon: CheckSquare, label: "Caixa de Aceite", template: { label: "Li e aceito os termos e condições", required: true } },
  { type: "floatingButtons", icon: MousePointer2, label: "Botões Flutuantes", template: { buttons: [{ id: "1", type: "whatsapp", label: "WhatsApp", value: "5511999999999", position: "bottom-right", backgroundColor: "#25D366", textColor: "#ffffff" }] } },
 ],
};

const SINGLE_BLOCK_SUBCATEGORIES: { id: "viagem" | "negocios" | "basico"; label: string; icon: any }[] = [
 { id: "viagem", label: "Viagem e Turismo", icon: Plane },
 { id: "negocios", label: "Negócios e E-commerce", icon: ShoppingBag },
 { id: "basico", label: "Básicos e Utilitários", icon: Layers },
];

export function BuilderAddPanel3Col({
 isOpen,
 onClose,
 onSelectTemplate,
 onInsertSingleBlock,
}: BuilderAddPanel3ColProps) {
 const [selectedCatId, setSelectedCatId] = useState("hero");
 const [selectedSubId, setSelectedSubId] = useState("hero_destaque");
 const [searchQuery, setSearchQuery] = useState("");
 const [singleBlockSub, setSingleBlockSub] = useState<"viagem" | "negocios" | "basico">("viagem");

 if (!isOpen) return null;

 const isBlocosMode = selectedCatId === "blocos";

 const currentCategory =
 CATEGORY_TREE.find((c) => c.id === selectedCatId) || CATEGORY_TREE[0];
 const currentSubcategory =
 currentCategory.subcategories.find((s) => s.id === selectedSubId) ||
 currentCategory.subcategories[0];

 const activeTemplates: SectionTemplate[] = currentSubcategory
 ? currentSubcategory.templateIds
 .map((id) => sectionTemplates[id])
 .filter(Boolean)
 : [];

 // Filtragem se houver busca
 const displayedTemplates = searchQuery.trim()
 ? Object.values(sectionTemplates).filter(
 (t) =>
 t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 t.description.toLowerCase().includes(searchQuery.toLowerCase())
 )
 : activeTemplates;

 return (
 <div className="fixed inset-y-0 left-12 z-40 flex select-none animate-in slide-in-from-left duration-200 shadow-2xl">
 {/* ── PAINEL PRINCIPAL DE 3 COLUNAS (Wix Studio / Linear Standard) ── */}
 <div className="flex h-full bg-card border-r border-border shadow-2xl">
 {/* COLUNA 1: Categorias Principais (170px) */}
 <div className="w-48 bg-muted/20 border-r border-border/70 flex flex-col py-3">
 <div className="px-3 pb-2 flex items-center justify-between border-b border-border/50">
 <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
 Biblioteca de Seções
 </span>
 </div>

 <ScrollArea className="flex-1 py-1 px-1.5">
 <div className="space-y-0.5">
 {CATEGORY_TREE.map((cat) => {
 const Icon = cat.icon;
 const isSelected = selectedCatId === cat.id;

 return (
 <button
 key={cat.id}
 type="button"
 onClick={() => {
 setSelectedCatId(cat.id);
 setSelectedSubId(cat.subcategories[0]?.id || "");
 }}
 className={cn(
 "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer text-left",
 isSelected
 ? "bg-primary/10 text-primary font-bold shadow-2xs border border-primary/20"
 : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
 )}
 >
 <div className="flex items-center gap-2 truncate">
 <Icon className="size-3.5 shrink-0" />
 <span className="truncate">{cat.label}</span>
 </div>
 {isSelected && <ArrowRight className="size-3 text-primary shrink-0" />}
 </button>
 );
 })}
 </div>
 </ScrollArea>
 </div>

 {/* COLUNA 2: Subcategorias (150px) */}
 <div className="w-40 bg-card border-r border-border/70 flex flex-col py-3">
 <div className="px-3 pb-2 border-b border-border/50">
 <span className="text-[11px] font-bold text-foreground truncate block">
 {currentCategory.label}
 </span>
 </div>

 <ScrollArea className="flex-1 py-1 px-1.5">
 <div className="space-y-0.5">
 {isBlocosMode
 ? SINGLE_BLOCK_SUBCATEGORIES.map((sub) => (
 <button
 key={sub.id}
 type="button"
 onClick={() => setSingleBlockSub(sub.id)}
 className={cn(
 "w-full px-3 py-2 rounded-xl text-xs transition-all cursor-pointer text-left truncate block",
 singleBlockSub === sub.id
 ? "bg-primary text-primary-foreground font-bold shadow-2xs"
 : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
 )}
 >
 {sub.label}
 </button>
 ))
 : currentCategory.subcategories.map((sub) => {
 const isSelected = selectedSubId === sub.id;
 return (
 <button
 key={sub.id}
 type="button"
 onClick={() => setSelectedSubId(sub.id)}
 className={cn(
 "w-full px-3 py-2 rounded-xl text-xs transition-all cursor-pointer text-left truncate block",
 isSelected
 ? "bg-primary text-primary-foreground font-bold shadow-2xs"
 : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
 )}
 >
 {sub.label}
 </button>
 );
 })}
 </div>
 </ScrollArea>
 </div>

 {/* COLUNA 3: Cards Visuais com Render & Inserção (380px) */}
 <div className="w-[380px] bg-card flex flex-col">
 {/* Header da Coluna 3 com Busca e Fechar */}
 <div className="p-3 border-b border-border/70 flex items-center justify-between gap-2 bg-muted/10">
 <div className="relative flex-1">
 <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
 <Input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Buscar modelos de seção..."
 className="h-8 pl-8 text-xs rounded-lg bg-background border-border/80"
 />
 </div>
 <Button
 type="button"
 variant="ghost"
 size="icon"
 onClick={onClose}
 className="size-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
 >
 <X className="size-3.5" />
 </Button>
 </div>

 {/* Lista de Seções com Visual Render */}
 <ScrollArea className="flex-1 p-3">
 <div className="space-y-3 pb-8">
 {isBlocosMode ? (
  SINGLE_BLOCKS[singleBlockSub].map((block) => (
  <div
  key={block.type}
  onClick={() => {
  onInsertSingleBlock(block.type);
  onClose();
  }}
  className="group rounded-2xl border border-border/70 bg-muted/20 hover:bg-muted/50 hover:border-primary/50 transition-all cursor-pointer overflow-hidden p-3 flex items-center gap-3 shadow-2xs"
  >
  <div className="size-10 rounded-xl bg-background border border-border/50 flex items-center justify-center text-muted-foreground">
  <block.icon className="size-5" />
  </div>
  <div className="flex-1">
  <p className="text-xs font-bold text-foreground">{block.label}</p>
  <p className="text-[10px] text-muted-foreground">Inserir bloco individual</p>
  </div>
  <Plus className="size-4 text-muted-foreground group-hover:text-primary" />
  </div>
  ))
 ) : displayedTemplates.length === 0 ? (
 <div className="p-8 text-center text-muted-foreground text-xs space-y-1">
 <LayoutTemplate className="size-6 mx-auto text-muted-foreground/50 mb-2" />
 <p className="font-semibold text-foreground">Nenhuma seção encontrada</p>
 <p>Tente outro termo na busca ou selecione outra categoria.</p>
 </div>
 ) : (
 displayedTemplates.map((template) => (
 <div
 key={template.id}
 onClick={() => {
 onSelectTemplate(template);
 onClose();
 }}
 className="group rounded-2xl border border-border/70 bg-muted/20 hover:bg-muted/50 hover:border-primary/50 transition-all cursor-pointer overflow-hidden p-3 space-y-2.5 shadow-2xs"
 >
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
 {template.name}
 </span>
 <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium">
 {template.category}
 </Badge>
 </div>

 {/* Render Visual / Miniatura Gráfica da Seção */}
 <div className="h-28 rounded-xl bg-background border border-border/60 overflow-hidden relative flex items-center justify-center group-hover:shadow-xs transition-shadow">
 {template.previewImageUrl ? (
 <img
 src={template.previewImageUrl}
 alt={template.name}
 className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
 />
 ) : (
 <div className="flex flex-col items-center gap-1 text-muted-foreground/50">
 <LayoutTemplate className="size-6" />
 <span className="text-[10px] font-mono">Prévia da Seção</span>
 </div>
 )}
 <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors flex items-center justify-center">
 <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow-md flex items-center gap-1">
 <Plus className="size-3" />
 <span>Inserir</span>
 </span>
 </div>
 </div>

 <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
 {template.description}
 </p>
 </div>
 ))
 )}
 </div>
 </ScrollArea>
 </div>
 </div>
 </div>
 );
}
