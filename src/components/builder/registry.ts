/**
 * registry.ts — Catálogo Central de Blocos do Omni-Builder (Wix-Style Architecture)
 * 
 * Unifica os blocos canônicos minimalistas do Omni e as seções dinâmicas ricas
 * do builder clássico (Gastronomia, E-commerce, Mídia, Serviços, Turismo, BioLink).
 */

import { HeroMinimalSplit } from "./blocks/HeroMinimalSplit";
import { HeroInteractiveCarousel } from "./blocks/HeroInteractiveCarousel";
import { BentoAsymmetricGrid } from "./blocks/BentoAsymmetricGrid";
import { PricingTablesClean } from "./blocks/PricingTablesClean";
import { MediaGalleryMosaic } from "./blocks/MediaGalleryMosaic";
import { TestimonialsSocialProof } from "./blocks/TestimonialsSocialProof";
import { ContactFormDirect } from "./blocks/ContactFormDirect";
import { FaqCleanAccordion } from "./blocks/FaqCleanAccordion";

import { createClassicOmniBlock } from "./ClassicBlockAdapter";

// Seções dinâmicas do acervo clássico
import { FoodMenuTabsSection } from "@/components/commerce/dynamic-sections/food-menu-tabs";
import { FoodMenuStreamlinedSection } from "@/components/commerce/dynamic-sections/food-menu-streamlined";
import { TableOrderComandaSection } from "@/components/commerce/dynamic-sections/table-order-comanda";
import { TableBookingSection } from "@/components/commerce/dynamic-sections/table-booking-card";
import { ChefSpecialBannerSection } from "@/components/commerce/dynamic-sections/chef-special-banner";
import { RestaurantHoursDeliverySection } from "@/components/commerce/dynamic-sections/restaurant-hours-delivery";

import { ProductGrid } from "@/components/commerce/dynamic-sections/product-grid";
import { ProductRail } from "@/components/commerce/dynamic-sections/product-rail";
import { CuratedHitsRailSection } from "@/components/commerce/dynamic-sections/curated-hits-rail";
import { FlashSaleHero } from "@/components/commerce/dynamic-sections/flash-sale-hero";
import { SplitBanner } from "@/components/commerce/dynamic-sections/split-banner";

import { GalleryGrid } from "@/components/commerce/dynamic-sections/gallery-grid";
import { BeforeAfterSlider } from "@/components/commerce/dynamic-sections/before-after-slider";
import { VideoSection } from "@/components/commerce/dynamic-sections/video-section";
import { StoriesRing } from "@/components/commerce/dynamic-sections/stories-ring";

import { ServicePricingTable } from "@/components/commerce/dynamic-sections/service-pricing-table";
import { BookingCalendar } from "@/components/commerce/dynamic-sections/booking-calendar";
import { SpecialistTeamGridSection } from "@/components/commerce/dynamic-sections/specialist-team-grid";
import { RoutineSteps } from "@/components/commerce/dynamic-sections/routine-steps";

import { TourismQuoteHero } from "@/components/commerce/dynamic-sections/tourism-quote-hero";
import { TourismDestinationsCarouselSection } from "@/components/commerce/dynamic-sections/tourism-destinations-carousel";
import { TourismServicesGrid } from "@/components/commerce/dynamic-sections/tourism-services-grid";
import { DynamicBookingHeroSection } from "@/components/commerce/dynamic-sections/dynamic-booking-hero";
import { CategoryIconGridSection } from "@/components/commerce/dynamic-sections/category-icon-grid";
import { DynamicProductCarouselSection } from "@/components/commerce/dynamic-sections/dynamic-product-carousel";
import { TravelProductDetailSection } from "@/components/commerce/dynamic-sections/travel-product-detail";
import { CustomerTravelPortalSection } from "@/components/commerce/dynamic-sections/customer-travel-portal";

import {
  BiolinkProfileSection,
  BiolinkActionButtonsSection,
  BiolinkPixCardSection,
} from "@/components/commerce/dynamic-sections/biolink-sections";
import { LocationMapCardSection } from "@/components/commerce/dynamic-sections/location-map-card";
import { StoreHours } from "@/components/commerce/dynamic-sections/store-hours";
import { StoreContact } from "@/components/commerce/dynamic-sections/store-contact";
import { TrustBadges } from "@/components/commerce/dynamic-sections/trust-badges";
import { TimelineHistory } from "@/components/commerce/dynamic-sections/timeline-history";

import { CountdownTimer } from "@/components/commerce/dynamic-sections/countdown-timer";
import { AnnouncementBar } from "@/components/commerce/dynamic-sections/announcement-bar";
import { NewsletterCaptureSection } from "@/components/commerce/dynamic-sections/newsletter-capture";
import { CareersHeroBanner } from "@/components/commerce/dynamic-sections/careers-hero-banner";
import { CareersJobGrid } from "@/components/commerce/dynamic-sections/careers-job-grid";
import { CareersJobFilters } from "@/components/commerce/dynamic-sections/careers-job-filters";
import { TravelPackageHero } from "@/components/commerce/dynamic-sections/travel-package-hero";
import { TravelItineraryTimeline } from "@/components/commerce/dynamic-sections/travel-itinerary-timeline";
import { TravelHotelSlider } from "@/components/commerce/dynamic-sections/travel-hotel-slider";
import { SizeGuideTableSection } from "@/components/commerce/dynamic-sections/size-guide-table";

import { PropertyFeaturesGridSection } from "@/components/commerce/dynamic-sections/property-features-grid";
import { StoreProfileHero } from "@/components/commerce/dynamic-sections/store-profile-hero";
import { IngredientSpotlight } from "@/components/commerce/dynamic-sections/ingredient-spotlight";
import { ShopTheLookSection } from "@/components/commerce/dynamic-sections/shop-the-look-hotspots";
import { MosaicBanners } from "@/components/commerce/dynamic-sections/mosaic-banners";
import { CommunityFeed } from "@/components/commerce/dynamic-sections/community-feed";
import { EventRail } from "@/components/commerce/dynamic-sections/event-rail";
import { SocialGrid } from "@/components/commerce/dynamic-sections/social-grid";
import { InfoCards } from "@/components/commerce/dynamic-sections/info-cards";
import { RichText } from "@/components/commerce/dynamic-sections/rich-text";
import { ImageHotspots } from "@/components/commerce/dynamic-sections/image-hotspots";
import { ProductCarousel } from "@/components/commerce/dynamic-sections/product-carousel";
import { TestimonialCarousel } from "@/components/commerce/dynamic-sections/testimonial-carousel";

