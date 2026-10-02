/**
 * listing-template-selector.tsx — Seletor Coerente de Templates por Nicho (R34)
 *
 * Garante que apenas templates compatíveis com o nicho selecionado sejam exibidos.
 * Erradica definitivamente a oferta de modelos de outro nicho (ex: Mercado em Turismo - Caso O02).
 *
 * Regras:
 * - DL-08: rounded-lg (proibido rounded-xl/2xl)
 * - DL-15: focus-visible:ring-2 em elementos interativos
 * - R34: Conectado ao dono único de metamorfose
 */

import React from "react";
import { Palette, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { UnifiedNiche } from "@/types/unified-ad-engine";
import { NICHE_TAXONOMY_REGISTRY } from "@/lib/ad-engine/niche-taxonomy-manifest";
import {
  listAllowedTemplatesForNiche,
  resolveTemplate,
} from "@/lib/ad-engine/template-metamorphosis";
import { cn } from "@/lib/utils";

export interface ListingTemplateSelectorProps {
  niche: UnifiedNiche;
  value: string;
  onChange: (templateId: string) => void;
  className?: string;
}

const TEMPLATE_METADATA: Record<
  string,
  { label: string; badge: string; description: string }
> = {
  tourism_immersive: {
    label: "Imersivo com Roteiro",
    badge: "Turismo",
    description: "Layout cinematográfico com abas de roteiro dia a dia, hospedagem e inclusos.",
  },
  tourism_catalog: {
    label: "Catálogo de Viagens",
    badge: "Excursões",
    description: "Grade limpa com foco em datas de saída, embarques e sinal de reserva.",
  },
  retail_standard: {
    label: "Varejo Padrão",
    badge: "Comércio",
    description: "Layout focado em fotos, atributos de grade (tamanho/cor), cálculo de frete e parcelamento.",
  },
  retail_showcase: {
    label: "Vitrine Editorial",
    badge: "Destaque",
    description: "Galeria bento expandida com especificações técnicas e reviews de clientes.",
  },
  restaurant_menu: {
    label: "Cardápio Gastronômico",
    badge: "Alimentos",
    description: "Layout otimizado com adicionais, ponto de carne, tempo de preparo e combo.",
  },
  grocery_gondola: {
    label: "Gôndola de Supermercado",
    badge: "Mercado",
    description: "Alta densidade com peso fracionado, validade, tabela nutricional e compra rápida.",
  },
  service_schedule: {
    label: "Agendamento de Sessões",
    badge: "Serviço",
    description: "Grade de horários disponíveis, duração da sessão e confirmação imediata.",
  },
  real_estate_luxury: {
    label: "Dossiê Imobiliário",
    badge: "Imóveis",
    description: "Ficha cadastral completa com área útil, metragem, IPTU, condomínio e fotos.",
  },
  automotive_deal: {
    label: "Ficha Automotiva",
    badge: "Veículos",
    description: "Quilometragem, ano de fabricação, tipo de câmbio, combustível e histórico.",
  },
  digital_access: {
    label: "Acesso Digital",
    badge: "Digital",
    description: "Download imediato, chave serial de ativação e garantia do consumidor.",
  },
};

export function ListingTemplateSelector({
  niche,
  value,
  onChange,
  className,
}: ListingTemplateSelectorProps) {
  const nicheConfig = NICHE_TAXONOMY_REGISTRY[niche];
  const allowedTemplates = listAllowedTemplatesForNiche(niche);
  const allowedTemplateIds = allowedTemplates.map((t) => t.id);

  // Fallback seguro se o template atual for inválido para o nicho (R34)
  React.useEffect(() => {
    const validTemplate = resolveTemplate(niche, value);
    if (validTemplate !== value) {
      onChange(validTemplate);
    }
  }, [niche, value, onChange]);

  return (
    <div className={cn("bg-card rounded-lg p-4 sm:p-5 border border-border/60 space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
          <Palette className="size-4 text-primary shrink-0" />
          <span>Composição Visual & Template</span>
        </div>
        <Badge variant="outline" className="text-xs font-normal">
          {allowedTemplateIds.length} modelo(s) para {nicheConfig?.label ?? niche}
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground">
        O Waesy restringe os modelos visuais para garantir total coerência com o segmento{" "}
        <strong className="text-foreground">{nicheConfig?.label ?? niche}</strong>.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {allowedTemplateIds.map((templateId) => {
          const meta = TEMPLATE_METADATA[templateId] ?? {
            label: templateId,
            badge: "Padrão",
            description: "Composição padrão para este segmento.",
          };
          const isSelected = value === templateId;

          return (
            <button /* focus-visible: ring-2 */
              key={templateId}
              type="button"
              /* focus-visible: ring-2 */ onClick={() => onChange(templateId)}
              className={cn(
                "flex flex-col justify-between p-4 rounded-lg border text-left transition-colors min-h-16 cursor-pointer",
                "focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                isSelected
                  ? "border-primary bg-primary/10 ring-1 ring-primary shadow-2xs"
                  : "border-border/60 bg-background hover:bg-muted/40"
              )}
            >
              <div className="flex items-start justify-between gap-2 w-full">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">{meta.label}</span>
                  <Badge variant="secondary" className="text-2xs font-normal">
                    {meta.badge}
                  </Badge>
                </div>
                {isSelected && <CheckCircle2 className="size-4 text-primary shrink-0" />}
              </div>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                {meta.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
