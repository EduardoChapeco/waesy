import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { getRealtimeChannel } from "@/services/realtime-channel";
import { toast } from "sonner";
import { Loader2, Settings2, Users } from "lucide-react";
import { ErrorState } from "@/components/state/states";
import { AtendimentoSubmoduleHeader } from "@/components/atendimento/AtendimentoSubmoduleHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  listTeamMembers,
  toggleAgentPresence,
  updateTeamMemberProfile,
} from "@/services/admin-team.functions";
import { getStoreSettings } from "@/services/store.functions";
import {
  listChatDepartments,
  listInstanceMemberPermissions,
  listWorkspaceWhatsAppInstances,
  upsertInstanceMemberPermissions,
  type ChatDepartmentDTO,
  type InstanceMemberPermissionDTO,
  type WhatsAppChannelInstanceDTO,
} from "@/services/whatsapp-channel-instances.functions";
import { getAttendanceBusinessIntelligence } from "@/services/whatsapp-operations-metrics.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/atendimento/atendentes")({
  head: () => ({ meta: [{ title: "Atendentes & Presença — Atendimento" }] }),
  loader: async () => {
    try {
      const store = await getStoreSettings();
      const [members, departments, instances, bi, instancePermissions] = await Promise.all([
        listTeamMembers(),
        listChatDepartments({ data: { storeId: store?.id } }),
        listWorkspaceWhatsAppInstances({ data: { store_id: store?.id } }),
        getAttendanceBusinessIntelligence({ data: { storeId: store?.id, rangeDays: 30 } }).catch(
          () => null,
        ),
        listInstanceMemberPermissions({ data: { storeId: store?.id } }),
      ]);
      return {
        store,
        members: members || [],
        departments: (departments || []) as ChatDepartmentDTO[],
        instances: (instances || []) as WhatsAppChannelInstanceDTO[],
        bi,
        instancePermissions: (instancePermissions || []) as InstanceMemberPermissionDTO[],
        loadError: null as string | null,
      };
    } catch (err: any) {
      return {
        store: null,
        members: [],
        departments: [] as ChatDepartmentDTO[],
        instances: [] as WhatsAppChannelInstanceDTO[],
        bi: null,
        instancePermissions: [] as InstanceMemberPermissionDTO[],
        loadError: err?.message || "Não foi possível carregar atendentes e canais.",
      };
    }
  },
  component: WorkspaceAtendimentoAtendentesPage,
});

