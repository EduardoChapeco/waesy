import { z } from "zod";
import type { BlockManifest } from "./builder-types";

export const builderRegistry: Record<string, BlockManifest> = {
 section: {
 type: "section",
 version: "1.0.0",
 name: "Seção (Full Width)",
 description: "Um bloco estrutural de largura total",
 category: "layout",
 icon: "Square",
 allowedBuilderProfiles: "all",
 allowedParentTypes: "none", // Sections must be root nodes
 allowedChildTypes: ["container"],

 contentSchema: z.object({}),
 styleSchema: z.object({
 surfaceVariant: z
 .enum(["default", "zine", "ticket", "lambe", "journal", "flat", "muted", "none"])
 .default("default"),
 backgroundImage: z.string().url().optional(),
 }),

 inspector: {
 design: [
 {
 name: "surfaceVariant",
 label: "Estilo do Papel / Fundo",
 type: "select",
 options: [
 { label: "Padrão", value: "default" },
 { label: "Transparente", value: "none" },
 { label: "Zine (Rasgado)", value: "zine" },
 { label: "Ticket (Ingresso)", value: "ticket" },
 { label: "Lambe-Lambe", value: "lambe" },
 { label: "Journal (Papel)", value: "journal" },
 { label: "Flat (Sólido)", value: "flat" },
 { label: "Muted (Secundário)", value: "muted" },
 ],
 },
 { name: "backgroundImage", label: "Imagem de Fundo", type: "image" },
 ],
 },

 defaultProps: {
 node_type: "section",
 block_type: "section",
 content: {},
 design_tokens: {},
 layout_rules: {},
 },
 },

 container: {
 type: "container",
 version: "1.0.0",
 name: "Container",
 description: "Um contêiner para alinhar elementos ao centro da tela com limite de largura",
 category: "layout",
 icon: "Maximize",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["section"],
 allowedChildTypes: ["composition", "element"],

 contentSchema: z.object({}),
 layoutSchema: z.object({
 maxWidth: z.enum(["sm", "md", "lg", "xl", "2xl", "full"]).default("xl"),
 paddingX: z.enum(["none", "sm", "md", "lg"]).default("md"),
 paddingY: z.enum(["none", "sm", "md", "lg", "xl", "2xl"]).default("xl"),
 display: z.enum(["block", "flex", "grid"]).default("flex"),
 flexDirection: z.enum(["row", "col"]).default("col"),
 gap: z.enum(["none", "sm", "md", "lg", "xl"]).default("md"),
 }),

 inspector: {
 layout: [
 {
 name: "maxWidth",
 label: "Largura Máxima",
 type: "select",
 options: [
 { label: "Pequeno", value: "sm" },
 { label: "Normal", value: "lg" },
 { label: "Largo", value: "xl" },
 { label: "Largura Total", value: "full" },
 ],
 },
 {
 name: "flexDirection",
 label: "Direção",
 type: "select",
 options: [
 { label: "Vertical", value: "col" },
 { label: "Horizontal", value: "row" },
 ],
 },
 {
 name: "gap",
 label: "Espaçamento Interno",
 type: "select",
 options: [
 { label: "Sem Espaçamento", value: "none" },
 { label: "Pequeno", value: "sm" },
 { label: "Médio", value: "md" },
 { label: "Grande", value: "lg" },
 ],
 },
 ],
 },

 defaultProps: {
 node_type: "container",
 block_type: "container",
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "md",
 paddingX: "md",
 paddingY: "xl",
 },
 },
 },

 rich_text: {
 type: "rich_text",
 version: "1.0.0",
 name: "Texto Formatado",
 description: "Bloco de texto com suporte a HTML semântico e estilos mistos",
 category: "content",
 icon: "Type",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "composition"],
 allowedChildTypes: "none",

 contentSchema: z.object({
 html: z.string(),
 }),

 inspector: {
 content: [{ name: "html", label: "Conteúdo", type: "textarea" }],
 },

 defaultProps: {
 node_type: "element",
 block_type: "rich_text",
 content: { html: "<p>Digite seu texto aqui...</p>" },
 },
 },

 hero_carousel: {
 type: "hero_carousel",
 version: "2.0.0",
 name: "Carrossel de Banners",
 description: "Banner rotativo com CTAs",
 category: "commerce",
 icon: "Images",
 allowedBuilderProfiles: ["storefront", "campaign"],
 allowedParentTypes: ["container"],
 allowedChildTypes: "none",

 contentSchema: z.object({
 autoPlay: z.boolean().default(true),
 interval: z.number().default(5),
 banners: z.array(
 z.object({
 title: z.string().optional(),
 image_url: z.string().url(),
 mobile_image_url: z.string().optional(),
 link: z.string().optional(),
 button_text: z.string().optional(),
 }),
 ),
 showOverlay: z.boolean().default(true),
 overlayOpacity: z.enum(["light", "medium", "dark"]).default("medium"),
 desktopHeight: z.enum(["full", "proportional", "square", "natural"]).default("proportional"),
 }),

 inspector: {
 content: [
 { name: "autoPlay", label: "Autoplay", type: "boolean" },
 { name: "interval", label: "Intervalo (segundos)", type: "number" },
 {
 name: "banners",
 label: "Banners (Lista de Slides)",
 type: "array",
 arrayFields: [
 { name: "title", label: "Título Principal", type: "text" },
 { name: "subtitle", label: "Subtítulo / Descrição", type: "text" },
 { name: "button_text", label: "Texto do Botão (CTA)", type: "text" },
 { name: "link", label: "Link de Destino", type: "text" },
 { name: "image_url", label: "Imagem Desktop (1920x800)", type: "image" },
 {
 name: "mobile_image_url",
 label: "Imagem Mobile (1080x1350)",
 type: "image",
 },
 { name: "alt_text", label: "Texto Alternativo (SEO)", type: "text" },
 ],
 },
 ],
 design: [
 { name: "showOverlay", label: "Mostrar Sombra Frontal (Overlay)", type: "boolean" },
 {
 name: "overlayOpacity",
 label: "Intensidade da Sombra",
 type: "select",
 options: [
 { label: "Leve", value: "light" },
 { label: "Média", value: "medium" },
 { label: "Escura", value: "dark" },
 ],
 },
 {
 name: "desktopHeight",
 label: "Altura (Desktop)",
 type: "select",
 options: [
 { label: "Proporcional (Largo)", value: "proportional" },
 { label: "Ajuste Nativo (Sem Cortes)", value: "natural" },
 { label: "Tela Cheia (Fullscreen)", value: "full" },
 { label: "Quadrado (1:1)", value: "square" },
 ],
 },
 ],
 },

 defaultProps: {
 node_type: "composition",
 block_type: "hero_carousel",
 content: {
 autoPlay: true,
 interval: 5,
 banners: [],
 showOverlay: true,
 overlayOpacity: "medium",
 desktopHeight: "proportional",
 },
 },
 },

 bento_grid: {
 type: "bento_grid",
 version: "1.0.0",
 name: "Bento Grid",
 description: "Grid assimétrico avançado para campanhas e categorias",
 category: "commerce",
 icon: "LayoutGrid",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 items: z.array(z.any()),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título do Bento Grid", type: "text" },
 {
 name: "items",
 label: "Itens do Grid",
 type: "array",
 arrayFields: [
 { name: "title", label: "Título do Item", type: "text" },
 { name: "subtitle", label: "Subtítulo (Destaque)", type: "text" },
 { name: "image", label: "Imagem (Upload)", type: "image" },
 { name: "link", label: "Link de Destino", type: "text" },
 {
 name: "size",
 label: "Tamanho do Card",
 type: "select",
 options: [
 { label: "Pequeno (1x1)", value: "small" },
 { label: "Largo (2x1)", value: "wide" },
 { label: "Alto (1x2)", value: "tall" },
 { label: "Grande (2x2)", value: "large" },
 ],
 },
 ],
 },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "bento_grid",
 content: { items: [] },
 },
 },

 countdown_timer: {
 type: "countdown_timer",
 version: "1.0.0",
 name: "Cronômetro de Oferta",
 description: "Relógio regressivo para escassez e promoções",
 category: "marketing",
 icon: "Clock",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 target_date: z.string(),
 expired_message: z.string().optional(),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título de Urgência", type: "text" },
 { name: "target_date", label: "Data Alvo (ISO)", type: "text", placeholder: "2026-12-31T23:59:59" },
 { name: "expired_message", label: "Mensagem pós-expiração", type: "text", placeholder: "Oferta Expirada" },
 ],
 design: [
 { name: "backgroundColor", label: "Cor de Fundo da Faixa", type: "color" },
 { name: "textColor", label: "Cor do Texto e Título", type: "color" },
 { name: "boxColor", label: "Cor dos Blocos Numéricos", type: "color" },
 { name: "boxTextColor", label: "Cor dos Dígitos", type: "color" },
 ],
 },
 defaultProps: {
 node_type: "element",
 block_type: "countdown_timer",
 content: {
 target_date: new Date(Date.now() + 86400000).toISOString(),
 title: "Oferta Encerra em",
 expired_message: "Oferta Expirada",
 },
 design_tokens: {
 backgroundColor: "transparent",
 textColor: "#09090b",
 boxColor: "#09090b",
 boxTextColor: "#ffffff",
 },
 },
 },

 stories_ring: {
 type: "stories_ring",
 version: "1.0.0",
 name: "Destaques em Círculo",
 description: "Destaques visuais interativos que abrem modal em tela cheia",
 category: "marketing",
 icon: "PlayCircle",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 stories: z.array(z.any()),
 }),
 inspector: {
 content: [
 {
 name: "stories",
 label: "Histórias",
 type: "array",
 arrayFields: [
 { name: "title", label: "Título da Bolha", type: "text" },
 { name: "thumb", label: "Thumbnail", type: "image" },
 { name: "media_url", label: "Mídia Completa (Vídeo/Img)", type: "image" },
 { name: "link", label: "Link Produto", type: "text" },
 {
 name: "type",
 label: "Tipo de Mídia",
 type: "select",
 options: [
 { label: "Imagem", value: "image" },
 { label: "Vídeo", value: "video" },
 ],
 },
 ],
 },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "stories_ring",
 content: { stories: [] },
 },
 },

 trust_badges: {
 type: "trust_badges",
 version: "1.0.0",
 name: "Emblemas de Confiança",
 description: "Ícones de segurança, frete e garantia",
 category: "commerce",
 icon: "ShieldCheck",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 badges: z.array(z.any()),
 }),
 inspector: {
 content: [
 {
 name: "badges",
 label: "Emblemas",
 type: "array",
 arrayFields: [
 { name: "icon", label: "Ícone SVG ou Imagem", type: "image" },
 { name: "title", label: "Título do Emblema", type: "text" },
 { name: "subtitle", label: "Subtítulo (Opcional)", type: "text" },
 ],
 },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "trust_badges",
 content: { badges: [] },
 },
 },

 product_rail: {
 type: "product_rail",
 version: "1.0.0",
 name: "Vitrine de Produtos (Rail)",
 description: "Carrossel ou Grid de produtos baseado em uma fonte de dados",
 category: "commerce",
 icon: "ShoppingBag",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 collection_slug: z.string().optional(),
 itemsPerRowDesktop: z.enum(["3", "4", "5"]).default("4"),
 itemsPerRowMobile: z.enum(["1", "2"]).default("2"),
 freeScroll: z.boolean().default(true),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título da Vitrine", type: "text" },
 { name: "collection_slug", label: "Coleção (opcional)", type: "collection_select" },
 ],
 layout: [
 {
 name: "itemsPerRowDesktop",
 label: "Produtos por linha (Desktop)",
 type: "select",
 options: [
 { label: "3", value: "3" },
 { label: "4", value: "4" },
 { label: "5", value: "5" },
 ],
 },
 {
 name: "itemsPerRowMobile",
 label: "Produtos por linha (Mobile)",
 type: "select",
 options: [
 { label: "1", value: "1" },
 { label: "2", value: "2" },
 ],
 },
 { name: "freeScroll", label: "Rolagem Livre (Mobile Slider)", type: "boolean" },
 ],
 },
 layoutVariants: [
 { label: "Carrossel", value: "carousel" },
 { label: "Grade (Grid)", value: "grid" },
 ],
 defaultProps: {
 node_type: "composition",
 block_type: "product_rail",
 layout_variant: "carousel",
 content: {
 title: "Destaques",
 itemsPerRowDesktop: "4",
 itemsPerRowMobile: "2",
 freeScroll: true,
 },
 data_bindings: { type: "latest_products" },
 },
 },

 announcement_bar: {
 type: "announcement_bar",
 version: "1.0.0",
 name: "Barra de Anúncio",
 description: "Faixa horizontal para avisos globais no topo da página",
 category: "marketing",
 icon: "Megaphone",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 text: z.string(),
 link: z.string().optional(),
 surfaceVariant: z
 .enum(["default", "zine", "ticket", "lambe", "journal", "flat", "muted"])
 .default("default"),
 text_color: z.string().optional(),
 }),
 inspector: {
 content: [
 { name: "text", label: "Texto do Anúncio", type: "text" },
 { name: "link", label: "Link (Opcional)", type: "text" },
 ],
 design: [
 {
 name: "surfaceVariant",
 label: "Estilo da Barra",
 type: "select",
 options: [
 { label: "Padrão", value: "default" },
 { label: "Zine", value: "zine" },
 { label: "Ticket", value: "ticket" },
 { label: "Flat", value: "flat" },
 ],
 },
 { name: "text_color", label: "Cor do Texto", type: "color" },
 ],
 },
 defaultProps: {
 node_type: "element",
 block_type: "announcement_bar",
 content: {
 text: "Frete grátis para todo o Brasil acima de R$ 299",
 surfaceVariant: "default",
 text_color: "#ffffff",
 },
 },
 },

 video_section: {
 type: "video_section",
 version: "1.0.0",
 name: "Vídeo",
 description: "Embed de vídeo do YouTube, Vimeo ou arquivo MP4",
 category: "content",
 icon: "Video",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 video_url: z.string().url(),
 auto_play: z.boolean().default(false),
 loop: z.boolean().default(true),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título do Vídeo", type: "text" },
 { name: "video_url", label: "URL do Vídeo (YouTube/Vimeo/MP4)", type: "text" },
 { name: "auto_play", label: "Reprodução Automática", type: "boolean" },
 { name: "loop", label: "Repetir Vídeo", type: "boolean" },
 ],
 },
 defaultProps: {
 node_type: "element",
 block_type: "video_section",
 content: { video_url: "", auto_play: false, loop: true },
 },
 },

 contact_form: {
 type: "contact_form",
 version: "1.0.0",
 name: "Formulário de Contato",
 description: "Formulário simples com campos de nome, email e mensagem",
 category: "marketing",
 icon: "Mail",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 subtitle: z.string().optional(),
 email_to: z.string().email(),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título", type: "text" },
 { name: "subtitle", label: "Subtítulo", type: "textarea" },
 { name: "email_to", label: "E-mail de Destino", type: "text" },
 ],
 },
 defaultProps: {
 node_type: "element",
 block_type: "contact_form",
 content: { title: "Fale Conosco", email_to: "contato@loja.com.br" },
 },
 },

 booking_calendar: {
 type: "booking_calendar",
 version: "1.0.0",
 name: "Agendamento de Serviços",
 description: "Calendário interativo para agendar serviços reais",
 category: "marketing",
 icon: "Calendar",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 subtitle: z.string().optional(),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título", type: "text" },
 { name: "subtitle", label: "Subtítulo", type: "textarea" },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "booking_calendar",
 content: {
 title: "Agende seu Atendimento",
 subtitle: "Escolha o melhor serviço e horário para você.",
 },
 },
 },

 gallery_grid: {
 type: "gallery_grid",
 version: "1.0.0",
 name: "Grade de Imagens",
    description: "Grade responsiva de fotos em alta resolução para vitrine ou portfólio",
 category: "content",
 icon: "Image",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 images: z.array(z.any()),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título da Galeria", type: "text" },
 {
 name: "images",
 label: "Imagens",
 type: "array",
 arrayFields: [
 { name: "url", label: "Upload da Imagem", type: "image" },
 { name: "alt", label: "Texto Alternativo", type: "text" },
 ],
 },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "gallery_grid",
 content: { title: "Nossa Galeria", images: [] },
 },
 },

 info_cards: {
 type: "info_cards",
 version: "1.0.0",
 name: "Cartões de Informação",
 description: "Cards com ícone, título e texto",
 category: "marketing",
 icon: "CreditCard",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 cards: z.array(z.any()),
 }),
 inspector: {
 content: [
 {
 name: "cards",
 label: "Cartões",
 type: "array",
 arrayFields: [
 { name: "title", label: "Título do Cartão", type: "text" },
 { name: "description", label: "Texto", type: "textarea" },
 {
 name: "icon",
 label: "Ícone (Lucide)",
 type: "select",
 options: [
 { label: "Caminhão (Frete)", value: "truck" },
 { label: "Troca/Retorno", value: "rotate-ccw" },
 { label: "Escudo (Segurança)", value: "shield" },
 { label: "Cartão (Pagamento)", value: "credit-card" },
 { label: "Tag (Oferta)", value: "tag" },
 { label: "Estrela (Qualidade)", value: "star" },
 ],
 },
 ],
 },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "info_cards",
 content: { cards: [] },
 },
 },

 mosaic_banners: {
 type: "mosaic_banners",
 version: "1.0.0",
 name: "Mosaico de Banners",
 description: "Banners em formato mosaico",
 category: "marketing",
 icon: "LayoutTemplate",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 banners: z.array(z.any()),
 }),
 inspector: {
 content: [
 {
 name: "banners",
 label: "Banners (Mosaico)",
 type: "array",
 arrayFields: [
 { name: "image_url", label: "Upload da Imagem", type: "image" },
 { name: "link", label: "Link de Ação", type: "text" },
 { name: "title", label: "Texto de Overlay", type: "text" },
 ],
 },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "mosaic_banners",
 content: { banners: [] },
 },
 },

 social_grid: {
 type: "social_grid",
 version: "1.0.0",
 name: "Feed Social (Instagram)",
 description: "Mosaico de fotos das redes sociais",
 category: "marketing",
 icon: "Instagram",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 username: z.string().optional(),
 posts: z.array(z.any()),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título do Feed", type: "text" },
 { name: "username", label: "Usuário (@)", type: "text" },
 {
 name: "posts",
 label: "Posts do Feed",
 type: "array",
 arrayFields: [
 { name: "image_url", label: "Imagem do Post", type: "image" },
 { name: "link", label: "Link para o Instagram", type: "text" },
 { name: "likes", label: "Curtidas", type: "text" },
 { name: "comments", label: "Comentários", type: "text" },
 ],
 },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "social_grid",
 content: { title: "Siga-nos", username: "@lojawaesy", posts: [] },
 },
 },

 faq_accordion: {
 type: "faq_accordion",
 version: "1.0.0",
 name: "Perguntas Frequentes",
 description: "Lista de perguntas expansíveis",
 category: "marketing",
 icon: "HelpCircle",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 description: z.string().optional(),
 faqs: z.array(z.any()),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título do FAQ", type: "text" },
 { name: "description", label: "Descrição Curta", type: "textarea" },
 {
 name: "faqs",
 label: "Perguntas",
 type: "array",
 arrayFields: [
 { name: "question", label: "Pergunta", type: "text" },
 { name: "answer", label: "Resposta", type: "textarea" },
 ],
 },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "faq_accordion",
 content: { title: "Dúvidas Comuns", faqs: [] },
 },
 },

 testimonial_carousel: {
 type: "testimonial_carousel",
 version: "1.0.0",
 name: "Depoimentos de Clientes",
 description: "Carrossel de avaliações e provas sociais",
 category: "marketing",
 icon: "Star",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 subtitle: z.string().optional(),
 testimonials: z.array(z.any()),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título", type: "text" },
 { name: "subtitle", label: "Subtítulo", type: "textarea" },
 {
 name: "testimonials",
 label: "Depoimentos",
 type: "array",
 arrayFields: [
 { name: "author", label: "Nome do Cliente", type: "text" },
 { name: "content", label: "O que disse?", type: "textarea" },
 { name: "rating", label: "Nota (1-5)", type: "number" },
 { name: "avatar_url", label: "Foto do Cliente (Opcional)", type: "image" },
 ],
 },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "testimonial_carousel",
 content: { title: "O que dizem nossos clientes", testimonials: [] },
 },
 },

 timeline_history: {
 type: "timeline_history",
 version: "1.0.0",
 name: "Timeline (História)",
 description: "Linha do tempo vertical para marcos da marca",
 category: "marketing",
 icon: "Clock",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 subtitle: z.string().optional(),
 events: z.array(z.any()),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título", type: "text" },
 { name: "subtitle", label: "Subtítulo", type: "textarea" },
 {
 name: "events",
 label: "Marcos Históricos",
 type: "array",
 arrayFields: [
 { name: "year", label: "Ano ou Data", type: "text" },
 { name: "title", label: "Título do Marco", type: "text" },
 { name: "description", label: "Descrição Histórica", type: "textarea" },
 { name: "image_url", label: "Foto Histórica (Upload)", type: "image" },
 ],
 },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "timeline_history",
 content: { title: "Nossa História", events: [] },
 },
 },

 product_carousel: {
 type: "product_carousel",
 version: "1.0.0",
 name: "Carrossel de Produtos",
 description: "Exibe produtos dinamicamente puxando do catálogo",
 category: "commerce",
 icon: "ShoppingBag",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 subtitle: z.string().optional(),
 collection_slug: z.string().optional(),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título", type: "text" },
 { name: "subtitle", label: "Subtítulo", type: "textarea" },
 { name: "collection_slug", label: "Coleção (opcional)", type: "collection_select" },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "product_carousel",
 content: { title: "Lançamentos", subtitle: "Conheça as novidades" },
 data_bindings: { type: "dynamic_products" },
 },
 },

 product_grid: {
 type: "product_grid",
 version: "1.0.0",
 name: "Grid de Produtos",
 description: "Exibe produtos em formato de grade",
 category: "commerce",
 icon: "LayoutGrid",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 subtitle: z.string().optional(),
 collection_slug: z.string().optional(),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título", type: "text" },
 { name: "subtitle", label: "Subtítulo", type: "textarea" },
 { name: "collection_slug", label: "Coleção (opcional)", type: "collection_select" },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "product_grid",
 content: { title: "Mais Vendidos", subtitle: "Os favoritos dos clientes" },
 data_bindings: { type: "dynamic_products" },
 },
 },

 split_banner: {
 type: "split_banner",
 version: "1.0.0",
 name: "Banner Dividido",
 description: "50% Imagem, 50% Texto e Botão",
 category: "marketing",
 icon: "Columns",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 description: z.string().optional(),
 button_text: z.string().optional(),
 button_link: z.string().optional(),
 image_url: z.string().url().optional(),
 image_position: z.enum(["left", "right"]).default("left"),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título", type: "text" },
 { name: "description", label: "Descrição", type: "textarea" },
 { name: "button_text", label: "Texto do Botão", type: "text" },
 { name: "button_link", label: "Link do Botão", type: "text" },
 { name: "image_url", label: "Imagem (Upload)", type: "image" },
 {
 name: "image_position",
 label: "Posição da Imagem",
 type: "select",
 options: [
 { label: "Esquerda", value: "left" },
 { label: "Direita", value: "right" },
 ],
 },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "split_banner",
 content: {
 title: "Nova Coleção",
 description: "Descubra os novos modelos.",
 button_text: "Comprar Agora",
 image_position: "left",
 },
 },
 },

 // ─── Perfil Institucional — Blocos Canônicos ─────────────────────────────

 store_profile_hero: {
 type: "store_profile_hero",
 version: "1.0.0",
 name: "Cabeçalho do Perfil da Loja",
 description: "Capa, logo, nome e descrição — dados reais da loja",
 category: "content",
 icon: "Store",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["section", "container"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 show_description: z.boolean().default(true),
 show_logo: z.boolean().default(true),
 show_cover: z.boolean().default(true),
 layout: z.enum(["centered", "left", "instagram"]).default("centered"),
 }),
 inspector: {
 content: [
 {
 name: "layout",
 label: "Layout",
 type: "select",
 options: [
 { label: "Centralizado", value: "centered" },
 { label: "Esquerda", value: "left" },
 { label: "Instagram", value: "instagram" },
 ],
 },
 { name: "show_cover", label: "Exibir Capa", type: "boolean" },
 { name: "show_logo", label: "Exibir Logo", type: "boolean" },
 { name: "show_description", label: "Exibir Descrição", type: "boolean" },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "store_profile_hero",
 content: { show_description: true, show_logo: true, show_cover: true, layout: "centered" },
 data_bindings: { type: "store_profile" },
 },
 },

 store_hours: {
 type: "store_hours",
 version: "1.0.0",
 name: "Horários de Funcionamento",
 description: "Horários reais da loja + status aberto/fechado calculado no servidor",
 category: "content",
 icon: "Clock",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 show_status_badge: z.boolean().default(true),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título da Seção", type: "text" },
 { name: "show_status_badge", label: "Exibir status Aberto/Fechado", type: "boolean" },
 ],
 },
 defaultProps: {
 node_type: "element",
 block_type: "store_hours",
 content: { title: "Horários de Funcionamento", show_status_badge: true },
 data_bindings: { type: "store_profile" },
 },
 },

 store_contact: {
 type: "store_contact",
 version: "1.0.0",
 name: "Contato e Localização",
 description: "Telefone, WhatsApp, e-mail, endereço e botões de ação reais da loja",
 category: "content",
 icon: "MapPin",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 show_map_link: z.boolean().default(true),
 show_address: z.boolean().default(true),
 show_phone: z.boolean().default(true),
 show_whatsapp: z.boolean().default(true),
 show_email: z.boolean().default(true),
 show_action_buttons: z.boolean().default(true),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título da Seção", type: "text" },
 { name: "show_whatsapp", label: "Exibir WhatsApp", type: "boolean" },
 { name: "show_phone", label: "Exibir Telefone", type: "boolean" },
 { name: "show_email", label: "Exibir E-mail", type: "boolean" },
 { name: "show_address", label: "Exibir Endereço", type: "boolean" },
 { name: "show_map_link", label: "Link para o Mapa", type: "boolean" },
 { name: "show_action_buttons", label: "Exibir Botões de Ação", type: "boolean" },
 ],
 },
 defaultProps: {
 node_type: "element",
 block_type: "store_contact",
 content: {
 title: "Fale Conosco",
 show_map_link: true,
 show_address: true,
 show_phone: true,
 show_whatsapp: true,
 show_email: true,
 show_action_buttons: true,
 },
 data_bindings: { type: "store_profile" },
 },
 },

 image_hotspots: {
 type: "image_hotspots",
 version: "1.0.0",
 name: "Imagem com Hotspots (Shop the Look)",
 description: "Imagem interativa com pontos clicáveis para visualizar e comprar produtos",
 category: "commerce",
 icon: "Target",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 subtitle: z.string().optional(),
 image_url: z.string().url(),
 mobile_image_url: z.string().optional(),
 hotspots: z.array(
 z.object({
 id: z.string(),
 xPercent: z.number().min(0).max(100),
 yPercent: z.number().min(0).max(100),
 product_slug: z.string().optional(),
 product_id: z.string().optional(),
 title: z.string().optional(),
 price_cents: z.number().optional(),
 }),
 ),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título da Seção", type: "text" },
 { name: "subtitle", label: "Subtítulo", type: "text" },
 { name: "image_url", label: "Imagem Desktop", type: "image" },
 { name: "mobile_image_url", label: "Imagem Mobile (Opcional)", type: "image" },
 {
 name: "hotspots",
 label: "Pontos Clicáveis (Hotspots)",
 type: "array",
 arrayFields: [
 { name: "title", label: "Nome do Produto", type: "text" },
 { name: "product_slug", label: "Slug do Produto no Catálogo", type: "text" },
 { name: "xPercent", label: "Posição X (%)", type: "number" },
 { name: "yPercent", label: "Posição Y (%)", type: "number" },
 ],
 },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "image_hotspots",
 content: {
 title: "Shop the Look",
 subtitle: "Clique nos marcadores para ver os produtos",
 image_url:
 "",
 hotspots: [
 {
 id: "h1",
 xPercent: 35,
 yPercent: 40,
 title: "Jaqueta Leather Premium",
 product_slug: "jaqueta-leather",
 },
 {
 id: "h2",
 xPercent: 65,
 yPercent: 75,
 title: "Tênis Urban Comfort",
 product_slug: "tenis-urban",
 },
 ],
 },
 },
 },

 routine_steps: {
 type: "routine_steps",
 version: "1.0.0",
 name: "Passos da Rotina",
 description: "Etapas numeradas de cuidados ou estilos com produtos recomendados",
 category: "marketing",
 icon: "ListOrdered",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 subtitle: z.string().optional(),
 steps: z.array(
 z.object({
 step_number: z.number(),
 title: z.string(),
 description: z.string(),
 image_url: z.string().optional(),
 product_slug: z.string().optional(),
 }),
 ),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título da Rotina", type: "text" },
 { name: "subtitle", label: "Subtítulo", type: "textarea" },
 {
 name: "steps",
 label: "Passos da Rotina",
 type: "array",
 arrayFields: [
 { name: "step_number", label: "Número do Passo", type: "number" },
 { name: "title", label: "Título do Passo", type: "text" },
 { name: "description", label: "Instrução / Descrição", type: "textarea" },
 { name: "image_url", label: "Imagem de Suporte", type: "image" },
 { name: "product_slug", label: "Slug do Produto Recomendado", type: "text" },
 ],
 },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "routine_steps",
 content: {
 title: "Sua Rotina Diária",
 subtitle: "Siga este passo a passo para melhores resultados",
 steps: [
 {
 step_number: 1,
 title: "Limpeza Profunda",
 description: "Remova as impurezas com nosso limpador suave.",
 product_slug: "",
 },
 {
 step_number: 2,
 title: "Hidratação Intensa",
 description: "Aplique o sérum restaurador para nutrição duradoura.",
 product_slug: "",
 },
 {
 step_number: 3,
 title: "Proteção Final",
 description: "Proteja contra agressões diárias com a camada selante.",
 product_slug: "",
 },
 ],
 },
 },
 },

 ingredient_spotlight: {
 type: "ingredient_spotlight",
 version: "1.0.0",
 name: "Destaque de Ingredientes/Materiais",
 description: "Cards explicativos de ingredientes ativos ou matérias-primas nobres",
 category: "content",
 icon: "Layers",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 subtitle: z.string().optional(),
 items: z.array(
 z.object({
 title: z.string(),
 benefit: z.string(),
 description: z.string(),
 image_url: z.string().optional(),
 }),
 ),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título da Seção", type: "text" },
 { name: "subtitle", label: "Subtítulo", type: "textarea" },
 {
 name: "items",
 label: "Itens / Ingredientes",
 type: "array",
 arrayFields: [
 { name: "title", label: "Nome do Ingrediente / Material", type: "text" },
 { name: "benefit", label: "Benefício Principal", type: "text" },
 { name: "description", label: "Detalhamento Técnico", type: "textarea" },
 { name: "image_url", label: "Imagem / Ícone", type: "image" },
 ],
 },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "ingredient_spotlight",
 content: {
 title: "Tecnologia & Ingredientes",
 subtitle: "Fórmulas puras e matérias-primas selecionadas",
 items: [
 {
 title: "Ácido Hialurônico Vegano",
 benefit: "Hidratação Multicamadas",
 description: "Atrai e retém água nas camadas mais profundas.",
 },
 {
 title: "Couro Legítimo Solado Flex",
 benefit: "Durabilidade & Leveza",
 description: "Desenvolvido com couro nobre de acabamento natural.",
 },
 ],
 },
 },
 },

 before_after_slider: {
 type: "before_after_slider",
 version: "1.0.0",
 name: "Comparador Antes e Depois",
 description: "Slider interativo para comparar duas imagens lado a lado",
 category: "media",
 icon: "Columns",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 subtitle: z.string().optional(),
 before_image: z.string().url(),
 after_image: z.string().url(),
 before_label: z.string().optional(),
 after_label: z.string().optional(),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título da Comparação", type: "text" },
 { name: "subtitle", label: "Subtítulo", type: "text" },
 { name: "before_image", label: "Imagem 'Antes'", type: "image" },
 { name: "after_image", label: "Imagem 'Depois'", type: "image" },
 { name: "before_label", label: "Rótulo 'Antes'", type: "text" },
 { name: "after_label", label: "Rótulo 'Depois'", type: "text" },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "before_after_slider",
 content: {
 title: "Resultados Reais",
 subtitle: "Arraste a barra central para comparar a transformação",
 before_image:
 "",
 after_image:
 "",
 before_label: "Antes",
 after_label: "Depois de 14 Dias",
 },
 },
 },
 event_rail: {
 type: "event_rail",
 version: "1.0.0",
 name: "Próximos Eventos",
 description: "Lista em carrossel ou grid dos eventos futuros",
 category: "commerce",
 icon: "Calendar",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 subtitle: z.string().optional(),
 layout: z.enum(["carousel", "grid"]).default("carousel"),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título", type: "text" },
 { name: "subtitle", label: "Subtítulo", type: "text" },
 {
 name: "layout",
 label: "Layout",
 type: "select",
 options: [
 { label: "Carrossel", value: "carousel" },
 { label: "Grid", value: "grid" },
 ],
 },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "event_rail",
 content: { layout: "carousel" },
 data_bindings: { source: "upcoming_events", limit: 6 },
 },
 },

 community_feed: {
 type: "community_feed",
 version: "1.0.0",
 name: "Zine Comunitário",
 description: "Mural interativo de classificados e posts da comunidade",
 category: "social",
 icon: "Newspaper",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 layout: z.enum(["masonry", "grid"]).default("masonry"),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título do Mural", type: "text" },
 {
 name: "layout",
 label: "Layout Visual",
 type: "select",
 options: [
 { label: "Caótico (Masonry + Rotação)", value: "masonry" },
 { label: "Organizado (Grid)", value: "grid" },
 ],
 },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "community_feed",
 content: { layout: "masonry", title: "Mural da Comunidade" },
 data_bindings: { source: "latest_classifieds", limit: 12 },
 },
 },

 food_menu_tabs: {
 type: "food_menu_tabs",
 version: "1.0.0",
 name: "Cardápio Digital por Abas",
 description: "Cardápio gastronômico organizado por categorias e itens com fotos e preços",
 category: "commerce",
 icon: "Utensils",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 subtitle: z.string().optional(),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título do Cardápio", type: "text" },
 { name: "subtitle", label: "Subtítulo", type: "text" },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "food_menu_tabs",
 content: { title: "Cardápio do Restaurante", subtitle: "Ingredientes frescos selecionados diariamente." },
 },
 },

 chef_special_banner: {
 type: "chef_special_banner",
 version: "1.0.0",
 name: "Destaque do Prato do Chef",
 description: "Lâmina especial para o prato estrela com lista de ingredientes e preparo",
 category: "commerce",
 icon: "Layers",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 dishName: z.string().optional(),
 description: z.string().optional(),
 priceCents: z.number().optional(),
 prepTimeMinutes: z.number().optional(),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título da Faixa", type: "text" },
 { name: "dishName", label: "Nome do Prato", type: "text" },
 { name: "description", label: "Descrição dos Ingredientes", type: "textarea" },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "chef_special_banner",
 content: {
 title: "Sugestão do Chef",
 dishName: "Costela Prensada ao Demi-Glace",
 description: "Cozida lentamente por 12 horas em baixa temperatura.",
 priceCents: 9600,
 prepTimeMinutes: 25,
 },
 },
 },

 restaurant_hours_delivery: {
 type: "restaurant_hours_delivery",
 version: "1.0.0",
 name: "Horários de Cozinha & Entrega",
 description: "Grade informativa de funcionamento, taxas de entrega e retirada",
 category: "commerce",
 icon: "Clock",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 deliveryRadiusKm: z.number().optional(),
 estimatedTimeMin: z.string().optional(),
 address: z.string().optional(),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título da Seção", type: "text" },
 { name: "estimatedTimeMin", label: "Tempo Estimado", type: "text" },
 { name: "address", label: "Endereço de Retirada", type: "text" },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "restaurant_hours_delivery",
 content: { title: "Horários de Atendimento & Entrega" },
 },
 },

 table_booking_card: {
 type: "table_booking_card",
 version: "1.0.0",
 name: "Formulário de Reserva de Mesa",
 description: "Agendamento de mesa para restaurantes integrado com WhatsApp",
 category: "commerce",
 icon: "Users",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 subtitle: z.string().optional(),
 whatsappNumber: z.string().optional(),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título do Formulário", type: "text" },
 { name: "subtitle", label: "Subtítulo", type: "text" },
 { name: "whatsappNumber", label: "WhatsApp de Recebimento", type: "text" },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "table_booking_card",
 content: { title: "Reserve sua Mesa", subtitle: "Confirmação instantânea via WhatsApp." },
 },
 },

 shop_the_look_hotspots: {
 type: "shop_the_look_hotspots",
 version: "1.0.0",
 name: "Shop the Look (Hotspots)",
 description: "Foto editorial com pontos interativos para comprar produtos",
 category: "commerce",
 icon: "ShoppingBag",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 subtitle: z.string().optional(),
 lookImageUrl: z.string().url().optional(),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título", type: "text" },
 { name: "subtitle", label: "Subtítulo", type: "text" },
 { name: "lookImageUrl", label: "Imagem do Look", type: "image" },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "shop_the_look_hotspots",
 content: { title: "Shop the Look", subtitle: "Clique nos pontos da foto para ver e comprar cada peça." },
 },
 },

 size_guide_table: {
 type: "size_guide_table",
 version: "1.0.0",
 name: "Guia de Medidas (Tabela)",
 description: "Tabela clara de caimento com medidas de busto, cintura e quadril",
 category: "content",
 icon: "Ruler",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 subtitle: z.string().optional(),
 tip: z.string().optional(),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título", type: "text" },
 { name: "subtitle", label: "Subtítulo", type: "text" },
 { name: "tip", label: "Dica de Medição", type: "text" },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "size_guide_table",
 content: { title: "Guia de Medidas", subtitle: "Encontre o tamanho perfeito para seu caimento ideal." },
 },
 },

 property_features_grid: {
 type: "property_features_grid",
 version: "1.0.0",
 name: "Ficha Técnica do Imóvel",
 description: "Ficha de características (m², dormitórios, suítes, vagas e lazer)",
 category: "content",
 icon: "Home",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 subtitle: z.string().optional(),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título do Imóvel", type: "text" },
 { name: "subtitle", label: "Subtítulo", type: "text" },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "property_features_grid",
 content: { title: "Ficha Técnica do Imóvel", subtitle: "Detalhes estruturais e diferenciais de acabamento." },
 },
 },

 specialist_team_grid: {
 type: "specialist_team_grid",
 version: "1.0.0",
 name: "Corpo Clínico & Equipe",
 description: "Grade de especialistas e médicos com CRM/CRO e botão de agendamento",
 category: "content",
 icon: "UserCheck",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 subtitle: z.string().optional(),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título da Equipe", type: "text" },
 { name: "subtitle", label: "Subtítulo", type: "text" },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "specialist_team_grid",
 content: { title: "Corpo Clínico & Especialistas", subtitle: "Profissionais certificados com vasta experiência." },
 },
 },

 biolink_profile_header: {
 type: "biolink_profile_header",
 version: "1.0.0",
 name: "Perfil de Biolink com Selo",
 description: "Avatar circular com selo verificado, nome, handle e biografia",
 category: "social",
 icon: "User",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 name: z.string().optional(),
 handle: z.string().optional(),
 bio: z.string().optional(),
 isVerified: z.boolean().optional(),
 avatarUrl: z.string().url().optional(),
 }),
 inspector: {
 content: [
 { name: "name", label: "Nome", type: "text" },
 { name: "handle", label: "Handle (@)", type: "text" },
 { name: "bio", label: "Biografia", type: "textarea" },
 { name: "avatarUrl", label: "Foto de Perfil", type: "image" },
 ],
 },
 defaultProps: {
 node_type: "element",
 block_type: "biolink_profile_header",
 content: { name: "Sua Marca & Co.", handle: "@suamarca", isVerified: true },
 },
 },

 biolink_action_buttons: {
 type: "biolink_action_buttons",
 version: "1.0.0",
 name: "Botões de Links em Pílula",
 description: "Lista de botões táteis para links externos e catálogos",
 category: "social",
 icon: "Link",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({}),
 inspector: { content: [] },
 defaultProps: {
 node_type: "element",
 block_type: "biolink_action_buttons",
 content: {},
 },
 },

 biolink_pix_card: {
 type: "biolink_pix_card",
 version: "1.0.0",
 name: "Chave Pix Copia e Cola",
 description: "Card com chave Pix e botão de copiar com 1 clique",
 category: "social",
 icon: "QrCode",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 pixKey: z.string().optional(),
 pixKeyType: z.string().optional(),
 beneficiaryName: z.string().optional(),
 bankName: z.string().optional(),
 }),
 inspector: {
 content: [
 { name: "pixKey", label: "Chave Pix", type: "text" },
 { name: "pixKeyType", label: "Tipo de Chave", type: "text" },
 { name: "beneficiaryName", label: "Nome do Titular", type: "text" },
 { name: "bankName", label: "Instituição Bancária", type: "text" },
 ],
 },
 defaultProps: {
 node_type: "element",
 block_type: "biolink_pix_card",
 content: { pixKey: "contato@suamarca.com.br", pixKeyType: "Chave E-mail", beneficiaryName: "Sua Loja LTDA" },
 },
 },

 location_map_card: {
 type: "location_map_card",
 version: "1.0.0",
 name: "Localização & Endereço com Mapa",
 description: "Endereço físico com horários, telefone e rota no Google Maps",
 category: "content",
 icon: "MapPin",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 address: z.string().optional(),
 cityState: z.string().optional(),
 phone: z.string().optional(),
 workingHours: z.string().optional(),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título", type: "text" },
 { name: "address", label: "Endereço", type: "text" },
 { name: "cityState", label: "Cidade / Estado", type: "text" },
 { name: "phone", label: "Telefone", type: "text" },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "location_map_card",
 content: { title: "Venha nos Visitar", address: "Av. Brasil, 1420 - Centro", cityState: "São Miguel do Oeste - SC" },
 },
 },

 newsletter_capture: {
 type: "newsletter_capture",
 version: "1.0.0",
 name: "Captura de Leads & Novidades",
 description: "Bloco minimalista com campo de e-mail/WhatsApp para captação",
 category: "marketing",
 icon: "Mail",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 subtitle: z.string().optional(),
 placeholder: z.string().optional(),
 buttonLabel: z.string().optional(),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título", type: "text" },
 { name: "subtitle", label: "Subtítulo", type: "text" },
 { name: "placeholder", label: "Texto do Campo", type: "text" },
 ],
 },
 defaultProps: {
 node_type: "element",
 block_type: "newsletter_capture",
 content: { title: "Fique por Dentro dos Lançamentos", subtitle: "Receba novidades exclusivas e cupons de desconto." },
 },
 },


 food_menu_streamlined: {
 type: "food_menu_streamlined",
 version: "1.0.0",
 name: "Cardápio Mobile-First com Barra Flutuante",
 description: "Lista compacta de itens com miniaturas à direita, adição em 1 toque e barra inferior fixa",
 category: "commerce",
 icon: "Utensils",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 storeName: z.string().optional(),
 openingHoursText: z.string().optional(),
 isOpenNow: z.boolean().optional(),
 }),
 inspector: {
 content: [
 { name: "storeName", label: "Nome do Estabelecimento", type: "text" },
 { name: "openingHoursText", label: "Horário de Funcionamento", type: "text" },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "food_menu_streamlined",
 content: { storeName: "Pizzas & Cucina Rocco", openingHoursText: "Aberto hoje das 18:00 às 23:30", isOpenNow: true },
 },
 },

 curated_hits_rail: {
 type: "curated_hits_rail",
 version: "1.0.0",
 name: "Trilho Top Mais Vendidos (Hits)",
 description: "Carrossel de produtos com ranking numérico (#1, #2), badge de desconto e botão rápido",
 category: "commerce",
 icon: "Flame",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 subtitle: z.string().optional(),
 savingsText: z.string().optional(),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título da Seção", type: "text" },
 { name: "subtitle", label: "Subtítulo", type: "text" },
 { name: "savingsText", label: "Texto do Economiômetro", type: "text" },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "curated_hits_rail",
 content: { title: "Top Mais Pedidos da Região", subtitle: "Os favoritos dos clientes.", savingsText: "Economize até 25% este mês." },
 },
 },

 table_order_comanda: {
 type: "table_order_comanda",
 version: "1.0.0",
 name: "Comanda & QR Code de Mesa",
 description: "Cartão de autoatendimento no salão com número de mesa e QR Code para pedidos",
 category: "commerce",
 icon: "QrCode",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 tableNumber: z.string().optional(),
 storeName: z.string().optional(),
 wifiName: z.string().optional(),
 wifiPassword: z.string().optional(),
 }),
 inspector: {
 content: [
 { name: "tableNumber", label: "Número da Mesa / Comanda", type: "text" },
 { name: "storeName", label: "Nome do Restaurante", type: "text" },
 { name: "wifiName", label: "Rede Wi-Fi", type: "text" },
 { name: "wifiPassword", label: "Senha Wi-Fi", type: "text" },
 ],
 },
 defaultProps: {
 node_type: "element",
 block_type: "table_order_comanda",
 content: { tableNumber: "10", storeName: "Pizzas & Cucina Rocco", wifiName: "Rocco_Clientes_5G" },
 },
 },

 // ── Bloco: hero_banner (Alias para hero_carousel) ──
 hero_banner: {
 type: "hero_banner",
 version: "1.0.0",
 name: "Banner Principal (Hero)",
 description: "Banner promocional de abertura com foto, título, subtítulo e botão de chamada",
 category: "commerce",
 icon: "ImageIcon",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 subtitle: z.string().optional(),
 buttonText: z.string().optional(),
 buttonLink: z.string().optional(),
 imageUrl: z.string().optional(),
 autoPlay: z.boolean().optional(),
 interval: z.number().optional(),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título Principal", type: "text" },
 { name: "subtitle", label: "Subtítulo / Descrição", type: "textarea" },
 { name: "imageUrl", label: "Imagem de Fundo / Banner", type: "image" },
 { name: "buttonText", label: "Texto do Botão", type: "text" },
 { name: "buttonLink", label: "Link do Botão", type: "text" },
 { name: "autoPlay", label: "Rotação Automática", type: "boolean" },
 { name: "interval", label: "Intervalo (Segundos)", type: "number" },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "hero_banner",
 content: {
 title: "Nova Coleção de Temporada",
 subtitle: "Descubra as novidades exclusivas que acabaram de chegar na nossa vitrine.",
 buttonText: "Explorar Coleção",
 buttonLink: "#produtos",
 imageUrl: "",
 autoPlay: true,
 interval: 5,
 },
 },
 },



 // ── Bloco: flash_sale_hero ──
 flash_sale_hero: {
 type: "flash_sale_hero",
 version: "1.0.0",
 name: "Oferta Relâmpago com Cronômetro",
 description: "Faixa de urgência com contador regressivo e botão de ação rápida",
 category: "commerce",
 icon: "Flame",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 subtitle: z.string().optional(),
 badge: z.string().optional(),
 discountBadge: z.string().optional(),
 discountPercentage: z.string().optional(),
 couponCode: z.string().optional(),
 buttonText: z.string().optional(),
 targetLink: z.string().optional(),
 targetDate: z.string().optional(),
 bgImageUrl: z.string().optional(),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título da Promoção", type: "text" },
 { name: "subtitle", label: "Descrição da Oferta", type: "textarea" },
 { name: "badge", label: "Badge Superior", type: "text", placeholder: "🔥 Oferta por Tempo Limitado" },
 { name: "discountPercentage", label: "Desconto em Destaque (ex: 50% OFF)", type: "text" },
 { name: "couponCode", label: "Código do Cupom de Desconto", type: "text", placeholder: "RELAMPAGO50" },
 { name: "buttonText", label: "Texto do Botão", type: "text" },
 { name: "targetLink", label: "Link de Destino / Hotpage", type: "text", placeholder: "#produtos ou /campanha" },
 { name: "targetDate", label: "Data Limite (ISO ou YYYY-MM-DD)", type: "text" },
 { name: "bgImageUrl", label: "Imagem de Fundo (Cover)", type: "image" },
 ],
 design: [
 { name: "backgroundColor", label: "Cor de Fundo da Seção", type: "color" },
 { name: "textColor", label: "Cor do Texto", type: "color" },
 { name: "accentColor", label: "Cor de Destaque / Cupom", type: "color" },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "flash_sale_hero",
 content: {
 title: "Queima de Estoque Exclusiva",
 subtitle: "Descontos especiais válidos apenas enquanto durarem os estoques promocionais.",
 badge: "🔥 Oferta por Tempo Limitado",
 discountPercentage: "50% OFF",
 couponCode: "RELAMPAGO50",
 buttonText: "Garantir Ofertas com Desconto",
 targetLink: "#produtos",
 targetDate: "2026-12-31T23:59:59",
 bgImageUrl: "",
 },
 design_tokens: {
 backgroundColor: "#09090b",
 textColor: "#ffffff",
 accentColor: "#f59e0b",
 },
 },
 },

 // ── Bloco: service_pricing_table ──
 service_pricing_table: {
 type: "service_pricing_table",
 version: "1.0.0",
 name: "Tabela de Preços & Planos",
 description: "Comparativo de planos, serviços ou passes com lista de benefícios e botão de contratação",
 category: "commerce",
 icon: "CreditCard",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 subtitle: z.string().optional(),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título da Tabela", type: "text" },
 { name: "subtitle", label: "Subtítulo explicativo", type: "textarea" },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "service_pricing_table",
 content: {
 title: "Planos & Assinaturas Sob Medida",
 subtitle: "Escolha a melhor opção para sua rotina e economize com pacotes recorrentes.",
 },
 },
 },

 // ── Bloco: category_cards_grid ──
 category_cards_grid: {
 type: "category_cards_grid",
 version: "1.0.0",
 name: "Grade de Categorias",
 description: "Cards visuais com foto e nome das principais categorias da loja",
 category: "commerce",
 icon: "Grid",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 subtitle: z.string().optional(),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título da Grade", type: "text" },
 { name: "subtitle", label: "Subtítulo", type: "text" },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "category_cards_grid",
 content: {
 title: "Navegue por Categorias",
 subtitle: "Encontre exatamente o que você procura.",
 },
 },
 },

 // ── Bloco: featured_collection_banner ──
 featured_collection_banner: {
 type: "featured_collection_banner",
 version: "1.0.0",
 name: "Banner de Coleção em Destaque",
 description: "Chamada em split com foto grande, texto institucional e botão direto para coleção",
 category: "commerce",
 icon: "Layers",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 subtitle: z.string().optional(),
 buttonText: z.string().optional(),
 buttonLink: z.string().optional(),
 imageUrl: z.string().optional(),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título da Coleção", type: "text" },
 { name: "subtitle", label: "Descrição / Manifesto", type: "textarea" },
 { name: "buttonText", label: "Texto do Botão", type: "text" },
 { name: "buttonLink", label: "Link da Coleção", type: "text" },
 { name: "imageUrl", label: "Imagem de Destaque", type: "image" },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "featured_collection_banner",
 content: {
 title: "Coleção Essentials 2026",
 subtitle: "Peças atemporais desenvolvidas com matérias-primas nobres para durar gerações.",
 buttonText: "Ver Todos os Produtos",
 buttonLink: "#colecao",
 imageUrl: "",
 },
 },
 },


 // ── Bloco: tourism_itinerary_timeline ──
 tourism_itinerary_timeline: {
 type: "tourism_itinerary_timeline",
 version: "1.0.0",
 name: "Roteiro Dia a Dia (Timeline)",
 description: "Linha do tempo com programação detalhada do roteiro da viagem",
 category: "content",
 icon: "Calendar",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 subtitle: z.string().optional(),
 events: z.array(z.any()).optional(),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título do Roteiro", type: "text" },
 { name: "subtitle", label: "Subtítulo", type: "textarea" },
 {
 name: "events",
 label: "Dias da Programação",
 type: "array",
 arrayFields: [
 { name: "year", label: "Dia / Período (ex: Dia 1)", type: "text" },
 { name: "title", label: "Título da Atividade", type: "text" },
 { name: "description", label: "Detalhes do Passeio", type: "textarea" },
 ],
 },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "tourism_itinerary_timeline",
 content: {
 title: "Roteiro Completo da Viagem",
 subtitle: "Confira o que preparamos dia a dia para você.",
 events: [
 { year: "Dia 1", title: "Embarque e Check-in", description: "Recepção no hotel e noite livre." },
 { year: "Dia 2", title: "City Tour Histórico", description: "Visita aos principais pontos com guia." },
 ],
 },
 },
 },

 // ── Bloco: tourism_quote_hero ──
 tourism_quote_hero: {
 type: "tourism_quote_hero",
 version: "1.0.0",
 name: "Cotação de Viagem & Leads (Hero)",
 description: "Banner de alto impacto com formulário de solicitação de cotação integrado ao CRM e WhatsApp",
 category: "content",
 icon: "Plane",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 subtitle: z.string().optional(),
 badge: z.string().optional(),
 bgImageUrl: z.string().optional(),
 whatsappPhone: z.string().optional(),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título Principal", type: "text" },
 { name: "subtitle", label: "Subtítulo / Proposta de Valor", type: "textarea" },
 { name: "badge", label: "Etiqueta / Badge", type: "text" },
 { name: "bgImageUrl", label: "Foto Panorâmica de Fundo", type: "image" },
 { name: "whatsappPhone", label: "WhatsApp da Agência", type: "text" },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "tourism_quote_hero",
 content: {
 title: "Sua Próxima Viagem Inesquecível Começa Aqui",
 subtitle: "Roteiros exclusivos, cruzeiros, passagens aéreas e pacotes completos com assessoria VIP.",
 badge: "✈️ Agência Boutique de Turismo",
 bgImageUrl: "",
 whatsappPhone: "",
 },
 },
 },

 // ── Bloco: tourism_services_grid ──
 tourism_services_grid: {
 type: "tourism_services_grid",
 version: "1.0.0",
 name: "Especialidades & Serviços de Turismo",
 description: "Grade de serviços com assessoria completa (Voos, Hotéis, Cruzeiros, Seguro e Suporte 24h)",
 category: "content",
 icon: "Suitcase",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 subtitle: z.string().optional(),
 whatsappPhone: z.string().optional(),
 services: z.array(z.any()).optional(),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título da Seção", type: "text" },
 { name: "subtitle", label: "Subtítulo", type: "textarea" },
 { name: "whatsappPhone", label: "WhatsApp de Atendimento", type: "text" },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "tourism_services_grid",
 content: {
 title: "Nossas Especialidades em Turismo",
 subtitle: "Assessoria completa para que sua única preocupação seja fazer as malas.",
 services: [
 { title: "Passagens Aéreas", desc: "Tarifas acordadas e emissão com milhas nas melhores companhias." },
 { title: "Hotéis & Resorts", desc: "Hospedagens selecionadas a dedo com upgrade e café incluso." },
 { title: "Cruzeiros Marítimos", desc: "Navios nacionais e internacionais com tudo incluso a bordo." },
 { title: "Seguro Viagem Global", desc: "Assistência médica completa e cobertura de bagagem 24 horas." },
 ],
 },
 },
 },

 // ── Bloco: tourism_destinations_carousel ──
 tourism_destinations_carousel: {
 type: "tourism_destinations_carousel",
 version: "1.0.0",
 name: "Carrossel de Destinos Turísticos",
 description: "Vitrine dinâmica conectada em tempo real ao banco de destinos turísticos, cidades e pacotes",
 category: "commerce",
 icon: "MapPin",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: "none",
 contentSchema: z.object({
 title: z.string().optional(),
 subtitle: z.string().optional(),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título da Vitrine", type: "text" },
 { name: "subtitle", label: "Subtítulo", type: "textarea" },
 ],
 },
 defaultProps: {
 node_type: "composition",
 block_type: "tourism_destinations_carousel",
 content: {
 title: "Destinos Populares em Destaque",
 subtitle: "Pacotes completos com voos, hospedagem e assessoria personalizada.",
 },
 },
 },


 portal_contracts: {
 type: "portal_contracts",
 version: "1.0.0",
 name: "Contratos do Cliente 360",
 description: "Exibição de contratos ativos, download em PDF e assinatura digital",
 category: "content",
 icon: "FileText",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: [],
 contentSchema: z.object({
 title: z.string().default("Meus Contratos & Documentos"),
 subtitle: z.string().default("Gerencie suas minutas jurídicas e termos assinados."),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título Principal", type: "text" },
 { name: "subtitle", label: "Subtítulo / Descrição", type: "text" },
 ],
 },
 defaultProps: {
 node_type: "block",
 block_type: "portal_contracts",
 content: {
 title: "Meus Contratos & Documentos",
 subtitle: "Gerencie suas minutas jurídicas e termos assinados.",
 },
 design_tokens: {},
 layout_rules: {},
 },
 },

 portal_carnes_bills: {
 type: "portal_carnes_bills",
 version: "1.0.0",
 name: "Carnê Digital & Parcelas PIX",
 description: "Gestão de parcelas, faturas e pagamento instantâneo por PIX Copia e Cola",
 category: "content",
 icon: "QrCode",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: [],
 contentSchema: z.object({
 title: z.string().default("Carnê Digital & Parcelas"),
 subtitle: z.string().default("Consulte faturas em aberto e pague com PIX sem taxas."),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título Principal", type: "text" },
 { name: "subtitle", label: "Subtítulo", type: "text" },
 ],
 },
 defaultProps: {
 node_type: "block",
 block_type: "portal_carnes_bills",
 content: {
 title: "Carnê Digital & Parcelas",
 subtitle: "Consulte faturas em aberto e pague com PIX sem taxas.",
 },
 design_tokens: {},
 layout_rules: {},
 },
 },

 portal_appointments: {
 type: "portal_appointments",
 version: "1.0.0",
 name: "Agendamentos & Linha do Tempo",
 description: "Acompanhamento de horários, revisões e ordens de serviço",
 category: "content",
 icon: "Calendar",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: [],
 contentSchema: z.object({
 title: z.string().default("Meus Agendamentos & Serviços"),
 subtitle: z.string().default("Acompanhe seus horários e serviços marcados."),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título", type: "text" },
 { name: "subtitle", label: "Subtítulo", type: "text" },
 ],
 },
 defaultProps: {
 node_type: "block",
 block_type: "portal_appointments",
 content: {
 title: "Meus Agendamentos & Serviços",
 subtitle: "Acompanhe seus horários e serviços marcados.",
 },
 design_tokens: {},
 layout_rules: {},
 },
 },

 portal_orders_rentals: {
 type: "portal_orders_rentals",
 version: "1.0.0",
 name: "Compras, Aluguéis & Devoluções",
 description: "Histórico de pedidos, produtos locados e solicitações de troca",
 category: "content",
 icon: "Package",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: [],
 contentSchema: z.object({
 title: z.string().default("Compras, Aluguéis & Devoluções"),
 subtitle: z.string().default("Histórico detalhado de compras e locações ativas."),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título", type: "text" },
 { name: "subtitle", label: "Subtítulo", type: "text" },
 ],
 },
 defaultProps: {
 node_type: "block",
 block_type: "portal_orders_rentals",
 content: {
 title: "Compras, Aluguéis & Devoluções",
 subtitle: "Histórico detalhado de compras e locações ativas.",
 },
 design_tokens: {},
 layout_rules: {},
 },
 },

 careers_hero_banner: {
 type: "careers_hero_banner",
 version: "1.0.0",
 name: "Hero do Portal de Carreiras",
 description: "Apresentação da cultura, equipe e proposta de valor do colaborador",
 category: "content",
 icon: "Briefcase",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: [],
 contentSchema: z.object({
 title: z.string().default("Construa o Futuro Junto Conosco"),
 subtitle: z.string().default("Conheça nossas oportunidades em aberto."),
 company_name: z.string().optional(),
 }),
 inspector: {
 content: [
 { name: "title", label: "Título Principal", type: "text" },
 { name: "subtitle", label: "Subtítulo", type: "text" },
 { name: "company_name", label: "Nome da Empresa", type: "text" },
 ],
 },
 defaultProps: {
 node_type: "block",
 block_type: "careers_hero_banner",
 content: {
 title: "Construa o Futuro Junto Conosco",
 subtitle: "Conheça nossas oportunidades em aberto.",
 },
 design_tokens: {},
 layout_rules: {},
 },
 },

 careers_job_filters: {
 type: "careers_job_filters",
 version: "1.0.0",
 name: "Filtros de Vagas de Emprego",
 description: "Filtros rápidos por setor, modalidade e busca textual",
 category: "content",
 icon: "Filter",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: [],
 contentSchema: z.object({}),
 inspector: { content: [] },
 defaultProps: {
 node_type: "block",
 block_type: "careers_job_filters",
 content: {},
 design_tokens: {},
 layout_rules: {},
 },
 },

 careers_job_grid: {
 type: "careers_job_grid",
 version: "1.0.0",
 name: "Grade de Vagas de Emprego",
 description: "Lista de vagas abertas com badges e modal de candidatura integrado ao RH",
 category: "content",
 icon: "Briefcase",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: [],
 contentSchema: z.object({}),
 inspector: { content: [] },
 defaultProps: {
 node_type: "block",
 block_type: "careers_job_grid",
 content: {},
 design_tokens: {},
 layout_rules: {},
 },
 },

 reputation_score_header: {
 type: "reputation_score_header",
 version: "1.0.0",
 name: "Score de Reputação & Confiança",
 description: "Nota geral de 0 a 10, índices de resolução e botão de abertura de chamado",
 category: "content",
 icon: "ShieldCheck",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: [],
 contentSchema: z.object({
 company_name: z.string().default("Nome da Empresa"),
 reputation_score: z.number().default(9.2),
 }),
 inspector: {
 content: [
 { name: "company_name", label: "Nome da Empresa", type: "text" },
 ],
 },
 defaultProps: {
 node_type: "block",
 block_type: "reputation_score_header",
 content: {
 company_name: "Nome da Empresa",
 reputation_score: 9.2,
 },
 design_tokens: {},
 layout_rules: {},
 },
 },

 reputation_badges_strip: {
 type: "reputation_badges_strip",
 version: "1.0.0",
 name: "Faixa de Selos Auditados",
 description: "Selos de certificação, RA1000 e atendimento humanizado",
 category: "content",
 icon: "Award",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: [],
 contentSchema: z.object({}),
 inspector: { content: [] },
 defaultProps: {
 node_type: "block",
 block_type: "reputation_badges_strip",
 content: {},
 design_tokens: {},
 layout_rules: {},
 },
 },

 office_contract_viewer: {
 type: "office_contract_viewer",
 version: "1.0.0",
 name: "Visualizador & Assinador de Contratos",
 description: "Contrato digital inteligente com tags dinâmicas e assinatura MP 2.200-2/2001",
 category: "content",
 icon: "FileCheck",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: [],
 contentSchema: z.object({}),
 inspector: { content: [] },
 defaultProps: {
 node_type: "block",
 block_type: "office_contract_viewer",
 content: {
 title: "Contrato de Prestação de Serviços",
 documentNumber: "CTR-2026-0042",
 status: "pending",
 },
 design_tokens: {},
 layout_rules: {},
 },
 },

 reputation_timeline_feed: {
 type: "reputation_timeline_feed",
 version: "1.0.0",
 name: "Feed Público de Manifestações",
 description: "Timeline de reclamações auditadas com respostas oficiais e avaliações",
 category: "content",
 icon: "MessageSquare",
 allowedBuilderProfiles: "all",
 allowedParentTypes: ["container", "section"],
 allowedChildTypes: [],
 contentSchema: z.object({}),
 inspector: { content: [] },
 defaultProps: {
 node_type: "block",
 block_type: "reputation_timeline_feed",
 content: {},
 design_tokens: {},
 layout_rules: {},
 },
 },
};

export const BUILDER_BLOCK_DEFINITIONS = Object.values(builderRegistry);
