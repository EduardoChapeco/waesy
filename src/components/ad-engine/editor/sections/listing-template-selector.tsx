import React from "react";
import { Palette, CheckCircle2, AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { UnifiedNiche } from "@/types/unified-ad-engine";
import { NICHE_TAXONOMY_REGISTRY } from "@/lib/ad-engine/niche-taxonomy-manifest";
import { cn } from "@/lib/utils";

export interface ListingTemplateSelectorProps {
  niche: UnifiedNiche;
  value: string;
  onChange: (templateId: string) => void;
  className?: string;
}

const TEMPLATE_METADATA: Record<
  string,
  { label: string; badge: string; description: string; previewBadgeColor?: string }
> = {
  tourism_immersive: {
    label: "Imersivo com Roteiro",
    badge: "Turismo",
    description: "Layout cinematográfico com abas de roteiro dia a dia, hospedagem e inclusos.",
    previewBadgeColor: "bg-primary text-primary-foreground",
  },
  tourism_catalog: {
    label: "Catálogo de Viagens",
    badge: "Excursões",
    description: "Grade limpa com foco em datas de saída, embarques e sinal de reserva.",
    previewBadgeColor: "bg-blue-600 text-white",
  },
  retail_standard: {
    label: "Varejo Padrão",
    badge: "Comércio",
    description: "Layout focado em fotos, atributos de grade (tamanho/cor), cálculo de frete e parcelamento.",
    previewBadgeColor: "bg-neutral-800 text-white",
  },
  retail_showcase: {
    label: "Vitrine Editorial",
    badge: "Destaque",
    description: "Galeria bento expandida com especificações técnicas e reviews de clientes.",
    previewBadgeColor: "bg-amber-600 text-white",
  },
  restaurant_menu: {
    label: "Cardápio Gastronômico",
    badge: "Alimentos",
    description: "Layout otimizado com adicionais, ponto de carne, tempo de preparo e combo.",
    previewBadgeColor: "bg-rose-600 text-white",
  },
  grocery_gondola: {
    label: "Gôndola de Supermercado",
    badge: "Mercado",
    description: "Alta densidade com peso fracionado, validade, tabela nutricional e compra rápida.",
    previewBadgeColor: "bg-emerald-600 text-white",
  },
  service_booking: {
    label: "Agendamento de Sessões",
    badge: "Serviço",
    description: "Grade de horários disponíveis, duração da sessão e confirmação imediata.",
    previewBadgeColor: "bg-indigo-600 text-white",
  },
  service_quote: {
    label: "Proposta e Orçamento",
    badge: "Sob Consulta",
    description: "Formulário de briefing, escopo de entrega e emissão de minuta contratual.",
    previewBadgeColor: "bg-slate-700 text-white",
  },
  real_estate_dossier: {
    label: "Dossiê Imobiliário",
    badge: "Imóveis",
    description: "Ficha cadastral completa com área útil, metragem, IPTU, condomínio e mapa de localização.",
    previewBadgeColor: "bg-teal-700 text-white",
  },
  automotive_spec: {
    label: "Ficha Automotiva",
    badge: "Veículos",
    description: "Quilometragem, ano de fabricação, tipo de câmbio, combustível e histórico de revisões.",
    previewBadgeColor: "bg-orange-600 text-white",
  },
};

export function ListingTemplateSelector({
  niche,
  value,
  onChange,
  className,
}: ListingTemplateSelectorProps) {
  const nicheConfig = NICHE_TAXONOMY_REGISTRY[niche];
  const allowedTemplateIds = nicheConfig?.allowedTemplates ?? ["retail_standard"];

  // Fallback to first allowed template if current is invalid
  React.useEffect(() => {
    if (!allowedTemplateIds.includes(value)) {
      onChange(allowedTemplateIds[0]);
    }
  }, [niche, allowedTemplateIds, value, onChange]);

  return (
    <div className={cn("bg-card rounded-2xl p-4 sm:p-5 border border-border/60 space-y-4", className)}>
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
        <strong className="text-foreground">{nicheConfig?.label}</strong>.
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
            <button
              key={templateId}
              type="button"
              onClick={() => onChange(templateId)}
              className={cn(
                "flex flex-col justify-between p-4 rounded-xl border text-left transition-all min-h-16 cursor-pointer",
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
