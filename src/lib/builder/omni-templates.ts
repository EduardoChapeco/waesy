/**
 * templates.ts — Matriz Canônica de Templates por Nicho (The Niche Template Matrix)
 * Onboarding instantâneo: o usuário NUNCA começa com uma tela em branco.
 */

import type { OmniBlockInstance, OmniPageDocument } from "@/types/omni-builder";

export interface NicheTemplateDefinition {
  id: string;
  name: string;
  niche: string;
  description: string;
  badge: string;
  blocks: Omit<OmniBlockInstance, "id">[];
}

export const NICHE_TEMPLATE_MATRIX: NicheTemplateDefinition[] = [
  // 0B. VITRINE COMERCIAL ESTILO IFOOD DELIVERY (PARIDADE 100% COM MULTIVITRINE IFOOD)
  {
    id: "template_ifood_delivery_showcase",
    name: "Vitrine Comercial Estilo iFood Delivery",
    niche: "delivery",
    description:
      "Template canônico idêntico ao iFood: cabeçalho com endereço e clube de vantagens, dock de troca entre vitrines, trilho de subcategorias com fotos recortadas, mini-banners verticais de cupons, últimas lojas, chips de filtros rápidos, feed com avaliação e sacola flutuante.",
    badge: "Paridade iFood",
    blocks: [
      {
        type: "vitrine_coupon_strip",
        styling: { paddingY: "none", mobilePaddingY: "sm" },
        config: {
          variant: "coupon",
          badge: "Clube de Cupons",
          title: "Você ganhou cupons de até R$ 25 off nos seus pedidos",
          subtitle: "Toque para resgatar na sacola.",
          couponCode: "IFOOD25",
          ctaLabel: "Ver Lojas",
          href: "#lojas",
          dismissible: true,
        },
      },
      {
        type: "vitrine_metamorphic_banner",
        styling: { paddingY: "sm", mobilePaddingY: "sm" },
        config: {
          sectionTitle: "",
          sectionSubtitle: "",
          dataSource: "manual",
          desktopAspectRatio: "slim",
          mobileAspectRatio: "cinema",
          autoPlay: true,
          intervalSeconds: 4,
          showArrows: true,
          showDots: true,
          rounded: "lg",
          slides: [
            {
              id: "ifd-slide-1",
              badge: "Clube de Vantagens",
              title: "Tudo com frete grátis e cupons de até R$ 30",
              subtitle: "Peça nos melhores restaurantes e estabelecimentos da cidade.",
              ctaLabel: "Pedir Agora",
              href: "#lojas",
              showOverlay: true,
            },
          ],
        },
      },
      {
        type: "vitrine_buttons_dock",
        styling: { paddingY: "sm", mobilePaddingY: "sm" },
        config: {
          sectionTitle: "Categorias",
          sectionSubtitle: "",
          dataSource: "manual",
          desktopLayout: "noor_dock",
          mobileLayout: "ifood_grid",
          desktopColumns: 6,
          mobileColumns: 4,
          defaultShape: "squircle",
          items: [
            { id: "ifd-c1", label: "Restaurantes", badge: "Novo", iconName: "ForkKnife", tone: "primary", href: "/gastronomia" },
            { id: "ifd-c2", label: "Mercados", iconName: "Storefront", tone: "neutral", href: "/mercado" },
            { id: "ifd-c3", label: "Farmácias", iconName: "Pill", tone: "neutral", href: "/farmacia" },
            { id: "ifd-c4", label: "Bebidas", iconName: "BeerBottle", tone: "neutral", href: "/bebidas" },
            { id: "ifd-c5", label: "Carnes", iconName: "Flame", tone: "neutral", href: "/acougue" },
            { id: "ifd-c6", label: "Pet Shop", iconName: "PawPrint", tone: "neutral", href: "/pet" },
          ],
        },
      },
      {
        type: "vitrine_product_shelf",
        styling: { paddingY: "md", mobilePaddingY: "sm" },
        config: {
          sectionTitle: "Mais Pedidos da Semana",
          sectionSubtitle: "Os pratos e produtos favoritos dos clientes com entrega rápida",
          viewAllLabel: "Ver Cardápio",
          viewAllHref: "#cardapio",
          dataSource: "store_products",
          maxItems: 8,
          desktopLayout: "horizontal_rail",
          mobileLayout: "horizontal_rail",
          items: [],
        },
      },
    ],
  },

  // 0A. SUPER VITRINE ESTILO APP WAESY (PARIDADE 100% COM A HOME DO APP)
  {
    id: "template_waesy_super_vitrine",
    name: "Super Vitrine Estilo App Waesy",
    niche: "storefront",
    description:
      "Estrutura completa idêntica ao aplicativo Waesy: faixa de cupom, banner metamórfico 28:9/16:9, dock/grade 4x2 de botões, malha Bento Tetris, vitrine de ofertas com card líder, carrossel vertical 9:16, classificados e feed social.",
    badge: "Idêntica ao App",
    blocks: [
      {
        type: "vitrine_coupon_strip",
        styling: { paddingY: "none", mobilePaddingY: "sm" },
        config: {
          variant: "coupon",
          badge: "Benefício Oficial",
          title: "Desconto especial no primeiro pedido direto na vitrine",
          subtitle: "Toque para copiar e usar no atendimento ou carrinho.",
          couponCode: "BEMVINDO10",
          ctaLabel: "Ver Ofertas",
          href: "#ofertas",
          dismissible: false,
        },
      },
      {
        type: "vitrine_metamorphic_banner",
        styling: { paddingY: "sm", mobilePaddingY: "sm" },
        config: {
          sectionTitle: "",
          sectionSubtitle: "",
          dataSource: "manual",
          desktopAspectRatio: "slim",
          mobileAspectRatio: "cinema",
          autoPlay: true,
          intervalSeconds: 5,
          showArrows: true,
          showDots: true,
          rounded: "lg",
          slides: [
            {
              id: "wsv-slide-1",
              badge: "Temporada Oficial",
              title: "Catálogo completo com entrega rápida e retirada imediata",
              subtitle: "Artes calibradas separadamente para celular (16:9) e computador (28:9).",
              ctaLabel: "Explorar Ofertas",
              href: "#ofertas",
              showOverlay: true,
            },
            {
              id: "wsv-slide-2",
              badge: "Atendimento Direto",
              title: "Condições exclusivas para pedidos e orçamentos hoje",
              subtitle: "Fale direto com nossa equipe sem intermediários.",
              ctaLabel: "Falar Agora",
              href: "#contato",
              showOverlay: true,
            },
          ],
        },
      },
      {
        type: "vitrine_buttons_dock",
        styling: { paddingY: "sm", mobilePaddingY: "sm" },
        config: {
          sectionTitle: "Acesso Rápido",
          sectionSubtitle: "",
          dataSource: "manual",
          desktopLayout: "noor_dock",
          mobileLayout: "ifood_grid",
          desktopColumns: 8,
          mobileColumns: 4,
          defaultShape: "squircle",
          items: [
            { id: "wsv-b1", label: "Ofertas", badge: "Hoje", iconName: "Tag", tone: "primary", href: "#ofertas" },
            { id: "wsv-b2", label: "Catálogo", iconName: "ShoppingBag", tone: "default", href: "#ofertas" },
            { id: "wsv-b3", label: "Reels", iconName: "Sparkles", tone: "accent", href: "#encartes" },
            { id: "wsv-b4", label: "Anúncios", iconName: "Car", tone: "default", href: "#anuncios" },
            { id: "wsv-b5", label: "Mural", iconName: "MessageCircle", tone: "default", href: "#novidades" },
            { id: "wsv-b6", label: "Agenda", iconName: "Calendar", tone: "default", href: "#eventos" },
            { id: "wsv-b7", label: "Entrega", iconName: "Zap", tone: "default", href: "#contato" },
            { id: "wsv-b8", label: "Contato", iconName: "MapPin", tone: "muted", href: "#contato" },
          ],
        },
      },
      {
        type: "vitrine_bento_tetris",
        styling: { paddingY: "sm", mobilePaddingY: "sm" },
        config: {
          sectionTitle: "Destaques da Semana",
          sectionSubtitle: "Malha Bento responsiva com fechamento geométrico exato.",
          desktopColumns: 4,
          mobileColumns: 2,
          tiles: [
            {
              id: "wsv-t1",
              tag: "Seleção Principal",
              title: "Linha Completa Pronta Entrega",
              subtitle: "Produtos selecionados com garantia oficial e estoque local.",
              ctaLabel: "Conferir Seleção",
              href: "#ofertas",
              spanX: 2,
              spanY: 2,
              mobileSpanX: 2,
            },
            {
              id: "wsv-t2",
              tag: "Novidades",
              title: "Bastidores & Encartes",
              subtitle: "Veja vídeos e ofertas em formato vertical.",
              ctaLabel: "Assistir",
              href: "#encartes",
              spanX: 2,
              spanY: 1,
              mobileSpanX: 1,
            },
            {
              id: "wsv-t3",
              tag: "Oportunidades",
              title: "Classificados & Serviços",
              subtitle: "Negociação transparente direto com nossa loja.",
              ctaLabel: "Ver Itens",
              href: "#anuncios",
              spanX: 2,
              spanY: 1,
              mobileSpanX: 1,
            },
          ],
        },
      },
      {
        type: "vitrine_product_shelf",
        sectionAnchorId: "ofertas",
        styling: { paddingY: "md", mobilePaddingY: "sm" },
        config: {
          sectionTitle: "Hits & Ofertas em Destaque",
          sectionSubtitle: "Sincronizado automaticamente com os produtos ativos da sua loja.",
          viewAllLabel: "Falar com Consultor",
          viewAllHref: "#contato",
          dataSource: "store_products",
          categoryFilter: "all",
          onlyPromotions: false,
          maxItems: 8,
          cardAspect: "4_3",
          ctaLabel: "Ver Oferta",
          desktopLayout: "horizontal_rail",
          mobileLayout: "horizontal_rail",
          leadCard: {
            enabled: true,
            badge: "Seleção Oficial",
            title: "Escolhidos da Semana",
            subtitle: "Os itens mais procurados pelos clientes da cidade.",
            actionLabel: "Solicitar Pedido",
            href: "#contato",
          },
          items: [],
        },
      },
      {
        type: "vitrine_vertical_carousel",
        sectionAnchorId: "encartes",
        styling: { paddingY: "md", mobilePaddingY: "sm", surfacePreset: "muted" },
        config: {
          sectionTitle: "Stories, Reels & Encartes",
          sectionSubtitle: "Toque em qualquer card vertical para abrir em tela cheia.",
          dataSource: "manual",
          desktopFormat: "stories_9_16",
          mobileFormat: "stories_9_16",
          items: [
            {
              id: "wsv-v1",
              badge: "Bastidores",
              title: "Preparação diária com padrão de qualidade",
              subtitle: "Conheça nossa operação por dentro.",
              ctaLabel: "Ver Ofertas",
              href: "#ofertas",
            },
            {
              id: "wsv-v2",
              badge: "Oferta Relâmpago",
              title: "Seleção especial com condição exclusiva hoje",
              subtitle: "Estoque limitado para pedidos diretos.",
              priceCents: 9990,
              ctaLabel: "Reservar Agora",
              href: "#contato",
            },
            {
              id: "wsv-v3",
              badge: "Como Pedir",
              title: "Receba em casa ou retire sem fila na loja",
              subtitle: "Atendimento ágil pelo WhatsApp.",
              ctaLabel: "Chamar Equipe",
              href: "#contato",
            },
            {
              id: "wsv-v4",
              badge: "Novidade",
              title: "Lançamentos recém-chegados na vitrine",
              subtitle: "Atualizado toda semana.",
              ctaLabel: "Explorar",
              href: "#ofertas",
            },
          ],
        },
      },
      {
        type: "vitrine_classifieds_rail",
        sectionAnchorId: "anuncios",
        styling: { paddingY: "md", mobilePaddingY: "sm" },
        config: {
          sectionTitle: "Classificados & Oportunidades",
          sectionSubtitle: "Conectado aos anúncios publicados pela conta.",
          viewAllLabel: "Solicitar Avaliação",
          viewAllHref: "#contato",
          dataSource: "store_classifieds",
          nicheFilter: "all",
          maxItems: 8,
          ctaLabel: "Ver Anúncio",
          desktopLayout: "horizontal_rail",
          mobileLayout: "horizontal_rail",
          items: [],
        },
      },
      {
        type: "vitrine_social_stream",
        sectionAnchorId: "novidades",
        styling: { paddingY: "md", mobilePaddingY: "sm", surfacePreset: "muted" },
        config: {
          sectionTitle: "Mural & Atualizações",
          sectionSubtitle: "Publicações recentes e avisos oficiais.",
          viewAllLabel: "",
          viewAllHref: "",
          dataSource: "store_posts",
          maxItems: 6,
          desktopLayout: "carousel_3col",
          mobileLayout: "carousel",
          items: [],
        },
      },
      {
        type: "vitrine_ecosystem_rail",
        sectionAnchorId: "eventos",
        styling: { paddingY: "md", mobilePaddingY: "sm" },
        config: {
          sectionTitle: "Agenda & Programação",
          sectionSubtitle: "Eventos e ações especiais confirmadas.",
          viewAllLabel: "",
          viewAllHref: "",
          moduleType: "events",
          dataSource: "live",
          maxItems: 6,
          desktopLayout: "horizontal_rail",
          mobileLayout: "horizontal_rail",
          items: [],
        },
      },
      {
        type: "contact_form_direct",
        sectionAnchorId: "contato",
        config: {
          title: "Atendimento Direto & Pedidos",
          subtitle: "Envie sua mensagem e receba retorno rápido da nossa equipe pelo WhatsApp.",
          submitButtonText: "Iniciar Atendimento",
          whatsappNumber: "5549999998888",
          showPhoneField: true,
          showMessageField: true,
          successMessage: "Mensagem recebida! Retornaremos em instantes.",
        },
      },
    ],
  },

  // 0B. DELIVERY & MERCADO EXPRESS (ESTILO IFOOD / CONVENIÊNCIA)
  {
    id: "template_ifood_delivery_vitrine",
    name: "Delivery & Mercado Express (Estilo App)",
    niche: "gastronomy",
    description:
      "Layout inspirado no iFood e mercados expressos: pílulas duplas de logística, ticket de cupom, banner panorâmico 21:9, grade 4x2 de departamentos no mobile, trilho de promoções, encartes 3:4 e cardápio ágil.",
    badge: "Delivery App",
    blocks: [
      {
        type: "vitrine_buttons_dock",
        styling: { paddingY: "none", mobilePaddingY: "sm" },
        config: {
          sectionTitle: "",
          sectionSubtitle: "",
          dataSource: "manual",
          desktopLayout: "dual_filter_pills",
          mobileLayout: "dual_filter_pills",
          desktopColumns: 4,
          mobileColumns: 2,
          defaultShape: "pill",
          items: [
            {
              id: "ifd-p1",
              label: "Entrega Expressa",
              subtitle: "Pedido direto sem taxas ocultas",
              badge: "Rápido",
              iconName: "Zap",
              tone: "primary",
              href: "#combos",
            },
            {
              id: "ifd-p2",
              label: "Retirada no Balcão",
              subtitle: "Peça online e retire sem fila",
              iconName: "Store",
              tone: "default",
              href: "#horarios",
            },
          ],
        },
      },
      {
        type: "vitrine_coupon_strip",
        styling: { paddingY: "none", mobilePaddingY: "sm" },
        config: {
          variant: "coupon",
          badge: "Cupom Delivery",
          title: "Use o cupom na finalização do seu pedido hoje",
          subtitle: "Válido para pedidos diretos na vitrine.",
          couponCode: "PEDIDO10",
          ctaLabel: "Ir ao Cardápio",
          href: "#cardapio",
          dismissible: false,
        },
      },
      {
        type: "vitrine_metamorphic_banner",
        styling: { paddingY: "sm", mobilePaddingY: "sm" },
        config: {
          sectionTitle: "",
          sectionSubtitle: "",
          dataSource: "manual",
          desktopAspectRatio: "ifood",
          mobileAspectRatio: "ifood",
          autoPlay: true,
          intervalSeconds: 5,
          showArrows: true,
          showDots: true,
          rounded: "lg",
          slides: [
            {
              id: "ifd-s1",
              badge: "Combos do Dia",
              title: "Sabor artesanal preparado na hora para você",
              subtitle: "Confira os combinados promocionais e bebidas geladas.",
              ctaLabel: "Pedir Combo",
              href: "#combos",
              showOverlay: true,
            },
          ],
        },
      },
      {
        type: "vitrine_buttons_dock",
        styling: { paddingY: "sm", mobilePaddingY: "sm" },
        config: {
          sectionTitle: "Departamentos",
          sectionSubtitle: "",
          dataSource: "hybrid",
          desktopLayout: "noor_dock",
          mobileLayout: "ifood_grid",
          desktopColumns: 8,
          mobileColumns: 4,
          defaultShape: "squircle",
          items: [
            { id: "ifd-c1", label: "Combos", badge: "Top", iconName: "Tag", tone: "primary", href: "#combos" },
            { id: "ifd-c2", label: "Pratos", iconName: "Utensils", tone: "default", href: "#cardapio" },
            { id: "ifd-c3", label: "Bebidas", iconName: "Coffee", tone: "default", href: "#cardapio" },
            { id: "ifd-c4", label: "Doces", iconName: "Gift", tone: "default", href: "#cardapio" },
            { id: "ifd-c5", label: "Encartes", iconName: "Ticket", tone: "accent", href: "#encartes" },
            { id: "ifd-c6", label: " Favoritos", iconName: "Heart", tone: "default", href: "#combos" },
            { id: "ifd-c7", label: "Horários", iconName: "Calendar", tone: "default", href: "#horarios" },
            { id: "ifd-c8", label: "WhatsApp", iconName: "MessageCircle", tone: "muted", href: "#horarios" },
          ],
        },
      },
      {
        type: "vitrine_product_shelf",
        sectionAnchorId: "combos",
        styling: { paddingY: "sm", mobilePaddingY: "sm" },
        config: {
          sectionTitle: "Destaques & Promoções",
          sectionSubtitle: "Seleção rápida para adicionar ao pedido.",
          viewAllLabel: "Cardápio Completo",
          viewAllHref: "#cardapio",
          dataSource: "store_products",
          categoryFilter: "all",
          onlyPromotions: false,
          maxItems: 8,
          cardAspect: "square",
          ctaLabel: "Pedir Agora",
          desktopLayout: "grid_4col",
          mobileLayout: "horizontal_rail",
          items: [],
        },
      },
      {
        type: "vitrine_vertical_carousel",
        sectionAnchorId: "encartes",
        styling: { paddingY: "sm", mobilePaddingY: "sm", surfacePreset: "muted" },
        config: {
          sectionTitle: "Encartes & Ofertas da Semana",
          sectionSubtitle: "Sincronizado com os encartes promocionais ativos da loja.",
          dataSource: "store_flyers",
          desktopFormat: "flyer_3_4",
          mobileFormat: "flyer_3_4",
          items: [],
        },
      },
      {
        type: "food_menu_streamlined",
        sectionAnchorId: "cardapio",
        config: {
          sectionTitle: "Cardápio Completo",
          sectionSubtitle: "Itens sincronizados diretamente com o catálogo da operação.",
          categories: [],
        },
      },
      {
        type: "restaurant_hours_delivery",
        sectionAnchorId: "horarios",
        config: {
          storeName: "Operação Delivery Oficial",
          openingHoursText: "Terça a Domingo: 18h00 às 23h30",
          deliveryTimeEstimate: "30 a 45 min",
          pickupAvailable: true,
          address: "Consulte área de entrega na sua região",
          whatsappNumber: "5549999998888",
        },
      },
    ],
  },

  // 0C. PORTAL DE VEÍCULOS, IMÓVEIS & CLASSIFICADOS MULTI-NICHO
  {
    id: "template_classifieds_portal_vitrine",
    name: "Portal de Veículos, Imóveis & Classificados",
    niche: "classifieds",
    description:
      "Ideal para revendas automotivas, imobiliárias e portais de oportunidades: banner Duo Split no desktop (16:9 no mobile), chips de filtro, vitrines isoladas por nicho sem vazamento de campos e captação de avaliação.",
    badge: "Multi-Nicho",
    blocks: [
      {
        type: "vitrine_metamorphic_banner",
        styling: { paddingY: "sm", mobilePaddingY: "sm" },
        config: {
          sectionTitle: "",
          sectionSubtitle: "",
          dataSource: "manual",
          desktopAspectRatio: "duo",
          mobileAspectRatio: "cinema",
          autoPlay: true,
          intervalSeconds: 6,
          showArrows: true,
          showDots: true,
          rounded: "lg",
          slides: [
            {
              id: "cpv-s1",
              badge: "Estoque Selecionado",
              title: "Veículos revisados com procedência e laudo cautelar",
              subtitle: "Financiamento assistido e avaliação justa na troca.",
              ctaLabel: "Ver Veículos",
              href: "#veiculos",
              showOverlay: true,
            },
            {
              id: "cpv-s2",
              badge: "Patrimônio & Locação",
              title: "Imóveis residenciais e comerciais nas melhores regiões",
              subtitle: "Atendimento consultivo com visita agendada.",
              ctaLabel: "Ver Imóveis",
              href: "#imoveis",
              showOverlay: true,
            },
          ],
        },
      },
      {
        type: "vitrine_buttons_dock",
        styling: { paddingY: "sm", mobilePaddingY: "sm" },
        config: {
          sectionTitle: "",
          sectionSubtitle: "",
          dataSource: "manual",
          desktopLayout: "squircle_pills",
          mobileLayout: "squircle_pills",
          desktopColumns: 6,
          mobileColumns: 3,
          defaultShape: "pill",
          items: [
            { id: "cpv-b1", label: "Veículos", iconName: "Car", tone: "primary", href: "#veiculos" },
            { id: "cpv-b2", label: "Imóveis", iconName: "Home", tone: "default", href: "#imoveis" },
            { id: "cpv-b3", label: "Parceiros", iconName: "ShieldCheck", tone: "default", href: "#parceiros" },
            { id: "cpv-b4", label: "Vender / Avaliar", iconName: "Tag", tone: "accent", href: "#avaliacao" },
          ],
        },
      },
      {
        type: "vitrine_classifieds_rail",
        sectionAnchorId: "veiculos",
        styling: { paddingY: "md", mobilePaddingY: "sm" },
        config: {
          sectionTitle: "Estoque Automotivo",
          sectionSubtitle: "Especificações técnicas exibidas na íntegra sem truncamento.",
          viewAllLabel: "Avaliar meu usado",
          viewAllHref: "#avaliacao",
          dataSource: "store_classifieds",
          nicheFilter: "vehicles",
          maxItems: 9,
          ctaLabel: "Ver Detalhes",
          desktopLayout: "grid_3col",
          mobileLayout: "horizontal_rail",
          items: [],
        },
      },
      {
        type: "vitrine_classifieds_rail",
        sectionAnchorId: "imoveis",
        styling: { paddingY: "md", mobilePaddingY: "sm", surfacePreset: "muted" },
        config: {
          sectionTitle: "Carteira de Imóveis",
          sectionSubtitle: "Casas, apartamentos, terrenos e salas comerciais.",
          viewAllLabel: "Agendar Visita",
          viewAllHref: "#avaliacao",
          dataSource: "store_classifieds",
          nicheFilter: "real_estate",
          maxItems: 8,
          ctaLabel: "Conhecer Imóvel",
          desktopLayout: "horizontal_rail",
          mobileLayout: "grid_2col",
          items: [],
        },
      },
      {
        type: "vitrine_ecosystem_rail",
        sectionAnchorId: "parceiros",
        styling: { paddingY: "md", mobilePaddingY: "sm" },
        config: {
          sectionTitle: "Lojas & Operações Verificadas",
          sectionSubtitle: "Empresas conectadas à rede local.",
          viewAllLabel: "",
          viewAllHref: "",
          moduleType: "stores",
          dataSource: "live",
          maxItems: 6,
          desktopLayout: "horizontal_rail",
          mobileLayout: "horizontal_rail",
          items: [],
        },
      },
      {
        type: "contact_form_direct",
        sectionAnchorId: "avaliacao",
        config: {
          title: "Solicitar Proposta ou Avaliação",
          subtitle: "Informe o veículo ou imóvel de interesse para atendimento imediato.",
          submitButtonText: "Enviar Solicitação",
          whatsappNumber: "5549999997777",
          showPhoneField: true,
          showMessageField: true,
          successMessage: "Solicitação registrada! Um especialista entrará em contato.",
        },
      },
    ],
  },

  // 0D. VITRINE SOCIAL, REELS & LOJA DE CRIADOR
  {
    id: "template_social_creator_store",
    name: "Vitrine Social, Reels & Loja Oficial",
    niche: "creator_commerce",
    description:
      "Conecta presença social, vídeos verticais 9:16 (Stories Ring no desktop e Reels no mobile), cards táteis de ação 2x2, vitrine 1:1 de produtos e mural editorial.",
    badge: "Creator & Loja",
    blocks: [
      {
        type: "biolink_profile_header",
        config: {
          displayName: "Estúdio & Loja Oficial",
          handle: "@lojaoficial",
          bio: "Curadoria autoral, lançamentos semanais, bastidores em vídeo e atendimento direto.",
          statusBadge: "Online Agora",
          verified: true,
        },
      },
      {
        type: "vitrine_buttons_dock",
        styling: { paddingY: "sm", mobilePaddingY: "sm" },
        config: {
          sectionTitle: "",
          sectionSubtitle: "",
          dataSource: "manual",
          desktopLayout: "action_cards",
          mobileLayout: "action_cards",
          desktopColumns: 4,
          mobileColumns: 2,
          defaultShape: "squircle",
          items: [
            {
              id: "scs-a1",
              label: "Loja Oficial",
              subtitle: "Coleção disponível",
              badge: "Novo",
              iconName: "ShoppingBag",
              tone: "primary",
              href: "#loja",
            },
            {
              id: "scs-a2",
              label: "Reels & Vídeos",
              subtitle: "Bastidores em 9:16",
              iconName: "Sparkles",
              tone: "accent",
              href: "#bastidores",
            },
            {
              id: "scs-a3",
              label: "Publicações",
              subtitle: "Notas e atualizações",
              iconName: "MessageCircle",
              tone: "default",
              href: "#publicacoes",
            },
            {
              id: "scs-a4",
              label: "Parcerias & Contato",
              subtitle: "Fale com a assessoria",
              iconName: "Briefcase",
              tone: "default",
              href: "#parcerias",
            },
          ],
        },
      },
      {
        type: "vitrine_vertical_carousel",
        sectionAnchorId: "bastidores",
        styling: { paddingY: "sm", mobilePaddingY: "sm" },
        config: {
          sectionTitle: "Destaques em Vídeo",
          sectionSubtitle: "Anéis de Stories no computador e carrossel Reels 9:16 no celular.",
          dataSource: "manual",
          desktopFormat: "stories_ring",
          mobileFormat: "stories_9_16",
          items: [
            {
              id: "scs-v1",
              badge: "Coleção",
              title: "Novidades da Semana",
              subtitle: "Confira os detalhes de acabamento.",
              ctaLabel: "Ver na Loja",
              href: "#loja",
            },
            {
              id: "scs-v2",
              badge: "Bastidores",
              title: "Processo Criativo",
              subtitle: "Como produzimos cada peça.",
              ctaLabel: "Ler Mais",
              href: "#publicacoes",
            },
            {
              id: "scs-v3",
              badge: "Envios",
              title: "Entrega em Todo o País",
              subtitle: "Embalagem segura e código de rastreio.",
              ctaLabel: "Falar Agora",
              href: "#parcerias",
            },
          ],
        },
      },
      {
        type: "vitrine_product_shelf",
        sectionAnchorId: "loja",
        styling: { paddingY: "md", mobilePaddingY: "sm", surfacePreset: "muted" },
        config: {
          sectionTitle: "Produtos Oficiais",
          sectionSubtitle: "Grade quadrada 1:1 no estilo vitrine social.",
          viewAllLabel: "",
          viewAllHref: "",
          dataSource: "store_products",
          categoryFilter: "all",
          onlyPromotions: false,
          maxItems: 8,
          cardAspect: "square",
          ctaLabel: "Comprar",
          desktopLayout: "grid_4col",
          mobileLayout: "grid_2col",
          items: [],
        },
      },
      {
        type: "vitrine_social_stream",
        sectionAnchorId: "publicacoes",
        styling: { paddingY: "md", mobilePaddingY: "sm" },
        config: {
          sectionTitle: "Publicações Recentes",
          sectionSubtitle: "Mural em grade no desktop e linha do tempo contínua no celular.",
          viewAllLabel: "",
          viewAllHref: "",
          dataSource: "manual",
          maxItems: 6,
          desktopLayout: "grid_3col",
          mobileLayout: "stream",
          items: [
            {
              id: "scs-p1",
              authorName: "Estúdio Oficial",
              authorHandle: "@lojaoficial",
              isVerified: true,
              publishedLabel: "Hoje",
              content:
                "Acabamos de liberar a nova reposição na vitrine oficial com envio rápido para toda a região.",
              mediaType: "none",
              ctaLabel: "Ver Produtos",
              href: "#loja",
            },
            {
              id: "scs-p2",
              authorName: "Estúdio Oficial",
              authorHandle: "@lojaoficial",
              isVerified: true,
              publishedLabel: "Ontem",
              content:
                "Para pedidos personalizados, kits corporativos e parcerias, chame diretamente pelo formulário abaixo.",
              mediaType: "none",
              ctaLabel: "Entrar em Contato",
              href: "#parcerias",
            },
          ],
        },
      },
      {
        type: "contact_form_direct",
        sectionAnchorId: "parcerias",
        config: {
          title: "Atendimento & Parcerias",
          subtitle: "Fale diretamente com nossa equipe comercial.",
          submitButtonText: "Enviar Mensagem",
          whatsappNumber: "5549999996666",
          showPhoneField: true,
          showMessageField: true,
          successMessage: "Mensagem enviada com sucesso!",
        },
      },
    ],
  },
  // 1. ADVOCACIA & JURÍDICO (LEGAL JUS)
  {
    id: "template_legal_jus",
    name: "Advocacia & Jurídico",
    niche: "legal",
    description: "Design sóbrio para escritórios de advocacia, consultores e assessores.",
    badge: "Jurídico",
    blocks: [
      {
        type: "hero_minimal_split",
        config: {
          badgeText: "SOCIEDADE DE ADVOGADOS • OAB/SP 12.345",
          title: "Defesa estratégica de direitos com rigor técnico e discrição absoluta.",
          subtitle: "Atuação consultiva e contenciosa especializada em Direito Civil, Empresarial e Tributário para pessoas físicas e jurídicas.",
          primaryCta: {
            label: "Agendar Consulta",
            href: "#contato",
          },
          secondaryCta: {
            label: "Áreas de Atuação",
            href: "#areas",
          },
          floatingStat: {
            label: "SEGURANÇA JURÍDICA",
            value: "20+ Anos de Prática",
            statusDot: true,
          },
        },
      },
      {
        type: "bento_asymmetric_4",
        config: {
          sectionTitle: "Áreas de Atuação e Práticas Especializadas",
          sectionSubtitle: "Soluções estruturadas para mitigação de riscos e resolução célere de litígios.",
          cells: [
            {
              id: "c-1",
              tag: "EMPRESARIAL",
              title: "Contratos & Fusões",
              description: "Elaboração de acordos societários, due diligence e governança corporativa.",
              colSpan: 2,
            },
            {
              id: "c-2",
              tag: "TRIBUTÁRIO",
              title: "Planejamento Fiscal",
              description: "Recuperação de créditos tributários e defesa em autos de infração.",
              colSpan: 1,
            },
            {
              id: "c-3",
              tag: "PATRIMONIAL",
              title: "Proteção Familiar",
              description: "Holdings familiares, inventários e sucessão planejada sem desgastes.",
              colSpan: 1,
            },
            {
              id: "c-4",
              tag: "CONTENCIOSO",
              title: "Tribunais Superiores",
              description: "Sustentações orais e recursos estratégicos em instâncias recursais.",
              colSpan: 2,
            },
          ],
        },
      },
      {
        type: "testimonials_social_proof",
        config: {
          title: "Reconhecimento & Confiança",
          subtitle: "O que dizem os clientes que defendemos em momentos decisivos.",
          testimonials: [
            {
              id: "t-1",
              name: "Eduardo Chapeco",
              role: "CEO na Vanguarda Agro",
              rating: 5,
              comment: "A condução do processo societário foi exemplar. Clareza em cada parecer e segurança inabalável em juízo.",
              verified: true,
            },
            {
              id: "t-2",
              name: "Beatriz Nogueira",
              role: "Diretora na Logística Sul",
              rating: 5,
              comment: "Economizamos milhões com a reestruturação tributária desenhada pela banca. Parceiros indispensáveis.",
              verified: true,
            },
          ],
        },
      },
      {
        type: "faq_clean_accordion",
        config: {
          title: "Dúvidas Frequentes",
          subtitle: "Orientações iniciais sobre o atendimento e sigilo profissional.",
          items: [
            {
              id: "f-1",
              question: "Como funciona a primeira consulta de avaliação?",
              answer: "A consulta inicial pode ser presencial ou online com criptografia ponta a ponta. Analisamos os documentos e emitimos um parecer de viabilidade preliminar.",
            },
            {
              id: "f-2",
              question: "Os contratos e procurações são assinados digitalmente?",
              answer: "Sim. Utilizamos assinaturas digitais com selo de evidências SHA-256 e conformidade ICP-Brasil, sem necessidade de deslocamento físico.",
            },
          ],
        },
      },
      {
        type: "contact_form_direct",
        config: {
          title: "Solicite um Contato Sigiloso",
          subtitle: "Nossa equipe jurídica responderá com total discrição e presteza.",
          submitButtonText: "Solicitar Atendimento",
          whatsappNumber: "5511999998888",
          successMessage: "Recebemos sua mensagem. Um advogado especialista entrará em contato em breve.",
        },
      },
    ],
  },

  // 2. GASTRONOMIA & RESTAURANTES (FOOD & DRINKS)
  {
    id: "template_gastronomy",
    name: "Gastronomia Autoral & Restaurante",
    niche: "gastronomy",
    description: "Visual apetitoso, cardápio digital, reservas de mesa e entrega expressa.",
    badge: "Restaurantes",
    blocks: [
      {
        type: "hero_minimal_split",
        config: {
          badgeText: "COZINHA ARTESANAL • ABERTO AGORA",
          title: "Sabores autênticos que despertam memórias inesquecíveis.",
          subtitle: "Ingredientes frescos de produtores locais, receitas autorais e uma carta de vinhos selecionada com carinho.",
          primaryCta: {
            label: "Ver Cardápio & Pedir",
            href: "#cardapio",
          },
          secondaryCta: {
            label: "Reservar Mesa",
            href: "#reserva",
          },
          imageUrl: "",
          floatingStat: {
            label: "TEMPO MÉDIO DE ENTREGA",
            value: "28 Minutos",
            statusDot: true,
          },
        },
      },
      {
        type: "media_gallery_mosaic",
        config: {
          title: "Nossa Experiência Gastronômica",
          subtitle: "Pratos icônicos, ambiente acolhedor e detalhes pensados para você.",
          layout: "mosaic",
          items: [
            {
              id: "g-1",
              imageUrl: "",
              title: "Prato Principal do Chef",
              caption: "Ingredientes sazonais colhidos no mesmo dia",
            },
            {
              id: "g-2",
              imageUrl: "",
              title: "Ambiente do Salão",
              caption: "Música ambiente suave e iluminação intimista",
            },
            {
              id: "g-3",
              imageUrl: "",
              title: "Carta de Vinhos",
              caption: "Rótulos artesanais de pequenas vinícolas",
            },
            {
              id: "g-4",
              imageUrl: "",
              title: "Sobremesas Finas",
              caption: "Finalize sua experiência com maestria",
            },
          ],
        },
      },
      {
        type: "testimonials_social_proof",
        config: {
          title: "Elogios de Quem Saboreou",
          subtitle: "A opinião espontânea de clientes que frequentam nosso salão.",
          testimonials: [
            {
              id: "t-1",
              name: "Juliana Camargo",
              role: "Crítica Gastronômica",
              rating: 5,
              comment: "O ponto da carne e o equilíbrio dos temperos são perfeitos. Sem dúvida o melhor restaurante da cidade.",
              verified: true,
            },
            {
              id: "t-2",
              name: "Marcelo Rossi",
              role: "Cliente Frequente",
              rating: 5,
              comment: "Atendimento impecável e entrega ultrarrápida no delivery. O prato chega quentinho como se saísse da cozinha agora.",
              verified: true,
            },
          ],
        },
      },
      {
        type: "contact_form_direct",
        config: {
          title: "Reserve Sua Mesa ou Evento Privado",
          subtitle: "Garanta seu lugar sem filas ou solicite um orçamento para comemorações.",
          submitButtonText: "Solicitar Reserva",
          whatsappNumber: "5511999998888",
          successMessage: "Reserva solicitada! Entraremos em contato via WhatsApp para confirmar seu horário.",
        },
      },
    ],
  },

  // 3. TURISMO & VIAGENS (TRAVEL & TOURS)
  {
    id: "template_tourism",
    name: "Turismo & Viagens",
    niche: "tourism",
    description: "Destinos, cotações de passagens e pacotes com assinatura digital.",
    badge: "Turismo",
    blocks: [
      {
        type: "hero_minimal_split",
        config: {
          badgeText: "ROTEIROS 2027 • TEMPORADA ABERTA",
          title: "Descubra o mundo com roteiros desenhados exclusivamente para você.",
          subtitle: "Viagens personalizadas, excursões com guias credenciados, resorts de luxo e suporte 24h em cada etapa da sua jornada.",
          primaryCta: {
            label: "Solicitar Cotação Grátis",
            href: "#cotacao",
          },
          secondaryCta: {
            label: "Ver Destinos Populares",
            href: "#destinos",
          },
          imageUrl: "",
          floatingStat: {
            label: "PASSAGEIROS EMBARCADOS",
            value: "14.200+",
            statusDot: true,
          },
        },
      },
      {
        type: "media_gallery_mosaic",
        config: {
          title: "Destinos & Experiências Inspiradoras",
          subtitle: "Paisagens arrebatadoras que esperam por você nas próximas férias.",
          layout: "mosaic",
          items: [
            {
              id: "g-1",
              imageUrl: "",
              title: "Praias Paradisíacas",
              caption: "Resorts all-inclusive com vista para o mar",
            },
            {
              id: "g-2",
              imageUrl: "",
              title: "Montanhas & Ecoturismo",
              caption: "Trilhas deslumbrantes e ar puro",
            },
            {
              id: "g-3",
              imageUrl: "",
              title: "Cidades Históricas",
              caption: "Cultura, gastronomia e arquitetura clássica",
            },
            {
              id: "g-4",
              imageUrl: "",
              title: "Excursões Rodoviárias",
              caption: "Ônibus leito com conforto de primeira classe",
            },
          ],
        },
      },
      {
        type: "pricing_three_tiers",
        config: {
          title: "Pacotes em Destaque",
          subtitle: "Parcelamento facilitado em até 12x sem juros no cartão ou carnê da agência.",
          tiers: [
            {
              id: "tier-1",
              name: "Final de Semana Serra",
              priceMonthlyCents: 89000,
              description: "3 Dias e 2 Noites em chalé com lareira e café colonial.",
              features: ["Transporte Executivo Ida/Volta", "Hospedagem com Café da Manhã", "Guia Regional Cadastur", "Seguro Viagem Completo"],
              ctaLabel: "Reservar Vaga",
            },
            {
              id: "tier-2",
              name: "Férias no Nordeste",
              priceMonthlyCents: 249000,
              isPopular: true,
              badge: "Mais Vendido",
              description: "7 Dias em Resort All-Inclusive beira-mar com voos inclusos.",
              features: ["Aéreo Ida e Volta com Bagagem", "Resort All-Inclusive", "Transfer Aeroporto/Hotel", "Passeio de Barco Incluso"],
              ctaLabel: "Garantir Pacote",
            },
            {
              id: "tier-3",
              name: "Circuito Europa Clássica",
              priceMonthlyCents: 890000,
              description: "12 Dias conhecendo Paris, Roma e Madri com guia em português.",
              features: ["Passagens Aéreas Internacionais", "Hotéis 4 Estrelas Centrais", "Trens de Alta Velocidade", "City Tours Exclusivos"],
              ctaLabel: "Consultar Datas",
            },
          ],
        },
      },
      {
        type: "contact_form_direct",
        config: {
          title: "Solicite Sua Lâmina Personalizada de Viagem",
          subtitle: "Diga para onde deseja ir e enviaremos um roteiro sob medida em seu WhatsApp.",
          submitButtonText: "Receber Roteiro no WhatsApp",
          whatsappNumber: "5511999998888",
          successMessage: "Perfeito! Nossos consultores de viagem já estão preparando sua cotação.",
        },
      },
    ],
  },

  // 4. CRIADORES, INFOPRODUTOS & MENTORIAS
  {
    id: "template_creators",
    name: "Criadores & Cursos",
    niche: "creators",
    description: "Alta conversão para cursos, mentorias e infoprodutos.",
    badge: "Infoprodutos",
    blocks: [
      {
        type: "hero_minimal_split",
        config: {
          badgeText: "NOVA TURMA ABERTA • VAGAS LIMITADAS",
          title: "Domine as habilidades certas e transforme conhecimento em receita previsível.",
          subtitle: "Um método direto e sem enrolação, validado por centenas de profissionais do mercado digital.",
          primaryCta: {
            label: "Garantir Minha Vaga",
            href: "#planos",
          },
          secondaryCta: {
            label: "Conhecer a Metodologia",
            href: "#metodologia",
          },
          floatingStat: {
            label: "ALUNOS CERTIFICADOS",
            value: "3.840+",
            statusDot: true,
          },
        },
      },
      {
        type: "bento_asymmetric_4",
        config: {
          sectionTitle: "O Que Você Vai Conquistar Dentro do Treinamento",
          sectionSubtitle: "Um passo a passo estruturado para tirar sua ideia do papel e escalar sua operação.",
          cells: [
            {
              id: "c-1",
              tag: "MÓDULO 01",
              title: "Fundamentos & Posicionamento",
              description: "Como criar uma oferta irresistível e atrair os clientes certos sem gastar rios de dinheiro.",
              colSpan: 2,
            },
            {
              id: "c-2",
              tag: "MÓDULO 02",
              title: "Funis de Vendas",
              description: "Páginas de captura e checkout com alta conversão.",
              colSpan: 1,
            },
            {
              id: "c-3",
              tag: "MÓDULO 03",
              title: "Tráfego & Anúncios",
              description: "Estratégias validadas para Meta Ads e Google Ads.",
              colSpan: 1,
            },
            {
              id: "c-4",
              tag: "COMUNIDADE",
              title: "Mentoria Semanal ao Vivo",
              description: "Tire dúvidas diretamente com os instrutores e faça networking de alto nível.",
              colSpan: 2,
            },
          ],
        },
      },
      {
        type: "pricing_three_tiers",
        config: {
          title: "Escolha Seu Nível de Acesso",
          subtitle: "Garantia incondicional de 7 dias. Se não gostar, devolvemos 100% do seu dinheiro.",
          tiers: [
            {
              id: "starter",
              name: "Acesso Essencial",
              priceMonthlyCents: 49700,
              description: "Ideal para quem quer aprender no próprio ritmo.",
              features: ["Acesso a todas as aulas gravadas", "Materiais de apoio e planilhas", "Certificado de conclusão", "1 Ano de Acesso"],
              ctaLabel: "Entrar no Essencial",
            },
            {
              id: "pro",
              name: "Mentoria VIP",
              badge: "Mais Procurado",
              isPopular: true,
              priceMonthlyCents: 99700,
              description: "Para quem busca aceleração rápida com acompanhamento próximo.",
              features: ["Tudo do plano Essencial", "Encontros quinzenais pelo Zoom", "Grupo exclusivo de networking", "Revisão individual de projetos"],
              ctaLabel: "Garantir Vaga na Mentoria",
            },
          ],
        },
      },
      {
        type: "faq_clean_accordion",
        config: {
          title: "Perguntas Frequentes",
          subtitle: "Tudo o que você precisa saber antes de se inscrever.",
          items: [
            {
              id: "f-1",
              question: "Por quanto tempo terei acesso ao conteúdo?",
              answer: "Você terá acesso integral por 12 meses a todas as aulas gravadas e às futuras atualizações do curso.",
            },
            {
              id: "f-2",
              question: "Como funciona a garantia incondicional de 7 dias?",
              answer: "Se por qualquer motivo você achar que o treinamento não é para você, basta solicitar o reembolso em 1 clique e devolveremos seu valor integral.",
            },
          ],
        },
      },
    ],
  },

  // 5. IMOBILIÁRIA & LOCAÇÕES DE ALTO PADRÃO
  {
    id: "template_real_estate",
    name: "Imóveis & Temporada",
    niche: "real_estate",
    description: "Apresentação visual para corretores e locações por temporada.",
    badge: "Imobiliária",
    blocks: [
      {
        type: "hero_minimal_split",
        config: {
          badgeText: "LANÇAMENTOS EXCLUSIVOS • SANTA CATARINA & LITORAL",
          title: "Empreendimentos arquitetônicos que redefinem o viver bem.",
          subtitle: "Curadoria rigorosa de coberturas, residências de praia e studios de alta rentabilidade com atendimento concierge.",
          primaryCta: {
            label: "Ver Catálogo Prime",
            href: "#galeria",
          },
          secondaryCta: {
            label: "Falar com Corretor",
            href: "#contato",
          },
          floatingStat: {
            label: "VALORIZAÇÃO MÉDIA",
            value: "+24.8% a.a.",
            statusDot: true,
          },
        },
      },
      {
        type: "media_gallery_mosaic",
        config: {
          title: "Portfólio de Residências Selecionadas",
          subtitle: "Explore os detalhes de acabamento, localização privilegiada e vista panorâmica.",
          layout: "mosaic",
          items: [
            {
              id: "imv-1",
              imageUrl: "",
              title: "Villa Solarium",
              caption: "4 Suítes • Vista Mar • Piscina Aquecida",
            },
            {
              id: "imv-2",
              imageUrl: "",
              title: "Penthouse Infinity",
              caption: "Design assinado e rooftop privativo",
            },
            {
              id: "imv-3",
              imageUrl: "",
              title: "Reserva das Araucárias",
              caption: "Chácara urbana com área verde preservada",
            },
            {
              id: "imv-4",
              imageUrl: "",
              title: "Studio Horizon",
              caption: "Ideal para Airbnb e locação executiva",
            },
          ],
        },
      },
      {
        type: "bento_asymmetric_4",
        config: {
          sectionTitle: "Diferenciais do Nosso Atendimento Imobiliário",
          sectionSubtitle: "Segurança jurídica e consultoria patrimonial de ponta a ponta.",
          cells: [
            {
              id: "imb-1",
              tag: "DUE DILIGENCE",
              title: "Auditoria Jurídica 100% Blindada",
              description: "Análise profunda de matrículas e certidões antes da assinatura de qualquer contrato.",
              colSpan: 2,
            },
            {
              id: "imb-2",
              tag: "RENTABILIDADE",
              title: "Gestão de Aluguel",
              description: "Administração completa de hóspedes com taxa de ocupação otimizada.",
              colSpan: 1,
            },
            {
              id: "imb-3",
              tag: "CONCIERGE",
              title: "Atendimento VIP",
              description: "Transporte e visitas guiadas privativas para investidores.",
              colSpan: 1,
            },
            {
              id: "imb-4",
              tag: "TECNOLOGIA",
              title: "Contratos Digitais",
              description: "Assinatura eletrônica e fechamento sem burocracia de cartório presencial.",
              colSpan: 2,
            },
          ],
        },
      },
      {
        type: "contact_form_direct",
        config: {
          title: "Agende sua Visita Exclusiva",
          subtitle: "Preencha seus dados para receber a ficha técnica detalhada dos imóveis.",
          submitButtonText: "Solicitar Apresentação VIP",
          whatsappRedirect: true,
        },
      },
    ],
  },

  // 6. ESTÉTICA, BEM-ESTAR & CLÍNICAS
  {
    id: "template_services_wellness",
    name: "Estética & Saúde",
    niche: "services",
    description: "Minimalismo para clínicas médicas, estética e bem-estar.",
    badge: "Estética",
    blocks: [
      {
        type: "hero_minimal_split",
        config: {
          badgeText: "MEDICINA ESTÉTICA INTEGRATIVA • RESPONSÁVEL CRM/SP",
          title: "Harmonia, naturalidade e protocolos que valorizam sua essência.",
          subtitle: "Procedimentos não invasivos com tecnologia de ponta para rejuvenescimento facial, corporal e bem-estar profundo.",
          primaryCta: {
            label: "Agendar Avaliação",
            href: "#contato",
          },
          secondaryCta: {
            label: "Conhecer Protocolos",
            href: "#servicos",
          },
          floatingStat: {
            label: "PACIENTES ATENDIDOS",
            value: "4.800+ Vidas",
            statusDot: true,
          },
        },
      },
      {
        type: "bento_asymmetric_4",
        config: {
          sectionTitle: "Protocolos Clínicos em Destaque",
          sectionSubtitle: "Planos de tratamento personalizados com acompanhamento individualizado.",
          cells: [
            {
              id: "w-1",
              tag: "FACIAL",
              title: "Bioestimuladores & Harmonização Suave",
              description: "Recuperação do contorno e estímulo de colágeno natural sem exageros artificiais.",
              colSpan: 2,
            },
            {
              id: "w-2",
              tag: "CORPORAL",
              title: "Remodelagem Não Invasiva",
              description: "Tecnologia de ultrassom macrofocado para firmeza e definição.",
              colSpan: 1,
            },
            {
              id: "w-3",
              tag: "BEM-ESTAR",
              title: "Terapia Integrativa",
              description: "Sessões de relaxamento, massagens terapêuticas e desintoxicação.",
              colSpan: 1,
            },
            {
              id: "w-4",
              tag: "TECNOLOGIA",
              title: "Equipamentos de Última Geração",
              description: "Aparelhos certificados pela ANVISA para máxima segurança e resultados imediatos.",
              colSpan: 2,
            },
          ],
        },
      },
      {
        type: "testimonials_social_proof",
        config: {
          title: "Experiências Reais de Cuidado",
          subtitle: "A opinião espontânea de quem transformou a autoestima em nossa clínica.",
          testimonials: [
            {
              id: "tw-1",
              name: "Camila Guimarães",
              role: "Arquiteta",
              rating: 5,
              comment: "O atendimento superou qualquer expectativa. A naturalidade do resultado me devolveu a confiança.",
              verified: true,
            },
            {
              id: "tw-2",
              name: "Juliana Mendes",
              role: "Empresária",
              rating: 5,
              comment: "Ambiente impecável, profissionais que realmente escutam antes de sugerir qualquer tratamento.",
              verified: true,
            },
          ],
        },
      },
      {
        type: "faq_clean_accordion",
        config: {
          title: "Dúvidas Frequentes sobre Procedimentos",
          subtitle: "Esclareça as perguntas mais comuns antes da sua primeira visita.",
          items: [
            {
              id: "fw-1",
              question: "Os procedimentos exigem repouso ou afastamento do trabalho?",
              answer: "A grande maioria dos nossos protocolos são minimamente invasivos, permitindo retorno imediato às atividades diárias.",
            },
            {
              id: "fw-2",
              question: "Como é realizada a consulta de avaliação inicial?",
              answer: "Realizamos um mapeamento facial/corporal detalhado em 3D para diagnosticar as necessidades exatas antes de propor qualquer intervenção.",
            },
          ],
        },
      },
      {
        type: "contact_form_direct",
        config: {
          title: "Reserve seu Horário com Exclusividade",
          subtitle: "Nossa equipe entrará em contato via WhatsApp para confirmar a melhor data.",
          submitButtonText: "Solicitar Agendamento",
          whatsappRedirect: true,
        },
      },
    ],
  },

  // 7. CRIADORES: LINK NA BIO - CREATOR PRO (MASTER PROMPT V137)
  {
    id: "template_creator_biolink",
    name: "Link na Bio - Creator Pro",
    niche: "creators",
    description: "Apresentação magnética para criadores, influenciadores e infoprodutores com foto de perfil expandida, links de destaque, galeria masonry e captura de newsletter.",
    badge: "Creator Pro",
    blocks: [
      {
        type: "hero_minimal_split",
        styling: {
          borderRadius: "full",
          maxWidth: "md",
          paddingY: "sm",
        },
        config: {
          badgeText: "CRIADOR OFICIAL • @CREATORPRO",
          title: "Lucas Silva — Direção Criativa & Estratégia Digital",
          subtitle: "Podcaster, ensaísta e produtor de conteúdo. Acompanhe meus lançamentos, projetos autorais e comunidade fechada.",
          primaryCta: {
            label: "️ Ouvir Último Episódio do Podcast",
            href: "https://spotify.com",
          },
          secondaryCta: {
            label: "Acessar Comunidade VIP no WhatsApp",
            href: "https://chat.whatsapp.com",
          },
          imageUrl: "",
          floatingStat: {
            label: "AUDIÊNCIA TOTAL",
            value: "250K+ Seguidores",
            statusDot: true,
          },
        },
      },
      {
        type: "bento_asymmetric_4",
        styling: {
          maxWidth: "md",
        },
        config: {
          sectionTitle: "Projetos em Destaque & Plataformas",
          sectionSubtitle: "Acesse rapidamente os principais lançamentos, mentorias e canais oficiais.",
          cells: [
            {
              id: "cp-1",
              tag: "CURSO INTENSIVO",
              title: "Masterclass de Storytelling Visual",
              description: "Inscrições abertas com acesso vitalício e templates prontos.",
              colSpan: 2,
            },
            {
              id: "cp-2",
              tag: "YOUTUBE",
              title: "Canal de Ensaios Semanais",
              description: "Tutoriais profundos e bastidores de produções reais.",
              colSpan: 1,
            },
            {
              id: "cp-3",
              tag: "SUBSTACK",
              title: "Newsletter de Bastidores",
              description: "Artigos e notas conceituais direto no seu e-mail.",
              colSpan: 1,
            },
            {
              id: "cp-4",
              tag: "PARCERIAS",
              title: "Media Kit & Propostas Comerciais",
              description: "Campanhas publicitárias, palestras e consultoria para marcas.",
              colSpan: 2,
            },
          ],
        },
      },
      {
        type: "media_gallery_mosaic",
        config: {
          title: "Galeria Visual & Ensaios Criativos",
          subtitle: "Trabalhos autorais recentes, campanhas conceituais e momentos de estúdio.",
          layout: "mosaic",
          items: [
            {
              id: "mg-1",
              imageUrl: "",
              title: "Ensaio Editorial Urbano",
              caption: "Direção de fotografia e luz natural",
            },
            {
              id: "mg-2",
              imageUrl: "",
              title: "Estúdio de Gravação",
              caption: "Captação acústica e masterização",
            },
            {
              id: "mg-3",
              imageUrl: "",
              title: "Bastidores de Produção",
              caption: "Equipamentos analógicos e digitais",
            },
            {
              id: "mg-4",
              imageUrl: "",
              title: "Workflow Criativo",
              caption: "Design de interfaces e pós-produção",
            },
          ],
        },
      },
      {
        type: "contact_form_direct",
        styling: {
          maxWidth: "md",
        },
        config: {
          title: "Receba Minhas Cartas Semanais (VIP)",
          subtitle: "Assine a newsletter para receber insights sobre negócios criativos, novidades e convites para encontros fechados.",
          submitButtonText: "Inscrever-se Gratuitamente",
          showPhoneField: false,
          showMessageField: false,
          successMessage: "Inscrição confirmada com sucesso! Verifique sua caixa de entrada.",
        },
      },
    ],
  },

  // 8. CLÍNICA: LANDING PAGE - CLÍNICA PREMIUM (MASTER PROMPT V137)
  {
    id: "template_clinic_premium",
    name: "Landing Page - Clínica Premium",
    niche: "clinica",
    description: "Estrutura refinada de autoridade médica e estética com corpo clínico de especialistas com avatares grandes, especialidades e agendamento instantâneo via WhatsApp.",
    badge: "Clínica Médica",
    blocks: [
      {
        type: "hero_minimal_split",
        config: {
          badgeText: "INSTITUTO MÉDICO INTEGRADO • CRM/SP 48.902",
          title: "Medicina de precisão, acolhimento humano e excelência clínica.",
          subtitle: "Diagnósticos completos, equipe multidisciplinar de especialistas e estrutura hospitalar boutique pensada para o seu conforto absoluto.",
          primaryCta: {
            label: "Agendar Consulta via WhatsApp",
            href: "https://wa.me/5511999998888",
          },
          secondaryCta: {
            label: "Conhecer Especialidades",
            href: "#especialidades",
          },
          imageUrl: "",
          floatingStat: {
            label: "CORPO CLÍNICO",
            value: "24 Especialistas",
            statusDot: true,
          },
        },
      },
      {
        type: "testimonials_social_proof",
        config: {
          title: "Corpo Clínico & Especialistas Residentes",
          subtitle: "Médicos graduados nas mais prestigiadas instituições com dedicação integral ao paciente.",
          testimonials: [
            {
              id: "doc-1",
              name: "Dr. Alexandre Vasconcellos",
              role: "Cardiologista Chefe • CRM 52.100",
              avatarUrl: "",
              rating: 5,
              comment: "Doutorado pela USP e fellowship em Harvard. Especialista em prevenção e reabilitação cardiovascular avançada.",
              verified: true,
            },
            {
              id: "doc-2",
              name: "Dra. Mariana Dornelles",
              role: "Dermatologia & Laser • CRM 61.420",
              avatarUrl: "",
              rating: 5,
              comment: "Especialista em dermatologia clínica e rejuvenescimento biológico de alta precisão com tecnologias não invasivas.",
              verified: true,
            },
            {
              id: "doc-3",
              name: "Dr. Felipe Albuquerque",
              role: "Ortopedia & Medicina Esportiva • CRM 49.330",
              avatarUrl: "",
              rating: 5,
              comment: "Cirurgião articular com foco em recuperação rápida, artroscopia e tratamento de lesões musculoesqueléticas.",
              verified: true,
            },
          ],
        },
      },
      {
        type: "bento_asymmetric_4",
        config: {
          sectionTitle: "Centros de Especialidades & Diagnóstico",
          sectionSubtitle: "Atendimento integrado em um único local, eliminando deslocamentos e esperas desnecessárias.",
          cells: [
            {
              id: "esp-1",
              tag: "CARDIOLOGIA",
              title: "Check-up Cardiovascular Avançado",
              description: "Ecocardiograma, Mapa, Holter e teste ergométrico computadorizado com laudo no mesmo dia.",
              colSpan: 2,
            },
            {
              id: "esp-2",
              tag: "DERMATOLOGIA",
              title: "Protocolos Cutâneos & Laser",
              description: "Mapeamento corporal de nevos em alta resolução e regeneração dérmica segura.",
              colSpan: 1,
            },
            {
              id: "esp-3",
              tag: "LABORATÓRIO",
              title: "Exames de Coleta Expressa",
              description: "Resultados liberados em até 4 horas com integração direta ao prontuário eletrônico.",
              colSpan: 1,
            },
            {
              id: "esp-4",
              tag: "CONCIERGE",
              title: "Check-up Executivo em Meio Turno",
              description: "Suíte privativa com concierge médico exclusivo e café da manhã gourmet incluso.",
              colSpan: 2,
            },
          ],
        },
      },
      {
        type: "faq_clean_accordion",
        config: {
          title: "Dúvidas Frequentes sobre Atendimento",
          subtitle: "Informações sobre convênios, estacionamento com manobrista e agendamentos.",
          items: [
            {
              id: "fqc-1",
              question: "A clínica atende convênios ou somente particular?",
              answer: "Atendemos de forma particular com emissão de nota fiscal detalhada e relatório médico para reembolso integral nos principais planos de saúde.",
            },
            {
              id: "fqc-2",
              question: "Existe serviço de telemedicina para pacientes de outras cidades?",
              answer: "Sim, disponibilizamos consultas por telemedicina com prontuário criptografado e prescrição eletrônica válida em todo o território nacional.",
            },
            {
              id: "fqc-3",
              question: "Qual o procedimento para agendar consultas e exames no mesmo dia?",
              answer: "Nossa equipe de concierge organiza uma grade integrada para que você realize a consulta com o especialista e os exames de triagem na mesma manhã.",
            },
          ],
        },
      },
      {
        type: "contact_form_direct",
        config: {
          title: "Agende sua Consulta com Exclusividade",
          subtitle: "Nossa equipe concierge responderá imediatamente via WhatsApp para confirmar o horário ideal.",
          submitButtonText: "Solicitar Agendamento via WhatsApp",
          whatsappNumber: "5511999998888",
          whatsappRedirect: true,
          showPhoneField: true,
          showMessageField: true,
        },
      },
    ],
  },

  // 9. GASTRONOMIA: CATÁLOGO - DARK KITCHEN EXPRESS (MASTER PROMPT V137)
  {
    id: "template_dark_kitchen",
    name: "Catálogo - Dark Kitchen Express",
    niche: "gastronomy",
    description: "Menu de alta conversão estilo app de delivery com navegação rápida por categorias, imagens apetitosas sangradas nos cartões e pedido instantâneo no WhatsApp.",
    badge: "Dark Kitchen",
    blocks: [
      {
        type: "hero_minimal_split",
        config: {
          badgeText: "COZINHA ARTESANAL • ENTREGA EM 25 MIN",
          title: "Burgers artesanais na brasa, smash ultra-crocante e batatas rústicas.",
          subtitle: "Blend 100% Angus fresco grelhado no fogo alto, queijo derretido de verdade e pão brioche amanteigado selado na perfeição.",
          primaryCta: {
            label: "Ver Cardápio & Pedir",
            href: "#cardapio",
          },
          secondaryCta: {
            label: "Combos em Destaque",
            href: "#combos",
          },
          imageUrl: "",
          floatingStat: {
            label: "DELIVERY RÁPIDO",
            value: "25 Minutos",
            statusDot: true,
          },
        },
      },
      {
        type: "media_gallery_mosaic",
        config: {
          title: "Cardápio Visual — Os Favoritos da Cozinha",
          subtitle: "Imagens reais de cada burger e porção servidos em embalagens térmicas ecológicas e seladas.",
          layout: "mosaic",
          items: [
            {
              id: "dk-1",
              imageUrl: "",
              title: "Smash Duplo Cheddar",
              caption: "2x 100g Angus, cheddar inglês cremoso e cebola caramelizada",
            },
            {
              id: "dk-2",
              imageUrl: "",
              title: "Bacon Truffle Prime",
              caption: "180g Angus, fatias crocantes de bacon e maionese trufada",
            },
            {
              id: "dk-3",
              imageUrl: "",
              title: "Fritas Rústicas com Alecrim",
              caption: "Batatas crocantes temperadas com sal marinho e ervas frescas",
            },
            {
              id: "dk-4",
              imageUrl: "",
              title: "Milkshake Artesanal de Pistache",
              caption: "Sorvete cremoso batido na hora com calda de pistache italiana",
            },
          ],
        },
      },
      {
        type: "pricing_three_tiers",
        config: {
          title: "Combos Promocionais com Desconto Especial",
          subtitle: "Peça o combo completo e economize até 30% em relação aos itens avulsos.",
          tiers: [
            {
              id: "combo-1",
              name: "Combo Solo Smash",
              priceMonthlyCents: 3890,
              description: "O clássico perfeito para uma refeição rápida e deliciosa.",
              features: [
                "1x Smash Burger Simples",
                "1x Fritas Rústica Pequena",
                "1x Refrigerante Lata 350ml",
                "1x Molho da Casa Grátis",
              ],
              ctaLabel: "Pedir Combo Solo",
            },
            {
              id: "combo-2",
              name: "Combo Casal Prime",
              badge: "Mais Pedido",
              isPopular: true,
              priceMonthlyCents: 7490,
              description: "Para compartilhar a dois com fartura e muito sabor.",
              features: [
                "2x Smash Duplo Cheddar",
                "1x Fritas Rústica Grande com Bacon",
                "2x Bebidas à Escolha",
                "2x Molhos Especiais da Cozinha",
              ],
              ctaLabel: "Garantir Combo Casal",
            },
            {
              id: "combo-3",
              name: "Box Galera & Família",
              priceMonthlyCents: 13990,
              description: "A festa do hambúrguer completa com tudo que tem direito.",
              features: [
                "4x Burgers à Escolha da Linha Prime",
                "2x Fritas Mega com Cheddar e Bacon",
                "10x Tiras de Frango Crocante",
                "1x Refrigerante 2L Incluso",
              ],
              ctaLabel: "Pedir Box Família",
            },
          ],
        },
      },
      {
        type: "contact_form_direct",
        config: {
          title: "Fazer Pedido Imediato pelo WhatsApp",
          subtitle: "Envie sua escolha de burgers e combos para despacho imediato com rastreamento da entrega.",
          submitButtonText: "Enviar Pedido para a Cozinha",
          whatsappNumber: "5511999998888",
          whatsappRedirect: true,
          showPhoneField: true,
          showMessageField: true,
          successMessage: "Pedido recebido! Nossa cozinha iniciou a preparação imediatamente.",
        },
      },
    ],
  },

  // 10. JORNALISMO E PORTAL DE NOTÍCIAS (OMNI NEWS PORTAL / WAESY NEWS)
  {
    id: "template_editorial_news",
    name: "Portal de Notícias Editorial (Jornal Regional)",
    niche: "news",
    description: "Template jornalistico completo estilo Promethee com masthead editorial, filtro por cidades, abas de editorias, botao + de pauta cidada, carrossel horizontal de plantao, feed vertical squircle, espacos para ADS e vinculo com noticias mineradas aprovadas.",
    badge: "Jornal & Portal News",
    blocks: [
      {
        type: "news_promethee_portal",
        config: {
          mastheadTitle: "Waesy News",
          mastheadSubtitle: "Jornalismo Regional & Curadoria Editorial",
          logoStyle: "promethee_dome",
          logoUrl: "",
          dataSource: "approved_mined_AND_custom",
          showCityFilter: true,
          showSearch: true,
          allowCitizenPosts: true,
          showBreakingCarousel: true,
          breakingSectionTitle: "Plantao & Destaques em Tempo Real",
          showAds: true,
          cities: [
            "Noticias do Vale",
            "Sao Jose dos Campos",
            "Taubate",
            "Jacarei",
            "Pindamonhangaba",
            "Guaratingueta",
            "Caraguatatuba",
            "Campos do Jordao",
          ],
          categories: [
            "Para voce",
            "Urgente",
            "Seguranca",
            "Economia",
            "Esportes",
            "Tecnologia",
            "Cultura",
          ],
          articles: [
            {
              id: "prom_art_1",
              title: "Corredor tecnologico de Sao Jose dos Campos recebe novo centro de engenharia aeroespacial",
              lead: "Investimento consolida cadeia de fornecedores do Parque Tecnologico e abre vagas de alta qualificacao para engenheiros e tecnicos no Vale do Paraiba.",
              body: "O Parque Tecnologico de Sao Jose dos Campos confirmou a expansao de sua ala de sistemas autonomos e propulsao limpa. Mais de 35 empresas fornecedoras da cadeia aeronautica ja assinaram protocolo de integracao.",
              category: "Economia",
              city: "Sao Jose dos Campos",
              publishedAgo: "15min",
              readingTime: "4 min",
              author: "Redacao Regional",
              imageUrl: "",
              imageAlt: "Centro de engenharia no Parque Tecnologico",
              isBreaking: true,
              likesCount: 42,
              commentsCount: 14,
            },
            {
              id: "prom_art_2",
              title: "Monitoramento inteligente reduz tempo de resposta viaria entre Taubate e Jacarei",
              lead: "Integracao de cameras opticas com central regional permite desvio preventivo de trafego pesado e atendimento rapido em horarios de pico.",
              body: "O novo protocolo de integracao entre os centros de controle operacional das prefeituras do Vale reduziu em 28% o tempo medio de liberacao de faixas urbanas e rodoviarias.",
              category: "Seguranca",
              city: "Taubate",
              publishedAgo: "32min",
              readingTime: "3 min",
              author: "Editoria Cidades",
              imageUrl: "",
              imageAlt: "Central de monitoramento viario regional",
              isBreaking: true,
              likesCount: 29,
              commentsCount: 12,
            },
          ],
          adSlots: [
            {
              id: "prom_ad_1",
              format: "banner",
              sponsorName: "Espaco Publicitario Regional ? ADS",
              headline: "Posicione sua marca em destaque no feed editorial de maior leitura da regiao",
              description: "Formatos nativos Promethee, banners horizontais e patrocinio de editorias por cidade.",
              ctaLabel: "Anunciar no Portal",
              ctaHref: "#",
              imageUrl: "",
            },
          ],
        },
      },
      {
        type: "bento_asymmetric_4",
        config: {
          sectionTitle: "Editorias em Destaque e Curadoria Regional",
          sectionSubtitle: "Noticias filtradas por cidade e editoria a partir do catalogo aprovado pela redacao.",
          cells: [
            {
              id: "news-c1",
              tag: "SEGURANCA E CIDADE",
              title: "Policia e Plantao 24h",
              description: "Monitoramento em tempo real de ocorrencias, trafego nas rodovias e defesa civil.",
              colSpan: 2,
            },
            {
              id: "news-c2",
              tag: "ECONOMIA",
              title: "Industria e Negocios",
              description: "Indicadores economicos, empregos e ecossistema aeroespacial e tecnologico.",
              colSpan: 1,
            },
            {
              id: "news-c3",
              tag: "CULTURA",
              title: "Agenda Regional",
              description: "Eventos, turismo na Mantiqueira e roteiros gastronomicos locais.",
              colSpan: 1,
            },
            {
              id: "news-c4",
              tag: "TECNOLOGIA",
              title: "Inovacao e Engenharia",
              description: "Startups, parques tecnologicos e avancos industriais na regiao.",
              colSpan: 2,
            },
          ],
        },
      },
      {
        type: "pricing_three_tiers",
        config: {
          title: "Monetizacao e Espacos Comerciais (Midia Kit)",
          subtitle: "Formatos de anuncios nativos e banners para marcas e anunciantes locais.",
          tiers: [
            {
              id: "ad-tier-1",
              name: "Banner Leaderboard",
              priceMonthlyCents: 49000,
              description: "Posicao de destaque em todas as paginas e materias com alta visibilidade.",
              features: ["Formato desktop e mobile responsivo", "Link direto com rastreio de cliques", "Relatorio mensal de impressoes"],
              isPopular: false,
              ctaLabel: "Anunciar no Topo",
            },
            {
              id: "ad-tier-2",
              name: "Publieditorial & Native Ad",
              badge: "Mais Contratado",
              priceMonthlyCents: 89000,
              description: "Materia especial escrita com DNA jornalistico e integrada no feed principal.",
              features: ["Destaque no carrossel de plantao", "Transformacao em carrossel social", "Selo de Conteudo Patrocinado", "Indexacao de busca"],
              isPopular: true,
              ctaLabel: "Contratar Pauta",
            },
            {
              id: "ad-tier-3",
              name: "Patrocinio de Editoria",
              priceMonthlyCents: 129000,
              description: "Presenca continua de marca em uma editoria completa (ex: Economia ou Seguranca).",
              features: ["Assinatura no cabecalho da editoria", "Card nativo ADS no feed", "Banners laterais exclusivos", "Metricas em tempo real"],
              isPopular: false,
              ctaLabel: "Ser Patrocinador Master",
            },
          ],
        },
      },
      {
        type: "contact_form_direct",
        config: {
          title: "Redacao, Pauta Cidada e Anunciantes",
          subtitle: "Envie relatos, sugestoes de reportagem ou solicite o Midia Kit Comercial da nossa redacao.",
          submitButtonText: "Enviar Mensagem para a Redacao",
          whatsappNumber: "5512999998888",
          showPhoneField: true,
          showMessageField: true,
          successMessage: "Mensagem recebida com sucesso! Nossa equipe editorial retornara em breve.",
        },
      },
    ],
  },

  // 11. SISTEMA VERTICAL: GESTÃO PARA SALÕES, BARBEARIAS E ESTÉTICA (ESTILO BELASIS & AVEC)
  {
    id: "template_saas_beauty_belasis",
    name: "Sistema de Gestão para Salão, Barbearia e Estética",
    niche: "beauty_saas",
    description:
      "Landing page de vendas do software para salões e clínicas estilo Belasis e Avec: agenda online 24h, comissões automáticas, comanda eletrônica, fichas de anamnese, clube de assinaturas, simulador de comissões, vídeo, 3 planos com toggle anual/mensal, depoimentos e formulário de teste grátis 7 dias.",
    badge: "Paridade Belasis & Avec",
    blocks: [
      {
        type: "hero_minimal_split",
        config: {
          badgeText: "O SISTEMA MAIS COMPLETO DO MERCADO DA BELEZA",
          title: "Organize sua agenda, zere faltas e aumente o faturamento do seu salão",
          subtitle:
            "Agendamento online 24h pelo WhatsApp e Instagram, cálculo automático de comissões da equipe, comanda digital e controle financeiro completo. Teste 7 dias grátis sem cartão de crédito.",
          primaryCta: { label: "Começar Teste Grátis de 7 Dias", href: "#teste-gratis" },
          secondaryCta: { label: "Ver Demonstração do Software", href: "#modulos" },
          floatingStat: { label: "REDUÇÃO DE FALTAS", value: "-73% no-show", statusDot: true },
        },
      },
      {
        type: "infinite_marquee_ribbon",
        config: {
          title: "Mais de 12.000 salões, barbearias e clínicas confiam na nossa tecnologia",
          direction: "left",
          speedSeconds: 20,
          pauseOnHover: true,
          items: [
            { id: "b-m1", text: "Studio Velvet Hair & Visagismo", badgeText: "Salão Conceito" },
            { id: "b-m2", text: "Barbearia Dom Corleone", badgeText: "4 Unidades" },
            { id: "b-m3", text: "Clínica DermaLuxe Estética Avançada", badgeText: "Biomédica" },
            { id: "b-m4", text: "Espaço Glamour & Spa Urbano", badgeText: "Referência" },
            { id: "b-m5", text: "Rede D'Ellas Esmalteria", badgeText: "Franquia" },
            { id: "b-m6", text: "L'Atelier Cabelo & Make", badgeText: "Noivas" },
          ],
        },
      },
      {
        type: "software_feature_tabs",
        config: {
          title: "Tudo o que seu salão precisa em um único sistema",
          subtitle:
            "Esqueça papéis, planilhas confusas e discussões no final do mês. Automatize toda a rotina da sua recepção e equipe profissional.",
          badgeText: "MÓDULOS INTEGRADOS",
          tabs: [
            {
              id: "tab-agenda",
              tabLabel: "Agenda Inteligente 24h",
              tabIconName: "Calendar",
              title: "Seus clientes agendam pelo WhatsApp e Instagram a qualquer hora",
              description:
                "Agenda sincronizada em tempo real que bloqueia conflitos de horários e envia lembretes automáticos com botão de confirmação.",
              badge: "Zera Faltas",
              benefits: [
                "Link de agendamento online personalizado para colocar na Bio do Instagram",
                "Lembretes automáticos 24h e 2h antes do atendimento com confirmação",
                "Cobrança de sinal e recebimento de Pix antecipado para garantir o horário",
                "Bloqueio preventivo de clientes inadimplentes ou com histórico de faltas",
              ],
              ctaLabel: "Experimentar a Agenda Grátis",
              ctaHref: "#teste-gratis",
              statNumber: "+45 horas",
              statLabel: "Economizadas por mês na recepção",
            },
            {
              id: "tab-comissoes",
              tabLabel: "Comissões & Rateio",
              tabIconName: "Scissors",
              title: "Cálculo de comissões 100% automático e sem atritos com profissionais",
              description:
                "Defina porcentagens personalizadas por profissional ou procedimento, desconte custos de produtos e gere o extrato em 1 clique.",
              badge: "Sem Erros",
              benefits: [
                "Regras flexíveis de comissão: porcentagem, valor fixo ou tabela escalonada",
                "Desconto automático de taxa de maquininha e custo de insumos (químicos)",
                "Extrato digital transparente no aplicativo de cada profissional parceiro",
                "Fechamento quinzenal ou mensal com comprovante detalhado em PDF",
              ],
              ctaLabel: "Ver Módulo de Comissões",
              ctaHref: "#teste-gratis",
              statNumber: "100% exato",
              statLabel: "Zere discussões salariais no salão",
            },
            {
              id: "tab-comandas",
              tabLabel: "Comandas & Anamnese",
              tabIconName: "Receipt",
              title: "Comanda eletrônica ágil e fichas de anamnese personalizadas",
              description:
                "Abra atendimentos pelo celular ou tablet, lance produtos de consumo e guarde fotos de antes e depois dos clientes.",
              badge: "Segurança",
              benefits: [
                "Lançamento de serviços e vendas de produtos na mesma comanda",
                "Fichas de anamnese digital com assinatura na tela do tablet",
                "Galeria de evolução de procedimentos com histórico fotográfico",
                "Histórico completo de preferências e alergias do cliente",
              ],
              ctaLabel: "Conhecer Comanda Digital",
              ctaHref: "#teste-gratis",
              statNumber: "0 papel",
              statLabel: "Operação 100% digital e segura",
            },
            {
              id: "tab-assinaturas",
              tabLabel: "Clube de Assinaturas",
              tabIconName: "Sparkles",
              title: "Faturamento recorrente garantido todo mês com planos e pacotes",
              description:
                "Crie planos de barba, cabelo ou manicure com cobrança mensal automática no cartão e aumente a retenção de clientes.",
              badge: "Receita Previsível",
              benefits: [
                "Cobrança automática recorrente sem consumir o limite total do cliente",
                "Controle de créditos e sessões restantes em tempo real",
                "Aumento comprovado do ticket médio e da frequência semanal",
                "Relatório de renovações automáticas e taxa de cancelamento",
              ],
              ctaLabel: "Ativar Clube de Assinatura",
              ctaHref: "#teste-gratis",
              statNumber: "+300%",
              statLabel: "Mais previsibilidade financeira",
            },
          ],
        },
      },
      {
        type: "interactive_quote_calculator",
        config: {
          title: "Simulador de Comissões e Produtividade da Equipe",
          subtitle:
            "Calcule quanto tempo e dinheiro seu salão economiza ao automatizar a gestão de agendamentos e comissões.",
          basePriceCents: 9900,
          unitLabel: "Profissional Parceiro",
          unitPluralLabel: "Profissionais Parceiros",
          minUnits: 1,
          maxUnits: 30,
          defaultUnits: 5,
          unitPriceCents: 2000,
          options: [
            {
              id: "opt-whatsapp-confirm",
              label: "Módulo de Confirmação Ativa no WhatsApp",
              description: "Disparos automáticos com botão de confirmação e reagendamento.",
              priceCents: 3900,
              isDefault: true,
            },
            {
              id: "opt-anamnese-digital",
              label: "Fichas de Anamnese com Assinatura na Tela",
              description: "Galeria de fotos antes/depois e termos de consentimento com validade.",
              priceCents: 2900,
              isDefault: false,
            },
          ],
          whatsappNumber: "5511999998888",
          submitButtonText: "Quero Este Plano no Meu Salão",
          successMessage: "Simulação enviada com sucesso! Um consultor entrará em contato para ativar seus 7 dias grátis.",
          disclaimer: "Valores com desconto especial na modalidade anual. Implantação e suporte inclusos sem custo extra.",
        },
      },
      {
        type: "video_section",
        config: {
          badge: "TOUR GUIADO PELO SISTEMA",
          title: "Veja o sistema operando em menos de 3 minutos",
          subtitle:
            "Interface limpa, moderna e calibrada para iPad, celulares e computadores da recepção.",
          video_url: "",
          button_text: "Criar Conta de Teste Grátis",
          button_link: "#teste-gratis",
        },
      },
      {
        type: "pricing_three_tiers",
        config: {
          title: "Planos Transparentes que Crescem com o Seu Salão",
          subtitle:
            "Sem taxa de adesão, sem taxa de cancelamento e com suporte humanizado em português.",
          tiers: [
            {
              id: "tier-beauty-lite",
              name: "Plano Lite",
              badge: "Iniciante",
              priceMonthlyCents: 9900,
              priceAnnualCents: 7900,
              description: "Ideal para profissionais autônomos, barbearias individuais e pequenos espaços.",
              features: [
                "Agenda online para celular e computador",
                "Link de agendamento na Bio do Instagram",
                "Comandas eletrônicas ilimitadas",
                "Controle de caixa diário",
                "Suporte via WhatsApp em horário comercial",
              ],
              ctaLabel: "Testar Lite Grátis",
              ctaHref: "#teste-gratis",
              isPopular: false,
            },
            {
              id: "tier-beauty-pro",
              name: "Plano Pro",
              badge: "Mais Escolhido",
              priceMonthlyCents: 18900,
              priceAnnualCents: 14900,
              description: "O pacote completo para salões e clínicas que querem automatizar tudo e crescer.",
              features: [
                "Tudo do plano Lite",
                "Cálculo automático de comissões por profissional",
                "Lembretes automáticos no WhatsApp que reduzem faltas",
                "Fichas de anamnese digital com fotos",
                "Controle completo de estoque e produtos",
                "App exclusivo para os profissionais da equipe",
              ],
              ctaLabel: "Testar Pro Grátis",
              ctaHref: "#teste-gratis",
              isPopular: true,
            },
            {
              id: "tier-beauty-scale",
              name: "Plano Scale & Redes",
              badge: "Corporativo",
              priceMonthlyCents: 34900,
              priceAnnualCents: 27900,
              description: "Para grandes salões, redes de franquias e clínicas de estética de alto fluxo.",
              features: [
                "Tudo do plano Pro",
                "Gestão multi-unidades com relatórios consolidados",
                "Clube de assinaturas recorrente integrado",
                "Emissor ilimitado de Notas Fiscais (NFS-e)",
                "Gerente de contas e implantação assistida VIP",
                "API pública de integração",
              ],
              ctaLabel: "Falar com Consultor",
              ctaHref: "#teste-gratis",
              isPopular: false,
            },
          ],
        },
      },
      {
        type: "testimonials_social_proof",
        config: {
          title: "Quem Usa, Recomenda: Salões que Multiplicaram o Faturamento",
          subtitle: "Mais de 12.000 profissionais da beleza transformaram sua rotina diária.",
          testimonials: [
            {
              id: "t-b1",
              name: "Camila Guimarães",
              role: "Proprietária do L'Atelier Concept (Campinas/SP)",
              rating: 5,
              comment:
                "Antes eu perdia 2 domingos no mês calculando comissões em planilhas que sempre davam confusão com a equipe. Hoje o sistema faz tudo automático e cada profissional confere pelo celular.",
              verified: true,
            },
            {
              id: "t-b2",
              name: "Rodrigo Silva",
              role: "Fundador da Rede Barbearia Dom Corleone (4 unidades)",
              rating: 5,
              comment:
                "O agendamento com confirmação no WhatsApp reduziu nossas faltas em mais de 70%. O cliente clica no link do Instagram, escolhe o barbeiro e já recebe o lembrete. É outro nível.",
              verified: true,
            },
            {
              id: "t-b3",
              name: "Dra. Juliana Mendes",
              role: "Diretora da Clínica DermaSkin Estética",
              rating: 5,
              comment:
                "As fichas de anamnese com foto antes e depois deram uma segurança jurídica e profissionalismo incomparáveis aos nossos protocolos de atendimento.",
              verified: true,
            },
          ],
        },
      },
      {
        type: "faq_clean_accordion",
        config: {
          title: "Dúvidas Frequentes sobre a Contratação",
          subtitle: "Respostas diretas sobre implantação, migração de dados e suporte.",
          items: [
            {
              id: "faq-b1",
              question: "Como funciona o teste grátis de 7 dias?",
              answer:
                "Você cria sua conta em menos de 1 minuto, sem precisar informar cartão de crédito. Durante os 7 dias, tem acesso completo a todos os recursos do plano Pro para testar com sua equipe.",
            },
            {
              id: "faq-b2",
              question: "Tenho meus clientes em outro sistema ou planilha. Vocês ajudam na migração?",
              answer:
                "Sim! Nossa equipe de suporte realiza a importação gratuita da sua lista de clientes e produtos, sem risco de perder dados ou históricos.",
            },
            {
              id: "faq-b3",
              question: "O sistema exige instalação ou computador específico?",
              answer:
                "Não. O sistema é 100% em nuvem e funciona em qualquer celular (Android ou iPhone), iPad/tablet ou computador com internet.",
            },
            {
              id: "faq-b4",
              question: "Existe taxa de cancelamento ou contrato de fidelidade?",
              answer:
                "Zero fidelidade. No faturamento mensal você pode cancelar a qualquer momento sem nenhuma multa ou taxa oculta.",
            },
          ],
        },
      },
      {
        type: "contact_form_direct",
        config: {
          title: "Crie Sua Conta Gratuita e Comece em 2 Minutos",
          subtitle: "Informe seus dados para liberar seu acesso imediato ao sistema com 7 dias grátis.",
          submitButtonText: "Liberar Meu Acesso Grátis de 7 Dias",
          whatsappNumber: "5511999998888",
          showPhoneField: true,
          showMessageField: true,
          successMessage: "Acesso gerado com sucesso! Entraremos em contato no WhatsApp com seu login e tour guiado.",
        },
      },
    ],
  },

  // 12. SISTEMA VERTICAL: GESTÃO & DELIVERY PARA RESTAURANTES (ESTILO IFOOD PARCEIROS & 99FOOD)
  {
    id: "template_saas_food_restaurante",
    name: "Sistema de Gestão & Delivery para Restaurantes",
    niche: "food_saas",
    description:
      "Landing page de vendas do sistema para restaurantes e delivery estilo iFood Parceiros: gestor de pedidos no balcão, cardápio digital com adicionais, logística Waesy Go com taxa fixa de R$ 0,99 vs 23% abusiva, promoções, calculadora de economia, vídeo da cozinha, planos com 1º mês grátis, depoimentos reais e credenciamento em 3 passos.",
    badge: "Paridade iFood Parceiros",
    blocks: [
      {
        type: "hero_minimal_split",
        config: {
          badgeText: "O CANAL DE VENDAS E GESTÃO LÍDER DA SUA CIDADE",
          title: "Venda muito mais no delivery e balcão sem pagar comissões abusivas",
          subtitle:
            "Gestor de pedidos em tempo real, cardápio digital atraente, impressão automática na cozinha e opção de entregadores parceiros com taxa fixa de apenas R$ 0,99 por corrida.",
          primaryCta: { label: "Cadastrar Meu Restaurante", href: "#credenciamento" },
          secondaryCta: { label: "Calcular Economia de Taxas", href: "#calculadora" },
          floatingStat: { label: "COMISSÃO ABUSIVA", value: "0% na sua loja", statusDot: true },
        },
      },
      {
        type: "infinite_marquee_ribbon",
        config: {
          title: "Compatível com as principais impressoras térmicas e sistemas de automação",
          direction: "left",
          speedSeconds: 22,
          pauseOnHover: true,
          items: [
            { id: "f-m1", text: "Epson TM-T20X", badgeText: "Térmica" },
            { id: "f-m2", text: "Bematech MP-4200 TH", badgeText: "Homologada" },
            { id: "f-m3", text: "Elgin I9 & I8", badgeText: "Cozinha" },
            { id: "f-m4", text: "Integração WhatsApp Oficial", badgeText: "Automática" },
            { id: "f-m5", text: "Logística Waesy Go R$ 0,99", badgeText: "Taxa Zero" },
            { id: "f-m6", text: "Repasses Semanais Garantidos", badgeText: "Sem Atraso" },
          ],
        },
      },
      {
        type: "software_feature_tabs",
        config: {
          title: "Tudo que sua cozinha e balcão precisam para faturar alto",
          subtitle:
            "Do recebimento do pedido no app até a saída com o entregador, cada etapa sincronizada sem gargalos.",
          badgeText: "RECURSOS OPERACIONAIS",
          tabs: [
            {
              id: "tab-gestor",
              tabLabel: "Gestor de Pedidos",
              tabIconName: "Laptop",
              title: "Receba, aprove e despache pedidos com alertas sonoros instantâneos",
              description:
                "Tela limpa para o balcão com kanban de preparo, separação por tempo de cozinha e impressão automática na impressora térmica.",
              badge: "Sem Atrasos",
              benefits: [
                "Alerta sonoro alto e visual impossível de passar despercebido",
                "Impressão automática dividida por praça (Cozinha, Bar, Balcão)",
                "Ajuste em 1 toque do tempo estimado de entrega em horários de pico",
                "Pausa emergencial da loja em caso de chuva ou falta de insumos",
              ],
              ctaLabel: "Testar o Gestor de Pedidos",
              ctaHref: "#credenciamento",
              statNumber: "3x mais rápido",
              statLabel: "Na emissão e preparo da cozinha",
            },
            {
              id: "tab-cardapio",
              tabLabel: "Cardápio Digital",
              tabIconName: "ShoppingCart",
              title: "Cardápio que dá água na boca com fotos e personalização de adicionais",
              description:
                "Crie combos, grupos de opcionais obrigatórios (ex: ponto da carne, molhos), regras de meio-a-meio e promoções relâmpago.",
              badge: "Alta Conversão",
              benefits: [
                "Grupos de adicionais e complementos ilimitados para elevar o ticket médio",
                "Regras inteligentes para pizzas meio a meio com cobrança pela maior ou média",
                "Atualização imediata de preços e itens pausados sem travar a operação",
                "Fotos em alta resolução otimizadas para carregamento instantâneo no celular",
              ],
              ctaLabel: "Criar Cardápio Digital",
              ctaHref: "#credenciamento",
              statNumber: "+28% ticket",
              statLabel: "Com sugestão inteligente de adicionais",
            },
            {
              id: "tab-logistica",
              tabLabel: "Logística Waesy Go",
              tabIconName: "Truck",
              title: "Entregadores parceiros com taxa fixa de R$ 0,99 por entrega",
              description:
                "Chega de perder 23% ou 27% do valor do seu prato em comissões abusivas. Chame entregadores verificados com rastreamento GPS em tempo real.",
              badge: "Revolução Logística",
              benefits: [
                "Taxa fixa justa de R$ 0,99 por entrega concluída (sem porcentagens sobre a comida)",
                "Rastreamento ao vivo por GPS com mapa compartilhado com o cliente",
                "Código de confirmação de 4 dígitos na entrega que evita fraudes e calotes",
                "Liberdade total para usar sua frota própria ou chamar entregadores do app",
              ],
              ctaLabel: "Simular Economia com Waesy Go",
              ctaHref: "#calculadora",
              statNumber: "R$ 0,99 fixo",
              statLabel: "Economia de até R$ 8.000/mês em taxas",
            },
            {
              id: "tab-promocoes",
              tabLabel: "Promoções & Fidelidade",
              tabIconName: "Flame",
              title: "Atraia clientes nos dias fracos com cupons e cashback inteligente",
              description:
                "Dispare campanhas para clientes inativos, ofereça frete grátis inteligente e crie cupons com limite de usos por CPF.",
              badge: "Mais Faturamento",
              benefits: [
                "Cupons promocionais com restrição por valor mínimo de pedido",
                "Promoções automáticas para terça e quarta-feira de pouco movimento",
                "Clube de fidelidade que estimula o cliente a pedir toda semana na sua loja",
                "Comunicação direta com a base de clientes pelo WhatsApp oficial",
              ],
              ctaLabel: "Ver Ferramentas de Marketing",
              ctaHref: "#credenciamento",
              statNumber: "+40% pedidos",
              statLabel: "Em dias tradicionalmente fracos",
            },
          ],
        },
      },
      {
        type: "interactive_quote_calculator",
        config: {
          title: "Calculadora de Economia: Waesy vs Marketplaces Tradicionais",
          subtitle:
            "Veja quanto dinheiro volta para o caixa da sua loja ao fugir das comissões de 23% dos aplicativos convencionais.",
          basePriceCents: 11000,
          unitLabel: "Pedido no Delivery / Dia",
          unitPluralLabel: "Pedidos no Delivery / Dia",
          minUnits: 10,
          maxUnits: 200,
          defaultUnits: 40,
          unitPriceCents: 99,
          options: [
            {
              id: "opt-entregador-parceiro",
              label: "Chamada de Entregadores Waesy Go sob Demanda",
              description: "Frota compartilhada de motoboys verificados com taxa fixa de R$ 0,99.",
              priceCents: 4000,
              isDefault: true,
            },
            {
              id: "opt-repasse-rapido",
              label: "Repasse em 7 Dias de Vendas Online",
              description: "Fluxo de caixa acelerado para compras com Pix e cartão no aplicativo.",
              priceCents: 2000,
              isDefault: true,
            },
          ],
          whatsappNumber: "5511999998888",
          submitButtonText: "Quero Economizar no Meu Restaurante",
          successMessage: "Simulação realizada! Nossa equipe de expansão entrará em contato para ativar sua loja.",
          disclaimer:
            "Comparativo baseado em ticket médio de R$ 60,00 e comissão de 23% cobrada pelas grandes redes tradicionais.",
        },
      },
      {
        type: "video_section",
        config: {
          badge: "DEMONSTRAÇÃO AO VIVO",
          title: "Veja como a cozinha recebe e despacha em segundos",
          subtitle:
            "Demonstração do Gestor de Pedidos integrado à impressora térmica e aplicativo do entregador.",
          video_url: "",
          button_text: "Cadastrar Meu Estabelecimento",
          button_link: "#credenciamento",
        },
      },
      {
        type: "pricing_three_tiers",
        config: {
          title: "Planos Feitos para Restaurantes de Todos os Portes",
          subtitle: "Primeiro mês 100% gratuito. Sem cobrança se faturar menos de R$ 1.800 no mês.",
          tiers: [
            {
              id: "tier-food-basico",
              name: "Plano Básico (Frota Própria)",
              badge: "Logística Própria",
              priceMonthlyCents: 11000,
              priceAnnualCents: 8900,
              description: "Ideal para restaurantes que já possuem equipe própria de motoboys.",
              features: [
                "Gestor de Pedidos para balcão e cozinha",
                "Cardápio digital atraente com fotos",
                "Impressão automática em impressoras térmicas",
                "Controle de áreas e bairros de entrega",
                "Mensalidade grátis se faturar menos de R$ 1.800",
                "Primeiro mês de teste gratuito",
              ],
              ctaLabel: "Quero o Plano Básico",
              ctaHref: "#credenciamento",
              isPopular: false,
            },
            {
              id: "tier-food-entrega",
              name: "Plano Entrega Waesy Go",
              badge: "Mais Popular",
              priceMonthlyCents: 15000,
              priceAnnualCents: 11900,
              description: "Acesso total à rede de entregadores parceiros com telemetria GPS e taxa fixa.",
              features: [
                "Tudo do Plano Básico",
                "Chamada de entregadores parceiros 24/7",
                "Taxa fixa de apenas R$ 0,99 por corrida",
                "Rastreio em tempo real com mapa para o cliente",
                "Seguro contra cancelamento e código de 4 dígitos",
                "Primeiro mês gratuito",
              ],
              ctaLabel: "Quero o Plano Entrega",
              ctaHref: "#credenciamento",
              isPopular: true,
            },
            {
              id: "tier-food-redes",
              name: "Plano Redes & Franquias",
              badge: "Multi-Lojas",
              priceMonthlyCents: 29000,
              priceAnnualCents: 23000,
              description: "Para redes de restaurantes, franquias e dark kitchens com alto volume.",
              features: [
                "Tudo do Plano Entrega",
                "Gestão de múltiplas unidades em painel único",
                "Roteamento inteligente de pedidos pela loja mais próxima",
                "Integração via API com seu ERP / Frente de Caixa",
                "Gestor de contas dedicado e suporte VIP 24h",
                "Relatórios consolidados de CMV e vendas",
              ],
              ctaLabel: "Falar com Consultor",
              ctaHref: "#credenciamento",
              isPopular: false,
            },
          ],
        },
      },
      {
        type: "testimonials_social_proof",
        config: {
          title: "Histórias Reais de Quem Recuperou a Margem de Lucro",
          subtitle: "Mais de 3.500 restaurantes, pizzarias e hamburguerias vendendo todos os dias.",
          testimonials: [
            {
              id: "t-f1",
              name: "Marcio Fagundes",
              role: "Sócio do Donatello Burger & Pizza",
              rating: 5,
              comment:
                "Nosso delivery faturava R$ 45 mil por mês no app vermelho, mas quase R$ 11 mil ficavam com eles só em comissão. Com o sistema Waesy e a entrega Waesy Go, recuperamos nossa margem e agora sobra dinheiro no caixa.",
              verified: true,
            },
            {
              id: "t-f2",
              name: "Fernanda Takahashi",
              role: "Proprietária do Sushi Ya Delivery",
              rating: 5,
              comment:
                "O gestor de pedidos nunca trava, os alertas sonoros são ótimos e a personalização de combos de sushi fez o ticket médio subir na primeira semana.",
              verified: true,
            },
            {
              id: "t-f3",
              name: "Carlos Eduardo",
              role: "Gerente Geral da Cantina Nonna Rosa",
              rating: 5,
              comment:
                "A facilidade de pausar produtos e criar promoções relâmpago de terça a quinta transformou nossas noites mais fracas em noites cheias.",
              verified: true,
            },
          ],
        },
      },
      {
        type: "faq_clean_accordion",
        config: {
          title: "Perguntas Frequentes de Restaurantes Parceiros",
          subtitle: "Tudo o que você precisa saber antes de cadastrar seu restaurante.",
          items: [
            {
              id: "faq-f1",
              question: "O que é necessário para cadastrar meu restaurante?",
              answer:
                "Você só precisa ter um CNPJ ativo (pode ser MEI), conta bancária vinculada ao CNPJ para repasses e um celular ou computador para operar o Gestor de Pedidos.",
            },
            {
              id: "faq-f2",
              question: "Quando começo a pagar a mensalidade?",
              answer:
                "O primeiro mês é 100% gratuito. Além disso, a mensalidade só é cobrada caso o restaurante fature mais de R$ 1.800,00 no mês. Se faturar menos, você não paga mensalidade.",
            },
            {
              id: "faq-f3",
              question: "Como funciona a entrega com taxa fixa de R$ 0,99?",
              answer:
                "Diferente de marketplaces que cobram porcentagens absurdas (de 23% a 27%), no Waesy Go a taxa da plataforma é fixa em R$ 0,99 por corrida concluída. O valor da corrida vai integral para o entregador e você mantém seu lucro.",
            },
            {
              id: "faq-f4",
              question: "Como recebo o dinheiro das vendas online?",
              answer:
                "Os repasses das vendas pagas no cartão/Pix pelo app são creditados semanalmente de forma automática na sua conta bancária sem burocracia.",
            },
          ],
        },
      },
      {
        type: "contact_form_direct",
        config: {
          title: "Cadastre Seu Restaurante em Poucos Minutos",
          subtitle: "Preencha os dados da sua empresa para ativarmos seu cardápio e iniciarmos os testes gratuitos.",
          submitButtonText: "Concluir Cadastro e Começar a Vender",
          whatsappNumber: "5511999998888",
          showPhoneField: true,
          showMessageField: true,
          successMessage: "Cadastro recebido! Nossa equipe entrará em contato no WhatsApp com seu acesso ao Gestor de Pedidos.",
        },
      },
    ],
  },

  // 13. SISTEMA VERTICAL: FORÇA DE VENDAS & E-COMMERCE B2B (ESTILO MERCOS)
  {
    id: "template_saas_b2b_mercos",
    name: "Software de Força de Vendas e E-commerce B2B",
    niche: "b2b_saas",
    description:
      "Landing page de vendas do software comercial para indústrias e distribuidoras estilo Mercos: app força de vendas 100% offline, catálogo digital com fotos, políticas comerciais e Saldo Flex, portal do cliente B2B 24/7, integração com mais de 250 ERPs (Totvs, Sankhya, Bling), calculadora de ROI, planos e trial 7 dias.",
    badge: "Paridade Mercos B2B",
    blocks: [
      {
        type: "hero_minimal_split",
        config: {
          badgeText: "O SOFTWARE B2B LÍDER EM EMISSÃO DE PEDIDOS NO BRASIL",
          title: "Potencialize sua força de vendas e venda 24/7 com E-commerce B2B",
          subtitle:
            "Aplicativo 100% offline para representantes emitirem pedidos na rua, catálogo digital com fotos, políticas comerciais rígidas e integração nativa com seu ERP.",
          primaryCta: { label: "Testar Grátis por 7 Dias", href: "#trial-b2b" },
          secondaryCta: { label: "Agendar Demonstração VIP", href: "#modulos" },
          floatingStat: { label: "VOLUME EMITIDO", value: "+R$ 40 Bilhões", statusDot: true },
        },
      },
      {
        type: "infinite_marquee_ribbon",
        config: {
          title: "Integração homologada com mais de 250 ERPs do mercado",
          direction: "left",
          speedSeconds: 22,
          pauseOnHover: true,
          items: [
            { id: "m-m1", text: "Totvs Protheus & Datasul", badgeText: "Nativo" },
            { id: "m-m2", text: "Senior Sistemas ERP", badgeText: "Homologado" },
            { id: "m-m3", text: "Sankhya Om", badgeText: "API Oficial" },
            { id: "m-m4", text: "Bling ERP", badgeText: "Plug & Play" },
            { id: "m-m5", text: "Omie Gestão", badgeText: "Em Nuvem" },
            { id: "m-m6", text: "Tiny ERP", badgeText: "Sincronizado" },
            { id: "m-m7", text: "SAP Business One", badgeText: "Enterprise" },
          ],
        },
      },
      {
        type: "software_feature_tabs",
        config: {
          title: "A esteira completa para indústrias e distribuidoras venderem mais",
          subtitle:
            "Do representante na rua até a expedição no armazém, dados sincronizados sem digitação manual de pedidos.",
          badgeText: "RECURSOS DE GESTÃO B2B",
          tabs: [
            {
              id: "tab-offline",
              tabLabel: "Força de Vendas Offline",
              tabIconName: "Smartphone",
              title: "Aplicativo para representantes que funciona 100% offline",
              description:
                "Emita pedidos, consulte estoque, limites de crédito e histórico de compras do cliente mesmo sem nenhum sinal de internet.",
              badge: "Sem Internet",
              benefits: [
                "Funcionamento offline total em celulares e tablets Android e iOS",
                "Consulta rápida de estoque atualizado e prazo de entrega por lote",
                "Sincronização automática em segundo plano assim que encontrar sinal",
                "Histórico das últimas compras e ciclo de reposição de cada cliente",
              ],
              ctaLabel: "Testar Aplicativo Força de Vendas",
              ctaHref: "#trial-b2b",
              statNumber: "0 atrasos",
              statLabel: "Pedidos caem no ERP no mesmo segundo",
            },
            {
              id: "tab-catalogo",
              tabLabel: "Catálogo Digital",
              tabIconName: "ShoppingBag",
              title: "Catálogo visual de produtos com fotos em alta e tabelas personalizadas",
              description:
                "Apresente produtos de forma profissional com fotos em alta definição, especificações técnicas e preços calculados conforme a tabela do cliente.",
              badge: "Substitui Papel",
              benefits: [
                "Exibição de fotos em alta resolução com zoom e dados técnicos",
                "Tabelas de preços dinâmicas atribuídas automaticamente por canal e estado",
                "Filtros ágeis por categoria, marca, disponibilidade e lançamentos",
                "Fim dos catálogos impressos desatualizados e caros",
              ],
              ctaLabel: "Conhecer o Catálogo Digital",
              ctaHref: "#trial-b2b",
              statNumber: "+32%",
              statLabel: "No mix de produtos vendidos",
            },
            {
              id: "tab-politicas",
              tabLabel: "Políticas Comerciais & Flex",
              tabIconName: "ShieldCheck",
              title: "Regras de preço, descontos máximos e Saldo Flex sem perder margem",
              description:
                "Garanta a lucratividade da empresa com limites rígidos de desconto, regras fiscais automáticas por UF (ST e ICMS) e controle de conta corrente do vendedor.",
              badge: "Blindagem de Margem",
              benefits: [
                "Bloqueio de pedidos com descontos fora da alçada permitida",
                "Cálculo automático de impostos, substituição tributária (ST) e frete",
                "Gestão de Saldo Flex para representantes negociarem com autonomia responsável",
                "Validação em tempo real do limite de crédito e títulos em aberto",
              ],
              ctaLabel: "Ver Gestão de Políticas",
              ctaHref: "#trial-b2b",
              statNumber: "100% seguro",
              statLabel: "Sem pedidos errados na faturamento",
            },
            {
              id: "tab-b2b-store",
              tabLabel: "E-commerce B2B 24/7",
              tabIconName: "Laptop",
              title: "Canal de autoatendimento para clientes recomprarem a qualquer hora",
              description:
                "Loja virtual B2B exclusiva para seus clientes lojistas emitirem pedidos de reposição com as condições e prazos comerciais acordados.",
              badge: "Vendas 24 Horas",
              benefits: [
                "Portal B2B com login exclusivo por CNPJ e condições personalizadas",
                "Emissão de 2ª via de boleto bancário e download de XML da nota fiscal",
                "Reposição rápida com base nos pedidos anteriores em 2 cliques",
                "Comissão do representante garantida mesmo nas compras feitas online",
              ],
              ctaLabel: "Ativar Loja B2B",
              ctaHref: "#trial-b2b",
              statNumber: "+40% recompras",
              statLabel: "Fora do horário comercial",
            },
            {
              id: "tab-bi",
              tabLabel: "Inteligência & Curva ABC",
              tabIconName: "BarChart3",
              title: "Mais de 30 relatórios gerenciais e acompanhamento de metas",
              description:
                "Identifique clientes que estão sumindo (churn), analise a Curva ABC de compradores e produtos, e acompanhe o ranking de metas da equipe.",
              badge: "Decisões com Dados",
              benefits: [
                "Curva ABC de clientes para focar esforços nas contas mais lucrativas",
                "Alertas automáticos de positivação e clientes em queda de compras",
                "Dashboard de metas diárias, semanais e mensais por representante",
                "Relatórios de ticket médio, produtos mais vendidos e margem bruta",
              ],
              ctaLabel: "Explorar Relatórios",
              ctaHref: "#trial-b2b",
              statNumber: "+25% positivação",
              statLabel: "Na carteira ativa de clientes",
            },
          ],
        },
      },
      {
        type: "interactive_quote_calculator",
        config: {
          title: "Simulador de Retorno sobre Investimento (ROI B2B)",
          subtitle:
            "Calcule quanto tempo sua equipe economiza ao eliminar a digitação manual de pedidos e retrabalho.",
          basePriceCents: 9900,
          unitLabel: "Representante Comercial",
          unitPluralLabel: "Representantes Comerciais",
          minUnits: 1,
          maxUnits: 100,
          defaultUnits: 8,
          unitPriceCents: 9900,
          options: [
            {
              id: "opt-ecommerce-b2b",
              label: "Portal E-commerce B2B Integrado",
              description: "Canal de vendas online exclusivo para clientes PJ recomprarem 24/7.",
              priceCents: 39000,
              isDefault: true,
            },
            {
              id: "opt-erp-connector",
              label: "Conector de Integração Bidirecional com ERP",
              description: "Sincronização automática de produtos, clientes, estoque e pedidos.",
              priceCents: 25000,
              isDefault: true,
            },
          ],
          whatsappNumber: "5511999998888",
          submitButtonText: "Solicitar Proposta Corporativa",
          successMessage: "Simulação realizada! Nossa equipe de especialistas B2B apresentará uma proposta formal.",
          disclaimer:
            "Valores com faturamento mensal. Consulte condições especiais e descontos para planos anuais corporativos.",
        },
      },
      {
        type: "video_section",
        config: {
          badge: "SOFTWARE EM AÇÃO",
          title: "Da rua até o armazém: veja o fluxo de um pedido",
          subtitle:
            "Demonstração de emissão de pedido offline no tablet e sincronização automática com o ERP.",
          video_url: "",
          button_text: "Testar por 7 Dias Grátis",
          button_link: "#trial-b2b",
        },
      },
      {
        type: "pricing_three_tiers",
        config: {
          title: "Planos Estruturados para o Tamanho da sua Operação",
          subtitle: "Teste grátis por 7 dias sem compromisso. Implantação ágil com acompanhamento especializado.",
          tiers: [
            {
              id: "tier-b2b-essencial",
              name: "Plano Essencial",
              badge: "Equipes Enxutas",
              priceMonthlyCents: 9900,
              priceAnnualCents: 7900,
              description: "Para distribuidoras e representações comerciais de até 5 usuários.",
              features: [
                "Aplicativo Força de Vendas 100% offline",
                "Catálogo digital de produtos com fotos",
                "Controle de tabelas de preços e descontos",
                "Histórico de clientes e últimos pedidos",
                "Exportação de relatórios em Excel/PDF",
                "Suporte prioritário por chat e e-mail",
              ],
              ctaLabel: "Testar Essencial",
              ctaHref: "#trial-b2b",
              isPopular: false,
            },
            {
              id: "tier-b2b-pro",
              name: "Plano Pro",
              badge: "Mais Escolhido",
              priceMonthlyCents: 15900,
              priceAnnualCents: 12900,
              description: "Para empresas estruturadas que necessitam de integração com ERP.",
              features: [
                "Tudo do plano Essencial",
                "Integração bidirecional com seu ERP",
                "Políticas comerciais avançadas e travas de desconto",
                "Portal do Cliente B2B com 2ª via de boletos",
                "Gestão de metas e comissões da equipe",
                "Treinamento remoto para representantes",
              ],
              ctaLabel: "Testar Pro",
              ctaHref: "#trial-b2b",
              isPopular: true,
            },
            {
              id: "tier-b2b-enterprise",
              name: "Plano Performance & Enterprise",
              badge: "Corporativo",
              priceMonthlyCents: 24900,
              priceAnnualCents: 19900,
              description: "Para indústrias e grandes distribuidoras com processos complexos.",
              features: [
                "Tudo do plano Pro",
                "Gestão completa de Saldo Flex para negociadores",
                "Relatórios de inteligência e Curva ABC de clientes",
                "Check-in/Check-out de visitas com telemetria GPS",
                "Módulo de E-commerce B2B White Label exclusivo",
                "Gerente de sucesso dedicado e SLA de atendimento VIP",
              ],
              ctaLabel: "Falar com Consultor B2B",
              ctaHref: "#trial-b2b",
              isPopular: false,
            },
          ],
        },
      },
      {
        type: "testimonials_social_proof",
        config: {
          title: "Líderes de Mercado que Confiam na Plataforma",
          subtitle: "Mais de 10.000 indústrias, distribuidoras e representações comerciais utilizam a solução diariamente.",
          testimonials: [
            {
              id: "t-m1",
              name: "Eduardo Silveira",
              role: "Diretor Comercial da Distribuidora Alvorada",
              rating: 5,
              comment:
                "Nossos 35 representantes gastavam horas ligando para a matriz para saber se tinha produto em estoque ou se o cliente tinha crédito. Com o aplicativo offline, eles fecham o pedido na hora e o estoque já é reservado no Protheus.",
              verified: true,
            },
            {
              id: "t-m2",
              name: "Renata Vasconcellos",
              role: "Gerente de TI da Indústria MetalSul",
              rating: 5,
              comment:
                "A integração com o nosso ERP foi impecável. Eliminamos 100% da digitação de pedidos e os erros fiscais de ICMS-ST simplesmente zeraram.",
              verified: true,
            },
            {
              id: "t-m3",
              name: "Gustavo Barreto",
              role: "Escritório de Representação Sul Comercial",
              rating: 5,
              comment:
                "O E-commerce B2B foi uma virada de chave. Nossos clientes repõem mercadoria no sábado e domingo sem precisar nos incomodar e a nossa comissão continua caindo normal.",
              verified: true,
            },
          ],
        },
      },
      {
        type: "faq_clean_accordion",
        config: {
          title: "Dúvidas Frequentes sobre a Solução B2B",
          subtitle: "Esclarecimentos sobre integração de sistemas, suporte e implantação.",
          items: [
            {
              id: "faq-m1",
              question: "Como funciona a integração com o meu ERP?",
              answer:
                "Possuímos conectores prontos para os principais ERPs do mercado (Totvs, Senior, Sankhya, Bling, Omie, Tiny, SAP B1 e outros). A sincronização de clientes, produtos, preços e pedidos ocorre automaticamente em segundo plano via API segura.",
            },
            {
              id: "faq-m2",
              question: "O aplicativo realmente funciona sem internet?",
              answer:
                "Sim. O banco de dados fica armazenado no dispositivo do representante. Ele pode consultar fotos, preços, limite de crédito e emitir pedidos mesmo em fazendas, estradas ou depósitos sem sinal. Assim que o aparelho detecta sinal Wi-Fi ou 4G, os pedidos são transmitidos ao ERP.",
            },
            {
              id: "faq-m3",
              question: "Como funciona o período de teste de 7 dias?",
              answer:
                "Você cadastra sua empresa gratuitamente, recebe acesso imediato e pode baixar o aplicativo para testar com sua equipe durante 7 dias sem pagar nada e sem cartão de crédito.",
            },
            {
              id: "faq-m4",
              question: "A equipe de representantes recebe treinamento?",
              answer:
                "Sim. Nossos especialistas realizam o onboarding e fornecem materiais práticos em vídeo para que seus vendedores comecem a emitir pedidos no mesmo dia.",
            },
          ],
        },
      },
      {
        type: "contact_form_direct",
        config: {
          title: "Agende uma Demonstração Personalizada ou Inicie o Trial",
          subtitle: "Nossa equipe de consultores B2B apresentará a plataforma configurada para o segmento da sua indústria ou distribuidora.",
          submitButtonText: "Solicitar Demonstração Gratuita",
          whatsappNumber: "5511999998888",
          showPhoneField: true,
          showMessageField: true,
          successMessage: "Solicitação recebida com sucesso! Um especialista em vendas B2B entrará em contato em até 2 horas úteis.",
        },
      },
    ],
  },

  // 14. SISTEMA VERTICAL: E-COMMERCE & PICKING PARA SUPERMERCADOS (ESTILO OSUPER)
  {
    id: "template_saas_supermarket_osuper",
    name: "Plataforma de E-commerce & Picking para Supermercados",
    niche: "grocery_saas",
    description:
      "Landing page de vendas da plataforma de e-grocery para supermercados e atacarejos estilo OSuper: aplicativo e site white label próprio, separador inteligente de gôndola (Picking & Packing), pesagem fracionada de hortifrúti, substituição de produtos via WhatsApp, encartes digitais, simulador de viabilidade, planos e agendamento de diagnóstico.",
    badge: "Paridade OSuper",
    blocks: [
      {
        type: "hero_minimal_split",
        config: {
          badgeText: "A PLATAFORMA LÍDER DE E-COMMERCE PARA O SETOR SUPERMERCADISTA",
          title: "O e-commerce e aplicativo próprio da sua rede de supermercados",
          subtitle:
            "Digitalize sua loja física com picking inteligente nas gôndolas, pesagem fracionada de hortifrúti, integração direta com seu PDV/ERP e entrega expressa ou clique & retire.",
          primaryCta: { label: "Solicitar Diagnóstico e Demonstração", href: "#diagnostico-mercado" },
          secondaryCta: { label: "Conhecer o Módulo de Picking", href: "#modulos" },
          floatingStat: { label: "ASSERTIVIDADE DE PICKING", value: "99.4% no carrinho", statusDot: true },
        },
      },
      {
        type: "infinite_marquee_ribbon",
        config: {
          title: "Integração direta com os principais PDVs e softwares do setor supermercadista",
          direction: "left",
          speedSeconds: 22,
          pauseOnHover: true,
          items: [
            { id: "s-m1", text: "Sysmo Sistemas PDV", badgeText: "Homologado" },
            { id: "s-m2", text: "Scanntech Varejo", badgeText: "Promoções" },
            { id: "s-m3", text: "VR Software Supermercados", badgeText: "Integrado" },
            { id: "s-m4", text: "Arius Sistemas", badgeText: "PDV" },
            { id: "s-m5", text: "Balanças Toledo Prix", badgeText: "Pesagem" },
            { id: "s-m6", text: "Filizola Balanças", badgeText: "Checkout" },
            { id: "s-m7", text: "RMS Totvs Supermercados", badgeText: "ERP" },
          ],
        },
      },
      {
        type: "software_feature_tabs",
        config: {
          title: "Tecnologia de ponta pensada para a complexidade do varejo alimentar",
          subtitle:
            "Muito além de um e-commerce tradicional: ferramentas específicas para resolver pesagem, substituição de itens e rotas nas gôndolas.",
          badgeText: "MÓDULOS DE E-GROCERY",
          tabs: [
            {
              id: "tab-whitelabel",
              tabLabel: "App & Site White Label",
              tabIconName: "Smartphone",
              title: "Canais de venda próprios com a marca e cores da sua rede",
              description:
                "Aplicativo nas lojas da Apple e Google, e site responsivo com o logotipo e identidade do seu supermercado, sem competir com terceiros.",
              badge: "Marca Própria",
              benefits: [
                "Aplicativo nativo para iOS e Android publicado na conta da sua empresa",
                "Site rápido e otimizado com navegação intuitiva por corredores virtuais",
                "Clube de descontos próprio com cupons exclusivos ativados no aplicativo",
                "Total soberania sobre sua base de clientes sem intermediários",
              ],
              ctaLabel: "Ver Modelo de Aplicativo Próprio",
              ctaHref: "#diagnostico-mercado",
              statNumber: "+45% fidelidade",
              statLabel: "Dos clientes que compram pelo app próprio",
            },
            {
              id: "tab-picking",
              tabLabel: "Picking & Packing Inteligente",
              tabIconName: "ShoppingCart",
              title: "Separador de pedidos nas gôndolas com rota lógica e leitor de código de barras",
              description:
                "O aplicativo de picking guia o operador pelos corredores no menor trajeto físico possível, conferindo códigos de barras e agilizando a montagem das caixas.",
              badge: "Eficiência Máxima",
              benefits: [
                "Trajeto inteligente na loja que agrupa itens por seção (hortifrúti, frios, secos)",
                "Conferência via câmera do celular ou leitor laser para evitar erros de despacho",
                "Múltiplos pedidos separados simultaneamente pelo mesmo operador (multi-picking)",
                "Redução comprovada do tempo de separação de 35 para 12 minutos por compra",
              ],
              ctaLabel: "Conhecer o Separador de Pedidos",
              ctaHref: "#diagnostico-mercado",
              statNumber: "12 min",
              statLabel: "Tempo médio de separação por pedido",
            },
            {
              id: "tab-pesagem",
              tabLabel: "Pesagem Fracionada & Balanças",
              tabIconName: "Receipt",
              title: "Pesagem exata de hortifrúti, padaria e açougue com balança integrada",
              description:
                "Cobrança precisa por peso real: o cliente pede 500g, o separador pesa 530g e o sistema recalcula o valor automaticamente no cartão sem estorno manual.",
              badge: "Zero Prejuízo",
              benefits: [
                "Integração nativa com balanças de conferência (Toledo Prix, Filizola)",
                "Ajuste automático de valor no cartão conforme o peso exato separado",
                "Permite ao cliente escolher o ponto de maturação de frutas e cortes de carne",
                "Fim das divergências entre peso estimado e peso efetivamente entregue",
              ],
              ctaLabel: "Ver Módulo de Pesagem",
              ctaHref: "#diagnostico-mercado",
              statNumber: "100% exato",
              statLabel: "Sem perdas na pesagem fracionada",
            },
            {
              id: "tab-rupturas",
              tabLabel: "Gestão de Rupturas & WhatsApp",
              tabIconName: "Users",
              title: "Substituição ágil de produtos em falta com comunicação direta",
              description:
                "Se um item estiver esgotado na gôndola, o operador sugere uma substituição com foto diretamente no WhatsApp do cliente para aprovação com 1 toque.",
              badge: "Sem Ruptura",
              benefits: [
                "Sugestão inteligente de produtos alternativos da mesma marca ou categoria",
                "Envio automático de mensagem e foto no WhatsApp do comprador",
                "O cliente aprova ou rejeita com 1 toque sem precisar ligar para o SAC",
                "Atualização automática do status de ruptura no ERP para reabastecimento",
              ],
              ctaLabel: "Ver Gestão de Substituições",
              ctaHref: "#diagnostico-mercado",
              statNumber: "94% aceite",
              statLabel: "Nas substituições sugeridas com foto",
            },
            {
              id: "tab-encarte",
              tabLabel: "Encartes & Tabloide Digital",
              tabIconName: "Flame",
              title: "Encarte digital interativo de ofertas integrado direto ao carrinho",
              description:
                "Transforme o clássico folheto de ofertas impresso em um tabloide digital no WhatsApp onde o cliente toca no produto e ele já entra na sacola de compras.",
              badge: "Engajamento Alto",
              benefits: [
                "Folheto digital interativo com produtos clicáveis que vão direto ao carrinho",
                "Distribuição automatizada de ofertas para listas de transmissão do WhatsApp",
                "Economia de até 80% nos custos de gráfica e impressão de encartes em papel",
                "Relatório em tempo real de quais ofertas tiveram mais cliques e compras",
              ],
              ctaLabel: "Criar Encarte Digital",
              ctaHref: "#diagnostico-mercado",
              statNumber: "80% economia",
              statLabel: "Em custos de gráfica e distribuição de encartes",
            },
          ],
        },
      },
      {
        type: "interactive_quote_calculator",
        config: {
          title: "Simulador de Potencial Digital da sua Loja ou Rede",
          subtitle:
            "Estime o faturamento adicional que o e-commerce próprio e o picking inteligente trarão para o seu supermercado.",
          basePriceCents: 49000,
          unitLabel: "Loja Física na Rede",
          unitPluralLabel: "Lojas Físicas na Rede",
          minUnits: 1,
          maxUnits: 20,
          defaultUnits: 2,
          unitPriceCents: 25000,
          options: [
            {
              id: "opt-app-nativo",
              label: "Aplicativo Nativo Próprio (iOS e Android)",
              description: "Publicação do app com ícone e nome da sua marca nas lojas oficiais.",
              priceCents: 40000,
              isDefault: true,
            },
            {
              id: "opt-picking-multi",
              label: "Multi-Picking Simultâneo para até 10 Operadores",
              description: "Separação paralela de múltiplas compras ao mesmo tempo nas gôndolas.",
              priceCents: 30000,
              isDefault: true,
            },
          ],
          whatsappNumber: "5511999998888",
          submitButtonText: "Solicitar Diagnóstico de Viabilidade Digital",
          successMessage: "Diagnóstico solicitado com sucesso! Nossa equipe de especialistas supermercadistas entrará em contato.",
          disclaimer:
            "Projeção baseada em dados médios do setor supermercadista brasileiro (e-grocery representa entre 4% a 8% do faturamento da loja física).",
        },
      },
      {
        type: "video_section",
        config: {
          badge: "TECNOLOGIA NA PRÁTICA",
          title: "Veja o processo de separação em uma loja real",
          subtitle:
            "Acompanhe um operador separando uma compra de 40 itens em menos de 15 minutos com o aplicativo de picking.",
          video_url: "",
          button_text: "Agendar Demonstração ao Vivo",
          button_link: "#diagnostico-mercado",
        },
      },
      {
        type: "pricing_three_tiers",
        config: {
          title: "Estruturas Comerciais Sob Medida para Redes de Supermercados",
          subtitle: "Implantação assistida, treinamento da equipe de pickers e conexão direta com seu ERP e PDV.",
          tiers: [
            {
              id: "tier-supermarket-loja-unica",
              name: "Loja Única / Supermercado Independente",
              badge: "Loja Individual",
              priceMonthlyCents: 49000,
              priceAnnualCents: 39000,
              description: "Para supermercados e hortifrútis de 1 loja física que querem iniciar no digital.",
              features: [
                "Site e Web App próprio com as cores do mercado",
                "Aplicativo de Picking & Packing para 2 operadores",
                "Pesagem fracionada integrada para hortifrúti",
                "Gestão de rupturas e substituição via WhatsApp",
                "Integração de preços e estoque com seu PDV",
                "Suporte técnico com atendimento prioritário",
              ],
              ctaLabel: "Solicitar Proposta",
              ctaHref: "#diagnostico-mercado",
              isPopular: false,
            },
            {
              id: "tier-supermarket-rede-media",
              name: "Rede Média (2 a 5 Lojas)",
              badge: "Mais Escolhido",
              priceMonthlyCents: 89000,
              priceAnnualCents: 71000,
              description: "A solução completa para redes em expansão que precisam de aplicativo nativo próprio.",
              features: [
                "Tudo do plano Loja Única",
                "Aplicativo nativo próprio para iOS e Android",
                "Roteamento automático do pedido pela loja mais próxima",
                "Multi-picking simultâneo para até 10 operadores",
                "Encartes e tabloides digitais interativos",
                "Módulo de expedição e motoristas (Clique & Retire e Entrega)",
              ],
              ctaLabel: "Solicitar Diagnóstico",
              ctaHref: "#diagnostico-mercado",
              isPopular: true,
            },
            {
              id: "tier-supermarket-enterprise",
              name: "Grandes Redes & Atacarejos",
              badge: "Enterprise",
              priceMonthlyCents: 159000,
              priceAnnualCents: 129000,
              description: "Para grandes redes, hipermercados e atacarejos com alto volume de pedidos.",
              features: [
                "Tudo do plano Rede Média",
                "Suporte a lojas ilimitadas e dark stores dedicadas",
                "Operadores e pickers ilimitados",
                "Infraestrutura de alta escala em nuvem (suporta feirões e Black Friday)",
                "Integração personalizada com ERPs proprietários ou legados",
                "Gerente de contas e equipe de engenharia dedicada",
              ],
              ctaLabel: "Falar com Consultor Enterprise",
              ctaHref: "#diagnostico-mercado",
              isPopular: false,
            },
          ],
        },
      },
      {
        type: "testimonials_social_proof",
        config: {
          title: "O Que Dizem os Diretores e Gerentes de Redes de Supermercados",
          subtitle: "Depoimentos de quem transformou a operação da loja física em uma potência digital.",
          testimonials: [
            {
              id: "t-s1",
              name: "Valter Campagnolo",
              role: "Diretor de Operações da Rede SuperMax (6 lojas)",
              rating: 5,
              comment:
                "Nossa maior preocupação era o hortifrúti e as carnes. O módulo de pesagem do sistema resolveu 100% disso: o cliente pede 800g de alcatra, o açougueiro corta 820g e o sistema ajusta a cobrança sem dar prejuízo. Hoje o e-commerce representa 7% das nossas vendas totais.",
              verified: true,
            },
            {
              id: "t-s2",
              name: "Claudia Regina",
              role: "Gerente de E-commerce do Hipermercado Estrela",
              rating: 5,
              comment:
                "O aplicativo de picking reduziu o tempo de separação pela metade. O trajeto inteligente faz os meninos pegarem todos os itens de cada corredor de uma vez, sem ficar andando em círculos pela loja.",
              verified: true,
            },
            {
              id: "t-s3",
              name: "Antonio Marcos",
              role: "Proprietário do Sacolão & Hortifrúti Boa Safra",
              rating: 5,
              comment:
                "O encarte digital no WhatsApp é um sucesso absoluto. O cliente abre o folheto no celular, clica no tomate ou na maçã e a compra já cai no nosso balcão.",
              verified: true,
            },
          ],
        },
      },
      {
        type: "faq_clean_accordion",
        config: {
          title: "Dúvidas Frequentes sobre a Implantação de E-commerce Alimentar",
          subtitle: "Respostas claras sobre integração com PDV, balanças e treinamento.",
          items: [
            {
              id: "faq-s1",
              question: "Como os preços e o estoque físico são sincronizados?",
              answer:
                "A plataforma conecta diretamente ao banco de dados do seu ERP ou frente de caixa (PDV). Quando um preço muda no PDV da loja física, ele é atualizado no site e aplicativo no mesmo instante.",
            },
            {
              id: "faq-s2",
              question: "Como funciona a separação (picking) nas gôndolas?",
              answer:
                "Os operadores da sua equipe utilizam nosso aplicativo de picking em um smartphone comum. O app organiza os itens na sequência lógica dos corredores da sua loja física e usa a câmera para bipar os códigos de barras, garantindo que o produto correto seja colocado na cesta.",
            },
            {
              id: "faq-s3",
              question: "E se o cliente pedir uma fruta que está madura demais ou faltar uma marca?",
              answer:
                "O operador pode tirar uma foto na hora pelo app de picking e sugerir uma marca alternativa. O cliente recebe uma notificação com a foto no WhatsApp e aprova ou recusa com um simples toque.",
            },
            {
              id: "faq-s4",
              question: "Vocês fornecem treinamento para a nossa equipe de loja?",
              answer:
                "Sim. A implantação inclui treinamento prático para os operadores de picking, encarregados de loja e equipe do SAC, assegurando operação fluida desde o primeiro dia de vendas.",
            },
          ],
        },
      },
      {
        type: "contact_form_direct",
        config: {
          title: "Solicite um Diagnóstico de Viabilidade Digital para sua Rede",
          subtitle: "Nossa equipe de consultores especializados em varejo supermercadista analisará sua praça e apresentará uma proposta personalizada.",
          submitButtonText: "Solicitar Diagnóstico e Demonstração",
          whatsappNumber: "5511999998888",
          showPhoneField: true,
          showMessageField: true,
          successMessage: "Diagnóstico solicitado com sucesso! Um consultor de varejo supermercadista entrará em contato em breve.",
        },
      },
    ],
  },
];

