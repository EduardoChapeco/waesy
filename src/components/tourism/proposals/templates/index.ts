import React from "react";
import { type Proposal } from "@/services/proposals";
import { TEMPLATE_DEFAULT_PALETTES } from "@/lib/tourism/proposal-theme-palettes";
import TemplateEditorialFlat from "./TemplateEditorialFlat";
import TemplateExecutivo from "./TemplateExecutivo";
import TemplateDarkPremium from "./TemplateDarkPremium";
import TemplateLandscape from "./TemplateLandscape";
import TemplateGroupCatalog from "./TemplateGroupCatalog";
import TemplateVerticalPremium from "./TemplateVerticalPremium";
import TemplateBentoGrid from "./TemplateBentoGrid";

export type ProposalTemplateId =
  | "editorial-flat"
  | "executivo-b2b"
  | "dark-premium"
  | "landscape-presentation"
  | "group-catalog"
  | "vertical-premium"
  | "bento-grid";

export interface ProposalTemplateDefinition {
  id: ProposalTemplateId;
  label: string;
  description: string;
  formats: string[]; // which canvas formats this template supports
  previewBg: string; // bg color for thumbnail
}

export const PROPOSAL_TEMPLATES: ProposalTemplateDefinition[] = [
  {
    id: "vertical-premium",
    label: "Roteiro Vertical Premium",
    description:
      "Ideal para viagens terrestres, grupos, excursões e roteiros detalhados. Formato longo.",
    formats: ["vertical-scroll"],
    previewBg: TEMPLATE_DEFAULT_PALETTES["vertical-premium"].canvasBg,
  },
  {
    id: "editorial-flat",
    label: "Editorial Premium",
    description: "Capa full-bleed, seções de voos, hotéis, roteiro e financeiro",
    formats: ["a4-portrait"],
    previewBg: TEMPLATE_DEFAULT_PALETTES["editorial-flat"].canvasBg,
  },
  {
    id: "executivo-b2b",
    label: "Executivo B2B",
    description: "Clean, corporativo, focado em tabelas limpas — ideal para empresas",
    formats: ["a4-portrait"],
    previewBg: TEMPLATE_DEFAULT_PALETTES["executivo-b2b"].canvasBg,
  },
  {
    id: "dark-premium",
    label: "Dark Premium",
    description: "Fundo escuro dramático, estilo oficial e exclusivo",
    formats: ["a4-portrait"],
    previewBg: TEMPLATE_DEFAULT_PALETTES["dark-premium"].canvasBg,
  },
  {
    id: "landscape-presentation",
    label: "Apresentação Guiada",
    description: "Formato paisagem focado em fotos, ideal para apresentações ao vivo e reuniões",
    formats: ["a4-landscape", "presentation-169"],
    previewBg: TEMPLATE_DEFAULT_PALETTES["landscape-presentation"].canvasBg,
  },
  {
    id: "group-catalog",
    label: "Catálogo de Grupo",
    description: "Ideal para excursões rodoviárias, focado em chamadas de venda e fotos.",
    formats: ["a4-portrait"],
    previewBg: TEMPLATE_DEFAULT_PALETTES["group-catalog"].canvasBg,
  },
  {
    id: "bento-grid",
    label: "Bento Grid Visual",
    description: "Mosaico modular inteligente 100% preenchido, multi-nicho e visual.",
    formats: ["a4-portrait", "vertical-scroll"],
    previewBg: TEMPLATE_DEFAULT_PALETTES["bento-grid"].canvasBg,
  },
];

export function getProposalTemplate(
  templateId: string,
): React.ComponentType<{ proposal: Proposal; agency: any }> {
  switch (templateId) {
    case "vertical-premium":
      return TemplateVerticalPremium;
    case "editorial-flat":
      return TemplateEditorialFlat;
    case "executivo-b2b":
      return TemplateExecutivo;
    case "dark-premium":
      return TemplateDarkPremium;
    case "landscape-presentation":
      return TemplateLandscape;
    case "group-catalog":
      return TemplateGroupCatalog;
    case "bento-grid":
      return TemplateBentoGrid;
    default:
      return TemplateEditorialFlat;
  }
}
