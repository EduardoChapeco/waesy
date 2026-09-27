import React from "react";
import type { TravelProposalDTO } from "@/services/travel-proposal.functions";
import { getProposalTemplate } from "@/components/tourism/proposals/templates";

interface ProposalCanvasRendererProps {
  proposal: TravelProposalDTO;
}

/**
 * Normaliza os IDs de template do workspace para os IDs canônicos
 * dos repositórios de referência extraídos.
 *
 * O seletor de template na rota usa "executivo" (curto),
 * mas o registry canônico usa "executivo-b2b".
 */
function normalizeTemplateId(id: string): string {
  const MAP: Record<string, string> = {
    executivo: "executivo-b2b",
    "editorial-flat": "editorial-flat",
    "dark-premium": "dark-premium",
    "landscape-presentation": "landscape-presentation",
    "vertical-premium": "vertical-premium",
    "group-catalog": "group-catalog",
  };
  return MAP[id] ?? id;
}

/**
 * Motor único de renderização de canvas de proposta.
 * Delega 100% para os templates canônicos extraídos dos repositórios
 * travelagencias / travel-proposal-templates.
 *
 * Suporta todos os 6 templates:
 *  - editorial-flat       → TemplateEditorialFlat
 *  - executivo / executivo-b2b → TemplateExecutivo
 *  - dark-premium         → TemplateDarkPremium
 *  - landscape-presentation → TemplateLandscape
 *  - vertical-premium     → TemplateVerticalPremium
 *  - group-catalog        → TemplateGroupCatalog
 */
import { PoweredByWaesyBadge } from "@/components/common/powered-by-waesy-badge";

export function ProposalCanvasRenderer({ proposal }: ProposalCanvasRendererProps) {
  const rawTemplate = (proposal as any)?.template || "editorial-flat";
  const templateId = normalizeTemplateId(rawTemplate);

  // Shape de agência compatível com todos os templates extraídos
  const agency = {
    name: proposal.agency_name || "Agência",
    logo_url: proposal.agency_logo_url,
    brand_color: (proposal as any)?.agency_brand_color || "#0A2540",
    brand_color_fg: "#ffffff",
    brand_color_light: "#eff6ff",
    phone: proposal.agency_phone,
    email: proposal.agency_email,
    whatsapp: proposal.agency_whatsapp,
  };

  const TemplateComponent = getProposalTemplate(templateId);
  return (
    <div className="w-full space-y-4">
      <TemplateComponent proposal={proposal as any} agency={agency} />
      <div className="pt-2 pb-6 flex justify-center">
        <PoweredByWaesyBadge variant="minimal" shortUrl="waesy.me/propostas" />
      </div>
    </div>
  );
}
