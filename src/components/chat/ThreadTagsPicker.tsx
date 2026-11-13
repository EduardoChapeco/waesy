import * as React from "react";
import { useState, useMemo } from "react";
import { Tag, Plus, X, Check, Folder, Pencil, Trash2, Search, FolderPlus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  updateThreadTags,
  listStoreTagCatalog,
  upsertStoreTagCatalogItem,
  deleteStoreTagCatalogItem,
  upsertStoreTagGroup,
  deleteStoreTagGroup,
  type StoreTagCatalogItem,
  type StoreTagGroupItem,
} from "@/services/chat.functions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface ThreadTagsPickerProps {
  threadId: string;
  storeId?: string;
  tags: string[];
  onTagsChange?: (newTags: string[]) => void;
  className?: string;
  compact?: boolean;
}

export type TagColorKey = "violet" | "emerald" | "warning" | "rose" | "sky" | "indigo" | "slate";

export const TAG_COLOR_PALETTE: Record<TagColorKey, { label: string; pill: string; dot: string }> = {
  violet: {
    label: "Roxo VIP",
    pill: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
    dot: "bg-purple-500",
  },
  emerald: {
    label: "Verde Sucesso",
    pill: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    dot: "bg-emerald-500",
  },
  warning: {
    label: "Alerta / PIX",
    pill: "bg-warning/15 text-warning-strong border-warning/30",
    dot: "bg-warning",
  },
  rose: {
    label: "Urgente / Crítico",
    pill: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
    dot: "bg-rose-500",
  },
  sky: {
    label: "Azul Comercial",
    pill: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
    dot: "bg-sky-500",
  },
  indigo: {
    label: "Índigo Operação",
    pill: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    dot: "bg-blue-500",
  },
  slate: {
    label: "Neutro",
    pill: "bg-muted text-foreground border-border/70",
    dot: "bg-muted-foreground",
  },
};

export const DEFAULT_TAG_GROUPS_FALLBACK: StoreTagGroupItem[] = [
  { id: "funil", name: "Funil Comercial & Temperatura", order: 1 },
  { id: "financeiro", name: "Financeiro, PIX & Boletos", order: 2 },
  { id: "viagens", name: "Viagens, PNR & Operadora", order: 3 },
  { id: "suporte", name: "Pós-Venda & SAC", order: 4 },
];

export const CANONICAL_TAGS = [
  { id: "vip", label: "VIP", colorKey: "violet" as TagColorKey, groupId: "funil", color: TAG_COLOR_PALETTE.violet.pill },
  { id: "lead_quente", label: "Lead Quente", colorKey: "emerald" as TagColorKey, groupId: "funil", color: TAG_COLOR_PALETTE.emerald.pill },
  { id: "cotacao-enviada", label: "Cotação Enviada", colorKey: "sky" as TagColorKey, groupId: "funil", color: TAG_COLOR_PALETTE.sky.pill },
  { id: "aguardando_pix", label: "Aguardando PIX", colorKey: "warning" as TagColorKey, groupId: "financeiro", color: TAG_COLOR_PALETTE.warning.pill },
  { id: "boleto-emitido", label: "Boleto Emitido", colorKey: "warning" as TagColorKey, groupId: "financeiro", color: TAG_COLOR_PALETTE.warning.pill },
  { id: "pago-confirmado", label: "Pago / Confirmado", colorKey: "emerald" as TagColorKey, groupId: "financeiro", color: TAG_COLOR_PALETTE.emerald.pill },
  { id: "voo-pnr-emitido", label: "Voo / PNR Emitido", colorKey: "emerald" as TagColorKey, groupId: "viagens", color: TAG_COLOR_PALETTE.emerald.pill },
  { id: "alerta-voo-cia", label: "Alerta Voo / Cia", colorKey: "rose" as TagColorKey, groupId: "viagens", color: TAG_COLOR_PALETTE.rose.pill },
  { id: "pacote-operadora", label: "Pacote Operadora", colorKey: "violet" as TagColorKey, groupId: "viagens", color: TAG_COLOR_PALETTE.violet.pill },
  { id: "reclamacao", label: "Reclamação", colorKey: "rose" as TagColorKey, groupId: "suporte", color: TAG_COLOR_PALETTE.rose.pill },
  { id: "pos_venda", label: "Pós-Venda", colorKey: "sky" as TagColorKey, groupId: "suporte", color: TAG_COLOR_PALETTE.sky.pill },
  { id: "suporte", label: "Suporte Técnico", colorKey: "indigo" as TagColorKey, groupId: "suporte", color: TAG_COLOR_PALETTE.indigo.pill },
];

