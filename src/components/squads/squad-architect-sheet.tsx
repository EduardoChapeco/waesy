import { useState } from "react";
import { Boxes, Plus, Trash2, Zap, Bot, ArrowRight, ShieldCheck, CheckCircle2, Loader2, Layers, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { toast } from "sonner";
import { createCustomSquadFromArchitectFn } from "@/services/squads-runtime.functions";

export interface ArchitectAgent {
  id: string;
  name: string;
  role_label: string;
  specialty: string;
  color: string;
}

const CANONICAL_CATALOG_AGENTS: ArchitectAgent[] = [
  {
    id: "agent-copywriter",
    name: "Copywriter Estratégico",
    role_label: "Conversão e Conteúdo",
    specialty: "Headlines persuasivas, e-mails e criativos",
    color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  },
  {
    id: "agent-radar",
    name: "Analista de Mercado & Radar",
    role_label: "Inteligência Competitiva",
    specialty: "Monitoramento de concorrentes e benchmarking",
    color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  },
  {
    id: "agent-cro",
    name: "Engenheiro de Conversão (CRO)",
    role_label: "Otimização de Ofertas",
    specialty: "Testes A/B, atrito de checkout e precificação",
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    id: "agent-security",
    name: "Auditor de Risco & Conformidade",
    role_label: "Segurança e Validação",
    specialty: "Auditoria de fraudes, KYC e RLS multi-tenant",
    color: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  },
  {
    id: "agent-logistics",
    name: "Despachante MotoLink Autônomo",
    role_label: "Roteamento e Entregas",
    specialty: "Surge pricing, raio de atendimento e frota",
    color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  },
];

interface SquadArchitectSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  onSquadCreated?: () => void;
}

export function SquadArchitectSheet({
  open,
  onOpenChange,
  storeId,
  onSquadCreated,
}: SquadArchitectSheetProps) {
  const [squadName, setSquadName] = useState("");
  const [description, setDescription] = useState("");
  const [pipeline, setPipeline] = useState<ArchitectAgent[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddAgent = (agent: ArchitectAgent) => {
    setPipeline((prev) => [...prev, agent]);
  };

  const handleRemoveAgent = (index: number) => {
    setPipeline((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!squadName.trim()) {
      toast.error("Informe um nome para o Squad.");
      return;
    }
    if (pipeline.length === 0) {
      toast.error("Adicione ao menos um agente ao pipeline.");
      return;
    }

    setIsSaving(true);
    try {
      await createCustomSquadFromArchitectFn({
        data: {
          storeId,
          squadName: squadName.trim(),
          description: description.trim() || "Squad autônomo montado no Architect Mode.",
          pipeline: pipeline.map((a) => ({
            id: a.id,
            name: a.name,
            role_label: a.role_label,
          })),
        },
      });

      toast.success(`Squad "${squadName}" arquitetado e ativo!`);
      setSquadName("");
      setDescription("");
      setPipeline([]);
      onOpenChange(false);
      onSquadCreated?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar Squad.";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] p-0 flex flex-col justify-between overflow-y-auto"
      >
        <div className="p-6 space-y-6">
          <SheetHeader className="text-left space-y-1 border-b border-border/60 pb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full w-fit mb-1">
              <Cpu className="size-3.5 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">
                Architect Builder (ENGIOS)
              </span>
            </div>
            <SheetTitle className="text-lg font-bold">
              Projetar Novo Squad Autônomo
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Configure agentes especializados em sequência para executar rotinas
              de inteligência, marketing ou logística da sua loja.
            </SheetDescription>
          </SheetHeader>

          {/* Dados Gerais do Squad */}
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                Nome do Squad
              </label>
              <Input
                placeholder="Ex: Squad de Lançamentos & Tráfego Pago"
                value={squadName}
                onChange={(e) => setSquadName(e.target.value)}
                className="h-11 min-h-11 rounded-lg bg-background text-xs"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                Missão Operacional
              </label>
              <textarea
                placeholder="Descreva o objetivo nuclear deste squad (ex: Otimizar campanhas e validar copies de vendas)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs rounded-lg border border-input bg-background p-3 focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[70px] resize-none"
              />
            </div>
          </div>

          {/* Pipeline Atual */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Layers className="size-3.5 text-primary" />
                Pipeline de Execução ({pipeline.length})
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                Ordem sequencial
              </span>
            </div>

            {pipeline.length === 0 ? (
              <div className="p-4 rounded-lg bg-muted/40 border border-dashed border-border/80 text-center text-xs text-muted-foreground">
                Clique nos agentes abaixo para adicioná-los à esteira.
              </div>
            ) : (
              <div className="space-y-2">
                {pipeline.map((agent, idx) => (
                  <div
                    key={`${agent.id}-${idx}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/70 bg-card text-xs shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="size-5 rounded-full bg-primary/10 text-primary font-bold font-mono text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-foreground">
                          {agent.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {agent.role_label}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveAgent(idx)}
                      className="size-7 text-muted-foreground hover:text-destructive rounded-lg"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Catálogo de Agentes Disponíveis */}
          <div className="space-y-3 pt-2">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Bot className="size-3.5 text-primary" />
              Catálogo de Especialistas
            </span>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {CANONICAL_CATALOG_AGENTS.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-background text-xs hover:border-primary/40 transition-colors"
                >
                  <div className="space-y-1 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {agent.name}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[9px] font-mono px-2 py-0"
                      >
                        {agent.role_label}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {agent.specialty}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddAgent(agent)}
                    className="rounded-lg h-8 px-3 text-xs gap-1 shrink-0 cursor-pointer"
                  >
                    <Plus className="size-3" />
                    Incluir
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="p-4 border-t border-border/60 bg-muted/20 flex flex-row items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-lg h-11 text-xs"
          >
            Cancelar
          </Button>

          <Button
            onClick={() => void handleSave()}
            disabled={isSaving || !squadName.trim() || pipeline.length === 0}
            className="rounded-lg h-11 min-h-11 px-5 text-xs font-bold gap-2 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Criando Squad...
              </>
            ) : (
              <>
                <Zap className="size-4" />
                Instanciar Squad
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
