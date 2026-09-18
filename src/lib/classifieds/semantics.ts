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
  Sparkles,
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
  | "market"; // Mercado, Hortifruti & Açougue

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
    title: "Veículo & Automotivo",
    shortLabel: "Veículo",
    subtitle: "Carros, Motos, Caminhões & Náutica",
    icon: Car,
    badge: "Ficha Técnica Verificada",
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
    title: "Desapego & Produto Físico",
    shortLabel: "Desapego Direto",
    subtitle: "Eletrônicos, Móveis, Equipamentos & Moda",
    icon: Tag,
    badge: "Desapego da Região",
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
    title: "Serviço Profissional",
    shortLabel: "Serviço",
    subtitle: "Especialistas, Obras, Técnicos & Autônomos",
    icon: Wrench,
    badge: "Profissional Verificado",
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
    title: "Agronegócio & Maquinário",
    shortLabel: "Agro & Máquinas",
    subtitle: "Tratores, Implementos, Insumos & Rural",
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
    title: "Pacote de Viagem & Turismo",
    shortLabel: "Viagem & Tour",
    subtitle: "Resorts, Roteiros Guiados, Excursões & Cruzeiros",
    icon: Plane,
    badge: "Roteiro & Viagem Verificada",
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
    title: "Aluguel de Equipamento",
    shortLabel: "Locação Equipamento",
    subtitle: "Eventos, Iluminação, Obras, Som & Festas",
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
    title: "Doação & Solidariedade",
    shortLabel: "Doação Gratuita",
    subtitle: "Desapego Solidário sem Custo Financeiro",
    icon: HeartHandshake,
    badge: "Item para Doação (R$ 0,00)",
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
    title: "Alimentação & Gastronomia Artesanal",
    shortLabel: "Gastronomia",
    subtitle: "Pratos, Doces, Bebidas & Kits",
    icon: Utensils,
    badge: "Pronto para Consumo",
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
    title: "Farmácia, Saúde & Beleza",
    shortLabel: "Farmácia",
    subtitle: "Medicamentos, Suplementos & Cosméticos",
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
    title: "Mercado, Padaria & Essenciais",
    shortLabel: "Mercado",
    subtitle: "Alimentos Frescos, Bebidas & Limpeza",
    icon: Package,
    badge: "Itens de Conveniência",
    priceSuffix: "",
    primaryActionLabel: "Adicionar à Cesta de Mercado",
    secondaryActionLabel: "Consultar Disponibilidade",
    showDeliveryBadges: true,
    showTechnicalSpecs: false,
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
    icon: Sparkles,
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

  // 4. Doação Solidária (preço 0, is_free_donation flag ou categoria donation/doacao, exceto se for serviço/vaga/imóvel)
  if (
    category === "donation" ||
    category === "doacao" ||
    rawNiche === "doacao" ||
    rawNiche === "donation" ||
    classified.is_free_donation ||
    classified.attributes?.is_free_donation ||
    (priceCents === 0 && !["service", "real_estate", "job"].includes(category))
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
    badges.push({ label: "Download Instantâneo", icon: DownloadCloud, variant: "outline" });
    if (attrs.digital_preview_url) {
      badges.push({ label: "Demonstração Disponível", icon: Sparkles, variant: "outline" });
    }
  }

  // Nicho: Assinatura Recorrente
  if (niche.id === "subscription") {
    badges.push({
      label: attrs.subscription_cycle === "anual" ? "Cobrança Anual" : "Cobrança Mensal",
      icon: RefreshCw,
      variant: "outline",
    });
    if (attrs.trial_days) {
      badges.push({ label: `${attrs.trial_days} Dias Grátis`, icon: Sparkles, variant: "outline" });
    }
    badges.push({ label: "Cancele quando quiser", icon: ShieldCheck, variant: "outline" });
  }

  // Nicho: Doação Solidária
  if (niche.id === "donation") {
    badges.push({ label: "100% Gratuito (Solidário)", icon: HeartHandshake, variant: "outline" });
    badges.push({
      label: attrs.delivery_mode === "pickup" ? "Retirada em Mãos" : "Combinar Entrega",
      icon: Truck,
      variant: "outline",
    });
  }

  // Nicho: Equipamento
  if (niche.id === "equipment") {
    badges.push({
      label: attrs.operator_included ? "Com Operador Incluso" : "Sem Operador Incluso",
      icon: UserCheck,
      variant: "outline",
    });
    badges.push({
      label: attrs.equipment_period === "mensal" ? "Locação Mensal" : attrs.equipment_period === "evento" ? "Locação por Evento" : "Locação por Diária",
      icon: Layers,
      variant: "outline",
    });
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
    badges.push({ label: "Vagas Limitadas", icon: Users, variant: "outline" });
  }

  // Nicho: Desapego / Produtos Físicos
  if (niche.id === "goods") {
    const deliveryMode = attrs.delivery_mode;
    if (deliveryMode === "both" || !deliveryMode) {
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

    const checkinType = attrs.checkin_type || "self_checkin";
    cards.push({
      title: "Acesso",
      value: checkinType === "self_checkin" || checkinType === "smart_lock" 
        ? "Self Check-in" 
        : checkinType === "host_greeting" 
        ? "Com Anfitrião" 
        : "Recepção 24h",
      icon: Lock,
      hint: checkinType === "self_checkin" || checkinType === "smart_lock" ? "Fechadura Digital" : undefined,
    });

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
      value: "Veículo Verificado",
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
    cards.push({
      title: "Atendimento",
      value: attrs.modality === "domicilio" ? "A Domicílio" : attrs.modality === "remoto" ? "Online / Remoto" : "Presencial",
      icon: Wrench,
    });

    cards.push({
      title: "Agendamento",
      value: "Disponível Online",
      icon: Calendar,
    });

    if (classified.service_duration_minutes) {
      cards.push({
        title: "Duração Média",
        value: `${classified.service_duration_minutes} min`,
        icon: Clock,
      });
    }

    cards.push({
      title: "Atendimento",
      value: "Direto com Prestador",
      icon: ShieldCheck,
    });
  }

  // Nicho: Doação Solidária
  else if (niche.id === "donation") {
    cards.push({
      title: "Ação Solidária",
      value: "Doação Gratuita",
      icon: HeartHandshake,
      hint: "Sem custo financeiro",
    });

    cards.push({
      title: "Custo",
      value: "R$ 0,00 Gratuito",
      icon: Banknote,
    });

    cards.push({
      title: "Retirada",
      value: attrs.delivery_mode === "pickup" ? "Retirada no Local" : "A Combinar com Doador",
      icon: Truck,
    });

    cards.push({
      title: "Comunidade",
      value: "Desapego Regional",
      icon: Users,
    });
  }

  // Nicho: Assinatura Recorrente
  else if (niche.id === "subscription") {
    cards.push({
      title: "Cobrança",
      value: attrs.subscription_cycle === "anual" ? "Cobrança Anual" : "Mensalidade Recorrente",
      icon: RefreshCw,
    });

    cards.push({
      title: "Período Teste",
      value: attrs.trial_days ? `${attrs.trial_days} dias grátis` : "Acesso Imediato",
      icon: Sparkles,
    });

    if (attrs.setup_fee_cents) {
      cards.push({
        title: "Taxa Setup",
        value: formatMoney(attrs.setup_fee_cents),
        icon: CreditCard,
      });
    } else {
      cards.push({
        title: "Adesão",
        value: "Sem Taxa de Matrícula",
        icon: CheckCircle2,
      });
    }

    cards.push({
      title: "Fidelidade",
      value: "Cancele quando quiser",
      icon: ShieldCheck,
    });
  }

  // Nicho: Produto Digital
  else if (niche.id === "digital") {
    cards.push({
      title: "Formato",
      value: attrs.digital_file_type ? attrs.digital_file_type.toUpperCase() : "Arquivo Digital",
      icon: FileArchive,
    });

    cards.push({
      title: "Tamanho",
      value: attrs.digital_file_size_bytes
        ? `${(attrs.digital_file_size_bytes / (1024 * 1024)).toFixed(1)} MB`
        : attrs.file_size || "Acesso Direto",
      icon: DownloadCloud,
    });

    cards.push({
      title: "Download",
      value: attrs.digital_download_limit ? `Até ${attrs.digital_download_limit} tentativas` : "Ilimitado",
      icon: Download,
    });

    cards.push({
      title: "Acesso",
      value: "Vitalício & Imediato",
      icon: ShieldCheck,
    });
  }

  // Nicho: Aluguel de Equipamentos
  else if (niche.id === "equipment") {
    cards.push({
      title: "Período",
      value: attrs.equipment_period === "mensal"
        ? "Locação Mensal"
        : attrs.equipment_period === "evento"
        ? "Por Evento"
        : "Diária de Locação",
      icon: Layers,
    });

    cards.push({
      title: "Caução",
      value: attrs.deposit_cents ? formatMoney(attrs.deposit_cents) : "Sem Caução Prévia",
      icon: ShieldCheck,
    });

    cards.push({
      title: "Operador",
      value: attrs.operator_included ? "Operador Técnico Incluso" : "Por Conta do Cliente",
      icon: UserCheck,
    });

    cards.push({
      title: "Logística",
      value: attrs.delivery_available ? "Entrega no Local" : "Retirada no Balcão",
      icon: Truck,
    });
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
    cards.push({
      title: "Embarque",
      value: gateways[0] || flightDetails.departure_airport || attrs.meeting_point || "Saída Regional",
      icon: MapPin,
    });

    cards.push({
      title: "Duração",
      value: attrs.duration_days ? `${attrs.duration_days} Dias` : "Roteiro Completo",
      icon: Calendar,
    });

    const maxInst = Math.max(1, Number(attrs.max_installments) || 12);
    cards.push({
      title: "Parcelamento",
      value: maxInst > 1 ? `Até ${maxInst}x` : "À Vista",
      icon: CreditCard,
    });
  }

  // Nicho: Alimentação / Gastronomia
  else if (niche.id === "food") {
    cards.push({
      title: "Cardápio",
      value: attrs.meal_type?.replace(/_/g, " ") || "Refeição Artesanal",
      icon: Utensils,
    });

    cards.push({
      title: "Preparo",
      value: attrs.prep_time || "Pronta Entrega",
      icon: Clock,
    });

    cards.push({
      title: "Entrega",
      value: "MotoLink & Retirada",
      icon: Truck,
    });

    cards.push({
      title: "Padrão",
      value: "Artesanal da Região",
      icon: CheckCircle2,
    });
  }

  // Nicho: Desapego / Bens Físicos
  else {
    cards.push({
      title: "Condição",
      value: classified.condition === "new" ? "Novo na Caixa" : "Usado Revisado",
      icon: Package,
    });

    const deliveryMode = attrs.delivery_mode;
    cards.push({
      title: "Disponibilidade",
      value: deliveryMode === "pickup" ? "Retirada Local" : deliveryMode === "shipping" ? "Envio / Correios" : "Pronta Entrega",
      icon: Truck,
    });

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

  // Garantir pelo menos 2 cards para manter a harmonia do grid
  if (cards.length === 1) {
    cards.push({
      title: "Contato",
      value: "Direto com Anunciante",
      icon: ShieldCheck,
    });
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
    const maxInst = attrs.max_installments || 12;
    items.push({
      id: "card",
      label: "Cartão de Crédito",
      badge: maxInst > 1 ? `Até ${maxInst}x` : "À vista",
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
