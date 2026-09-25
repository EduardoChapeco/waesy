/**
 * registry.ts — Catálogo Central de Blocos do Site Builder
 */

import { HeroMinimalSplit } from "./blocks/HeroMinimalSplit";
import { BentoAsymmetricGrid } from "./blocks/BentoAsymmetricGrid";
import { PricingTablesClean } from "./blocks/PricingTablesClean";
import type { SiteBuilderBlockDefinition, HeroBlockData, BentoBlockData, PricingBlockData } from "./types";

export const SITE_BUILDER_BLOCKS: SiteBuilderBlockDefinition[] = [
  {
    id: "hero_minimal_split",
    name: "Hero 01: Split 60/40 Clean",
    category: "hero",
    description: "Cabeçalho com título monumental, subtítulo com leitura fluida, CTAs primário/secundário e moldura de mídia com indicador",
    component: HeroMinimalSplit,
    defaultProps: {
      badgeText: "ECOSSISTEMA 2027 • DISPONÍVEL AGORA",
      title: "Construa e escale sua presença digital com tecnologia nativa.",
      subtitle: "Unifique seu catálogo físico, vitrine online, PDV e automações de atendimento em uma única plataforma silenciosa e sem fricção.",
      primaryCta: {
        label: "Começar Agora",
        href: "/workspace/onboarding",
      },
      secondaryCta: {
        label: "Ver Demonstração",
        href: "#demonstracao",
      },
      floatingStat: {
        label: "OPERAÇÃO AO VIVO",
        value: "99.98% SLA",
        statusDot: true,
      },
    } as HeroBlockData,
  },
  {
    id: "bento_asymmetric_4",
    name: "Bento 01: Grade Assimétrica de 4 Células",
    category: "bento",
    description: "Layout modular moderno no estilo Apple, destacando velocidade, canais omnichannel e isolamento multi-tenant",
    component: BentoAsymmetricGrid,
    defaultProps: {
      sectionTitle: "Engenharia de precisão para operações de alto volume",
      sectionSubtitle: "Projetado do banco de dados à interface para garantir zero lentidão e disponibilidade absoluta.",
      cells: [],
    } as BentoBlockData,
  },
  {
    id: "pricing_three_tiers",
    name: "Preços 01: Matriz de 3 Planos Minimalista",
    category: "pricing",
    description: "Tabela de precificação com alternância mensal/anual, destaque para plano popular e lista de recursos com checkmarks",
    component: PricingTablesClean,
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
];

export function getSiteBlocksByCategory(category: string): SiteBuilderBlockDefinition[] {
  return SITE_BUILDER_BLOCKS.filter((b) => b.category === category);
}

export function getSiteBlockById(id: string): SiteBuilderBlockDefinition {
  const found = SITE_BUILDER_BLOCKS.find((b) => b.id === id);
  return found || SITE_BUILDER_BLOCKS[0];
}
