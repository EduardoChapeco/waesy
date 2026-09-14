/**
 * Waesy Classifieds — Biblioteca Semântica & Taxonomia Modular de Nichos
 * 
 * Regras Invioláveis:
 * 1. NUNCA exibir "Retirada & Entrega Local" para imóveis, hospedagens, veículos ou serviços.
 * 2. NUNCA exibir "Novo / Na Caixa" para hospedagens, imóveis ou serviços.
 * 3. Cada nicho possui vocabulário, badges, fichas técnicas e CTAs contextuais dedicados.
 */

import { Home, Building, Key, Car, Tag, Wrench, Tractor, Calendar, Clock, MapPin, CheckCircle2, ShieldCheck, Package, Truck, Layers, RefreshCw, CreditCard, QrCode, FileCheck, MessageCircle, Phone, Flame, UserCheck, Lock, Plane, HeartHandshake, Utensils } from 'lucide-react';

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
 | "food"; // Alimentação, Marmitas, Doces Caseiros & Gastronomia Artesanal

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
 primaryActionLabel: "Comprar com Garantia Waesy",
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
 subtitle: "Marmitas Fitness, Doces Caseiros, Bolos, Salgados & Pratos do Dia",
 icon: Utensils,
 badge: "Gastronomia & Pronta Entrega",
 priceSuffix: "",
 primaryActionLabel: "Pedir no WhatsApp",
 secondaryActionLabel: "Consultar Ingredientes & Entrega",
 showDeliveryBadges: true,
 showTechnicalSpecs: true,
 allowEscrowGuarantee: true,
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

  // 1. Doação Solidária (preço 0 ou categoria donation/doacao)
  if (category === "donation" || category === "doacao" || rawNiche === "doacao" || rawNiche === "donation" || priceCents === 0) {
    return NICHE_DEFINITIONS.donation;
  }

  // 1.5. Alimentação & Gastronomia Artesanal
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

  // 2. Turismo / Viagens / Pacotes
  if (
    category === "travel" ||
    category === "tourism" ||
    category === "viagem" ||
    rawNiche === "viagem" ||
    rawNiche === "turismo"
  ) {
    return NICHE_DEFINITIONS.travel;
  }

  // 3. Aluguel de Equipamentos & Ferramentas
  if (
    category === "equipment" ||
    category === "equipamento" ||
    rawNiche === "equipamento" ||
    (dealType === "aluguel" && category !== "real_estate")
  ) {
    return NICHE_DEFINITIONS.equipment;
  }

  // 4. Hospedagem / Temporada
  if (
    dealType === "temporada" ||
    rawNiche === "hospedagem" ||
    rawNiche === "temporada" ||
    (category === "real_estate" && (dealType === "temporada" || classified.rental_period === "diaria" || classified.max_guests > 1))
  ) {
    return NICHE_DEFINITIONS.hospitality_stay;
  }

  // 5. Imóvel Venda
  if (category === "real_estate" && (dealType === "venda" || !dealType)) {
    return NICHE_DEFINITIONS.real_estate_sale;
  }

  // 6. Imóvel Aluguel
  if (category === "real_estate" && (dealType === "aluguel" || rawNiche === "locacao")) {
    return NICHE_DEFINITIONS.real_estate_rent;
  }

  // 7. Veículo
  if (category === "vehicle" || rawNiche === "veiculo" || rawNiche === "auto") {
    return NICHE_DEFINITIONS.vehicle;
  }

  // 8. Serviço
  if (category === "service" || rawNiche === "servico") {
    return NICHE_DEFINITIONS.service;
  }

  // 9. Agro
  if (category === "agri" || rawNiche === "agro" || rawNiche === "maquinario") {
    return NICHE_DEFINITIONS.agri;
  }

  // 10. Padrão: Desapego / Produtos Físicos
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

 // Nicho: Desapego / Produtos Físicos (ÚNICO nicho onde logística de frete se aplica!)
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

  // Formas reais de pagamento configuradas pelo anunciante
  const paymentMethods = Array.isArray(attrs.payment_methods) ? attrs.payment_methods : [];
  if (attrs.accepts_pix === true || paymentMethods.includes("pix")) {
    badges.push({ label: "Aceita PIX", icon: QrCode, variant: "secondary" });
  }
  if (attrs.accepts_card === true || paymentMethods.includes("card")) {
    const maxInst = attrs.max_installments || 12;
    badges.push({ label: `Cartão até ${maxInst}x`, icon: CreditCard, variant: "outline" });
  }
  if (attrs.accepts_cash === true || paymentMethods.includes("cash")) {
    badges.push({ label: "Dinheiro / À Vista", icon: CreditCard, variant: "outline" });
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

/**
 * Retorna o rótulo semântico de condição do anúncio (eliminando "Novo/Na Caixa" para imóveis).
 */
export function getSemanticCondition(classified: any): { label: string; value: string } | null {
 const niche = resolveClassifiedNiche(classified);
 const attrs = classified.attributes || {};

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
