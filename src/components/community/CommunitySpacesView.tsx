/**
 * ============================================================================
 * Waesy Platform — CommunitySpacesView.tsx (Wix Spaces & Threads Parity)
 * ============================================================================
 * Visão completa do espaço de comunidade (/c/@slug):
 * - Header imersivo com capa, avatar squircle, título, slug canônico e botão de adesão.
 * - Biografia sem truncamento (AGENTS.md B.35: whitespace-pre-line break-words).
 * - Régua de abas horizontal contínua em linha única (AGENTS.md B.39).
 * - Abas especializadas: Discussões (Threads), Sessões/Encontros, Loja do Criador e Membros.
 * Ref: c5c10183-219b-40c5-8b6b-73e05775ced8.jpg, 771709069_18091591394562530_..._n.webp
 * ============================================================================
 */

import React, { useState } from "react";
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
  onRsvpClick?: (sessionId: string) => void;
  onProductClick?: (productId: string) => void;
  className?: string;
}

const DEFAULT_THREADS: CommunityThreadItem[] = [
  {
    id: "thread-1",
    authorName: "Lucas Alencar",
    authorUsername: "lucas.dev",
    timeAgo: "2h",
    content: "Alguém participando do hackathon local neste fim de semana? Estamos montando um time focado em soluções urbanas!",
    likesCount: 14,
    repliesCount: 6,
  },
  {
    id: "thread-2",
    authorName: "Mariana Costa",
    authorUsername: "maricosta",
    timeAgo: "5h",
    content: "Compartilhando as fotos do workshop de inteligência artificial de ontem. Foi incrível ver tantos criadores reunidos!",
    likesCount: 38,
    repliesCount: 12,
  },
];

const DEFAULT_SESSIONS: CommunitySessionItem[] = [
  {
    id: "session-1",
    title: "Encontro Mensal de Inovação & Networking",
    dateStr: "Quinta, 29 de Outubro às 19:30",
    location: "Hub de Negócios Central • Sala 04",
    priceCents: 0,
    rsvpsCount: 42,
  },
  {
    id: "session-2",
    title: "Masterclass: Crescimento Local com IA",
    dateStr: "Sábado, 07 de Novembro às 14:00",
    location: "Online ao Vivo com Certificado",
    priceCents: 4900,
    rsvpsCount: 19,
  },
];

const DEFAULT_PRODUCTS: CommunityProductItem[] = [
  {
    id: "prod-1",
    title: "Camiseta Oficial da Comunidade 100% Algodão",
    priceCents: 7990,
    category: "Vestuário",
  },
  {
    id: "prod-2",
    title: "Acesso Vitalício ao Grupo VIP de Mentoria",
    priceCents: 19700,
    category: "Conteúdo Digital",
  },
];

export function CommunitySpacesView({
  community,
  threads = DEFAULT_THREADS,
  sessions = DEFAULT_SESSIONS,
  products = DEFAULT_PRODUCTS,
  onJoinToggle,
  onNewThreadClick,
  onRsvpClick,
  onProductClick,
  className,
}: CommunitySpacesViewProps) {
  const [activeTab, setActiveTab] = useState<"threads" | "sessions" | "shop" | "members">("threads");
  const [isMember, setIsMember] = useState(Boolean(community.isMember));

  const handleToggleJoin = () => {
    const next = !isMember;
    setIsMember(next);
    onJoinToggle?.(next);
    if (next) {
      toast.success(`Você agora faz parte de ${community.title}!`);
    } else {
      toast.info(`Você saiu de ${community.title}.`);
    }
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
        <div className="relative w-full h-32 sm:h-48 bg-gradient-to-r from-primary/20 via-primary/5 to-muted/40">
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
            className="absolute top-3 right-3 size-11 min-h-11 min-w-11 rounded-xl bg-background/80 backdrop-blur-md hover:bg-background text-foreground flex items-center justify-center transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            aria-label="Compartilhar comunidade"
          >
            <Share2 className="size-4" />
          </button>
        </div>

        {/* Informações da Comunidade */}
        <div className="p-4 sm:p-6 space-y-4 -mt-10 sm:-mt-12 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="flex items-end gap-3.5">
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
                "rounded-xl h-11 min-h-11 px-6 text-xs font-bold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                isMember
                  ? "bg-muted text-foreground hover:bg-muted/80 border border-border/80"
                  : "bg-foreground text-background hover:bg-foreground/90 shadow-xs"
              )}
            >
              {isMember ? (
                <>
                  <Check className="size-4 mr-1.5" />
                  <span>Participando</span>
                </>
              ) : (
                <>
                  <Plus className="size-4 mr-1.5" />
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
        <button
          type="button"
          onClick={() => setActiveTab("threads")}
          className={cn(
            "h-11 min-h-11 px-4 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-2 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
            activeTab === "threads"
              ? "bg-card text-foreground shadow-xs font-bold scale-101"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <MessageSquare className="size-4" />
          <span>Discussões ({threads.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("sessions")}
          className={cn(
            "h-11 min-h-11 px-4 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-2 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
            activeTab === "sessions"
              ? "bg-card text-foreground shadow-xs font-bold scale-101"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Calendar className="size-4" />
          <span>Sessões & Encontros ({sessions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("shop")}
          className={cn(
            "h-11 min-h-11 px-4 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-2 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
            activeTab === "shop"
              ? "bg-card text-foreground shadow-xs font-bold scale-101"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ShoppingBag className="size-4" />
          <span>Loja do Criador ({products.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("members")}
          className={cn(
            "h-11 min-h-11 px-4 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-2 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
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
          <div className="p-3.5 rounded-2xl bg-card border border-border/80 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center font-bold text-xs shrink-0">
              EU
            </div>
            <button
              type="button"
              onClick={onNewThreadClick}
              className="flex-1 text-left text-xs text-muted-foreground h-11 min-h-11 px-3.5 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors flex items-center cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
            >
              Iniciar uma conversa ou compartilhar com o espaço...
            </button>
          </div>

          {/* Lista de Threads */}
          <div className="space-y-3">
            {threads.map((t) => (
              <div
                key={t.id}
                className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                      {t.authorName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
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
                    className="flex items-center gap-1.5 hover:text-rose-600 transition-colors cursor-pointer py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Heart className="size-4" />
                    <span>{t.likesCount}</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <MessageSquare className="size-4" />
                    <span>{t.repliesCount}</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
          {sessions.map((s) => (
            <div
              key={s.id}
              className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-2xs text-primary font-bold">
                  <Clock className="size-3.5" />
                  <span>{s.dateStr}</span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-foreground">{s.title}</h3>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
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
                  onClick={() => onRsvpClick?.(s.id)}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {products.map((p) => (
            <div
              key={p.id}
              onClick={() => onProductClick?.(p.id)}
              className="rounded-2xl bg-card border border-border/80 p-3 space-y-2 hover:border-foreground/30 transition-all cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                  size="sm"
                  className="rounded-xl h-9 px-3 text-2xs font-bold bg-foreground text-background"
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
