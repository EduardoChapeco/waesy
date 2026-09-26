import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Sparkles,
  ArrowLeft,
  Plus,
  Globe,
  PenSquare,
  SlidersHorizontal,
  ExternalLink,
  Eye,
  TrendingUp,
  ShoppingBag,
  Coins,
  ShieldCheck,
  CheckCircle2,
  Share2,
  Copy,
  Edit3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { getCreatorNicheLabel } from "@/lib/constants/creator-niches";
import { CreatorProfileSheetEditor, CreatorProfileSheetData } from "@/components/profile/creator-profile-sheet-editor";
import {
  getMyCreatorProfilesList,
} from "@/services/affiliates.functions";
import { getProfile, getUserSession } from "@/services/auth.functions";

export const Route = createFileRoute("/_store/conta/criadores")({
  head: () => ({
    meta: [
      { title: "Perfis de Criador & Parcerias | Waesy" },
      {
        name: "description",
        content:
          "Gerencie seus perfis de criador de conteúdo, vitrines digitais de afiliados e identidades de publicação na Rede Waesy.",
      },
    ],
  }),
  loader: async () => {
    try {
      const [profile, session, profilesList] = await Promise.all([
        getProfile().catch(() => null),
        getUserSession().catch(() => null),
        getMyCreatorProfilesList().catch(() => []),
      ]);

      return { profile, session, initialList: profilesList || [] };
    } catch {
      return { profile: null, session: null, initialList: [] };
    }
  },
  component: CreatorProfilesManagementPage,
});

