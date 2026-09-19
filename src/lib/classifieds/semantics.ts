/**
 * Waesy Classifieds — Biblioteca Semântica & Taxonomia Modular de Nichos
 * 
 * Regras Invioláveis:
 * 1. NUNCA exibir "Retirada & Entrega Local" para imóveis, hospedagens, veículos ou serviços.
 * 2. NUNCA exibir "Novo / Na Caixa" para hospedagens, imóveis ou serviços.
 * 3. Cada nicho possui vocabulário, badges, fichas técnicas e CTAs contextuais dedicados.
 */

import {
  Home,
  Building,
  Key,
  Car,
  Tag,
  Wrench,
  Tractor,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Package,
  Truck,
  Layers,
  RefreshCw,
  CreditCard,
  QrCode,
  FileCheck,
  UserCheck,
  Lock,
  Plane,
  HeartHandshake,
  Utensils,
  Users,
  Banknote,
  Briefcase,
  Download,
  DownloadCloud,
  FileArchive,
} from "lucide-react";
import { formatMoney } from "@/lib/money";
import {
  getEducationLabel,
  getExperienceLabel,
  getRegimeLabel,
  getWorkplaceModelLabel,
} from "@/lib/classifieds/canonical-hiring";

export type ClassifiedNicheId =
  | "hospitality_stay" // Hospedagem & Temporada (Chalés, Cabanas, Pousadas, Studios)
  | "real_estate_sale" // Imóveis (Venda de Casas, Aptos, Terrenos, Comerciais)
  | "real_estate_rent" // Imóveis (Locação Mensal Residencial / Comercial)
  | "vehicle" // Veículos & Automotivo (Carros, Motos, Náutica, Utilitários)
  | "goods" // Desapegos & Produtos Físicos (Eletrônicos, Móveis, Moda)
  | "service" // Serviços & Profissionais Autônomos
  | "agri" // Agronegócio & Maquinário Pesado
  | "travel" // Viagens & Pacotes Turísticos (Resorts, Roteiros, Excursões)
  | "equipment" // Aluguel de Equipamentos (Eventos, Obras, Som, Luz)
  | "donation" // Doações & Desapego Solidário (R$ 0,00)
  | "food" // Alimentação, Marmitas, Doces Caseiros & Gastronomia Artesanal
  | "digital" // Produtos Digitais, E-books, Cursos, Modelos, Softwares
  | "subscription" // Clubes, Assinaturas, Mensalidades Recorrentes
  | "job" // Empregos, Vagas & Recrutamento
  | "pharmacy" // Farmácia, Beleza & Saúde
  | "market" // Mercado, Hortifruti & Açougue
  | "business"; // Negócios, M&A, Pontos Comerciais & Empresas à Venda (meuBIZ / Quero Um Negócio)

export interface ClassifiedNicheDefinition {
  id: ClassifiedNicheId;
  canonicalCategory: "real_estate" | "vehicle" | "sale" | "service" | "job";
  dealType: "venda" | "aluguel" | "temporada" | "servico";
  title: string;
  shortLabel: string;
  subtitle: string;
  icon: any;
  badge: string;
  priceSuffix: string;
  primaryActionLabel: string;
  secondaryActionLabel: string;
  showDeliveryBadges: boolean;
  showTechnicalSpecs: boolean;
  allowEscrowGuarantee: boolean;
}