export const VERTICAL_SYSTEMS_SAAS_TEMPLATES: NicheTemplateDefinition[] = NICHE_TEMPLATE_MATRIX.slice(-4);

export interface TourismWixAppPageTemplate extends NicheTemplateDefinition {
  slug: string;
  title: string;
  document_type: "storefront" | "campaign" | "landing_page" | "institutional";
  is_home: boolean;
}

export const TOURISM_WIX_APP_PAGES: TourismWixAppPageTemplate[] = [
  {
    id: "wix_tourism_home",
    name: "Vitrine Principal & Buscador GDS",
    niche: "tourism",
    slug: "inicio-turismo",
    title: "Início — Viagens & Buscador GDS",
    document_type: "storefront",
    is_home: true,
    badge: "App Turismo • Home",
    description: "Página principal integrada ao motor de busca InfoTravel GDS, destinos e hotéis parceiros.",
    blocks: [
      {
        type: "dynamic_booking_hero",
        config: {
          title: "Sua Próxima Viagem Começa Aqui",
          subtitle: "Pacotes completos, passagens aéreas e resorts exclusivos com cotação online imediata.",
          badge: "Tarifas Exclusivas de Agência • InfoTravel GDS",
          defaultOrigin: "Chapecó, SC",
          defaultDestination: "Maceió, AL",
          showBenefitsBar: true,
        },
      },
      {
        type: "tourism_destinations_carousel",
        config: {
          title: "Destinos Mais Desejados",
          subtitle: "Roteiros com aéreo, hospedagem selecionada e suporte completo da agência.",
        },
      },
      {
        type: "travel_hotel_slider",
        config: {
          title: "Hotéis e Resorts Conveniados",
          subtitle: "Hospedagens verificadas com tarifas negociadas diretamente com operadoras.",
        },
      },
      {
        type: "tourism_services_grid",
        config: {
          title: "Especialidades da Agência",
          subtitle: "Assessoria completa antes, durante e após o seu embarque.",
        },
      },
    ],
  },
  {
    id: "wix_tourism_packages",
    name: "Catálogo de Pacotes & Roteiros",
    niche: "tourism",
    slug: "pacotes",
    title: "Pacotes & Roteiros",
    document_type: "campaign",
    is_home: false,
    badge: "App Turismo • Pacotes",
    description: "Vitrine dedicada a pacotes promocionais, excursões em grupo e cronograma dia a dia.",
    blocks: [
      {
        type: "travel_package_hero",
        config: {
          title: "Pacotes Completos com Aéreo e Resort",
          subtitle: "Saídas garantidas, bloqueios aéreos exclusivos e parcelamento facilitado.",
        },
      },
      {
        type: "tourism_destinations_carousel",
        config: {
          title: "Saídas Confirmadas da Temporada",
          subtitle: "Escolha seu destino e garanta tarifa de lote promocional.",
        },
      },
      {
        type: "travel_itinerary_timeline",
        config: {
          title: "Como Funciona a Experiência Dia a Dia",
          subtitle: "Planejamento transparente do embarque ao retorno.",
        },
      },
      {
        type: "faq_clean_accordion",
        config: {
          title: "Dúvidas sobre Pacotes e Reservas",
          subtitle: "Informações claras sobre bagagem, documentação e formas de pagamento.",
          items: [
            {
              id: "faq-pkg-1",
              question: "Como funciona o parcelamento no boleto e cartão?",
              answer: "Você pode parcelar sua viagem com entrada reduzida via Pix e saldo em até 12x no cartão ou boleto bancário sujeito à aprovação.",
            },
            {
              id: "faq-pkg-2",
              question: "Os pacotes incluem bagagem despachada e transfer?",
              answer: "Cada opção da proposta detalha de forma transparente a franquia de bagagem incluída e o tipo de traslado entre aeroporto e hotel.",
            },
          ],
        },
      },
    ],
  },
  {
    id: "wix_tourism_hotels",
    name: "Buscador de Hotéis, Resorts & Voos",
    niche: "tourism",
    slug: "hoteis",
    title: "Hotéis, Resorts & Aéreo",
    document_type: "campaign",
    is_home: false,
    badge: "App Turismo • Hotéis & GDS",
    description: "Página de autoatendimento conectada ao InfoTravel para pesquisa de hospedagens e malha aérea.",
    blocks: [
      {
        type: "dynamic_booking_hero",
        config: {
          title: "Reserve Hotéis, Resorts e Passagens Aéreas",
          subtitle: "Compare opções verificadas em tempo real e receba sua proposta interativa.",
          badge: "Conexão Direta Operadoras",
          defaultOrigin: "São Paulo, SP",
          defaultDestination: "Gramado, RS",
          showBenefitsBar: false,
        },
      },
      {
        type: "travel_hotel_slider",
        config: {
          title: "Seleção de Resorts & Hotéis Recomendados",
          subtitle: "Opções avaliadas por viajantes reais nos principais destinos.",
        },
      },
      {
        type: "travel_product_detail",
        config: {
          title: "Destaque da Semana em Hospedagem",
          subtitle: "Estrutura completa de lazer, gastronomia e conforto para sua família.",
        },
      },
    ],
  },
  {
    id: "wix_tourism_quote",
    name: "Central de Cotação Personalizada",
    niche: "tourism",
    slug: "cotacao",
    title: "Solicitar Cotação Sob Medida",
    document_type: "landing_page",
    is_home: false,
    badge: "App Turismo • Cotação",
    description: "Captura estruturada de orçamento integrada diretamente ao Kanban de Cotações da agência.",
    blocks: [
      {
        type: "tourism_quote_hero",
        config: {
          title: "Planeje Sua Viagem Sob Medida",
          subtitle: "Informe seu destino, datas e configuração de quartos para receber uma proposta comparativa com até 4 opções.",
          badge: "Atendimento Especializado",
          destinationPresets: ["Maceió", "Gramado", "Buenos Aires", "Punta Cana", "Orlando", "Europa"],
        },
      },
      {
        type: "tourism_services_grid",
        config: {
          title: "O Que Incluímos no Seu Planejamento",
          subtitle: "Cuidamos de passagens, hospedagem, seguro viagem, locação de veículos e vistos.",
        },
      },
      {
        type: "interactive_quote_calculator",
        config: {
          title: "Simulador de Viagens em Grupo & Pacotes",
          subtitle: "Calcule uma estimativa preliminar para o seu grupo com comodidades inclusas.",
          basePriceCents: 120000,
          unitLabel: "Viajante",
          unitPluralLabel: "Viajantes",
          minUnits: 1,
          maxUnits: 40,
          defaultUnits: 2,
          unitPriceCents: 85000,
          options: [
            {
              id: "opt-seguro",
              label: "Seguro Viagem Internacional Completo",
              description: "Cobertura médica de até USD 60.000 e extravio de bagagem.",
              priceCents: 18000,
              isDefault: true,
            },
            {
              id: "opt-transfer",
              label: "Transfer Privativo Aeroporto ↔ Hotel",
              description: "Recepção com motorista credenciado em van executiva.",
              priceCents: 25000,
              isDefault: false,
            },
          ],
          whatsappNumber: "5511999998888",
          submitButtonText: "Solicitar Proposta Completa da Agência",
          successMessage: "Simulação enviada com sucesso! Um consultor entrará em contato.",
          disclaimer: "Estimativa baseada em tarifas médias de baixa temporada. Sujeito à disponibilidade no ato da reserva.",
        },
      },
    ],
  },
  {
    id: "wix_tourism_portal",
    name: "Portal do Viajante (Vouchers & Contratos)",
    niche: "tourism",
    slug: "minhas-viagens",
    title: "Portal do Viajante — Minhas Viagens",
    document_type: "institutional",
    is_home: false,
    badge: "App Turismo • Portal B2C",
    description: "Área do passageiro para consulta de reservas, download de vouchers, contratos e pré-embarque.",
    blocks: [
      {
        type: "customer_travel_portal",
        config: {
          title: "Portal do Viajante",
          subtitle: "Acesse seus vouchers, localizadores aéreos, contrato digital e guia de pré-embarque.",
        },
      },
    ],
  },
];

