import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { InlinePostComposer } from "@/components/community/inline-post-composer";
import { PostCard } from "@/components/community/post-card";
import { getMuralFeed, type MuralFeedResponse } from "@/services/social.functions";
import { getProfile, getUserSession } from "@/services/auth.functions";
import { MessageSquare, Newspaper, Compass, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_store/mural")({
  head: () => ({
    meta: [
      { title: "Mural da Comunidade | Feed Social Waesy" },
      {
        name: "description",
        content: "Acompanhe publicações, novidades, fotos e histórias compartilhadas por pessoas, criadores e lojas locais.",
      },
    ],
  }),
  loader: async () => {
    try {
      const [feed, profile, session] = await Promise.all([
        getMuralFeed({ data: { limit: 20 } }).catch(() => ({ items: [], hasMore: false, nextCursor: null })),
        getProfile().catch(() => null),
        getUserSession().catch(() => null),
      ]);

    return { initialFeed: feed as MuralFeedResponse, profile, session };
    } catch (err) {
      console.error("[loader:_store.mural] Unhandled error:", err);
      return { initialFeed: null, profile: null, session: null };
    }
  },
  component: MuralPage,
});

function MuralPage() {
  const { initialFeed, profile, session } = ((Route.useLoaderData?.() as any) || {});
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const { data: feed, isLoading } = useQuery({
    queryKey: ["mural-feed", activeFilter],
    queryFn: () =>
      getMuralFeed({
        data: {
          limit: 20,
          post_type: activeFilter !== "all" ? (activeFilter as any) : undefined,
        },
      }),
    initialData: activeFilter === "all" ? initialFeed : undefined,
    staleTime: 30_000,
  });

  const items = feed?.items || [];

  return (
    <div className="min-h-[100dvh] bg-background text-foreground pb-24">
      {/* ─── Topo / Filtros Rápidos ────────────────────────────────── */}
      <div className="border-b border-border/40 bg-background sticky top-14 z-20">
        <div className="carousel max-w-2xl mx-auto px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`h-11 min-h-11 px-4 rounded-full text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                activeFilter === "all"
                  ? "bg-primary/10 text-primary border border-primary/25 font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent"
              }`}
            >
              Para Você
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("simple")}
              className={`h-11 min-h-11 px-4 rounded-full text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                activeFilter === "simple"
                  ? "bg-primary/10 text-primary border border-primary/25 font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent"
              }`}
            >
              Publicações
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("news")}
              className={`h-11 min-h-11 px-4 rounded-full text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                activeFilter === "news"
                  ? "bg-primary/10 text-primary border border-primary/25 font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent"
              }`}
            >
              Notícias Locais
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("travel")}
              className={`h-11 min-h-11 px-4 rounded-full text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                activeFilter === "travel"
                  ? "bg-primary/10 text-primary border border-primary/25 font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent"
              }`}
            >
              Roteiros
            </button>
          </div>
        </div>
      </div>

      {/* ─── Feed Container Central ─────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Composer de Postagem no topo do feed */}
        <InlinePostComposer session={session || (profile ? { user: profile } : undefined)} />

        {/* Lista de Posts */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-primary" />
            <span className="text-xs">Carregando feed...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center rounded-lg border border-border/60 bg-card space-y-3">
            <div className="size-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <MessageSquare className="size-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">O mural está silencioso</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Seja o primeiro a compartilhar uma foto, novidade ou dica com a comunidade!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((post: any) => (
              <PostCard
                key={post.id}
                item={post}
                session={session || (profile ? { user: profile } : undefined)}
                queryKey={["mural-feed", activeFilter]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
