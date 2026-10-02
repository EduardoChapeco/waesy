import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Calculator, DollarSign, Percent, CreditCard, CheckCircle2, TrendingUp, FileCheck, Building, User, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { updateLeadDetails } from "@/services/crm.functions";

interface LeadCommissionCalculatorSheetProps {
  isOpen: boolean;
  onClose: () => void;
  lead: {
    id: string;
    fullName?: string;
    estimated_value_cents?: number;
    notes?: string | null;
  } | null;
  onSuccess?: () => void;
}

export function LeadCommissionCalculatorSheet({
  isOpen,
  onClose,
  lead,
  onSuccess,
}: LeadCommissionCalculatorSheetProps) {
  const initialGross = (lead?.estimated_value_cents || 0) / 100 || 5000;
  const [grossSale, setGrossSale] = useState<number>(initialGross);
  const [operatorCost, setOperatorCost] = useState<number>(Math.round(initialGross * 0.82));
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "credit_1x" | "credit_12x">("pix");
  const [commissionType, setCommissionType] = useState<"margin" | "gross">("margin");
  const [commissionPercent, setCommissionPercent] = useState<number>(20); // 20% da margem ou 3% da venda
  const [isSaving, setIsSaving] = useState(false);

  // Taxas de Meios de Pagamento
  const GATEWAY_RATES: Record<string, { label: string; rate: number }> = {
    pix: { label: "Pix Instantâneo (0.99%)", rate: 0.0099 },
    credit_1x: { label: "Cartão à Vista (2.99%)", rate: 0.0299 },
    credit_12x: { label: "Cartão 12x Sem Juros (5.40%)", rate: 0.054 },
  };

  const calculations = useMemo(() => {
    const gatewayFee = grossSale * GATEWAY_RATES[paymentMethod].rate;
    const grossMargin = Math.max(0, grossSale - operatorCost - gatewayFee);
    const sellerCommission =
      commissionType === "margin"
        ? (grossMargin * commissionPercent) / 100
        : (grossSale * commissionPercent) / 100;
    const agencyNetProfit = grossMargin - sellerCommission;
    const marginPercent = grossSale > 0 ? (grossMargin / grossSale) * 100 : 0;

    return {
      gatewayFee,
      grossMargin,
      sellerCommission,
      agencyNetProfit,
      marginPercent,
    };
  }, [grossSale, operatorCost, paymentMethod, commissionType, commissionPercent]);

  const handleSaveToLead = async () => {
    if (!lead?.id) return;
    setIsSaving(true);
    try {
      const summaryNote = `\n[Cálculo Comercial] Venda: R$ ${grossSale.toFixed(2)} | Custo Op: R$ ${operatorCost.toFixed(2)} | Taxa Gateway: R$ ${calculations.gatewayFee.toFixed(2)} | Comissão Vendedor: R$ ${calculations.sellerCommission.toFixed(2)} | Lucro Agência: R$ ${calculations.agencyNetProfit.toFixed(2)} (${calculations.marginPercent.toFixed(1)}%)`;
      const currentNotes = lead.notes || "";
      const updatedNotes = currentNotes + summaryNote;

      await updateLeadDetails({
        data: {
          leadId: lead.id,
          estimated_value_cents: Math.round(grossSale * 100),
          notes: updatedNotes,
        },
      });

      toast.success("Régua de comissão calculada e anexada ao lead!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar cálculo no lead.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] bg-card border-l border-border p-6 overflow-y-auto space-y-6 select-none">
        <SheetHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Calculator className="size-5 text-primary" />
            <SheetTitle className="text-base font-bold text-foreground">
              Calculadora de Comissão
            </SheetTitle>
          </div>
          <SheetDescription className="text-xs text-muted-foreground">
            {lead?.fullName ? `Oportunidade: ${lead.fullName}` : "Simulação financeira e margem líquida"}
          </SheetDescription>
        </SheetHeader>

        {/* ── Entradas de Valores ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">Preço Total de Venda (R$)</Label>
            <Input
              type="number"
              value={grossSale}
              onChange={(e) => setGrossSale(parseFloat(e.target.value) || 0)}
              className="h-11 rounded-lg font-mono text-sm font-bold min-h-11"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">Custo Fornecedor / Operadora (R$)</Label>
            <Input
              type="number"
              value={operatorCost}
              onChange={(e) => setOperatorCost(parseFloat(e.target.value) || 0)}
              className="h-11 rounded-lg font-mono text-sm min-h-11"
            />
          </div>
        </div>

        {/* ── Forma de Pagamento & Taxa Gateway ── */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground">Meio de Pagamento Previsto</Label>
          <div className="grid grid-cols-3 gap-2">
            {(["pix", "credit_1x", "credit_12x"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPaymentMethod(m)}
                className={`p-3 rounded-lg border text-xs font-bold text-left transition-all min-h-11 ${
                  paymentMethod === m
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-muted/40 border-border/80 text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="block capitalize">{m.replace("_", " ")}</span>
                <span className="text-[10px] opacity-70">{(GATEWAY_RATES[m].rate * 100).toFixed(2)}% taxa</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Regra de Comissão do Consultor/Vendedor ── */}
        <div className="space-y-2 p-4 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-foreground">Comissão do Consultor</Label>
            <div className="flex items-center gap-1 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setCommissionType("margin");
                  setCommissionPercent(20);
                }}
                className={`px-2 py-1 rounded-md font-bold ${
                  commissionType === "margin" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                % da Margem
              </button>
              <button
                type="button"
                onClick={() => {
                  setCommissionType("gross");
                  setCommissionPercent(3);
                }}
                className={`px-2 py-1 rounded-md font-bold ${
                  commissionType === "gross" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                % da Venda
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Input
              type="number"
              value={commissionPercent}
              onChange={(e) => setCommissionPercent(parseFloat(e.target.value) || 0)}
              className="h-10 rounded-lg font-mono text-sm font-bold w-24 min-h-11"
            />
            <span className="text-xs text-muted-foreground">
              {commissionType === "margin"
                ? "% sobre a margem de contribuição líquida"
                : "% sobre o faturamento total da oportunidade"}
            </span>
          </div>
        </div>

        {/* ── Cartões de Resultado Financeiro ── */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-4 rounded-lg bg-card border border-border/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Margem Bruta</span>
              <Badge variant="outline" className="text-[10px] font-mono">
                {calculations.marginPercent.toFixed(1)}%
              </Badge>
            </div>
            <p className="text-base font-black font-mono text-foreground">
              R$ {calculations.grossMargin.toFixed(2)}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-card border border-border/80 space-y-1">
            <span className="text-xs text-muted-foreground">Taxa do Gateway</span>
            <p className="text-base font-black font-mono text-muted-foreground">
              R$ {calculations.gatewayFee.toFixed(2)}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-1">
            <div className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
              <User className="size-3.5" />
              <span>Comissão Consultor</span>
            </div>
            <p className="text-base font-black font-mono text-amber-700 dark:text-amber-300">
              R$ {calculations.sellerCommission.toFixed(2)}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-1">
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <Building className="size-3.5" />
              <span>Lucro Líquido Loja</span>
            </div>
            <p className="text-base font-black font-mono text-emerald-700 dark:text-emerald-300">
              R$ {calculations.agencyNetProfit.toFixed(2)}
            </p>
          </div>
        </div>

        <SheetFooter className="gap-2 sm:gap-0 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} className="rounded-lg min-h-11">
            Fechar
          </Button>
          <Button
            onClick={handleSaveToLead}
            disabled={isSaving}
            className="rounded-lg min-h-11 gap-2 bg-primary text-primary-foreground font-bold"
          >
            <FileCheck className="size-4" />
            {isSaving ? "Gravando..." : "Anexar ao Histórico do Lead"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
