import React from "react";
import { UniversalClassifiedShowcase, type UniversalClassifiedShowcaseProps } from "./universal-classified-showcase";

export type AdDetailsProps = UniversalClassifiedShowcaseProps;

/**
 * AdDetails — Componente Principal da Página de Anúncio (Master Prompt V140)
 *
 * Implementa o Hybrid Checkout Protocol & Classifieds Bypass:
 * - Se for anúncio conversacional (Classificados / Serviços): oculta botões de checkout e ativa Enviar Mensagem / WhatsApp.
 * - Se for produto de loja / e-commerce: ativa Adicionar ao Carrinho e Comprar Agora.
 * - Bifurcação nativa entre Mobile (Sticky Bottom Bar) e Desktop (Split-screen 7/5).
 */
export function AdDetails(props: AdDetailsProps) {
  return <UniversalClassifiedShowcase {...props} />;
}

export default AdDetails;
