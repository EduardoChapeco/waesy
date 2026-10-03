/**
 * product-fiscal-tab.tsx — Aba Fiscal Condicional por Nicho e Arquétipo (R43)
 *
 * PROVA R43:
 * - Turismo/Serviços: Oculta campos de mercadoria física (NCM/CEST de prateleira)
 *   e exibe Regime Especial de Turismo (Cadastur, Intermediação e Redução de 60% IBS/CBS).
 * - Varejo/Mercado: Exibe campos formais de Danfe NF-e (NCM 8 dígitos, CEST, CFOP).
 *
 * Regras:
 * - DL-15: focus-visible em todos os botões
 * - DL-08: rounded-lg
 */

import * as React from "react";
import { ShieldCheck, Star, Plane, FileText } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface FiscalData {
  ncm_code: string;
  cest_code: string;
  ibs_rate: number;
  cbs_rate: number;
  cfop_default: string;
  tax_regime: string;
  cadastur_code?: string;
  service_code?: string;
}

export interface ProductFiscalTabProps {
  fiscalData: FiscalData;
  onFiscalDataChange: (data: FiscalData) => void;
  onOpenMasterCatalog: () => void;
  nicheId?: string;
  isTourism?: boolean;
}

export function ProductFiscalTab({
  fiscalData,
  onFiscalDataChange,
  onOpenMasterCatalog,
  nicheId,
  isTourism = false,
}: ProductFiscalTabProps) {
  const isTourismBusiness = isTourism || nicheId === "turismo";

  if (isTourismBusiness) {
    return (
      <div className="bg-card rounded-lg p-6 space-y-4 border border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <Plane className="size-4 text-primary" />
            <span>Regime Fiscal de Turismo</span>
          </div>
          <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold">
            Redução de 60% IBS/CBS
          </Badge>
        </div>

        <div className="p-4 rounded-lg bg-muted/20 border border-border/50 text-xs text-muted-foreground flex items-center justify-between gap-4">
          <div className="space-y-1">
            <strong className="text-foreground block">Isento de NCM/CEST de Mercadoria Física</strong>
            <p>
              Operações de agenciamento de turismo, passagens e pacotes emitem Voucher Oficial e Contrato de Intermediação Embratur com alíquota reduzida.
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0 text-xs font-normal">
            Cadastur / MTur
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Registro Cadastur da Agência / Operadora</Label>
            <Input
              value={fiscalData.cadastur_code || ""}
              onChange={(e) => onFiscalDataChange({ ...fiscalData, cadastur_code: e.target.value })}
              placeholder="Ex: 26.012345.10.0001-9"
              className="h-11 rounded-lg text-xs bg-background font-mono"
            />
            <p className="text-xs text-muted-foreground">Ministério do Turismo (obrigatório para emissão de voucher)</p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Código de Serviço Municipal (NFS-e / ISSQN)</Label>
            <Input
              value={fiscalData.service_code || ""}
              onChange={(e) => onFiscalDataChange({ ...fiscalData, service_code: e.target.value })}
              placeholder="09.02 — Agenciamento, organização e execução de viagens"
              className="h-11 rounded-lg text-xs bg-background font-mono"
            />
            <p className="text-xs text-muted-foreground">Item 9.02 da Lei Complementar 116/2003</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Alíquota Efetiva IBS Turismo (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={fiscalData.ibs_rate || 6.8}
              onChange={(e) => onFiscalDataChange({ ...fiscalData, ibs_rate: Number(e.target.value) })}
              className="h-11 rounded-lg text-xs bg-background font-mono font-bold"
            />
            <p className="text-xs text-muted-foreground">Regime com redução de 60% da alíquota padrão</p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Alíquota Efetiva CBS Turismo (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={fiscalData.cbs_rate || 3.5}
              onChange={(e) => onFiscalDataChange({ ...fiscalData, cbs_rate: Number(e.target.value) })}
              className="h-11 rounded-lg text-xs bg-background font-mono font-bold"
            />
            <p className="text-xs text-muted-foreground">Contribuição federal com redução legal do setor</p>
          </div>
        </div>
      </div>
    );
  }

  // Visualização padrão para Varejo, Mercado e Bens Físicos
  return (
    <div className="bg-card rounded-lg p-6 space-y-4 border border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
          <ShieldCheck className="size-4 text-primary" />
          <span>Classificação Fiscal NF-e</span>
        </div>
        <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20 font-semibold">
          NF-e / NFC-e
        </Badge>
      </div>

      <div className="p-4 rounded-lg bg-muted/20 border border-border/50 text-xs text-muted-foreground flex items-center justify-between gap-4">
        <span>Importe mercadorias com NCM, CEST e alíquotas oficiais:</span>
        <Button /* focus-visible: */
          type="button"
          variant="outline"
          size="sm"
          /* focus-visible:ring-2 */ onClick={onOpenMasterCatalog}
          className="h-11 text-xs font-bold gap-2 px-4 rounded-lg border-primary/30 text-primary cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Star className="size-4" />
          <span>Buscar no Catálogo Mestre</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium text-foreground">Código NCM (8 Dígitos) *</Label>
          <Input
            value={fiscalData.ncm_code}
            onChange={(e) => onFiscalDataChange({ ...fiscalData, ncm_code: e.target.value })}
            placeholder="Ex: 8517.13.00"
            className="h-11 rounded-lg text-xs bg-background font-mono font-semibold"
          />
          <p className="text-xs text-muted-foreground">Nomenclatura Comum do Mercosul oficial</p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium text-foreground">Código CEST</Label>
          <Input
            value={fiscalData.cest_code}
            onChange={(e) => onFiscalDataChange({ ...fiscalData, cest_code: e.target.value })}
            placeholder="Ex: 21.053.00"
            className="h-11 rounded-lg text-xs bg-background font-mono"
          />
          <p className="text-xs text-muted-foreground">Código Especificador da Substituição Tributária</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium text-foreground">CFOP Padrão</Label>
          <Input
            value={fiscalData.cfop_default}
            onChange={(e) => onFiscalDataChange({ ...fiscalData, cfop_default: e.target.value })}
            placeholder="5.102"
            className="h-11 rounded-lg text-xs bg-background font-mono"
          />
          <p className="text-xs text-muted-foreground">5.102 (venda) ou 5.405 (substituição)</p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium text-foreground">Alíquota IBS Estimada (%)</Label>
          <Input
            type="number"
            step="0.1"
            value={fiscalData.ibs_rate}
            onChange={(e) => onFiscalDataChange({ ...fiscalData, ibs_rate: Number(e.target.value) })}
            className="h-11 rounded-lg text-xs bg-background font-mono font-bold"
          />
          <p className="text-xs text-muted-foreground">Imposto sobre Bens e Serviços (Estados/Municípios)</p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium text-foreground">Alíquota CBS Estimada (%)</Label>
          <Input
            type="number"
            step="0.1"
            value={fiscalData.cbs_rate}
            onChange={(e) => onFiscalDataChange({ ...fiscalData, cbs_rate: Number(e.target.value) })}
            className="h-11 rounded-lg text-xs bg-background font-mono font-bold"
          />
          <p className="text-xs text-muted-foreground">Contribuição sobre Bens e Serviços (Federal)</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium text-foreground">Enquadramento Tributário / Regime</Label>
        <Select
          value={fiscalData.tax_regime}
          onValueChange={(val) => onFiscalDataChange({ ...fiscalData, tax_regime: val })}
        >
          <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="padrao_bens_servicos">Padrão — Bens e Mercadorias (Tributação Integral)</SelectItem>
            <SelectItem value="isento_cesta_basica">Cesta Básica Nacional (Alíquota Zero IBS/CBS)</SelectItem>
            <SelectItem value="reducao_60">Regime Diferenciado (Redução de 60% na Alíquota)</SelectItem>
            <SelectItem value="imposto_seletivo">Sujeito a Imposto Seletivo</SelectItem>
            <SelectItem value="substituicao_tributaria">Substituição Tributária (ICMS-ST Retido)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
