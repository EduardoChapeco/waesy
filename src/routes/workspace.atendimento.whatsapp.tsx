import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  CheckCircle2,
  Loader2,
  MessageSquare,
  MoreVertical,
  Pencil,
  PowerOff,
  QrCode,
  RefreshCw,
  Smartphone,
  Star,
  Trash2,
} from "lucide-react";
import { AtendimentoSubmoduleHeader } from "@/components/atendimento/AtendimentoSubmoduleHeader";
import { WhatsAppQrConnectModal } from "@/components/chat/whatsapp-qr-connect-modal";
import { WhatsAppOperationsMetricsPanel } from "@/components/chat/whatsapp-operations-metrics-panel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { resetStoreChatHistoryLocal } from "@/services/chat.functions";
import { getStoreSettings } from "@/services/store.functions";
import {
  deleteWorkspaceWhatsAppInstance,
  disconnectWhatsAppInstance,
  listWorkspaceWhatsAppInstances,
  syncWhatsAppChatsFromEvolution,
  syncWhatsAppInstanceStatus,
  updateWorkspaceWhatsAppInstanceMetadata,
  type WhatsAppChannelInstanceDTO,
} from "@/services/whatsapp-channel-instances.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/atendimento/whatsapp")({
  head: () => ({ meta: [{ title: "Canais WhatsApp — Atendimento" }] }),
  loader: async () => {
    try {
      const store = await getStoreSettings().catch(() => null);
      const instances = await listWorkspaceWhatsAppInstances({
        data: { store_id: store?.id },
      }).catch(() => []);
      return {
        store,
        instances: (instances || []) as WhatsAppChannelInstanceDTO[],
      };
    } catch {
      return { store: null, instances: [] as WhatsAppChannelInstanceDTO[] };
    }
  },
  component: WorkspaceAtendimentoWhatsAppPage,
});

function getStatusMeta(inst: WhatsAppChannelInstanceDTO) {
  if (inst.is_active && inst.status === "connected") {
    return { label: "Conectado", dotClass: "bg-emerald-500", tone: "text-emerald-700 dark:text-emerald-300" };
  }
  if (inst.status === "revoked") {
    return { label: "Sessão Revogada", dotClass: "bg-destructive", tone: "text-destructive" };
  }
  if (inst.status === "error") {
    return { label: "Erro de Conexão", dotClass: "bg-destructive", tone: "text-destructive" };
  }
  if (inst.status === "pending") {
    return { label: "Aguardando QR", dotClass: "bg-warning", tone: "text-warning-strong" };
  }
  return { label: "Desconectado", dotClass: "bg-muted-foreground", tone: "text-muted-foreground" };
}

