/**
 * cta-engine.ts — Motor Dinâmico de Call-to-Actions (CTAs) para o Social Engine
 * Dicionário inteligente de chamadas para ação segmentadas por nicho e intenção de conversão
 */

import { useState, useCallback } from "react";
import type { SocialNiche } from "./types";

export interface DynamicCTAOption {
  id: string;
  label: string;
  intent: "contact" | "conversion" | "discovery" | "urgency";
}

export const DYNAMIC_CTA_REGISTRY: Record<SocialNiche, DynamicCTAOption[]> = {
  imoveis: [
    { id: "imob_visita", label: "Agendar Visita", intent: "conversion" },
    { id: "imob_corretor", label: "Falar com Corretor", intent: "contact" },
    { id: "imob_planta", label: "Receber Planta & Valores", intent: "discovery" },
    { id: "imob_simular", label: "Simular Financiamento", intent: "conversion" },
    { id: "imob_condicoes", label: "Consultar Condições", intent: "contact" },
    { id: "imob_tour", label: "Fazer Tour Virtual", intent: "discovery" },
  ],
  turismo: [
    { id: "tour_vaga", label: "Garantir Vaga", intent: "conversion" },
    { id: "tour_roteiro", label: "Solicitar Roteiro Completo", intent: "discovery" },
    { id: "tour_agente", label: "Falar com Agente de Viagem", intent: "contact" },
    { id: "tour_whatsapp", label: "Reservar no WhatsApp", intent: "contact" },
    { id: "tour_pacote", label: "Ver Pacote Completo", intent: "discovery" },
    { id: "tour_ultimas", label: "Últimos Lugares no Voo", intent: "urgency" },
  ],
  gastronomia: [
    { id: "gastro_cardapio", label: "Ver Cardápio Completo", intent: "discovery" },
    { id: "gastro_pedir", label: "Pedir Agora no Delivery", intent: "conversion" },
    { id: "gastro_mesa", label: "Reservar Mesa", intent: "conversion" },
    { id: "gastro_combo", label: "Aproveitar Combo do Chef", intent: "urgency" },
    { id: "gastro_zap", label: "Pedir pelo WhatsApp", intent: "contact" },
  ],
  varejo: [
    { id: "varejo_oferta", label: "Aproveitar Oferta do Dia", intent: "urgency" },
    { id: "varejo_comprar", label: "Comprar com Desconto", intent: "conversion" },
    { id: "varejo_catalogo", label: "Ver Catálogo Completo", intent: "discovery" },
    { id: "varejo_entrega", label: "Pedir pelo MotoLink", intent: "contact" },
    { id: "varejo_estoque", label: "Garantir no Estoque", intent: "urgency" },
  ],
  veiculos: [
    { id: "auto_testdrive", label: "Agendar Test Drive", intent: "conversion" },
    { id: "auto_proposta", label: "Enviar Proposta", intent: "contact" },
    { id: "auto_troca", label: "Avaliar Meu Usado", intent: "discovery" },
    { id: "auto_financiamento", label: "Simular Parcelas", intent: "conversion" },
  ],
  geral: [
    { id: "geral_detalhes", label: "Mais Informações", intent: "discovery" },
    { id: "geral_contato", label: "Falar no WhatsApp", intent: "contact" },
    { id: "geral_aproveitar", label: "Aproveitar Agora", intent: "conversion" },
    { id: "geral_saibamais", label: "Saiba Mais", intent: "discovery" },
  ],
};

/**
 * Retorna os rótulos de CTAs disponíveis para o nicho informado
 */
export function getDynamicCTAsForNiche(niche?: SocialNiche | string): string[] {
  const resolvedNiche: SocialNiche = (niche && niche in DYNAMIC_CTA_REGISTRY)
    ? (niche as SocialNiche)
    : "geral";
  return DYNAMIC_CTA_REGISTRY[resolvedNiche].map((item) => item.label);
}

/**
 * Retorna o próximo CTA na lista cíclica
 */
export function getNextCTAOption(currentCTA: string, niche?: SocialNiche | string): string {
  const options = getDynamicCTAsForNiche(niche);
  const currentIndex = options.indexOf(currentCTA);
  if (currentIndex === -1 || currentIndex >= options.length - 1) {
    return options[0];
  }
  return options[currentIndex + 1];
}

/**
 * Hook para gerenciar CTA dinâmico com ciclo em um clique
 */
export function useDynamicCTA(niche?: SocialNiche | string, initialCTA?: string) {
  const options = getDynamicCTAsForNiche(niche);
  const [selectedCTA, setSelectedCTA] = useState<string>(initialCTA || options[0]);

  const cycleCTA = useCallback(() => {
    setSelectedCTA((prev) => getNextCTAOption(prev, niche));
  }, [niche]);

  return {
    selectedCTA,
    setSelectedCTA,
    availableCTAs: options,
    cycleCTA,
  };
}
