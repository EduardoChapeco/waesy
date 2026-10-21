import React, { useState, useMemo } from "react";
import {
  Search,
  Zap,
  Shield,
  Layers,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Info,
  SlidersHorizontal,
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface CopilotSkillsCenterProps {
  onSelectSkill?: (skill: AiSkillDefinition) => void;
  className?: string;
}

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
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    description: "Disparos ou sincronizações com APIs externas de terceiros.",
  },
  FINANCIAL: {
    label: "Operação Financeira",
    badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    description: "Movimentação de saldo $WZ, pagamentos Pix ou geração de cobranças.",
  },
  IRREVERSIBLE: {
    label: "Irreversível",
    badgeClass: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
    description: "Exclusão permanente de dados ou publicações em massa.",
  },
};

export function CopilotSkillsCenter({ onSelectSkill, className }: CopilotSkillsCenterProps) {
  const [activeTab, setActiveTab] = useState<"all" | "personal" | "official" | "community">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<AiSkillDefinition | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Estado local de ativação de skills (persistido por sessão)
  const [enabledSkills, setEnabledSkills] = useState<Record<string, boolean>>({
    research_and_discovery: true,
    spreadsheet_financial_modeling: true,
    travel_tourism_logistics: true,
    commercial_proposal_closing: true,
    omnibuilder_web_composition: true,
    cnpj_corporate_investigation: true,
    datajud_legal_mining: true,
    email_orchestration_and_dispatch: true,
  });

  const skillsList = useMemo(() => {
    return Object.values(AI_SKILLS_REGISTRY) as AiSkillDefinition[];
  }, []);

  const filteredSkills = useMemo(() => {
    return skillsList.filter((skill) => {
      if (activeTab === "official" && !skill.isOfficial) return false;
      if (activeTab === "personal" && skill.isOfficial) return false;
      if (activeTab === "community" && skill.isOfficial) return false;

      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        return (
          skill.name.toLowerCase().includes(q) ||
          skill.description.toLowerCase().includes(q) ||
          skill.capabilities.some((c) => c.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [skillsList, activeTab, searchQuery]);

  const handleToggleSkill = (slug: string, nextState: boolean) => {
    setEnabledSkills((prev) => ({ ...prev, [slug]: nextState }));
    toast.success(
      nextState
        ? `Habilidade "${AI_SKILLS_REGISTRY[slug]?.name || slug}" ativada.`
        : `Habilidade "${AI_SKILLS_REGISTRY[slug]?.name || slug}" desativada.`
    );
  };

  const openSkillDetail = (skill: AiSkillDefinition) => {
    setSelectedSkill(skill);
    setDetailModalOpen(true);
    if (onSelectSkill) onSelectSkill(skill);
  };

  return (
    <div className={cn("space-y-6 max-w-5xl mx-auto p-4 sm:p-6", className)}>
      {/* ── Cabeçalho do Hub de Habilidades ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Central de Habilidades
            </h2>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs">
              SSOT v1.0
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Habilidades modulares declarativas. Ative ou desative capacidades para o seu Copilot.
          </p>
        </div>

        {/* Campo de Busca de Habilidades */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar por nome ou recurso..."
            className="h-11 min-h-11 pl-9 pr-3 rounded-xl bg-muted/40 border-border/40 text-xs focus-visible:ring-2 focus-visible:ring-primary/40"
          />
        </div>
      </div>

      {/* ── Régua de Abas Horizontais com Ergonomia Tátil ── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: "all", label: "Todas as Habilidades" },
          { id: "official", label: "Oficiais Waesy" },
          { id: "personal", label: "Minhas Habilidades" },
          { id: "community", label: "Comunidade / Terceiros" },
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
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* ── Grade de Cards de Habilidades (Squircles de Alta Legibilidade) ── */}
      {filteredSkills.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-12 text-center space-y-3 bg-muted/10">
          <Layers className="size-10 mx-auto text-muted-foreground/40" />
          <h3 className="text-sm font-semibold text-foreground">Nenhuma habilidade encontrada</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Tente buscar com outros termos ou selecione outra aba de catálogo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSkills.map((skill) => {
            const isEnabled = Boolean(enabledSkills[skill.slug]);
            const riskConfig = RISK_TIER_CONFIG[skill.riskTier] || RISK_TIER_CONFIG.READ;

            return (
              <div
                key={skill.id}
                className={cn(
                  "group relative rounded-2xl border p-5 transition-all flex flex-col justify-between space-y-4 bg-card",
                  isEnabled
                    ? "border-border/60 hover:border-primary/40 shadow-xs"
                    : "border-border/30 opacity-70 bg-muted/10"
                )}
              >
                <div className="space-y-3">
                  {/* Topo do Card: Ícone, Nome e Toggle */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="size-11 min-h-11 min-w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Zap className="size-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
                          {skill.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-2xs font-mono text-muted-foreground">
                            v{skill.version}
                          </span>
                          <span className="text-2xs text-muted-foreground/60">•</span>
                          <Badge
                            variant="outline"
                            className={cn("text-2xs font-medium px-2 py-0.5 rounded-md", riskConfig.badgeClass)}
                          >
                            {riskConfig.label}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Switch de Ativação com Touch Target de 44px */}
                    <div className="flex items-center justify-center size-11 shrink-0">
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => handleToggleSkill(skill.slug, checked)}
                        aria-label={`Ativar ou desativar ${skill.name}`}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                  </div>

                  {/* Descrição Textual Clara e Direta */}
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {skill.description}
                  </p>

                  {/* Chips de Capacidades Técnicas */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {skill.capabilities.slice(0, 3).map((cap) => (
                      <span
                        key={cap}
                        className="text-2xs px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground font-mono"
                      >
                        {cap.replace(/_/g, " ")}
                      </span>
                    ))}
                    {skill.capabilities.length > 3 && (
                      <span className="text-2xs px-1.5 py-0.5 rounded-md bg-muted/40 text-muted-foreground">
                        +{skill.capabilities.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                {/* Rodapé do Card: Ação para Inspecionar */}
                <div className="pt-3 border-t border-border/30 flex items-center justify-between text-xs">
                  <span className="text-2xs text-muted-foreground">
                    {skill.defaultTools.length} ferramentas integradas
                  </span>
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
            );
          })}
        </div>
      )}

      {/* ── Modal de Detalhes da Habilidade ── */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-xl rounded-2xl p-6 bg-card border-border/60">
          {selectedSkill && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center gap-3 mb-1">
                  <div className="size-11 min-h-11 min-w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Zap className="size-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold text-foreground">
                      {selectedSkill.name}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Versão {selectedSkill.version} • {selectedSkill.isOfficial ? "Oficial Waesy" : "Comunidade"}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 text-xs">
                <div>
                  <h5 className="font-semibold text-foreground mb-1">Descrição e Escopo</h5>
                  <p className="text-muted-foreground leading-relaxed">{selectedSkill.description}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/40 space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <Shield className="size-4 text-primary" />
                    <span>Nível de Risco: {selectedSkill.riskTier}</span>
                  </div>
                  <p className="text-muted-foreground text-2xs">
                    {RISK_TIER_CONFIG[selectedSkill.riskTier]?.description}
                  </p>
                </div>

                <div>
                  <h5 className="font-semibold text-foreground mb-2">Ferramentas Acionadas</h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedSkill.defaultTools.map((tool) => (
                      <span
                        key={tool}
                        className="text-xs px-2.5 py-1 rounded-lg bg-primary/5 border border-primary/20 text-foreground font-mono"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="font-semibold text-foreground mb-2">Capacidades Declaradas</h5>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSkill.capabilities.map((cap) => (
                      <Badge key={cap} variant="outline" className="text-xs rounded-md">
                        {cap}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border/40 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDetailModalOpen(false)}
                  className="h-11 min-h-11 px-4 text-xs font-semibold rounded-xl"
                >
                  Fechar
                </Button>
                <Button
                  type="button"
                  variant="default"
                  onClick={() => {
                    handleToggleSkill(selectedSkill.slug, !enabledSkills[selectedSkill.slug]);
                    setDetailModalOpen(false);
                  }}
                  className="h-11 min-h-11 px-5 text-xs font-semibold rounded-xl"
                >
                  {enabledSkills[selectedSkill.slug] ? "Desativar Habilidade" : "Ativar Habilidade"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
