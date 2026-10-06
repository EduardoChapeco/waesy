/**
 * registry.ts — Catálogo Central de Blocos do Omni-Builder (Wix-Style Architecture)
 */

import { HeroMinimalSplit } from "./blocks/HeroMinimalSplit";
import { HeroInteractiveCarousel } from "./blocks/HeroInteractiveCarousel";
import { BentoAsymmetricGrid } from "./blocks/BentoAsymmetricGrid";
import { PricingTablesClean } from "./blocks/PricingTablesClean";
import { MediaGalleryMosaic } from "./blocks/MediaGalleryMosaic";
import { TestimonialsSocialProof } from "./blocks/TestimonialsSocialProof";
import { ContactFormDirect } from "./blocks/ContactFormDirect";
import { FaqCleanAccordion } from "./blocks/FaqCleanAccordion";

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
  // 1. HERO SECTION
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

  // 1B. CAROUSEL HERO (MASTER PROMPT V132 - TRANSPLANTE DE MACHINE & CLOUDBLOCK)
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

  // 2. BENTO GRID
  {
    id: "bento_asymmetric_4",
    name: "Destaques",
    category: "bento",
    description: "Grade modular com diferenciais de alto impacto.",
    component: BentoAsymmetricGrid as any,
    defaultProps: {
      sectionTitle: "Engenharia de precisão para operações de alto volume",
      sectionSubtitle: "Projetado do banco de dados à interface para garantir zero lentidão e disponibilidade absoluta.",
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
          description: "Isolamento multi-tenant deny-by-default e assinaturas digitais auditáveis.",
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

  // 3. MEDIA GALLERY
  {
    id: "media_gallery_mosaic",
    name: "Galeria",
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

  // 4. PRICING TABLES
  {
    id: "pricing_three_tiers",
    name: "Planos",
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

  // 5. TESTIMONIALS / SOCIAL PROOF
  {
    id: "testimonials_social_proof",
    name: "Depoimentos",
    category: "social_proof",
    description: "Avaliações com fotos, notas e comentários de clientes.",
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

  // 6. CONTACT FORM
  {
    id: "contact_form_direct",
    name: "Contato",
    category: "contact",
    description: "Formulário direto para captação de mensagens e WhatsApp.",
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

  // 7. FAQ ACCORDION
  {
    id: "faq_clean_accordion",
    name: "Dúvidas",
    category: "faq",
    description: "Perguntas frequentes em formato sanfona interativo.",
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
          answer: "Com certeza. Nossos contratos são emitidos em conformidade com o Código Civil brasileiro e assinados com certificado digital que gera manifesto auditável e hash criptográfico SHA-256.",
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

import { LayoutGrid, LayoutTemplate, Layers, Tag, MessageSquare } from "lucide-react";

export type WixBlockCategory = "all" | "basic" | "layout" | "sections" | "interactive";

export const WIX_CATEGORY_CONFIG: { id: WixBlockCategory; label: string; icon: any }[] = [
  { id: "all", label: "Todos", icon: LayoutGrid },
  { id: "basic", label: "Básico", icon: LayoutTemplate },
  { id: "layout", label: "Layout", icon: Layers },
  { id: "sections", label: "Seções", icon: Tag },
  { id: "interactive", label: "Interativo", icon: MessageSquare },
];

export const BLOCK_TO_WIX_CATEGORY: Record<string, "basic" | "layout" | "sections" | "interactive"> = {
  hero_minimal_split: "basic",
  bento_asymmetric_4: "layout",
  pricing_three_tiers: "sections",
  testimonials_social_proof: "sections",
  faq_clean_accordion: "sections",
  hero_interactive_carousel: "interactive",
  media_gallery_mosaic: "interactive",
  contact_form_direct: "interactive",
};
