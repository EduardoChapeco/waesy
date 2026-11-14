import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Bot,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { AtendimentoSubmoduleHeader } from "@/components/atendimento/AtendimentoSubmoduleHeader";
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
import { Textarea } from "@/components/ui/textarea";
import { listTeamMembers } from "@/services/admin-team.functions";
import { getStoreSettings } from "@/services/store.functions";
import {
  deleteChatDepartment,
  listChatDepartments,
  listWorkspaceWhatsAppInstances,
  upsertChatDepartment,
  type ChatDepartmentDTO,
  type WhatsAppChannelInstanceDTO,
} from "@/services/whatsapp-channel-instances.functions";

export const Route = createFileRoute("/workspace/atendimento/filas")({
  head: () => ({ meta: [{ title: "Filas & Setores — Atendimento" }] }),
  loader: async () => {
    try {
      const store = await getStoreSettings().catch(() => null);
      const [departments, instances, members] = await Promise.all([
        listChatDepartments({ data: { storeId: store?.id } }).catch(() => []),
        listWorkspaceWhatsAppInstances({ data: { store_id: store?.id } }).catch(() => []),
        listTeamMembers().catch(() => []),
      ]);
      return {
        store,
        departments: (departments || []) as ChatDepartmentDTO[],
        instances: (instances || []) as WhatsAppChannelInstanceDTO[],
        members: members || [],
      };
    } catch {
      return {
        store: null,
        departments: [] as ChatDepartmentDTO[],
        instances: [] as WhatsAppChannelInstanceDTO[],
        members: [],
      };
    }
  },
  component: WorkspaceAtendimentoFilasPage,
});

const ROUTING_LABELS: Record<string, string> = {
  ai_sdr_first: "IA Triagem primeiro",
  round_robin: "Rodízio automático",
  least_busy: "Menos ocupado",
  manual_queue: "Fila manual",
};

type TriageStageDraft = {
  id: string;
  title: string;
  instruction: string;
  handoffToHuman: boolean;
};