export function resolveTagPillClass(label: string, catalogTags?: StoreTagCatalogItem[]): string {
  const fromCatalog = (catalogTags || []).find((c) => c.label.toLowerCase() === label.toLowerCase());
  if (fromCatalog && TAG_COLOR_PALETTE[fromCatalog.colorKey]) {
    return TAG_COLOR_PALETTE[fromCatalog.colorKey].pill;
  }
  const fromDefault = CANONICAL_TAGS.find((c) => c.label.toLowerCase() === label.toLowerCase());
  if (fromDefault) return fromDefault.color;
  return TAG_COLOR_PALETTE.slate.pill;
}

export function ThreadTagsPicker({
  threadId,
  storeId,
  tags = [],
  onTagsChange,
  className,
  compact = false,
}: ThreadTagsPickerProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [currentTags, setCurrentTags] = useState<string[]>(tags);
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeGroupId, setActiveGroupId] = useState<string>("all");

  // Modo de criação/edição de Tag
  const [editorMode, setEditorMode] = useState<"none" | "tag" | "group">("none");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingPreviousLabel, setEditingPreviousLabel] = useState<string | null>(null);
  const [tagFormLabel, setTagFormLabel] = useState("");
  const [tagFormColor, setTagFormColor] = useState<TagColorKey>("sky");
  const [tagFormGroup, setTagFormGroup] = useState<string>("funil");

  // Modo de criação de Pasta/Grupo
  const [groupFormName, setGroupFormName] = useState("");

  React.useEffect(() => {
    setCurrentTags(tags);
  }, [tags]);

  const { data: catalogData, isLoading, isError } = useQuery({
    queryKey: ["store-tag-catalog", storeId || "default"],
    queryFn: () => listStoreTagCatalog({ data: storeId ? { storeId } : undefined }),
    staleTime: 60_000,
  });

  const catalogGroups: StoreTagGroupItem[] = useMemo(() => {
    if (catalogData?.groups && catalogData.groups.length > 0) return catalogData.groups;
    return DEFAULT_TAG_GROUPS_FALLBACK;
  }, [catalogData]);

  const catalogTags: StoreTagCatalogItem[] = useMemo(() => {
    if (catalogData?.tags && catalogData.tags.length > 0) return catalogData.tags;
    return CANONICAL_TAGS.map((t) => ({
      id: t.id,
      label: t.label,
      colorKey: t.colorKey,
      groupId: t.groupId,
    }));
  }, [catalogData]);

  const filteredTags = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return catalogTags.filter((t) => {
      if (activeGroupId !== "all" && t.groupId !== activeGroupId) return false;
      if (q && !t.label.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [catalogTags, searchTerm, activeGroupId]);

  const handleToggleTag = async (tagLabel: string) => {
    const isPresent = currentTags.includes(tagLabel);
    const updated = isPresent
      ? currentTags.filter((t) => t !== tagLabel)
      : [...currentTags, tagLabel];

    setCurrentTags(updated);
    if (onTagsChange) onTagsChange(updated);

    try {
      setIsUpdating(true);
      await updateThreadTags({
        data: {
          threadId,
          tags: updated,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["workspace-chat-threads"] });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar tags.");
      setCurrentTags(currentTags);
      if (onTagsChange) onTagsChange(currentTags);
    } finally {
      setIsUpdating(false);
    }
  };

  const openNewTagForm = () => {
    setEditingTagId(null);
    setEditingPreviousLabel(null);
    setTagFormLabel(searchTerm.trim());
    setTagFormColor("sky");
    setTagFormGroup(activeGroupId !== "all" ? activeGroupId : (catalogGroups[0]?.id || "funil"));
    setEditorMode("tag");
  };

  const openEditTagForm = (tag: StoreTagCatalogItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTagId(tag.id);
    setEditingPreviousLabel(tag.label);
    setTagFormLabel(tag.label);
    setTagFormColor(tag.colorKey || "sky");
    setTagFormGroup(tag.groupId || "funil");
    setEditorMode("tag");
  };

  const handleSaveTagCatalogItem = async () => {
    const cleanLabel = tagFormLabel.trim();
    if (!cleanLabel) {
      toast.error("Informe o nome da tag.");
      return;
    }
    try {
      setIsUpdating(true);
      await upsertStoreTagCatalogItem({
        data: {
          storeId,
          id: editingTagId || undefined,
          label: cleanLabel,
          colorKey: tagFormColor,
          groupId: tagFormGroup,
          previousLabel: editingPreviousLabel,
        },
      });

      if (editingPreviousLabel && editingPreviousLabel !== cleanLabel && currentTags.includes(editingPreviousLabel)) {
        const nextLocal = currentTags.map((t) => (t === editingPreviousLabel ? cleanLabel : t));
        setCurrentTags(nextLocal);
        if (onTagsChange) onTagsChange(nextLocal);
      } else if (!editingTagId && !currentTags.includes(cleanLabel)) {
        const nextLocal = [...currentTags, cleanLabel];
        setCurrentTags(nextLocal);
        if (onTagsChange) onTagsChange(nextLocal);
        await updateThreadTags({ data: { threadId, tags: nextLocal } });
      }

      await queryClient.invalidateQueries({ queryKey: ["store-tag-catalog"] });
      await queryClient.invalidateQueries({ queryKey: ["workspace-chat-threads"] });
      toast.success(editingTagId ? "Tag atualizada!" : "Tag criada e vinculada!");
      setEditorMode("none");
      setTagFormLabel("");
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível salvar a tag.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTagCatalogItem = async (tag: StoreTagCatalogItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsUpdating(true);
      await deleteStoreTagCatalogItem({
        data: {
          storeId,
          tagId: tag.id,
          tagLabel: tag.label,
        },
      });
      if (currentTags.includes(tag.label)) {
        const nextLocal = currentTags.filter((t) => t !== tag.label);
        setCurrentTags(nextLocal);
        if (onTagsChange) onTagsChange(nextLocal);
      }
      await queryClient.invalidateQueries({ queryKey: ["store-tag-catalog"] });
      await queryClient.invalidateQueries({ queryKey: ["workspace-chat-threads"] });
      toast.success(`Tag "${tag.label}" removida.`);
      if (editingTagId === tag.id) setEditorMode("none");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao excluir tag.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveGroup = async () => {
    const cleanName = groupFormName.trim();
    if (!cleanName) {
      toast.error("Informe o nome da pasta/grupo de tags.");
      return;
    }
    try {
      setIsUpdating(true);
      await upsertStoreTagGroup({
        data: {
          storeId,
          name: cleanName,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["store-tag-catalog"] });
      toast.success(`Pasta "${cleanName}" criada!`);
      setGroupFormName("");
      setEditorMode("none");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar pasta de tags.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteGroup = async (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsUpdating(true);
      await deleteStoreTagGroup({ data: { storeId, groupId } });
      if (activeGroupId === groupId) setActiveGroupId("all");
      await queryClient.invalidateQueries({ queryKey: ["store-tag-catalog"] });
      toast.success("Pasta removida.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao remover pasta.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={cn("flex items-center gap-1 flex-wrap", className)}>
      {currentTags.map((tag) =>
        compact ? (
          <span
            key={tag}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded-md border text-2xs font-semibold shrink-0 select-none leading-none",
              resolveTagPillClass(tag, catalogTags),
            )}
          >
            <span>{tag}</span>
          </span>
        ) : (
          <button
            key={tag}
            type="button"
            className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded-md border text-2xs font-semibold shrink-0 select-none cursor-pointer hover:opacity-90 transition-opacity leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              resolveTagPillClass(tag, catalogTags),
            )}
            onClick={() => handleToggleTag(tag)}
            title={`Remover tag ${tag}`}
          >
            <span>{tag}</span>
            <X className="size-3 opacity-70" />
          </button>
        ),
      )}

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="px-2 py-1 rounded-md border border-dashed border-border/80 bg-card hover:bg-muted/60 text-muted-foreground hover:text-foreground text-2xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Adicionar ou gerenciar tags e pastas"
          >
            <Tag className="size-3" />
            <span>Tag</span>
            <Plus className="size-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 p-3 rounded-xl bg-card border border-border/80 shadow-overlay space-y-3"
          align="start"
        >
          {/* Cabeçalho Minimalista com Ações de Criar Tag e Pasta */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-2xs font-bold text-muted-foreground uppercase tracking-wider">
              Tags & Pastas CRM
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setEditorMode(editorMode === "group" ? "none" : "group")}
                className="px-2 py-1 rounded-md border border-border/70 bg-muted/40 hover:bg-muted text-2xs font-semibold text-foreground inline-flex items-center gap-1 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                title="Criar pasta/grupo de tags"
              >
                <FolderPlus className="size-3 text-primary" />
                <span>Pasta</span>
              </button>
              <button
                type="button"
                onClick={() => (editorMode === "tag" ? setEditorMode("none") : openNewTagForm())}
                className="px-2 py-1 rounded-md border border-primary/30 bg-primary/10 hover:bg-primary/15 text-2xs font-bold text-primary inline-flex items-center gap-1 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                title="Criar nova tag personalizada"
              >
                <Plus className="size-3" />
                <span>Nova Tag</span>
              </button>
            </div>
          </div>

          {/* Busca rápida */}
          <div className="relative">
            <Search className="size-3.5 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar tag ou criar..."
              className="pl-7 pr-2 py-1 text-xs rounded-lg bg-muted/30 border-border/60"
            />
          </div>

          {/* Seletor de Pastas (Grupos) */}
          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveGroupId("all")}
              className={cn(
                "px-2 py-1 rounded-md text-2xs font-semibold border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                activeGroupId === "all"
                  ? "bg-foreground text-background border-foreground"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground border-border/50",
              )}
            >
              Todas
            </button>
            {catalogGroups.map((grp) => (
              <div key={grp.id} className="inline-flex items-center">
                <button
                  type="button"
                  onClick={() => setActiveGroupId(grp.id === activeGroupId ? "all" : grp.id)}
                  className={cn(
                    "px-2 py-1 rounded-md text-2xs font-semibold border inline-flex items-center gap-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    activeGroupId === grp.id
                      ? "bg-primary/15 text-primary border-primary/40"
                      : "bg-muted/40 text-muted-foreground hover:text-foreground border-border/50",
                  )}
                >
                  <Folder className="size-3 shrink-0" />
                  <span className="truncate max-w-28">{grp.name}</span>
                </button>
              </div>
            ))}
          </div>

          {/* Formulário Inline: Nova Pasta */}
          {editorMode === "group" && (
            <div className="p-2 rounded-lg bg-muted/40 border border-border/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-bold text-foreground">Nova Pasta de Tags</span>
                <button
                  type="button"
                  onClick={() => setEditorMode("none")}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={groupFormName}
                  onChange={(e) => setGroupFormName(e.target.value)}
                  placeholder="Ex: Operadoras / Aéreo"
                  className="text-xs py-1 flex-1 bg-background"
                />
                <button
                  type="button"
                  onClick={handleSaveGroup}
                  disabled={isUpdating}
                  className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Salvar
                </button>
              </div>
            </div>
          )}

          {/* Formulário Inline: Criar ou Editar Tag */}
          {editorMode === "tag" && (
            <div className="p-2 rounded-lg bg-muted/40 border border-border/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-bold text-foreground">
                  {editingTagId ? "Editar Tag" : "Criar Nova Tag"}
                </span>
                <button
                  type="button"
                  onClick={() => setEditorMode("none")}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <Input
                value={tagFormLabel}
                onChange={(e) => setTagFormLabel(e.target.value)}
                placeholder="Nome da tag (ex: CVC Confirmado)"
                className="text-xs py-1 bg-background"
              />
              <div className="space-y-1">
                <span className="text-2xs font-semibold text-muted-foreground block">Pasta / Grupo</span>
                <select
                  value={tagFormGroup}
                  onChange={(e) => setTagFormGroup(e.target.value)}
                  className="w-full px-2 py-1 rounded-md bg-background border border-border/70 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {catalogGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <span className="text-2xs font-semibold text-muted-foreground block">Cor da Etiqueta</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {(Object.keys(TAG_COLOR_PALETTE) as TagColorKey[]).map((ck) => (
                    <button
                      key={ck}
                      type="button"
                      onClick={() => setTagFormColor(ck)}
                      className={cn(
                        "px-2 py-1 rounded-md border text-2xs font-semibold inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        TAG_COLOR_PALETTE[ck].pill,
                        tagFormColor === ck && "ring-2 ring-primary",
                      )}
                    >
                      <span className={cn("size-2 rounded-full", TAG_COLOR_PALETTE[ck].dot)} />
                      <span>{ck === "violet" ? "Roxo" : ck === "emerald" ? "Verde" : ck === "warning" ? "Âmbar" : ck === "rose" ? "Rosa" : ck === "sky" ? "Azul" : ck === "indigo" ? "Índigo" : "Cinza"}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditorMode("none")}
                  className="px-2 py-1 rounded-md border border-border/60 bg-background text-2xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveTagCatalogItem}
                  disabled={isUpdating}
                  className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-2xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {editingTagId ? "Atualizar Tag" : "Criar Tag"}
                </button>
              </div>
            </div>
          )}

          {/* Lista Agrupada por Pasta */}
          {isLoading ? (
            <div className="py-4 text-center text-xs text-muted-foreground">Carregando catálogo de tags...</div>
          ) : isError ? (
            <div className="py-3 text-center text-xs text-destructive">Falha ao carregar catálogo remoto. Exibindo padrão.</div>
          ) : filteredTags.length === 0 ? (
            <div className="py-4 text-center space-y-2">
              <p className="text-xs text-muted-foreground">Nenhuma tag encontrada para "{searchTerm}".</p>
              {searchTerm.trim().length > 0 && (
                <button
                  type="button"
                  onClick={openNewTagForm}
                  className="px-3 py-1 rounded-md bg-primary/10 text-primary border border-primary/30 text-xs font-bold inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Plus className="size-3.5" />
                  <span>Criar "{searchTerm.trim()}"</span>
                </button>
              )}
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-3 pr-1 no-scrollbar">
              {catalogGroups
                .filter((g) => activeGroupId === "all" || g.id === activeGroupId)
                .map((group) => {
                  const groupTags = filteredTags.filter((t) => t.groupId === group.id);
                  if (groupTags.length === 0) return null;
                  return (
                    <div key={group.id} className="space-y-1">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-2xs font-bold text-muted-foreground flex items-center gap-1">
                          <Folder className="size-3 text-primary/70" />
                          <span>{group.name}</span>
                        </span>
                        {!["funil", "financeiro", "viagens", "suporte"].includes(group.id) && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteGroup(group.id, e)}
                            className="p-1 rounded text-muted-foreground hover:text-destructive cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            title="Excluir pasta"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        )}
                      </div>
                      <div className="space-y-1">
                        {groupTags.map((tag) => {
                          const isSelected = currentTags.includes(tag.label);
                          const pillClass = TAG_COLOR_PALETTE[tag.colorKey]?.pill || TAG_COLOR_PALETTE.slate.pill;
                          return (
                            <div
                              key={tag.id}
                              className="flex items-center justify-between gap-1 px-2 py-1 rounded-lg hover:bg-muted/60 transition-colors group"
                            >
                              <button
                                type="button"
                                className="flex-1 flex items-center justify-between text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
                                onClick={() => handleToggleTag(tag.label)}
                                disabled={isUpdating}
                              >
                                <span className={cn("px-2 py-1 rounded-md border text-2xs font-semibold leading-none", pillClass)}>
                                  {tag.label}
                                </span>
                                {isSelected && <Check className="size-3.5 text-primary shrink-0 mr-1" />}
                              </button>
                              <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={(e) => openEditTagForm(tag, e)}
                                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-background cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                  title="Editar nome, cor ou pasta da tag"
                                >
                                  <Pencil className="size-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteTagCatalogItem(tag, e)}
                                  className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-background cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                  title="Excluir tag"
                                >
                                  <Trash2 className="size-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