export const COMMERCE_WIX_APP_PAGES: TourismWixAppPageTemplate[] = [
  {
    id: "wix_commerce_home",
    name: "Vitrine Principal do E-Commerce",
    niche: "commerce",
    slug: "inicio-loja",
    title: "Início — Vitrine Oficial da Loja",
    document_type: "storefront",
    is_home: true,
    badge: "App Loja • Home",
    description: "Página inicial com carrossel dinâmico, produtos em alta, ofertas relâmpago e selos de segurança.",
    blocks: [
      {
        type: "hero_interactive_carousel",
        config: {
          autoPlay: true,
          intervalSeconds: 5,
          slides: [
            {
              id: "sl-1",
              badgeText: "NOVIDADES DA SEMANA",
              title: "Coleção exclusiva com pronta entrega para todo o Brasil.",
              subtitle: "Produtos selecionados com garantia de procedência e frete rápido.",
              primaryCta: { label: "Ver Produtos", href: "#produtos" },
              highlightTag: "Destaque",
            },
          ],
        },
      },
      {
        type: "category_icon_grid",
        config: {
          title: "Navegue por Categorias",
          subtitle: "Encontre exatamente o que você procura em poucos cliques.",
          columns: 6,
        },
      },
      {
        type: "curated_hits_rail",
        config: {
          title: "Top Mais Vendidos da Semana",
          subtitle: "Os itens mais pedidos pelos clientes com disponibilidade imediata.",
        },
      },
      {
        type: "product_grid",
        config: {
          title: "Destaques do Estoque",
          subtitle: "Grade completa de produtos disponíveis para compra com 1 toque.",
          columns: 4,
        },
      },
      {
        type: "flash_sale_hero",
        config: {
          title: "Descontos Especiais por Tempo Limitado",
          subtitle: "Aproveite cupons promocionais válidos até o final da semana.",
          discountPercentage: "25% OFF",
          couponCode: "PRIMEIRACOMPRA",
          buttonText: "Comprar com Desconto",
          targetLink: "#produtos",
        },
      },
      {
        type: "trust_badges",
        config: {
          badges: [
            { icon: "Truck", title: "Entrega Rastreada", description: "Envio rápido com código de acompanhamento" },
            { icon: "ShieldCheck", title: "Pagamento 100% Protegido", description: "Pix instantâneo e parcelamento seguro" },
            { icon: "RotateCcw", title: "Troca Sem Burocracia", description: "7 dias para devolução gratuita" },
          ],
        },
      },
      {
        type: "testimonials_social_proof",
        config: {
          title: "O Que Nossos Clientes Dizem",
          subtitle: "Avaliações verificadas de quem comprou e aprovou nossos produtos.",
          testimonials: [],
        },
      },
    ],
  },
  {
    id: "wix_commerce_catalog",
    name: "Catálogo Completo & Busca",
    niche: "commerce",
    slug: "catalogo-produtos",
    title: "Catálogo Completo — Todos os Produtos",
    document_type: "storefront",
    is_home: false,
    badge: "App Loja • Catálogo",
    description: "Página dedicada para navegação aprofundada com categorias, ordenação e vitrines completas.",
    blocks: [
      {
        type: "category_icon_grid",
        config: {
          title: "Categorias da Loja",
          subtitle: "Filtre por departamentos e linhas de produtos.",
          columns: 6,
        },
      },
      {
        type: "product_grid",
        config: {
          title: "Todos os Produtos",
          subtitle: "Catálogo completo sincronizado com nosso estoque em tempo real.",
          columns: 4,
        },
      },
      {
        type: "product_rail",
        config: {
          title: "Outros Lançamentos",
          subtitle: "Novidades que acabaram de chegar ao centro de distribuição.",
        },
      },
      {
        type: "info_cards",
        config: {
          cards: [
            { icon: "truck", title: "Frete Inteligente", description: "Cálculo direto no carrinho com transportadoras parceiras." },
            { icon: "shield", title: "Compra Segura", description: "Ambiente criptografado com validação antifraude." },
          ],
        },
      },
    ],
  },
  {
    id: "wix_commerce_pdp",
    name: "Página de Produto (PDP) & Detalhes",
    niche: "commerce",
    slug: "detalhes-produto",
    title: "Detalhe do Produto — Especificações e Compra",
    document_type: "storefront",
    is_home: false,
    badge: "App Loja • Produto",
    description: "Estrutura padrão de página de produto com composição, tabela de medidas e dúvidas frequentes.",
    blocks: [
      {
        type: "shop_the_look_hotspots",
        config: {
          title: "Composição & Detalhes da Peça",
          subtitle: "Observe a matéria-prima, caimento e acabamentos técnicos.",
          hotspots: [],
        },
      },
      {
        type: "size_guide_table",
        config: {
          title: "Guia de Medidas & Caimento",
          subtitle: "Consulte as medidas exatas para escolher o tamanho perfeito.",
        },
      },
      {
        type: "media_gallery_mosaic",
        config: {
          title: "Galeria de Fotos do Produto",
          subtitle: "Ângulos em alta definição e fotos de clientes.",
          items: [],
        },
      },
      {
        type: "faq_clean_accordion",
        config: {
          title: "Dúvidas Frequentes sobre Envio e Devoluções",
          subtitle: "Respostas claras para você comprar com tranquilidade.",
          items: [
            {
              id: "faq-pdp-1",
              question: "Qual o prazo médio de entrega para a minha cidade?",
              answer: "O prazo varia de acordo com o CEP informado no checkout. Capitais costumam receber entre 2 a 5 dias úteis, com rastreamento completo.",
            },
            {
              id: "faq-pdp-2",
              question: "Como funciona caso o tamanho não sirva?",
              answer: "Você tem até 7 dias corridos após o recebimento para solicitar a primeira troca de forma totalmente gratuita.",
            },
          ],
        },
      },
    ],
  },
  {
    id: "wix_commerce_portal",
    name: "Central do Cliente (Meus Pedidos & Carnês)",
    niche: "commerce",
    slug: "minhas-compras",
    title: "Minha Conta — Pedidos, Entregas e Faturas",
    document_type: "institutional",
    is_home: false,
    badge: "App Loja • Minha Conta",
    description: "Área logada do consumidor para rastrear compras, emitir segunda via de boletos/Pix e avaliar produtos.",
    blocks: [
      {
        type: "portal_orders_rentals",
        config: {
          title: "Meus Pedidos e Compras",
          subtitle: "Acompanhe o status de preparação, despacho e entrega dos seus pedidos.",
        },
      },
      {
        type: "portal_carnes_bills",
        config: {
          title: "Carnês & Boletos em Aberto",
          subtitle: "Acesse parcelas e gere códigos Pix para liquidação imediata.",
        },
      },
      {
        type: "reputation_score_header",
        config: {
          company_name: "Loja Oficial",
          reputation_score: 9.6,
          reputation_badge: "Excelente",
          total_complaints: 4,
          resolved_percentage: 100,
        },
      },
      {
        type: "reputation_badges_strip",
        config: {},
      },
    ],
  },
];

