/**
 * ============================================================================
 * Waesy Platform — CommunitySpacesView.tsx (Espaços de Comunidade Waesy)
 * ============================================================================
 * Visão completa do espaço de comunidade (/c/@slug):
 * - Header imersivo com capa, avatar squircle, título, slug canônico e botão de adesão.
 * - Biografia sem truncamento (AGENTS.md B.35: whitespace-pre-line break-words).
 * - Régua de abas horizontal contínua em linha única (AGENTS.md B.39).
 * - Abas especializadas: Discussões, Sessões/Encontros, Loja do Criador e Membros.
 * ============================================================================
 */

import React, { useEffect, useState } from "react";
import {
  Users,
  MessageSquare,
  Calendar,
  ShoppingBag,
  Share2,
  Check,
  Plus,
  ShieldCheck,
  Sparkles,
  MapPin,
  Clock,
  ArrowRight,
  Heart,
  Repeat2,
  Bookmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface CommunitySpaceData {
  id: string;
  slug: string; // ex: "tech-smo"
  title: string;
  description: string;
  avatarUrl?: string;
  coverUrl?: string;
  membersCount: number;
  isMember?: boolean;
  categoryName?: string;
  locationName?: string;
}

export interface CommunityThreadItem {
  id: string;
  authorName: string;
  authorUsername: string;
  authorAvatarUrl?: string;
  timeAgo: string;
  content: string;
  likesCount: number;
  repliesCount: number;
  hasLiked?: boolean;
}

export interface CommunitySessionItem {
  id: string;
  title: string;
  dateStr: string; // ex: "Quinta, 29 de Outubro às 19:30"
  location: string;
  priceCents: number; // 0 para gratuito
  rsvpsCount: number;
}

export interface CommunityProductItem {
  id: string;
  title: string;
  priceCents: number;
  coverUrl?: string;
  category: string;
}

export interface CommunitySpacesViewProps {
  community: CommunitySpaceData;
  threads?: CommunityThreadItem[];
  sessions?: CommunitySessionItem[];
  products?: CommunityProductItem[];
  onJoinToggle?: (isMember: boolean) => void;
  onNewThreadClick?: () => void;
  onLikeToggle?: (threadId: string, liked: boolean) => void;
  onRsvpClick?: (sessionId: string) => void;
  onProductClick?: (productId: string) => void;
  className?: string;
}

export function CommunitySpacesView({
  community,
  threads = [],
  sessions = [],
  products = [],
  onJoinToggle,
  onNewThreadClick,
  onLikeToggle,
  onRsvpClick,
  onProductClick,
  className,
}: CommunitySpacesViewProps) {
  const [activeTab, setActiveTab] = useState<"threads" | "sessions" | "shop" | "members">("threads");
  const [isMember, setIsMember] = useState(Boolean(community.isMember));
  const [likedThreads, setLikedThreads] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const hasActiveData =
      (activeTab === "threads" && threads.length > 0) ||
      (activeTab === "sessions" && sessions.length > 0) ||
      (activeTab === "shop" && products.length > 0) ||
      activeTab === "members";
    if (hasActiveData) return;
    setActiveTab(threads.length > 0 ? "threads" : sessions.length > 0 ? "sessions" : products.length > 0 ? "shop" : "members");
  }, [activeTab, products.length, sessions.length, threads.length]);

  const handleToggleLike = (threadId: string) => {
    if (!onLikeToggle) {
      toast.error("Ação de curtida indisponível neste espaço.");
      return;
    }
    const nextLiked = !likedThreads[threadId];
    setLikedThreads((prev) => ({ ...prev, [threadId]: nextLiked }));
    onLikeToggle(threadId, nextLiked);
  };

  const handleToggleJoin = () => {
    if (!onJoinToggle) {
      toast.error("A participação desta comunidade ainda não está conectada.");
      return;
    }
    const next = !isMember;
    setIsMember(next);
    onJoinToggle(next);
    if (next) {
      toast.success(`Você agora faz parte de ${community.title}!`);
    } else {
      toast.info(`Você saiu de ${community.title}.`);
    }
  };

  const handleNewThread = () => {
    if (!onNewThreadClick) {
      toast.error("A criação de discussões ainda não está conectada.");
      return;
    }
    onNewThreadClick();
  };

  const handleRsvp = (sessionId: string) => {
    if (!onRsvpClick) {
      toast.error("As inscrições desta sessão ainda não estão conectadas.");
      return;
    }
    onRsvpClick(sessionId);
  };

  const handleProductClick = (productId: string) => {
    if (!onProductClick) {
      toast.error("O catálogo desta comunidade ainda não está conectado.");
      return;
    }
    onProductClick(productId);
  };

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link da comunidade copiado!");
    }
  };

  return (
    <div className={cn("space-y-4 sm:space-y-6 max-w-4xl mx-auto", className)}>
      {/* ── 1. Capa e Avatar Squircle da Comunidade ── */}
      <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xs">
        {/* Capa */}
        <div className="relative w-full h-32 sm:h-48 bg-muted">
          {community.coverUrl && (
            <img
              src={community.coverUrl}
              alt={community.title}
              className="w-full h-full object-cover"
            />
          )}
          <button
            type="button"
            onClick={handleShare}
            className="absolute top-3 right-3 size-11 min-h-11 min-w-11 rounded-xl bg-background hover:bg-muted text-foreground flex items-center justify-center shadow-xs transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            aria-label="Compartilhar comunidade"
          >
            <Share2 className="size-4" />
          </button>
        </div>

        {/* Informações da Comunidade */}
        <div className="p-4 sm:p-6 space-y-4 -mt-10 sm:-mt-12 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="flex items-end gap-4">
              {/* Avatar Squircle Grande */}
              <div className="size-20 sm:size-24 rounded-2xl bg-card border-4 border-card shadow-md overflow-hidden flex items-center justify-center text-foreground font-black text-2xl shrink-0">
                {community.avatarUrl ? (
                  <img
                    src={community.avatarUrl}
                    alt={community.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{community.title.substring(0, 2).toUpperCase()}</span>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground leading-tight">
                    {community.title}
                  </h1>
                  <ShieldCheck className="size-5 text-primary shrink-0" />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                  <span className="font-mono text-primary">/c/@{community.slug}</span>
                  <span>•</span>
                  <span>{community.membersCount} membros</span>
                </div>
              </div>
            </div>

            {/* Botão de Entrar / Participar (Piso 44px) */}
            <Button
              type="button"
              onClick={handleToggleJoin}
              className={cn(
                "rounded-xl h-11 min-h-11 px-6 text-xs font-bold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                isMember
                  ? "bg-muted text-foreground hover:bg-muted/80 border border-border/80"
                  : "bg-foreground text-background hover:bg-foreground/90 shadow-xs"
              )}
            >
              {isMember ? (
                <>
                  <Check className="size-4 mr-2" />
                  <span>Participando</span>
                </>
              ) : (
                <>
                  <Plus className="size-4 mr-2" />
                  <span>Participar do Espaço</span>
                </>
              )}
            </Button>
          </div>

          {/* Biografia Integral sem Truncamento (AGENTS.md B.35) */}
          {community.description && (
            <p className="text-xs sm:text-sm text-foreground/90 whitespace-pre-line break-words leading-relaxed pt-1">
              {community.description}
            </p>
          )}
        </div>
      </div>

      {/* ── 2. Régua de Abas em Linha Única Horizontal Contínua (AGENTS.md B.39) ── */}
      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar p-1 rounded-2xl bg-muted/40 border border-border/60">
        {threads.length > 0 && <button
          type="button"
          onClick={() => setActiveTab("threads")}
          className={cn(
            "h-11 min-h-11 px-4 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-2 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
            activeTab === "threads"
              ? "bg-card text-foreground shadow-xs font-bold scale-101"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <MessageSquare className="size-4" />
          <span>Discussões ({threads.length})</span>
        </button>}

        {sessions.length > 0 && <button
          type="button"
          onClick={() => setActiveTab("sessions")}
          className={cn(
            "h-11 min-h-11 px-4 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-2 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
            activeTab === "sessions"
              ? "bg-card text-foreground shadow-xs font-bold scale-101"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Calendar className="size-4" />
          <span>Sessões & Encontros ({sessions.length})</span>
        </button>}

        {products.length > 0 && <button
          type="button"
          onClick={() => setActiveTab("shop")}
          className={cn(
            "h-11 min-h-11 px-4 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-2 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
            activeTab === "shop"
              ? "bg-card text-foreground shadow-xs font-bold scale-101"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ShoppingBag className="size-4" />
          <span>Loja do Criador ({products.length})</span>
        </button>}

        <button
          type="button"
          onClick={() => setActiveTab("members")}
          className={cn(
            "h-11 min-h-11 px-4 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-2 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
            activeTab === "members"
              ? "bg-card text-foreground shadow-xs font-bold scale-101"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Users className="size-4" />
          <span>Membros</span>
        </button>
      </div>

      {/* ── 3. Conteúdo das Abas ── */}

      {/* ABA 1: DISCUSSÕES (THREADS) */}
      {activeTab === "threads" && (
        <div className="space-y-3">
          {/* Caixa de Criação Rápida de Post */}
          <div className="p-4 rounded-2xl bg-card border border-border/80 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center font-bold text-xs shrink-0">
              EU
            </div>
            <button
              type="button"
              onClick={handleNewThread}
              className="flex-1 text-left text-xs text-muted-foreground h-11 min-h-11 px-4 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors flex items-center cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
            >
              Iniciar uma conversa ou compartilhar com o espaço...
            </button>
          </div>

          {/* Lista de Threads */}
          <div className="space-y-3">
            {threads.length === 0 ? (
              <div className="rounded-2xl bg-muted/30 p-6 text-center text-xs text-muted-foreground">
                Ainda não há discussões neste espaço.
              </div>
            ) : threads.map((t) => (
              <div
                key={t.id}
                className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-9 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                      {t.authorName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-foreground">
                          {t.authorName}
                        </span>
                        <span className="text-2xs text-muted-foreground">@{t.authorUsername}</span>
                      </div>
                      <span className="text-3xs text-muted-foreground">{t.timeAgo} atrás</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-foreground/90 whitespace-pre-line break-words leading-relaxed">
                  {t.content}
                </p>

                {/* Barra de Ações (Amei, Respostas, Repost, Salvar) */}
                <div className="flex items-center gap-4 pt-1 text-muted-foreground text-xs border-t border-border/30">
                  <button
                    type="button"
                    onClick={() => handleToggleLike(t.id)}
                    className={cn(
                      "h-11 min-h-11 px-2 flex items-center gap-2 hover:text-destructive transition-colors cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      likedThreads[t.id] && "text-destructive font-bold",
                    )}
                  >
                    <Heart className="size-4" />
                    <span>{t.likesCount + (likedThreads[t.id] ? 1 : 0)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNewThread}
                    className="h-11 min-h-11 px-2 flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <MessageSquare className="size-4" />
                    <span>{t.repliesCount}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    aria-label="Compartilhar discussão"
                    className="size-11 min-h-11 flex items-center justify-center hover:text-foreground transition-colors cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Repeat2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA 2: SESSÕES & EVENTOS */}
      {activeTab === "sessions" && (
        <div className="space-y-3">
          {sessions.length === 0 ? (
            <div className="rounded-2xl bg-muted/30 p-6 text-center text-xs text-muted-foreground">
              Ainda não há sessões publicadas.
            </div>
          ) : sessions.map((s) => (
            <div
              key={s.id}
              className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-2xs text-primary font-bold">
                  <Clock className="size-3.5" />
                  <span>{s.dateStr}</span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-foreground">{s.title}</h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="size-3.5" />
                  <span>{s.location}</span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                <span className="text-sm font-bold font-mono text-foreground">
                  {s.priceCents > 0 ? formatMoney(s.priceCents) : "Gratuito"}
                </span>
                <Button
                  type="button"
                  onClick={() => handleRsvp(s.id)}
                  className="rounded-xl h-11 min-h-11 px-5 text-xs font-bold bg-foreground text-background hover:bg-foreground/90 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Garantir Vaga ({s.rsvpsCount})
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ABA 3: LOJA DO CRIADOR */}
      {activeTab === "shop" && (
        products.length === 0 ? (
          <div className="rounded-2xl bg-muted/30 p-6 text-center text-xs text-muted-foreground">
            Ainda não há produtos publicados.
          </div>
        ) : <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {products.map((p) => (
            <div
              key={p.id}
              onClick={() => handleProductClick(p.id)}
              className="rounded-2xl bg-card border border-border/80 p-3 space-y-2 hover:border-foreground/30 transition-colors cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="w-full aspect-square rounded-xl bg-muted/40 flex items-center justify-center overflow-hidden">
                {p.coverUrl ? (
                  <img src={p.coverUrl} alt={p.title} className="w-full h-full object-cover" />
                ) : (
                  <ShoppingBag className="size-8 text-muted-foreground/40" />
                )}
              </div>
              <div>
                <span className="text-3xs text-muted-foreground uppercase font-bold block">{p.category}</span>
                <h4 className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">{p.title}</h4>
              </div>
              <div className="pt-1 flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold font-mono text-foreground">
                  {formatMoney(p.priceCents)}
                </span>
                <Button
                  type="button"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProductClick(p.id);
                  }}
                  className="rounded-xl h-11 min-h-11 px-4 text-2xs font-bold bg-foreground text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Ver
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ABA 4: MEMBROS */}
      {activeTab === "members" && (
        <div className="p-6 rounded-2xl bg-card border border-border/80 text-center space-y-2">
          <Users className="size-10 text-muted-foreground/50 mx-auto" />
          <h4 className="text-sm font-bold text-foreground">Comunidade Ativa</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {community.membersCount} membros participando, colaborando e compartilhando experiências.
          </p>
        </div>
      )}
    </div>
  );
}
