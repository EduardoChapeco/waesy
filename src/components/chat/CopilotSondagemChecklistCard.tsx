import { CheckCircle2, Circle, Compass, Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SondagemChecklistResult } from "@/lib/ai/niche-agent-engine";

interface CopilotSondagemChecklistCardProps {
  sondagem?: SondagemChecklistResult | null;
  adAttributionContext?: string | null;
  crmProposalStatus?: "sent" | "draft" | "none" | null;
  whatsappOptOut?: boolean;
}

export function CopilotSondagemChecklistCard({
  sondagem,
  adAttributionContext,
  crmProposalStatus,
  whatsappOptOut,
}: CopilotSondagemChecklistCardProps) {
  if (!sondagem && !adAttributionContext && !whatsappOptOut) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-foreground flex items-center gap-2">
          <Compass className="size-4 text-primary" />
          Sondagem Consultiva
        </span>
        <div className="flex items-center gap-2">
          {whatsappOptOut && (
            <Badge variant="destructive" className="text-xs">Opt-Out</Badge>
          )}
          {crmProposalStatus === "sent" && (
            <Badge variant="default" className="text-xs">Proposta Enviada</Badge>
          )}
          {crmProposalStatus === "none" && (
            <Badge variant="outline" className="text-xs">Sem Proposta</Badge>
          )}
          {sondagem && (
            <Badge variant="secondary" className="text-xs">
              {sondagem.completedCount}/{sondagem.totalCount}
            </Badge>
          )}
        </div>
      </div>

      {adAttributionContext && (
        <div className="rounded-md bg-muted/50 px-3 py-2 flex items-start gap-2">
          <Megaphone className="size-4 text-primary shrink-0 mt-1" />
          <p className="text-xs text-muted-foreground break-words leading-snug">{adAttributionContext}</p>
        </div>
      )}

      {sondagem && sondagem.pillars.length > 0 && (
        <ul className="space-y-2">
          {sondagem.pillars.map((pillar) => (
            <li key={pillar.key} className="flex items-start gap-2 text-xs">
              {pillar.completed ? (
                <CheckCircle2 className="size-4 text-primary shrink-0 mt-1" />
              ) : (
                <Circle className="size-4 text-muted-foreground shrink-0 mt-1" />
              )}
              <div className="min-w-0 flex-1">
                <p className={pillar.completed ? "font-medium text-foreground" : "text-muted-foreground"}>
                  {pillar.label}
                </p>
                {pillar.extractedSnippet && (
                  <p className="text-xs text-muted-foreground truncate">{pillar.extractedSnippet}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