export const SERVICES_WIX_APP_PAGES: TourismWixAppPageTemplate[] = [
  {
    id: "wix_services_home",
    name: "Apresentação & Especialistas",
    niche: "services",
    slug: "inicio-servicos",
    title: "Início — Atendimento & Consultoria Especializada",
    document_type: "storefront",
    is_home: true,
    badge: "App Serviços • Home",
    description: "Página de apresentação com diferenciais em Bento grid, equipe técnica e depoimentos reais.",
    blocks: [
      {
        type: "hero_minimal_split",
        config: {
          badgeText: "ATENDIMENTO DE EXCELÊNCIA",
          title: "Soluções profissionais sob medida com agendamento simplificado.",
          subtitle: "Conheça nossos serviços, simule valores e reserve horários com nossa equipe de especialistas.",
          primaryCta: { label: "Agendar Horário", href: "#agendamento" },
          secondaryCta: { label: "Calcular Cotação", href: "#simulador" },
        },
      },
      {
        type: "bento_asymmetric_4",
        config: {
          sectionTitle: "Por Que Escolher Nossos Serviços",
          sectionSubtitle: "Compromisso com pontualidade, rigor técnico e satisfação garantida.",
          cells: [
            { id: "s-1", tag: "QUALIFICAÇÃO", title: "Profissionais Certificados", description: "Equipe com titulação e ampla experiência de mercado.", colSpan: 2 },
            { id: "s-2", tag: "AGILIDADE", title: "Confirmação Imediata", description: "Notificações de lembrete diretamente pelo WhatsApp.", colSpan: 1 },
            { id: "s-3", tag: "TRANSPARÊNCIA", title: "Valores Claros", description: "Sem taxas ocultas ou surpresas na conclusão do atendimento.", colSpan: 1 },
            { id: "s-4", tag: "GARANTIA", title: "Suporte Pós-Atendimento", description: "Acompanhamento dedicado para assegurar os melhores resultados.", colSpan: 2 },
          ],
        },
      },
      {
        type: "specialist_team_grid",
        config: {
          title: "Nossa Equipe de Especialistas",
          subtitle: "Profissionais dedicados prontos para oferecer a melhor assistência.",
        },
      },
      {
        type: "trust_badges",
        config: {
          badges: [
            { icon: "ShieldCheck", title: "Profissionais Credenciados", description: "Registros e licenças ativas" },
            { icon: "Clock", title: "Pontualidade Rigorosa", description: "Horários agendados sem atrasos" },
            { icon: "RotateCcw", title: "Garantia de Satisfação", description: "Revisão garantida sem custo adicional" },
          ],
        },
      },
    ],
  },
  {
    id: "wix_services_booking",
    name: "Agendamento Online & Agenda",
    niche: "services",
    slug: "agendamento-online",
    title: "Agendar Horário — Seleção de Data e Serviço",
    document_type: "landing_page",
    is_home: false,
    badge: "App Serviços • Agenda",
    description: "Calendário interativo integrado à agenda dos profissionais com confirmação por WhatsApp.",
    blocks: [
      {
        type: "booking_calendar",
        config: {
          title: "Escolha o Dia e Horário Desejado",
          subtitle: "Consulte a disponibilidade em tempo real e garanta sua reserva em minutos.",
        },
      },
      {
        type: "service_pricing_table",
        config: {
          title: "Tabela de Procedimentos & Serviços",
          subtitle: "Confira a relação completa de atendimentos, duração e valores correspondentes.",
        },
      },
      {
        type: "routine_steps",
        config: {
          title: "Passo a Passo do Atendimento",
          steps: [
            { step: "1", title: "Escolha na Agenda", description: "Selecione o profissional e o melhor dia/horário." },
            { step: "2", title: "Confirmação Imediata", description: "Você receberá uma confirmação com os detalhes no WhatsApp." },
            { step: "3", title: "Atendimento Realizado", description: "Compareça no local ou conecte-se na sala virtual." },
          ],
        },
      },
    ],
  },
  {
    id: "wix_services_calculator",
    name: "Simulador de Cotação Interativa",
    niche: "services",
    slug: "simulador-cotacao",
    title: "Simule sua Cotação — Orçamento em Tempo Real",
    document_type: "landing_page",
    is_home: false,
    badge: "App Serviços • Cotação",
    description: "Calculadora em tempo real para orçamentos complexos com opcionais e envio para CRM.",
    blocks: [
      {
        type: "interactive_quote_calculator",
        config: {
          title: "Calculadora de Proposta & Serviços",
          subtitle: "Selecione os parâmetros e comodidades para obter uma estimativa de investimento instantânea.",
          basePriceCents: 25000,
          unitLabel: "Hora de Consultoria",
          unitPluralLabel: "Horas de Consultoria",
          minUnits: 1,
          maxUnits: 20,
          defaultUnits: 4,
          unitPriceCents: 12000,
          options: [
            {
              id: "opt-urgencia",
              label: "Atendimento Prioritário (Em até 24h)",
              description: "Início imediato fora do horário comercial.",
              priceCents: 15000,
              isDefault: false,
            },
            {
              id: "opt-laudo",
              label: "Emissão de Laudo Técnico Assinado",
              description: "Documento oficial assinado com certificação digital.",
              priceCents: 8000,
              isDefault: true,
            },
          ],
          whatsappNumber: "5511999998888",
          submitButtonText: "Solicitar Proposta Formal",
          successMessage: "Simulação recebida! Enviaremos a proposta detalhada em breve.",
          disclaimer: "Estimativa inicial não vinculante. Valores finais formalizados em contrato de prestação de serviços.",
        },
      },
      {
        type: "faq_clean_accordion",
        config: {
          title: "Dúvidas Frequentes sobre Orçamentos",
          subtitle: "Esclarecimentos sobre formas de pagamento, prazos e escopo.",
          items: [
            {
              id: "faq-svc-1",
              question: "Os valores calculados incluem emissão de Nota Fiscal?",
              answer: "Sim. Todos os serviços prestados contam com emissão regular de Nota Fiscal de Serviços eletrônica (NFS-e).",
            },
            {
              id: "faq-svc-2",
              question: "Como funciona a forma de pagamento?",
              answer: "Aceitamos Pix instantâneo, boleto bancário faturado para empresas e parcelamento no cartão em até 12x.",
            },
          ],
        },
      },
      {
        type: "contact_form_direct",
        config: {
          title: "Dúvidas Específicas ou Projetos Customizados",
          subtitle: "Caso sua necessidade exija escopo personalizado, fale diretamente com nossa diretoria técnica.",
          submitButtonText: "Enviar Mensagem Direta",
          whatsappNumber: "5511999998888",
        },
      },
    ],
  },
  {
    id: "wix_services_portal",
    name: "Central de Atendimento & Contratos",
    niche: "services",
    slug: "meus-atendimentos",
    title: "Minha Área — Agendamentos e Contratos",
    document_type: "institutional",
    is_home: false,
    badge: "App Serviços • Portal",
    description: "Painel do cliente para consulta de horários marcados, download de contratos e assinatura digital.",
    blocks: [
      {
        type: "portal_appointments",
        config: {
          title: "Meus Agendamentos Confirmados",
          subtitle: "Consulte data, horário e profissional responsável pelo seu atendimento.",
        },
      },
      {
        type: "portal_contracts",
        config: {
          title: "Contratos de Prestação de Serviços",
          subtitle: "Documentos pendentes de assinatura e termos vigentes com validade jurídica.",
        },
      },
      {
        type: "office_contract_viewer",
        config: {
          title: "Assinador Digital Integrado",
          documentNumber: "CONTRATO-SERVICOS-2027",
        },
      },
    ],
  },
];

