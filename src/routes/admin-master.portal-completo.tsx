import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Layers,
  Zap,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Building2,
  Video,
  FileText,
  Save,
  Loader2,
  Phone,
  Mail,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  getPortalCompletoContent,
  updatePortalCompletoContent,
  listWorkspaceWaitlist,
  migrateCompanyToFullWorkspace,
} from "@/services/portal-completo.functions";

export const Route = createFileRoute("/admin-master/portal-completo")({
  head: () => ({
    meta: [{ title: "Gestão do Portal Completo | Admin Master" }],
  }),
  loader: async () => {
    try {
      const [content, waitlist] = await Promise.all([
        getPortalCompletoContent().catch(() => null),
        listWorkspaceWaitlist().catch(() => []),
      ]);
      return { content, waitlist: waitlist || [] };
    } catch (err) {
      console.error("[admin-master.portal-completo] Loader error:", err);
      return { content: null, waitlist: [] };
    }
  },
  component: AdminMasterPortalCompletoPage,
});

function AdminMasterPortalCompletoPage() {
  const { content: initialContent, waitlist: initialWaitlist } = Route.useLoaderData() as any;
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"waitlist" | "content">("waitlist");

  // Waitlist Query
  const { data: waitlistData, refetch: refetchWaitlist } = useQuery({
    queryKey: ["admin-workspace-waitlist"],
    queryFn: () => listWorkspaceWaitlist(),
    initialData: initialWaitlist || [],
  });

  const waitlist = (Array.isArray(waitlistData) ? waitlistData : (waitlistData as any)?.waitlist) || [];

  // Content CMS States
  const [title, setTitle] = useState(initialContent?.hero_title || initialContent?.title || "O Próximo Salto de Gestão para a Sua Empresa");
  const [subtitle, setSubtitle] = useState(
    initialContent?.hero_subtitle || initialContent?.subtitle ||
      "Descubra os módulos avançados de PDV, estoque com grade, gestão de entregas e turismo receptivo."
  );
  const [demoVideoUrl, setDemoVideoUrl] = useState(initialContent?.video_url || initialContent?.demoVideoUrl || "");
  const [isSavingContent, setIsSavingContent] = useState(false);
  const [migratingId, setMigratingId] = useState<string | null>(null);

  // Migrar empresa em 1-clique
  const handleMigrate = async (waitlistId: string, storeId?: string) => {
    if (!storeId) {
      toast.error("Identificador de loja inexistente.");
      return;
    }
    setMigratingId(waitlistId);
    try {
      await migrateCompanyToFullWorkspace({
        data: { waitlistId, storeId },
      });
      toast.success("Empresa migrada para o Workspace Pro com sucesso!");
      refetchWaitlist();
    } catch (err: any) {
      toast.error(err.message || "Erro ao migrar empresa.");
    } finally {
      setMigratingId(null);
    }
  };

  // Salvar CMS
  const handleSaveCMS = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingContent(true);
    try {
      await updatePortalCompletoContent({
        data: {
          hero_title: title.trim(), hero_subtitle: subtitle.trim(), video_url: demoVideoUrl.trim() || null,
        },
      });
      toast.success("Conteúdo da Landing Page atualizado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar conteúdo.");
    } finally {
      setIsSavingContent(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground">Portal Completo</h1>
            <Badge variant="outline" className="text-[10px] font-mono">
              BETA MANAGEMENT
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gerencie a landing page de apresentação dos módulos avançados e aprove a migração de empresas em 1 clique.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="h-9 rounded-xl text-xs gap-1.5">
            <a href="/portal-completo" target="_blank" rel="noreferrer">
              <span>Ver Landing Page Pública</span>
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("waitlist")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "waitlist"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          Fila de Espera & Migração ({waitlist.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("content")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "content"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          Editor da Landing Page (CMS)
        </button>
      </div>

      {/* ABA 1: Fila de Espera & Migração */}
      {activeTab === "waitlist" && (
        <div className="space-y-4">
          {waitlist.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 border border-border/60 text-center space-y-3">
              <Users className="size-8 mx-auto text-muted-foreground opacity-40" />
              <h3 className="text-sm font-bold text-foreground">Nenhuma empresa na fila ainda</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Quando uma empresa cadastrada no MVP solicitar acesso ao Portal Completo, ela aparecerá aqui com os dados de contato e botão de migração em 1-clique.
              </p>
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider text-[10px] border-b border-border/60">
                    <tr>
                      <th className="p-4">Empresa</th>
                      <th className="p-4">Contato / WhatsApp</th>
                      <th className="p-4">Nicho</th>
                      <th className="p-4">Data</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Ações de Migração</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {waitlist.map((item: any) => {
                      const isMigrated = item.status === "migrated";
                      return (
                        <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-4">
                            <p className="font-bold text-foreground">{item.company_name}</p>
                            {item.notes && (
                              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                "{item.notes}"
                              </p>
                            )}
                          </td>
                          <td className="p-4">
                            <p className="font-mono">{item.contact_whatsapp}</p>
                            {item.contact_email && (
                              <p className="text-[11px] text-muted-foreground">{item.contact_email}</p>
                            )}
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className="text-[10px]">
                              {item.niche}
                            </Badge>
                          </td>
                          <td className="p-4 text-muted-foreground">
                            {new Date(item.created_at).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="p-4">
                            <Badge
                              className={`text-[10px] font-bold ${
                                isMigrated
                                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                              }`}
                            >
                              {isMigrated ? "Migrado para Pro" : "Aguardando Liberação"}
                            </Badge>
                          </td>
                          <td className="p-4 text-right">
                            {!isMigrated ? (
                              <Button
                                size="sm"
                                onClick={() => handleMigrate(item.id, item.store_id)}
                                disabled={migratingId === item.id}
                                className="h-8 rounded-lg text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-2xs"
                              >
                                {migratingId === item.id ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Zap className="size-3.5 text-amber-300" />
                                )}
                                <span>Migrar em 1-Clique</span>
                              </Button>
                            ) : (
                              <span className="text-[11px] text-muted-foreground font-medium flex items-center justify-end gap-1">
                                <CheckCircle2 className="size-3.5 text-emerald-600" />
                                Ativo no Workspace
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA 2: Editor CMS da Landing Page */}
      {activeTab === "content" && (
        <form onSubmit={handleSaveCMS} className="bg-card rounded-2xl p-6 border border-border/60 shadow-2xs space-y-5 max-w-3xl">
          <div className="space-y-1 pb-2 border-b border-border/40">
            <h2 className="text-sm font-bold text-foreground">Textos e Mídias Principais</h2>
            <p className="text-xs text-muted-foreground">
              Edite as mensagens que aparecem na página de apresentação para as empresas.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Título de Impacto (Hero)</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 rounded-xl text-xs bg-background font-medium"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Subtítulo Explicativo</Label>
            <Textarea
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              rows={3}
              className="rounded-xl text-xs bg-background resize-none leading-relaxed"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">URL do Vídeo Demonstrativo (Opcional)</Label>
            <div className="relative">
              <Video className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                value={demoVideoUrl}
                onChange={(e) => setDemoVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/embed/... ou link de mídia"
                className="pl-8 h-11 rounded-xl text-xs bg-background"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Embed de demonstração dos painéis avançados do PDV, Estoque e Turismo.
            </p>
          </div>

          <div className="pt-3 border-t border-border/40 flex items-center justify-end">
            <Button
              type="submit"
              disabled={isSavingContent}
              className="h-10 px-5 rounded-xl text-xs font-bold gap-2 bg-primary text-primary-foreground shadow-sm"
            >
              {isSavingContent ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  <span>Salvar Alterações da Landing Page</span>
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
