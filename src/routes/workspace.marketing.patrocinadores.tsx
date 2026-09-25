import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Megaphone,
  Plus,
  Trash2,
  ExternalLink,
  Sliders,
  CheckCircle2,
  Loader2,
  Building2,
  Eye,
  MousePointerClick,
  TrendingUp,
  Share2,
  Copy,
  Video,
  Sparkles,
  Link2,
} from "lucide-react";
import { CrudActionsMenu } from "@/components/ui/crud-actions-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/ui/image-upload";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  listWorkspaceSponsors,
  createSponsor,
  updateSponsor,
  deleteSponsor,
  type SponsorDTO,
} from "@/services/news.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/workspace/marketing/patrocinadores")({
  head: () => ({ meta: [{ title: "Gestão de Patrocinadores & Rede Display | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const sponsors = await listWorkspaceSponsors().catch(() => []);
      return { sponsors };
    } catch (err) {
      console.error("[loader:workspace.marketing.patrocinadores] Unhandled loader error:", err);
      return { sponsors: [] };
    }
  },
  component: WorkspacePatrocinadoresPage,
});

function WorkspacePatrocinadoresPage() {
  const { sponsors: initialSponsors } = ((Route.useLoaderData?.() as any) || {});
  const [sponsors, setSponsors] = useState<SponsorDTO[]>(initialSponsors || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [tier, setTier] = useState<"gold" | "silver" | "standard" | "supporter">("standard");
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [ctaLabel, setCtaLabel] = useState("Saiba Mais");
  const [description, setDescription] = useState("");
  const [sponsorStoreId, setSponsorStoreId] = useState("");

  const refreshSponsors = async () => {
    const updated = await listWorkspaceSponsors().catch(() => []);
    setSponsors(updated);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setName("");
    setTier("standard");
    setLogoUrl("");
    setBannerUrl("");
    setVideoUrl("");
    setWebsiteUrl("");
    setCtaLabel("Saiba Mais");
    setDescription("");
    setSponsorStoreId("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sp: SponsorDTO) => {
    setEditingId(sp.id);
    setName(sp.name);
    setTier(sp.tier);
    setLogoUrl(sp.logo_url || "");
    setBannerUrl(sp.banner_url || "");
    setVideoUrl(sp.video_url || "");
    setWebsiteUrl(sp.website_url || "");
    setCtaLabel(sp.cta_label || "Saiba Mais");
    setDescription(sp.description || "");
    setSponsorStoreId(sp.sponsor_store_id || "");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Informe o nome do patrocinador.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateSponsor({
          data: {
            id: editingId,
            name: name.trim(),
            tier,
            logo_url: logoUrl.trim() || null,
            banner_url: bannerUrl.trim() || null,
            video_url: videoUrl.trim() || null,
            website_url: websiteUrl.trim() || null,
            cta_label: ctaLabel.trim(),
            description: description.trim() || null,
            sponsor_store_id: sponsorStoreId.trim() || null,
          },
        });
        toast.success("Patrocinador atualizado com sucesso!");
      } else {
        await createSponsor({
          data: {
            name: name.trim(),
            tier,
            logo_url: logoUrl.trim() || undefined,
            banner_url: bannerUrl.trim() || undefined,
            video_url: videoUrl.trim() || undefined,
            website_url: websiteUrl.trim() || undefined,
            cta_label: ctaLabel.trim(),
            description: description.trim() || undefined,
            sponsor_store_id: sponsorStoreId.trim() || undefined,
          },
        });
        toast.success("Novo patrocinador cadastrado na Rede Display!");
      }
      setIsModalOpen(false);
      await refreshSponsors();
    } catch (err: unknown) {
      toast.error(
        (err instanceof Error ? err.message : String(err)) || "Erro ao salvar patrocinador.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSponsor({ data: { id } });
      toast.success("Patrocinador removido com sucesso.");
      await refreshSponsors();
    } catch {
      toast.error("Erro ao remover patrocinador.");
    }
  };

  const handleCopyMagicLink = (magicToken?: string | null) => {
    if (!magicToken) {
      toast.error("Este patrocinador ainda não possui token mágico gerado.");
      return;
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const magicUrl = `${origin}/patrocinador/${magicToken}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(magicUrl);
      toast.success("Link Mágico copiado! Envie ao patrocinador para ele ver o relatório em tempo real.");
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
              Marketing & Monetização
            </span>
            <span className="text-xs text-muted-foreground font-mono">Rede Display & Telemetria</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground mt-1">
            Patrocinadores & Anunciantes
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Cadastre anunciantes locais. As mídias e vídeos aparecem randomicamente nas suas notícias e feed com telemetria e links mágicos de auditoria.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleOpenCreate} className="rounded-2xl font-bold gap-2 text-xs">
            <Plus className="size-4" />
            <span>Novo Patrocinador</span>
          </Button>
        </div>
      </div>

      {/* Grid de Patrocinadores */}
      {sponsors.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border bg-card/50 space-y-4">
          <Megaphone className="size-12 text-muted-foreground/40 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">Nenhum patrocinador cadastrado</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Cadastre marcas e comércios parceiros para veicular propagandas nativas com métricas reais de visualização e envio de link mágico.
            </p>
          </div>
          <Button onClick={handleOpenCreate} className="rounded-2xl font-bold text-xs">
            <Plus className="size-4 mr-1.5" />
            <span>Cadastrar Primeiro Patrocinador</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {sponsors.map((sp) => {
            const views = sp.views_count || 0;
            const clicks = sp.clicks_count || 0;
            const ctr = views > 0 ? ((clicks / views) * 100).toFixed(1) : "0.0";

            return (
              <div
                key={sp.id}
                className="p-5 rounded-2xl bg-card border hover-elevate transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        sp.tier === "gold"
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          : sp.tier === "silver"
                          ? "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300 border border-zinc-500/30"
                          : "bg-primary/10 text-primary border border-primary/20"
                      }`}
                    >
                      {sp.tier === "gold"
                        ? "★ Master Gold"
                        : sp.tier === "silver"
                        ? "Silver"
                        : "Padrão"}
                    </span>
                    <Badge variant={sp.active ? "default" : "secondary"} className="text-[10px]">
                      {sp.active ? "Ativo" : "Pausado"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-2xl bg-muted p-1.5 flex items-center justify-center shrink-0 overflow-hidden border">
                      {sp.logo_url ? (
                        <img
                          src={sp.logo_url}
                          alt={sp.name}
                          className="max-h-full object-contain"
                        />
                      ) : (
                        <Building2 className="size-5 text-muted-foreground/50" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-foreground truncate">{sp.name}</h3>
                      {sp.description ? (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {sp.description}
                        </p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {sp.video_url ? "Criativo Vídeo" : sp.banner_url ? "Criativo Imagem" : "Formato Texto"}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Telemetria em Tempo Real */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center font-mono">
                    <div className="p-2 rounded-xl bg-muted/40">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                        <Eye className="size-3" />
                        <span>Views</span>
                      </div>
                      <p className="text-xs font-bold text-foreground mt-0.5">{views}</p>
                    </div>

                    <div className="p-2 rounded-xl bg-muted/40">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                        <MousePointerClick className="size-3" />
                        <span>Cliques</span>
                      </div>
                      <p className="text-xs font-bold text-foreground mt-0.5">{clicks}</p>
                    </div>

                    <div className="p-2 rounded-xl bg-muted/40">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                        <TrendingUp className="size-3 text-emerald-500" />
                        <span>CTR</span>
                      </div>
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{ctr}%</p>
                    </div>
                  </div>
                </div>

                {/* Botões de Ação & Link Mágico */}
                <div className="pt-3 border-t border-border/40 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyMagicLink(sp.magic_token)}
                      className="w-full rounded-xl text-xs font-bold gap-1.5 h-11 border-primary/25 hover:bg-primary/5 min-h-[44px]"
                    >
                      <Share2 className="size-4 text-primary" />
                      <span>Copiar Link Mágico</span>
                    </Button>

                    {sp.magic_token && (
                      <Link
                        to="/patrocinador/$token"
                        params={{ token: sp.magic_token }}
                        target="_blank"
                        className="shrink-0"
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Abrir Relatório do Patrocinador"
                          className="size-11 rounded-xl min-h-[44px] min-w-[44px]"
                        >
                          <ExternalLink className="size-4" />
                        </Button>
                      </Link>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(sp)}
                      className="h-10 px-3 text-xs font-bold text-muted-foreground hover:text-foreground rounded-xl min-h-[40px]"
                    >
                      Editar Dados
                    </Button>
                    <CrudActionsMenu
                      entityName="Patrocinador"
                      onEdit={() => handleOpenEdit(sp)}
                      onDelete={() => handleDelete(sp.id)}
                      deleteConfirmTitle={`Excluir patrocinador "${sp.sponsor_name}"?`}
                      deleteConfirmDescription="Esta ação removerá permanentemente o patrocinador, os cliques e os relatórios de conversão vinculados."
                      customActions={[
                        ...(sp.magic_token
                          ? [
                              {
                                id: "copy-magic-link",
                                label: "Copiar Link Mágico",
                                icon: Link2,
                                onClick: () => handleCopyMagicLink(sp.magic_token),
                              },
                            ]
                          : []),
                      ]}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Criação / Edição */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden sm:rounded-2xl bg-background">
          <DialogHeader className="p-6 pb-4 bg-muted/20">
            <DialogTitle className="flex items-center gap-2 text-lg font-black tracking-tight">
              <Megaphone className="size-5 text-primary" />
              <span>{editingId ? "Editar Patrocinador" : "Novo Patrocinador"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cadastre mídias, vídeos e links que serão inseridos randomicamente na Rede Display.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto no-scrollbar">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Nome da Empresa / Marca</Label>
              <Input
                placeholder="Ex: Sicredi Alto Uruguai"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl h-11 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Nível / Tier</Label>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value as any)}
                  className="w-full h-11 px-3 rounded-xl bg-background text-xs font-semibold border"
                >
                  <option value="gold">★ Master Gold</option>
                  <option value="silver">Silver</option>
                  <option value="standard">Standard</option>
                  <option value="supporter">Apoiador</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Texto do Botão (CTA)</Label>
                <Input
                  placeholder="Ex: Saiba Mais"
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                  className="rounded-xl h-11 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Logotipo do Parceiro</Label>
                <ImageUpload
                  value={logoUrl}
                  onChange={(url) => setLogoUrl(url)}
                  aspectPreset="square"
                  bucket="cms-media"
                  helperText="Formato 1:1 quadrado"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Banner Gráfico (Imagem)</Label>
                <ImageUpload
                  value={bannerUrl}
                  onChange={(url) => setBannerUrl(url)}
                  aspectPreset="widescreen"
                  bucket="cms-media"
                  helperText="Formato 16:9 panorâmico"
                />
              </div>
            </div>

            {/* Vídeo para Anúncio */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Video className="size-3.5 text-primary" />
                <Label className="text-xs font-bold">Vídeo do Anúncio (URL MP4 / WebM Opcional)</Label>
              </div>
              <Input
                placeholder="https://exemplo.com/comercial.mp4"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="rounded-xl h-11 font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Se informado, o banner executará o vídeo em loop suave e silencioso.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Link de Destino (Site / WhatsApp)</Label>
              <Input
                placeholder="https://seusite.com.br"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="rounded-xl h-11 font-mono text-xs"
              />
            </div>

            {/* Vinculação de Loja / Empresa no App */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Building2 className="size-3.5 text-primary" />
                <Label className="text-xs font-bold">ID da Empresa Parceira no App (Opcional)</Label>
              </div>
              <Input
                placeholder="UUID da loja parceira cadastrada"
                value={sponsorStoreId}
                onChange={(e) => setSponsorStoreId(e.target.value)}
                className="rounded-xl h-11 font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Vincule o patrocinador ao portal de uma empresa do app para que ela consulte seus relatórios direto no painel corporativo.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Descrição Curta</Label>
              <textarea
                placeholder="Uma frase sobre o serviço ou produto anunciado..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full p-3 rounded-xl bg-background text-xs resize-none border"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl font-bold h-11 min-h-[44px]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl font-bold bg-primary text-primary-foreground h-11 min-h-[44px]"
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="size-4 mr-2" />
                )}
                <span>Salvar Patrocinador</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