export const FORM_LEAD_WIX_APP_PAGES: TourismWixAppPageTemplate[] = [
  {
    id: "wix_lead_quiz",
    name: "Quiz Interativo & Diagnóstico de Leads",
    niche: "general",
    slug: "quiz-diagnostico",
    title: "Quiz Diagnóstico — Descubra a Solução Ideal",
    document_type: "landing_page",
    is_home: false,
    badge: "App Formulários • Quiz",
    description: "Quiz dinâmico multi-etapas com qualificação de perfil e captura direta para o CRM.",
    blocks: [
      {
        type: "hero_minimal_split",
        config: {
          badgeText: "DIAGNÓSTICO PERSONALIZADO EM 2 MINUTOS",
          title: "Descubra qual a melhor estratégia para o seu momento de vida ou negócio.",
          subtitle: "Responda a 3 perguntas rápidas e receba uma orientação sob medida dos nossos consultores.",
          primaryCta: { label: "Iniciar Diagnóstico", href: "#formulario" },
        },
      },
      {
        type: "routine_steps",
        config: {
          title: "Como Funciona o Diagnóstico",
          steps: [
            { step: "1", title: "Responda o Briefing", description: "Informe seu perfil e principais desafios atuais." },
            { step: "2", title: "Análise da Equipe", description: "Cruzamos suas necessidades com nossas soluções." },
            { step: "3", title: "Receba o Plano", description: "Proposta formal detalhada enviada diretamente no seu WhatsApp." },
          ],
        },
      },
      {
        type: "contact_form_direct",
        config: {
          title: "Envie seus Dados para Receber o Relatório",
          subtitle: "Garantimos sigilo absoluto e resposta em até 2 horas úteis.",
          submitButtonText: "Receber Diagnóstico Gratuito",
          whatsappNumber: "5511999998888",
          showPhoneField: true,
          showMessageField: true,
          successMessage: "Respostas gravadas com sucesso! Entraremos em contato com a devolutiva.",
        },
      },
      {
        type: "testimonials_social_proof",
        config: {
          title: "Resultados de Quem Já Fez o Diagnóstico",
          subtitle: "Veja a experiência de outros clientes que transformaram seus resultados.",
          testimonials: [],
        },
      },
    ],
  },
  {
    id: "wix_lead_survey",
    name: "Pesquisa de Satisfação & Feedback (NPS)",
    niche: "general",
    slug: "pesquisa-satisfacao",
    title: "Pesquisa de Satisfação — Avalie sua Experiência",
    document_type: "institutional",
    is_home: false,
    badge: "App Formulários • NPS",
    description: "Formulário de avaliação pós-venda para medir reputação, coletar depoimentos e melhorar processos.",
    blocks: [
      {
        type: "reputation_score_header",
        config: {
          company_name: "Atendimento & Qualidade",
          reputation_score: 9.8,
          reputation_badge: "Excelente",
          total_complaints: 0,
          resolved_percentage: 100,
        },
      },
      {
        type: "contact_form_direct",
        config: {
          title: "Sua Opinião Faz Toda a Diferença",
          subtitle: "Conte-nos como foi seu atendimento para continuarmos aprimorando nossos serviços.",
          submitButtonText: "Enviar Avaliação",
          whatsappNumber: "5511999998888",
          showPhoneField: false,
          showMessageField: true,
          successMessage: "Agradecemos de coração pelo seu feedback!",
        },
      },
      {
        type: "trust_badges",
        config: {
          badges: [
            { icon: "ShieldCheck", title: "Opinião Verificada", description: "Avaliações auditadas de clientes reais" },
            { icon: "HeartHandshake", title: "Compromisso com Você", description: "Melhoria contínua de nossos processos" },
          ],
        },
      },
    ],
  },
  {
    id: "wix_lead_careers",
    name: "Trabalhe Conosco & Banco de Talentos",
    niche: "general",
    slug: "trabalhe-conosco",
    title: "Carreiras — Venha Fazer Parte da Nossa Equipe",
    document_type: "institutional",
    is_home: false,
    badge: "App Formulários • RH",
    description: "Página de recrutamento e seleção com mural de vagas abertas e captação de currículos.",
    blocks: [
      {
        type: "careers_hero_banner",
        config: {
          title: "Construa sua Carreira Conosco",
          subtitle: "Buscamos pessoas apaixonadas por excelência, autonomia e crescimento acelerado.",
        },
      },
      {
        type: "careers_job_grid",
        config: {
          title: "Oportunidades em Aberto",
          subtitle: "Confira as vagas disponíveis e encontre a posição ideal para seu perfil.",
        },
      },
      {
        type: "contact_form_direct",
        config: {
          title: "Banco de Talentos",
          subtitle: "Não encontrou uma vaga para o seu perfil? Envie seu currículo para posições futuras.",
          submitButtonText: "Enviar Candidatura",
          whatsappNumber: "5511999998888",
          showPhoneField: true,
          showMessageField: true,
          successMessage: "Candidatura recebida! Nossa equipe de Gente & Gestão avaliará seu perfil.",
        },
      },
    ],
  },
];