export const NICHE_DEFINITIONS: Record<ClassifiedNicheId, ClassifiedNicheDefinition> = {
  hospitality_stay: {
    id: "hospitality_stay",
    canonicalCategory: "real_estate",
    dealType: "temporada",
    title: "Hospedagem & Temporada",
    shortLabel: "Hospedagem",
    subtitle: "Chalés, Cabanas, Casas de Campo & Studios",
    icon: Key,
    badge: "Temporada & Diárias",
    priceSuffix: "/diária",
    primaryActionLabel: "Reservar Diárias",
    secondaryActionLabel: "Consultar Datas com Anfitrião",
    showDeliveryBadges: false,
    showTechnicalSpecs: true,
    allowEscrowGuarantee: true,
  },
  real_estate_sale: {
    id: "real_estate_sale",
    canonicalCategory: "real_estate",
    dealType: "venda",
    title: "Imóvel à Venda",
    shortLabel: "Venda Imóvel",
    subtitle: "Casas, Apartamentos, Terrenos & Galpões",
    icon: Home,
    badge: "Imóvel à Venda",
    priceSuffix: "",
    primaryActionLabel: "Agendar Visita Presencial",
    secondaryActionLabel: "Fazer Proposta Formal",
    showDeliveryBadges: false,
    showTechnicalSpecs: true,
    allowEscrowGuarantee: false,
  },
  real_estate_rent: {
    id: "real_estate_rent",
    canonicalCategory: "real_estate",
    dealType: "aluguel",
    title: "Imóvel para Alugar",
    shortLabel: "Locação Mensal",
    subtitle: "Apartamentos, Casas & Salas Corporativas",
    icon: Building,
    badge: "Locação Mensal",
    priceSuffix: "/mês",
    primaryActionLabel: "Agendar Visita ao Imóvel",
    secondaryActionLabel: "Enviar Proposta de Locação",
    showDeliveryBadges: false,
    showTechnicalSpecs: true,
    allowEscrowGuarantee: false,
  },
  vehicle: {
    id: "vehicle",
    canonicalCategory: "vehicle",
    dealType: "venda",
    title: "Veículos",
    shortLabel: "Veículos",
    subtitle: "Carros, motos, caminhões e náutica",
    icon: Car,
    badge: "Veículo Verificado",
    priceSuffix: "",
    primaryActionLabel: "Agendar Test Drive & Vistoria",
    secondaryActionLabel: "Simular Financiamento",
    showDeliveryBadges: false,
    showTechnicalSpecs: true,
    allowEscrowGuarantee: true,
  },
  goods: {
    id: "goods",
    canonicalCategory: "sale",
    dealType: "venda",
    title: "Desapego",
    shortLabel: "Desapego",
    subtitle: "Eletrônicos, móveis, ferramentas e usados",
    icon: Tag,
    badge: "Desapego Regional",
    priceSuffix: "",
    primaryActionLabel: "Comprar com Segurança",
    secondaryActionLabel: "Fazer Oferta ao Vendedor",
    showDeliveryBadges: true,
    showTechnicalSpecs: false,
    allowEscrowGuarantee: true,
  },
  service: {
    id: "service",
    canonicalCategory: "service",
    dealType: "servico",
    title: "Serviços",
    shortLabel: "Serviços",
    subtitle: "Profissionais para pessoas físicas e empresas (CNPJ)",
    icon: Wrench,
    badge: "Serviço Verificado",
    priceSuffix: " a partir de",
    primaryActionLabel: "Solicitar Orçamento Gratuito",
    secondaryActionLabel: "Chamar no WhatsApp",
    showDeliveryBadges: false,
    showTechnicalSpecs: false,
    allowEscrowGuarantee: false,
  },
  agri: {
    id: "agri",
    canonicalCategory: "sale",
    dealType: "venda",
    title: "Agronegócio",
    shortLabel: "Agro",
    subtitle: "Tratores, implementos, insumos e rural",
    icon: Tractor,
    badge: "Agro Regional",
    priceSuffix: "",
    primaryActionLabel: "Agendar Vistoria no Campo",
    secondaryActionLabel: "Fazer Proposta de Safra",
    showDeliveryBadges: false,
    showTechnicalSpecs: true,
    allowEscrowGuarantee: true,
  },
  travel: {
    id: "travel",
    canonicalCategory: "sale",
    dealType: "venda",
    title: "Viagens",
    shortLabel: "Viagens",
    subtitle: "Pacotes, resorts, passeios guiados e excursões",
    icon: Plane,
    badge: "Roteiro Verificado",
    priceSuffix: " por pessoa",
    primaryActionLabel: "Reservar Vagas / Cotação",
    secondaryActionLabel: "Chamar Agência no WhatsApp",
    showDeliveryBadges: false,
    showTechnicalSpecs: true,
    allowEscrowGuarantee: true,
  },
  equipment: {
    id: "equipment",
    canonicalCategory: "sale",
    dealType: "aluguel",
    title: "Equipamentos",
    shortLabel: "Equipamentos",
    subtitle: "Locação de som, luz, máquinas e ferramentas",
    icon: Layers,
    badge: "Equipamento para Locação",
    priceSuffix: "/diária",
    primaryActionLabel: "Reservar Equipamento",
    secondaryActionLabel: "Consultar Datas com Lojista",
    showDeliveryBadges: true,
    showTechnicalSpecs: true,
    allowEscrowGuarantee: true,
  },
  donation: {
    id: "donation",
    canonicalCategory: "sale",
    dealType: "venda",
    title: "Doações",
    shortLabel: "Doações",
    subtitle: "Itens gratuitos para a comunidade local",
    icon: HeartHandshake,
    badge: "Doação Gratuita (R$ 0)",
    priceSuffix: " (Gratuito)",
    primaryActionLabel: "Solicitar Doação / Retirada",
    secondaryActionLabel: "Combinar Retirada com Doador",
    showDeliveryBadges: true,
    showTechnicalSpecs: false,
    allowEscrowGuarantee: false,
  },
  food: {
    id: "food",
    canonicalCategory: "sale",
    dealType: "venda",
    title: "Gastronomia",
    shortLabel: "Gastronomia",
    subtitle: "Pratos, doces, bebidas e marmitas",
    icon: Utensils,
    badge: "Gastronomia Artesanal",
    priceSuffix: "",
    primaryActionLabel: "Comprar / Fazer Pedido",
    secondaryActionLabel: "Tirar Dúvida do Cardápio",
    showDeliveryBadges: true,
    showTechnicalSpecs: false,
    allowEscrowGuarantee: true,
  },
  pharmacy: {
    id: "pharmacy",
    canonicalCategory: "sale",
    dealType: "venda",
    title: "Farmácia",
    shortLabel: "Farmácia",
    subtitle: "Medicamentos, suplementos e cosméticos",
    icon: Package,
    badge: "Saúde & Bem-Estar",
    priceSuffix: "",
    primaryActionLabel: "Comprar Item de Farmácia",
    secondaryActionLabel: "Dúvida com Farmacêutico/Lojista",
    showDeliveryBadges: true,
    showTechnicalSpecs: false,
    allowEscrowGuarantee: true,
  },
  market: {
    id: "market",
    canonicalCategory: "sale",
    dealType: "venda",
    title: "Mercado",
    shortLabel: "Mercado",
    subtitle: "Alimentos frescos, bebidas e essenciais",
    icon: Package,
    badge: "Itens de Mercado",
    priceSuffix: "",
    primaryActionLabel: "Adicionar à Cesta de Mercado",
    secondaryActionLabel: "Consultar Disponibilidade",
    showDeliveryBadges: true,
    showTechnicalSpecs: false,
    allowEscrowGuarantee: true,
  },

  business: {
    id: "business",
    canonicalCategory: "sale",
    dealType: "venda",
    title: "Negócios",
    shortLabel: "Negócios",
    subtitle: "Empresas em operação, pontos comerciais e busca de investidores",
    icon: Briefcase,
    badge: "Oportunidade Comercial",
    priceSuffix: " valor do negócio",
    primaryActionLabel: "Tenho Interesse no Negócio",
    secondaryActionLabel: "Falar com o Empreendedor",
    showDeliveryBadges: false,
    showTechnicalSpecs: true,
    allowEscrowGuarantee: true,
  },

  digital: {
    id: "digital",
    canonicalCategory: "sale",
    dealType: "venda",
    title: "Produto Digital & Download",
    shortLabel: "Digital / Download",
    subtitle: "E-books, Cursos, Modelos, Templates & Softwares",
    icon: DownloadCloud,
    badge: "Download Instantâneo",
    priceSuffix: "",
    primaryActionLabel: "Comprar & Baixar Arquivo",
    secondaryActionLabel: "Tirar Dúvidas com o Autor",
    showDeliveryBadges: false,
    showTechnicalSpecs: true,
    allowEscrowGuarantee: true,
  },
  subscription: {
    id: "subscription",
    canonicalCategory: "service",
    dealType: "servico",
    title: "Clube & Assinatura Recorrente",
    shortLabel: "Assinatura",
    subtitle: "Planos Mensais, Assinaturas de Serviços & Benefícios Recorrentes",
    icon: RefreshCw,
    badge: "Cobrança Recorrente",
    priceSuffix: "/mês",
    primaryActionLabel: "Assinar Plano Mensal",
    secondaryActionLabel: "Consultar Benefícios do Clube",
    showDeliveryBadges: false,
    showTechnicalSpecs: true,
    allowEscrowGuarantee: true,
  },
  job: {
    id: "job",
    canonicalCategory: "job",
    dealType: "servico",
    title: "Vaga de Emprego & Oportunidade",
    shortLabel: "Vaga / Emprego",
    subtitle: "Processo Seletivo & Recrutamento Regional",
    icon: Briefcase,
    badge: "Vaga Aberta",
    priceSuffix: "",
    primaryActionLabel: "Candidatar-se à Vaga",
    secondaryActionLabel: "Falar com Recrutador",
    showDeliveryBadges: false,
    showTechnicalSpecs: true,
    allowEscrowGuarantee: false,
  },
};

/**
 * Identifica o nicho semântico exato de um anúncio classificado a partir de suas propriedades.
 */
