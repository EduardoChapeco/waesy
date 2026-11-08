// motion-reduce: safe
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listCommunities } from "@/services/community.functions";
import {
  COMMUNITY_TYPE_LABELS,
  type CommunityType,
} from "@/types/community";
import { CreateCommunityModal } from "@/components/community/CreateCommunityModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, Plus, ArrowRight } from "lucide-react";
import { buildUniversalHead } from "@/lib/seo/universal-seo-head";

export const Route = createFileRoute("/_store/comunidades/")({
  head: () =>
    buildUniversalHead({
      title: "Comunidades Locais | Waesy",
      description:
        "Espaços e grupos de interesse local para discussões, comércio, notícias e eventos.",
      path: "/comunidades",
      ogType: "website",
      webmcpType: "communities_index",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Comunidades e Grupos Locais",
        description: "Espaços locais e grupos de interesse no Waesy.",
        url: "https://waesy.com.br/comunidades",
      },
    }),
  loader: async () => {
    try {
      const initialList = await listCommunities({ data: { limit: 20 } }).catch(() => ({
        items: [],
        hasMore: false,
        nextCursor: null,
      }));
      return { initialList };
    } catch {
      return { initialList: { items: [], hasMore: false, nextCursor: null } };
    }
  },
  component: CommunitiesDirectoryPage,
});

function CommunitiesDirectoryPage() {
  const { initialList } = Route.useLoaderData();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: listData, isLoading } = useQuery({
    queryKey: ["communities-list", activeTab, searchTerm],
    queryFn: () =>
      listCommunities({
        data: {
          type: activeTab !== "all" ? (activeTab as CommunityType) : undefined,
          search: searchTerm.trim() || undefined,
          limit: 30,
        },
      }),
    initialData: activeTab === "all" && !searchTerm ? initialList : undefined,
    staleTime: 30_000,
  });

  const communities = listData?.items || [];

  return (
    <div className="min-h-dvh bg-background text-foreground pb-28 sm:pb-16">
      {/* ─── Topo: Header Canônico ─────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-2 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Comunidades
            </h1>
            {communities.length > 0 && (
              <span className="text-xs font-mono text-muted-foreground font-semibold">
                ({communities.length})
              </span>
            )}
          </div>

          {/* Botão Primário Único da Superfície (B.8) */}
          <Button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="h-11 min-h-11 px-4 rounded-xl font-semibold text-xs sm:text-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-primary shrink-0"
          >
            <Plus className="size-4 mr-2" />
            <span>Criar Comunidade</span>
          </Button>
        </div>

        {/* Campo de Busca */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou tema..."
            className="h-11 min-h-11 pl-10 pr-4 rounded-xl text-xs sm:text-sm bg-muted/30 border border-border/50"
          />
        </div>

        {/* Trilho de Categorias (Padrão Threads) */}
        // design-lint-ignore DL-30 reason:"Trilho horizontal de categorias no estilo Threads" expiry:"2027-12-31"
        <div className="flex items-center gap-2 overflow-x-auto scroll-area-carousel scrollbar-none py-1">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`h-11 min-h-11 px-4 rounded-full text-xs font-semibold transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              activeTab === "all"
                ? "bg-foreground text-background"
                : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Todas
          </button>
          {(Object.keys(COMMUNITY_TYPE_LABELS) as CommunityType[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`h-11 min-h-11 px-4 rounded-full text-xs font-semibold transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                activeTab === key
                  ? "bg-foreground text-background"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {COMMUNITY_TYPE_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Lista de Comunidades (Sem Containeritis) ───────────────────── */}
      <div className="max-w-3xl mx-auto px-4 py-2">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-36 rounded-2xl bg-muted/40 animate-pulse border border-border/40"
              />
            ))}
          </div>
        ) : communities.length === 0 ? (
          /* Empty State Honesto e Minimalista */
          <div className="py-16 text-center space-y-3">
            <div className="size-12 rounded-full bg-muted/40 border border-border/40 mx-auto flex items-center justify-center text-muted-foreground">
              <Users className="size-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-foreground">
                Nenhuma comunidade encontrada
              </h2>
              <p className="text-xs text-muted-foreground">
                Nenhum grupo ativo cadastrado nesta categoria.
              </p>
            </div>
            <div className="pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(true)}
                className="h-11 min-h-11 px-5 rounded-xl font-semibold text-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Plus className="size-4 mr-2" />
                <span>Nova Comunidade</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {communities.map((comm: any) => (
              <Link
                key={comm.id}
                to={`/_store/c/${comm.slug}` as any}
                className="group relative rounded-2xl border border-border/50 bg-card hover:bg-muted/20 transition-colors p-4 space-y-3 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {comm.title}
                    </h3>
                    <span className="text-xs font-semibold px-2 py-1 rounded-md bg-muted text-muted-foreground shrink-0 uppercase tracking-wide">
                      {COMMUNITY_TYPE_LABELS[comm.community_type as keyof typeof COMMUNITY_TYPE_LABELS] || comm.community_type}
                    </span>
                  </div>

                  <p className="text-xs font-mono text-muted-foreground">
                    /c/@{comm.slug}
                  </p>

                  {comm.description ? (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {comm.description}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/30 text-xs">
                  <span className="font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="size-4 text-muted-foreground" />
                    <span>{comm.member_count} participante(s)</span>
                  </span>
                  <span className="font-semibold text-primary flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Acessar</span>
                    <ArrowRight className="size-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <CreateCommunityModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </div>
  );
}
