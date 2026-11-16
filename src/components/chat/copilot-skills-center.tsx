import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search,
  Zap,
  Shield,
  Layers,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Play,
  Building2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AI_SKILLS_REGISTRY, type AiSkillDefinition } from "@/registries/ai-skills-registry";
import {
  listUserSkillsCatalog,
  listEffectiveSkillsForCopilot,
  toggleUserSkillActivation,
  createCustomAiSkill,
  updateCustomAiSkill,
  deleteCustomAiSkill,
} from "@/services/ai-skills-router.functions";
import type { EffectiveSkillEntry } from "@/services/copilot-skill-policy";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface CopilotSkillsCenterProps {
  storeId?: string | null;
  onSelectSkill?: (skill: AiSkillDefinition) => void;
  onTestSkillInChat?: (promptText: string, skillName: string) => void;
  className?: string;
}

interface UnifiedSkillCardItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  source: "native" | "custom" | "community";
  isSystem: boolean;
  riskTier: "READ" | "WRITE" | "EXTERNAL_WRITE" | "FINANCIAL" | "IRREVERSIBLE";
  defaultTools: string[];
  capabilities: string[];
  systemInstructions?: string | null;
  registryDef?: AiSkillDefinition;
}

const CORE_CUSTOM_TOOL_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "search_catalog_products", label: "Catálogo de Produtos" },
  { value: "crm_list_leads", label: "Listar Leads CRM" },
  { value: "crm_create_lead", label: "Registrar Lead CRM" },
  { value: "mining_run_local_places_harvest", label: "Mineração Territorial" },
  { value: "browser_navigate_url", label: "Navegador Web ao Vivo" },
  { value: "simlab_run_batch_simulation", label: "SimLabs (Auditório)" },
  { value: "simlab_generate_seven_sins_copy", label: "Matriz 7 Pecados" },
];

const RISK_TIER_CONFIG: Record<
  string,
  { label: string; badgeClass: string; description: string }
> = {
  READ: {
    label: "Leitura Segura",
    badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    description: "Consulta e pesquisa determinística sem alteração de estado no banco.",
  },
  WRITE: {
    label: "Escrita Reversível",
    badgeClass: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
    description: "Criação e edição de rascunhos, planilhas e propostas dentro do workspace.",
  },
  EXTERNAL_WRITE: {
    label: "Ação Externa",
    badgeClass: "bg-warning/10 text-warning-strong border-warning/20",
    description: "Disparos ou sincronizações com APIs externas de terceiros.",
  },
  FINANCIAL: {
    label: "Operação Financeira",
    badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    description: "Movimentação de saldo, pagamentos Pix ou geração de cobranças.",
  },
  IRREVERSIBLE: {
    label: "Irreversível",
    badgeClass: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
    description: "Exclusão permanente de dados ou publicações em massa.",
  },
};

const SOURCE_LABELS: Record<UnifiedSkillCardItem["source"], string> = {
  native: "Nativa Waesy",
  custom: "Da Minha Empresa",
  community: "Comunidade",
};

function mapRegistryToUnified(skill: AiSkillDefinition): UnifiedSkillCardItem {
  return {
    id: skill.id,
    slug: skill.slug,
    name: skill.name,
    description: skill.description,
    category: skill.category || "geral",
    source: skill.isOfficial ? "native" : "community",
    isSystem: skill.isOfficial,
    riskTier: skill.riskTier,
    defaultTools: skill.defaultTools || [],
    capabilities: skill.capabilities || [],
    registryDef: skill,
  };
}

function mapEffectiveToUnified(entry: EffectiveSkillEntry): UnifiedSkillCardItem {
  const matchedRegistry = AI_SKILLS_REGISTRY[entry.slug];
  return {
    id: entry.id,
    slug: entry.slug,
    name: entry.name,
    description: entry.description,
    category: entry.category || "operacional",
    source: entry.source,
    isSystem: entry.isSystem,
    riskTier: entry.riskTier,
    defaultTools: entry.allowedTools || matchedRegistry?.defaultTools || [],
    capabilities: entry.capabilities || matchedRegistry?.capabilities || [],
    systemInstructions: entry.systemInstructions,
    registryDef: matchedRegistry,
  };
}