export function resolveClassifiedNiche(classified: any): ClassifiedNicheDefinition {
  if (!classified) return NICHE_DEFINITIONS.goods;

  const category = (classified.category || "").toLowerCase();
  const dealType = (classified.deal_type || classified.attributes?.deal_type || "").toLowerCase();
  const rawNiche = (classified.attributes?.niche || "").toLowerCase();
  const priceCents = Number(classified.price_cents || 0);

  // 1. Vaga de Emprego / Oportunidade Profissional
  if (
    category === "job" ||
    category === "vaga" ||
    category === "emprego" ||
    rawNiche === "vaga" ||
    rawNiche === "job"
  ) {
    return NICHE_DEFINITIONS.job;
  }

  // 2. Produto Digital / Download
  if (
    category === "digital" ||
    rawNiche === "digital" ||
    classified.is_digital ||
    classified.attributes?.is_digital ||
    classified.attributes?.digital_file_url
  ) {
    return NICHE_DEFINITIONS.digital;
  }

  // 3. Assinatura Recorrente / Clubes
  if (
    category === "subscription" ||
    category === "assinatura" ||
    rawNiche === "assinatura" ||
    rawNiche === "subscription"
  ) {
    return NICHE_DEFINITIONS.subscription;
  }

  // 4. Doações (categoria explícita donation/doacao, flag is_free_donation, ou preço zero exclusivo de desapego)
  if (
    category === "donation" ||
    category === "doacao" ||
    rawNiche === "doacao" ||
    rawNiche === "donation" ||
    classified.is_free_donation ||
    classified.attributes?.is_free_donation ||
    (priceCents === 0 &&
      !["service", "real_estate", "job", "business", "negocios", "negocio", "empresa", "vehicle", "veiculo", "veiculos"].includes(category) &&
      !classified.attributes?.is_business_sale &&
      !classified.attributes?.business_type)
  ) {
    return NICHE_DEFINITIONS.donation;
  }

  // 5. Alimentação & Gastronomia Artesanal
  if (
    category === "food" ||
    category === "alimentacao" ||
    category === "gastronomia" ||
    rawNiche === "alimentacao" ||
    rawNiche === "food" ||
    rawNiche === "gastronomia"
  ) {
    return NICHE_DEFINITIONS.food;
  }

  // 5.1 Farmácia, Saúde & Beleza
  if (
    category === "pharmacy" ||
    category === "farmacia" ||
    rawNiche === "pharmacy" ||
    rawNiche === "farmacia"
  ) {
    return NICHE_DEFINITIONS.pharmacy;
  }

  // 5.2 Mercado, Padaria & Essenciais
  if (
    category === "market" ||
    category === "mercado" ||
    rawNiche === "market" ||
    rawNiche === "mercado"
  ) {
    return NICHE_DEFINITIONS.market;
  }

  // 6. Turismo / Viagens / Pacotes
  if (
    category === "travel" ||
    category === "tourism" ||
    category === "viagem" ||
    rawNiche === "viagem" ||
    rawNiche === "turismo"
  ) {
    return NICHE_DEFINITIONS.travel;
  }

  // 6.5 Negócios, Empresas à Venda & M&A (meuBIZ / Quero Um Negócio)
  if (
    category === "business" ||
    category === "negocios" ||
    category === "empresa" ||
    category === "m&a" ||
    rawNiche === "business" ||
    rawNiche === "negocios" ||
    rawNiche === "empresa" ||
    rawNiche === "m&a" ||
    classified.attributes?.is_business_sale ||
    classified.attributes?.niche === "business"
  ) {
    return NICHE_DEFINITIONS.business;
  }

  // 7. Aluguel de Equipamentos & Ferramentas
  if (
    category === "equipment" ||
    category === "equipamento" ||
    rawNiche === "equipamento" ||
    (dealType === "aluguel" && category !== "real_estate")
  ) {
    return NICHE_DEFINITIONS.equipment;
  }

  // 8. Hospedagem / Temporada
  if (
    category === "hospitality" ||
    category === "hospedagem" ||
    dealType === "temporada" ||
    rawNiche === "hospedagem" ||
    rawNiche === "temporada" ||
    (category === "real_estate" && (dealType === "temporada" || classified.rental_period === "diaria" || classified.max_guests > 1))
  ) {
    return NICHE_DEFINITIONS.hospitality_stay;
  }

  // 9. Imóvel Venda
  if (category === "real_estate" && (dealType === "venda" || !dealType)) {
    return NICHE_DEFINITIONS.real_estate_sale;
  }

  // 10. Imóvel Aluguel
  if (category === "real_estate" && (dealType === "aluguel" || rawNiche === "locacao")) {
    return NICHE_DEFINITIONS.real_estate_rent;
  }

  // 11. Veículo
  if (category === "vehicle" || rawNiche === "veiculo" || rawNiche === "auto") {
    return NICHE_DEFINITIONS.vehicle;
  }

  // 12. Serviço
  if (category === "service" || rawNiche === "servico") {
    return NICHE_DEFINITIONS.service;
  }

  // 13. Agro
  if (category === "agri" || rawNiche === "agro" || rawNiche === "maquinario") {
    return NICHE_DEFINITIONS.agri;
  }

  // 14. Padrão: Desapego / Produtos Físicos
  return NICHE_DEFINITIONS.goods;
}

/**
 * Retorna os badges semânticos pertinentes ao nicho do anúncio.
 */
