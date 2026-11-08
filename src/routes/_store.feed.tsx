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
import { MessageSquare, Loader2, Users, Compass, Plane, Image as ImageIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const [isComposerOpen, setIsComposerOpen] = useState(false);

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
    <div className="min-h-dvh bg-background text-foreground pb-24">
      {/* ─── Feed Container Central (Largura Padrão Editorial & Padrão 1px Mobile) ───────────── */}
      <div className="max-w-2xl mx-auto px-0 sm:px-4 py-2 sm:py-5 space-y-3 sm:space-y-4">
        {/* ── 1. Menu de Abas Discreto no Topo (Padrão TikTok / Threads) ── */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/40">
          <div className="flex items-center justify-between px-3 sm:px-4 h-11 min-h-11 gap-2">
            <div className="flex items-center gap-5 sm:gap-8 overflow-x-auto scroll-area-carousel no-scrollbar">
              {FEED_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={cn(
                      "h-11 min-h-11 px-1 flex items-center justify-center relative font-semibold text-xs sm:text-sm whitespace-nowrap transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isActive
                        ? "text-foreground font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <span>{tab.label}</span>
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
            <Link
              to="/comunidades"
              className="h-11 min-h-11 px-3 rounded-full bg-muted/60 hover:bg-muted text-xs font-semibold text-foreground flex items-center gap-2 shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer select-none"
            >
              <Users className="size-3.5 text-primary" />
              <span>Comunidades</span>
            </Link>
          </div>
        </div>

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
              <MessageSquare className="size-5 stroke-thin" />
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
        ) : (
          /* ── Modo Threads: Feed Editorial Contínuo & Flat (Zero Containeritis) ── */
          <div className="divide-y divide-border/40">
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

      {/* ── Botão Flutuante (+) Contextual Canônico Estilo Chat & Threads ── */}
      <button
        type="button"
        onClick={() => {
          if (!session?.user && !session?.id && !profile?.id) {
            toast.info("Faça login para publicar no feed social.");
            return;
          }
          setIsComposerOpen(true);
        }}
        aria-label="Criar nova publicação"
        title="Criar publicação"
        className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-30 size-14 rounded-full bg-primary text-primary-foreground shadow-xs hover:opacity-95 active:scale-95 transition-transform duration-200 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Plus className="size-6 stroke-bold" />
      </button>

      {/* ── Modal Canônico Nova Thread (Padrão Threads / Imagens 2 e 5) ── */}
      <Dialog open={isComposerOpen} onOpenChange={setIsComposerOpen}>
        <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden bg-background border-border/60">
          <DialogHeader className="px-4 py-3 border-b border-border/40 flex flex-row items-center justify-between space-y-0">
            <button
              type="button"
              onClick={() => setIsComposerOpen(false)}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md px-1 py-1"
            >
              Cancelar
            </button>
            <DialogTitle className="text-sm font-bold text-foreground text-center">
              Nova publicação
            </DialogTitle>
            <div className="w-12" />
          </DialogHeader>

          <div className="p-4 max-h-vh-80 overflow-y-auto">
            <InlinePostComposer
              session={session || (profile ? { user: profile } : undefined)}
              profile={profile}
              onSuccess={() => {
                setIsComposerOpen(false);
                toast.success("Publicação compartilhada no feed social!");
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