export function CopilotSkillsCenter({
  storeId,
  onSelectSkill,
  onTestSkillInChat,
  className,
}: CopilotSkillsCenterProps) {
  const [activeTab, setActiveTab] = useState<"all" | "native" | "custom" | "community">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<UnifiedSkillCardItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<UnifiedSkillCardItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("operacional");
  const [formRiskTier, setFormRiskTier] = useState<"READ" | "WRITE" | "EXTERNAL_WRITE" | "FINANCIAL">("READ");
  const [formInstructions, setFormInstructions] = useState("");
  const [formTools, setFormTools] = useState<string[]>(["search_catalog_products"]);
  const [isSavingSkill, setIsSavingSkill] = useState(false);

  const [effectiveItems, setEffectiveItems] = useState<UnifiedSkillCardItem[]>(() =>
    Object.values(AI_SKILLS_REGISTRY).map(mapRegistryToUnified),
  );
  const [enabledSkills, setEnabledSkills] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const skill of Object.values(AI_SKILLS_REGISTRY)) {
      initial[skill.slug] = true;
    }
    return initial;
  });
  const [runsBySlug, setRunsBySlug] = useState<Record<string, number>>({});
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);

  const reloadSkills = useCallback(async () => {
    setIsLoadingPrefs(true);
    try {
      const [catalogRes, effectiveRes] = await Promise.all([
        listUserSkillsCatalog().catch(() => []),
        listEffectiveSkillsForCopilot({ data: { storeId: storeId || null } }).catch(() => ({
          skills: [],
        })),
      ]);

      const mergedMap = new Map<string, UnifiedSkillCardItem>();
      for (const def of Object.values(AI_SKILLS_REGISTRY)) {
        mergedMap.set(def.slug, mapRegistryToUnified(def));
      }

      const nextEnabled: Record<string, boolean> = {};
      for (const def of Object.values(AI_SKILLS_REGISTRY)) {
        nextEnabled[def.slug] = true;
      }

      if (Array.isArray(catalogRes)) {
        const nextRuns: Record<string, number> = {};
        for (const item of catalogRes) {
          nextEnabled[item.slug] = item.isActive;
          nextRuns[item.slug] = item.runsCount;
        }
        setRunsBySlug(nextRuns);
      }

      if (Array.isArray(effectiveRes?.skills)) {
        for (const entry of effectiveRes.skills) {
          const unified = mapEffectiveToUnified(entry);
          mergedMap.set(unified.slug, unified);
          nextEnabled[unified.slug] = entry.isActive;
        }
      }

      setEffectiveItems(Array.from(mergedMap.values()));
      setEnabledSkills((prev) => ({ ...prev, ...nextEnabled }));
    } finally {
      setIsLoadingPrefs(false);
    }
  }, [storeId]);

  useEffect(() => {
    void reloadSkills();
  }, [reloadSkills]);

  const filteredSkills = useMemo(() => {
    return effectiveItems.filter((skill) => {
      if (activeTab !== "all" && skill.source !== activeTab) return false;

      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        return (
          skill.name.toLowerCase().includes(q) ||
          skill.description.toLowerCase().includes(q) ||
          skill.category.toLowerCase().includes(q) ||
          skill.capabilities.some((c) => c.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [effectiveItems, activeTab, searchQuery]);

  const handleToggleSkill = async (slug: string, nextState: boolean) => {
    const prevValue = Boolean(enabledSkills[slug]);
    setSavingSlug(slug);
    setEnabledSkills((prev) => ({ ...prev, [slug]: nextState }));

    try {
      await toggleUserSkillActivation({ data: { skillSlug: slug, isActive: nextState } });
      const label = effectiveItems.find((s) => s.slug === slug)?.name || slug;
      toast.success(
        nextState
          ? `Habilidade "${label}" ativada.`
          : `Habilidade "${label}" desativada.`,
      );
    } catch (err: any) {
      setEnabledSkills((prev) => ({ ...prev, [slug]: prevValue }));
      toast.error(err?.message || "Erro ao salvar preferência da habilidade.");
    } finally {
      setSavingSlug(null);
    }
  };

  const openSkillDetail = (skill: UnifiedSkillCardItem) => {
    setSelectedSkill(skill);
    setDetailModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingSkill(null);
    setFormName("");
    setFormDescription("");
    setFormCategory("operacional");
    setFormRiskTier("READ");
    setFormInstructions("");
    setFormTools(["search_catalog_products"]);
    setEditorModalOpen(true);
  };

  const openEditModal = (skill: UnifiedSkillCardItem) => {
    setEditingSkill(skill);
    setFormName(skill.name);
    setFormDescription(skill.description);
    setFormCategory(skill.category || "operacional");
    setFormRiskTier(
      skill.riskTier === "IRREVERSIBLE" ? "EXTERNAL_WRITE" : skill.riskTier,
    );
    setFormInstructions(skill.systemInstructions || skill.description);
    setFormTools(skill.defaultTools || []);
    setDetailModalOpen(false);
    setEditorModalOpen(true);
  };

  const handleSaveCustomSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formName.trim().length < 3 || formDescription.trim().length < 8 || formInstructions.trim().length < 10) {
      toast.error("Preencha nome (3+ caracteres), descrição (8+) e instruções (10+).");
      return;
    }

    setIsSavingSkill(true);
    try {
      if (editingSkill) {
        await updateCustomAiSkill({
          data: {
            skillId: editingSkill.id,
            storeId: storeId || null,
            name: formName.trim(),
            description: formDescription.trim(),
            category: formCategory.trim(),
            allowedTools: formTools,
            systemInstructions: formInstructions.trim(),
          },
        });
        toast.success(`Skill "${formName.trim()}" atualizada.`);
      } else {
        await createCustomAiSkill({
          data: {
            storeId: storeId || null,
            name: formName.trim(),
            description: formDescription.trim(),
            category: formCategory.trim(),
            icon: "Zap",
            allowedTools: formTools,
            systemInstructions: formInstructions.trim(),
            riskTier: formRiskTier,
          },
        });
        toast.success(`Skill "${formName.trim()}" criada com sucesso.`);
      }
      setEditorModalOpen(false);
      await reloadSkills();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar habilidade customizada.");
    } finally {
      setIsSavingSkill(false);
    }
  };

  const handleDeleteCustomSkill = async (skill: UnifiedSkillCardItem) => {
    if (skill.isSystem || skill.source !== "custom") return;
    setIsSavingSkill(true);
    try {
      await deleteCustomAiSkill({ data: { skillId: skill.id } });
      setDetailModalOpen(false);
      toast.success(`Skill "${skill.name}" removida.`);
      await reloadSkills();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao remover habilidade.");
    } finally {
      setIsSavingSkill(false);
    }
  };

  const handleTestInChat = (skill: UnifiedSkillCardItem) => {
    const promptText = `Usar habilidade ${skill.name}: ${skill.description}`;
    setDetailModalOpen(false);
    if (onTestSkillInChat) {
      onTestSkillInChat(promptText, skill.name);
      return;
    }
    if (onSelectSkill) {
      onSelectSkill(
        skill.registryDef || {
          id: skill.id,
          slug: skill.slug,
          name: skill.name,
          description: skill.description,
          category: skill.category,
          version: "1.0",
          isOfficial: skill.isSystem,
          status: "active",
          riskTier: skill.riskTier,
          defaultTools: skill.defaultTools,
          capabilities: skill.capabilities,
          inputSchema: undefined as unknown as AiSkillDefinition["inputSchema"],
          outputSchema: undefined as unknown as AiSkillDefinition["outputSchema"],
        },
      );
    }
  };

  return (
    <div className={cn("space-y-6 max-w-5xl mx-auto p-4 sm:p-6", className)}>
      {/* ── Cabeçalho do Hub de Habilidades ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Central de Habilidades
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Ative, desative ou crie instruções especializadas que governam as ferramentas do Copilot.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar habilidades..."
              className="h-11 min-h-11 pl-9 pr-3 rounded-xl bg-muted/40 border-border/40 text-xs focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          </div>
          <Button
            type="button"
            variant="default"
            onClick={openCreateModal}
            className="h-11 min-h-11 px-4 rounded-xl text-xs font-semibold gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
          >
            <Plus className="size-4" />
            <span>Nova Skill</span>
          </Button>
        </div>
      </div>

      {/* ── Régua de Abas Horizontais com Ergonomia Tátil ── */}
      <div className="flex items-center gap-2 overflow-x-auto scroll-area-carousel no-scrollbar pb-1">
        {[
          { id: "all", label: "Todas" },
          { id: "native", label: "Nativas Waesy" },
          { id: "custom", label: "Da Minha Empresa" },
          { id: "community", label: "Comunidade" },
        ].map((tab) => (
          <Button
            key={tab.id}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "h-11 min-h-11 px-4 rounded-xl text-xs font-medium cursor-pointer transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            )}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* ── Grade de Cards de Habilidades ── */}
      {filteredSkills.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center space-y-3 bg-muted/10">
          <Layers className="size-10 mx-auto text-muted-foreground/40" />
          <h3 className="text-sm font-semibold text-foreground">Nenhuma habilidade encontrada</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {activeTab === "custom"
              ? "Crie uma skill customizada para ensinar procedimentos e regras específicas da sua empresa."
              : "Tente buscar com outros termos ou selecione outra aba de catálogo."}
          </p>
          {activeTab === "custom" && (
            <Button
              type="button"
              variant="outline"
              onClick={openCreateModal}
              className="h-11 min-h-11 px-4 rounded-xl text-xs font-semibold gap-2"
            >
              <Plus className="size-4" />
              <span>Criar primeira skill da empresa</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSkills.map((skill) => {
            const isEnabled = Boolean(enabledSkills[skill.slug]);
            const riskConfig = RISK_TIER_CONFIG[skill.riskTier] || RISK_TIER_CONFIG.READ;

            return (
              <div
                key={`${skill.source}-${skill.slug}-${skill.id}`}
                className={cn(
                  "group relative rounded-2xl border p-5 transition-colors duration-200 flex flex-col justify-between space-y-4 bg-card",
                  isEnabled
                    ? "border-border/60 hover:border-primary/40 shadow-xs"
                    : "border-border/30 opacity-70 bg-muted/10",
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-11 min-h-11 min-w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        {skill.source === "custom" ? (
                          <Building2 className="size-5" />
                        ) : (
                          <Zap className="size-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-foreground leading-tight truncate group-hover:text-primary transition-colors">
                          {skill.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-2xs text-muted-foreground">
                            {SOURCE_LABELS[skill.source]}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn("text-2xs font-medium px-2 py-1 rounded-md", riskConfig.badgeClass)}
                          >
                            {riskConfig.label}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center size-11 shrink-0">
                      <Switch
                        checked={isEnabled}
                        disabled={isLoadingPrefs || savingSlug === skill.slug}
                        onCheckedChange={(checked) => void handleToggleSkill(skill.slug, checked)}
                        aria-label={`Ativar ou desativar ${skill.name}`}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {skill.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-border/30 flex items-center justify-between text-xs">
                  <span className="text-2xs text-muted-foreground">
                    {skill.defaultTools.length} ferramentas
                    {(runsBySlug[skill.slug] || 0) > 0 ? ` • ${runsBySlug[skill.slug]} usos` : ""}
                  </span>
                  <div className="flex items-center gap-1">
                    {skill.source === "custom" && !skill.isSystem && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(skill)}
                        aria-label={`Editar ${skill.name}`}
                        className="size-11 min-h-11 p-0 text-muted-foreground hover:text-foreground rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <Pencil className="size-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openSkillDetail(skill)}
                      className="h-11 min-h-11 px-3 text-xs font-semibold text-primary hover:bg-primary/5 rounded-xl gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
                    >
                      <span>Ver detalhes</span>
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal de Detalhes da Habilidade ── */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-xl rounded-2xl p-6 pt-safe-modal bg-card border-border/60">
          {selectedSkill && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center gap-3 mb-1">
                  <div className="size-11 min-h-11 min-w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Zap className="size-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold text-foreground">
                      {selectedSkill.name}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      {SOURCE_LABELS[selectedSkill.source]} • {selectedSkill.category}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 text-xs">
                <div>
                  <h5 className="font-semibold text-foreground mb-1">Escopo Operacional</h5>
                  <p className="text-muted-foreground leading-relaxed">{selectedSkill.description}</p>
                </div>

                {selectedSkill.systemInstructions && (
                  <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-1">
                    <span className="font-semibold text-foreground block">Instruções Ativas</span>
                    <p className="text-muted-foreground whitespace-pre-line">
                      {selectedSkill.systemInstructions}
                    </p>
                  </div>
                )}

                <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <Shield className="size-4 text-primary" />
                    <span>
                      {(RISK_TIER_CONFIG[selectedSkill.riskTier] || RISK_TIER_CONFIG.READ).label}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-2xs">
                    {(RISK_TIER_CONFIG[selectedSkill.riskTier] || RISK_TIER_CONFIG.READ).description}
                  </p>
                </div>

                {selectedSkill.defaultTools.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-foreground mb-2">Ferramentas Autorizadas</h5>
                    <div className="flex flex-wrap gap-2">
                      {selectedSkill.defaultTools.map((tool) => (
                        <Badge key={tool} variant="outline" className="text-2xs rounded-md">
                          {tool}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-border/40 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleTestInChat(selectedSkill)}
                    className="h-11 min-h-11 px-4 text-xs font-semibold rounded-xl gap-2"
                  >
                    <Play className="size-4" />
                    <span>Testar no chat</span>
                  </Button>
                  {selectedSkill.source === "custom" && !selectedSkill.isSystem && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => openEditModal(selectedSkill)}
                        className="h-11 min-h-11 px-3 text-xs rounded-xl gap-1"
                      >
                        <Pencil className="size-4" />
                        <span>Editar</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={isSavingSkill}
                        onClick={() => void handleDeleteCustomSkill(selectedSkill)}
                        className="h-11 min-h-11 px-3 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 rounded-xl gap-1"
                      >
                        <Trash2 className="size-4" />
                        <span>Excluir</span>
                      </Button>
                    </>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void handleToggleSkill(selectedSkill.slug, !enabledSkills[selectedSkill.slug]);
                    setDetailModalOpen(false);
                  }}
                  className="h-11 min-h-11 px-5 text-xs font-semibold rounded-xl"
                >
                  {enabledSkills[selectedSkill.slug] ? "Desativar" : "Ativar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Modal de Criação / Edição de Skill Customizada ── */}
      <Dialog open={editorModalOpen} onOpenChange={setEditorModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl p-6 pt-safe-modal bg-card border-border/60">
          <form onSubmit={(e) => void handleSaveCustomSkill(e)} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">
                {editingSkill ? "Editar Skill Customizada" : "Nova Skill da Empresa"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Defina o papel, instruções e ferramentas permitidas para este fluxo.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-foreground block">Nome da habilidade</label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex.: Consultor Comercial B2B"
                  className="h-11 min-h-11 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-foreground block">Categoria</label>
                  <Input
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="vendas, crm, suporte"
                    className="h-11 min-h-11 rounded-xl"
                  />
                </div>
                {!editingSkill && (
                  <div className="space-y-1">
                    <label className="font-medium text-foreground block">Perfil de risco</label>
                    <select
                      value={formRiskTier}
                      onChange={(e) => setFormRiskTier(e.target.value as any)}
                      className="w-full h-11 min-h-11 px-3 rounded-xl border border-border bg-background text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <option value="READ">Leitura Segura</option>
                      <option value="WRITE">Escrita Reversível</option>
                      <option value="EXTERNAL_WRITE">Ação Externa</option>
                      <option value="FINANCIAL">Operação Financeira</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground block">Descrição curta</label>
                <Input
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Quando e por que o Copilot deve acionar esta habilidade"
                  className="h-11 min-h-11 rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground block">Instruções de comportamento</label>
                <textarea
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  rows={4}
                  placeholder="Descreva regras de negócio, formato de resposta e critérios obrigatórios..."
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  required
                />
              </div>

              <div className="space-y-2">
                <span className="font-medium text-foreground block">Ferramentas habilitadas</span>
                <div className="flex flex-wrap gap-2">
                  {CORE_CUSTOM_TOOL_OPTIONS.map((opt) => {
                    const active = formTools.includes(opt.value);
                    return (
                      <Button
                        key={opt.value}
                        type="button"
                        variant={active ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          setFormTools((prev) =>
                            active ? prev.filter((t) => t !== opt.value) : [...prev, opt.value],
                          )
                        }
                        className="h-11 min-h-11 px-3 rounded-xl text-2xs"
                      >
                        {opt.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border/40 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditorModalOpen(false)}
                className="h-11 min-h-11 px-4 rounded-xl text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSavingSkill}
                className="h-11 min-h-11 px-5 rounded-xl text-xs font-semibold"
              >
                {isSavingSkill ? "Salvando..." : editingSkill ? "Salvar alterações" : "Criar Skill"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