export const NEWS_WIX_APP_PAGES: TourismWixAppPageTemplate[] = [
  {
    id: "wix_news_home",
    name: "Portal de Notícias Modular (Capa)",
    niche: "media",
    slug: "noticias",
    title: "Portal Regional de Notícias",
    document_type: "storefront",
    is_home: true,
    badge: "App Notícias • Capa",
    description: "Capa editorial estilo Prométhée composta por blocos individuais editáveis: topo GPS, menu +, plantão, feed real, ADS e rodapé.",
    blocks: [
      {
        type: "news_promethee_header",
        config: {
          mastheadTitle: "Waesynews",
          logoStyle: "promethee_dome",
          logoUrl: "",
          showCityFilter: true,
          allCitiesLabel: "Todas as Cidades",
          showSearch: true,
          showUrgentBell: true,
          actionLabel: "Anunciar",
          actionHref: "/paginas/anuncie",
        },
      },
      {
        type: "news_promethee_nav",
        config: {
          allowCitizenPosts: true,
          showSavedTab: true,
          categories: [
            "Para você",
            "Urgente",
            "Política",
            "Segurança",
            "Economia",
            "Esportes",
            "Tecnologia",
            "Cultura",
          ],
        },
      },
      {
        type: "news_promethee_breaking",
        config: {
          sectionTitle: "Plantão Regional",
          badgeLabel: "BREAKING NEWS",
          maxItems: 6,
          articlePageHref: "/paginas/artigo",
          articles: [],
        },
      },
      {
        type: "news_promethee_feed",
        config: {
          sectionTitle: "Destaques",
          layoutMode: "feed_stream",
          dataSource: "approved_mined_AND_custom",
          maxItems: 12,
          readMoreLabel: "Ler mais",
          articlePageHref: "/paginas/artigo",
          showInFeedAd: true,
          articles: [],
        },
      },
      {
        type: "news_promethee_ad_slot",
        config: {
          format: "banner",
          sponsorName: "Publicidade Regional",
          headline: "Destaque sua empresa para moradores da sua cidade",
          description: "Campanhas com segmentação geográfica por município e relatório em tempo real.",
          ctaLabel: "Anunciar",
          ctaHref: "/paginas/anuncie",
          imageUrl: "",
          targetCity: "",
        },
      },
      {
        type: "news_promethee_article_reader",
        config: {
          backLabel: "Voltar",
          backHref: "/paginas/noticias",
          showExecutiveSummary: true,
          showComments: true,
          showInArticleAd: true,
        },
      },
      {
        type: "news_promethee_footer",
        config: {
          brandName: "Waesynews",
          tagline: "Jornalismo regional independente",
          links: [
            { id: "f1", label: "Início", href: "/paginas/noticias" },
            { id: "f2", label: "Enviar Pauta", href: "/paginas/enviar-pauta" },
            { id: "f3", label: "Anuncie", href: "/paginas/anuncie" },
          ],
          showWaesySignature: true,
        },
      },
    ],
  },
  {
    id: "wix_news_article",
    name: "Leitura de Reportagem & Comentários",
    niche: "media",
    slug: "artigo",
    title: "Reportagem Completa",
    document_type: "storefront",
    is_home: false,
    badge: "App Notícias • Leitor",
    description: "Página dedicada de leitura limpa com síntese executiva, estúdio PNG, espaço ADS e comentários.",
    blocks: [
      {
        type: "news_promethee_header",
        config: {
          mastheadTitle: "Waesynews",
          logoStyle: "promethee_dome",
          showCityFilter: true,
          showSearch: false,
          showUrgentBell: true,
        },
      },
      {
        type: "news_promethee_article_reader",
        config: {
          backLabel: "Voltar à Capa",
          backHref: "/paginas/noticias",
          showExecutiveSummary: true,
          showComments: true,
          showInArticleAd: true,
        },
      },
      {
        type: "news_promethee_footer",
        config: {
          brandName: "Waesynews",
          tagline: "Jornalismo regional independente",
          showWaesySignature: true,
        },
      },
    ],
  },
  {
    id: "wix_news_advertise",
    name: "Mídia Kit & Anuncie no Portal",
    niche: "media",
    slug: "anuncie",
    title: "Anuncie no Portal",
    document_type: "landing_page",
    is_home: false,
    badge: "App Notícias • Comercial",
    description: "Página comercial para captação de patrocinadores locais com planos e formulário conectado ao CRM.",
    blocks: [
      {
        type: "news_promethee_header",
        config: {
          mastheadTitle: "Waesynews",
          logoStyle: "promethee_dome",
          showCityFilter: false,
          showSearch: false,
          showUrgentBell: false,
          actionLabel: "Voltar ao Portal",
          actionHref: "/paginas/noticias",
        },
      },
      {
        type: "pricing_three_tiers",
        config: {
          title: "Planos de Patrocínio Regional",
          subtitle: "Posicione sua marca para leitores qualificados da sua cidade com relatório transparente.",
          plans: [
            {
              name: "Apoiador Local",
              price: "R$ 290",
              period: "/mês",
              description: "Presença contínua na barra lateral e rodapé editorial.",
              features: ["Segmentação por município", "Link direto para WhatsApp", "Relatório mensal de cliques"],
              ctaLabel: "Quero Anunciar",
              ctaHref: "#contato",
              highlighted: false,
            },
            {
              name: "Destaque de Capa",
              price: "R$ 690",
              period: "/mês",
              description: "Banner nativo no feed principal e dentro das reportagens.",
              features: ["Destaque no topo e feed", "Publieditorial patrocinado", "Painel de métricas ao vivo"],
              ctaLabel: "Reservar Espaço",
              ctaHref: "#contato",
              highlighted: true,
            },
          ],
        },
      },
      {
        type: "contact_form_direct",
        config: {
          title: "Fale com o Comercial",
          subtitle: "Informe sua empresa e cidade para receber nosso mídia kit atualizado.",
          submitButtonText: "Solicitar Contato Comercial",
          showPhoneField: true,
          showMessageField: true,
          successMessage: "Solicitação recebida pela equipe comercial.",
        },
      },
      {
        type: "news_promethee_footer",
        config: {
          brandName: "Waesynews",
          tagline: "Publicidade auditada por região",
          showWaesySignature: true,
        },
      },
    ],
  },
  {
    id: "wix_news_submit",
    name: "Enviar Pauta & Canal do Leitor",
    niche: "media",
    slug: "enviar-pauta",
    title: "Enviar Pauta para a Redação",
    document_type: "institutional",
    is_home: false,
    badge: "App Notícias • Redação",
    description: "Canal direto para moradores enviarem denúncias, fotos, notas oficiais e sugestões de reportagem.",
    blocks: [
      {
        type: "news_promethee_header",
        config: {
          mastheadTitle: "Waesynews",
          logoStyle: "promethee_dome",
          showCityFilter: false,
          showSearch: false,
          showUrgentBell: false,
          actionLabel: "Voltar ao Portal",
          actionHref: "/paginas/noticias",
        },
      },
      {
        type: "contact_form_direct",
        config: {
          title: "Envie sua Pauta ou Relato",
          subtitle: "Nossa equipe jornalística checa todas as informações antes da publicação.",
          submitButtonText: "Enviar para Apuração",
          showPhoneField: true,
          showMessageField: true,
          successMessage: "Pauta encaminhada para a mesa de redação.",
        },
      },
      {
        type: "news_promethee_footer",
        config: {
          brandName: "Waesynews",
          tagline: "Jornalismo colaborativo e verificado",
          showWaesySignature: true,
        },
      },
    ],
  },
];

