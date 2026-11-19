import { useEffect, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { getRealtimeChannel } from "@/services/realtime-channel";
import { ErrorState } from "@/components/state/states";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  GitBranch,
  Loader2,
  Plus,
  RefreshCw,
  Shield,
  Users,
} from "lucide-react";
import { AtendimentoSubmoduleHeader } from "@/components/atendimento/AtendimentoSubmoduleHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listStoreLeadForms } from "@/services/lead-forms.functions";
import { getStoreSettings } from "@/services/store.functions";
import { listWorkspaceWhatsAppInstances, type WhatsAppChannelInstanceDTO } from "@/services/whatsapp-channel-instances.functions";
import {
  createAutoWhatsAppGroup,
  listGroupOverflowCampaigns,
  listStoreWhatsAppGroups,
  listWhatsAppGroupMembers,
  syncStoreWhatsAppGroups,
  triggerGroupCampaignOverflowNow,
  upsertGroupOverflowCampaign,
  updateWhatsAppGroupRoleAndPrefsFn,
  type RepeatedGroupMemberSummary,
  type WhatsAppGroupCampaignDTO,
  type WhatsAppGroupDirectoryDTO,
} from "@/services/whatsapp-groups.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/atendimento/grupos")({
  head: () => ({ meta: [{ title: "Grupos & Canais — Atendimento" }] }),
  loader: async () => {
    try {
      const store = await getStoreSettings();
      const [instances, groupsData, campaigns, forms] = await Promise.all([
        listWorkspaceWhatsAppInstances({ data: { store_id: store?.id } }),
        listStoreWhatsAppGroups({ data: { storeId: store?.id } }),
        listGroupOverflowCampaigns({ data: { storeId: store?.id } }),
        listStoreLeadForms({ data: { storeId: store?.id || undefined } }),
      ]);
      return {
        store,
        instances: (instances || []) as WhatsAppChannelInstanceDTO[],
        groups: (groupsData?.groups || []) as WhatsAppGroupDirectoryDTO[],
        repeatedMembers: (groupsData?.repeatedMembers || []) as RepeatedGroupMemberSummary[],
        campaigns: (campaigns || []) as WhatsAppGroupCampaignDTO[],
        leadForms: Array.isArray(forms) ? forms : [],
        loadError: null as string | null,
      };
    } catch (err: any) {
      return {
        store: null,
        instances: [] as WhatsAppChannelInstanceDTO[],
        groups: [] as WhatsAppGroupDirectoryDTO[],
        repeatedMembers: [] as RepeatedGroupMemberSummary[],
        campaigns: [] as WhatsAppGroupCampaignDTO[],
        leadForms: [],
        loadError: err?.message || "Falha ao carregar grupos e campanhas do WhatsApp.",
      };
    }
  },
  component: WorkspaceAtendimentoGruposPage,
});

