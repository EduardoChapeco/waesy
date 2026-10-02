import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Sparkles, Search, SlidersHorizontal, CheckCircle2, XCircle, 
  FileText, Receipt, UserCheck, ShieldAlert, Compass, Home, 
  Megaphone, Bot, Eye, TrendingUp, ArrowRight, Play, Loader2, Info
} from "lucide-react";
import { toast } from "sonner";

import { listSkillsCatalog, toggleSkillActivation, executeSkill, SkillItemDTO, CANONICAL_SKILLS_DEFINITIONS } from "@/services/ai-skills-router.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/workspace/skills")({
  head: () => ({ meta: [{ title: "Catálogo de Skills de IA | Workspace Waesy" }] }),
  component: SkillsCatalogPage,
});

const SKILL_ICONS: Record<string, any> = {
  FileText,
  Receipt,
  UserCheck,
  ShieldAlert,
  Compass,
  Home,
  Megaphone,
  Bot,
  Eye,
  TrendingUp,
  Sparkles,
};

const CATEGORIES = [
  { id: "todas", label: "Todas" },
  { id: "conteudo", label: "Conteúdo" },
  { id: "marketing", label: "Marketing" },
  { id: "financeiro", label: "Financeiro" },
  { id: "juridico", label: "Jurídico" },
  { id: "atendimento", label: "Atendimento" },
  { id: "nichos", label: "Nichos" },
  { id: "design", label: "Design & UI" },
  { id: "dados", label: "Dados & BI" },
];

function SkillsCatalogPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todas");
  const [selectedSkill, setSelectedSkill] = useState<SkillItemDTO | null>(null);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testPrompt, setTestPrompt] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);

  const { data: skills = [], isLoading } = useQuery({
    queryKey: ["ai-skills-catalog", selectedCategory, search],
    queryFn: () => listSkillsCatalog({
      data: {
        category: selectedCategory,
        search,
      },
    }),
  });

  const toggleMutation = useMutation({
    mutationFn: toggleSkillActivation,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ai-skills-catalog"] });
      toast.success(variables.data.enabled ? "Skill ativada no workspace" : "Skill desativada");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao atualizar skill");
    },
  });

  const executeMutation = useMutation({
    mutationFn: executeSkill,
    onSuccess: (res) => {
      setTestResult(res.resultText);
      toast.success(`Skill executada via ${res.provider} (${res.latencyMs}ms)`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro na execução da skill");
    },
  });

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto p-4 sm:p-6">
      {/* Header com Estilo Apple HIG */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Catálogo de Skills de IA
            </h1>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs">
              Declarativo v1.0
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Habilite ou desabilite habilidades autônomas para seu negócio. Toda skill consome a Porta Única protegida.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border/40">
          <Info className="size-4 text-primary shrink-0" />
          <span>Nenhuma skill chama provedor direto. Zero chaves expostas.</span>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar skill por nome ou gatilho..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-xs rounded-lg bg-card border-border/60"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground border border-border/40"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Cards de Skills */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-xs">Carregando catálogo de skills...</p>
        </div>
      ) : skills.length === 0 ? (
        <div className="py-16 text-center bg-card border border-border/60 rounded-lg p-8 space-y-3">
          <Sparkles className="size-8 mx-auto text-muted-foreground/40" />
          <p className="text-sm font-semibold text-foreground">Nenhuma skill encontrada</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Tente buscar por outro termo ou selecione uma categoria diferente.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((skill) => {
            const IconComp = SKILL_ICONS[skill.icon] || Sparkles;
            return (
              <div
                key={skill.id}
                className="bg-card border border-border/60 rounded-lg p-5 hover:border-border transition-all flex flex-col justify-between space-y-4 shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <IconComp className="size-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-medium">
                        {skill.is_enabled ? "Ativa" : "Desativada"}
                      </span>
                      <Switch
                        checked={skill.is_enabled}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({
                            data: { skillId: skill.id, enabled: checked },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-foreground">{skill.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {skill.description}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/20 border border-border/40 text-xs text-muted-foreground space-y-1">
                    <span className="font-semibold text-foreground block">Gatilho:</span>
                    <p className="line-clamp-2 italic">{skill.trigger_explicit}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-mono text-xs">
                    Custo est.: ~${skill.estimated_cost_usd.toFixed(4)}
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs px-3 rounded-lg"
                      onClick={() => {
                        setSelectedSkill(skill);
                        setTestPrompt("");
                        setTestResult(null);
                        setTestModalOpen(true);
                      }}
                    >
                      <Play className="size-3.5 mr-1 text-primary" /> Testar
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Detalhes e Teste da Skill */}
      <Dialog open={testModalOpen} onOpenChange={setTestModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              {selectedSkill?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedSkill?.description}
            </DialogDescription>
          </DialogHeader>

          {selectedSkill && CANONICAL_SKILLS_DEFINITIONS[selectedSkill.slug] && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="space-y-2 p-3 rounded-lg bg-muted/20 border border-border/40">
                <span className="font-bold text-foreground block">Procedimento Determinístico:</span>
                <ul className="space-y-1 list-none pl-0 text-muted-foreground">
                  {CANONICAL_SKILLS_DEFINITIONS[selectedSkill.slug].numberedProcedure.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <label className="font-bold text-foreground block">Entrada de Teste:</label>
                <textarea
                  className="w-full p-3 rounded-lg bg-muted/20 border border-border/60 text-xs min-h-[80px] focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Insira dados de teste para a skill..."
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => setTestModalOpen(false)}
                >
                  Fechar
                </Button>
                <Button
                  size="sm"
                  className="rounded-lg"
                  disabled={!testPrompt.trim() || executeMutation.isPending}
                  onClick={() => {
                    executeMutation.mutate({
                      data: {
                        skillSlug: selectedSkill.slug,
                        userPrompt: testPrompt,
                      },
                    });
                  }}
                >
                  {executeMutation.isPending ? (
                    <>
                      <Loader2 className="size-3.5 mr-2 animate-spin" /> Processando...
                    </>
                  ) : (
                    <>
                      <Play className="size-3.5 mr-2" /> Executar Skill
                    </>
                  )}
                </Button>
              </div>

              {testResult && (
                <div className="p-4 rounded-lg bg-card border border-border/60 space-y-2 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">Resultado da Execução:</span>
                    <Badge variant="outline" className="text-xs text-emerald-500 border-emerald-500/20">
                      Sucesso (Porta Única)
                    </Badge>
                  </div>
                  <pre className="p-3 rounded-lg bg-muted/40 font-mono text-xs whitespace-pre-wrap max-h-[220px] overflow-y-auto">
                    {testResult}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