function WorkspaceAtendimentoAtendentesPage() {
  const router = useRouter();
  const loaderData = (Route.useLoaderData?.() as any) || {};
  const loadError: string | null = loaderData.loadError || null;
  const store = loaderData.store || null;
  const departments: ChatDepartmentDTO[] = loaderData.departments || [];
  const instances: WhatsAppChannelInstanceDTO[] = loaderData.instances || [];
  const [members, setMembers] = useState<any[]>(loaderData.members || []);
  const [instancePermissions, setInstancePermissions] = useState<InstanceMemberPermissionDTO[]>(
    loaderData.instancePermissions || [],
  );

  useEffect(() => {
    setMembers(loaderData.members || []);
    setInstancePermissions(loaderData.instancePermissions || []);
  }, [loaderData.members, loaderData.instancePermissions]);

  useEffect(() => {
    const storeId = store?.id;
    if (!storeId) return;
    let debounceTimer: number | null = null;
    const refreshLive = () => {
      if (debounceTimer !== null) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(async () => {
        debounceTimer = null;
        const [freshMembers, freshPerms] = await Promise.all([
          listTeamMembers().catch(() => null),
          listInstanceMemberPermissions({ data: { storeId } }).catch(() => null),
        ]);
        if (freshMembers) setMembers(freshMembers);
        if (freshPerms) setInstancePermissions(freshPerms as InstanceMemberPermissionDTO[]);
        void router.invalidate();
      }, 600);
    };
    const filter = `store_id=eq.${storeId}`;
    const { channel, unsubscribe } = getRealtimeChannel(`atendimento-atendentes:${storeId}`);
    channel
      ?.on("postgres_changes", { event: "*", schema: "public", table: "workspace_members", filter }, refreshLive)
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_channel_live_state", filter }, refreshLive)
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_instance_member_permissions", filter }, refreshLive)
      .subscribe();
    return () => {
      if (debounceTimer !== null) window.clearTimeout(debounceTimer);
      unsubscribe();
    };
  }, [store?.id, router]);
  const biAgentsMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const a of loaderData.bi?.agents || []) {
      map.set(a.profileId, a);
    }
    return map;
  }, [loaderData.bi]);

  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [editDepartmentId, setEditDepartmentId] = useState<string>("none");
  const [editWhatsappId, setEditWhatsappId] = useState<string>("none");
  const [editIsAgent, setEditIsAgent] = useState(true);
  const [editMaxConcurrent, setEditMaxConcurrent] = useState(10);
  const [editCanTransfer, setEditCanTransfer] = useState(true);
  const [editCanClose, setEditCanClose] = useState(true);
  const [editCanManageQr, setEditCanManageQr] = useState(false);
  const [editOnlySector, setEditOnlySector] = useState(false);
  const [editPermCanView, setEditPermCanView] = useState(true);
  const [editPermCanReply, setEditPermCanReply] = useState(true);
  const [editPermCanManageGroups, setEditPermCanManageGroups] = useState(false);
  const [editPermCanSyncHistory, setEditPermCanSyncHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const hydrateChannelPerms = (profileId: string, selectedInstanceId: string, memberFallback?: any) => {
    const resolvedInstanceId =
      selectedInstanceId !== "none"
        ? selectedInstanceId
        : instances.find((i) => i.is_default)?.id || instances[0]?.id || "";
    const existing = instancePermissions.find(
      (p) => p.profile_id === profileId && p.instance_id === resolvedInstanceId,
    );
    setEditPermCanView(existing ? Boolean(existing.can_view) : true);
    setEditPermCanReply(existing ? Boolean(existing.can_reply) : true);
    setEditPermCanManageGroups(existing ? Boolean(existing.can_manage_groups) : false);
    setEditPermCanSyncHistory(existing ? Boolean(existing.can_sync_history) : false);
    if (existing) {
      setEditCanManageQr(Boolean(existing.can_manage_qr));
      setEditOnlySector(Boolean(existing.only_assigned_or_sector));
    } else if (memberFallback) {
      setEditCanManageQr(Boolean(memberFallback.can_manage_whatsapp_qr));
      setEditOnlySector(Boolean(memberFallback.only_assigned_or_sector));
    }
  };

  const openEditDrawer = (m: any) => {
    const initialWa = m.whatsapp_instance_id || "none";
    setEditingMember(m);
    setEditDepartmentId(m.department_id || "none");
    setEditWhatsappId(initialWa);
    setEditIsAgent(m.is_attendance_agent ?? true);
    setEditMaxConcurrent(Number(m.max_concurrent_chats || 10));
    setEditCanTransfer(m.can_transfer_chats ?? true);
    setEditCanClose(m.can_close_chats ?? true);
    setEditCanManageQr(Boolean(m.can_manage_whatsapp_qr));
    setEditOnlySector(Boolean(m.only_assigned_or_sector));
    hydrateChannelPerms(m.id, initialWa, m);
  };

  const handlePresenceChange = async (
    profileId: string,
    presence: "online" | "busy" | "away" | "offline",
  ) => {
    const previous = members;
    setMembers((prev) =>
      prev.map((m) => (m.id === profileId ? { ...m, attendance_presence: presence } : m)),
    );
    try {
      await toggleAgentPresence({
        data: { profileId, presence, storeId: store?.id },
      });
      toast.success("Presença atualizada.");
    } catch (err: any) {
      setMembers(previous);
      toast.error(err?.message || "Não foi possível alterar a presença.");
    }
  };

  const handleSaveOperationalProfile = async () => {
    if (!editingMember) return;
    setIsSaving(true);
    try {
      await updateTeamMemberProfile({
        data: {
          profileId: editingMember.id,
          departmentId: editDepartmentId === "none" ? null : editDepartmentId,
          whatsappInstanceId: editWhatsappId === "none" ? null : editWhatsappId,
          isAttendanceAgent: editIsAgent,
          maxConcurrentChats: Math.max(1, Math.min(200, Number(editMaxConcurrent) || 10)),
          canTransferChats: editCanTransfer,
          canCloseChats: editCanClose,
          canManageWhatsappQr: editCanManageQr,
          onlyAssignedOrSector: editOnlySector,
        },
      });
      const resolvedInstanceId =
        editWhatsappId !== "none"
          ? editWhatsappId
          : instances.find((i) => i.is_default)?.id || instances[0]?.id || "";
      if (resolvedInstanceId) {
        await upsertInstanceMemberPermissions({
          data: {
            storeId: store?.id,
            instanceId: resolvedInstanceId,
            profileId: editingMember.id,
            canView: editPermCanView,
            canReply: editPermCanView ? editPermCanReply : false,
            canManageQr: editCanManageQr,
            canManageGroups: editPermCanManageGroups,
            canSyncHistory: editPermCanSyncHistory,
            onlyAssignedOrSector: editOnlySector,
            canTransfer: editCanTransfer,
            canClose: editCanClose,
          },
        });
      }
      const [updatedList, updatedPerms] = await Promise.all([
        listTeamMembers(),
        listInstanceMemberPermissions({ data: { storeId: store?.id } }),
      ]);
      setMembers(updatedList || []);
      setInstancePermissions((updatedPerms || []) as InstanceMemberPermissionDTO[]);
      setEditingMember(null);
      toast.success("Vínculos operacionais atualizados.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar vínculos do atendente.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full px-0 sm:px-4 space-y-6">
      <AtendimentoSubmoduleHeader
        activeKey="atendentes"
        title="Atendentes & Presença"
        subtitle="Gerencie presença em tempo real, capacidade simultânea, setor e canal WhatsApp por colaborador"
        showPrimaryChatCta
        rightSlot={
          <Button
            asChild
            variant="outline"
            className="h-11 min-h-11 px-4 rounded-lg text-xs font-medium border-border/60 focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Link to={"/workspace/configuracoes/equipe" as any}>Gerenciar Equipe & RH</Link>
          </Button>
        }
      />

      {loadError ? (
        <ErrorState
          title="Falha ao carregar atendentes"
          description={loadError}
          onRetry={() => router.invalidate()}
        />
      ) : members.length === 0 ? (
        <section className="rounded-xl border border-border/60 bg-card p-8 text-center space-y-3">
          <Users className="size-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-semibold text-foreground">Nenhum colaborador na equipe</p>
          <p className="text-xs text-muted-foreground">
            Convide operadores na página de Equipe para atribuir filas e números WhatsApp.
          </p>
        </section>
      ) : (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {members.map((m) => {
            const biStats = biAgentsMap.get(m.id);
            const openCount = Number(biStats?.openThreads || 0);
            const maxConcurrent = Number(m.max_concurrent_chats || 10);
            const presence = m.attendance_presence || "online";
            return (
              <div
                key={m.id}
                className="rounded-xl border border-border/60 bg-card p-4 space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {m.avatar_url ? (
                      <img
                        src={m.avatar_url}
                        alt={m.full_name || "Atendente"}
                        className="size-10 rounded-full object-cover shrink-0 bg-muted"
                      />
                    ) : (
                      <div className="size-10 rounded-full bg-muted text-foreground font-semibold text-sm flex items-center justify-center shrink-0">
                        {String(m.full_name || m.email || "A").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-foreground truncate">
                        {m.full_name || m.email || "Colaborador"}
                      </h2>
                      <p className="text-xs text-muted-foreground truncate">
                        {m.email || "Sem e-mail público"} • Cargo: {m.role}
                      </p>
                    </div>
                  </div>

                  <Select
                    value={presence}
                    onValueChange={(val) =>
                      handlePresenceChange(m.id, val as "online" | "busy" | "away" | "offline")
                    }
                  >
                    <SelectTrigger className="h-11 min-h-11 w-32 text-xs border-border/60">
                      <span
                        className={cn(
                          "size-2 rounded-full mr-2 shrink-0",
                          presence === "online"
                            ? "bg-success"
                            : presence === "busy"
                              ? "bg-warning"
                              : "bg-muted-foreground",
                        )}
                      />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="busy">Ocupado</SelectItem>
                      <SelectItem value="away">Pausa</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="outline" className="text-xs">
                    Setor: {m.department?.name || m.default_department_slug || "Geral"}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    WhatsApp: {m.whatsapp_instance?.display_name || "Padrão da loja"}
                  </Badge>
                  <Badge variant="secondary" className="text-xs font-mono">
                    Carga: {openCount} / {maxConcurrent}
                  </Badge>
                </div>

                <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {m.is_attendance_agent === false
                      ? "Acesso operacional desativado"
                      : m.only_assigned_or_sector
                        ? "Visualiza apenas próprio setor/carteira"
                        : "Acesso amplo às conversas"}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => openEditDrawer(m)}
                    className="h-11 min-h-11 px-3 text-xs font-medium gap-2 border-border/60 focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Settings2 className="size-4" />
                    <span>Configurar</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <Sheet
        open={Boolean(editingMember)}
        onOpenChange={(open) => !open && setEditingMember(null)}
      >
        <SheetContent className="w-full sm:max-w-md flex flex-col gap-4 overflow-y-auto p-6">
          <SheetHeader>
            <SheetTitle>Vínculos de Atendimento</SheetTitle>
            <SheetDescription className="text-xs">
              Defina setor, número WhatsApp padrão e limites simultâneos para{" "}
              {editingMember?.full_name || "este colaborador"}.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Setor / Fila Padrão</Label>
              <Select value={editDepartmentId} onValueChange={setEditDepartmentId}>
                <SelectTrigger className="h-11 min-h-11 text-xs">
                  <SelectValue placeholder="Selecione um setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem setor específico</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Número WhatsApp Vinculado</Label>
              <Select
                value={editWhatsappId}
                onValueChange={(val) => {
                  setEditWhatsappId(val);
                  if (editingMember) {
                    hydrateChannelPerms(editingMember.id, val, editingMember);
                  }
                }}
              >
                <SelectTrigger className="h-11 min-h-11 text-xs">
                  <SelectValue placeholder="Canal padrão da loja" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seguir canal padrão da loja</SelectItem>
                  {instances.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.display_name}
                      {inst.display_phone_number ? ` (${inst.display_phone_number})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Limite de Conversas Simultâneas</Label>
              <Input
                type="number"
                min={1}
                max={200}
                value={editMaxConcurrent}
                onChange={(e) => setEditMaxConcurrent(Number(e.target.value))}
                className="h-11 min-h-11 text-xs"
              />
            </div>

            <div className="divide-y divide-border/50">
              <div className="py-3 flex items-center justify-between gap-2">
                <Label htmlFor="agent-enabled" className="text-xs cursor-pointer">
                  Ativo na fila de atendimento
                </Label>
                <Switch
                  id="agent-enabled"
                  checked={editIsAgent}
                  onCheckedChange={setEditIsAgent}
                />
              </div>
              <div className="py-3 flex items-center justify-between gap-2">
                <Label htmlFor="agent-transfer" className="text-xs cursor-pointer">
                  Pode transferir conversas
                </Label>
                <Switch
                  id="agent-transfer"
                  checked={editCanTransfer}
                  onCheckedChange={setEditCanTransfer}
                />
              </div>
              <div className="py-3 flex items-center justify-between gap-2">
                <Label htmlFor="agent-close" className="text-xs cursor-pointer">
                  Pode concluir/encerrar chats
                </Label>
                <Switch
                  id="agent-close"
                  checked={editCanClose}
                  onCheckedChange={setEditCanClose}
                />
              </div>
              <div className="py-3 flex items-center justify-between gap-2">
                <Label htmlFor="agent-qr" className="text-xs cursor-pointer">
                  Pode parear QR Code WhatsApp
                </Label>
                <Switch
                  id="agent-qr"
                  checked={editCanManageQr}
                  onCheckedChange={setEditCanManageQr}
                />
              </div>
              <div className="py-3 flex items-center justify-between gap-2">
                <Label htmlFor="agent-restricted" className="text-xs cursor-pointer">
                  Restringir ao próprio setor e atribuições
                </Label>
                <Switch
                  id="agent-restricted"
                  checked={editOnlySector}
                  onCheckedChange={setEditOnlySector}
                />
              </div>
              <div className="py-3 flex items-center justify-between gap-2">
                <Label htmlFor="perm-can-view" className="text-xs cursor-pointer">
                  Visualizar mensagens do canal WhatsApp
                </Label>
                <Switch
                  id="perm-can-view"
                  checked={editPermCanView}
                  onCheckedChange={(checked) => {
                    setEditPermCanView(checked);
                    if (!checked) setEditPermCanReply(false);
                  }}
                />
              </div>
              <div className="py-3 flex items-center justify-between gap-2">
                <Label htmlFor="perm-can-reply" className="text-xs cursor-pointer">
                  Enviar mensagens pelo canal WhatsApp
                </Label>
                <Switch
                  id="perm-can-reply"
                  disabled={!editPermCanView}
                  checked={editPermCanView && editPermCanReply}
                  onCheckedChange={setEditPermCanReply}
                />
              </div>
              <div className="py-3 flex items-center justify-between gap-2">
                <Label htmlFor="perm-can-manage-groups" className="text-xs cursor-pointer">
                  Gerenciar grupos e campanhas WhatsApp
                </Label>
                <Switch
                  id="perm-can-manage-groups"
                  checked={editPermCanManageGroups}
                  onCheckedChange={setEditPermCanManageGroups}
                />
              </div>
              <div className="py-3 flex items-center justify-between gap-2">
                <Label htmlFor="perm-can-sync-history" className="text-xs cursor-pointer">
                  Sincronizar histórico completo do canal
                </Label>
                <Switch
                  id="perm-can-sync-history"
                  checked={editPermCanSyncHistory}
                  onCheckedChange={setEditPermCanSyncHistory}
                />
              </div>
            </div>
          </div>

          <SheetFooter className="mt-auto pt-4 border-t border-border/60 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingMember(null)}
              className="h-11 min-h-11 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isSaving}
              onClick={handleSaveOperationalProfile}
              className="h-11 min-h-11 text-xs font-semibold gap-2"
            >
              {isSaving && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />}
              <span>Salvar Vínculos</span>
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