function WorkspaceAtendimentoFilasPage() {
  const loaderData = (Route.useLoaderData?.() as any) || {};
  const store = loaderData.store || null;
  const instances: WhatsAppChannelInstanceDTO[] = loaderData.instances || [];
  const members: any[] = loaderData.members || [];
  const [departments, setDepartments] = useState<ChatDepartmentDTO[]>(
    loaderData.departments || [],
  );

  const instancesById = useMemo(
    () => new Map<string, WhatsAppChannelInstanceDTO>(instances.map((i) => [i.id, i])),
    [instances],
  );
  const membersById = useMemo(
    () => new Map<string, any>(members.map((m) => [m.id, m])),
    [members],
  );

  // Drawer criar/editar setor
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [routingMode, setRoutingMode] = useState<
    "ai_sdr_first" | "round_robin" | "least_busy" | "manual_queue"
  >("ai_sdr_first");
  const [slaMinutes, setSlaMinutes] = useState(15);
  const [whatsappInstanceId, setWhatsappInstanceId] = useState<string>("none");
  const [scheduleStart, setScheduleStart] = useState("08:00");
  const [scheduleEnd, setScheduleEnd] = useState("18:00");
  const [scheduleDays, setScheduleDays] = useState("Seg a Sex");
  const [autoGreetingMessage, setAutoGreetingMessage] = useState("");
  const [awayMessage, setAwayMessage] = useState("");
  const [aiSdrEnabled, setAiSdrEnabled] = useState(true);
  const [aiSdrSkillPrompt, setAiSdrSkillPrompt] = useState("");
  const [roundRobinEnabled, setRoundRobinEnabled] = useState(true);
  const [assignedAgentIds, setAssignedAgentIds] = useState<string[]>([]);
  const [aiTriageStages, setAiTriageStages] = useState<TriageStageDraft[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Exclusão de setor
  const [deleteTarget, setDeleteTarget] = useState<ChatDepartmentDTO | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const reloadDepartments = async () => {
    const fresh = await listChatDepartments({ data: { storeId: store?.id } }).catch(() => null);
    if (fresh) setDepartments(fresh);
  };

  const handleOpenCreate = () => {
    setEditingId(undefined);
    setName("");
    setSlug("");
    setDescription("");
    setRoutingMode("ai_sdr_first");
    setSlaMinutes(15);
    setWhatsappInstanceId("none");
    setScheduleStart("08:00");
    setScheduleEnd("18:00");
    setScheduleDays("Seg a Sex");
    setAutoGreetingMessage("");
    setAwayMessage("");
    setAiSdrEnabled(true);
    setAiSdrSkillPrompt("");
    setRoundRobinEnabled(true);
    setAssignedAgentIds([]);
    setAiTriageStages([]);
    setIsActive(true);
    setDrawerOpen(true);
  };

  const handleOpenEdit = (dept: ChatDepartmentDTO) => {
    setEditingId(dept.id);
    setName(dept.name || "");
    setSlug(dept.slug || "");
    setDescription(dept.description || "");
    setRoutingMode(dept.routing_mode || "ai_sdr_first");
    setSlaMinutes(Number(dept.sla_minutes || 15));
    setWhatsappInstanceId(dept.whatsapp_instance_id || "none");
    setScheduleStart(dept.schedule_start || "08:00");
    setScheduleEnd(dept.schedule_end || "18:00");
    setScheduleDays(dept.schedule_days || "Seg a Sex");
    setAutoGreetingMessage(dept.auto_greeting_message || "");
    setAwayMessage(dept.away_message || "");
    setAiSdrEnabled(dept.ai_sdr_enabled ?? true);
    setAiSdrSkillPrompt(dept.ai_sdr_skill_prompt || "");
    setRoundRobinEnabled(dept.round_robin_enabled ?? true);
    setAssignedAgentIds(Array.isArray(dept.assigned_agent_ids) ? dept.assigned_agent_ids : []);
    setAiTriageStages(Array.isArray(dept.ai_triage_stages) ? dept.ai_triage_stages : []);
    setIsActive(dept.is_active ?? true);
    setDrawerOpen(true);
  };

  const toggleAgentSelection = (agentId: string) => {
    setAssignedAgentIds((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId],
    );
  };

  const handleAddTriageStage = () => {
    setAiTriageStages((prev) => [
      ...prev,
      {
        id: `stage_${Date.now().toString(36)}`,
        title: `Etapa ${prev.length + 1}`,
        instruction: "",
        handoffToHuman: false,
      },
    ]);
  };

  const handleSaveDepartment = async () => {
    if (name.trim().length < 2) {
      toast.error("Informe o nome do setor (mínimo 2 caracteres).");
      return;
    }
    setIsSaving(true);
    try {
      await upsertChatDepartment({
        data: {
          id: editingId,
          storeId: store?.id,
          name: name.trim(),
          slug: slug.trim() || undefined,
          description: description.trim() || null,
          color: "emerald",
          routingMode,
          slaMinutes: Math.max(1, Math.min(1440, Number(slaMinutes) || 15)),
          whatsappInstanceId: whatsappInstanceId === "none" ? null : whatsappInstanceId,
          scheduleStart: scheduleStart.trim() || "08:00",
          scheduleEnd: scheduleEnd.trim() || "18:00",
          scheduleDays: scheduleDays.trim() || "Seg a Sex",
          autoGreetingMessage: autoGreetingMessage.trim() || null,
          awayMessage: awayMessage.trim() || null,
          aiSdrEnabled,
          aiSdrSkillPrompt: aiSdrSkillPrompt.trim() || null,
          roundRobinEnabled,
          assignedAgentIds,
          aiTriageStages: aiTriageStages.filter((s) => s.title.trim().length > 0),
          isActive,
        },
      });
      toast.success(editingId ? "Setor atualizado." : "Setor criado e sincronizado.");
      setDrawerOpen(false);
      await reloadDepartments();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar setor.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteChatDepartment({ data: { id: deleteTarget.id, storeId: store?.id } });
      setDepartments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      toast.success(`Setor "${deleteTarget.name}" removido.`);
      setDeleteTarget(null);
      await reloadDepartments();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao excluir setor.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full px-0 sm:px-4 space-y-6">
      <AtendimentoSubmoduleHeader
        activeKey="filas"
        title="Filas & Setores"
        subtitle="Configure roteamento, metas de SLA, canal WhatsApp preferencial e triagem IA por setor"
        showPrimaryChatCta={false}
        rightSlot={
          <Button
            type="button"
            onClick={handleOpenCreate}
            className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-2 focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Plus className="size-4" />
            <span>Novo Setor</span>
          </Button>
        }
      />

      {departments.length === 0 ? (
        <section className="rounded-xl border border-border/60 bg-card p-8 text-center space-y-3">
          <Layers className="size-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-semibold text-foreground">Nenhum setor configurado</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Crie filas dedicadas como Comercial, Suporte ou Financeiro para distribuir atendimentos automaticamente.
          </p>
        </section>
      ) : (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {departments.map((dept) => {
            const linkedInst = dept.whatsapp_instance_id
              ? instancesById.get(dept.whatsapp_instance_id)
              : null;
            const agentCount = Array.isArray(dept.assigned_agent_ids)
              ? dept.assigned_agent_ids.length
              : 0;
            const stageCount = Array.isArray(dept.ai_triage_stages)
              ? dept.ai_triage_stages.length
              : 0;
            return (
              <div
                key={dept.id}
                className="rounded-xl border border-border/60 bg-card p-4 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm font-semibold text-foreground truncate">
                          {dept.name}
                        </h2>
                        <Badge variant="outline" className="text-xs font-mono">
                          {dept.slug}
                        </Badge>
                      </div>
                      {dept.description && (
                        <p className="text-xs text-muted-foreground">{dept.description}</p>
                      )}
                    </div>
                    <Badge variant={dept.is_active ? "secondary" : "outline"} className="text-xs shrink-0">
                      {dept.is_active ? "Ativo" : "Pausado"}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="outline" className="text-xs">
                      {ROUTING_LABELS[dept.routing_mode] || dept.routing_mode}
                    </Badge>
                    <Badge variant="outline" className="text-xs font-mono">
                      SLA {dept.sla_minutes} min
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {dept.schedule_days} ({dept.schedule_start}–{dept.schedule_end})
                    </Badge>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>
                      WhatsApp preferencial:{" "}
                      <span className="text-foreground font-medium">
                        {linkedInst
                          ? `${linkedInst.display_name}${linkedInst.display_phone_number ? ` (${linkedInst.display_phone_number})` : ""}`
                          : "Canal padrão da loja"}
                      </span>
                    </p>
                    <p>
                      Atendentes vinculados:{" "}
                      <span className="text-foreground font-medium">
                        {agentCount > 0
                          ? dept.assigned_agent_ids
                              .map((id) => membersById.get(id)?.full_name || "Atendente")
                              .slice(0, 3)
                              .join(", ") + (agentCount > 3 ? ` +${agentCount - 3}` : "")
                          : "Todos disponíveis"}
                      </span>
                      {" • "}IA Triagem: {dept.ai_sdr_enabled ? `${stageCount} etapas` : "Desativada"}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/50 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDeleteTarget(dept)}
                    className="h-11 min-h-11 px-3 text-xs text-destructive border-destructive/40 hover:bg-destructive/10 gap-2 focus-visible:ring-2 focus-visible:ring-destructive"
                  >
                    <Trash2 className="size-4" />
                    <span>Excluir</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOpenEdit(dept)}
                    className="h-11 min-h-11 px-4 text-xs font-medium gap-2 border-border/60 focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Pencil className="size-4" />
                    <span>Editar Setor</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Drawer Criar / Editar Setor */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col gap-4 overflow-y-auto p-6">
          <SheetHeader>
            <SheetTitle>{editingId ? "Editar Setor & Fila" : "Novo Setor de Atendimento"}</SheetTitle>
            <SheetDescription className="text-xs">
              Sincronizado diretamente com as filas de chat e roteamento de mensagens da loja.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Nome do Setor</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Comercial, Financeiro"
                  className="h-11 min-h-11 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Slug (Identificador)</Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="comercial"
                  className="h-11 min-h-11 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Descrição</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Finalidade desta fila"
                className="h-11 min-h-11 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Modo de Roteamento</Label>
                <Select
                  value={routingMode}
                  onValueChange={(val) =>
                    setRoutingMode(
                      val as "ai_sdr_first" | "round_robin" | "least_busy" | "manual_queue",
                    )
                  }
                >
                  <SelectTrigger className="h-11 min-h-11 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ai_sdr_first">IA Triagem primeiro</SelectItem>
                    <SelectItem value="round_robin">Rodízio automático</SelectItem>
                    <SelectItem value="least_busy">Atendente menos ocupado</SelectItem>
                    <SelectItem value="manual_queue">Fila manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Meta SLA (minutos)</Label>
                <Input
                  type="number"
                  min={1}
                  max={1440}
                  value={slaMinutes}
                  onChange={(e) => setSlaMinutes(Number(e.target.value))}
                  className="h-11 min-h-11 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Canal WhatsApp Preferencial</Label>
              <Select value={whatsappInstanceId} onValueChange={setWhatsappInstanceId}>
                <SelectTrigger className="h-11 min-h-11 text-xs">
                  <SelectValue placeholder="Canal padrão da loja" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Canal padrão da loja</SelectItem>
                  {instances.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.display_name}
                      {inst.display_phone_number ? ` (${inst.display_phone_number})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Início</Label>
                <Input
                  value={scheduleStart}
                  onChange={(e) => setScheduleStart(e.target.value)}
                  className="h-11 min-h-11 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Fim</Label>
                <Input
                  value={scheduleEnd}
                  onChange={(e) => setScheduleEnd(e.target.value)}
                  className="h-11 min-h-11 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Dias</Label>
                <Input
                  value={scheduleDays}
                  onChange={(e) => setScheduleDays(e.target.value)}
                  className="h-11 min-h-11 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Saudação Automática do Setor</Label>
              <Textarea
                rows={2}
                value={autoGreetingMessage}
                onChange={(e) => setAutoGreetingMessage(e.target.value)}
                placeholder="Ex: Olá! Você está no setor Comercial..."
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Atendentes da Fila</Label>
              {members.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum membro na loja.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border border-border/60 rounded-lg p-2">
                  {members.map((m) => {
                    const checked = assignedAgentIds.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className="flex items-center gap-3 px-2 h-11 min-h-11 rounded hover:bg-muted/40 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAgentSelection(m.id)}
                          className="size-4 accent-primary"
                        />
                        <span className="truncate font-medium text-foreground">
                          {m.full_name || m.email || "Colaborador"}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2 border-t border-border/60 pt-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="dept-ai-sdr" className="text-xs font-medium flex items-center gap-2 cursor-pointer">
                  <Bot className="size-4 text-primary" />
                  <span>Habilitar Triagem IA neste setor</span>
                </Label>
                <Switch
                  id="dept-ai-sdr"
                  checked={aiSdrEnabled}
                  onCheckedChange={setAiSdrEnabled}
                />
              </div>

              {aiSdrEnabled && (
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Prompt de Instrução IA</Label>
                    <Textarea
                      rows={2}
                      value={aiSdrSkillPrompt}
                      onChange={(e) => setAiSdrSkillPrompt(e.target.value)}
                      placeholder="Como a IA deve qualificar leads antes de passar para humanos..."
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Etapas de Triagem ({aiTriageStages.length})</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddTriageStage}
                        className="h-11 min-h-11 px-3 text-xs gap-1"
                      >
                        <Plus className="size-3.5" /> Etapa
                      </Button>
                    </div>
                    {aiTriageStages.map((stage, idx) => (
                      <div
                        key={stage.id}
                        className="p-3 rounded-lg bg-muted/30 space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <Input
                            value={stage.title}
                            onChange={(e) => {
                              const copy = [...aiTriageStages];
                              copy[idx] = { ...copy[idx], title: e.target.value };
                              setAiTriageStages(copy);
                            }}
                            placeholder="Título da etapa"
                            className="h-11 min-h-11 text-xs flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setAiTriageStages((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="size-11 min-w-11 min-h-11 text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                        <Input
                          value={stage.instruction}
                          onChange={(e) => {
                            const copy = [...aiTriageStages];
                            copy[idx] = { ...copy[idx], instruction: e.target.value };
                            setAiTriageStages(copy);
                          }}
                          placeholder="Pergunta ou objetivo desta etapa"
                          className="h-11 min-h-11 text-xs"
                        />
                        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={stage.handoffToHuman}
                            onChange={(e) => {
                              const copy = [...aiTriageStages];
                              copy[idx] = { ...copy[idx], handoffToHuman: e.target.checked };
                              setAiTriageStages(copy);
                            }}
                            className="size-4 accent-primary"
                          />
                          <span>Transferir para atendente humano ao concluir etapa</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <Label htmlFor="dept-active" className="text-xs font-medium cursor-pointer">
                Setor ativo para novos atendimentos
              </Label>
              <Switch id="dept-active" checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>

          <SheetFooter className="mt-auto pt-4 border-t border-border/60 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDrawerOpen(false)}
              className="h-11 min-h-11 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isSaving}
              onClick={handleSaveDepartment}
              className="h-11 min-h-11 text-xs font-semibold gap-2"
            >
              {isSaving && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />}
              <span>Salvar Setor</span>
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir setor "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Colaboradores vinculados perderão apenas a atribuição padrão a este setor. Conversas históricas não serão apagadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 min-h-11 text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="h-11 min-h-11 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {isDeleting && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />}
              <span>Excluir Setor</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
