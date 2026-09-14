import type { ExperienceNode } from "./builder-types";

export interface HomeTemplatePreset {
 id: string;
 slug: string;
 name: string;
 category: "fashion" | "beauty" | "conversion" | "general" | "storytelling";
 description: string;
 thumbnail: string | null;
 tags: string[];
 nodesFactory: (uuid: () => string) => Partial<ExperienceNode>[];
}

export const HOME_TEMPLATES_LIBRARY: Record<string, HomeTemplatePreset> = {
 fashion_editorial: {
 id: "fashion_editorial",
 slug: "fashion-editorial",
 name: "Fashion Editorial",
 category: "fashion",
 description:
 "Design de alta moda com Hero Split, Shop The Look interativo, Bento Grid e feed de fotos.",
 thumbnail:
 null,
 tags: ["Moda", "Editorial", "Shop The Look", "Bento Grid"],
 nodesFactory: (uid) => {
 const s1 = uid();
 const c1 = uid();
 const s2 = uid();
 const c2 = uid();
 const s3 = uid();
 const c3 = uid();
 const s4 = uid();
 const c4 = uid();

 return [
 {
 id: s1,
 node_type: "section",
 block_type: "section",
 parent_id: null,
 sort_order: 0,
 design_tokens: { backgroundColor: "#0f172a", textColor: "#ffffff" },
 },
 {
 id: c1,
 node_type: "container",
 block_type: "container",
 parent_id: s1,
 sort_order: 0,
 layout_rules: {
 maxWidth: "full",
 display: "flex",
 flexDirection: "col",
 gap: "none",
 paddingX: "none",
 paddingY: "none",
 },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "hero_carousel",
 parent_id: c1,
 sort_order: 0,
 content: {
 autoPlay: true,
 interval: 6,
 showOverlay: true,
 overlayOpacity: "dark",
 desktopHeight: "proportional",
 banners: [
 {
 title: "Coleção Outono/Inverno High Style",
 image_url:
 null,
 link: "/produtos",
 },
 {
 title: "Tendências Urbanas Exclusivas",
 image_url:
 null,
 link: "/produtos",
 },
 ],
 },
 },

 {
 id: s2,
 node_type: "section",
 block_type: "section",
 parent_id: null,
 sort_order: 1,
 },
 {
 id: c2,
 node_type: "container",
 block_type: "container",
 parent_id: s2,
 sort_order: 0,
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "xl",
 paddingX: "md",
 paddingY: "2xl",
 },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "image_hotspots",
 parent_id: c2,
 sort_order: 0,
 content: {
 title: "Shop The Look — Outono",
 subtitle: "Clique nas marcações da imagem para comprar a combinação completa",
 image_url:
 null,
 hotspots: [
 {
 id: "h1",
 xPercent: 42,
 yPercent: 32,
 title: "Jaqueta Couro Premium",
 product_slug: "",
 },
 { id: "h2", xPercent: 60, yPercent: 78, title: "Bota Urban High", product_slug: "" },
 ],
 },
 },

 {
 id: s3,
 node_type: "section",
 block_type: "section",
 parent_id: null,
 sort_order: 2,
 },
 {
 id: c3,
 node_type: "container",
 block_type: "container",
 parent_id: s3,
 sort_order: 0,
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "lg",
 paddingX: "md",
 paddingY: "xl",
 },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "product_rail",
 parent_id: c3,
 sort_order: 0,
 content: {
 title: "Destaques da Passarela",
 layout: "carousel",
 itemsPerRowDesktop: "4",
 itemsPerRowMobile: "2",
 freeScroll: true,
 },
 data_bindings: { source: "latest_products" },
 },

 {
 id: s4,
 node_type: "section",
 block_type: "section",
 parent_id: null,
 sort_order: 3,
 },
 {
 id: c4,
 node_type: "container",
 block_type: "container",
 parent_id: s4,
 sort_order: 0,
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "lg",
 paddingX: "md",
 paddingY: "xl",
 },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "social_grid",
 parent_id: c4,
 sort_order: 0,
 content: { title: "Galeria de Estilo", handle: "@waesy_oficial", images: [] },
 },
 ];
 },
 },

 beauty_botanical: {
 id: "beauty_botanical",
 slug: "beauty-botanical",
 name: "Beauty Botanical",
 category: "beauty",
 description:
 "Ideal para cosméticos, produtos naturais e cuidados pessoais, com rotina em passos, ingredientes e antes/depois.",
 thumbnail:
 null,
 tags: ["Beleza", "Cosméticos", "Rotina", "Antes/Depois"],
 nodesFactory: (uid) => {
 const s1 = uid();
 const c1 = uid();
 const s2 = uid();
 const c2 = uid();
 const s3 = uid();
 const c3 = uid();
 const s4 = uid();
 const c4 = uid();

 return [
 {
 id: s1,
 node_type: "section",
 block_type: "section",
 parent_id: null,
 sort_order: 0,
 design_tokens: { backgroundColor: "#fdfbf7" },
 },
 {
 id: c1,
 node_type: "container",
 block_type: "container",
 parent_id: s1,
 sort_order: 0,
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "xl",
 paddingX: "md",
 paddingY: "2xl",
 },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "split_banner",
 parent_id: c1,
 sort_order: 0,
 content: {
 title: "Beleza Natural & Botânica",
 description:
 "Fórmulas dermatologicamente testadas, veganas e livres de crueldade animal.",
 button_text: "Conhecer Linha",
 image_url:
 null,
 image_position: "right",
 },
 },

 {
 id: s2,
 node_type: "section",
 block_type: "section",
 parent_id: null,
 sort_order: 1,
 },
 {
 id: c2,
 node_type: "container",
 block_type: "container",
 parent_id: s2,
 sort_order: 0,
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "xl",
 paddingX: "md",
 paddingY: "2xl",
 },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "routine_steps",
 parent_id: c2,
 sort_order: 0,
 content: {
 title: "Sua Rotina de Skincare em 3 Passos",
 subtitle: "Resultados visíveis em poucas semanas de uso contínuo",
 steps: [
 {
 step_number: 1,
 title: "Higienização Suave",
 description: "Espuma de limpeza com extrato de chá verde.",
 },
 {
 step_number: 2,
 title: "Sérum Hidratante",
 description: "Ácido hialurônico de alta absorção.",
 },
 {
 step_number: 3,
 title: "Selagem Protetora",
 description: "Creme restaurador de barreira cutânea.",
 },
 ],
 },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "ingredient_spotlight",
 parent_id: c2,
 sort_order: 1,
 content: {
 title: "Ativos & Ingredientes Selecionados",
 subtitle: "Conheça o que torna nossa fórmula única",
 items: [
 {
 title: "Niacinamida 5%",
 benefit: "Uniformiza a textura",
 description: "Reduz a aparência de poros e controla a oleosidade excessiva.",
 },
 {
 title: "Esqualano Botânico",
 benefit: "Hidratação Profunda",
 description: "Restaura a maciez sem obstruir os poros.",
 },
 ],
 },
 },

 {
 id: s3,
 node_type: "section",
 block_type: "section",
 parent_id: null,
 sort_order: 2,
 },
 {
 id: c3,
 node_type: "container",
 block_type: "container",
 parent_id: s3,
 sort_order: 0,
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "lg",
 paddingX: "md",
 paddingY: "xl",
 },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "before_after_slider",
 parent_id: c3,
 sort_order: 0,
 content: {
 title: "Resultados Comprovados",
 subtitle: "Arraste para comparar o efeito após 14 dias de uso diário",
 before_image:
 null,
 after_image:
 null,
 before_label: "Dia 1",
 after_label: "Dia 14",
 },
 },

 {
 id: s4,
 node_type: "section",
 block_type: "section",
 parent_id: null,
 sort_order: 3,
 },
 {
 id: c4,
 node_type: "container",
 block_type: "container",
 parent_id: s4,
 sort_order: 0,
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "lg",
 paddingX: "md",
 paddingY: "xl",
 },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "testimonial_carousel",
 parent_id: c4,
 sort_order: 0,
 content: { title: "Avaliações de Quem Usa" },
 data_bindings: { source: "dynamic_reviews" },
 },
 ];
 },
 },

 high_conversion_landing: {
 id: "high_conversion_landing",
 slug: "high-conversion-landing",
 name: "High Conversion Offer",
 category: "conversion",
 description: "Foco total em vendas diretas, ofertas com temporizador, prova social e escassez.",
 thumbnail:
 null,
 tags: ["Oferta", "Conversão", "Countdown", "Garantia"],
 nodesFactory: (uid) => {
 const s1 = uid();
 const c1 = uid();
 const s2 = uid();
 const c2 = uid();
 const s3 = uid();
 const c3 = uid();

 return [
 {
 id: s1,
 node_type: "section",
 block_type: "section",
 parent_id: null,
 sort_order: 0,
 design_tokens: { backgroundColor: "#1e1b4b", textColor: "#ffffff" },
 },
 {
 id: c1,
 node_type: "container",
 block_type: "container",
 parent_id: s1,
 sort_order: 0,
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "lg",
 paddingX: "md",
 paddingY: "xl",
 },
 },
 {
 id: uid(),
 node_type: "element",
 block_type: "announcement_bar",
 parent_id: c1,
 sort_order: 0,
 content: {
 text: "⚡ OFERTA LIMITADA: Até 40% OFF + Frete Grátis nas próximas horas!",
 bg_color: "#ef4444",
 text_color: "#ffffff",
 },
 },
 {
 id: uid(),
 node_type: "element",
 block_type: "countdown_timer",
 parent_id: c1,
 sort_order: 1,
 content: {
 target_date: new Date(Date.now() + 86400000).toISOString(),
 title: "A promoção encerra em:",
 },
 },

 {
 id: s2,
 node_type: "section",
 block_type: "section",
 parent_id: null,
 sort_order: 1,
 },
 {
 id: c2,
 node_type: "container",
 block_type: "container",
 parent_id: s2,
 sort_order: 0,
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "xl",
 paddingX: "md",
 paddingY: "2xl",
 },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "product_grid",
 parent_id: c2,
 sort_order: 0,
 content: {
 title: "Produtos em Promoção Relâmpago",
 subtitle: "Garanta o seu antes que o estoque acabe",
 },
 data_bindings: { source: "latest_products" },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "trust_badges",
 parent_id: c2,
 sort_order: 1,
 content: { badges: [] },
 },

 {
 id: s3,
 node_type: "section",
 block_type: "section",
 parent_id: null,
 sort_order: 2,
 },
 {
 id: c3,
 node_type: "container",
 block_type: "container",
 parent_id: s3,
 sort_order: 0,
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "lg",
 paddingX: "md",
 paddingY: "xl",
 },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "faq_accordion",
 parent_id: c3,
 sort_order: 0,
 content: { title: "Dúvidas Frequentes sobre a Entrega e Garantia" },
 },
 ];
 },
 },

 streetwear_dark: {
 id: "streetwear_dark",
 slug: "streetwear-dark",
 name: "Streetwear Dark",
 category: "fashion",
 description:
 "Visual moderno dark mode com carrosséis cinematográficos e bento grids para marcas urbanas.",
 thumbnail:
 null,
 tags: ["Dark Mode", "Streetwear", "Bento Grid", "Urbano"],
 nodesFactory: (uid) => {
 const s1 = uid();
 const c1 = uid();
 const s2 = uid();
 const c2 = uid();

 return [
 {
 id: s1,
 node_type: "section",
 block_type: "section",
 parent_id: null,
 sort_order: 0,
 design_tokens: { backgroundColor: "#000000", textColor: "#ffffff" },
 },
 {
 id: c1,
 node_type: "container",
 block_type: "container",
 parent_id: s1,
 sort_order: 0,
 layout_rules: {
 maxWidth: "full",
 display: "flex",
 flexDirection: "col",
 gap: "none",
 paddingX: "none",
 paddingY: "none",
 },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "hero_carousel",
 parent_id: c1,
 sort_order: 0,
 content: {
 autoPlay: true,
 interval: 5,
 showOverlay: true,
 overlayOpacity: "dark",
 desktopHeight: "full",
 banners: [
 {
 title: "STREET DROP 01",
 image_url:
 null,
 link: "/produtos",
 },
 ],
 },
 },

 {
 id: s2,
 node_type: "section",
 block_type: "section",
 parent_id: null,
 sort_order: 1,
 design_tokens: { backgroundColor: "#09090b", textColor: "#ffffff" },
 },
 {
 id: c2,
 node_type: "container",
 block_type: "container",
 parent_id: s2,
 sort_order: 0,
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "xl",
 paddingX: "md",
 paddingY: "2xl",
 },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "bento_grid",
 parent_id: c2,
 sort_order: 0,
 content: { title: "Categorias em Destaque", items: [] },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "product_rail",
 parent_id: c2,
 sort_order: 1,
 content: { title: "Destaques Urbanos" },
 data_bindings: { source: "latest_products" },
 },
 ];
 },
 },

 classic_commerce: {
 id: "classic_commerce",
 slug: "classic-commerce",
 name: "Classic Commerce",
 category: "general",
 description:
 "Estrutura tradicional completa com banner rotativo, categorias, ofertas e depoimentos.",
 thumbnail:
 null,
 tags: ["Clássico", "Vitrines", "Confiança", "Versátil"],
 nodesFactory: (uid) => {
 const s1 = uid();
 const c1 = uid();
 const s2 = uid();
 const c2 = uid();
 const s3 = uid();
 const c3 = uid();

 return [
 {
 id: s1,
 node_type: "section",
 block_type: "section",
 parent_id: null,
 sort_order: 0,
 },
 {
 id: c1,
 node_type: "container",
 block_type: "container",
 parent_id: s1,
 sort_order: 0,
 layout_rules: {
 maxWidth: "full",
 display: "flex",
 flexDirection: "col",
 gap: "none",
 paddingX: "none",
 paddingY: "none",
 },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "hero_carousel",
 parent_id: c1,
 sort_order: 0,
 content: {
 autoPlay: true,
 interval: 5,
 banners: [
 {
 title: "Confira Nossas Novidades",
 image_url:
 null,
 link: "/produtos",
 },
 ],
 },
 },

 {
 id: s2,
 node_type: "section",
 block_type: "section",
 parent_id: null,
 sort_order: 1,
 },
 {
 id: c2,
 node_type: "container",
 block_type: "container",
 parent_id: s2,
 sort_order: 0,
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "xl",
 paddingX: "md",
 paddingY: "2xl",
 },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "stories_ring",
 parent_id: c2,
 sort_order: 0,
 content: { stories: [] },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "product_rail",
 parent_id: c2,
 sort_order: 1,
 content: { title: "Lançamentos da Loja" },
 data_bindings: { source: "latest_products" },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "trust_badges",
 parent_id: c2,
 sort_order: 2,
 content: { badges: [] },
 },

 {
 id: s3,
 node_type: "section",
 block_type: "section",
 parent_id: null,
 sort_order: 2,
 },
 {
 id: c3,
 node_type: "container",
 block_type: "container",
 parent_id: s3,
 sort_order: 0,
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "lg",
 paddingX: "md",
 paddingY: "xl",
 },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "testimonial_carousel",
 parent_id: c3,
 sort_order: 0,
 content: { title: "O que Nossos Clientes Dizem" },
 data_bindings: { source: "dynamic_reviews" },
 },
 ];
 },
 },

 biolink_linktree: {
 id: "biolink_linktree",
 slug: "biolink-linktree",
 name: "Biolink & Cartaz Interativo (Linktree)",
 category: "conversion",
 description:
 "Layout vertical otimizado para celulares com botões de ação direta, WhatsApp, carrossel de produtos e horários.",
 thumbnail:
 null,
 tags: ["Biolink", "Linktree", "WhatsApp", "Mobile", "Conversão"],
 nodesFactory: (uid) => {
 const s1 = uid();
 const c1 = uid();

 return [
 {
 id: s1,
 node_type: "section",
 block_type: "section",
 parent_id: null,
 sort_order: 0,
 design_tokens: {
 backgroundColor: "var(--background)",
 textColor: "var(--foreground)",
 },
 },
 {
 id: c1,
 node_type: "container",
 block_type: "container",
 parent_id: s1,
 sort_order: 0,
 layout_rules: {
 maxWidth: "md",
 display: "flex",
 flexDirection: "col",
 gap: "md",
 paddingX: "md",
 paddingY: "xl",
 },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "stories_ring",
 parent_id: c1,
 sort_order: 0,
 content: { title: "Destaques Recentes" },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "product_rail",
 parent_id: c1,
 sort_order: 1,
 content: { title: "Mais Vendidos & Ofertas" },
 data_bindings: { source: "top_sellers" },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "trust_badges",
 parent_id: c1,
 sort_order: 2,
 content: {
 title: "Atendimento & Localização",
 badges: [],
 },
 },
 ];
 },
 },
 retail_omnichannel: {
 id: "retail_omnichannel",
 slug: "retail-omnichannel",
 name: "Varejo & E-commerce Omnichannel",
 category: "conversion",
 description: "Vitrine de alta conversão para moda e varejo com carrossel hero, rail de produtos e trust badges.",
 thumbnail: null,
 tags: ["Varejo", "E-commerce", "Ofertas", "Conversão"],
 nodesFactory: (uid) => {
 const s1 = uid(); const c1 = uid();
 const s2 = uid(); const c2 = uid();
 return [
 { id: s1, node_type: "section", block_type: "section", parent_id: null, sort_order: 0 },
 { id: c1, node_type: "container", block_type: "container", parent_id: s1, sort_order: 0 },
 { id: uid(), node_type: "composition", block_type: "hero_carousel", parent_id: c1, sort_order: 0, content: { title: "Super Liquidação de Coleção" } },
 { id: s2, node_type: "section", block_type: "section", parent_id: null, sort_order: 1 },
 { id: c2, node_type: "container", block_type: "container", parent_id: s2, sort_order: 0 },
 { id: uid(), node_type: "composition", block_type: "product_rail", parent_id: c2, sort_order: 0, content: { title: "Mais Vendidos da Loja" }, data_bindings: { source: "top_sellers" } },
 ];
 },
 },

 tourism_travel_agency: {
 id: "tourism_travel_agency",
 slug: "tourism-travel-agency",
 name: "Turismo & Agência de Viagens",
 category: "storytelling",
 description: "Portal completo de viagens com pacotes, itinerários, cotação instantânea e avaliações de viajantes.",
 thumbnail: null,
 tags: ["Turismo", "Viagens", "Pacotes", "Roteiros"],
 nodesFactory: (uid) => {
 const s1 = uid(); const c1 = uid();
 return [
 { id: s1, node_type: "section", block_type: "section", parent_id: null, sort_order: 0 },
 { id: c1, node_type: "container", block_type: "container", parent_id: s1, sort_order: 0 },
 { id: uid(), node_type: "composition", block_type: "hero_carousel", parent_id: c1, sort_order: 0, content: { title: "Descubra o Mundo dos Seus Sonhos" } },
 { id: uid(), node_type: "composition", block_type: "bento_grid", parent_id: c1, sort_order: 1, content: { title: "Destinos em Alta" } },
 ];
 },
 },

 gastronomy_restaurant: {
 id: "gastronomy_restaurant",
 slug: "gastronomy-restaurant",
 name: "Gastronomia & Restaurantes",
 category: "conversion",
 description: "Cardápio digital moderno, pratos do chef, reserva de mesas e pedidos para entrega.",
 thumbnail: null,
 tags: ["Gastronomia", "Restaurante", "Cardápio", "Delivery"],
 nodesFactory: (uid) => {
 const s1 = uid(); const c1 = uid();
 return [
 { id: s1, node_type: "section", block_type: "section", parent_id: null, sort_order: 0 },
 { id: c1, node_type: "container", block_type: "container", parent_id: s1, sort_order: 0 },
 { id: uid(), node_type: "composition", block_type: "hero_carousel", parent_id: c1, sort_order: 0, content: { title: "Culinária Autoral & Sabores Inesquecíveis" } },
 { id: uid(), node_type: "composition", block_type: "bento_grid", parent_id: c1, sort_order: 1, content: { title: "Especialidades da Casa" } },
 ];
 },
 },

 corporate_services: {
 id: "corporate_services",
 slug: "corporate-services",
 name: "Serviços & Consultoria Corporativa",
 category: "general",
 description: "Apresentação de planos, agendamento de reuniões, equipe de consultores e FAQ institucional.",
 thumbnail: null,
 tags: ["Serviços", "Consultoria", "B2B", "Corporativo"],
 nodesFactory: (uid) => {
 const s1 = uid(); const c1 = uid();
 return [
 { id: s1, node_type: "section", block_type: "section", parent_id: null, sort_order: 0 },
 { id: c1, node_type: "container", block_type: "container", parent_id: s1, sort_order: 0 },
 { id: uid(), node_type: "composition", block_type: "hero_carousel", parent_id: c1, sort_order: 0, content: { title: "Soluções Estratégicas para o seu Negócio" } },
 { id: uid(), node_type: "composition", block_type: "trust_badges", parent_id: c1, sort_order: 1, content: { title: "Nossos Pilares de Excelência" } },
 ];
 },
 },

 real_estate_luxury: {
 id: "real_estate_luxury",
 slug: "real-estate-luxury",
 name: "Imobiliário & Alto Padrão",
 category: "fashion",
 description: "Catálogo refinado de imóveis, busca inteligente por filtros, tour virtual e contato com corretores.",
 thumbnail: null,
 tags: ["Imobiliário", "Alto Padrão", "Imóveis", "Casas"],
 nodesFactory: (uid) => {
 const s1 = uid(); const c1 = uid();
 return [
 { id: s1, node_type: "section", block_type: "section", parent_id: null, sort_order: 0 },
 { id: c1, node_type: "container", block_type: "container", parent_id: s1, sort_order: 0 },
 { id: uid(), node_type: "composition", block_type: "hero_carousel", parent_id: c1, sort_order: 0, content: { title: "O Seu Próximo Lar de Luxo" } },
 { id: uid(), node_type: "composition", block_type: "bento_grid", parent_id: c1, sort_order: 1, content: { title: "Imóveis Selecionados" } },
 ];
 },
 },

};