function WorkspaceAtendimentoGruposPage() {
  const router = useRouter();
  const loader = (Route.useLoaderData?.() as any) || {};
  const loadError = loader.loadError || null;
  const store = loader.store || null;
  const instances: WhatsAppChannelInstanceDTO[] = loader.instances || [];
  const leadForms: any[] = loader.leadForms || [];

  const [groups, setGroups] = useState<WhatsAppGroupDirectoryDTO[]>(loader.groups || []);
  const [repeatedMembers, setRepeatedMembers] = useState<RepeatedGroupMemberSummary[]>(
    loader.repeatedMembers || [],
  );
  const [campaigns, setCampaigns] = useState<WhatsAppGroupCampaignDTO[]>(loader.campaigns || []);
  const [activeTab, setActiveTab] = useState<"groups" | "repeated" | "campaigns">("groups");
  const [instanceFilter, setInstanceFilter] = useState<string>("all");
  const [isSyncing, setIsSyncing] = useState(false);

  // Modal de participantes do grupo
  const [membersModalGroup, setMembersModalGroup] = useState<WhatsAppGroupDirectoryDTO | null>(null);
  const [groupMembersList, setGroupMembersList] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Modal Novo Grupo Automatico
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [grpInstanceId, setGrpInstanceId] = useState(instances[0]?.id || "");
  const [grpSubject, setGrpSubject] = useState("");
  const [grpDesc, setGrpDesc] = useState("");
  const [grpAdminsRaw, setGrpAdminsRaw] = useState("");

  // Modal Nova Campanha de Transbordo
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [campInstanceId, setCampInstanceId] = useState(instances[0]?.id || "");
  const [campTitle, setCampTitle] = useState("");
  const [campSlug, setCampSlug] = useState("");
  const [campTemplate, setCampTemplate] = useState("");
  const [campDesc, setCampDesc] = useState("");
  const [campThreshold, setCampThreshold] = useState("950");
  const [campMaxCap, setCampMaxCap] = useState("1024");
  const [campAdminsRaw, setCampAdminsRaw] = useState("");
  const [campLeadFormId, setCampLeadFormId] = useState<string>("none");
  const [rotatingCampId, setRotatingCampId] = useState<string | null>(null);
  const [updatingGroupId, setUpdatingGroupId] = useState<string | null>(null);

  const handleUpdateRole = async (
    groupId: string,
    groupRole: "unclassified" | "promo_offers" | "internal_team" | "client_vip" | "operational"
  ) => {
    if (!store?.id) return;
    setUpdatingGroupId(groupId);
    try {
      await updateWhatsAppGroupRoleAndPrefsFn({
        data: {
          storeId: store.id,
          groupId,
          groupRole,
          silenceLeadCapture: groupRole === "internal_team",
          autoPublishEligible: groupRole === "promo_offers",
        },
      });
      toast.success("Papel do grupo atualizado com sucesso.");
      await refreshData();
    } catch (err: any) {
      toast.error(err?.message || "Falha ao atualizar papel do grupo.");
    } finally {
      setUpdatingGroupId(null);
    }
  };

  const refreshData = async () => {
    const [gData, cData] = await Promise.all([
      listStoreWhatsAppGroups({ data: { storeId: store?.id } }),
      listGroupOverflowCampaigns({ data: { storeId: store?.id } }),
    ]);
    setGroups(gData?.groups || []);
    setRepeatedMembers(gData?.repeatedMembers || []);
    setCampaigns(cData || []);
  };

  useEffect(() => {
    if (!store?.id) return;
    const rt = getRealtimeChannel(`whatsapp-groups-${store.id}`);
    if (!rt.channel) return;
    void rt.ensureAuth?.();

    const triggerRefresh = () => {
      void refreshData().catch(() => {});
    };

    rt.channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_groups_directory", filter: `store_id=eq.${store.id}` },
        triggerRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_channel_live_state", filter: `store_id=eq.${store.id}` },
        triggerRefresh,
      )
      .subscribe();

    return () => {
      rt.unsubscribe();
    };
  }, [store?.id]);

  const handleSyncGroups = async () => {
    setIsSyncing(true);
    try {
      const res = await syncStoreWhatsAppGroups({
        data: {
          storeId: store?.id,
          ...(instanceFilter !== "all" ? { instanceId: instanceFilter } : {}),
        },
      });
      await refreshData();
      toast.success(`${res.syncedGroups} grupos e ${res.syncedMembers} membros sincronizados.`);
    } catch (err: any) {
      toast.error(err?.message || "Falha ao sincronizar grupos WhatsApp.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleViewMembers = async (grp: WhatsAppGroupDirectoryDTO) => {
    setMembersModalGroup(grp);
    setLoadingMembers(true);
    setGroupMembersList([]);
    try {
      const res = await listWhatsAppGroupMembers({ data: { groupId: grp.id, storeId: store?.id } });
      setGroupMembersList(res.members || []);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao carregar participantes.");
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!grpInstanceId || grpSubject.trim().length < 2) {
      toast.error("Informe o canal e o nome do grupo.");
      return;
    }
    setCreatingGroup(true);
    try {
      const adminPhones = grpAdminsRaw
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      await createAutoWhatsAppGroup({
        data: {
          storeId: store?.id,
          instanceId: grpInstanceId,
          subject: grpSubject.trim(),
          description: grpDesc.trim() || undefined,
          adminPhones,
          initialParticipantPhones: [],
        },
      });
      await refreshData();
      toast.success("Grupo criado, administradores promovidos e link gerado.");
      setCreateGroupOpen(false);
      setGrpSubject("");
      setGrpDesc("");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar grupo automático.");
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleSaveCampaign = async () => {
    if (!campInstanceId || campTitle.trim().length < 2 || campSlug.trim().length < 2) {
      toast.error("Preencha canal, título e slug da campanha.");
      return;
    }
    setSavingCampaign(true);
    try {
      const adminPhones = campAdminsRaw
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      await upsertGroupOverflowCampaign({
        data: {
          storeId: store?.id,
          instanceId: campInstanceId,
          title: campTitle.trim(),
          slug: campSlug.trim(),
          description: campDesc.trim() || undefined,
          groupNameTemplate: campTemplate.trim() || `${campTitle.trim()} #{n}`,
          groupDescription: campDesc.trim() || undefined,
          overflowThreshold: Number(campThreshold) || 950,
          maxCapacity: Number(campMaxCap) || 1024,
          adminPhones,
          leadFormId: campLeadFormId === "none" ? null : campLeadFormId,
          isActive: true,
        },
      });
      await refreshData();
      toast.success("Campanha de transbordo salva e grupo ativo provisionado.");
      setCampaignOpen(false);
      setCampTitle("");
      setCampSlug("");
      setCampTemplate("");
      setCampDesc("");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar campanha de transbordo.");
    } finally {
      setSavingCampaign(false);
    }
  };

  const handleManualRotate = async (campaignId: string) => {
    setRotatingCampId(campaignId);
    try {
      const res = await triggerGroupCampaignOverflowNow({ data: { campaignId, storeId: store?.id } });
      await refreshData();
      toast.success(`Grupo "${res.createdGroup.subject}" criado e ativado no link.`);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao gerar próximo grupo.");
    } finally {
      setRotatingCampId(null);
    }
  };

  const filteredGroups =
    instanceFilter === "all"
      ? groups
      : groups.filter((g) => g.instance_id === instanceFilter);

  const instanceNameMap = new Map(instances.map((i) => [i.id, i.display_name]));

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {loadError ? (
        <ErrorState
          title="Falha ao carregar grupos e canais"
          description={loadError}
          onRetry={() => router.invalidate()}
        />
      ) : null}
      <AtendimentoSubmoduleHeader
        activeKey="grupos"
        title="Grupos, Membros & Transbordo"
        subtitle="Gerencie grupos e canais das instâncias, detecte membros repetidos e automatize lançamentos."
        showPrimaryChatCta={false}
        rightSlot={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleSyncGroups}
              disabled={isSyncing}
              className="h-11 min-h-11 px-4 text-xs font-medium gap-2 focus-visible:ring-2 focus-visible:ring-primary"
            >
              <RefreshCw className={cn("size-4", isSyncing && "animate-spin motion-reduce:animate-none")} />
              <span>{isSyncing ? "Sincronizando..." : "Sincronizar Grupos"}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateGroupOpen(true)}
              className="h-11 min-h-11 px-4 text-xs font-semibold gap-2 focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Plus className="size-4" />
              <span>Criar Grupo</span>
            </Button>
            <Button
              type="button"
              onClick={() => setCampaignOpen(true)}
              className="h-11 min-h-11 px-4 text-xs font-semibold gap-2 focus-visible:ring-2 focus-visible:ring-primary"
            >
              <GitBranch className="size-4" />
              <span>Nova Campanha Transbordo</span>
            </Button>
          </div>
        }
      />

      {/* Resumo operacional enxuto */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Grupos e Canais</p>
          <p className="text-2xl font-semibold text-foreground">{filteredGroups.length}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Membros em 2+ Grupos</p>
          <p className="text-2xl font-semibold text-foreground">{repeatedMembers.length}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Campanhas Transbordo Ativas</p>
          <p className="text-2xl font-semibold text-foreground">
            {campaigns.filter((c) => c.is_active).length}
          </p>
        </div>
      </section>

      {/* Filtro de canal e abas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "groups", label: `Grupos (${filteredGroups.length})` },
            { id: "repeated", label: `Membros Repetidos (${repeatedMembers.length})` },
            { id: "campaigns", label: `Campanhas & Links (${campaigns.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "h-11 min-h-11 px-4 rounded-xl text-xs font-semibold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border/60 hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {instances.length > 1 && (
          <Select value={instanceFilter} onValueChange={setInstanceFilter}>
            <SelectTrigger className="h-11 min-h-11 w-full sm:w-64 text-xs">
              <SelectValue placeholder="Filtrar por canal WhatsApp" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os canais</SelectItem>
              {instances.map((inst) => (
                <SelectItem key={inst.id} value={inst.id}>
                  {inst.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Aba 1: Diretório de Grupos */}
      {activeTab === "groups" && (
        filteredGroups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-card p-8 text-center space-y-3">
            <Users className="size-8 mx-auto text-muted-foreground opacity-60" />
            <p className="text-sm font-semibold text-foreground">Nenhum grupo sincronizado</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Clique em Sincronizar Grupos para importar grupos e membros conectados nas instâncias WhatsApp.
            </p>
          </div>
        ) : (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredGroups.map((grp) => (
              <div
                key={grp.id}
                className="rounded-xl border border-border/60 bg-card p-4 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-foreground truncate">{grp.subject}</h2>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {instanceNameMap.get(grp.instance_id) || "Canal WhatsApp"} · {grp.group_jid}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {grp.kind === "channel" ? "Canal" : "Grupo"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{grp.member_count} membros</span>
                    <span>•</span>
                    <span>{grp.admin_count} admins</span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Papel:</Label>
                      <Select
                        value={grp.group_role || "unclassified"}
                        disabled={updatingGroupId === grp.id}
                        onValueChange={(val: any) => handleUpdateRole(grp.id, val)}
                      >
                        <SelectTrigger className="h-11 min-h-11 w-44 text-xs font-semibold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unclassified">Não classificado</SelectItem>
                          <SelectItem value="promo_offers">Ofertas & Promoções</SelectItem>
                          <SelectItem value="internal_team">Equipe Interna (Privado)</SelectItem>
                          <SelectItem value="client_vip">Clientes VIP</SelectItem>
                          <SelectItem value="operational">Operacional</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {grp.group_role === "internal_team" ? (
                      <span className="text-xs text-warning font-medium flex items-center gap-1">
                        <Shield className="size-3.5" />
                        CRM & Disparos Silenciados
                      </span>
                    ) : grp.group_role === "promo_offers" ? (
                      <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="size-3.5" />
                        Elegível p/ Ofertas Hot
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border/50">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleViewMembers(grp)}
                    className="h-11 min-h-11 flex-1 text-xs font-medium gap-2 focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Users className="size-4" />
                    <span>Ver Membros</span>
                  </Button>
                  {grp.invite_url && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (typeof navigator !== "undefined" && navigator.clipboard) {
                          navigator.clipboard.writeText(grp.invite_url!);
                          toast.success("Link do grupo copiado.");
                        }
                      }}
                      className="h-11 min-h-11 px-3 text-xs font-medium gap-2 focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Copy className="size-4" />
                      <span>Copiar Convite</span>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </section>
        )
      )}

      {/* Aba 2: Auditoria de Membros Repetidos */}
      {activeTab === "repeated" && (
        repeatedMembers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-card p-8 text-center space-y-2">
            <CheckCircle2 className="size-8 mx-auto text-success opacity-70" />
            <p className="text-sm font-semibold text-foreground">Sem sobreposição relevante</p>
            <p className="text-xs text-muted-foreground">
              Sincronize os grupos para identificar contatos que aparecem em múltiplos grupos da empresa.
            </p>
          </div>
        ) : (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {repeatedMembers.map((member) => (
              <div key={member.key} className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-foreground truncate">
                      {member.displayName}
                    </h2>
                    <p className="text-xs font-mono text-muted-foreground">
                      {member.phoneE164 || member.key}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs text-warning-strong border-warning/40 bg-warning/10 shrink-0 gap-1">
                    <AlertTriangle className="size-3" />
                    <span>{member.groupCount} grupos</span>
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {member.groups.map((g) => (
                    <Badge key={g.groupId} variant="secondary" className="text-xs">
                      {g.subject} ({g.role === "member" ? "Membro" : "Admin"})
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )
      )}

      {/* Aba 3: Campanhas de Transbordo Automático */}
      {activeTab === "campaigns" && (
        campaigns.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-card p-8 text-center space-y-3">
            <GitBranch className="size-8 mx-auto text-primary opacity-70" />
            <p className="text-sm font-semibold text-foreground">Nenhuma campanha criada</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Crie um link fixo `/g/sua-campanha` que abre automaticamente um novo grupo com admins da empresa quando o atual lotar.
            </p>
            <Button
              type="button"
              onClick={() => setCampaignOpen(true)}
              className="h-11 min-h-11 px-4 text-xs font-semibold gap-2"
            >
              <Plus className="size-4" />
              <span>Criar Campanha de Transbordo</span>
            </Button>
          </div>
        ) : (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {campaigns.map((camp) => {
              const publicPath = `/g/${camp.slug}`;
              return (
                <div key={camp.id} className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <h2 className="text-sm font-semibold text-foreground truncate">{camp.title}</h2>
                      <p className="text-xs font-mono text-primary truncate">{publicPath}</p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0 text-success border-success/30 bg-success/10">
                      {camp.is_active ? "Ativa" : "Pausada"}
                    </Badge>
                  </div>

                  <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-1 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Grupo atual no link:</span>
                      <span className="font-semibold text-foreground truncate">
                        {camp.active_group?.subject || "Aguardando provisão"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Gatilho de transbordo:</span>
                      <span className="font-mono text-foreground">
                        {camp.active_group?.member_count ?? 0} / {camp.overflow_threshold} (máx {camp.max_capacity})
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Admins automáticos:</span>
                      <span className="font-mono text-foreground">{camp.admin_phones.length}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (typeof window !== "undefined" && navigator.clipboard) {
                          navigator.clipboard.writeText(`${window.location.origin}${publicPath}`);
                          toast.success("URL fixa de transbordo copiada.");
                        }
                      }}
                      className="h-11 min-h-11 flex-1 text-xs font-medium gap-2 focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Copy className="size-4" />
                      <span>Copiar Link</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleManualRotate(camp.id)}
                      disabled={rotatingCampId === camp.id}
                      className="h-11 min-h-11 px-3 text-xs font-medium gap-2 focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {rotatingCampId === camp.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <GitBranch className="size-4" />
                      )}
                      <span>Gerar Próximo Grupo</span>
                    </Button>
                    {camp.active_invite_url && (
                      <Button asChild variant="outline" className="h-11 min-h-11 px-3 text-xs">
                        <a href={camp.active_invite_url} target="_blank" rel="noreferrer">
                          <ExternalLink className="size-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        )
      )}

      {/* Dialog: Membros do Grupo */}
      <Dialog open={Boolean(membersModalGroup)} onOpenChange={(o) => !o && setMembersModalGroup(null)}>
        <DialogContent className="sm:max-w-lg max-h-screen overflow-y-auto flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {membersModalGroup?.subject || "Participantes"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Lista de membros e administradores sincronizados neste grupo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2 py-2">
            {loadingMembers ? (
              <div className="p-8 text-center">
                <Loader2 className="size-6 animate-spin mx-auto text-primary" />
              </div>
            ) : groupMembersList.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center p-6">
                Nenhum participante listado localmente. Clique em Sincronizar Grupos.
              </p>
            ) : (
              groupMembersList.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/50 p-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{m.display_name || m.phone_e164}</p>
                    <p className="font-mono text-muted-foreground">{m.phone_e164 || m.participant_jid}</p>
                  </div>
                  <Badge variant={m.role === "member" ? "secondary" : "outline"} className="text-xs shrink-0">
                    {m.role === "superadmin" ? "Dono" : m.role === "admin" ? "Admin" : "Membro"}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Criar Grupo Automático */}
      <Dialog open={createGroupOpen} onOpenChange={setCreateGroupOpen}>
        <DialogContent className="sm:max-w-md space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Criar Grupo WhatsApp</DialogTitle>
            <DialogDescription className="text-xs">
              Cria o grupo na Evolution API, promove os administradores e gera link de convite.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Canal WhatsApp Emissor</Label>
              <Select value={grpInstanceId} onValueChange={setGrpInstanceId}>
                <SelectTrigger className="h-11 min-h-11 text-xs">
                  <SelectValue placeholder="Selecione um canal" />
                </SelectTrigger>
                <SelectContent>
                  {instances.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.display_name} ({i.display_phone_number || "VPS"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nome do Grupo</Label>
              <Input
                value={grpSubject}
                onChange={(e) => setGrpSubject(e.target.value)}
                placeholder="Ex: Lançamento VIP Maio"
                className="h-11 min-h-11 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Telefones de Admins da Empresa (opcional)</Label>
              <Input
                value={grpAdminsRaw}
                onChange={(e) => setGrpAdminsRaw(e.target.value)}
                placeholder="49999998888, 49988887777"
                className="h-11 min-h-11 text-xs"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateGroupOpen(false)}
              className="h-11 min-h-11 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCreateGroup}
              disabled={creatingGroup}
              className="h-11 min-h-11 text-xs font-semibold gap-2"
            >
              {creatingGroup && <Loader2 className="size-4 animate-spin" />}
              <span>Criar e Gerar Link</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Campanha de Transbordo Automático */}
      <Dialog open={campaignOpen} onOpenChange={setCampaignOpen}>
        <DialogContent className="sm:max-w-lg max-h-screen overflow-y-auto space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Campanha de Transbordo</DialogTitle>
            <DialogDescription className="text-xs">
              Quando o grupo atingir a lotação limite, um novo grupo é criado com os admins da empresa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Canal WhatsApp Criador</Label>
              <Select value={campInstanceId} onValueChange={setCampInstanceId}>
                <SelectTrigger className="h-11 min-h-11 text-xs">
                  <SelectValue placeholder="Selecione o canal" />
                </SelectTrigger>
                <SelectContent>
                  {instances.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.display_name} ({i.display_phone_number || "VPS"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Título da Campanha</Label>
                <Input
                  value={campTitle}
                  onChange={(e) => {
                    setCampTitle(e.target.value);
                    if (!campSlug) {
                      setCampSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/^-+|-+$/g, ""),
                      );
                    }
                  }}
                  placeholder="Ofertas Inverno 2027"
                  className="h-11 min-h-11 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Slug Público (/g/slug)</Label>
                <Input
                  value={campSlug}
                  onChange={(e) => setCampSlug(e.target.value)}
                  placeholder="ofertas-inverno"
                  className="h-11 min-h-11 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Template de Nome dos Grupos (use {"{n}"} para número)</Label>
              <Input
                value={campTemplate}
                onChange={(e) => setCampTemplate(e.target.value)}
                placeholder="Ofertas VIP #{n}"
                className="h-11 min-h-11 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Transbordar ao atingir membros</Label>
                <Input
                  type="number"
                  value={campThreshold}
                  onChange={(e) => setCampThreshold(e.target.value)}
                  className="h-11 min-h-11 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Capacidade máxima do grupo</Label>
                <Input
                  type="number"
                  value={campMaxCap}
                  onChange={(e) => setCampMaxCap(e.target.value)}
                  className="h-11 min-h-11 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Admins da Empresa (separados por vírgula)</Label>
              <Input
                value={campAdminsRaw}
                onChange={(e) => setCampAdminsRaw(e.target.value)}
                placeholder="49999998888, 49988887777"
                className="h-11 min-h-11 text-xs"
              />
            </div>

            {leadForms.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Formulário de Captura Associado (opcional)</Label>
                <Select value={campLeadFormId} onValueChange={setCampLeadFormId}>
                  <SelectTrigger className="h-11 min-h-11 text-xs">
                    <SelectValue placeholder="Nenhum formulário" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum formulário</SelectItem>
                    {leadForms.map((f: any) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCampaignOpen(false)}
              className="h-11 min-h-11 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveCampaign}
              disabled={savingCampaign}
              className="h-11 min-h-11 text-xs font-semibold gap-2"
            >
              {savingCampaign && <Loader2 className="size-4 animate-spin" />}
              <Shield className="size-4" />
              <span>Ativar Campanha</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
