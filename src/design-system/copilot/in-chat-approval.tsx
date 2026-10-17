import * as React from "react";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InChatApprovalProps {
  title: string;
  summary: string;
  amount?: string;
  metadata?: { label: string; value: string }[];
  onApprove: () => void;
  onReject: () => void;
  status?: "pending" | "approved" | "rejected";
  isLoading?: boolean;
  className?: string;
}

export function InChatApproval({
  title,
  summary,
  amount,
  metadata = [],
  onApprove,
  onReject,
  status = "pending",
  isLoading = false,
  className,
}: InChatApprovalProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/80 bg-card p-4 my-2 select-none space-y-3 max-w-md",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-primary shrink-0" />
            <h4 className="text-sm font-semibold text-foreground">{title}</h4>
          </div>
          <p className="text-xs text-muted-foreground">{summary}</p>
        </div>

        {amount && (
          <span className="text-base font-bold text-foreground font-mono tabular-nums shrink-0">
            {amount}
          </span>
        )}
      </div>

      {metadata.length > 0 && (
        <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-muted/30 text-xs">
          {metadata.map((item, idx) => (
            <div key={idx} className="space-y-1">
              <span className="text-3xs text-muted-foreground block">{item.label}</span>
              <span className="font-medium text-foreground truncate block">{item.value}</span>
            </div>
          ))}
        </div>
      )}

      {status === "pending" ? (
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
          <button
            type="button"
            onClick={onReject}
            disabled={isLoading}
            className="min-h-10 px-4 py-2 rounded-lg border border-border/80 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            Recusar
          </button>
          <button
            type="button"
            onClick={onApprove}
            disabled={isLoading}
            className="min-h-10 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            Aprovar
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 pt-2 border-t border-border/40 text-xs font-medium">
          {status === "approved" ? (
            <>
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span className="text-emerald-700 dark:text-emerald-400">Aprovado</span>
            </>
          ) : (
            <>
              <XCircle className="size-4 text-rose-600" />
              <span className="text-rose-700 dark:text-rose-400">Recusado</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
