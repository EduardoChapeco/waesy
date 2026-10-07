import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Star } from "lucide-react";
import type { ClassifiedNicheType } from "@/types/classified-editor";

const TITLE_PLACEHOLDERS: Partial<Record<ClassifiedNicheType, string>> = {
  hospedagem: "Ex: Chalé na Serra com Hidro e Vista Panorâmica",
  imovel: "Ex: Apartamento 2 Quartos no Centro com Garagem",
  veiculo: "Ex: Honda Civic 2.0 EXL Automático 2021",
  servico: "Ex: Manutenção Elétrica Residencial & Comercial",
  vaga: "Ex: Analista Financeiro Sênior (Híbrido)",
};

export interface ClassifiedBasicInfoSectionProps {
  nicheId: ClassifiedNicheType;
  title: string;
  description: string;
  isRefiningDescription: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onRefineDescription: () => void;
  children: ReactNode;
}

export function ClassifiedBasicInfoSection({
  nicheId,
  title,
  description,
  isRefiningDescription,
  onTitleChange,
  onDescriptionChange,
  onRefineDescription,
  children,
}: ClassifiedBasicInfoSectionProps) {
  return (
    <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60">
      <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground pb-3 border-b border-border/40">
        <FileText className="size-4 text-primary shrink-0" />
        <span>2. Informações</span>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-foreground font-medium">Título do Anúncio *</Label>
        <Input
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder={TITLE_PLACEHOLDERS[nicheId] || "Ex: iPhone 15 Pro Max 256GB Impecável na Caixa"}
          className="h-11 rounded-lg text-xs bg-background font-medium"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-foreground font-medium">Descrição Completa *</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isRefiningDescription}
            onClick={onRefineDescription}
            className="h-11 min-h-11 px-3 text-xs text-muted-foreground/75 font-semibold text-primary hover:text-primary hover:bg-primary/10 gap-1 rounded-lg"
          >
            <Star className="size-3" />
            {isRefiningDescription ? "Aprimorando..." : "Refinar com IA"}
          </Button>
        </div>
        <Textarea
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          rows={4}
          placeholder={
            nicheId === "hospedagem"
              ? "Descreva a atmosfera do espaço, comodidades, localização, distâncias de pontos turísticos e regras de convivência..."
              : "Descreva todos os detalhes, histórico, diferenciais e informações importantes..."
          }
          className="rounded-lg text-xs bg-background resize-none leading-relaxed"
        />
      </div>

      {children}
    </div>
  );
}
