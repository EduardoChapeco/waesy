import React, { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Check,
  Plus,
  MessageSquare,
  AlertTriangle,
  ListTodo,
  Plane,
  ShoppingBag,
  FileText,
  Loader2,
  Send,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { Input } from "@/components/ui/input";
import {
  ONBOARDING_CS_STEPS,
  SAC_FUNCTION_ROLES,
  CustomerIdentityTagPill,
  type OnboardingStepKey,
  type SacFunctionRoleKey,
} from "@/lib/entity-trace-hash";
import {
  toggleCustomerOnboardingStep,
  createLinkedCustomerTask,
} from "@/services/chat.functions";
import type { CustomerSuccessSheetRowDTO } from "@/services/support-tickets.functions";

export interface CustomerSuccessOnboardingSheetProps {
  storeId: string;
  rows: CustomerSuccessSheetRowDTO[];
  onRefresh: () => void;
  onOpenNewTicketForRow?: (row: CustomerSuccessSheetRowDTO) => void;
}

export function CustomerSuccessOnboardingSheet({
  storeId,
  rows,
  onRefresh,
  onOpenNewTicketForRow,
}: CustomerSuccessOnboardingSheetProps) {
  const [localRows, setLocalRows] = useState<CustomerSuccessSheetRowDTO[]>(rows);
  const [nicheFilter, setNicheFilter] = useState<"all" | "trip" | "order" | "contract" | "pending">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [togglingCellKey, setTogglingCellKey] = useState<string | null>(null);

  // Composer inline rápido de tarefa vinculada por linha
  const [quickTaskRowId, setQuickTaskRowId] = useState<string | null>(null);
  const [quickTaskTitle, setQuickTaskTitle] = useState("");
  const [quickTaskPriority, setQuickTaskPriority] = useState<"low" | "medium" | "high" | "urgent">("high");
  const [quickTaskSector, setQuickTaskSector] = useState<SacFunctionRoleKey>("customer_success");
  const [savingQuickTask, setSavingQuickTask] = useState(false);

  React.useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  const filteredRows = useMemo(() => {
    return localRows.filter((r) => {
      if (nicheFilter === "trip" && r.entity_type !== "trip" && r.entity_type !== "dossier") return false;
      if (nicheFilter === "order" && r.entity_type !== "order") return false;
      if (nicheFilter === "contract" && r.entity_type !== "contract") return false;
      if (nicheFilter === "pending" && r.completed_steps_count >= 7) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCustomer = r.customer_name.toLowerCase().includes(q) || r.customer_trace_hash.toLowerCase().includes(q);
        const matchesEntity =
          r.title.toLowerCase().includes(q) ||
          r.entity_code.toLowerCase().includes(q) ||
          r.entity_trace_hash.toLowerCase().includes(q) ||
          (r.pnr_locator && r.pnr_locator.toLowerCase().includes(q));
        if (!matchesCustomer && !matchesEntity) return false;
      }
      return true;
    });
  }, [localRows, nicheFilter, searchQuery]);

  const handleToggleCell = async (row: CustomerSuccessSheetRowDTO, stepKey: OnboardingStepKey) => {
    const nextValue = !row.steps[stepKey];
    const cellId = `${row.id}:${stepKey}`;
    setTogglingCellKey(cellId);

    // Atualização otimista imediata na Sheet
    setLocalRows((prev) =>
      prev.map((item) => {
        if (item.id !== row.id) return item;
        const nextSteps = { ...item.steps, [stepKey]: nextValue };
        const completedCount = Object.values(nextSteps).filter(Boolean).length;
        return {
          ...item,
          steps: nextSteps,
          completed_steps_count: completedCount,
          progress_percent: Math.round((completedCount / 7) * 100),
        };
      })
    );

    try {
      await toggleCustomerOnboardingStep({
        data: {
          storeId,
          threadId: row.thread_id || null,
          tripId: row.trip_id || null,
          stepKey,
          completed: nextValue,
        },
      });
      toast.success(
        nextValue
          ? `Etapa "${ONBOARDING_CS_STEPS.find((s) => s.key === stepKey)?.shortLabel}" concluída!`
          : "Etapa reaberta para acompanhamento."
      );
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível salvar etapa.");
      onRefresh();
    } finally {
      setTogglingCellKey(null);
    }
  };

  const handleCreateQuickTask = async (row: CustomerSuccessSheetRowDTO) => {
    if (!quickTaskTitle.trim()) {
      toast.error("Informe o título da tarefa rápida.");
      return;
    }
    setSavingQuickTask(true);
    try {
      await createLinkedCustomerTask({
        data: {
          storeId,
          threadId: row.thread_id || null,
          customerId: row.customer_id || null,
          customerName: row.customer_name,
          customerPhone: row.customer_phone || null,
          customerAvatarUrl: row.customer_avatar_url || null,
          title: quickTaskTitle.trim(),
          priority: quickTaskPriority,
          assignedSector: quickTaskSector,
          entityType: row.entity_type === "dossier" ? "trip" : row.entity_type,
          entityId: row.entity_id,
          entityCode: row.entity_code,
          pnrLocator: row.pnr_locator || null,
          isMyDay: true,
        },
      });
      toast.success(`Tarefa criada e sincronizada com ${row.customer_trace_hash} · ${row.entity_trace_hash}!`);
      setQuickTaskRowId(null);
      setQuickTaskTitle("");
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar tarefa vinculada.");
    } finally {
      setSavingQuickTask(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Barra de Filtros Minimalista Squircle da Planilha CS */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-border/60 bg-card">
        <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Filtro de Operações Customer Success">
          {[
            { id: "all", label: `Todas (${localRows.length})` },
            { id: "pending", label: `Em Onboarding (${localRows.filter((r) => r.completed_steps_count < 7).length})` },
            { id: "trip", label: "Viagens & PNR" },
            { id: "order", label: "Pedidos & Compras" },
            { id: "contract", label: "Contratos & Serviços" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={nicheFilter === tab.id}
              onClick={() => setNicheFilter(tab.id as any)}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                nicheFilter === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar por cliente, #CLI, #TRP, PNR ou destino..."
            className="h-8 text-xs rounded-lg w-full sm:w-64"
          />
        </div>
      </div>

      {/* Tabela Viva Tipo Sheet (Customer Success & Suporte Onboarding) */}
      <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
        <div className="overflow-x-auto table-container">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/70 bg-muted/30 text-xs font-semibold text-muted-foreground">
                <th className="py-2 px-3 min-w-52">Cliente & Hash</th>
                <th className="py-2 px-3 min-w-52">Viagem / Operação Vinculada</th>
                {ONBOARDING_CS_STEPS.map((step) => (
                  <th
                    key={step.key}
                    title={step.description}
                    className="py-2 px-2 text-center whitespace-nowrap"
                  >
                    {step.shortLabel}
                  </th>
                ))}
                <th className="py-2 px-3 text-center whitespace-nowrap">Progresso</th>
                <th className="py-2 px-3 text-right whitespace-nowrap">Ações Sincronizadas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 text-xs">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-muted-foreground">
                    Nenhuma viagem, pedido ou contrato encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const isQuickTaskOpen = quickTaskRowId === row.id;
                  return (
                    <React.Fragment key={row.id}>
                      <tr className="hover:bg-muted/20 transition-colors">
                        {/* Coluna 1: Cliente (Foto Real ou Inicial + Nome + Hash #CLI) */}
                        <td className="py-2 px-3 align-middle">
                          <div className="flex flex-col gap-1">
                            <CustomerIdentityTagPill
                              name={row.customer_name}
                              avatarUrl={row.customer_avatar_url}
                              traceHash={row.customer_trace_hash}
                              size="md"
                            />
                            {row.customer_phone && (
                              <span className="text-xs font-mono text-muted-foreground pl-1">
                                {row.customer_phone}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Coluna 2: Operação / Viagem / Pedido / Contrato */}
                        <td className="py-2 px-3 align-middle">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="px-2 py-1 rounded bg-primary/10 text-primary font-mono text-xs font-semibold inline-flex items-center gap-1">
                                {row.entity_type === "trip" || row.entity_type === "dossier" ? (
                                  <Plane className="size-3" />
                                ) : row.entity_type === "order" ? (
                                  <ShoppingBag className="size-3" />
                                ) : (
                                  <FileText className="size-3" />
                                )}
                                {row.entity_trace_hash}
                              </span>
                              <span className="font-semibold text-foreground truncate max-w-44">
                                {row.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                              <span className="truncate max-w-44">{row.subtitle}</span>
                              {row.total_cents > 0 && (
                                <span className="text-foreground font-semibold">
                                  · {formatMoney(row.total_cents)}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 7 Colunas Interativas Tipo Sheet */}
                        {ONBOARDING_CS_STEPS.map((step) => {
                          const isChecked = Boolean(row.steps[step.key]);
                          const cellId = `${row.id}:${step.key}`;
                          const isBusy = togglingCellKey === cellId;
                          return (
                            <td key={step.key} className="py-2 px-2 text-center align-middle">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleToggleCell(row, step.key)}
                                title={`${step.fullLabel}: ${isChecked ? "Concluído (clique para reabrir)" : "Pendente (clique para concluir)"}`}
                                className={cn(
                                  "mx-auto p-1 rounded-lg border flex items-center justify-center transition-colors motion-reduce:transition-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                  isChecked
                                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                                    : "bg-background border-border/70 text-transparent hover:border-primary/50 hover:text-muted-foreground/40"
                                )}
                              >
                                {isBusy ? (
                                  <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none text-muted-foreground" />
                                ) : (
                                  <Check className="size-3.5 stroke-2" />
                                )}
                              </button>
                            </td>
                          );
                        })}

                        {/* Coluna 9: Progresso Visual */}
                        <td className="py-2 px-3 text-center align-middle">
                          <div className="inline-flex flex-col items-center gap-1 min-w-16">
                            <span
                              className={cn(
                                "px-2 py-1 rounded-md font-mono text-xs font-semibold border",
                                row.completed_steps_count === 7
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                  : row.completed_steps_count >= 4
                                    ? "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30"
                                    : "bg-warning/15 text-warning-strong border-warning/30"
                              )}
                            >
                              {row.completed_steps_count}/7 · {row.progress_percent}%
                            </span>
                          </div>
                        </td>

                        {/* Coluna 10: Ações Rápidas Sincronizadas */}
                        <td className="py-2 px-3 text-right align-middle">
                          <div className="inline-flex items-center justify-end gap-1 flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                if (isQuickTaskOpen) {
                                  setQuickTaskRowId(null);
                                } else {
                                  setQuickTaskRowId(row.id);
                                  const nextMissing = ONBOARDING_CS_STEPS.find((s) => !row.steps[s.key]);
                                  setQuickTaskTitle(
                                    nextMissing
                                      ? `${nextMissing.fullLabel} — ${row.customer_name} (${row.entity_code})`
                                      : `Acompanhamento CS — ${row.customer_name}`
                                  );
                                }
                              }}
                              className="px-2 py-1 rounded-md border border-border/70 bg-background hover:bg-muted text-foreground text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              title="Registrar tarefa rápida vinculada ao cliente e viagem/pedido"
                            >
                              <ListTodo className="size-3 text-primary" />
                              <span>+ Tarefa</span>
                              {row.linked_tasks_count > 0 && (
                                <span className="px-1 rounded bg-primary/15 text-primary font-mono text-xs">
                                  {row.linked_tasks_count}
                                </span>
                              )}
                            </button>

                            {onOpenNewTicketForRow && (
                              <button
                                type="button"
                                onClick={() => onOpenNewTicketForRow(row)}
                                className="px-2 py-1 rounded-md border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/15 text-rose-700 dark:text-rose-300 text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                title="Abrir pepino/chamado SAC vinculado a esta operação"
                              >
                                <AlertTriangle className="size-3" />
                                <span>Pepino</span>
                                {row.open_tickets_count > 0 && (
                                  <span className="px-1 rounded bg-rose-500/20 font-mono text-xs">
                                    {row.open_tickets_count}
                                  </span>
                                )}
                              </button>
                            )}

                            <Link
                              to={"/workspace/atendimento/chat" as any}
                              search={{
                                threadId: row.thread_id || undefined,
                                search: !row.thread_id ? row.customer_name : undefined,
                              } as any}
                              className="px-2 py-1 rounded-md border border-border/70 bg-background hover:bg-muted text-foreground text-xs font-medium inline-flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              title="Abrir conversa no Atendimento"
                            >
                              <MessageSquare className="size-3 text-emerald-600" />
                              <span>Chat</span>
                            </Link>
                          </div>
                        </td>
                      </tr>

                      {/* Linha Expansível: Criação Rápida de Tarefa Sincronizada */}
                      {isQuickTaskOpen && (
                        <tr className="bg-muted/30">
                          <td colSpan={11} className="p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold text-foreground inline-flex items-center gap-1">
                                <Plus className="size-3.5 text-primary" />
                                Nova Tarefa p/ {row.customer_trace_hash} · {row.entity_trace_hash}:
                              </span>
                              <Input
                                value={quickTaskTitle}
                                onChange={(e) => setQuickTaskTitle(e.target.value)}
                                placeholder="Descreva a tarefa para aparecer em Tarefas e no Chat..."
                                className="h-8 text-xs rounded-lg flex-1 min-w-56 bg-background"
                              />
                              <select
                                value={quickTaskSector}
                                onChange={(e) => setQuickTaskSector(e.target.value as SacFunctionRoleKey)}
                                className="h-8 px-2 rounded-lg border border-input bg-background text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              >
                                {SAC_FUNCTION_ROLES.map((role) => (
                                  <option key={role.key} value={role.key}>
                                    {role.shortLabel}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={quickTaskPriority}
                                onChange={(e) => setQuickTaskPriority(e.target.value as any)}
                                className="h-8 px-2 rounded-lg border border-input bg-background text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              >
                                <option value="urgent">Urgente</option>
                                <option value="high">Alta</option>
                                <option value="medium">Normal</option>
                                <option value="low">Baixa</option>
                              </select>
                              <button
                                type="button"
                                disabled={savingQuickTask}
                                onClick={() => handleCreateQuickTask(row)}
                                className="px-3 py-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              >
                                {savingQuickTask ? <Loader2 className="size-3 animate-spin motion-reduce:animate-none" /> : <Send className="size-3" />}
                                <span>Vincular Tarefa</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setQuickTaskRowId(null)}
                                className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