function CreatorProfilesManagementPage() {
  const { profile, initialList } = ((Route.useLoaderData?.() as any) || {});
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: creatorProfiles = [], isLoading } = useQuery({
    queryKey: ["my-creator-profiles-list"],
    queryFn: () => getMyCreatorProfilesList(),
    initialData: initialList?.length > 0 ? initialList : undefined,
    staleTime: 15_000,
  });

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorInitialData, setEditorInitialData] = useState<Partial<CreatorProfileSheetData> | null>(null);
  const [isEditorNew, setIsEditorNew] = useState(false);
  const [copiedHandle, setCopiedHandle] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHandle(text);
    toast.success("Link copiado!");
    setTimeout(() => setCopiedHandle(null), 2000);
  };

  const handleOpenNew = () => {
    setEditorInitialData({
      handle: "",
      stageName: profile?.fullName || profile?.full_name || "",
      bio: "",
      category: "moda_estilo",
      avatarUrl: profile?.avatarUrl || "",
      coverUrl: profile?.coverUrl || "",
    });
    setIsEditorNew(true);
    setEditorOpen(true);
  };

  const handleOpenEdit = (cp: any) => {
    setEditorInitialData({
      handle: cp.handle,
      stageName: cp.stage_name || cp.name || cp.handle,
      bio: cp.bio || "",
      category: cp.category || cp.niche || "moda_estilo",
      avatarUrl: cp.avatar_url || "",
      coverUrl: cp.cover_url || "",
      socialLinks: cp.social_links || {},
      pinnedProducts: cp.pinned_products || [],
      privacyMode: cp.privacy_mode || "public",
      isAnonymous: cp.is_anonymous ?? false,
    });
    setIsEditorNew(false);
    setEditorOpen(true);
  };

  const handleEditorSuccess = async () => {
    await queryClient.invalidateQueries({ queryKey: ["my-creator-profiles-list"] });
    await queryClient.invalidateQueries({ queryKey: ["my-affiliate-overview"] });
    router.invalidate();
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* ─── Top Bar Executiva Apple HIG ────────────────────────────── */}
      <div className="border-b border-border/40 bg-card/60 backdrop-blur-md px-4 sm:px-6 py-4 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="size-11 rounded-full hover:bg-muted/80 active:scale-95 transition-all"
              aria-label="Voltar para Minha Conta"
            >
              <Link to="/conta">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>Perfis de Criador & Parcerias</span>
                <Badge variant="outline" className="text-xs font-mono">
                  {creatorProfiles.length}
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground">
                Suas identidades artísticas, vitrines de recomendação e links de afiliação.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleOpenNew}
            className="h-9 px-3.5 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>Novo Perfil</span>
          </Button>
        </div>
      </div>

      {/* ─── Conteúdo Principal ────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-0 sm:px-4 md:px-0 py-6 space-y-6">
        {creatorProfiles.length === 0 && !isLoading ? (
          <div className="p-8 sm:p-12 text-center rounded-3xl border border-border/60 bg-card space-y-4 max-w-lg mx-auto shadow-xs">
            <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Sparkles className="size-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-foreground">Nenhum perfil de criador ativo</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ative seu perfil para monetizar recomendações de lojas locais, publicar como marca no feed e acumular tokens comunitários.
              </p>
            </div>
            <Button
              type="button"
              onClick={handleOpenNew}
              className="h-11 px-6 rounded-xl text-xs font-semibold gap-2 cursor-pointer"
            >
              <Plus className="size-4" />
              <span>Criar Meu Primeiro Perfil</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {creatorProfiles.map((cp: any) => {
              const handle = cp.handle;
              const showcaseUrl = typeof window !== "undefined"
                ? `${window.location.origin}/u/${handle}`
                : `https://usewaesy.com.br/u/${handle}`;

              return (
                <div
                  key={cp.id || handle}
                  className="p-5 sm:p-6 rounded-3xl border border-border/60 bg-card shadow-xs space-y-5 transition-all hover:border-border"
                >
                  {/* Cabeçalho do Card */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="size-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-base uppercase shrink-0 overflow-hidden">
                        {cp.avatar_url ? (
                          <img src={cp.avatar_url} alt={handle} className="size-full object-cover" />
                        ) : (
                          handle.slice(0, 2)
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-foreground">
                            {cp.stage_name || cp.name || handle}
                          </h3>
                          <Badge variant="outline" className="text-[11px] font-mono font-semibold">
                            @{handle}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] bg-muted/60">
                            {getCreatorNicheLabel(cp.category || cp.niche)}
                          </Badge>
                        </div>
                        {cp.bio && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{cp.bio}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(cp)}
                        className="h-9 px-3 rounded-xl text-xs gap-1.5 font-medium cursor-pointer"
                      >
                        <Edit3 className="size-3.5" />
                        <span>Editar Perfil</span>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(showcaseUrl)}
                        className="h-9 px-3 rounded-xl text-xs gap-1.5 font-medium cursor-pointer"
                      >
                        {copiedHandle === showcaseUrl ? (
                          <CheckCircle2 className="size-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                        <span>{copiedHandle === showcaseUrl ? "Copiado!" : "Copiar Vitrine"}</span>
                      </Button>

                      <Button asChild variant="outline" size="sm" className="h-9 px-3 rounded-xl text-xs gap-1.5 font-medium">
                        <Link to="/u/$username" params={{ username: handle }}>
                          <Globe className="size-3.5" />
                          <span>Ver Vitrine</span>
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Telemetria Compacta */}
                  <div className="grid grid-cols-3 gap-2.5 pt-1">
                    <div className="p-3 rounded-2xl bg-muted/20 border border-border/40 space-y-0.5">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                        Cliques
                      </span>
                      <p className="text-base font-bold text-foreground">
                        {(cp.total_clicks || 0).toLocaleString("pt-BR")}
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-muted/20 border border-border/40 space-y-0.5">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                        Pedidos
                      </span>
                      <p className="text-base font-bold text-foreground">{cp.total_orders || 0}</p>
                    </div>

                    <div className="p-3 rounded-2xl bg-muted/20 border border-border/40 space-y-0.5">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                        GMV Gerado
                      </span>
                      <p className="text-base font-bold text-foreground">
                        {formatMoney(cp.total_gmv_cents || 0)}
                      </p>
                    </div>
                  </div>

                  {/* Ações de Operação */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40">
                    <Button asChild variant="outline" size="sm" className="h-9 px-3 rounded-xl text-xs font-semibold gap-1.5">
                      <Link to="/feed">
                        <PenSquare className="size-3.5" />
                        <span>Publicar como @{handle}</span>
                      </Link>
                    </Button>

                    <Button asChild size="sm" className="h-9 px-3 rounded-xl text-xs font-semibold gap-1.5">
                      <Link to="/afiliados">
                        <SlidersHorizontal className="size-3.5" />
                        <span>Gerenciar Vitrine & Cupons</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Editor Canônico em Gaveta SheetPage (Idêntico ao Perfil Civil + Opções de Marca) */}
      <CreatorProfileSheetEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initialData={editorInitialData}
        isNew={isEditorNew}
        onSuccess={handleEditorSuccess}
      />
    </div>
  );
}

export default CreatorProfilesManagementPage;
