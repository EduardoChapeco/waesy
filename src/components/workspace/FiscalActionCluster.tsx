import { useState } from "react";
import { Receipt, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { emitRowFiscalInvoice } from "@/services/services-erp.functions";

export interface FiscalActionClusterProps {
  orderId: string;
  orderTotalCents?: number;
  totalCents?: number;
  storeId?: string;
  customerName?: string;
  customerDoc?: string;
  hasServices?: boolean;
  hasProducts?: boolean;
  existingInvoices?: {
    invoice_type: "NFSe" | "NFe" | "NFCe";
    status: "authorized" | "pending" | "rejected";
    danfe_pdf_url?: string | null;
  }[];
  isContracted?: boolean;
}

export function FiscalActionCluster({
  orderId,
  orderTotalCents,
  totalCents,
  hasServices = true,
  hasProducts = true,
  existingInvoices = [],
  isContracted = true,
}: FiscalActionClusterProps) {
  const effectiveTotalCents = totalCents ?? orderTotalCents ?? 0;
  const [selectedType, setSelectedType] = useState<"NFSe" | "NFe" | "NFCe" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lc116Code, setLc116Code] = useState("06.01");
  const [cnaeCode, setCnaeCode] = useState("9602-5/01");

  const nfse = existingInvoices.find((i) => i.invoice_type === "NFSe");
  const nfe = existingInvoices.find((i) => i.invoice_type === "NFe");
  const nfce = existingInvoices.find((i) => i.invoice_type === "NFCe");

  const handleEmit = async () => {
    if (!selectedType) return;
    setIsSubmitting(true);
    try {
      await emitRowFiscalInvoice({
        data: {
          orderId,
          invoiceType: selectedType,
          grossAmountCents: effectiveTotalCents,
          lc116Code,
          cnaeCode,
        },
      });
      toast.success(`${selectedType} emitida com sucesso!`);
      setSelectedType(null);
    } catch (err: any) {
      toast.error(err.message || "Erro ao emitir documento fiscal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFiscalButton = (
    label: string,
    type: "NFSe" | "NFe" | "NFCe",
    invoice?: { status: string; danfe_pdf_url?: string | null },
  ) => {
    const isServiceType = type === "NFSe";
    const isApplicable = isServiceType ? hasServices : hasProducts;

    if (!isApplicable) {
      return (
        <TooltipProvider key={type}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                disabled
                className="inline-flex items-center justify-center size-11 min-h-11 min-w-11 rounded-lg border border-border/40 bg-muted/20 text-muted-foreground/40 opacity-40 cursor-not-allowed font-semibold text-xs"
                aria-label={`Sem ${isServiceType ? "serviços" : "produtos"} neste pedido`}
              >
                {label}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Pedido não contém ${isServiceType ? "serviços" : "produtos"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    if (!isContracted) {
      return (
        <TooltipProvider key={type}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                disabled
                className="inline-flex items-center justify-center h-11 w-11 rounded-lg border border-border bg-muted/40 text-muted-foreground opacity-50 cursor-not-allowed font-semibold text-xs transition-colors"
                aria-label={`Você ainda não contratou a emissão de ${type}`}
              >
                {label}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Você ainda não contratou o módulo de {type}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    if (invoice?.status === "authorized") {
      return (
        <TooltipProvider key={type}>
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={invoice.danfe_pdf_url || "#"}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center h-11 w-11 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 font-bold text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition-colors"
                aria-label={`${type} Autorizada. Clique para visualizar DANFE/PDF`}
              >
                {label}
              </a>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">{type} Autorizada (Abrir PDF)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <TooltipProvider key={type}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setSelectedType(type)}
              className="inline-flex items-center justify-center h-11 w-11 rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 font-bold text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
              aria-label={`Emitir ${type} individual`}
            >
              {label}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Emitir {type} Individual</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <>
      <div className="flex items-center gap-1.5" role="group" aria-label="Ações fiscais individuais">
        {renderFiscalButton("S", "NFSe", nfse)}
        {renderFiscalButton("P", "NFe", nfe)}
        {renderFiscalButton("C", "NFCe", nfce)}
      </div>

      <Dialog open={!!selectedType} onOpenChange={(open) => !open && setSelectedType(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Receipt className="h-5 w-5 text-primary" />
              Emitir {selectedType} Individual
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Confirme os parâmetros tributários antes da transmissão para o provedor municipal/estadual.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Código LC 116 / Serviço</Label>
              <Input
                value={lc116Code}
                onChange={(e) => setLc116Code(e.target.value)}
                placeholder="Ex: 06.01"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">CNAE da Atividade</Label>
              <Input
                value={cnaeCode}
                onChange={(e) => setCnaeCode(e.target.value)}
                placeholder="Ex: 9602-5/01"
                className="h-11"
              />
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Reforma Tributária (IVA Dual):</p>
              <p>Alíquotas de referência IBS e CBS apuradas automaticamente pelo regime da empresa.</p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => setSelectedType(null)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="h-11"
              onClick={handleEmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
                  Transmitindo...
                </>
              ) : (
                `Transmitir ${selectedType}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
