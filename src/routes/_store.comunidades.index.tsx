import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listCommunities } from "@/services/community.functions";
import {
  COMMUNITY_GRADIENT_PRESETS,
  COMMUNITY_TYPE_LABELS,
  type CommunityType,
  type CommunityGradientPreset,
} from "@/types/community";
import { CreateCommunityModal } from "@/components/community/CreateCommunityModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Plus, Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_store/comunidades/")({
  head: () => ({
    meta: [
      { title: "Comunidades & Grupos | Waesy" },
      {
        name: "description",
        content: "Descubra comunidades de discussões, vendas locais, notícias e eventos com design estilo Threads.",
      },
    ],
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
    <div className="min-h-[100dvh] bg-background text-foreground pb-24">
      {/* ─── Topo: Header do Diretório ─────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">
              Comunidades
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Participe de grupos temáticos estilo Threads ou crie seu próprio espaço.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="h-11 min-h-11 px-5 rounded-full font-bold text-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-primary shadow-xs"
          >
            <Plus className="size-4 mr-1.5" />
            <span>Criar Comunidade</span>
          </Button>
        </div>

        {/* Barra de Busca de Comunidades */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, @slug ou assunto..."
            className="h-11 min-h-11 pl-10 pr-4 rounded-full text-xs sm:text-sm bg-muted/40 border-border/60"
          />
        </div>

        {/* Régua de Abas / Categorias */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`h-9 px-4 rounded-full text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              activeTab === "all"
                ? "bg-primary text-primary-foreground"
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
              className={`h-9 px-4 rounded-full text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                activeTab === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {COMMUNITY_TYPE_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Grid de Comunidades com Visual Threads ──────────────────── */}
      <div className="max-w-3xl mx-auto px-4 py-2">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-44 rounded-3xl bg-muted/40 animate-pulse border border-border/40" />
            ))}
          </div>
        ) : communities.length === 0 ? (
          <div className="py-16 text-center space-y-4">
            <div className="size-16 rounded-full bg-muted/60 border border-border/60 mx-auto flex items-center justify-center text-muted-foreground">
              <Users className="size-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">Nenhuma comunidade encontrada</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Não encontramos comunidades com os filtros selecionados. Que tal criar a primeira?
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="h-11 min-h-11 px-6 rounded-full font-bold text-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
            >
              Criar Nova Comunidade
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {communities.map((comm) => {
              const preset =
                COMMUNITY_GRADIENT_PRESETS[comm.cover_gradient_preset as CommunityGradientPreset] ||
                COMMUNITY_GRADIENT_PRESETS["blue-lime"];

              return (
                <Link
                  key={comm.id}
                  to={`/_store/c/${comm.slug}` as any}
                  className="group relative rounded-3xl overflow-hidden border border-border/50 hover:border-border transition-all duration-200 block shadow-xs hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {/* Fundo Gradiente ou Imagem */}
                  <div
                    className={`h-24 sm:h-28 w-full relative bg-gradient-to-r ${preset.gradientClass}`}
                  >
                    {comm.cover_mode === "image" && comm.cover_image_url && (
                      <img
                        src={comm.cover_image_url}
                        alt={comm.title}
                        className="w-full h-full object-cover opacity-60 mix-blend-overlay"
                      />
                    )}
                    <div className="absolute top-3 left-3">
                      <span className="text-[10px] font-bold text-white/90 uppercase tracking-wider drop-shadow-xs">
                        {COMMUNITY_TYPE_LABELS[comm.community_type]}
                      </span>
                    </div>
                  </div>

                  {/* Informações do Card */}
                  <div className="p-4 bg-card space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
                          {comm.title}
                        </h3>
                        <span className="text-xs font-mono text-muted-foreground shrink-0">
                          /c/@{comm.slug}
                        </span>
                      </div>
                      {comm.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {comm.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                      <span className="font-semibold text-muted-foreground">
                        {comm.member_count} participante(s)
                      </span>
                      <span className="font-bold text-primary flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        <span>Acessar</span>
                        <ArrowRight className="size-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
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