import { PortalContractsWidget } from "@/components/commerce/dynamic-sections/portal-contracts-widget";
import { PortalAppointmentsWidget } from "@/components/commerce/dynamic-sections/portal-appointments-widget";
import { PortalOrdersRentalsWidget } from "@/components/commerce/dynamic-sections/portal-orders-rentals-widget";
import { PortalCarnesBillsWidget } from "@/components/commerce/dynamic-sections/portal-carnes-bills-widget";
import { ReputationScoreHeader } from "@/components/commerce/dynamic-sections/reputation-score-header";
import { ReputationBadgesStrip } from "@/components/commerce/dynamic-sections/reputation-badges-strip";
import { ReputationTimelineFeed } from "@/components/commerce/dynamic-sections/reputation-timeline-feed";
import { OfficeContractViewer } from "@/components/commerce/dynamic-sections/office-contract-viewer";

import type {
  SiteBuilderBlockDefinition,
  HeroBlockData,
  HeroCarouselBlockData,
  BentoBlockData,
  PricingBlockData,
  MediaGalleryBlockData,
  TestimonialsBlockData,
  ContactFormBlockData,
  FaqBlockData,
} from "./types";

export const SITE_BUILDER_BLOCKS: SiteBuilderBlockDefinition[] = [
  // ── 1. APRESENTAÇÃO & HERO ──
  {
    id: "hero_minimal_split",
    name: "Apresentação",
    category: "hero",
    description: "Cabeçalho com título, subtítulo e chamadas para ação.",
    component: HeroMinimalSplit as any,
    defaultProps: {
      badgeText: "ECOSSISTEMA 2027 • DISPONÍVEL AGORA",
      title: "Construa e escale sua presença digital com tecnologia nativa.",
      subtitle: "Unifique seu catálogo físico, vitrine online, PDV e automações de atendimento em uma única plataforma silenciosa e sem fricção.",
      primaryCta: {
        label: "Começar Agora",
        href: "#contato",
      },
      secondaryCta: {
        label: "Ver Demonstração",
        href: "#planos",
      },
      floatingStat: {
        label: "OPERAÇÃO AO VIVO",
        value: "99.98% SLA",
        statusDot: true,
      },
    } as HeroBlockData,
  },

  {
    id: "hero_interactive_carousel",
    name: "Carrossel de Destaques",
    category: "hero",
    description: "Carrossel rotativo multi-slides com indicadores, imagem contextual e chamadas para ação.",
    component: HeroInteractiveCarousel as any,
    defaultProps: {
      autoPlay: true,
      intervalSeconds: 5,
      slides: [
        {
          id: "slide-1",
          badgeText: "NOVIDADE • LANÇAMENTO",
          title: "Experiências visuais dinâmicas com conversão acelerada.",
          subtitle: "Apresente suas principais ofertas, novidades e diferenciais em um slider fluido com controle manual e automático.",
          primaryCta: {
            label: "Explorar Ofertas",
            href: "#destaques",
          },
          secondaryCta: {
            label: "Saiba Mais",
            href: "#sobre",
          },
          highlightTag: "Lançamento",
          floatingStat: {
            label: "CONVERSÃO MÉDIA",
            value: "+42% ROI",
            statusDot: true,
          },
        },
        {
          id: "slide-2",
          badgeText: "TECNOLOGIA NATIVA",
          title: "Performance instantânea em qualquer dispositivo móvel.",
          subtitle: "Carregamento sub-100ms e arquitetura otimizada para o varejo moderno e serviços sob demanda.",
          primaryCta: {
            label: "Ver Catálogo",
            href: "#produtos",
          },
          highlightTag: "Performance",
          floatingStat: {
            label: "VELOCIDADE",
            value: "< 85ms",
            statusDot: true,
          },
        },
      ],
    } as HeroCarouselBlockData,
  },

  createClassicOmniBlock({
    id: "split_banner",
    name: "Banner Editorial Dividido",
    category: "hero",
    description: "Layout editorial com foto de alta resolução e chamada para ação.",
    component: SplitBanner,
    defaultProps: {
      title: "Nova Coleção Exclusiva",
      subtitle: "Peças desenvolvidas com tecidos nobres e acabamento impecável.",
      buttonText: "Explorar Coleção",
      buttonLink: "#produtos",
      imageUrl: "",
      imagePosition: "right",
    },
  }),

  // ── 2. GASTRONOMIA & RESTAURANTES ──
  createClassicOmniBlock({
    id: "food_menu_streamlined",
    name: "Cardápio com Adição Rápida",
    category: "gastronomy",
    description: "Cardápio direto com miniaturas, adição em 1 toque e barra de sacola.",
    component: FoodMenuStreamlinedSection,
    defaultProps: {
      storeName: "Cardápio do Restaurante",
      openingHoursText: "Aberto agora para pedidos e retirada",
      isOpenNow: true,
      categories: ["Todos", "Entradas", "Pratos Principais", "Sobremesas", "Bebidas"],
    },
  }),

  createClassicOmniBlock({
    id: "food_menu_tabs",
    name: "Cardápio Organizado por Abas",
    category: "gastronomy",
    description: "Cardápio navegável com abas superiores de categorias e fotos dos pratos.",
    component: FoodMenuTabsSection,
    defaultProps: {
      title: "Cardápio do Restaurante",
      subtitle: "Ingredientes frescos selecionados diariamente pelo nosso chef.",
    },
  }),

  createClassicOmniBlock({
    id: "chef_special_banner",
    name: "Prato Especial do Chef",
    category: "gastronomy",
    description: "Destaque do prato estrela com lista de ingredientes, tempo e preço.",
    component: ChefSpecialBannerSection,
    defaultProps: {
      title: "Sugestão do Chef",
      dishName: "Prato Especial da Casa",
      description: "Preparado com ingredientes selecionados e técnica autoral exclusiva.",
      priceCents: 8900,
      prepTimeMinutes: 25,
    },
  }),

  createClassicOmniBlock({
    id: "table_order_comanda",
    name: "Comanda & QR Code de Mesa",
    category: "gastronomy",
    description: "Cartão de mesa para autoatendimento no salão com QR Code integrado.",
    component: TableOrderComandaSection,
    defaultProps: {
      tableNumber: "01",
      storeName: "Restaurante & Gastronomia",
      wifiName: "Wi-Fi Clientes",
    },
  }),

  createClassicOmniBlock({
    id: "table_booking_card",
    name: "Reserva de Mesas",
    category: "gastronomy",
    description: "Formulário de reserva de mesa com data, horário e pessoas.",
    component: TableBookingSection,
    defaultProps: {
      title: "Reserve sua Mesa",
      subtitle: "Garanta seu lugar sem filas com confirmação ágil.",
    },
  }),

  createClassicOmniBlock({
    id: "restaurant_hours_delivery",
    name: "Horários de Cozinha & Entrega",
    category: "gastronomy",
    description: "Quadro informativo de expediente da cozinha, taxas e retirada.",
    component: RestaurantHoursDeliverySection,
    defaultProps: {
      title: "Horários de Atendimento e Entrega",
    },
  }),

  // ── 3. CATÁLOGO & PRODUTOS ──
  createClassicOmniBlock({
    id: "product_grid",
    name: "Grade de Produtos do Catálogo",
    category: "commerce",
    description: "Grid responsivo sincronizado com o estoque e produtos da sua loja.",
    component: ProductGrid,
    defaultProps: {
      title: "Produtos em Destaque",
      subtitle: "Confira as últimas novidades disponíveis em nossa vitrine.",
      columns: 4,
    },
  }),

  createClassicOmniBlock({
    id: "curated_hits_rail",
    name: "Trilho Mais Vendidos (Hits)",
    category: "commerce",
    description: "Carrossel com ranking (#1, #2), selos de desconto e compra rápida.",
    component: CuratedHitsRailSection,
    defaultProps: {
      title: "Top Mais Pedidos da Região",
      subtitle: "Os itens favoritos dos nossos clientes com disponibilidade imediata.",
      savingsText: "Confira as condições especiais deste mês.",
    },
  }),

  createClassicOmniBlock({
    id: "product_rail",
    name: "Carrossel de Produtos",
    category: "commerce",
    description: "Trilho deslizante horizontal para navegação tátil por produtos.",
    component: ProductRail,
    defaultProps: {
      title: "Lançamentos e Destaques",
      subtitle: "Navegue pelas novidades selecionadas para você.",
    },
  }),

  createClassicOmniBlock({
    id: "flash_sale_hero",
    name: "Oferta Relâmpago com Cronômetro",
    category: "commerce",
    description: "Faixa de contagem regressiva para queimas de estoque e campanhas.",
    component: FlashSaleHero,
    defaultProps: {
      title: "Oferta Especial por Tempo Limitado",
      subtitle: "Condições exclusivas válidas enquanto durarem os estoques.",
      discountPercentage: "30% OFF",
      couponCode: "ESPECIAL30",
      buttonText: "Aproveitar Oferta",
      targetLink: "#produtos",
      targetDate: "2026-12-31T23:59:59",
    },
  }),

  // ── 4. MÍDIA & GALERIA ──
  {
    id: "media_gallery_mosaic",
    name: "Galeria em Mosaico",
    category: "gallery",
    description: "Mosaico fotográfico responsivo com visualização ampliada.",
    component: MediaGalleryMosaic as any,
    defaultProps: {
      title: "Portfólio & Galeria Visual",
      subtitle: "Conheça de perto a atmosfera, produtos e experiências exclusivas.",
      layout: "mosaic",
      items: [],
    } as MediaGalleryBlockData,
  },

  createClassicOmniBlock({
    id: "gallery_grid",
    name: "Grade de Fotos (Mural)",
    category: "gallery",
    description: "Mural limpo para fotos de produtos, espaço físico e clientes.",
    component: GalleryGrid,
    defaultProps: {
      title: "Nossa Galeria",
      images: [
        { url: "", alt: "Ambiente" },
        { url: "", alt: "Detalhes" },
        { url: "", alt: "Experiência" },
      ],
    },
  }),

  createClassicOmniBlock({
    id: "before_after_slider",
    name: "Comparador Antes & Depois",
    category: "media",
    description: "Controle deslizante interativo para procedimentos, reformas ou estética.",
    component: BeforeAfterSlider,
    defaultProps: {
      title: "Resultados Reais",
      beforeImageUrl: "",
      afterImageUrl: "",
    },
  }),

  createClassicOmniBlock({
    id: "video_section",
    name: "Vídeo em Destaque",
    category: "media",
    description: "Apresentação em vídeo (YouTube, Vimeo ou MP4) com moldura de alta definição.",
    component: VideoSection,
    defaultProps: {
      badge: "VÍDEO",
      title: "Experiência Imersiva",
      subtitle: "Conheça mais sobre nossa proposta e bastidores.",
      video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    },
  }),

  createClassicOmniBlock({
    id: "stories_ring",
    name: "Destaques Visuais Circulares",
    category: "media",
    description: "Círculos de novidades no topo para stories e novidades curtas.",
    component: StoriesRing,
    defaultProps: {
      stories: [
        { title: "Novidades", image_url: "" },
        { title: "Destaques", image_url: "" },
        { title: "Bastidores", image_url: "" },
      ],
    },
  }),

  // ── 5. SERVIÇOS & AGENDAMENTOS ──
  createClassicOmniBlock({
    id: "booking_calendar",
    name: "Agendamento Online",
    category: "services",
    description: "Calendário interativo para seleção de serviços, data e horários disponíveis.",
    component: BookingCalendar,
    defaultProps: {
      title: "Agende Seu Horário",
      subtitle: "Escolha o serviço desejado e reserve em poucos segundos.",
    },
  }),

  createClassicOmniBlock({
    id: "service_pricing_table",
    name: "Tabela de Procedimentos & Serviços",
    category: "services",
    description: "Tabela comparativa com valores, duração e detalhes dos procedimentos.",
    component: ServicePricingTable,
    defaultProps: {
      title: "Tabela de Procedimentos e Serviços",
      subtitle: "Atendimento especializado com tecnologia de ponta.",
    },
  }),

  createClassicOmniBlock({
    id: "specialist_team_grid",
    name: "Equipe & Especialistas",
    category: "services",
    description: "Apresentação de profissionais, registros técnicos e especialidades.",
    component: SpecialistTeamGridSection,
    defaultProps: {
      title: "Corpo Clínico e Especialistas",
      subtitle: "Profissionais certificados com vasta experiência técnica.",
    },
  }),

  createClassicOmniBlock({
    id: "routine_steps",
    name: "Passo a Passo / Como Funciona",
    category: "services",
    description: "Guia em 3 etapas sequenciais explicando o fluxo de atendimento.",
    component: RoutineSteps,
    defaultProps: {
      title: "Como Funciona o Atendimento",
      steps: [
        { step: "1", title: "Escolha o Serviço", description: "Selecione o plano ou procedimento adequado." },
        { step: "2", title: "Confirme a Data", description: "Escolha o melhor dia e horário na agenda." },
        { step: "3", title: "Atendimento VIP", description: "Compareça ou receba a equipe no local agendado." },
      ],
    },
  }),

  // ── 6. TURISMO & VIAGENS ──
  createClassicOmniBlock({
    id: "dynamic_booking_hero",
    name: "Motor de Busca & Reserva de Viagens",
    category: "tourism",
    description: "Hero com abas (Pacotes, Hospedagens, Voos, Carros), busca de origem/destino e micro-cards de benefícios.",
    component: DynamicBookingHeroSection,
    defaultProps: {
      headline: "Encontre sua próxima viagem dos sonhos",
      subheadline: "Pacotes completos com passagens aéreas, hospedagem e passeios exclusivos.",
      badgeText: "Tarifas Especiais 2026/2027",
      defaultTab: "packages",
      destinationsList: ["Gramado & Canela", "Maceió All Inclusive", "Porto Seguro", "Mendoza & Vinhedos", "Cancún", "Cruzeiro Costa"],
    },
  }),

  createClassicOmniBlock({
    id: "category_icon_grid",
    name: "Bento Grid de Serviços de Viagem",
    category: "tourism",
    description: "Grade de botões em pílula/card para atalhos rápidos com badges promocionais estilo aplicativo nativo.",
    component: CategoryIconGridSection,
    defaultProps: {
      title: "Explore por Categoria",
      subtitle: "Serviços e comodidades sob medida para a sua jornada",
      columns: 6,
    },
  }),

  createClassicOmniBlock({
    id: "dynamic_product_carousel",
    name: "Carrossel de Pacotes Imperdíveis",
    category: "tourism",
    description: "Carrossel snap scroll com cards verticais, badge de economia real, datas e parcelamento destacado.",
    component: DynamicProductCarouselSection,
    defaultProps: {
      title: "Pacotes Imperdíveis em Destaque",
      subtitle: "Os destinos mais desejados com os melhores preços e condições de pagamento.",
      filterCategory: "Pacotes",
    },
  }),

  createClassicOmniBlock({
    id: "travel_product_detail",
    name: "Página de Detalhes do Pacote/Hotel (70/30)",
    category: "tourism",
    description: "Galeria Masonry, sumário de comodidades e barra lateral fixa (Sticky Sidebar) com cálculo e reserva.",
    component: TravelProductDetailSection,
    defaultProps: {
      title: "Resort All Inclusive & Praia Privativa",
      location: "Porto de Galinhas, PE",
      stars: 5,
      ratingScore: 9.4,
      reviewsCount: 382,
    },
  }),

  createClassicOmniBlock({
    id: "customer_travel_portal",
    name: "Portal do Viajante B2C (Minhas Viagens & Vouchers)",
    category: "tourism",
    description: "Área do cliente para consulta de reservas ativas, bilhetes aéreos, download de voucher e suporte direto.",
    component: CustomerTravelPortalSection,
    defaultProps: {
      title: "Minhas Viagens & Vouchers",
      subtitle: "Acompanhe seus pacotes confirmados, vouchers de hospedagem e cartões de embarque.",
    },
  }),

  createClassicOmniBlock({
    id: "tourism_quote_hero",
    name: "Cotação de Viagens & Destinos",
    category: "tourism",
    description: "Formulário de solicitação de cotação com captura direta para WhatsApp.",
    component: TourismQuoteHero,
    defaultProps: {
      title: "Sua Próxima Viagem Inesquecível Começa Aqui",
      subtitle: "Roteiros exclusivos, passagens aéreas e pacotes completos com assessoria especializada.",
      badge: "Agência Especializada em Turismo",
      bgImageUrl: "",
      destinationPresets: ["Gramado & Canela", "Nordeste All Inclusive", "Mendoza & Vinhos", "Cruzeiro Costa"],
    },
  }),

  createClassicOmniBlock({
    id: "tourism_destinations_carousel",
    name: "Carrossel de Destinos",
    category: "tourism",
    description: "Cards visuais de pacotes de viagem com fotos e valores a partir de.",
    component: TourismDestinationsCarouselSection,
    defaultProps: {
      title: "Destinos em Destaque",
      subtitle: "Pacotes completos com voos, hospedagem e assessoria personalizada.",
    },
  }),

  createClassicOmniBlock({
    id: "tourism_services_grid",
    name: "Especialidades de Turismo",
    category: "tourism",
    description: "Grade com os principais serviços da agência (passagens, hotéis, cruzeiros).",
    component: TourismServicesGrid,
    defaultProps: {
      title: "Nossas Especialidades em Viagens",
      subtitle: "Assessoria completa para você viajar com tranquilidade e conforto.",
    },
  }),

  // ── 7. BIOLINK & SOCIAL ──
  createClassicOmniBlock({
    id: "biolink_profile_header",
    name: "Perfil BioLink com Verificação",
    category: "biolink",
    description: "Avatar circular centralizado, @handle, selo de verificação e mini bio.",
    component: BiolinkProfileSection,
    defaultProps: {
      name: "Sua Marca & Co.",
      handle: "@suamarca",
      bio: "Presença oficial, novidades e canais de contato direto.",
      isVerified: true,
      avatarUrl: "",
    },
  }),

  createClassicOmniBlock({
    id: "biolink_action_buttons",
    name: "Botões de Links em Pílula",
    category: "biolink",
    description: "Lista de botões táteis proeminentes para links externos e catálogos.",
    component: BiolinkActionButtonsSection,
    defaultProps: {
      links: [
        { id: "l1", title: "Falar no WhatsApp", url: "#contato", isHighlight: true },
        { id: "l2", title: "Acessar Loja Online", url: "#produtos" },
        { id: "l3", title: "Localização & Endereço", url: "#mapa" },
      ],
    },
  }),

  createClassicOmniBlock({
    id: "biolink_pix_card",
    name: "Chave Pix com Copiar em 1 Clique",
    category: "biolink",
    description: "Card seguro com chave Pix para pagamentos instantâneos sem atrito.",
    component: BiolinkPixCardSection,
    defaultProps: {
      pixKey: "contato@suamarca.com.br",
      pixKeyType: "Chave E-mail",
      beneficiaryName: "Sua Loja Oficial LTDA",
      bankName: "Waesy Pay",
    },
  }),

  // ── 8. LAYOUT & DIFERENCIAIS ──
  {
    id: "bento_asymmetric_4",
    name: "Grade de Destaques Bento",
    category: "bento",
    description: "Grade modular assimétrica com métricas e diferenciais.",
    component: BentoAsymmetricGrid as any,
    defaultProps: {
      sectionTitle: "Tudo o que seu negócio precisa para crescer",
      sectionSubtitle: "Uma plataforma completa para vender, atender e fidelizar clientes todos os dias com máxima velocidade.",
      cells: [
        {
          id: "cell-1",
          tag: "VELOCIDADE NATIVA",
          title: "Tempo de resposta instantâneo",
          description: "Navegação sem recarregamento de página e carregamento sub-100ms em redes móveis.",
          statNumber: "< 85ms",
          statLabel: "Latência Média",
          colSpan: 2,
        },
        {
          id: "cell-2",
          tag: "OMNICHANNEL",
          title: "Vendas integradas no balcão e online",
          description: "Estoque sincronizado em tempo real entre o PDV físico e o site.",
          colSpan: 1,
        },
        {
          id: "cell-3",
          tag: "SEGURANÇA",
          title: "Conformidade LGPD & Criptografia",
          description: "Pagamentos protegidos e dados criptografados de ponta a ponta.",
          colSpan: 1,
        },
        {
          id: "cell-4",
          tag: "AUTOMATIZAÇÃO",
          title: "Gatilhos inteligentes e mensagens",
          description: "Notificações automáticas de status de pedido e agendamentos via WhatsApp.",
          colSpan: 2,
        },
      ],
    } as BentoBlockData,
  },

  createClassicOmniBlock({
    id: "trust_badges",
    name: "Selos de Confiança & Garantias",
    category: "social_proof",
    description: "Faixa com ícones de entrega rápida, segurança no pagamento e suporte.",
    component: TrustBadges,
    defaultProps: {
      badges: [
        { icon: "Truck", title: "Entrega Expressa", description: "Rastreio em tempo real" },
        { icon: "ShieldCheck", title: "Pagamento Protegido", description: "Criptografia de ponta a ponta" },
        { icon: "RotateCcw", title: "Troca Facilitada", description: "Sem burocracia" },
      ],
    },
  }),

  createClassicOmniBlock({
    id: "timeline_history",
    name: "Linha do Tempo & Trajetória",
    category: "social_proof",
    description: "Histórico cronológico de marcos importantes ou fundação da empresa.",
    component: TimelineHistory,
    defaultProps: {
      title: "Nossa Trajetória",
      subtitle: "Construindo relações de confiança e excelência ao longo dos anos.",
      events: [
        { year: "2020", title: "Fundação", description: "Início das atividades com foco em atendimento próximo." },
        { year: "2023", title: "Expansão", description: "Inauguração da nova sede e ampliação do catálogo." },
        { year: "2026", title: "Presença Digital", description: "Plataforma nativa e integração total com nossos clientes." },
      ],
    },
  }),

  // ── 9. PLANOS & PREÇOS ──
  {
    id: "pricing_three_tiers",
    name: "Planos & Preços",
    category: "pricing",
    description: "Tabela comparativa de preços com períodos mensal e anual.",
    component: PricingTablesClean as any,
    defaultProps: {
      title: "Planos simples e transparentes para cada estágio",
      subtitle: "Sem taxas ocultas. Cancele ou alterne de plano a qualquer momento diretamente no painel.",
      tiers: [
        {
          id: "starter",
          name: "Iniciante",
          priceMonthlyCents: 4900,
          priceAnnualCents: 3900,
          description: "Ideal para profissionais autônomos e pequenos comércios locais.",
          features: ["1 Loja / Vitrine Ativa", "Até 100 Produtos no Catálogo", "PDV Integrado Básico", "Suporte via WhatsApp"],
          ctaLabel: "Começar com Iniciante",
        },
        {
          id: "pro",
          name: "Profissional",
          badge: "Recomendado",
          priceMonthlyCents: 12900,
          priceAnnualCents: 9900,
          isPopular: true,
          description: "Para empresas que demandam omnichannel, controle de caixa e múltiplos atendentes.",
          features: ["Tudo do plano Iniciante", "Produtos Ilimitados", "PDV Fiscal & Controle de Caixa", "Gestão de Entregadores & Motolink", "Integração Bancária PIX Direta"],
          ctaLabel: "Garantir Plano Pro",
        },
        {
          id: "scale",
          name: "Escala & Franquia",
          priceMonthlyCents: 29900,
          priceAnnualCents: 24900,
          description: "Estruturas multi-lojas, cooperativas e grandes redes comerciais.",
          features: ["Tudo do plano Pro", "Multi-Tenancy Avançado", "Acesso à API & Webhooks Exclusivos", "Gerente de Contas Dedicado", "Relatórios Financeiros Avançados"],
          ctaLabel: "Falar com Consultor",
        },
      ],
    } as PricingBlockData,
  },

  // ── 10. DEPOIMENTOS & AVALIAÇÕES ──
  {
    id: "testimonials_social_proof",
    name: "Depoimentos de Clientes",
    category: "social_proof",
    description: "Avaliações com fotos, notas e comentários de clientes reais.",
    component: TestimonialsSocialProof as any,
    defaultProps: {
      title: "O Que Nossos Clientes Dizem",
      subtitle: "Histórias reais de quem confia em nossa excelência de atendimento.",
      testimonials: [
        {
          id: "t-1",
          name: "Carolina Mendes",
          role: "Mendes & Associados",
          avatarUrl: "",
          rating: 5,
          comment: "A plataforma transformou nossa presença digital. O site transmite sobriedade e segurança, e a captação de novos clientes aumentou significativamente.",
          verified: true,
        },
        {
          id: "t-2",
          name: "Rodrigo Silveira",
          role: "NeoLog",
          avatarUrl: "",
          rating: 5,
          comment: "A velocidade e o design limpo superaram qualquer ferramenta que usamos antes. Sem poluição visual, direto ao ponto.",
          verified: true,
        },
        {
          id: "t-3",
          name: "Mariana Vasconcelos",
          role: "Viva Turismo",
          avatarUrl: "",
          rating: 5,
          comment: "Nossas lâminas de roteiros ficaram impecáveis. Os viajantes elogiam a clareza e facilidade de fechar contratos diretamente pelo celular.",
          verified: true,
        },
      ],
    } as TestimonialsBlockData,
  },

  // ── 11. CONTATO & LOCALIZAÇÃO ──
  {
    id: "contact_form_direct",
    name: "Formulário de Contato",
    category: "contact",
    description: "Formulário direto para captação de mensagens com envio para WhatsApp.",
    component: ContactFormDirect as any,
    defaultProps: {
      title: "Solicite um Orçamento ou Tire Dúvidas",
      subtitle: "Preencha o formulário abaixo e nossa equipe responderá em menos de 15 minutos.",
      submitButtonText: "Enviar Mensagem",
      whatsappNumber: "5511999998888",
      showPhoneField: true,
      showMessageField: true,
      successMessage: "Recebemos sua mensagem! Entraremos em contato imediatamente.",
    } as ContactFormBlockData,
  },

  createClassicOmniBlock({
    id: "location_map_card",
    name: "Endereço & Mapa de Localização",
    category: "contact",
    description: "Endereço físico, mapa e rota de acesso para estabelecimentos locais.",
    component: LocationMapCardSection,
    defaultProps: {
      title: "Venha nos Visitar",
      address: "Av. Brasil, 1420 - Centro",
      cityState: "São Miguel do Oeste - SC",
    },
  }),

  createClassicOmniBlock({
    id: "store_hours",
    name: "Quadro de Horários de Funcionamento",
    category: "contact",
    description: "Horários diários com indicador de aberto/fechado em tempo real.",
    component: StoreHours,
    defaultProps: {
      title: "Horários de Funcionamento",
    },
  }),

  createClassicOmniBlock({
    id: "store_contact",
    name: "Canais Oficiais de Contato",
    category: "contact",
    description: "Cards de WhatsApp, e-mail, telefone e redes sociais oficiais.",
    component: StoreContact,
    defaultProps: {
      title: "Canais de Atendimento",
    },
  }),

  createClassicOmniBlock({
    id: "announcement_bar",
    name: "Barra Superior de Aviso",
    category: "hero",
    description: "Faixa de topo compacta com mensagem promocional ou comunicado de urgência.",
    component: AnnouncementBar,
    defaultProps: {
      text: "Frete grátis em compras acima de R$ 150 para toda a região!",
      link: "/produtos",
      bg_color: "var(--primary)",
      text_color: "var(--primary-foreground)",
    },
  }),

  createClassicOmniBlock({
    id: "countdown_timer",
    name: "Contador Regressivo de Urgência",
    category: "hero",
    description: "Cronômetro regressivo com dias, horas e minutos para ofertas limitadas.",
    component: CountdownTimer,
    defaultProps: {
      title: "Condição Especial por Tempo Limitado",
      target_date: new Date(Date.now() + 86400000 * 3).toISOString(),
      expired_message: "Promoção encerrada",
    },
  }),

  createClassicOmniBlock({
    id: "newsletter_capture",
    name: "Captura de Contatos & Novidades",
    category: "contact",
    description: "Formulário de captação de e-mail ou WhatsApp para campanhas e ofertas.",
    component: NewsletterCaptureSection,
    defaultProps: {
      title: "Receba Novidades e Ofertas",
      subtitle: "Cadastre seu e-mail ou WhatsApp para receber lançamentos e condições exclusivas.",
      placeholder: "Digite seu e-mail ou WhatsApp",
      buttonLabel: "Cadastrar",
    },
  }),

  createClassicOmniBlock({
    id: "careers_hero_banner",
    name: "Trabalhe Conosco (Apresentação)",
    category: "services",
    description: "Apresentação da cultura, benefícios e proposta de valor para candidatos.",
    component: CareersHeroBanner,
    defaultProps: {
      title: "Faça Parte da Nossa Equipe",
      subtitle: "Construímos soluções com autonomia, impacto real e valorização contínua.",
      company_name: "Waesy",
    },
  }),

  createClassicOmniBlock({
    id: "careers_job_grid",
    name: "Quadro de Vagas Abertas",
    category: "services",
    description: "Mural com listagem de oportunidades, modelo de trabalho e formulário de inscrição.",
    component: CareersJobGrid,
    defaultProps: {},
  }),

  createClassicOmniBlock({
    id: "travel_package_hero",
    name: "Pacote de Viagem em Destaque",
    category: "tourism",
    description: "Hero imersivo com destino, hotel, parcelamento e botão direto de reserva.",
    component: TravelPackageHero,
    defaultProps: {
      title: "Fim de Semana nas Termas",
      destination: "Piratuba - SC",
      durationText: "3 Dias / 2 Noites",
      priceCents: 89000,
      installmentsCount: 10,
    },
  }),

  createClassicOmniBlock({
    id: "travel_itinerary_timeline",
    name: "Roteiro Dia a Dia de Roteiros",
    category: "tourism",
    description: "Cronograma sanfonado detalhando passeios, paradas e horários diários.",
    component: TravelItineraryTimeline,
    defaultProps: {
      title: "Programação Completa",
      subtitle: "Confira o roteiro programado para cada dia da viagem.",
      days: [
        { day: 1, title: "Chegada e Check-in", description: "Recepção no hotel e noite livre no centro gastronômico." },
        { day: 2, title: "Passeio pelas Termas e Piscinas", description: "Acesso completo ao parque aquático e almoço típico." },
        { day: 3, title: "Retorno", description: "Café da manhã colonial e viagem de volta." },
      ],
    },
  }),

  createClassicOmniBlock({
    id: "travel_hotel_slider",
    name: "Trilho de Hospedagens Parceiras",
    category: "tourism",
    description: "Carrossel de hotéis conveniados com fotos, estrelas e diárias negociadas.",
    component: TravelHotelSlider,
    defaultProps: {
      title: "Hotéis e Pousadas Selecionados",
      subtitle: "Hospedagens avaliadas com condições exclusivas.",
    },
  }),

  createClassicOmniBlock({
    id: "size_guide_table",
    name: "Tabela de Medidas & Caimento",
    category: "commerce",
    description: "Guia técnico de tamanhos e proporções em centímetros para moda e calçados.",
    component: SizeGuideTableSection,
    defaultProps: {
      title: "Tabela de Medidas",
      subtitle: "Encontre o tamanho correto para o caimento ideal da sua peça.",
    },
  }),

  createClassicOmniBlock({
    id: "property_features_grid",
    name: "Ficha Técnica de Imóvel & Atributos",
    category: "services",
    description: "Especificações detalhadas de quartos, área, IPTU, condomínio e comodidades.",
    component: PropertyFeaturesGridSection,
    defaultProps: {
      title: "Ficha Técnica do Imóvel",
      subtitle: "Todos os detalhes estruturais e diferenciais de acabamento.",
    },
  }),

  createClassicOmniBlock({
    id: "store_profile_hero",
    name: "Perfil Monumental do Estabelecimento",
    category: "hero",
    description: "Capa, logotipo, bio e status ao vivo da loja ou prestador.",
    component: StoreProfileHero,
    defaultProps: {
      show_description: true,
      show_logo: true,
      show_cover: true,
      layout: "centered",
    },
  }),

  createClassicOmniBlock({
    id: "ingredient_spotlight",
    name: "Destaque de Ingredientes & Pureza",
    category: "gastronomy",
    description: "Cards explicativos destacando matéria-prima, pureza e diferenciais.",
    component: IngredientSpotlight,
    defaultProps: {
      title: "Matéria-Prima Selecionada",
      subtitle: "Fórmulas puras e insumos rigorosamente selecionados.",
      items: [
        { title: "Origem Controlada", benefit: "100% Rastreável", description: "Insumos certificados direto de produtores regionais." },
        { title: "Sem Conservantes Artificiais", benefit: "Natural & Puro", description: "Processamento artesanal preservando frescor e sabor." },
      ],
    },
  }),

  createClassicOmniBlock({
    id: "shop_the_look_hotspots",
    name: "Composição Visual (Shop the Look)",
    category: "commerce",
    description: "Foto editorial com marcadores interativos para compra direta das peças.",
    component: ShopTheLookSection,
    defaultProps: {
      title: "Look Completo",
      subtitle: "Toque nos pontos da composição para comprar os itens individuais.",
      lookImageUrl: "",
      hotspots: [],
    },
  }),

  createClassicOmniBlock({
    id: "mosaic_banners",
    name: "Mosaico Editorial de Banners",
    category: "gallery",
    description: "Grade de até 3 banners temáticos com proporção adaptável e links.",
    component: MosaicBanners,
    defaultProps: {
      banners: [
        { title: "Coleção Nova", link: "/produtos", image_url: "" },
        { title: "Mais Vendidos", link: "/produtos", image_url: "" },
      ],
    },
  }),

  createClassicOmniBlock({
    id: "community_feed",
    name: "Mural Social & Classificados",
    category: "biolink",
    description: "Feed comunitário com publicações, classificados e avisos da comunidade.",
    component: CommunityFeed,
    defaultProps: {
      title: "Comunidade ao Vivo",
      layout: "grid",
    },
  }),

  createClassicOmniBlock({
    id: "event_rail",
    name: "Trilho de Eventos & Agendamentos",
    category: "services",
    description: "Trilho de ingressos e eventos da cidade com data e local.",
    component: EventRail,
    defaultProps: {
      title: "Próximos Eventos & Shows",
      subtitle: "Garanta seu ingresso antecipado para as atrações confirmadas.",
      layout: "carousel",
    },
  }),

  createClassicOmniBlock({
    id: "social_grid",
    name: "Feed Social em Mosaico",
    category: "biolink",
    description: "Grade com fotos do feed do Instagram e link para o perfil oficial.",
    component: SocialGrid,
    defaultProps: {
      title: "Siga no Instagram",
      username: "waesy",
      posts: [],
    },
  }),

  createClassicOmniBlock({
    id: "info_cards",
    name: "Diferenciais & Garantias",
    category: "biolink",
    description: "Faixa de vantagens com ícones: entrega, garantia, segurança e suporte.",
    component: InfoCards,
    defaultProps: {
      cards: [
        { icon: "truck", title: "Entrega Rápida", description: "Despacho no mesmo dia para pedidos locais." },
        { icon: "shield", title: "Compra Segura", description: "Pagamento 100% protegido com garantia de entrega." },
        { icon: "rotate-ccw", title: "Troca Sem Burocracia", description: "Até 7 dias para devolução gratuita." },
      ],
    },
  }),

  createClassicOmniBlock({
    id: "rich_text",
    name: "Texto Editorial Formatado",
    category: "hero",
    description: "Bloco de conteúdo textual livre com suporte a markdown, títulos e alinhamentos.",
    component: RichText,
    defaultProps: {
      title: "Nossa Filosofia de Trabalho",
      content: "Acreditamos que a simplicidade operacional e a excelência no atendimento são os pilares indispensáveis para construir relações de longo prazo com nossos clientes e parceiros.",
      align: "center",
      max_width: "lg",
    },
  }),

  createClassicOmniBlock({
    id: "image_hotspots",
    name: "Pontos Marcados em Imagem",
    category: "commerce",
    description: "Imagem ampliada com marcadores interativos apontando para produtos e detalhes.",
    component: ImageHotspots,
    defaultProps: {
      title: "Explore os Detalhes",
      subtitle: "Toque nos pontos da foto para ver as especificações.",
      image_url: "",
      hotspots: [],
    },
  }),

  createClassicOmniBlock({
    id: "product_carousel",
    name: "Carrossel de Produtos em Destaque",
    category: "commerce",
    description: "Slider dinâmico de produtos com rolagem suave e navegação por setas.",
    component: ProductCarousel,
    defaultProps: {
      title: "Destaques do Catálogo",
      subtitle: "Os itens mais procurados e bem avaliados da semana.",
      itemsPerRowDesktop: "4",
      itemsPerRowMobile: "2",
      freeScroll: true,
    },
  }),

  createClassicOmniBlock({
    id: "testimonial_carousel",
    name: "Carrossel de Avaliações",
    category: "biolink",
    description: "Carrossel deslizante de depoimentos de clientes verificados com estrelas.",
    component: TestimonialCarousel,
    defaultProps: {
      title: "O que Nossos Clientes Dizem",
      subtitle: "Avaliações reais e espontâneas de quem já comprou.",
      testimonials: [
        { name: "Mariana Costa", text: "Excelente atendimento e os produtos superaram minhas expectativas!", rating: 5 },
        { name: "Rodrigo Almeida", text: "Entrega super rápida e embalagem perfeita. Comprarei novamente.", rating: 5 },
      ],
    },
  }),

  createClassicOmniBlock({
    id: "portal_contracts",
    name: "Central de Contratos do Cliente",
    category: "services",
    description: "Painel do cliente para visualização e assinatura digital com certificado.",
    component: PortalContractsWidget,
    defaultProps: {
      title: "Meus Contratos e Propostas",
      subtitle: "Consulte termos de adesão e assine documentos pendentes.",
    },
  }),

  createClassicOmniBlock({
    id: "portal_appointments",
    name: "Minha Agenda & Atendimentos",
    category: "services",
    description: "Quadro com próximos horários agendados, profissional responsável e local.",
    component: PortalAppointmentsWidget,
    defaultProps: {
      title: "Meus Agendamentos",
      subtitle: "Acompanhe seus horários confirmados e datas de atendimento.",
    },
  }),

  createClassicOmniBlock({
    id: "portal_orders_rentals",
    name: "Minhas Compras & Locações",
    category: "services",
    description: "Histórico consolidado de pedidos entregues e prazos de devolução de locações.",
    component: PortalOrdersRentalsWidget,
    defaultProps: {
      title: "Compras e Locações",
      subtitle: "Monitore o status de expedição e prazos ativos.",
    },
  }),

  createClassicOmniBlock({
    id: "portal_carnes_bills",
    name: "Carnê de Pagamentos & Boletos",
    category: "services",
    description: "Controle de parcelas com linha digitável, chave Pix e recibos de quitação.",
    component: PortalCarnesBillsWidget,
    defaultProps: {
      title: "Carnê de Mensalidades",
      subtitle: "Acesse as parcelas abertas e pague via Pix instantâneo.",
    },
  }),

  createClassicOmniBlock({
    id: "reputation_score_header",
    name: "Placar Oficial de Reputação",
    category: "biolink",
    description: "Nota de reputação auditada com índice de solução e botão para ocorrências.",
    component: ReputationScoreHeader,
    defaultProps: {
      company_name: "Empresa Auditada",
      reputation_score: 9.4,
      reputation_badge: "Excelente",
      total_complaints: 18,
      resolved_percentage: 98.2,
    },
  }),

  createClassicOmniBlock({
    id: "reputation_badges_strip",
    name: "Faixa de Selos e Certificações",
    category: "biolink",
    description: "Certificações de CNPJ auditado, atendimento humanizado e segurança.",
    component: ReputationBadgesStrip,
    defaultProps: {},
  }),

  createClassicOmniBlock({
    id: "reputation_timeline_feed",
    name: "Mural Transparente de Ocorrências",
    category: "biolink",
    description: "Linha do tempo pública com atendimentos concluídos e respostas da empresa.",
    component: ReputationTimelineFeed,
    defaultProps: {},
  }),

  createClassicOmniBlock({
    id: "office_contract_viewer",
    name: "Assinador Jurídico com Canvas",
    category: "services",
    description: "Visualizador de contrato completo com bloco de assinatura manuscrita em tela.",
    component: OfficeContractViewer,
    defaultProps: {
      title: "Contrato de Prestação de Serviços",
      documentNumber: "CTR-2027-001",
    },
  }),

  createClassicOmniBlock({
    id: "careers_job_filters",
    name: "Barra de Filtro de Vagas",
    category: "services",
    description: "Busca de oportunidades por setor e palavras-chave.",
    component: CareersJobFilters,
    defaultProps: {},
  }),

  // ── 12. DÚVIDAS & FAQ ──
  {
    id: "faq_clean_accordion",
    name: "Dúvidas Frequentes",
    category: "faq",
    description: "Perguntas frequentes em formato sanfona interativo sem ruído visual.",
    component: FaqCleanAccordion as any,
    defaultProps: {
      title: "Perguntas Frequentes",
      subtitle: "Encontre respostas rápidas para as dúvidas mais comuns sobre nossos serviços.",
      items: [
        {
          id: "faq-1",
          question: "Como funciona a contratação e entrega dos serviços?",
          answer: "Todo o processo ocorre de forma digital e transparente. Após o primeiro contato ou contratação do plano, alinhamos os detalhes específicos e você acompanha o andamento em tempo real diretamente pelo portal.",
        },
        {
          id: "faq-2",
          question: "Quais são as formas de pagamento aceitas?",
          answer: "Aceitamos Pix instantâneo, boleto bancário e cartões de crédito em até 12x. Para contratos corporativos, disponibilizamos faturamento mediante análise cadastral.",
        },
        {
          id: "faq-3",
          question: "Existe suporte ou garantia pós-entrega?",
          answer: "Sim, oferecemos suporte técnico contínuo e canal de atendimento prioritário via WhatsApp para esclarecer qualquer dúvida operacional.",
        },
        {
          id: "faq-4",
          question: "Os documentos e contratos têm validade jurídica?",
          answer: "Sim. Nossos contratos são emitidos em conformidade com o Código Civil brasileiro e assinados com certificado digital que gera manifesto auditável e hash criptográfico SHA-256.",
        },
      ],
    } as FaqBlockData,
  },
];