export function getTemplateById(id: string): NicheTemplateDefinition | undefined {
  return (
    NICHE_TEMPLATE_MATRIX.find((t) => t.id === id) ||
    TOURISM_WIX_APP_PAGES.find((t) => t.id === id) ||
    COMMERCE_WIX_APP_PAGES.find((t) => t.id === id) ||
    SERVICES_WIX_APP_PAGES.find((t) => t.id === id) ||
    FORM_LEAD_WIX_APP_PAGES.find((t) => t.id === id) ||
    NEWS_WIX_APP_PAGES.find((t) => t.id === id)
  );
}

export function getTemplateByNiche(niche: string): NicheTemplateDefinition {
  const found = NICHE_TEMPLATE_MATRIX.find((t) => t.niche === niche);
  return found || NICHE_TEMPLATE_MATRIX[0];
}

/**
 * Injeta o array de blocos do template selecionado no documento da página
 */
export function applyTemplateToPage(page: OmniPageDocument, templateId: string): OmniPageDocument {
  const template = getTemplateById(templateId);
  if (!template) return page;

  const hydratedBlocks: OmniBlockInstance[] = template.blocks.map((block, index) => ({
    id: `blk_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 4)}`,
    type: block.type,
    config: JSON.parse(JSON.stringify(block.config)),
    styling: block.styling ? JSON.parse(JSON.stringify(block.styling)) : undefined,
    ...(block.sectionAnchorId ? { sectionAnchorId: block.sectionAnchorId } : {}),
    isHidden: false,
  }));

  return {
    ...page,
    schemaVersion: page.schemaVersion ?? 1,
    niche: template.niche,
    source_template_id: template.id,
    source_template_version: "1.0.0",
    blocks: hydratedBlocks,
    updated_at: new Date().toISOString(),
  };
}

