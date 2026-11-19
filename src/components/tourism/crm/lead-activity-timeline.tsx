import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightLeft,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  RefreshCw,
  Send,
  StickyNote,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { formatCompactDateTime as formatActivityTimestamp } from "@/lib/datetime";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  addLeadActivity,
  deleteLeadActivity,
  listLeadActivitiesByLead,
  updateLeadActivity,
} from "@/services/crm.functions";

export interface LegacyLeadComment {
  id: string;
  author: string;
  text: string;
  date: string;
}

interface LeadActivityRow {
  id: string;
  type: string;
  content: string | null;
  author_id: string | null;
  created_at: string;
}

export interface LeadActivityTimelineProps {
  leadId: string;
  legacyComments?: LegacyLeadComment[];
  onActivityChanged?: () => void;
}

const ACTIVITY_TYPES = [
  { value: "note", label: "Nota", Icon: StickyNote },
  { value: "call", label: "Ligação", Icon: Phone },
  { value: "whatsapp", label: "WhatsApp", Icon: MessageSquare },
  { value: "email", label: "E-mail", Icon: Mail },
  { value: "meeting", label: "Reunião", Icon: CalendarClock },
  { value: "task", label: "Tarefa", Icon: CheckCircle2 },
] as const;

type ActivityTypeValue = (typeof ACTIVITY_TYPES)[number]["value"];

function getActivityMeta(type: string) {
  if (type === "stage_change") {
    return { label: "Mudança de Fase", Icon: ArrowRightLeft };
  }
  const found = ACTIVITY_TYPES.find((t) => t.value === type);
  return found ?? { label: "Registro", Icon: StickyNote };
}

export function LeadActivityTimeline({
  leadId,
  legacyComments = [],
  onActivityChanged,
}: LeadActivityTimelineProps) {
  const queryClient = useQueryClient();
  const [activityType, setActivityType] = useState<ActivityTypeValue>("note");
  const [draftContent, setDraftContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const {
    data: activities = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["lead-activities", leadId],
    queryFn: async () => {
      const rows = await listLeadActivitiesByLead({ data: { leadId } });
      return (Array.isArray(rows) ? rows : []) as LeadActivityRow[];
    },
    enabled: Boolean(leadId),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["lead-activities", leadId] });
    queryClient.invalidateQueries({ queryKey: ["lead-detail", leadId] });
    onActivityChanged?.();
  };

  const addMutation = useMutation({
    mutationFn: async () =>
      addLeadActivity({
        data: {
          leadId,
          type: activityType,
          content: draftContent.trim(),
        },
      }),
    onSuccess: () => {
      setDraftContent("");
      toast.success("Atividade registrada na timeline.");
      invalidateAll();
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : "Erro ao registrar atividade."
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      activityId,
      content,
    }: {
      activityId: string;
      content: string;
    }) => updateLeadActivity({ data: { activityId, content } }),
    onSuccess: () => {
      setEditingId(null);
      setEditingText("");
      toast.success("Registro atualizado.");
      invalidateAll();
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : "Sem permissão para editar."
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (activityId: string) =>
      deleteLeadActivity({ data: { activityId } }),
    onSuccess: () => {
      toast.success("Registro removido da timeline.");
      invalidateAll();
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : "Sem permissão para excluir."
      );
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftContent.trim()) return;
    addMutation.mutate();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreate} className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={activityType}
            onValueChange={(val) => setActivityType(val as ActivityTypeValue)}
          >
            <SelectTrigger
              aria-label="Tipo de atividade"
              className="h-11 min-h-11 w-full sm:w-44 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTIVITY_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-xs text-muted-foreground">
            Auditoria vinculada ao card
          </span>
        </div>

        <Textarea
          rows={2}
          value={draftContent}
          onChange={(e) => setDraftContent(e.target.value)}
          placeholder="Registrar ligação, atendimento WhatsApp, e-mail ou nota interna..."
          className="min-h-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!draftContent.trim() || addMutation.isPending}
            className="h-11 min-h-11 gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {addMutation.isPending ? (
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <Send className="size-4" aria-hidden="true" />
            )}
            <span>Registrar Atividade</span>
          </Button>
        </div>
      </form>

      {isLoading ? (
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : isError ? (
        <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-xs font-medium text-destructive">
            {error instanceof Error
              ? error.message
              : "Falha ao carregar timeline."}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => refetch()}
            className="h-11 min-h-11 gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            <span>Tentar Novamente</span>
          </Button>
        </div>
      ) : activities.length === 0 && legacyComments.length === 0 ? (
        <div className="rounded-xl border border-border bg-muted/30 p-6 text-center">
          <p className="text-xs text-muted-foreground">
            Nenhuma atividade registrada neste atendimento
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((item) => {
            const { label, Icon } = getActivityMeta(item.type);
            const isImmutable = item.type === "stage_change";
            const isEditing = editingId === item.id;

            return (
              <article
                key={item.id}
                className="rounded-xl border border-border bg-card p-4 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-primary" aria-hidden="true" />
                    <Badge variant={isImmutable ? "secondary" : "outline"}>
                      {label}
                    </Badge>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatActivityTimestamp(item.created_at)}
                    </span>
                  </div>

                  {!isImmutable && !isEditing ? (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label="Editar atividade"
                        onClick={() => {
                          setEditingId(item.id);
                          setEditingText(item.content || "");
                        }}
                        className="h-11 w-11 p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label="Excluir atividade"
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(item.id)}
                        className="h-11 w-11 p-0 text-destructive hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ) : null}
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      rows={2}
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className="min-h-16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditingId(null);
                          setEditingText("");
                        }}
                        className="h-11 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        disabled={
                          !editingText.trim() || updateMutation.isPending
                        }
                        onClick={() =>
                          updateMutation.mutate({
                            activityId: item.id,
                            content: editingText.trim(),
                          })
                        }
                        className="h-11 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-line break-words text-sm text-foreground">
                    {item.content}
                  </p>
                )}
              </article>
            );
          })}

          {legacyComments.map((comm) => (
            <article
              key={comm.id}
              className="rounded-xl border border-border bg-muted/30 p-4 space-y-1"
            >
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {comm.author}
                </span>
                <span className="tabular-nums">{comm.date}</span>
              </div>
              <p className="whitespace-pre-line break-words text-xs text-muted-foreground">
                {comm.text}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