export function getSiteBlocksByCategory(category: string): SiteBuilderBlockDefinition[] {
  return SITE_BUILDER_BLOCKS.filter((b) => b.category === category);
}

/**
 * Lookup canônico para fronteiras de publicação. Diferente da API legada abaixo,
 * não transforma um tipo desconhecido no primeiro bloco do catálogo.
 */
export function getSiteBlockByIdStrict(id: string): SiteBuilderBlockDefinition | undefined {
  return SITE_BUILDER_BLOCKS.find((b) => b.id === id);
}

export function getSiteBlockById(id: string): SiteBuilderBlockDefinition {
  const found = SITE_BUILDER_BLOCKS.find((b) => b.id === id);
  return found || SITE_BUILDER_BLOCKS[0];
}

import {
  LayoutGrid,
  LayoutTemplate,
  UtensilsCrossed,
  ShoppingBag,
  Image,
  Briefcase,
  Compass,
  Share2,
  HelpCircle,
} from "lucide-react";

export type WixBlockCategory =
  | "all"
  | "hero"
  | "gastronomy"
  | "commerce"
  | "gallery"
  | "services"
  | "tourism"
  | "biolink"
  | "faq";

export const WIX_CATEGORY_CONFIG: { id: WixBlockCategory; label: string; icon: any }[] = [
  { id: "all", label: "Todos", icon: LayoutGrid },
  { id: "hero", label: "Apresentação", icon: LayoutTemplate },
  { id: "gastronomy", label: "Gastronomia", icon: UtensilsCrossed },
  { id: "commerce", label: "Catálogo", icon: ShoppingBag },
  { id: "gallery", label: "Mídia & Fotos", icon: Image },
  { id: "services", label: "Serviços", icon: Briefcase },
  { id: "tourism", label: "Turismo", icon: Compass },
  { id: "biolink", label: "BioLink & Social", icon: Share2 },
  { id: "faq", label: "Dúvidas & FAQ", icon: HelpCircle },
];