export function getSemanticBadges(classified: any): Array<{ label: string; icon: any; variant?: "default" | "secondary" | "outline" }> {
  const niche = resolveClassifiedNiche(classified);
  const badges: Array<{ label: string; icon: any; variant?: "default" | "secondary" | "outline" }> = [];
  const attrs = classified.attributes || {};

  // Badge primordial do nicho
  badges.push({
    label: niche.badge,
    icon: niche.icon,
    variant: "secondary",
  });

  // Nicho: Hospedagem / Temporada
  if (niche.id === "hospitality_stay") {
    const checkinType = attrs.checkin_type || "self_checkin";
    if (checkinType === "self_checkin" || checkinType === "smart_lock") {
      badges.push({ label: "Fechadura Eletrônica / Self Check-in", icon: Lock, variant: "outline" });
    } else if (checkinType === "host_greeting") {
      badges.push({ label: "Check-in com Anfitrião", icon: UserCheck, variant: "outline" });
    } else if (checkinType === "24h_desk") {
      badges.push({ label: "Recepção 24 Horas", icon: Clock, variant: "outline" });
    }

    const guests = classified.max_guests || attrs.max_guests;
    if (guests) {
      badges.push({ label: `Até ${guests} Hóspedes`, icon: CheckCircle2, variant: "outline" });
    }

    if (attrs.pet_friendly) {
      badges.push({ label: "Aceita Pets", icon: CheckCircle2, variant: "outline" });
    }
  }

  // Nicho: Imóvel (Venda ou Aluguel)
  if (niche.id === "real_estate_sale" || niche.id === "real_estate_rent") {
    if (attrs.furnished === "sim" || attrs.furnished === "completo") {
      badges.push({ label: "100% Mobiliado", icon: Layers, variant: "outline" });
    } else if (attrs.furnished === "semi") {
      badges.push({ label: "Semi-mobiliado", icon: Layers, variant: "outline" });
    }

    if (attrs.accepts_financing) {
      badges.push({ label: "Aceita Financiamento", icon: FileCheck, variant: "outline" });
    }

    if (attrs.accepts_trade || attrs.permuta) {
      badges.push({ label: "Estuda Permuta", icon: RefreshCw, variant: "outline" });
    }
  }

  // Nicho: Veículo
  if (niche.id === "vehicle") {
    if (attrs.cautelar_aprovada) {
      badges.push({ label: "Laudo Cautelar 100% Aprovado", icon: ShieldCheck, variant: "outline" });
    }
    if (attrs.unico_dono) {
      badges.push({ label: "Único Dono", icon: UserCheck, variant: "outline" });
    }
    if (attrs.ipva_pago) {
      badges.push({ label: "IPVA 2026 Pago", icon: FileCheck, variant: "outline" });
    }
    if (attrs.accepts_trade) {
      badges.push({ label: "Aceita Troca", icon: RefreshCw, variant: "outline" });
    }
  }

  // Nicho: Produto Digital
  if (niche.id === "digital") {
    if (attrs.digital_file_type) {
      badges.push({ label: `Formato ${attrs.digital_file_type.toUpperCase()}`, icon: FileArchive, variant: "outline" });
    }
    if (attrs.digital_preview_url) {
      badges.push({ label: "Demonstração Disponível", icon: FileCheck, variant: "outline" });
    }
  }

  // Nicho: Assinatura Recorrente
  if (niche.id === "subscription") {
    if (attrs.subscription_cycle) {
      badges.push({
        label: attrs.subscription_cycle === "anual" ? "Cobrança Anual" : "Cobrança Mensal",
        icon: RefreshCw,
        variant: "outline",
      });
    }
    if (attrs.trial_days) {
      badges.push({ label: `${attrs.trial_days} Dias de Teste`, icon: Clock, variant: "outline" });
    }
  }

  // Nicho: Doação Solidária
  if (niche.id === "donation") {
    badges.push({ label: "100% Gratuito (Solidário)", icon: HeartHandshake, variant: "outline" });
    if (attrs.delivery_mode) {
      badges.push({
        label: attrs.delivery_mode === "pickup" ? "Retirada em Mãos" : "A Combinar Entrega",
        icon: Truck,
        variant: "outline",
      });
    }
  }

  // Nicho: Equipamento
  if (niche.id === "equipment") {
    if (attrs.operator_included !== undefined) {
      badges.push({
        label: attrs.operator_included ? "Com Operador Incluso" : "Sem Operador Incluso",
        icon: UserCheck,
        variant: "outline",
      });
    }
    if (attrs.equipment_period) {
      badges.push({
        label: attrs.equipment_period === "mensal" ? "Locação Mensal" : attrs.equipment_period === "evento" ? "Locação por Evento" : "Locação por Diária",
        icon: Layers,
        variant: "outline",
      });
    }
  }

  // Nicho: Vaga de Emprego
  if (niche.id === "job") {
    if (attrs.regime) {
      badges.push({ label: getRegimeLabel(attrs.regime), icon: Briefcase, variant: "outline" });
    }
    if (attrs.work_model) {
      badges.push({ label: getWorkplaceModelLabel(attrs.work_model), icon: Home, variant: "outline" });
    }
  }

  // Nicho: Viagem
  if (niche.id === "travel") {
    if (attrs.duration_days) {
      badges.push({ label: `${attrs.duration_days} Dias de Roteiro`, icon: Calendar, variant: "outline" });
    }
    if (attrs.remaining_spots && Number(attrs.remaining_spots) > 0) {
      badges.push({ label: `${attrs.remaining_spots} Vagas Restantes`, icon: Users, variant: "outline" });
    }
  }

  // Nicho: Desapego / Produtos Físicos
  if (niche.id === "goods") {
    const deliveryMode = attrs.delivery_mode;
    if (deliveryMode === "both") {
      badges.push({ label: "Retirada em Mãos & Entrega Local", icon: Truck, variant: "outline" });
    } else if (deliveryMode === "pickup") {
      badges.push({ label: "Somente Retirada em Mãos", icon: Package, variant: "outline" });
    } else if (deliveryMode === "local_delivery") {
      badges.push({ label: "Entrega Expressa Regional", icon: Truck, variant: "outline" });
    } else if (deliveryMode === "shipping") {
      badges.push({ label: "Envio Correios / Transportadora", icon: Truck, variant: "outline" });
    }

    if (attrs.tested_on_site) {
      badges.push({ label: "Pode Testar na Hora", icon: CheckCircle2, variant: "outline" });
    }

    if (attrs.has_invoice) {
      badges.push({ label: "Com Nota Fiscal", icon: FileCheck, variant: "outline" });
    }
  }

  // Política de cancelamento
  if (attrs.cancellation_policy) {
    const pol = attrs.cancellation_policy;
    const polLabel =
      pol === "flexible"
        ? "Cancelamento Grátis (Flexível)"
        : pol === "moderate"
        ? "Cancelamento Moderado"
        : pol === "strict"
        ? "Cancelamento Rígido"
        : "Sem Cancelamento";
    badges.push({ label: polLabel, icon: ShieldCheck, variant: "outline" });
  }

  return badges;
}

export interface ClassifiedFeatureCard {
  title: string;
  value: string;
  icon: any;
  hint?: string;
}

/**
 * Retorna uma lista de Feature Cards estruturados (padrão 2 colunas no desktop)
 * Substitui pílulas minúsculas amontoadas por blocos com ícone, título e valor legível.
 */
