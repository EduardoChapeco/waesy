import React, { useState } from "react";
import { Star, ShieldCheck, MessageCircle, Reply, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { respondToDealReview } from "@/services/deal-reviews.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CompanyReputationCardProps {
  stats: {
    average_rating: number;
    total_reviews: number;
    count_5_stars?: number;
    count_4_stars?: number;
    count_3_stars?: number;
    count_low_stars?: number;
    verified_percentage?: number;
  };
  reviews: any[];
  canRespond?: boolean;
  onReviewUpdated?: () => void;
}

export function CompanyReputationCard({
  stats,
  reviews,
  canRespond = false,
  onReviewUpdated,
}: CompanyReputationCardProps) {
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const handleSendReply = async (reviewId: string) => {
    if (!replyText.trim()) return;

    setIsSubmittingReply(true);
    try {
      await respondToDealReview({
        data: {
          reviewId,
          responseComment: replyText.trim(),
        },
      });

      toast.success("Resposta publicada com sucesso!");
      setReplyingId(null);
      setReplyText("");
      onReviewUpdated?.();
    } catch (err: any) {
      toast.error(err.message || "Erro ao publicar resposta.");
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const avg = Number(stats.average_rating) || 0;
  const total = stats.total_reviews || 0;

  return (
    <div className="space-y-6">
      {/* ── Painel Principal de Reputação & Score ── */}
      <div className="p-5 sm:p-6 rounded-3xl bg-muted/30 border border-border/40 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center justify-center size-20 rounded-2xl bg-foreground text-background shrink-0 shadow-md">
              <span className="text-3xl font-black font-display tracking-tight leading-none">
                {avg.toFixed(1)}
              </span>
              <div className="flex items-center gap-0.5 mt-1 text-amber-400">
                <Star className="size-3 fill-amber-400" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-base text-foreground tracking-tight">
                  Reputação do Estabelecimento
                </h3>
                <Badge variant="outline" className="text-[10px] font-bold gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                  <ShieldCheck className="size-3" />
                  <span>100% Auditada via Deals</span>
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Baseado em {total} {total === 1 ? "avaliação verificada" : "avaliações verificadas"} de clientes reais que iniciaram ou fecharam negócios.
              </p>
            </div>
          </div>
        </div>

        {/* Barras de Distribuição de Estrelas */}
        {total > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-border/30">
            {[
              { label: "5 Estrelas", count: stats.count_5_stars || 0 },
              { label: "4 Estrelas", count: stats.count_4_stars || 0 },
              { label: "3 Estrelas", count: stats.count_3_stars || 0 },
              { label: "1-2 Estrelas", count: stats.count_low_stars || 0 },
            ].map((bar, idx) => {
              const pct = total > 0 ? Math.round((bar.count / total) * 100) : 0;
              return (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground w-20 text-[11px] shrink-0">{bar.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground text-[10px] w-8 text-right shrink-0">{pct}%</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Feed de Avaliações ── */}
      <div className="space-y-3">
        <h4 className="font-bold text-sm text-foreground tracking-tight">
          Depoimentos de Compradores
        </h4>

        {reviews.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-muted/20 border border-border/30 space-y-1">
            <p className="text-xs font-semibold text-foreground">Nenhuma avaliação registrada ainda</p>
            <p className="text-[11px] text-muted-foreground">
              Assim que compradores iniciarem negociações ou fecharem pacotes, as avaliações auditadas aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((rev) => {
              const isReplying = replyingId === rev.id;

              return (
                <div
                  key={rev.id}
                  className="p-4 rounded-2xl bg-card border border-border/40 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="size-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground shrink-0 overflow-hidden border border-border/30">
                        {rev.reviewer?.avatar_url ? (
                          <img
                            src={rev.reviewer.avatar_url}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          rev.reviewer?.full_name?.slice(0, 2)?.toUpperCase() || "CL"
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-foreground">
                            {rev.reviewer?.full_name || "Comprador Verificado"}
                          </span>
                          <Badge variant="outline" className="text-[9px] font-bold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0">
                            Negócio Auditado
                          </Badge>
                        </div>
                        <span className="text-[10px] text-muted-foreground block">
                          {new Date(rev.created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={cn(
                            "size-3.5",
                            s <= rev.rating ? "fill-amber-400" : "text-muted-foreground/30"
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {rev.classified && (
                    <div className="text-[11px] text-muted-foreground px-2.5 py-1 rounded-lg bg-muted/40 inline-block">
                      Ref: <strong className="text-foreground">{rev.classified.title}</strong>
                    </div>
                  )}

                  {rev.comment && (
                    <p className="text-xs text-foreground/90 leading-relaxed">
                      "{rev.comment}"
                    </p>
                  )}

                  {/* Resposta do Lojista se existir */}
                  {rev.response_comment && (
                    <div className="ml-4 pl-3 border-l-2 border-primary/40 space-y-1 bg-muted/20 p-2.5 rounded-r-xl text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[11px] text-foreground flex items-center gap-1">
                          <Reply className="size-3 text-primary" />
                          Resposta da Empresa
                        </span>
                        {rev.responded_at && (
                          <span className="text-[9.5px] text-muted-foreground">
                            {new Date(rev.responded_at).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </div>
                      <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                        {rev.response_comment}
                      </p>
                    </div>
                  )}

                  {/* Ação de Resposta do Lojista */}
                  {canRespond && !rev.response_comment && (
                    <div className="pt-1">
                      {isReplying ? (
                        <div className="space-y-2 pt-2 border-t border-border/30">
                          <Textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Escreva sua resposta de agradecimento ou esclarecimento..."
                            className="text-xs rounded-xl min-h-[70px] resize-none"
                            maxLength={1000}
                          />
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setReplyingId(null);
                                setReplyText("");
                              }}
                              className="h-8 text-xs rounded-lg"
                              disabled={isSubmittingReply}
                            >
                              Cancelar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleSendReply(rev.id)}
                              className="h-8 text-xs font-bold rounded-lg bg-foreground text-background hover:bg-foreground/90"
                              disabled={isSubmittingReply || !replyText.trim()}
                            >
                              {isSubmittingReply ? "Enviando..." : "Responder"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReplyingId(rev.id);
                            setReplyText("");
                          }}
                          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 rounded-lg"
                        >
                          <Reply className="size-3" />
                          <span>Responder feedback</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
