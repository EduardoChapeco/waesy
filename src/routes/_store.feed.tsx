import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { InlinePostComposer } from "@/components/community/inline-post-composer";
import { PostCard } from "@/components/community/post-card";
import { FeedThreadPostCard } from "@/components/community/FeedThreadPostCard";
import { UnifiedFeedCard } from "@/components/commerce/unified-feed-card";
import { LayoutGrid, AlignLeft } from "lucide-react";
import { FeedBannerBlock } from "@/components/community/feed-banner-block";
import { FloatingCommunityDock } from "@/components/community/floating-community-dock";
import { StoryRail } from "@/components/community/story-rail";
import { SuggestedFriendsBlock } from "@/components/community/suggested-friends-block";
import { ThumbnailPreviewRail } from "@/components/community/thumbnail-preview-rail";
import { MomentsStatusPicker } from "@/components/social/moments-status-picker";
import { getMuralFeed, type MuralFeedResponse } from "@/services/social.functions";
import { getProfile, getUserSession } from "@/services/auth.functions";
import { MessageSquare, Loader2, Users, Compass, Plane, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_store/feed")({
  head: () => ({
    meta: [
      { title: "Feed Social da Comunidade | Waesy" },
      {
        name: "description",
        content:
          "Acompanhe publicações, fotos, viagens, novidades e histórias compartilhadas por pessoas, criadores e lojas locais.",
      },
    ],
  }),
  loader: async () => {
    try {
      const [feed, profile, session] = await Promise.all([
        getMuralFeed({ data: { limit: 20, tab: "for_you" } }).catch(() => ({
          items: [],
          hasMore: false,
          nextCursor: null,
        })),
        getProfile().catch(() => null),
        getUserSession().catch(() => null),
      ]);

      return { initialFeed: feed as MuralFeedResponse, profile, session };
    } catch (err) {
      console.error("[loader:_store.feed] Unhandled error:", err);
      return { initialFeed: null, profile: null, session: null };
    }
  },
  component: FeedPage,
});

type FeedTab = "for_you" | "following" | "explore" | "travel" | "photos";

const FEED_TABS: { id: FeedTab; label: string }[] = [
  { id: "for_you", label: "Para Você" },
  { id: "following", label: "Seguindo" },
  { id: "explore", label: "Explorar" },
  { id: "travel", label: "Viagens" },
  { id: "photos", label: "Fotos" },
];