export function getClassifiedFeatureCards(classified: any): ClassifiedFeatureCard[] {
  if (!classified) return [];
  const niche = resolveClassifiedNiche(classified);
  const attrs = classified.attributes || {};
  const cards: ClassifiedFeatureCard[] = [];

  // Nicho: Hospedagem & Temporada
  if (niche.id === "hospitality_stay") {
    cards.push({
      title: "Estadia",
      value: "Temporada & Diárias",
      icon: Key,
    });

    if (attrs.checkin_type) {
      cards.push({
        title: "Acesso",
        value: attrs.checkin_type === "self_checkin" || attrs.checkin_type === "smart_lock" 
          ? "Self Check-in" 
          : attrs.checkin_type === "host_greeting" 
          ? "Com Anfitrião" 
          : "Recepção 24h",
        icon: Lock,
        hint: attrs.checkin_type === "self_checkin" || attrs.checkin_type === "smart_lock" ? "Fechadura Digital" : undefined,
      });
    }

    const guests = classified.max_guests || attrs.max_guests;
    if (guests) {
      cards.push({
        title: "Capacidade",
        value: `Até ${guests} Hóspedes`,
        icon: Users,
      });
    }

    if (attrs.pet_friendly) {
      cards.push({
        title: "Animais",
        value: "Pet Friendly",
        icon: CheckCircle2,
      });
    } else if (classified.bedrooms) {
      cards.push({
        title: "Quartos",
        value: `${classified.bedrooms} Quarto${classified.bedrooms > 1 ? "s" : ""}`,
        icon: Home,
      });
    }
  }

  // Nicho: Imóvel Venda ou Locação
  else if (niche.id === "real_estate_sale" || niche.id === "real_estate_rent") {
    cards.push({
      title: "Tipo",
      value: niche.id === "real_estate_rent" ? "Locação Mensal" : "Venda Direta",
      icon: niche.id === "real_estate_rent" ? Building : Home,
    });

    if (attrs.furnished) {
      cards.push({
        title: "Mobiliário",
        value: attrs.furnished === "sim" || attrs.furnished === "completo" ? "100% Mobiliado" : "Semi-Mobiliado",
        icon: Layers,
      });
    }

    if (classified.bedrooms) {
      cards.push({
        title: "Dormitórios",
        value: `${classified.bedrooms} Quarto${classified.bedrooms > 1 ? "s" : ""}`,
        icon: Home,
      });
    }

    if (classified.area_sqm) {
      cards.push({
        title: "Área Útil",
        value: `${classified.area_sqm} m²`,
        icon: Layers,
      });
    } else if (attrs.accepts_financing) {
      cards.push({
        title: "Crédito",
        value: "Financiável",
        icon: FileCheck,
      });
    }
  }

  // Nicho: Veículo
  else if (niche.id === "vehicle") {
    cards.push({
      title: "Categoria",
      value: "Veículo",
      icon: Car,
    });

    if (attrs.year_fab || attrs.year_model) {
      cards.push({
        title: "Ano",
        value: `${attrs.year_fab || ""}/${attrs.year_model || ""}`,
        icon: Calendar,
      });
    }

    if (attrs.mileage_km) {
      cards.push({
        title: "Quilometragem",
        value: `${Number(attrs.mileage_km).toLocaleString("pt-BR")} km`,
        icon: Clock,
      });
    }

    if (attrs.cautelar_aprovada) {
      cards.push({
        title: "Laudo",
        value: "Perícia Aprovada",
        icon: ShieldCheck,
      });
    } else if (attrs.unico_dono) {
      cards.push({
        title: "Histórico",
        value: "Único Dono",
        icon: UserCheck,
      });
    }
  }

  // Nicho: Serviços
  else if (niche.id === "service") {
    if (attrs.modality) {
      cards.push({
        title: "Atendimento",
        value: attrs.modality === "domicilio" ? "A Domicílio" : attrs.modality === "remoto" ? "Online / Remoto" : "Presencial",
        icon: Wrench,
      });
    }

    if (classified.service_duration_minutes) {
      cards.push({
        title: "Duração Média",
        value: `${classified.service_duration_minutes} min`,
        icon: Clock,
      });
    }

    if (attrs.warranty_days) {
      cards.push({
        title: "Garantia",
        value: `${attrs.warranty_days} dias`,
        icon: ShieldCheck,
      });
    }
  }

  // Nicho: Doação Solidária
  else if (niche.id === "donation") {
    cards.push({
      title: "Ação Solidária",
      value: "Doação Gratuita",
      icon: HeartHandshake,
      hint: "Sem custo financeiro",
    });

    if (attrs.delivery_mode) {
      cards.push({
        title: "Retirada",
        value: attrs.delivery_mode === "pickup" ? "Retirada no Local" : "A Combinar com Doador",
        icon: Truck,
      });
    }
  }

  // Nicho: Assinatura Recorrente
  else if (niche.id === "subscription") {
    if (attrs.subscription_cycle) {
      cards.push({
        title: "Cobrança",
        value: attrs.subscription_cycle === "anual" ? "Cobrança Anual" : "Mensalidade Recorrente",
        icon: RefreshCw,
      });
    }

    if (attrs.trial_days && Number(attrs.trial_days) > 0) {
      cards.push({
        title: "Período Teste",
        value: `${attrs.trial_days} dias grátis`,
        icon: ShieldCheck,
      });
    }

    if (attrs.setup_fee_cents) {
      cards.push({
        title: "Taxa Setup",
        value: formatMoney(attrs.setup_fee_cents),
        icon: CreditCard,
      });
    } else if (attrs.no_setup_fee) {
      cards.push({
        title: "Adesão",
        value: "Sem Taxa de Matrícula",
        icon: CheckCircle2,
      });
    }

    if (attrs.cancellation_policy || attrs.no_commitment) {
      cards.push({
        title: "Fidelidade",
        value: attrs.cancellation_policy || "Sem Fidelidade",
        icon: ShieldCheck,
      });
    }
  }

  // Nicho: Produto Digital
  else if (niche.id === "digital") {
    if (attrs.digital_file_type) {
      cards.push({
        title: "Formato",
        value: attrs.digital_file_type.toUpperCase(),
        icon: FileArchive,
      });
    }

    if (attrs.digital_file_size_bytes || attrs.file_size) {
      cards.push({
        title: "Tamanho",
        value: attrs.digital_file_size_bytes
          ? `${(attrs.digital_file_size_bytes / (1024 * 1024)).toFixed(1)} MB`
          : attrs.file_size,
        icon: DownloadCloud,
      });
    }

    if (attrs.digital_download_limit) {
      cards.push({
        title: "Download",
        value: `Até ${attrs.digital_download_limit} tentativas`,
        icon: Download,
      });
    }
  }

  // Nicho: Aluguel de Equipamentos
  else if (niche.id === "equipment") {
    if (attrs.equipment_period) {
      cards.push({
        title: "Período",
        value: attrs.equipment_period === "mensal"
          ? "Locação Mensal"
          : attrs.equipment_period === "evento"
          ? "Por Evento"
          : "Diária de Locação",
        icon: Layers,
      });
    }

    if (attrs.deposit_cents) {
      cards.push({
        title: "Caução",
        value: formatMoney(attrs.deposit_cents),
        icon: ShieldCheck,
      });
    }

    if (attrs.operator_included !== undefined) {
      cards.push({
        title: "Operador",
        value: attrs.operator_included ? "Operador Técnico Incluso" : "Por Conta do Cliente",
        icon: UserCheck,
      });
    }

    if (attrs.delivery_available !== undefined) {
      cards.push({
        title: "Logística",
        value: attrs.delivery_available ? "Entrega no Local" : "Retirada no Balcão",
        icon: Truck,
      });
    }
  }

  // Nicho: Vaga de Emprego
  else if (niche.id === "job") {
    cards.push({
      title: "Regime",
      value: getRegimeLabel(attrs.regime),
      icon: Briefcase,
    });

    cards.push({
      title: "Modelo",
      value: getWorkplaceModelLabel(attrs.work_model),
      icon: Home,
    });

    cards.push({
      title: "Escolaridade",
      value: getEducationLabel(attrs.min_education),
      icon: CheckCircle2,
    });

    cards.push({
      title: "Experiência",
      value: getExperienceLabel(attrs.experience_level),
      icon: Clock,
    });
  }

  // Nicho: Viagem
  else if (niche.id === "travel") {
    cards.push({
      title: "Modalidade",
      value: "Roteiro & Pacote",
      icon: Plane,
    });

    const flightDetails = attrs.flight_details || {};
    const gateways = Array.isArray(flightDetails.boarding_gateways) ? flightDetails.boarding_gateways : [];
    const departure = gateways[0] || flightDetails.departure_airport || attrs.meeting_point;
    if (departure) {
      cards.push({
        title: "Embarque",
        value: departure,
        icon: MapPin,
      });
    }

    if (attrs.duration_days) {
      cards.push({
        title: "Duração",
        value: `${attrs.duration_days} Dias`,
        icon: Calendar,
      });
    }

    if (attrs.max_installments && Number(attrs.max_installments) > 1) {
      cards.push({
        title: "Parcelamento",
        value: `Até ${attrs.max_installments}x`,
        icon: CreditCard,
      });
    }
  }

  // Nicho: Alimentação / Gastronomia
  else if (niche.id === "food") {
    if (attrs.meal_type) {
      cards.push({
        title: "Cardápio",
        value: attrs.meal_type.replace(/_/g, " "),
        icon: Utensils,
      });
    }

    if (attrs.prep_time) {
      cards.push({
        title: "Preparo",
        value: attrs.prep_time,
        icon: Clock,
      });
    }

    if (attrs.delivery_mode) {
      cards.push({
        title: "Entrega",
        value: attrs.delivery_mode === "pickup" ? "Retirada no Local" : "Entrega Delivery",
        icon: Truck,
      });
    }
  }

  // Nicho: Desapego / Bens Físicos
  else {
    cards.push({
      title: "Condição",
      value: classified.condition === "new" ? "Novo na Caixa" : "Usado Revisado",
      icon: Package,
    });

    const deliveryMode = attrs.delivery_mode;
    if (deliveryMode) {
      cards.push({
        title: "Disponibilidade",
        value: deliveryMode === "pickup" ? "Retirada Local" : "Envio / Entrega",
        icon: Truck,
      });
    }

    if (attrs.has_invoice) {
      cards.push({
        title: "Procedência",
        value: "Com Nota Fiscal",
        icon: FileCheck,
      });
    }

    if (attrs.tested_on_site) {
      cards.push({
        title: "Vistoria",
        value: "Testa na Retirada",
        icon: CheckCircle2,
      });
    }
  }

  return cards;
}

