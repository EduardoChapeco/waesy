import * as React from "react";
import { AlertCircle, ShieldAlert, Check, Copy, ExternalLink, Info, DollarSign, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  detectDestinationRegulatoryRequirements,
  type DestinationRegulatoryRequirement,
} from "@/lib/travel/destination-regulatory-intelligence";

export interface DestinationRegulatoryAlertWidgetProps {
  destination: string | string[] | Array<{ label?: string }> | null | undefined;
  stayDays?: number;
  paxCount?: number;
  className?: string;
  onIncludeFeesInProposal?: (estimatedCents: number) => void;
}

export function DestinationRegulatoryAlertWidget({
  destination,
  stayDays = 7,
  paxCount = 2,
  className,
  onIncludeFeesInProposal,
}: DestinationRegulatoryAlertWidgetProps) {
  const [copied, setCopied] = React.useState(false);

  const report = React.useMemo(() => {
    return detectDestinationRegulatoryRequirements(destination, stayDays, paxCount);
  }, [destination, stayDays, paxCount]);

  if (!report.matchedDestination || report.requirements.length === 0) {
    return null;
  }

  const handleCopyDisclaimer = () => {
    if (!report.disclaimerText) return;
    navigator.clipboard.writeText(report.disclaimerText);
    setCopied(true);
    toast.success("Informações e taxas regulatórias copiadas para a área de transferência!");
    setTimeout(() => setCopied(false), 2500);
  };

  const timingLabels: Record<string, string> = {
    prior_online: "Pagamento Online Prévio",
    agency_voucher: "Incluso no Voucher da Agência",
    on_arrival: "Pago na Chegada / Entrada",
    hotel_checkin: "Pago no Check-in do Hotel",
    airline_checkin: "Exigido no Check-in Aéreo",
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-warning/40 bg-warning/5 p-4 space-y-3 text-xs transition-colors",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-warning/20">
        <div className="flex items-center gap-2">
          {report.hasMandatoryFees ? (
            <ShieldAlert className="size-4 text-warning shrink-0" />
          ) : (
            <Info className="size-4 text-primary shrink-0" />
          )}
          <span className="font-bold text-foreground">
            Taxas & Requisitos Oficiais: {report.matchedDestination}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {report.hasMandatoryFees && (
            <Badge variant="outline" className="text-2xs font-semibold border-warning text-warning bg-warning/10">
              Taxas Obrigatórias
            </Badge>
          )}
          {report.hasPassportOrVisaAlerts && (
            <Badge variant="outline" className="text-2xs font-semibold border-primary text-primary bg-primary/10">
              Visto / Passaporte
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {report.requirements.map((req: DestinationRegulatoryRequirement) => (
          <div
            key={req.id}
            className="p-3 rounded-lg border border-border/40 bg-background/80 space-y-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-foreground">{req.title}</span>
                {req.severity === "mandatory" ? (
                  <Badge variant="destructive" className="text-3xs uppercase font-bold px-2 py-1">
                    Obrigatório
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-3xs uppercase font-medium px-2 py-1">
                    Informativo
                  </Badge>
                )}
              </div>
              <span className="text-2xs font-mono text-muted-foreground font-semibold">
                {timingLabels[req.paymentTiming] || req.paymentTiming}
              </span>
            </div>

            <p className="text-2xs text-muted-foreground leading-relaxed">{req.detailedNotice}</p>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/30">
              <span className="text-2xs font-medium text-foreground">
                Estimativa: <strong className="text-warning">{req.approximateEstimateText}</strong>
              </span>

              {req.externalUrl && (
                <a
                  href={req.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-2xs text-primary hover:underline font-medium min-h-11 py-2"
                >
                  <span>Portal Oficial</span>
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>

            {req.actionTip && (
              <div className="mt-1 text-3xs text-muted-foreground italic bg-muted/30 p-2 rounded flex items-center gap-2">
                <Sparkles className="size-3 text-primary shrink-0" />
                <span>Dica para o Consultor: {req.actionTip}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          onClick={handleCopyDisclaimer}
          className="h-11 min-h-11 px-3 text-xs font-semibold flex items-center gap-2"
        >
          {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
          <span>{copied ? "Copiado!" : "Copiar Avisos para Proposta / WhatsApp"}</span>
        </Button>

        {onIncludeFeesInProposal && report.totalEstimatedFeesCents > 0 && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => onIncludeFeesInProposal(report.totalEstimatedFeesCents)}
            className="h-11 min-h-11 px-3 text-xs font-semibold flex items-center gap-2"
          >
            <DollarSign className="size-3.5 text-primary" />
            <span>Adicionar Taxas Estimadas à Proposta</span>
          </Button>
        )}
      </div>
    </div>
  );
}