function FeedPage() {
  const { initialFeed, profile, session } = ((Route.useLoaderData?.() as any) || {});
  const [activeTab, setActiveTab] = useState<FeedTab>("for_you");
  const [displayMode, setDisplayMode] = useState<"threads" | "instagram">("threads");

  const { data: feed, isLoading } = useQuery({
    queryKey: ["community-feed", activeTab],
    queryFn: () =>
      getMuralFeed({
        data: {
          limit: 20,
          tab: activeTab,
        },
      }),
    initialData: activeTab === "for_you" ? initialFeed : undefined,
    staleTime: 30_000,
  });

  const items = feed?.items || [];
  const requiresAuth = feed?.requiresAuth;
  const emptyFollowing = feed?.emptyFollowing;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground pb-24">
      {/* ─── Feed Container Central (Largura Padrão Editorial & Padrão 1px Mobile) ───────────── */}
      <div className="max-w-2xl mx-auto px-0 sm:px-4 py-2 sm:py-5 space-y-3 sm:space-y-4">
        {/* ── 1. Menu de Abas Canônicas (Apple HIG) ───────────────────────── */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar px-0">
          <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl border border-border/40 grow sm:grow-0 overflow-x-auto no-scrollbar">
            {FEED_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-11 min-h-11 px-4 sm:px-4 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors duration-200 cursor-pointer select-none ${
                    isActive
                      ? "bg-card text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id === "photos") setDisplayMode("instagram");
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Alternador de Visualização Canônica: Threads (Editorial) vs Instagram (Grade Visual) */}
          <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl border border-border/40 shrink-0">
            <button
              type="button"
              className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center transition-colors duration-200 cursor-pointer select-none ${
                displayMode === "threads"
                  ? "bg-card text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
              onClick={() => setDisplayMode("threads")}
              title="Modo Threads (Editorial & Conversas)"
              aria-label="Modo Threads"
            >
              <AlignLeft className="size-4" />
            </button>
            <button
              type="button"
              className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center transition-colors duration-200 cursor-pointer select-none ${
                displayMode === "instagram"
                  ? "bg-card text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
              onClick={() => setDisplayMode("instagram")}
              title="Modo Instagram (Grade Fotográfica)"
              aria-label="Modo Instagram"
            >
              <LayoutGrid className="size-4" />
            </button>
          </div>
        </div>

        {/* ── 2. Composer de Postagem (Superfície Única — Zero Card Duplo) ──── */}
        <InlinePostComposer
          session={session || (profile ? { user: profile } : undefined)}
          profile={profile}
        />

        {/* ── 3. Lista de Publicações & Estados da Comunidade ───────────────── */}
        {isLoading ? (
          <div className="py-14 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-6 animate-spin motion-reduce:animate-none text-primary" />
            <span className="text-xs">Carregando feed...</span>
          </div>
        ) : activeTab === "following" && requiresAuth ? (
          <div className="p-8 text-center rounded-lg border border-border/60 bg-card space-y-3">
            <div className="size-11 rounded-lg bg-primary/10 flex items-center justify-center mx-auto text-primary">
              <Users className="size-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">Acompanhe quem você segue</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Faça login para ver publicações, fotos e histórias das pessoas e empresas que você escolheu acompanhar.
              </p>
            </div>
            <Button asChild className="h-11 px-6 rounded-lg font-bold text-xs mt-2">
              <Link to="/entrar" search={{ returnUrl: "/feed" }}>
                Entrar na Conta
              </Link>
            </Button>
          </div>
        ) : activeTab === "following" && emptyFollowing ? (
          <div className="p-8 text-center rounded-lg border border-border/60 bg-card space-y-3">
            <div className="size-11 rounded-lg bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <Compass className="size-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">Você ainda não segue ninguém</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Explore o feed da comunidade e siga perfis de criadores, amigos e lojas locais para ver as atualizações deles aqui.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveTab("explore")}
              className="h-11 px-6 rounded-lg font-bold text-xs border-border/60 mt-2 cursor-pointer"
            >
              Explorar Comunidade
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-3">
            <div className="size-12 rounded-lg bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
              <MessageSquare className="size-5 stroke-[1.5]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">
                {activeTab === "travel"
                  ? "Nenhuma viagem registrada ainda"
                  : activeTab === "photos"
                  ? "Nenhuma foto compartilhada ainda"
                  : "O feed está silencioso"}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {activeTab === "travel"
                  ? "Compartilhe seu próximo roteiro de viagem, dicas de passeio ou destinos favoritos!"
                  : activeTab === "photos"
                  ? "Seja o primeiro a publicar fotos e momentos visuais com a comunidade!"
                  : "Seja o primeiro a compartilhar uma história, dica ou novidade com a cidade!"}
              </p>
            </div>
          </div>
        ) : displayMode === "instagram" || activeTab === "photos" ? (
          /* ── Modo Instagram: Grade Fotográfica 3 Colunas (CLS = 0) ── */
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {items.map((post: any) => (
              <UnifiedFeedCard
                key={post.id}
                post={{
                  id: post.id,
                  content_text: post.content_text,
                  media_urls: post.media_urls,
                  media_url: post.media_urls?.[0],
                  likes_count: post.likes_count,
                  comments_count: post.comments_count ?? post.replies_count ?? 0,
                  author: {
                    id: post.author?.id,
                    full_name: post.author?.name,
                    avatar_url: post.author?.avatar_url,
                    is_verified: post.author?.is_verified,
                  },
                  created_at: post.created_at,
                }}
                mode="grid"
              />
            ))}
          </div>
        ) : (
          /* ── Modo Threads: Card Editorial com Linha Contínua & Ações Táteis ── */
          <div className="space-y-3 sm:space-y-4">
            {items.map((post: any) => (
              <FeedThreadPostCard
                key={post.id}
                post={post}
                session={session || (profile ? { user: profile } : undefined)}
                queryKey={["community-feed", activeTab]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