export interface ClassifiedPaymentMethodItem {
  id: string;
  label: string;
  badge?: string;
  icon: any;
}

/**
 * Retorna os métodos de pagamento estruturados do anúncio
 */
export function getClassifiedPaymentMethods(classified: any): ClassifiedPaymentMethodItem[] {
  if (!classified) return [];
  const attrs = classified.attributes || {};
  const paymentMethods = Array.isArray(attrs.payment_methods) ? attrs.payment_methods : [];
  const items: ClassifiedPaymentMethodItem[] = [];

  if (attrs.accepts_pix === true || paymentMethods.includes("pix") || classified.accepts_pix) {
    items.push({
      id: "pix",
      label: "Pix Instantâneo",
      badge: "Aprovação Imediata",
      icon: QrCode,
    });
  }

  if (attrs.accepts_card === true || paymentMethods.includes("card") || classified.accepts_card) {
    const maxInst = Number(attrs.max_installments);
    items.push({
      id: "card",
      label: "Cartão de Crédito",
      badge: maxInst > 1 ? `Até ${maxInst}x` : "Crédito",
      icon: CreditCard,
    });
  }

  if (attrs.accepts_cash === true || paymentMethods.includes("cash") || classified.accepts_cash !== false) {
    items.push({
      id: "cash",
      label: "Dinheiro / À Vista",
      badge: "Na Entrega/Check-in",
      icon: Banknote,
    });
  }

  if (attrs.accepts_trade === true || paymentMethods.includes("trade") || classified.accepts_trade) {
    items.push({
      id: "trade",
      label: "Aceita Permuta / Troca",
      badge: "Com Avaliação",
      icon: RefreshCw,
    });
  }

  return items;
}

/**
 * Retorna o rótulo semântico de condição do anúncio (eliminando "Novo/Na Caixa" para imóveis).
 */
export function getSemanticCondition(classified: any): { label: string; value: string } | null {
  const niche = resolveClassifiedNiche(classified);
  const attrs = classified.attributes || {};

  if (niche.id === "donation") {
    return { label: "Modalidade Solidária", value: "Item 100% Gratuito para Doação" };
  }

  if (niche.id === "subscription") {
    const cycle = attrs.subscription_cycle === "anual" ? "Assinatura Anual Recorrente" : "Assinatura Mensal Recorrente";
    return { label: "Cobrança", value: cycle };
  }

  if (niche.id === "digital") {
    return { label: "Entrega Digital", value: "Download Automático Imediato após Confirmação" };
  }

  if (niche.id === "job") {
    return { label: "Status da Vaga", value: "Processo Seletivo Aberto" };
  }

  if (niche.id === "travel") {
    return { label: "Status do Pacote", value: "Roteiro Confirmado / Inscrições Abertas" };
  }

  if (niche.id === "equipment") {
    const cond = attrs.condition ? (attrs.condition === "new" ? "Novo / Lacrado" : "Revisado e Testado") : "Revisado / Perfeito Funcionamento";
    return { label: "Estado do Equipamento", value: cond };
  }

  if (niche.id === "hospitality_stay") {
    const checkin = attrs.checkin_type === "smart_lock" || attrs.checkin_type === "self_checkin"
      ? "Self Check-in (Fechadura Digital)"
      : "Check-in Presencial com Anfitrião";
    return { label: "Acesso & Entrada", value: checkin };
  }

  if (niche.id === "real_estate_sale" || niche.id === "real_estate_rent") {
    const status = attrs.construction_status || (attrs.furnished === "sim" ? "Mobiliado e Pronto" : "Pronto para Ocupar");
    return { label: "Disponibilidade", value: status };
  }

  if (niche.id === "vehicle") {
    const cond = attrs.unico_dono ? "Único Dono / Impecável" : "Seminovo Revisado";
    return { label: "Conservação", value: cond };
  }

  if (niche.id === "service") {
    const mod = attrs.modality || "Atendimento Presencial / Domicílio";
    return { label: "Modalidade", value: mod };
  }

  // Para produtos físicos/desapegos, aplica a condição do item
  const condMap: Record<string, string> = {
    new: "Novo / Lacrado na Caixa",
    used: "Usado — Excelente Estado",
    refurbished: "Revisado / Perfeito Funcionamento",
  };

  const c = classified.condition || attrs.condition || "used";
  return { label: "Condição do Item", value: condMap[c] || "Seminovo" };
}

export interface ClassifiedHeroHighlight {
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel?: string;
  secondaryValue?: string;
}

export interface ClassifiedEditorialSpec {
  label: string;
  value: string;
}

/**
 * Retorna os 2 valores de destaque primordial (Hero Highlights) do anúncio em tipografia marcante.
 * Ex: Viagens (Saída / Retorno), Hospedagem (Check-in / Check-out), Veículos (Ano / KM), etc.
 */
