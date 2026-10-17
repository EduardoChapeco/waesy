import React, { useState } from "react";
import {
  Compass,
  Calendar,
  DollarSign,
  Copy,
  Check,
  Printer,
  Hotel,
  ShieldCheck,
  MapPin,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface TravelDayPlan {
  day: number;
  title: string;
  activities: string[];
}

export interface ArtifactTravelDossierProps {
  destination: string;
  daysCount?: number;
  estimatedBudgetCents?: number;
  hotelName?: string;
  hotelLocation?: string;
  pixKey?: string;
  pixCode?: string;
  days?: TravelDayPlan[];
  className?: string;
}

export function ArtifactTravelDossier({
  destination,
  daysCount = 3,
  estimatedBudgetCents,
  hotelName,
  hotelLocation,
  pixKey,
  pixCode,
  days = [],
  className,
}: ArtifactTravelDossierProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyPix = () => {
    if (!pixCode) return;
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={cn("rounded-lg border border-border/50 bg-card p-4 space-y-4", className)}>
      {/* Cabeçalho do Roteiro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <Compass className="size-4" aria-hidden="true" />
            <span>Dossiê Consultivo de Viagem</span>
          </div>
          <h4 className="text-base font-bold text-foreground mt-1">{destination}</h4>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Badge variant="outline" className="text-xs font-mono h-6">
            {daysCount} dias
          </Badge>
          {estimatedBudgetCents && (
            <Badge variant="secondary" className="text-xs font-mono font-bold h-6">
              {formatMoney(estimatedBudgetCents / 100)}
            </Badge>
          )}
        </div>
      </div>

      {/* Hotel / Hospedagem Recomendada se houver */}
      {hotelName && (
        <div className="rounded-md border border-border/40 bg-muted/20 p-3 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Hotel className="size-4 text-primary" aria-hidden="true" />
              <span>Hospedagem Selecionada: {hotelName}</span>
            </div>
            <Badge variant="outline" className="text-2xs flex items-center gap-1">
              <ShieldCheck className="size-3 text-primary" />
              <span>Verificado</span>
            </Badge>
          </div>
          {hotelLocation && (
            <p className="text-2xs text-muted-foreground flex items-center gap-1">
              <MapPin className="size-3 shrink-0" />
              <span>{hotelLocation}</span>
            </p>
          )}
        </div>
      )}

      {/* Cronograma Diário de Passeios */}
      <div className="space-y-3">
        <h5 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
          <Calendar className="size-3.5 text-primary" />
          <span>Cronograma Diário de Passeios</span>
        </h5>

        <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar pr-1">
          {days.map((d) => (
            <div
              key={d.day}
              className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-primary text-xs uppercase tracking-wider">
                  Dia {d.day}: {d.title}
                </span>
              </div>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {d.activities.map((act, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bloco Pix BACEN Copia-e-Cola */}
      {pixCode && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <QrCode className="size-4 text-primary" aria-hidden="true" />
              <span>Código Pix para Pagamento Instantâneo</span>
            </div>
            {pixKey && (
              <span className="text-2xs text-muted-foreground font-mono">Chave: {pixKey}</span>
            )}
          </div>

          <div className="relative">
            <pre className="text-2xs font-mono bg-card/80 p-3 rounded border border-border/50 text-foreground break-all max-h-16 overflow-y-auto">
              {pixCode}
            </pre>
          </div>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleCopyPix}
            className="w-full h-11 min-h-11 px-4 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <Check className="size-4 text-primary-foreground" />
                <span>Código Pix Copiado com Sucesso!</span>
              </>
            ) : (
              <>
                <Copy className="size-4" />
                <span>Copiar Código Pix para Pagar</span>
              </>
            )}
          </Button>
        </div>
      )}

      {/* Ações Finais */}
      <div className="pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handlePrint}
          className="w-full h-11 min-h-11 px-4 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer flex items-center justify-center gap-2"
        >
          <Printer className="size-4" />
          <span>Exportar Dossiê em PDF / Imprimir</span>
        </Button>
      </div>
    </div>
  );
}
