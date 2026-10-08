import * as React from "react";
import { Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReputationBadgesStripProps {
  content?: {
    badges?: Array<{
      title: string;
      desc: string;
      icon?: string;
      provenance_status?: "observed_verified" | "user_reported" | "legacy_unverified";
      source_url?: string;
    }>;
  };
  design_tokens?: any;
}

export function ReputationBadgesStrip({ content, design_tokens }: ReputationBadgesStripProps) {
  const badges = (content?.badges || []).filter(
    (badge) => badge.provenance_status === "observed_verified" && Boolean(badge.source_url),
  );

  return (
    <div className={cn("w-full max-w-5xl mx-auto py-6 px-4", design_tokens?.className)}>
      {badges.length === 0 ? (
        <p className="rounded-lg border border-border/60 bg-card/60 p-5 text-sm text-muted-foreground">
          Nenhum selo com fonte verificável está conectado. Não há certificação presumida.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {badges.map((badge, index) => (
            <div key={`${badge.title}-${index}`} className="p-4 rounded-lg border border-border/60 bg-card/60 flex items-start gap-3 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-xs text-foreground">{badge.title}</h4>
                <p className="text-[11px] text-muted-foreground leading-snug">{badge.desc}</p>
                <a className="text-[10px] text-primary underline" href={badge.source_url} target="_blank" rel="noreferrer">Ver fonte</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