export function getClassifiedHeroHighlight(classified: any, selectedDeparture?: any): ClassifiedHeroHighlight | null {
  if (!classified) return null;
  const niche = resolveClassifiedNiche(classified);
  const attrs = classified.attributes || {};

  // 1. Viagens & Pacotes Turísticos
  if (niche.id === "travel" || classified.category === "travel" || classified.category === "viagem") {
    const depDate = selectedDeparture?.departure_date || attrs.departure_date;
    const retDate = selectedDeparture?.return_date || attrs.return_date;
    const datesText = attrs.dates_text;

    const fmt = (d: string) => {
      try {
        const parts = d.split("-");
        if (parts.length === 3) {
          const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
        }
        return d;
      } catch {
        return d;
      }
    };

    if (depDate || retDate) {
      return {
        primaryLabel: "Saída",
        primaryValue: depDate ? fmt(depDate) : "A Definir",
        secondaryLabel: "Retorno",
        secondaryValue: retDate ? fmt(retDate) : "A Definir",
      };
    }
    if (datesText) {
      return {
        primaryLabel: "Datas",
        primaryValue: datesText,
      };
    }
    return null;
  }

  // 2. Hospedagem & Temporada
  if (niche.id === "hospitality_stay") {
    const checkin = attrs.checkin_time || "14:00";
    const checkout = attrs.checkout_time || "11:00";
    return {
      primaryLabel: "Check-in",
      primaryValue: checkin,
      secondaryLabel: "Check-out",
      secondaryValue: checkout,
    };
  }

  // 3. Imóveis (Venda ou Locação)
  if (niche.id === "real_estate_sale" || niche.id === "real_estate_rent") {
    const area = classified.area_sqm || attrs.area_sqm;
    const beds = classified.bedrooms || attrs.bedrooms;
    if (area || beds) {
      return {
        primaryLabel: "Área Útil",
        primaryValue: area ? `${area} m²` : "Sob Consulta",
        secondaryLabel: "Dormitórios",
        secondaryValue: beds ? `${beds} Quarto${Number(beds) > 1 ? "s" : ""}` : "Sob Consulta",
      };
    }
  }

  // 4. Veículos
  if (niche.id === "vehicle") {
    const year = attrs.year_fab || attrs.year_model ? `${attrs.year_fab || ""}/${attrs.year_model || ""}` : null;
    const km = attrs.mileage_km !== undefined ? `${Number(attrs.mileage_km).toLocaleString("pt-BR")} km` : null;
    if (year || km) {
      return {
        primaryLabel: "Ano / Modelo",
        primaryValue: year || "Não Informado",
        secondaryLabel: "Quilometragem",
        secondaryValue: km || "0 km (Novo)",
      };
    }
  }

  // 5. Vagas de Emprego
  if (niche.id === "job") {
    const reg = getRegimeLabel(attrs.regime);
    const model = getWorkplaceModelLabel(attrs.work_model) || attrs.work_schedule;
    if (reg || model) {
      return {
        primaryLabel: "Regime",
        primaryValue: reg || "CLT",
        secondaryLabel: "Modelo / Horário",
        secondaryValue: model || "Integral",
      };
    }
  }

  // 6. Serviços
  if (niche.id === "service") {
    const duration = classified.service_duration_minutes ? `${classified.service_duration_minutes} min` : (attrs.estimated_days ? `${attrs.estimated_days} dias` : null);
    const warranty = attrs.warranty_days ? `${attrs.warranty_days} dias` : null;
    if (duration || warranty) {
      return {
        primaryLabel: "Prazo Médio",
        primaryValue: duration || "A Combinar",
        secondaryLabel: "Garantia",
        secondaryValue: warranty || "Garantia Waesy",
      };
    }
  }

  // 7. Equipamentos
  if (niche.id === "equipment") {
    const period = attrs.equipment_period === "mensal" ? "Locação Mensal" : attrs.equipment_period === "evento" ? "Por Evento" : "Diária (24h)";
    const deposit = attrs.deposit_cents ? formatMoney(attrs.deposit_cents) : "Sem Caução";
    return {
      primaryLabel: "Período Base",
      primaryValue: period,
      secondaryLabel: "Caução / Garantia",
      secondaryValue: deposit,
    };
  }

  // 8. Produtos Digitais
  if (niche.id === "digital") {
    const fmt = attrs.digital_file_type ? attrs.digital_file_type.toUpperCase() : "DOWNLOAD";
    return {
      primaryLabel: "Formato",
      primaryValue: fmt,
      secondaryLabel: "Acesso",
      secondaryValue: "Download Imediato",
    };
  }

  // 9. Assinaturas Recorrentes
  if (niche.id === "subscription") {
    const cycle = attrs.subscription_cycle === "anual" ? "Plano Anual" : "Mensalidade";
    const policy = attrs.cancellation_policy || (attrs.no_commitment ? "Sem Fidelidade" : "Recorrente");
    return {
      primaryLabel: "Ciclo de Cobrança",
      primaryValue: cycle,
      secondaryLabel: "Fidelidade",
      secondaryValue: policy,
    };
  }

  // 10. Doações Solidárias
  if (niche.id === "donation") {
    return {
      primaryLabel: "Ação Solidária",
      primaryValue: "100% Gratuito",
      secondaryLabel: "Retirada",
      secondaryValue: attrs.delivery_mode === "pickup" ? "No Local" : "A Combinar",
    };
  }

  // 11. Negócios & M&A
  if (niche.id === "business") {
    const revenue = attrs.monthly_revenue_cents ? formatMoney(attrs.monthly_revenue_cents) : null;
    const type = attrs.business_type || "Ponto Ativo";
    if (revenue) {
      return {
        primaryLabel: "Faturamento Mensal",
        primaryValue: revenue,
        secondaryLabel: "Modalidade",
        secondaryValue: type,
      };
    }
  }

  // 12. Gastronomia
  if (niche.id === "food") {
    const prep = attrs.preparation_time_minutes ? `${attrs.preparation_time_minutes} min` : "Artesanal";
    return {
      primaryLabel: "Tempo de Preparo",
      primaryValue: prep,
      secondaryLabel: "Entrega / Retirada",
      secondaryValue: attrs.delivery_type || "Pronta Entrega",
    };
  }

  return null;
}

/**
 * Retorna as especificações essenciais no formato minimalista (sem pills/badges).
 * Ex: Duração, Regime, Vagas para viagens; Banheiros, Condomínio, IPTU para imóveis, etc.
 */
