/**
 * registry.ts — Catálogo Central de Templates de Documentos Comerciais
 */

import React from "react";
import { BudgetCorporateClean } from "./templates/BudgetCorporateClean";
import { ProposalEditorialAgency } from "./templates/ProposalEditorialAgency";
import type { CommercialDocumentTemplateProps, CommercialDocumentData } from "./types";

export interface CommercialDocumentTemplateDefinition {
  id: string;
  name: string;
  category: "budget" | "proposal" | "contract";
  description: string;
  component: React.ComponentType<CommercialDocumentTemplateProps>;
}

export const COMMERCIAL_DOCUMENT_TEMPLATES: CommercialDocumentTemplateDefinition[] = [
  {
    id: "budget_corporate_clean",
    name: "Orçamento 01: Corporativo Clean A4",
    category: "budget",
    description: "Layout formal A4 vertical com tabela matricial, fechamento financeiro, chave PIX e QR Code para pagamento",
    component: BudgetCorporateClean,
  },
  {
    id: "proposal_editorial_agency",
    name: "Proposta 02: Editorial Agency Landscape",
    category: "proposal",
    description: "Layout horizontal com barra lateral escura luxuosa, fases do projeto em 3 colunas e botão de aceite digital",
    component: ProposalEditorialAgency,
  },
];

export function getAllCommercialDocumentTemplates(): CommercialDocumentTemplateDefinition[] {
  return COMMERCIAL_DOCUMENT_TEMPLATES;
}

export function getCommercialTemplateById(id: string): CommercialDocumentTemplateDefinition {
  const found = COMMERCIAL_DOCUMENT_TEMPLATES.find((t) => t.id === id);
  return found || COMMERCIAL_DOCUMENT_TEMPLATES[0];
}
