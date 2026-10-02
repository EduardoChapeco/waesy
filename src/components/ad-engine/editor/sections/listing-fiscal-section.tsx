import React from "react";
import { Receipt, FileText, Percent, Info, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UnifiedListingFiscal, UnifiedNiche } from "@/types/unified-ad-engine";
import { NICHE_TAXONOMY_REGISTRY } from "@/lib/ad-engine/niche-taxonomy-manifest";
import { cn } from "@/lib/utils";

export interface ListingFiscalSectionProps {
  niche: UnifiedNiche;
  isWorkspace: boolean;
  value: Partial<UnifiedListingFiscal>;
  onChange: (patch: Partial<UnifiedListingFiscal>) => void;
  onOpenMasterCatalog?: () => void;
  errors?: Record<string, string>;
  className?: string;
}

export function ListingFiscalSection({
  niche,
  isWorkspace,
  value,
  onChange,
  onOpenMasterCatalog,
  errors = {},
  className,
}: ListingFiscalSectionProps) {
  const nicheConfig = NICHE_TAXONOMY_REGISTRY[niche];
  const supportsFiscal = nicheConfig?.supportsShipping || niche === "retail";

  // F22: Declarativa - Turismo e Serviços puros não mostram fiscal de mercadorias
  if (Boolean(supportsFiscal) === false || Boolean(isWorkspace) === false) {
    return null;
  }

  const ncm = value.ncm_code ?? "";
  const cest = value.cest_code ?? "";
  const cfop = value.cfop_default ?? "5.102";
  const ibsRate = value.ibs_rate ?? 15.5;
  const cbsRate = value.cbs_rate ?? 8.8;
  const taxRegime = value.tax_regime ?? "padrao_bens_servicos";

  return (
    <div className={cn("bg-card rounded-lg p-4 sm:p-5 border border-border/60 space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
          <Receipt className="size-4 text-primary shrink-0" />
          <span>Classificação Fiscal & Reforma Tributária 2026</span>
        </div>
        <div className="flex items-center gap-2">
          {onOpenMasterCatalog && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenMasterCatalog}
              className="h-11 rounded-lg text-xs font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <Search className="size-4 text-primary" />
              <span>Buscar NCM no Catálogo</span>
            </Button>
          )}
          <Badge variant="outline" className="text-xs font-normal">
            NF-e / NFC-e
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Código NCM */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-foreground">Código NCM (8 dígitos)</Label>
          <Input
            value={ncm}
            onChange={(e) => onChange({ ncm_code: e.target.value.replace(/\D/g, "").slice(0, 8) })}
            placeholder="Ex: 21069090"
            className={cn("h-11 rounded-lg text-xs bg-background font-mono", errors.ncm_code && "border-destructive")}
          />
          {errors.ncm_code && <p className="text-xs text-destructive">{errors.ncm_code}</p>}
        </div>

        {/* Código CEST */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-foreground">Código CEST (7 dígitos)</Label>
          <Input
            value={cest}
            onChange={(e) => onChange({ cest_code: e.target.value.replace(/\D/g, "").slice(0, 7) })}
            placeholder="Ex: 1709900"
            className="h-11 rounded-lg text-xs bg-background font-mono"
          />
        </div>

        {/* CFOP Padrão */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-foreground">CFOP Padrão de Saída</Label>
          <Select value={cfop} onValueChange={(v) => onChange({ cfop_default: v })}>
            <SelectTrigger className="h-11 rounded-lg text-xs bg-background font-mono">
              <SelectValue placeholder="Selecione o CFOP" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5.102">5.102 - Venda de mercadoria adquirida</SelectItem>
              <SelectItem value="5.101">5.101 - Venda de produção do estabelecimento</SelectItem>
              <SelectItem value="5.405">5.405 - Venda de mercadoria com ST</SelectItem>
              <SelectItem value="5.933">5.933 - Prestação de serviço tributado pelo ISS</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Alíquotas da Reforma Tributária (IBS e CBS) */}
      <div className="pt-2 border-t border-border/40 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <span>Alíquota IBS (%)</span>
            <span className="text-xs text-muted-foreground">(Estadual/Municipal)</span>
          </Label>
          <div className="relative">
            <Input
              type="number"
              step="0.1"
              value={ibsRate}
              onChange={(e) => onChange({ ibs_rate: Number(e.target.value) })}
              className="h-11 rounded-lg text-xs bg-background pr-8 font-mono"
            />
            <Percent className="size-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <span>Alíquota CBS (%)</span>
            <span className="text-xs text-muted-foreground">(Federal)</span>
          </Label>
          <div className="relative">
            <Input
              type="number"
              step="0.1"
              value={cbsRate}
              onChange={(e) => onChange({ cbs_rate: Number(e.target.value) })}
              className="h-11 rounded-lg text-xs bg-background pr-8 font-mono"
            />
            <Percent className="size-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Regime de Tributação</Label>
          <Select value={taxRegime} onValueChange={(v) => onChange({ tax_regime: v as any })}>
            <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
              <SelectValue placeholder="Regime" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="simples_nacional">Simples Nacional (Diferenciado)</SelectItem>
              <SelectItem value="padrao_bens_servicos">Regime Geral (IBS / CBS)</SelectItem>
              <SelectItem value="isento_ou_diferido">Alíquota Zero / Isento</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
