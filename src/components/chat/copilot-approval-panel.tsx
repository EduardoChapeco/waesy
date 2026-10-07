import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Clock3, Loader2, ShieldCheck, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getBrowserClient } from "@/lib/supabase";
import { reviewAiChatAction } from "@/services/ai-conversations.functions";
import { cn } from "@/lib/utils";

type ApprovalRow = {
  id: string;
  action_type: "request_travel_quote" | "submit_legal_demand" | "publish_ad";
  payload: Record<string, unknown>;
  status: "pending" | "approved" | "rejected" | "expired" | "failed";
  requested_at: string;
  expires_at: string;
  store_id: string | null;
  user_id: string;
};

const ACTION_LABELS: Record<ApprovalRow["action_type"], string> = {
  request_travel_quote: "Solicitação de cotação",
  submit_legal_demand: "Demanda jurídica",
  publish_ad: "Publicação de anúncio",
};

const SENSITIVE_KEYS = /token|secret|password|credential|authorization|apikey|api_key/i;

function summarizePayload(payload: Record<string, unknown>) {
  return Object.entries(payload)
    .filter(([key, value]) => !SENSITIVE_KEYS.test(key) && value !== null && value !== undefined && value !== "")
    .slice(0, 5)
    .map(([key, value]) => {
      const text = typeof value === "object" ? JSON.stringify(value) : String(value);
      return { key: key.replaceAll("_", " "), value: text.slice(0, 140) };
    });
}

function formatRemaining(expiresAt: string) {
  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  if (remainingMs <= 0) return "Expirada";
  const hours = Math.floor(remainingMs / 3_600_000);
  if (hours > 0) return `Expira em ${hours}h`;
  return `Expira em ${Math.max(1, Math.floor(remainingMs / 60_000))}min`;
}

export function CopilotApprovalPanel({ currentUserId }: { currentUserId?: string }) {
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const loadApprovals = useCallback(async () => {
    if (!currentUserId) {
      setApprovals([]);
      return;
    }
    setLoading(true);
    try {
      const client = getBrowserClient();
      const { data, error: queryError } = await client
        .from("copilot_action_approvals")
        .select("id, action_type, payload, status, requested_at, expires_at, store_id, user_id")
        .eq("status", "pending")
        .order("requested_at", { ascending: false })
        .limit(20);
      if (queryError) throw queryError;
      setApprovals((data || []) as ApprovalRow[]);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar aprovações.");
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    void loadApprovals();
    if (!currentUserId) return;
    let channel: ReturnType<ReturnType<typeof getBrowserClient>["channel"]> | null = null;
    try {
      const client = getBrowserClient();
      channel = client
        .channel(`copilot-approvals-${currentUserId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "copilot_action_approvals" }, () => {
          void loadApprovals();
        })
        .subscribe();
    } catch {
      // O carregamento inicial continua funcional quando realtime estiver indisponível.
    }
    return () => {
      if (channel) getBrowserClient().removeChannel(channel);
    };
  }, [currentUserId, loadApprovals]);

  const pendingCountLabel = useMemo(() => `${approvals.length} pendente${approvals.length === 1 ? "" : "s"}`, [approvals.length]);

  const review = async (approvalId: string, decision: "approve" | "reject") => {
    setReviewingId(approvalId);
    try {
      const result = await reviewAiChatAction({
        data: {
          approvalId,
          decision,
          reason: decision === "reject" ? rejectReasons[approvalId]?.trim() || undefined : undefined,
        },
      });
      if (result.status === "rejected") {
        setApprovals((previous) => previous.filter((item) => item.id !== approvalId));
      } else if (result.status === "approved") {
        setApprovals((previous) => previous.filter((item) => item.id !== approvalId));
      }
      setError(null);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Não foi possível revisar a aprovação.");
      await loadApprovals();
    } finally {
      setReviewingId(null);
    }
  };

  if (!currentUserId || (approvals.length === 0 && !loading && !error)) return null;

  return (
    <section aria-label="Aprovações pendentes do Copilot" className="mx-auto w-full max-w-3xl rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 rounded-md bg-amber-500/15 p-1.5 text-amber-700 dark:text-amber-300">
            <ShieldCheck className="size-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-foreground">Revisão humana necessária</h2>
            <p className="mt-0.5 text-2xs text-muted-foreground">{pendingCountLabel}. Nenhuma ação externa será executada sem confirmação.</p>
          </div>
        </div>
        {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-2xs text-destructive">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {approvals.map((approval) => (
          <article key={approval.id} className="rounded-lg border border-border/70 bg-background/80 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-foreground">{ACTION_LABELS[approval.action_type]}</h3>
                <Badge variant="outline" className="text-2xs">Pendente</Badge>
              </div>
              <span className={cn("inline-flex items-center gap-1 text-2xs", new Date(approval.expires_at).getTime() <= Date.now() ? "text-destructive" : "text-muted-foreground")}>
                <Clock3 className="size-3" />
                {formatRemaining(approval.expires_at)}
              </span>
            </div>

            <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2">
              {summarizePayload(approval.payload).map((item) => (
                <div key={`${approval.id}-${item.key}`} className="min-w-0 text-2xs">
                  <dt className="inline capitalize text-muted-foreground">{item.key}: </dt>
                  <dd className="inline break-words text-foreground">{item.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Input
                value={rejectReasons[approval.id] || ""}
                onChange={(event) => setRejectReasons((previous) => ({ ...previous, [approval.id]: event.target.value }))}
                placeholder="Motivo da rejeição (opcional)"
                maxLength={500}
                className="h-9 text-2xs sm:max-w-xs"
                aria-label="Motivo da rejeição"
              />
              <Button type="button" variant="outline" size="sm" disabled={reviewingId === approval.id} onClick={() => void review(approval.id, "reject")} className="h-9 gap-1 text-2xs text-destructive hover:bg-destructive/10">
                <X className="size-3.5" /> Rejeitar
              </Button>
              <Button type="button" size="sm" disabled={reviewingId === approval.id} onClick={() => void review(approval.id, "approve")} className="h-9 gap-1 text-2xs">
                {reviewingId === approval.id ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                Aprovar e executar
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