function WorkspaceAtendimentoWhatsAppPage() {
  const loaderData = (Route.useLoaderData?.() as any) || {};
  const store = loaderData.store || null;
  const [instances, setInstances] = useState<WhatsAppChannelInstanceDTO[]>(
    loaderData.instances || [],
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal QR unificado com targetInstanceId + initialMode
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrTargetInstanceId, setQrTargetInstanceId] = useState<string | null>(null);
  const [qrInitialMode, setQrInitialMode] = useState<"create" | "manage">("manage");

  // Modal Editar Identificação
  const [editingInst, setEditingInst] = useState<WhatsAppChannelInstanceDTO | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editIsDefault, setEditIsDefault] = useState(false);
  const [isSavingMeta, setIsSavingMeta] = useState(false);

  // AlertDialog Exclusão definitiva de conexão
  const [deleteTarget, setDeleteTarget] = useState<WhatsAppChannelInstanceDTO | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Higienização local
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const reloadInstances = async () => {
    setIsRefreshing(true);
    try {
      const updated = await listWorkspaceWhatsAppInstances({ data: { store_id: store?.id } });
      setInstances(updated || []);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar lista de canais.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleOpenCreateNew = () => {
    setQrTargetInstanceId(null);
    setQrInitialMode("create");
    setQrModalOpen(true);
  };

  const handleOpenManageInstance = (inst: WhatsAppChannelInstanceDTO) => {
    setQrTargetInstanceId(inst.id);
    setQrInitialMode("manage");
    setQrModalOpen(true);
  };

  const handleOpenEditMeta = (inst: WhatsAppChannelInstanceDTO) => {
    setEditingInst(inst);
    setEditDisplayName(inst.display_name || "");
    setEditDepartment(String(inst.public_config?.department || "Geral"));
    setEditIsDefault(Boolean(inst.is_default));
  };

  const handleSaveMetadata = async () => {
    if (!editingInst) return;
    setIsSavingMeta(true);
    try {
      await updateWorkspaceWhatsAppInstanceMetadata({
        data: {
          id: editingInst.id,
          storeId: store?.id,
          displayName: editDisplayName.trim(),
          department: editDepartment.trim() || "Geral",
          isDefault: editIsDefault,
        },
      });
      toast.success("Identificação do canal atualizada.");
      setEditingInst(null);
      await reloadInstances();
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível salvar os dados do canal.");
    } finally {
      setIsSavingMeta(false);
    }
  };

  const handleSetDefault = async (inst: WhatsAppChannelInstanceDTO) => {
    try {
      await updateWorkspaceWhatsAppInstanceMetadata({
        data: { id: inst.id, storeId: store?.id, isDefault: true },
      });
      toast.success(`"${inst.display_name}" definido como canal padrão.`);
      await reloadInstances();
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível definir este canal como padrão.");
    }
  };

  const handleSyncInstance = async (inst: WhatsAppChannelInstanceDTO) => {
    try {
      const res = await syncWhatsAppInstanceStatus({ data: { id: inst.id } });
      await syncWhatsAppChatsFromEvolution({ data: { storeId: store?.id } }).catch(() => null);
      toast.success(`Canal sincronizado: ${res.state}`);
      await reloadInstances();
    } catch (err: any) {
      toast.error(err?.message || "Falha ao sincronizar status na VPS.");
    }
  };

  const handleDisconnectInstance = async (inst: WhatsAppChannelInstanceDTO) => {
    try {
      await disconnectWhatsAppInstance({
        data: { id: inst.id, storeId: store?.id, deepDisconnect: false },
      });
      toast.success(`Sessão "${inst.display_name}" desconectada.`);
      await reloadInstances();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao desconectar aparelho.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deleteWorkspaceWhatsAppInstance({
        data: { id: deleteTarget.id, storeId: store?.id, forcePurge: true },
      });
      setInstances((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      toast.success(
        res.gatewayCleanupOk
          ? `Conexão "${deleteTarget.display_name}" excluída definitivamente.`
          : `Canal removido do Waesy (${res.gatewayCleanupError || "VPS indisponível no momento"}).`,
      );
      setDeleteTarget(null);
      await reloadInstances();
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível excluir a conexão WhatsApp.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmResetHistory = async () => {
    if (!store?.id || resetCode.trim() !== "RESETAR") return;
    setIsResetting(true);
    try {
      const res = await resetStoreChatHistoryLocal({
        data: { storeId: store.id, confirmationCode: "RESETAR" },
      });
      toast.success(`${res.deletedThreadsCount} conversas locais removidas.`);
      setResetModalOpen(false);
      setResetCode("");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao resetar histórico local.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="w-full px-0 sm:px-4 space-y-6">
      <AtendimentoSubmoduleHeader
        activeKey="whatsapp"
        title="Canais WhatsApp"
        subtitle="Conecte múltiplos números, gerencie sessões e exclua conexões não utilizadas"
        showPrimaryChatCta={false}
        rightSlot={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={reloadInstances}
              disabled={isRefreshing}
              className="h-11 min-h-11 px-3 rounded-lg text-xs font-medium gap-2 border-border/60 focus-visible:ring-2 focus-visible:ring-primary"
            >
              <RefreshCw className={cn("size-4", isRefreshing && "animate-spin motion-reduce:animate-none")} />
              <span>Atualizar</span>
            </Button>
            <Button
              type="button"
              onClick={handleOpenCreateNew}
              className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-2 focus-visible:ring-2 focus-visible:ring-primary"
            >
              <QrCode className="size-4" />
              <span>Conectar Novo Número</span>
            </Button>
          </>
        }
      />

      {instances.length === 0 ? (
        <section className="rounded-xl border border-border/60 bg-card p-8 text-center space-y-4">
          <div className="size-12 rounded-full bg-muted text-muted-foreground flex items-center justify-center mx-auto">
            <Smartphone className="size-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">
              Nenhum número WhatsApp configurado
            </h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Use o botão acima para parear seu primeiro aparelho via QR Code ou configurar a API oficial da Meta.
            </p>
          </div>
        </section>
      ) : (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {instances.map((inst) => {
            const meta = getStatusMeta(inst);
            const isConnected = inst.is_active && inst.status === "connected";
            return (
              <div
                key={inst.id}
                className="rounded-xl border border-border/60 bg-card p-4 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm font-semibold text-foreground truncate">
                          {inst.display_name}
                        </h2>
                        {inst.is_default && (
                          <Badge variant="secondary" className="text-xs font-medium">
                            Padrão
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs font-mono text-muted-foreground truncate">
                        {inst.display_phone_number || "Número aguardando pareamento"}
                      </p>
                    </div>

                    <Badge variant="outline" className={cn("text-xs gap-2 shrink-0", meta.tone)}>
                      <span className={cn("size-2 rounded-full", meta.dotClass)} />
                      {meta.label}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>Setor: {String(inst.public_config?.department || "Geral")}</span>
                    <span>•</span>
                    <span>
                      Motor: {inst.provider === "meta_cloud_api" ? "Meta Cloud Oficial" : "QR Code VPS"}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/50 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOpenManageInstance(inst)}
                    className="h-11 min-h-11 flex-1 text-xs font-medium gap-2 border-border/60 focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <QrCode className="size-4" />
                    <span>{isConnected ? "Gerenciar" : "Parear via QR"}</span>
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                    className="h-11 min-h-11 px-3 text-xs font-medium gap-2 border-border/60 focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Link
                      to={"/workspace/atendimento/chat" as any}
                      search={{ channelInstanceId: inst.id } as any}
                    >
                      <MessageSquare className="size-4" />
                      <span className="hidden sm:inline">Conversas</span>
                    </Link>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={`Mais ações para ${inst.display_name}`}
                        className="size-11 min-w-11 min-h-11 border-border/60 focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenEditMeta(inst)}>
                        <Pencil className="size-4 mr-2" />
                        Editar Identificação
                      </DropdownMenuItem>
                      {!inst.is_default && (
                        <DropdownMenuItem onClick={() => handleSetDefault(inst)}>
                          <Star className="size-4 mr-2" />
                          Definir como Padrão
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleSyncInstance(inst)}>
                        <RefreshCw className="size-4 mr-2" />
                        Sincronizar Status & Chats
                      </DropdownMenuItem>
                      {(isConnected || inst.status === "pending") && (
                        <DropdownMenuItem onClick={() => handleDisconnectInstance(inst)}>
                          <PowerOff className="size-4 mr-2" />
                          Desconectar Aparelho
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteTarget(inst)}
                      >
                        <Trash2 className="size-4 mr-2" />
                        Excluir Conexão
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Diagnóstico & Higienização Local */}
      <section className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">
              Saúde do Gateway & Higienização Local
            </h2>
            <p className="text-xs text-muted-foreground">
              O reset local apaga apenas conversas cacheadas no Waesy sem afetar aparelhos dos clientes.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setResetModalOpen(true)}
            className="h-11 min-h-11 px-4 text-xs font-medium text-destructive border-destructive/40 hover:bg-destructive/10 gap-2 shrink-0 focus-visible:ring-2 focus-visible:ring-destructive"
          >
            <Trash2 className="size-4" />
            <span>Resetar Histórico Local</span>
          </Button>
        </div>

        <WhatsAppOperationsMetricsPanel />
      </section>

      {/* Modal QR Code com isolamento por targetInstanceId e initialMode */}
      <WhatsAppQrConnectModal
        open={qrModalOpen}
        onOpenChange={setQrModalOpen}
        instances={instances}
        targetInstanceId={qrTargetInstanceId}
        initialMode={qrInitialMode}
        canManageConnection
        onInstancesUpdated={() => {
          reloadInstances();
        }}
      />

      {/* Modal Editar Identificação */}
      <Dialog open={Boolean(editingInst)} onOpenChange={(open) => !open && setEditingInst(null)}>
        <DialogContent className="sm:max-w-md p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Editar Canal WhatsApp</DialogTitle>
            <DialogDescription className="text-xs">
              Atualize o nome interno, setor padrão ou preferência de disparo desta conexão.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Nome do Canal</Label>
              <Input
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                className="h-11 min-h-11 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Setor Padrão</Label>
              <Input
                value={editDepartment}
                onChange={(e) => setEditDepartment(e.target.value)}
                className="h-11 min-h-11 text-xs"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <Label htmlFor="edit-default-wa" className="text-xs font-medium cursor-pointer">
                Usar como canal padrão da loja
              </Label>
              <Switch
                id="edit-default-wa"
                checked={editIsDefault}
                onCheckedChange={setEditIsDefault}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingInst(null)}
              className="h-11 min-h-11 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveMetadata}
              disabled={isSavingMeta || editDisplayName.trim().length < 2}
              className="h-11 min-h-11 text-xs font-semibold gap-2"
            >
              {isSavingMeta && <Loader2 className="size-4 animate-spin" />}
              <CheckCircle2 className="size-4" />
              <span>Salvar Alterações</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog Confirmar Exclusão Definitiva */}
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conexão "{deleteTarget?.display_name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação desconecta a instância na Evolution API e exclui definitivamente este canal da loja. Conversas antigas continuam preservadas no histórico sem perder mensagens.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 min-h-11 text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="h-11 min-h-11 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {isDeleting && <Loader2 className="size-4 animate-spin" />}
              <span>Excluir Definitivamente</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Resetar Histórico Local */}
      <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
        <DialogContent className="sm:max-w-md p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Resetar Histórico Local</DialogTitle>
            <DialogDescription className="text-xs">
              Digite RESETAR para remover as conversas e mensagens locais armazenadas nesta loja.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={resetCode}
            onChange={(e) => setResetCode(e.target.value)}
            placeholder="RESETAR"
            className="h-11 min-h-11 font-mono uppercase text-xs"
          />
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setResetModalOpen(false);
                setResetCode("");
              }}
              className="h-11 min-h-11 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isResetting || resetCode.trim() !== "RESETAR"}
              onClick={handleConfirmResetHistory}
              className="h-11 min-h-11 text-xs font-semibold gap-2"
            >
              {isResetting && <Loader2 className="size-4 animate-spin" />}
              <span>Confirmar Reset</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