export const BLOCK_TO_WIX_CATEGORY: Record<string, WixBlockCategory> = {
  // Hero
  hero_minimal_split: "hero",
  hero_interactive_carousel: "hero",
  split_banner: "hero",
  announcement_bar: "hero",
  countdown_timer: "hero",
  store_profile_hero: "hero",
  rich_text: "hero",

  // Gastronomia
  food_menu_streamlined: "gastronomy",
  food_menu_tabs: "gastronomy",
  chef_special_banner: "gastronomy",
  table_order_comanda: "gastronomy",
  table_booking_card: "gastronomy",
  restaurant_hours_delivery: "gastronomy",
  ingredient_spotlight: "gastronomy",

  // Catálogo
  product_grid: "commerce",
  curated_hits_rail: "commerce",
  product_rail: "commerce",
  flash_sale_hero: "commerce",
  size_guide_table: "commerce",
  shop_the_look_hotspots: "commerce",
  image_hotspots: "commerce",
  product_carousel: "commerce",

  // Mídia & Galeria
  media_gallery_mosaic: "gallery",
  gallery_grid: "gallery",
  before_after_slider: "gallery",
  video_section: "gallery",
  stories_ring: "gallery",
  mosaic_banners: "gallery",

  // Serviços & Agendamento
  booking_calendar: "services",
  service_pricing_table: "services",
  specialist_team_grid: "services",
  routine_steps: "services",
  pricing_three_tiers: "services",
  careers_hero_banner: "services",
  careers_job_grid: "services",
  careers_job_filters: "services",
  property_features_grid: "services",
  event_rail: "services",
  portal_contracts: "services",
  portal_appointments: "services",
  portal_orders_rentals: "services",
  portal_carnes_bills: "services",
  office_contract_viewer: "services",

  // Turismo
  tourism_quote_hero: "tourism",
  tourism_destinations_carousel: "tourism",
  tourism_services_grid: "tourism",
  travel_package_hero: "tourism",
  travel_itinerary_timeline: "tourism",
  travel_hotel_slider: "tourism",

  // BioLink & Social
  biolink_profile_header: "biolink",
  biolink_action_buttons: "biolink",
  biolink_pix_card: "biolink",
  bento_asymmetric_4: "biolink",
  trust_badges: "biolink",
  timeline_history: "biolink",
  testimonials_social_proof: "biolink",
  community_feed: "biolink",
  social_grid: "biolink",
  info_cards: "biolink",
  testimonial_carousel: "biolink",
  reputation_score_header: "biolink",
  reputation_badges_strip: "biolink",
  reputation_timeline_feed: "biolink",

  // FAQ & Contato
  faq_clean_accordion: "faq",
  contact_form_direct: "faq",
  location_map_card: "faq",
  store_hours: "faq",
  store_contact: "faq",
  newsletter_capture: "faq",
};
