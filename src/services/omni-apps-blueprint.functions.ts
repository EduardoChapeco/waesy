/**
 * omni-apps-blueprint.functions.ts — Motor Declarativo de Instanciação de Omni Apps
 * 
 * Implementa paridade com o modelo "Wix Apps":
 * A ativação de um app instancia atomicamente a árvore de páginas (`experience_documents`),
 * blocos e rotas transacionais sem dados fictícios ou hardcoded.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, requireAdmin } from "@/lib/server-access";
import { logSystemError } from "@/lib/logger";
import { OmniAppBlueprint, OmniAppId, InstalledOmniAppDTO, OmniAppIdSchema } from "@/types/omni-apps";

// ── CATÁLOGO CANÔNICO DOS 7 BLUEPRINTS DE APPS NATIVOS ──

export const OMNI_APP_BLUEPRINTS: Record<OmniAppId, OmniAppBlueprint> = {
  supermarket: {
    id: "supermarket",
    name: "Supermercado & Atacarejo",
    tagline: "Varejo alimentar com pesagem fracionada, Clube K e janelas de entrega",
    description: "Provisiona vitrine contínua, departamentos circulares, modal de maturidade/corte, regras de Leve X Pague Y, controle de limite por CPF e carrinho com pesagem na separação.",
    iconName: "ShoppingCart",
    category: "commerce",
    version: "2.4.0",
    defaultChannel: "storefront_pwa",
    pages: [
      {
        slug: "mercado",
        title: "Supermercado Principal",
        pageType: "showcase",
        isHome: true,
        initialBlocks: [
          { type: "supermarket_hero_carousel", props: { autoScrollIntervalMs: 5000, roundedBottom: true } },
          { type: "supermarket_fulfillment_pill", props: { defaultMode: "delivery" } },
          { type: "supermarket_category_dock", props: { layout: "circular_horizontal" } },
          { type: "supermarket_product_shelf", props: { title: "Ofertas do Clube K", filterTag: "clube_oferta" } },
          { type: "supermarket_product_shelf", props: { title: "Hortifrúti Selecionado", categoryId: "hortifruti" } },
        ],
        seo: { title: "Supermercado Online | Ofertas e Entregas Rápidas", description: "Faça suas compras de mercado com entrega rápida ou retirada na loja.", allowIndexing: true },
      },
      {
        slug: "clube",
        title: "Clube de Fidelidade",
        pageType: "dashboard",
        requiredRoles: ["member"],
        initialBlocks: [
          { type: "supermarket_club_dashboard", props: { showEconomizometro: true, showCashback: true, showCoupons: true } },
        ],
        seo: { title: "Meu Clube | Descontos Exclusivos", description: "Consulte seu saldo de cashback e ofertas exclusivas.", allowIndexing: false },
      },
      {
        slug: "carrinho",
        title: "Sacola de Compras",
        pageType: "cart",
        initialBlocks: [
          { type: "supermarket_cart_sheet", props: { enableOrderBump: true, freeShippingGoalCents: 15000 } },
        ],
        seo: { title: "Sacola | Revisão do Pedido", description: "Revise seus itens e agende a entrega.", allowIndexing: false },
      },
    ],
    navItems: [
      { id: "home", label: "Início", icon: "Home", targetSlug: "mercado" },
      { id: "offers", label: "Ofertas", icon: "Flame", targetSlug: "mercado?tab=ofertas" },
      { id: "club", label: "Clube", icon: "Crown", targetSlug: "clube" },
      { id: "orders", label: "Compras", icon: "Receipt", targetSlug: "compras" },
      { id: "cart", label: "Sacola", icon: "ShoppingBag", targetSlug: "carrinho", isPrimaryAction: true },
    ],
    dataRequirements: { entity: "products", multiplePricingTiers: true, deliverySlots: true },
  },

  delivery: {
    id: "delivery",
    name: "Gastronomia & Delivery",
    tagline: "Cardápio digital mobile-first com KDS de cozinha e adicionais pagos",
    description: "Provisiona menu por categorias, customizador de pratos com complementos, taxa por raio de KM e tracking em tempo real.",
    iconName: "UtensilsCrossed",
    category: "food",
    version: "3.1.0",
    defaultChannel: "storefront_pwa",
    pages: [
      {
        slug: "cardapio",
        title: "Cardápio Digital",
        pageType: "showcase",
        isHome: true,
        initialBlocks: [
          { type: "food_menu_streamlined", props: { showCategoriesTabs: true, showPopularBadge: true } },
          { type: "chef_special_banner", props: { showOrderCta: true } },
          { type: "restaurant_hours_delivery", props: { showStatusPill: true } },
        ],
        seo: { title: "Cardápio Online | Faça seu Pedido", description: "Peça refeições deliciosas com entrega rápida.", allowIndexing: true },
      },
      {
        slug: "acompanhar",
        title: "Acompanhar Pedido",
        pageType: "dashboard",
        initialBlocks: [
          { type: "delivery_tracking_live", props: { showDriverMap: true } },
        ],
        seo: { title: "Status do Pedido", description: "Acompanhe o preparo e a entrega do seu pedido.", allowIndexing: false },
      },
    ],
    navItems: [
      { id: "menu", label: "Cardápio", icon: "Utensils", targetSlug: "cardapio" },
      { id: "orders", label: "Meus Pedidos", icon: "Clock", targetSlug: "acompanhar" },
      { id: "contact", label: "Contato", icon: "MessageCircle", targetSlug: "contato" },
    ],
    dataRequirements: { entity: "products", tableManagement: true },
  },

  events: {
    id: "events",
    name: "Eventos, Shows & Ingressos",
    tagline: "Venda de ingressos com lotes nominais, e-ticket QR Code e calendário",
    description: "Provisiona grade de atrações, detalhes do show, seleção de lote, checagem de meia-entrada e emissão de ingressos digitais com scanner antifraude.",
    iconName: "Calendar",
    category: "events",
    version: "2.0.0",
    defaultChannel: "marketplace",
    pages: [
      {
        slug: "eventos",
        title: "Agenda de Atrações",
        pageType: "showcase",
        isHome: true,
        initialBlocks: [
          { type: "events_calendar_strip", props: { layout: "apple_calendar" } },
          { type: "events_featured_banner", props: { showCountdown: true } },
          { type: "events_list_grid", props: { itemsPerPage: 12 } },
        ],
        seo: { title: "Ingressos e Shows | Agenda Cultural", description: "Garanta seu ingresso nominal para os melhores eventos.", allowIndexing: true },
      },
      {
        slug: "meus-ingressos",
        title: "Meus Ingressos",
        pageType: "dashboard",
        requiredRoles: ["member"],
        initialBlocks: [
          { type: "events_ticket_wallet", props: { showQrCode: true, allowPdfExport: true } },
        ],
        seo: { title: "Carteira de Ingressos", description: "Acesse seus e-tickets nominais para validação na portaria.", allowIndexing: false },
      },
    ],
    navItems: [
      { id: "events", label: "Eventos", icon: "Calendar", targetSlug: "eventos" },
      { id: "my_tickets", label: "Meus Ingressos", icon: "Ticket", targetSlug: "meus-ingressos" },
    ],
    dataRequirements: { entity: "events", ticketTiers: true },
  },

  appointments: {
    id: "appointments",
    name: "Agendamentos & Clínicas",
    tagline: "Grade de profissionais com reserva de slots em tempo real e WhatsApp",
    description: "Provisiona catálogo de procedimentos, agenda interativa de horários, confirmação por WhatsApp e pagamento de sinal/reserva.",
    iconName: "Clock",
    category: "services",
    version: "1.9.0",
    defaultChannel: "storefront_pwa",
    pages: [
      {
        slug: "agendamento",
        title: "Agendar Atendimento",
        pageType: "showcase",
        isHome: true,
        initialBlocks: [
          { type: "specialist_team_grid", props: { showRatings: true } },
          { type: "service_pricing_table", props: { showDuration: true } },
          { type: "booking_calendar", props: { requireDeposit: false } },
        ],
        seo: { title: "Agendamento Online | Escolha seu Horário", description: "Reserve seu atendimento com nossos especialistas.", allowIndexing: true },
      },
    ],
    navItems: [
      { id: "schedule", label: "Agendar", icon: "Calendar", targetSlug: "agendamento" },
      { id: "team", label: "Profissionais", icon: "Users", targetSlug: "agendamento#equipe" },
      { id: "services", label: "Procedimentos", icon: "Sparkles", targetSlug: "agendamento#servicos" },
    ],
    dataRequirements: { entity: "services", bookingCalendar: true },
  },

  ecommerce: {
    id: "ecommerce",
    name: "E-Commerce & Varejo B2B/B2C",
    tagline: "Loja virtual completa com filtros faciais, cálculo de frete e atacado",
    description: "Provisiona grade de produtos com variações de cor/tamanho, tabela de atacado progressiva, cálculo de frete Correios/Melhor Envio e checkout transparente.",
    iconName: "Store",
    category: "commerce",
    version: "3.5.0",
    defaultChannel: "storefront_pwa",
    pages: [
      {
        slug: "loja",
        title: "Catálogo Geral",
        pageType: "showcase",
        isHome: true,
        initialBlocks: [
          { type: "product_grid", props: { columnsDesktop: 4, showFilterBar: true } },
          { type: "curated_hits_rail", props: { title: "Mais Vendidos" } },
        ],
        seo: { title: "Loja Virtual Oficial | Melhores Ofertas", description: "Compre produtos direto do fabricante com frete para todo o Brasil.", allowIndexing: true },
      },
    ],
    navItems: [
      { id: "shop", label: "Produtos", icon: "ShoppingBag", targetSlug: "loja" },
      { id: "cart", label: "Carrinho", icon: "ShoppingCart", targetSlug: "carrinho" },
    ],
    dataRequirements: { entity: "products" },
  },

  biolink: {
    id: "biolink",
    name: "BioLink Pro (Hopp Parity)",
    tagline: "Página móvel de links ultra-rápida com 7 modos de layout e Pix",
    description: "Provisiona hub de links otimizado para browsers de Instagram/TikTok, com botões táteis, carrossel de fotos, grade 2x2 e cartão Pix para pagamentos instantâneos.",
    iconName: "Link2",
    category: "social",
    version: "2.1.0",
    defaultChannel: "storefront_pwa",
    pages: [
      {
        slug: "bio",
        title: "BioLink Oficial",
        pageType: "showcase",
        isHome: true,
        initialBlocks: [
          { type: "biolink_profile_header", props: { avatarShape: "circle", layout: "full_cover" } },
          { type: "biolink_action_buttons", props: { layoutMode: "grid_2x2", buttonStyle: "pill" } },
          { type: "biolink_pix_card", props: { showQrCode: true } },
        ],
        seo: { title: "Links Oficiais e Redes", description: "Acesse todos os links, redes sociais e canais de contato.", allowIndexing: true },
      },
    ],
    navItems: [
      { id: "home", label: "Links", icon: "Link", targetSlug: "bio" },
    ],
    dataRequirements: { entity: "biolinks" },
  },

  news: {
    id: "news",
    name: "Notícias & Portal Editorial",
    tagline: "Portal de notícias com breaking news ticker, paywall e stream editorial",
    description: "Provisiona stream de notícias em tempo real, leitor imersivo sem distrações, editorias segmentadas e área de membros assinantes.",
    iconName: "FileText",
    category: "media",
    version: "2.0.0",
    defaultChannel: "marketplace",
    pages: [
      {
        slug: "portal",
        title: "Portal de Notícias",
        pageType: "showcase",
        isHome: true,
        initialBlocks: [
          { type: "promethee_news_header", props: { showBreakingTicker: true } },
          { type: "promethee_news_feed", props: { layoutMode: "editorial_stream" } },
          { type: "promethee_news_footer", props: { showNewsletter: true } },
        ],
        seo: { title: "Portal de Notícias | Cobertura em Tempo Real", description: "Notícias locais, apuração rigorosa e artigos editoriais.", allowIndexing: true },
      },
    ],
    navItems: [
      { id: "news", label: "Notícias", icon: "Newspaper", targetSlug: "portal" },
    ],
    dataRequirements: { entity: "articles" },
  },
};

// ── 1. LISTAR TODOS OS BLUEPRINTS DISPONÍVEIS E ESTADO DE INSTALAÇÃO ──

export const listOmniAppBlueprints = createServerFn({ method: "GET" })
  .validator((d: { storeId?: string }) => d)
  .handler(async ({ data }): Promise<{
    blueprints: OmniAppBlueprint[];
    installed: InstalledOmniAppDTO[];
  }> => {
    try {
      const identity = await getServerIdentity();
      const storeId = data?.storeId || identity?.store_id;

      const blueprints = Object.values(OMNI_APP_BLUEPRINTS);
      if (!storeId) {
        return { blueprints, installed: [] };
      }

      const db = getServerClient();
      const { data: storeDocs, error: docError } = await db
        .from("experience_documents")
        .select("id, slug, title, settings")
        .eq("store_id", storeId);

      if (docError) {
        logSystemError({ operation: "listOmniAppBlueprints:fetchDocs", error: docError });
      }

      // Identifica quais apps foram provisionados com base nos settings ou slugs
      const installed: InstalledOmniAppDTO[] = [];
      const slugsPresent = new Set((storeDocs || []).map((d) => d.slug));

      for (const bp of blueprints) {
        const isInstalled = bp.pages.some((p) => slugsPresent.has(p.slug));
        if (isInstalled) {
          installed.push({
            appId: bp.id,
            storeId,
            installedAt: new Date().toISOString(),
            isActive: true,
            provisionedPageSlugs: bp.pages.map((p) => p.slug).filter((s) => slugsPresent.has(s)),
          });
        }
      }

      return { blueprints, installed };
    } catch (err) {
      logSystemError({ operation: "listOmniAppBlueprints", error: err });
      return { blueprints: Object.values(OMNI_APP_BLUEPRINTS), installed: [] };
    }
  });

// ── 2. INSTALAR / ATIVAR UM OMNI APP ATOMICAMENTE ──

export const installOmniApp = createServerFn({ method: "POST" })
  .validator(
    z.object({
      appId: OmniAppIdSchema,
      storeId: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data }): Promise<{
    status: "ok";
    appId: OmniAppId;
    provisionedCount: number;
    pages: { id: string; slug: string; title: string }[];
  }> => {
    try {
      await requireAdmin();
      const identity = await getServerIdentity();
      const storeId = data.storeId || identity?.store_id;

      if (!storeId) {
        throw new Error("Loja ativa não identificada para instalação do Omni App.");
      }

      const blueprint = OMNI_APP_BLUEPRINTS[data.appId];
      if (!blueprint) {
        throw new Error(`Blueprint para app ${data.appId} não localizado no catálogo canônico.`);
      }

      const db = getServerClient();
      const provisionedPages: { id: string; slug: string; title: string }[] = [];

      for (const pageBlueprint of blueprint.pages) {
        // Verifica se a página já existe para evitar duplicações destrutivas
        const { data: existingDoc } = await db
          .from("experience_documents")
          .select("id, slug")
          .eq("store_id", storeId)
          .eq("slug", pageBlueprint.slug)
          .maybeSingle();

        if (existingDoc) {
          provisionedPages.push({ id: existingDoc.id, slug: existingDoc.slug, title: pageBlueprint.title });
          continue;
        }

        // Constrói snapshot canônico da página
        const initialSnapshot = {
          schema_version: "2.0.0",
          title: pageBlueprint.title,
          slug: pageBlueprint.slug,
          document_type: blueprint.defaultChannel === "storefront_pwa" ? "storefront" : "page",
          blocks: pageBlueprint.initialBlocks.map((b, idx) => ({
            id: `blk_${data.appId}_${idx + 1}`,
            type: b.type,
            title: b.type,
            is_visible: true,
            props: b.props,
            styles: {
              padding_top: 24,
              padding_bottom: 24,
              background_color: "transparent",
            },
          })),
          global_styles: {
            max_width_px: 1400,
            primary_color: "var(--primary)",
            theme_mode: "system",
          },
        };

        // Insere na tabela soberana experience_documents
        const { data: newDoc, error: insertDocErr } = await db
          .from("experience_documents")
          .insert({
            store_id: storeId,
            title: pageBlueprint.title,
            slug: pageBlueprint.slug,
            document_type: blueprint.defaultChannel === "storefront_pwa" ? "storefront" : "page",
            is_active: true,
            settings: {
              installed_app_id: data.appId,
              blueprint_version: blueprint.version,
              omni_page_draft: initialSnapshot,
              seo: pageBlueprint.seo,
            },
          })
          .select("id, slug, title")
          .single();

        if (insertDocErr || !newDoc) {
          throw insertDocErr || new Error(`Falha ao provisionar página ${pageBlueprint.slug}`);
        }

        // Cria versão inicial draft em experience_versions
        await db.from("experience_versions").insert({
          document_id: newDoc.id,
          version_number: 1,
          status: "draft",
          document_snapshot: initialSnapshot,
          created_by: identity.id,
        });

        provisionedPages.push({ id: newDoc.id, slug: newDoc.slug, title: newDoc.title });
      }

      return {
        status: "ok",
        appId: data.appId,
        provisionedCount: provisionedPages.length,
        pages: provisionedPages,
      };
    } catch (err: any) {
      logSystemError({ operation: "installOmniApp", error: err });
      throw new Error(err?.message || "Erro ao instalar Omni App.");
    }
  });
