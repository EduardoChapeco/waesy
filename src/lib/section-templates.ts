import type { SectionTemplate } from "./builder-types";

// Helper para gerar IDs previsíveis temporários (o injetor deve substituir por UUIDs reais)
const genId = (prefix: string) => `tpl_${prefix}`;

export const sectionTemplates: Record<string, SectionTemplate> = {
 // ── 1. FAIXAS & HEROS ──
 hero_carousel: {
 id: "hero_carousel",
 name: "Carrossel Principal (Hero)",
 description: "Banners rotativos de ponta a ponta com botões de ação e transição suave.",
 category: "commerce",
 previewImageUrl:
 "",
 nodes: [
 {
 id: genId("section"),
 node_type: "section",
 block_type: "section",
 parent_id: null,
 },
 {
 id: genId("container"),
 node_type: "container",
 block_type: "container",
 parent_id: genId("section"),
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
 id: genId("carousel"),
 node_type: "composition",
 block_type: "hero_carousel",
 parent_id: genId("container"),
 content: {
 autoPlay: true,
 interval: 5,
 banners: [
 {
 title: "Nova Coleção Exclusiva",
 subtitle: "Design contemporâneo, matérias-primas nobres e atendimento impecável.",
 button_text: "Explorar Coleção",
 link: "/produtos",
 image_url: "",
 },
 {
 title: "Destaques da Temporada",
 subtitle: "Descubra lançamentos selecionados para transformar sua rotina.",
 button_text: "Ver Lançamentos",
 link: "/produtos",
 image_url: "",
 },
 ],
 showOverlay: true,
 overlayOpacity: "medium",
 desktopHeight: "proportional",
 },
 },
 ],
 },

 split_banner: {
 id: "split_banner",
 name: "Hero Dividido (Split Banner)",
 description: "Layout editorial com imagem de alta resolução e bloco de texto com CTA.",
 category: "commerce",
 previewImageUrl:
 "",
 nodes: [
 {
 id: genId("section"),
 node_type: "section",
 block_type: "section",
 parent_id: null,
 },
 {
 id: genId("container"),
 node_type: "container",
 block_type: "container",
 parent_id: genId("section"),
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
 id: genId("split"),
 node_type: "composition",
 block_type: "split_banner",
 parent_id: genId("container"),
 content: {
 title: "Nova Coleção Exclusiva",
 subtitle: "Peças desenvolvidas com tecidos nobres e acabamento impecável.",
 buttonText: "Explorar Coleção",
 buttonLink: "/produtos",
 imageUrl: "",
 imagePosition: "right",
 },
 },
 ],
 },

 announcement_bar: {
 id: "announcement_bar",
 name: "Barra de Avisos no Topo",
 description: "Barra compacta para avisos de frete grátis, cupons ou comunicados urgentes.",
 category: "marketing",
 previewImageUrl:
 "",
 nodes: [
 {
 id: genId("section"),
 node_type: "section",
 block_type: "section",
 parent_id: null,
 },
 {
 id: genId("bar"),
 node_type: "element",
 block_type: "announcement_bar",
 parent_id: genId("section"),
 content: {
 text: "Frete Grátis para todo o Brasil em compras acima de R$ 250",
 linkText: "Aproveitar Agora",
 linkUrl: "/produtos",
 },
 },
 ],
 },

 // ── 2. VITRINE & PRODUTOS ──
 product_grid: {
 id: "product_grid",
 name: "Grade de Produtos",
 description: "Exibição dos produtos do catálogo em grid responsivo com cards e preços.",
 category: "commerce",
 previewImageUrl:
 "",
 nodes: [
 {
 id: genId("section"),
 node_type: "section",
 block_type: "section",
 parent_id: null,
 },
 {
 id: genId("container"),
 node_type: "container",
 block_type: "container",
 parent_id: genId("section"),
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "md",
 paddingX: "md",
 paddingY: "xl",
 },
 },
 {
 id: genId("grid"),
 node_type: "composition",
 block_type: "product_grid",
 parent_id: genId("container"),
 content: {
 title: "Produtos em Destaque",
 subtitle: "As últimas novidades da coleção",
 columnsDesktop: 4,
 columnsMobile: 2,
 },
 data_bindings: { source: "latest_products", limit: 8 },
 },
 ],
 },

 product_carousel: {
 id: "product_carousel",
 name: "Carrossel de Produtos",
 description: "Trilho horizontal de produtos com scroll suave por toque.",
 category: "commerce",
 previewImageUrl:
 "",
 nodes: [
 {
 id: genId("section"),
 node_type: "section",
 block_type: "section",
 parent_id: null,
 },
 {
 id: genId("container"),
 node_type: "container",
 block_type: "container",
 parent_id: genId("section"),
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "md",
 paddingX: "md",
 paddingY: "xl",
 },
 },
 {
 id: genId("rail"),
 node_type: "composition",
 block_type: "product_rail",
 parent_id: genId("container"),
 content: {
 title: "Mais Vendidos da Semana",
 subtitle: "Os itens favoritos dos nossos clientes.",
 layout: "carousel",
 },
 data_bindings: { source: "latest_products", limit: 8 },
 },
 ],
 },

 // ── 3. TURISMO & VIAGENS ──
 tourism_quote_hero: {
 id: "tourism_quote_hero",
 name: "Hero com Cotação de Viagem",
 description: "Formulário de cotação de viagens em tempo real com captura de leads no WhatsApp.",
 category: "commerce",
 previewImageUrl:
 "",
 nodes: [
 {
 id: genId("section"),
 node_type: "section",
 block_type: "section",
 parent_id: null,
 },
 {
 id: genId("container"),
 node_type: "container",
 block_type: "container",
 parent_id: genId("section"),
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
 id: genId("tourism_hero"),
 node_type: "composition",
 block_type: "tourism_quote_hero",
 parent_id: genId("container"),
 content: {
 title: "Sua Próxima Viagem Inesquecível Começa Aqui",
 subtitle: "Roteiros exclusivos, cruzeiros, passagens aéreas e pacotes completos com assessoria VIP.",
 badge: "Agência Especializada em Turismo",
 bgImageUrl: "",
 },
 },
 ],
 },

 tourism_services_grid: {
 id: "tourism_services_grid",
 name: "Grade de Especialidades de Turismo",
 description: "Matriz com os 8 principais serviços de agência de turismo com ação direta.",
 category: "commerce",
 previewImageUrl:
 "",
 nodes: [
 {
 id: genId("section"),
 node_type: "section",
 block_type: "section",
 parent_id: null,
 },
 {
 id: genId("container"),
 node_type: "container",
 block_type: "container",
 parent_id: genId("section"),
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "md",
 paddingX: "md",
 paddingY: "xl",
 },
 },
 {
 id: genId("tourism_services"),
 node_type: "composition",
 block_type: "tourism_services_grid",
 parent_id: genId("container"),
 content: {
 title: "Nossas Especialidades em Turismo",
 subtitle: "Assessoria completa de ponta a ponta para que sua única preocupação seja fazer as malas.",
 },
 },
 ],
 },

 tourism_destinations_carousel: {
 id: "tourism_destinations_carousel",
 name: "Carrossel de Destinos Populares",
 description: "Cards visuais de destinos nacionais e internacionais com preços a partir de.",
 category: "commerce",
 previewImageUrl:
 "",
 nodes: [
 {
 id: genId("section"),
 node_type: "section",
 block_type: "section",
 parent_id: null,
 },
 {
 id: genId("container"),
 node_type: "container",
 block_type: "container",
 parent_id: genId("section"),
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "md",
 paddingX: "md",
 paddingY: "xl",
 },
 },
 {
 id: genId("destinations"),
 node_type: "composition",
 block_type: "tourism_destinations_carousel",
 parent_id: genId("container"),
 content: {
 title: "Destinos Populares em Destaque",
 subtitle: "Pacotes completos com voos, hospedagem e assessoria personalizada.",
 },
 },
 ],
 },

 // ── 4. GASTRONOMIA & FOOD ──
 food_menu_streamlined: {
 id: "food_menu_streamlined",
 name: "Cardápio Mobile-First com Barra Flutuante",
 description: "Lista compacta com miniaturas à direita, adição em 1 toque e barra flutuante de sacola.",
 category: "commerce",
 previewImageUrl:
 "",
 nodes: [
 {
 id: genId("section"),
 node_type: "section",
 block_type: "section",
 parent_id: null,
 },
 {
 id: genId("menu_streamlined"),
 node_type: "composition",
 block_type: "food_menu_streamlined",
 parent_id: genId("section"),
 content: {
 storeName: "Pizzas & Cucina Rocco",
 openingHoursText: "Aberto hoje das 18:00 às 23:30",
 isOpenNow: true,
 },
 },
 ],
 },

 curated_hits_rail: {
 id: "curated_hits_rail",
 name: "Trilho Top Mais Vendidos (Hits)",
 description: "Carrossel de produtos mais vendidos com ranking numérico (#1, #2), desconto e botão rápido.",
 category: "commerce",
 previewImageUrl:
 "",
 nodes: [
 {
 id: genId("section"),
 node_type: "section",
 block_type: "section",
 parent_id: null,
 },
 {
 id: genId("hits_rail"),
 node_type: "composition",
 block_type: "curated_hits_rail",
 parent_id: genId("section"),
 content: {
 title: "Top Mais Pedidos da Região",
 subtitle: "Os pratos e produtos favoritos dos clientes com descontos exclusivos.",
 savingsText: "Economize até 25% nos itens mais pedidos deste mês.",
 },
 },
 ],
 },

 table_order_comanda: {
 id: "table_order_comanda",
 name: "Comanda & QR Code de Mesa",
 description: "Cartão de autoatendimento no salão com número de mesa e QR Code para pedidos diretos.",
 category: "commerce",
 previewImageUrl:
 "",
 nodes: [
 {
 id: genId("section"),
 node_type: "section",
 block_type: "section",
 parent_id: null,
 },
 {
 id: genId("table_comanda"),
 node_type: "element",
 block_type: "table_order_comanda",
 parent_id: genId("section"),
 content: {
 tableNumber: "10",
 storeName: "Pizzas & Cucina Rocco",
 wifiName: "Rocco_Clientes_5G",
 },
 },
 ],
 },

 food_menu_tabs: {
 id: "food_menu_tabs",
 name: "Cardápio Digital por Abas",
 description: "Cardápio completo organizado por categorias (Entradas, Principais, Bebidas, Sobremesas).",
 category: "commerce",
 previewImageUrl:
 "",
 nodes: [
 {
 id: genId("section"),
 node_type: "section",
 block_type: "section",
 parent_id: null,
 },
 {
 id: genId("menu"),
 node_type: "composition",
 block_type: "food_menu_tabs",
 parent_id: genId("section"),
 content: {
 title: "Cardápio do Restaurante",
 subtitle: "Ingredientes frescos selecionados diariamente pelo nosso chef.",
 },
 },
 ],
 },

 chef_special_banner: {
 id: "chef_special_banner",
 name: "Destaque do Prato do Chef",
 description: "Lâmina visual para o prato estrela com lista de ingredientes e tempo de preparo.",
 category: "commerce",
 previewImageUrl:
 "",
 nodes: [
 {
 id: genId("section"),
 node_type: "section",
 block_type: "section",
 parent_id: null,
 },
 {
 id: genId("chef_special"),
 node_type: "composition",
 block_type: "chef_special_banner",
 parent_id: genId("section"),
 content: {
 title: "Sugestão do Chef",
 dishName: "Costela Prensada ao Demi-Glace",
 description: "Cozida lentamente por 12 horas em baixa temperatura, servida com aligot de queijo da canastra.",
 priceCents: 9600,
 prepTimeMinutes: 25,
 },
 },
 ],
 },

 restaurant_hours_delivery: {
 id: "restaurant_hours_delivery",
 name: "Horários de Cozinha & Entrega",
 description: "Grade informativa de funcionamento, taxas de entrega e retirada no balcão.",
 category: "commerce",
 previewImageUrl:
 "",
 nodes: [
 {
 id: genId("section"),
 node_type: "section",
 block_type: "section",
 parent_id: null,
 },
 {
 id: genId("hours"),
 node_type: "composition",
 block_type: "restaurant_hours_delivery",
 parent_id: genId("section"),
 content: {
 title: "Horários de Atendimento & Entrega",
 },
 },
 ],
 },

 table_booking_card: {
 id: "table_booking_card",
 name: "Formulário de Reserva de Mesa",
 description: "Agendamento de mesa com data, horário e pessoas com confirmação no WhatsApp.",
 category: "commerce",
 previewImageUrl:
 "",
 nodes: [
 {
 id: genId("section"),
 node_type: "section",
 block_type: "section",
 parent_id: null,
 },
 {
 id: genId("booking"),
 node_type: "composition",
 block_type: "table_booking_card",
 parent_id: genId("section"),
 content: {
 title: "Reserve sua Mesa",
 subtitle: "Garanta uma experiência memorável com confirmação instantânea.",
 },
 },
 ],
 },

 // ── 5. MODA & LOOKBOOK ──
 shop_the_look_hotspots: {
 id: "shop_the_look_hotspots",
 name: "Shop the Look (Hotspots)",
 description: "Foto editorial com pontos clicáveis para ver e comprar as peças do look.",
 category: "commerce",
 previewImageUrl:
 "",
 nodes: [
 {
 id: genId("section"),
 node_type: "section",
 block_type: "section",
 parent_id: null,
 },
 {
 id: genId("lookbook"),
 node_type: "composition",
 block_type: "shop_the_look_hotspots",
 parent_id: genId("section"),
 content: {
 title: "Shop the Look",
 subtitle: "Clique nos pontos da foto para ver e comprar cada peça da composição.",
 },
 },
 ],
 },

 size_guide_table: {
 id: "size_guide_table",
 name: "Tabela de Medidas (Guia de Tamanhos)",
 description: "Tabela clara de caimento com medidas de busto, cintura e quadril.",
 category: "content",
 previewImageUrl:
 "",
 nodes: [
 {
 id: genId("section"),
 node_type: "section",
 block_type: "section",
 parent_id: null,
 },
 {
 id: genId("guide"),
 node_type: "composition",
 block_type: "size_guide_table",
 parent_id: genId("section"),
 content: {
 title: "Guia de Medidas",
 subtitle: "Encontre o tamanho perfeito para o seu caimento ideal.",
 },
 },
 ],
 },

 // ── 6. SERVIÇOS & CLÍNICAS ──
 specialist_team_grid: {
 id: "specialist_team_grid",
 name: "Corpo Clínico & Equipe",
 description: "Grade de especialistas com registro profissional (CRM/CRO) e especialidades.",
 category: "content",
 previewImageUrl:
 "",
 nodes: [
 {
 id: genId("section"),
 node_type: "section",
 block_type: "section",
 parent_id: null,
 },
 {
 id: genId("team"),
 node_type: "composition",
 block_type: "specialist_team_grid",
 parent_id: genId("section"),
 content: {
 title: "Corpo Clínico & Especialistas",
 subtitle: "Profissionais certificados com vasta experiência para cuidar de você.",
 },
 },
 ],
 },

 service_pricing_table: {
 id: "service_pricing_table",
 name: "Tabela de Planos & Procedimentos",
 description: "Tabela comparativa de pacotes e planos multi-sessão para clínicas e salões.",
 category: "content",
 previewImageUrl:
 "",
 nodes: [
 {
 id: genId("section"),
 node_type: "section",
 block_type: "section",
 parent_id: null,
 },
 {
 id: genId("container"),
 node_type: "container",
 block_type: "container",
 parent_id: genId("section"),
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "md",
 paddingX: "md",
 paddingY: "xl",
 },
 },
 {
 id: genId("pricing_table"),
 node_type: "composition",
 block_type: "service_pricing_table",
 parent_id: genId("container"),
 content: {
 title: "Planos & Tabela de Procedimentos",
 subtitle: "Escolha o pacote ideal para suas necessidades.",
 },
 },
 ],
 },

 // ── 7. IMÓVEIS & CORRETORES ──
 property_features_grid: {
 id: "property_features_grid",
 name: "Ficha Técnica do Imóvel",
 description: "Ficha estrutural com metragem (m²), dormitórios, suítes, vagas e botão de visita.",
 category: "content",
 previewImageUrl:
 "",
 nodes: [
 {
 id: genId("section"),
 node_type: "section",
 block_type: "section",
 parent_id: null,
 },
 {
 id: genId("property"),
 node_type: "composition",
 block_type: "property_features_grid",
 parent_id: genId("section"),
 content: {
 title: "Ficha Técnica do Imóvel",
 subtitle: "Todos os detalhes estruturais e diferenciais de acabamento.",
 },
 },
 ],
 },

 // ── 8. BIOLINK & REDES SOCIAIS ──
 biolink_profile_header: {
 id: "biolink_profile_header",
 name: "Perfil de Biolink com Selo",
 description: "Foto de perfil circular com selo de verificação, @handle e biografia.",
 category: "social",
 previewImageUrl:
 "",
 nodes: [
 {
 id: genId("section"),
 node_type: "section",
 block_type: "section",
 parent_id: null,
 },
 {
 id: genId("bio_profile"),
 node_type: "element",
 block_type: "biolink_profile_header",
 parent_id: genId("section"),
 content: {
 name: "Sua Marca & Co.",
 handle: "@suamarca",
 bio: "Produtos autorais e atendimento exclusivo. Acesse nossos links oficiais abaixo.",
 isVerified: true,
 },
 },
 ],
 },

 biolink_action_buttons: {
 id: "biolink_action_buttons",
 name: "Botões de Links em Pílula",
 description: "Lista de botões táteis para links externos, WhatsApp e catálogo.",
 category: "social",
 previewImageUrl:
 "",
 nodes: [
 {
 id: genId("section"),
 node_type: "section",
 block_type: "section",
 parent_id: null,
 },
 {
 id: genId("bio_links"),
 node_type: "element",
 block_type: "biolink_action_buttons",
 parent_id: genId("section"),
 content: {
 links: [
 { id: "l1", title: "Fale Conosco no WhatsApp", url: "/contato", isHighlight: true },
 { id: "l2", title: "Acessar Catálogo de Produtos", url: "/produtos" },
 { id: "l3", title: "Nossa Localização & Horários", url: "#" },
 ],
 },
 },
 ],
 },

 biolink_pix_card: {
 id: "biolink_pix_card",
 name: "Chave Pix Copia e Cola",
 description: "Card com chave Pix e botão de copiar com 1 clique para pagamentos rápidos.",
 category: "social",
 previewImageUrl:
 "",
 nodes: [
 {
 id: genId("section"),
 node_type: "section",
 block_type: "section",
 parent_id: null,
 },
 {
 id: genId("bio_pix"),
 node_type: "element",
 block_type: "biolink_pix_card",
 parent_id: genId("section"),
 content: {
 pixKey: "contato@suamarca.com.br",
 pixKeyType: "Chave E-mail",
 beneficiaryName: "Sua Loja Oficial LTDA",
 bankName: "Waesy Pay",
 },
 },
 ],
 },

 // ── 9. GERAIS & CONTEÚDO ──
 bento_grid: {
 id: "bento_grid",
 name: "Mosaico Bento Grid",
 description: "Grid moderno assimétrico estilo Apple para links e coleções.",
 category: "content",
 previewImageUrl:
 "",
 nodes: [
 {
 id: genId("section"),
 node_type: "section",
 block_type: "section",
 parent_id: null,
 },
 {
 id: genId("container"),
 node_type: "container",
 block_type: "container",
 parent_id: genId("section"),
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "md",
 paddingX: "md",
 paddingY: "xl",
 },
 },
 {
 id: genId("bento"),
 node_type: "composition",
 block_type: "bento_grid",
 parent_id: genId("container"),
 content: {
 title: "Destaques da Coleção",
 },
 },
 ],
 },

 gallery_grid: {
 id: "gallery_grid",
 name: "Galeria de Fotos (Mural)",
 description: "Grade responsiva para fotos, portfólio e fotos de clientes.",
 category: "content",
 previewImageUrl:
 "",
 nodes: [
 {
 id: genId("section"),
 node_type: "section",
 block_type: "section",
 parent_id: null,
 },
 {
 id: genId("container"),
 node_type: "container",
 block_type: "container",
 parent_id: genId("section"),
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "md",
 paddingX: "md",
 paddingY: "xl",
 },
 },
 {
 id: genId("gallery"),
 node_type: "composition",
 block_type: "gallery_grid",
 parent_id: genId("container"),
 content: {
 title: "Nossa Galeria",
 images: [
 { url: "", alt: "Foto 1" },
 { url: "", alt: "Foto 2" },
 { url: "", alt: "Foto 3" },
 ],
 },
 },
 ],
 },

 before_after_slider: {
 id: "before_after_slider",
 name: "Comparador Antes e Depois",
 description: "Slider tátil interativo para comparar resultados estéticos ou reformas.",
 category: "content",
 previewImageUrl:
 "",
 nodes: [
 {
 id: genId("section"),
 node_type: "section",
 block_type: "section",
 parent_id: null,
 },
 {
 id: genId("slider"),
 node_type: "element",
 block_type: "before_after_slider",
 parent_id: genId("section"),
 content: {
 title: "Resultados Reais",
 beforeImageUrl: "",
 afterImageUrl: "",
 },
 },
 ],
 },

 location_map_card: {
 id: "location_map_card",
 name: "Localização & Endereço com Mapa",
 description: "Endereço físico com horários, telefone e rota no Google Maps.",
 category: "content",
 previewImageUrl:
 "",
 nodes: [
 {
 id: genId("section"),
 node_type: "section",
 block_type: "section",
 parent_id: null,
 },
 {
 id: genId("location"),
 node_type: "composition",
 block_type: "location_map_card",
 parent_id: genId("section"),
 content: {
 title: "Venha nos Visitar",
 address: "Av. Brasil, 1420 - Centro",
 cityState: "São Miguel do Oeste - SC",
 },
 },
 ],
 },

 newsletter_capture: {
 id: "newsletter_capture",
 name: "Captura de Leads & Novidades",
 description: "Bloco minimalista com campo de e-mail/WhatsApp para captação de clientes.",
 category: "marketing",
 previewImageUrl:
 "",
 nodes: [
 {
 id: genId("section"),
 node_type: "section",
 block_type: "section",
 parent_id: null,
 },
 {
 id: genId("newsletter"),
 node_type: "element",
 block_type: "newsletter_capture",
 parent_id: genId("section"),
 content: {
 title: "Fique por Dentro dos Lançamentos",
 subtitle: "Receba novidades exclusivas e cupons de desconto.",
 },
 },
 ],
 },

 faq_accordion: {
 id: "faq_accordion",
 name: "Perguntas Frequentes (FAQ)",
 description: "Lista expansível de dúvidas mais comuns sobre prazos e trocas.",
 category: "marketing",
 previewImageUrl:
 "",
 nodes: [
 {
 id: genId("section"),
 node_type: "section",
 block_type: "section",
 parent_id: null,
 },
 {
 id: genId("container"),
 node_type: "container",
 block_type: "container",
 parent_id: genId("section"),
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
 id: genId("faq"),
 node_type: "composition",
 block_type: "faq_accordion",
 parent_id: genId("container"),
 content: {
 title: "Dúvidas Frequentes",
 faqs: [
 { question: "Qual o prazo de entrega?", answer: "Entre 3 a 7 dias úteis após a confirmação." },
 { question: "Como funciona a troca?", answer: "Primeira troca grátis em até 7 dias corridos." },
 ],
 },
 },
 ],
 },

 testimonial_carousel: {
 id: "testimonial_carousel",
 name: "Depoimentos de Clientes",
 description: "Depoimentos reais com fotos, notas e estrelas para gerar credibilidade.",
 category: "marketing",
 previewImageUrl:
 "",
 nodes: [
 {
 id: genId("section"),
 node_type: "section",
 block_type: "section",
 parent_id: null,
 },
 {
 id: genId("container"),
 node_type: "container",
 block_type: "container",
 parent_id: genId("section"),
 layout_rules: {
 maxWidth: "lg",
 display: "flex",
 flexDirection: "col",
 gap: "md",
 paddingX: "md",
 paddingY: "xl",
 },
 },
 {
 id: genId("testimonials"),
 node_type: "composition",
 block_type: "testimonial_carousel",
 parent_id: genId("container"),
 content: {
 title: "O Que Dizem Nossos Clientes",
 subtitle: "Histórias reais de quem ama nossos produtos e atendimento.",
 },
 },
 ],
 },

 // ── 31. OFERTA RELÂMPAGO (FLASH SALE) ──
 flash_sale_hero: {
 id: "flash_sale_hero",
 name: "Oferta Relâmpago com Cronômetro",
 description: "Faixa de alta urgência com contador regressivo, badge de desconto e botão rápido.",
 category: "commerce",
 previewImageUrl: "",
 nodes: [
 { id: genId("section"), node_type: "section", block_type: "section", parent_id: null },
 {
 id: genId("container"),
 node_type: "container",
 block_type: "container",
 parent_id: genId("section"),
 layout_rules: { maxWidth: "6xl", paddingY: "md" },
 },
 {
 id: genId("flash"),
 node_type: "composition",
 block_type: "flash_sale_hero",
 parent_id: genId("container"),
 content: {
 title: "Semana do Consumidor — Até 50% OFF",
 subtitle: "Ofertas exclusivas com frete grátis por tempo limitado.",
 badge: "🔥 Oferta por Tempo Limitado",
 discountPercentage: "50% OFF",
 couponCode: "RELAMPAGO50",
 buttonText: "Garantir Ofertas com Desconto",
 targetLink: "#produtos",
 targetDate: "2026-12-31T23:59:59",
 },
 design_tokens: {
 backgroundColor: "#09090b",
 textColor: "#ffffff",
 accentColor: "#f59e0b",
 },
 },
 ],
 },

 // ── 32. GRADE DE CATEGORIAS ──
 category_cards_grid: {
 id: "category_cards_grid",
 name: "Grade de Categorias em Destaque",
 description: "Navegação visual pelas principais categorias da loja com fotos e contagem de itens.",
 category: "commerce",
 previewImageUrl: "",
 nodes: [
 { id: genId("section"), node_type: "section", block_type: "section", parent_id: null },
 {
 id: genId("container"),
 node_type: "container",
 block_type: "container",
 parent_id: genId("section"),
 layout_rules: { maxWidth: "6xl", paddingY: "lg" },
 },
 {
 id: genId("catgrid"),
 node_type: "composition",
 block_type: "category_cards_grid",
 parent_id: genId("container"),
 content: {
 title: "Compre por Categoria",
 subtitle: "Encontre tudo o que você precisa em poucos cliques.",
 },
 },
 ],
 },

 // ── 33. BANNER DE COLEÇÃO EM DESTAQUE ──
 featured_collection_banner: {
 id: "featured_collection_banner",
 name: "Banner de Coleção em Destaque",
 description: "Chamada em split com foto grande, texto institucional e botão direto.",
 category: "commerce",
 previewImageUrl: "",
 nodes: [
 { id: genId("section"), node_type: "section", block_type: "section", parent_id: null },
 {
 id: genId("container"),
 node_type: "container",
 block_type: "container",
 parent_id: genId("section"),
 layout_rules: { maxWidth: "6xl", paddingY: "lg" },
 },
 {
 id: genId("banner"),
 node_type: "composition",
 block_type: "featured_collection_banner",
 parent_id: genId("container"),
 content: {
 title: "Coleção Elegance 2026",
 subtitle: "Cortes refinados e sofisticação para todos os momentos.",
 buttonText: "Explorar Coleção",
 buttonLink: "#produtos",
 imageUrl: "",
 },
 },
 ],
 },

 // ── 34. ROTEIRO DIA A DIA DE VIAGENS ──
 tourism_itinerary_timeline: {
 id: "tourism_itinerary_timeline",
 name: "Roteiro Dia a Dia (Timeline)",
 description: "Linha do tempo numerada com programação diária, passeios e dicas do destino.",
 category: "content",
 previewImageUrl: "",
 nodes: [
 { id: genId("section"), node_type: "section", block_type: "section", parent_id: null },
 {
 id: genId("container"),
 node_type: "container",
 block_type: "container",
 parent_id: genId("section"),
 layout_rules: { maxWidth: "5xl", paddingY: "lg" },
 },
 {
 id: genId("timeline"),
 node_type: "composition",
 block_type: "timeline_history",
 parent_id: genId("container"),
 content: {
 title: "Roteiro Completo da Viagem",
 subtitle: "Confira o planejamento dia a dia da sua expedição.",
 events: [
 { year: "Dia 1", title: "Chegada e Check-in no Resort", description: "Recepção de boas-vindas com coquetel e jantar livre." },
 { year: "Dia 2", title: "Passeio pelas Praias e Falésias", description: "Tour privativo com guia bilíngue e almoço típico incluído." },
 { year: "Dia 3", title: "Dia Livre para Lazer ou Mergulho", description: "Aproveite a estrutura do resort ou explore os recifes naturais." },
 ],
 },
 },
 ],
 },

 // ── 35. GUIA DO VIAJANTE & DICAS ──
 tourism_traveler_info: {
 id: "tourism_traveler_info",
 name: "Guia do Viajante & Informações Úteis",
 description: "Cards com orientações de bagagem, clima, melhor época e documentação.",
 category: "content",
 previewImageUrl: "",
 nodes: [
 { id: genId("section"), node_type: "section", block_type: "section", parent_id: null },
 {
 id: genId("container"),
 node_type: "container",
 block_type: "container",
 parent_id: genId("section"),
 layout_rules: { maxWidth: "6xl", paddingY: "md" },
 },
 {
 id: genId("infocards"),
 node_type: "composition",
 block_type: "info_cards",
 parent_id: genId("container"),
 content: {
 cards: [
 { title: "Melhor Época", description: "Sol garantido de setembro a março com brisa suave." },
 { title: "Documentação", description: "RG com emissão recente ou passaporte válido." },
 { title: "Bagagem Incluída", description: "1 mala de mão até 10kg + bolsa ou mochila pessoal." },
 ],
 },
 },
 ],
 },

 // ── 36. LOOKBOOK MASONRY ──
 lookbook_masonry: {
 id: "lookbook_masonry",
 name: "Vitrine Lookbook Estilo Editorial",
 description: "Mosaico editorial de fotos com looks e combinações de produtos.",
 category: "media",
 previewImageUrl: "",
 nodes: [
 { id: genId("section"), node_type: "section", block_type: "section", parent_id: null },
 {
 id: genId("container"),
 node_type: "container",
 block_type: "container",
 parent_id: genId("section"),
 layout_rules: { maxWidth: "6xl", paddingY: "md" },
 },
 {
 id: genId("gallery"),
 node_type: "composition",
 block_type: "gallery_grid",
 parent_id: genId("container"),
 content: {
 title: "Lookbook Editorial",
 images: [
 "",
 "",
 "",
 ],
 },
 },
 ],
 },

 // ── 37. CATÁLOGO DE PROCEDIMENTOS & SERVIÇOS ──
 service_catalog_list: {
 id: "service_catalog_list",
 name: "Catálogo de Serviços & Preços",
 description: "Tabela comparativa com valores, duração e botões de agendamento rápido.",
 category: "commerce",
 previewImageUrl: "",
 nodes: [
 { id: genId("section"), node_type: "section", block_type: "section", parent_id: null },
 {
 id: genId("container"),
 node_type: "container",
 block_type: "container",
 parent_id: genId("section"),
 layout_rules: { maxWidth: "6xl", paddingY: "md" },
 },
 {
 id: genId("pricing"),
 node_type: "composition",
 block_type: "service_pricing_table",
 parent_id: genId("container"),
 content: {
 title: "Menu de Procedimentos",
 subtitle: "Cuidado personalizado com profissionais especializados.",
 },
 },
 ],
 },

 // ── 38. AGENDAMENTO ONLINE (CALENDAR) ──
 booking_calendar: {
 id: "booking_calendar",
 name: "Agendamento de Horários Online",
 description: "Calendário interativo para seleção de data, horário e profissional.",
 category: "forms",
 previewImageUrl: "",
 nodes: [
 { id: genId("section"), node_type: "section", block_type: "section", parent_id: null },
 {
 id: genId("container"),
 node_type: "container",
 block_type: "container",
 parent_id: genId("section"),
 layout_rules: { maxWidth: "4xl", paddingY: "md" },
 },
 {
 id: genId("cal"),
 node_type: "composition",
 block_type: "booking_calendar",
 parent_id: genId("container"),
 content: {
 title: "Agende Seu Horário",
 subtitle: "Escolha o melhor dia e confirme pelo WhatsApp em instantes.",
 },
 },
 ],
 },

 // ── 39. AGENDAMENTO DE VISITA PARA IMÓVEIS ──
 property_schedule_visit: {
 id: "property_schedule_visit",
 name: "Agendamento de Visita ao Imóvel",
 description: "Formulário rápido para agendar visita presencial com corretor.",
 category: "forms",
 previewImageUrl: "",
 nodes: [
 { id: genId("section"), node_type: "section", block_type: "section", parent_id: null },
 {
 id: genId("container"),
 node_type: "container",
 block_type: "container",
 parent_id: genId("section"),
 layout_rules: { maxWidth: "4xl", paddingY: "md" },
 },
 {
 id: genId("form"),
 node_type: "composition",
 block_type: "contact_form",
 parent_id: genId("container"),
 content: {
 title: "Agende uma Visita sem Compromisso",
 subtitle: "Nossos corretores entrarão em contato para confirmar o melhor horário.",
 buttonText: "Solicitar Visita",
 },
 },
 ],
 },

 // ── 40. TOUR VIRTUAL / VÍDEO DO IMÓVEL ──
 property_virtual_tour: {
 id: "property_virtual_tour",
 name: "Tour Virtual / Vídeo do Imóvel",
 description: "Apresentação em vídeo ou tour 360° para encantar compradores.",
 category: "media",
 previewImageUrl: "",
 nodes: [
 { id: genId("section"), node_type: "section", block_type: "section", parent_id: null },
 {
 id: genId("container"),
 node_type: "container",
 block_type: "container",
 parent_id: genId("section"),
 layout_rules: { maxWidth: "5xl", paddingY: "md" },
 },
 {
 id: genId("video"),
 node_type: "composition",
 block_type: "video_section",
 parent_id: genId("container"),
 content: {
 title: "Conheça Todos os Detalhes",
 video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
 },
 },
 ],
 },

 // ── 41. PRODUTO EM DESTAQUE NA BIO ──
 biolink_featured_product: {
 id: "biolink_featured_product",
 name: "Produto em Destaque (Link da Bio)",
 description: "Card compacto de produto prioritário para converter tráfego de redes sociais.",
 category: "commerce",
 previewImageUrl: "",
 nodes: [
 { id: genId("section"), node_type: "section", block_type: "section", parent_id: null },
 {
 id: genId("container"),
 node_type: "container",
 block_type: "container",
 parent_id: genId("section"),
 layout_rules: { maxWidth: "sm", paddingY: "sm" },
 },
 {
 id: genId("prod"),
 node_type: "composition",
 block_type: "product_rail",
 parent_id: genId("container"),
 content: {
 title: "Destaque da Semana",
 },
 },
 ],
 },

 // ── 42. CONTADOR REGRESSIVO ──
 countdown_timer: {
 id: "countdown_timer",
 name: "Cronômetro Regressivo",
 description: "Bloco de contagem regressiva para lançamentos, queimas de estoque e campanhas.",
 category: "marketing",
 previewImageUrl: "",
 nodes: [
 { id: genId("section"), node_type: "section", block_type: "section", parent_id: null },
 {
 id: genId("container"),
 node_type: "container",
 block_type: "container",
 parent_id: genId("section"),
 layout_rules: { maxWidth: "4xl", paddingY: "md" },
 },
 {
 id: genId("timer"),
 node_type: "composition",
 block_type: "countdown_timer",
 parent_id: genId("container"),
 content: {
 title: "Oportunidade por Tempo Limitado",
 target_date: "2026-12-31T23:59:59",
 expired_message: "Oferta Expirada",
 },
 design_tokens: {
 backgroundColor: "#09090b",
 textColor: "#ffffff",
 boxColor: "rgba(255, 255, 255, 0.15)",
 boxTextColor: "#ffffff",
 borderRadius: "rounded-2xl",
 },
 },
 ],
 },

 // ── 43. DESTAQUES VISUAIS CIRCULARES ──
 stories_ring: {
 id: "stories_ring",
 name: "Destaques Visuais",
 description: "Círculos de destaques interativos no topo da vitrine com fotos e vídeos curtos.",
 category: "social",
 previewImageUrl: "",
 nodes: [
 { id: genId("section"), node_type: "section", block_type: "section", parent_id: null },
 {
 id: genId("container"),
 node_type: "container",
 block_type: "container",
 parent_id: genId("section"),
 layout_rules: { maxWidth: "6xl", paddingY: "sm" },
 },
 {
 id: genId("stories"),
 node_type: "composition",
 block_type: "stories_ring",
 parent_id: genId("container"),
 content: {
 stories: [
 { title: "Novidades", image_url: "" },
 { title: "Promoções", image_url: "" },
 { title: "Bastidores", image_url: "" },
 ],
 },
 },
 ],
 },

 // ── 44. PASSO A PASSO / COMO FUNCIONA ──
 routine_steps: {
 id: "routine_steps",
 name: "Passo a Passo / Como Funciona",
 description: "Guia sequencial 1, 2, 3 explicando o processo de compra ou atendimento.",
 category: "content",
 previewImageUrl: "",
 nodes: [
 { id: genId("section"), node_type: "section", block_type: "section", parent_id: null },
 {
 id: genId("container"),
 node_type: "container",
 block_type: "container",
 parent_id: genId("section"),
 layout_rules: { maxWidth: "6xl", paddingY: "lg" },
 },
 {
 id: genId("steps"),
 node_type: "composition",
 block_type: "routine_steps",
 parent_id: genId("container"),
 content: {
 title: "Como Funciona Sua Compra",
 steps: [
 { step: "1", title: "Escolha seus Produtos", description: "Navegue pelo catálogo e adicione ao carrinho." },
 { step: "2", title: "Pagamento Rápido", description: "Pague com Pix instantâneo ou Cartão até 12x." },
 { step: "3", title: "Entrega com Rastreio", description: "Receba em sua casa com segurança total." },
 ],
 },
 },
 ],
 },

};

export function getAllTemplates(): SectionTemplate[] {
  return Object.values(sectionTemplates);
}

export function getTemplatesByCategory(category: string): SectionTemplate[] {
  if (category === "all") return Object.values(sectionTemplates);
  return Object.values(sectionTemplates).filter((t) => t.category === category);
}