export function getClassifiedEditorialSpecs(classified: any): ClassifiedEditorialSpec[] {
  if (!classified) return [];
  const niche = resolveClassifiedNiche(classified);
  const attrs = classified.attributes || {};
  const specs: ClassifiedEditorialSpec[] = [];

  // 1. Viagens
  if (niche.id === "travel" || classified.category === "travel" || classified.category === "viagem") {
    if (attrs.duration_days) {
      const nights = attrs.duration_nights ? ` / ${attrs.duration_nights}N` : "";
      specs.push({ label: "Duração", value: `${attrs.duration_days} Dias${nights}` });
    } else if (attrs.duration_text) {
      specs.push({ label: "Duração", value: attrs.duration_text });
    }

    if (attrs.meal_regime_label || attrs.meal_regime) {
      specs.push({ label: "Regime", value: attrs.meal_regime_label || attrs.meal_regime });
    } else if (attrs.meals_included) {
      specs.push({ label: "Regime", value: "Refeições Inclusas" });
    }

    if (attrs.available_slots) {
      specs.push({ label: "Vagas", value: `${attrs.available_slots} disponível(is)` });
    } else if (attrs.slots_text) {
      specs.push({ label: "Vagas", value: attrs.slots_text });
    }
    return specs;
  }

  // 2. Hospedagem
  if (niche.id === "hospitality_stay") {
    const guests = classified.max_guests || attrs.max_guests;
    if (guests) specs.push({ label: "Capacidade", value: `Até ${guests} Hóspedes` });
    if (classified.bedrooms) specs.push({ label: "Quartos", value: `${classified.bedrooms} Quarto(s)` });
    if (attrs.bathrooms) specs.push({ label: "Banheiros", value: `${attrs.bathrooms} Banheiro(s)` });
    if (attrs.pet_friendly) specs.push({ label: "Animais", value: "Aceita Pets" });
    return specs;
  }

  // 3. Imóveis
  if (niche.id === "real_estate_sale" || niche.id === "real_estate_rent") {
    if (attrs.bathrooms) specs.push({ label: "Banheiros", value: `${attrs.bathrooms} Banheiro(s)` });
    if (attrs.parking_spaces) specs.push({ label: "Garagem", value: `${attrs.parking_spaces} Vaga(s)` });
    if (attrs.condo_fee_cents) specs.push({ label: "Condomínio", value: `${formatMoney(attrs.condo_fee_cents)}/mês` });
    if (attrs.iptu_cents) specs.push({ label: "IPTU", value: `${formatMoney(attrs.iptu_cents)}/ano` });
    if (attrs.furnished) specs.push({ label: "Mobiliário", value: attrs.furnished === "sim" ? "100% Mobiliado" : "Semi-Mobiliado" });
    return specs;
  }

  // 4. Veículos
  if (niche.id === "vehicle") {
    if (attrs.transmission) specs.push({ label: "Câmbio", value: attrs.transmission });
    if (attrs.fuel) specs.push({ label: "Combustível", value: attrs.fuel });
    if (attrs.color) specs.push({ label: "Cor", value: attrs.color });
    if (attrs.plate_final) specs.push({ label: "Placa", value: `Final ${attrs.plate_final}` });
    if (attrs.ipva_pago) specs.push({ label: "IPVA", value: "2026 Pago" });
    return specs;
  }

  // 5. Vagas
  if (niche.id === "job") {
    if (attrs.salary_range) specs.push({ label: "Faixa Salarial", value: attrs.salary_range });
    if (attrs.min_education) specs.push({ label: "Escolaridade", value: getEducationLabel(attrs.min_education) });
    if (attrs.experience_level) specs.push({ label: "Experiência", value: getExperienceLabel(attrs.experience_level) });
    return specs;
  }

  // 6. Serviços
  if (niche.id === "service") {
    if (attrs.modality) specs.push({ label: "Atendimento", value: attrs.modality === "domicilio" ? "A Domicílio" : (attrs.modality === "remoto" ? "Online / Remoto" : "Presencial") });
    if (attrs.free_quote) specs.push({ label: "Orçamento", value: "Gratuito" });
    if (attrs.business_hours) specs.push({ label: "Horário", value: attrs.business_hours });
    return specs;
  }

  // 7. Equipamentos
  if (niche.id === "equipment") {
    if (attrs.operator_included !== undefined) specs.push({ label: "Operador", value: attrs.operator_included ? "Incluso" : "Por Conta do Cliente" });
    if (attrs.delivery_available !== undefined) specs.push({ label: "Logística", value: attrs.delivery_available ? "Entrega no Local" : "Retirada no Balcão" });
    return specs;
  }

  // 8. Assinaturas
  if (niche.id === "subscription") {
    if (attrs.trial_days && Number(attrs.trial_days) > 0) specs.push({ label: "Período Teste", value: `${attrs.trial_days} dias grátis` });
    if (attrs.no_setup_fee) specs.push({ label: "Adesão", value: "Sem Taxa de Matrícula" });
    return specs;
  }

  // 9. Digital
  if (niche.id === "digital") {
    if (attrs.file_size || attrs.digital_file_size_bytes) {
      const sz = attrs.digital_file_size_bytes ? `${(attrs.digital_file_size_bytes / (1024 * 1024)).toFixed(1)} MB` : attrs.file_size;
      specs.push({ label: "Tamanho", value: sz });
    }
    if (attrs.digital_download_limit) specs.push({ label: "Tentativas", value: `Até ${attrs.digital_download_limit} downloads` });
    return specs;
  }

  return specs;
}

/**
 * Retorna o rótulo semântico exato e específico para a Ação Primária (CTA) de conversão.
 * No nicho de Turismo, inclui o modal específico: Terrestre, Aéreo, Cruzeiro, Multimodal, etc.
 */
export function getClassifiedPrimaryCtaLabel(classified: any): string {
  if (!classified) return "Comprar Agora";
  const niche = resolveClassifiedNiche(classified);
  const attrs = classified.attributes || {};
  const flightDetails = attrs.flight_details || {};
  const transportType = (flightDetails.transport_type || attrs.transport_type || "").toLowerCase();

  if (niche.id === "travel" || classified.category === "travel" || classified.category === "viagem") {
    if (transportType === "bus" || transportType === "terrestre") return "Reservar Pacote Terrestre";
    if (transportType === "airplane" || transportType === "aereo") return "Reservar Pacote Aéreo";
    if (transportType === "cruise" || transportType === "cruzeiro") return "Reservar Cruzeiro";
    if (transportType === "combo" || transportType === "misto") return "Reservar Pacote Multimodal";
    if (transportType === "train") return "Reservar Roteiro Ferroviário";
    if (transportType === "hotel_only") return "Reservar Pacote de Hospedagem";
    return "Reservar Pacote";
  }

  if (niche.id === "hospitality_stay") return "Reservar Estadia";
  if (niche.id === "real_estate_sale") return "Agendar Visita ao Imóvel";
  if (niche.id === "real_estate_rent") return "Agendar Visita / Alugar";
  if (niche.id === "vehicle") return "Agendar Test-Drive";
  if (niche.id === "job") return "Candidatar-se à Vaga";
  if (niche.id === "service") return "Solicitar Orçamento";
  if (niche.id === "equipment") return "Solicitar Locação";
  if (niche.id === "digital") return "Comprar & Baixar";
  if (niche.id === "subscription") return "Assinar Plano";
  if (niche.id === "donation" || attrs.is_donation) return "Solicitar Doação";
  if (niche.id === "business") return "Solicitar Dossiê Executivo";
  if (niche.id === "food") return "Fazer Pedido";

  return Number(classified.price_cents || 0) > 0 ? "Comprar Agora" : "Fazer Proposta";
}
