import { useState } from "react";
import {
  BrainCircuit,
  Zap,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  runSimLabResearch,
  MUNICIPALITY_DEMOGRAPHIC_PRESETS,
} from "@/services/simlab.functions";
import type {
  SimLabPersonaResponse,
  SimLabSourceEntityType,
  SimLabStatisticalSynthesis,
} from "@/types/simlab";

export interface SimLabQuickTestSheetProps {
  storeId?: string;
  initialTitle?: string;
  initialDescription?: string;
  initialPriceBrl?: number;
  initialMunicipality?: string;
  sourceEntityType?: SimLabSourceEntityType;
  sourceEntityId?: string | null;
  creativeMediaUrl?: string | null;
  triggerLabel?: string;
  onApplyOptimalPrice?: (optimalPriceBrl: number) => void;
}

const MUNICIPALITIES = Object.keys(MUNICIPALITY_DEMOGRAPHIC_PRESETS);

export function SimLabQuickTestSheet({
  storeId,
  initialTitle = "",
  initialDescription = "",
  initialPriceBrl = 197,
  initialMunicipality = "São Miguel do Oeste - SC",
  sourceEntityType = "standalone",
  sourceEntityId = null,
  creativeMediaUrl = null,
  triggerLabel = "Simular no SimLabs 4.0",
  onApplyOptimalPrice,
}: SimLabQuickTestSheetProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [priceInput, setPriceInput] = useState(String(initialPriceBrl || 197));
  const [installmentsInput, setInstallmentsInput] = useState("3");
  const [municipality, setMunicipality] = useState(initialMunicipality);
  const [cohortSize, setCohortSize] = useState(12);
  const [isRunning, setIsRunning] = useState(false);

  const [synthesis, setSynthesis] = useState<SimLabStatisticalSynthesis | null>(null);
  const [responses, setResponses] = useState<SimLabPersonaResponse[]>([]);

  const handleOpen = () => {
    if (initialTitle && !title) setTitle(initialTitle);
    if (initialDescription && !description) setDescription(initialDescription);
    if (initialPriceBrl && priceInput === "197") setPriceInput(String(initialPriceBrl));
    setOpen(true);
  };

  const handleRunSimulation = async () => {
    const effectiveTitle = (title || initialTitle).trim();
    const effectiveDesc = (description || initialDescription).trim();
    if (!effectiveTitle || !effectiveDesc) {
      toast.error("Informe o título e a descrição da oferta para simular no enxame.");
      return;
    }

    setIsRunning(true);
    try {
      const parsedPrice = Number.parseFloat(priceInput);
      const validPrice = Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : undefined;
      const parsedInstallments = Math.max(
        1,
        Math.min(24, Number.parseInt(installmentsInput, 10) || 1),
      );

      const res = await runSimLabResearch({
        data: {
          ...(storeId ? { storeId } : {}),
          title: effectiveTitle,
          objective: effectiveDesc,
          simulated_personas_count: cohortSize,
          testPriceBrl: validPrice,
          maxInstallments: parsedInstallments,
          municipalityFilter: municipality,
          sourceEntityType,
          sourceEntityId,
          creativeMediaUrl,
        },
      });

      setSynthesis(res.synthesis);
      setResponses(res.responses || []);
      toast.success(
        `SimLabs 4.0 concluído! Média de intenção: ${res.synthesis.mean_intent_percent ?? res.synthesis.overall_approval_rate ?? 0}%`,
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha ao executar o enxame SimLabs.");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={handleOpen}
        className="h-11 min-h-11 rounded-lg font-semibold gap-2 border-primary/40 text-foreground hover:bg-primary/10 cursor-pointer"
      >
        <BrainCircuit className="size-4 text-primary" />
        <span>{triggerLabel}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-screen overflow-y-auto pt-6 pb-8 rounded-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <BrainCircuit className="size-5 text-primary" />
              SimLabs 4.0 — Validação Instantânea de Enxame
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Teste sua oferta, anúncio ou criativo em uma coorte estratificada pelo IBGE/POF antes
              de publicar ou investir em tráfego pago.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Município / Coorte IBGE</Label>
                <select
                  value={municipality}
                  onChange={(e) => setMunicipality(e.target.value)}
                  className="w-full h-11 min-h-11 rounded-lg border border-input bg-background px-3 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {MUNICIPALITIES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Preço Testado (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  className="h-11 min-h-11 text-xs font-mono rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Parcelas</Label>
                  <Input
                    type="number"
                    min={1}
                    max={24}
                    value={installmentsInput}
                    onChange={(e) => setInstallmentsInput(e.target.value)}
                    className="h-11 min-h-11 text-xs font-mono rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Personas</Label>
                  <select
                    value={cohortSize}
                    onChange={(e) => setCohortSize(Number(e.target.value))}
                    className="w-full h-11 min-h-11 rounded-lg border border-input bg-background px-2 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value={8}>8</option>
                    <option value={12}>12</option>
                    <option value={16}>16</option>
                    <option value={24}>24</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Headline / Título da Oferta</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Oferta Especial de Fim de Semana com Bônus"
                className="h-11 min-h-11 text-xs rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Copy / Descrição / Condições</Label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva os benefícios, garantias e chamada para ação..."
                className="w-full rounded-lg border border-input bg-background p-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <Button
              type="button"
              disabled={isRunning}
              onClick={() => void handleRunSimulation()}
              className="w-full h-11 min-h-11 rounded-lg font-bold gap-2 cursor-pointer"
            >
              {isRunning ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Simulando Coorte ({municipality})...
                </>
              ) : (
                <>
                  <Zap className="size-4" /> Rodar Simulação Econométrica Agora
                </>
              )}
            </Button>

            {synthesis && (
              <div className="space-y-4 pt-3 border-t border-border/60">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg border border-border/70 bg-muted/20 space-y-1">
                    <span className="text-xs text-muted-foreground">Média / Moda</span>
                    <p className="text-base font-bold font-mono text-foreground">
                      {synthesis.mean_intent_percent ?? synthesis.overall_approval_rate ?? 0}%
                    </p>
                    <span className="text-xs text-muted-foreground block">
                      Moda: {synthesis.mode_intent_percent ?? 0}%
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-primary/40 bg-primary/5 space-y-1">
                    <span className="text-xs font-semibold text-primary">Preço Ótimo (P*)</span>
                    <p className="text-base font-bold font-mono text-foreground">
                      R$ {Number(synthesis.optimal_price_point_brl || 0).toFixed(2)}
                    </p>
                    <span className="text-xs text-muted-foreground block">
                      Moda WTP: R$ {Number(synthesis.mode_reservation_price_brl || 0).toFixed(0)}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-border/70 bg-muted/20 space-y-1">
                    <span className="text-xs text-muted-foreground">Clearing PIX P2P</span>
                    <p className="text-base font-bold font-mono text-foreground">
                      R$ {Number(synthesis.p2p_clearing_price_brl || 0).toFixed(0)}
                    </p>
                    <span className="text-xs text-muted-foreground block">
                      Elasticidade: {synthesis.price_elasticity_score ?? 0}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-border/70 bg-muted/20 space-y-1">
                    <span className="text-xs text-muted-foreground">NPS & Viralidade</span>
                    <p className="text-base font-bold font-mono text-foreground">
                      NPS {synthesis.synthetic_nps ?? 0}
                    </p>
                    <span className="text-xs text-muted-foreground block">
                      Feed: {synthesis.social_virality_index ?? 0}/10
                    </span>
                  </div>
                </div>

                {onApplyOptimalPrice && synthesis.optimal_price_point_brl && (
                  <div className="flex items-center justify-between p-3 rounded-lg border border-primary/30 bg-primary/5">
                    <span className="text-xs text-foreground">
                      Deseja aplicar o <strong>Preço Ótimo de Maximização de Receita (P*)</strong>{" "}
                      calculado pelo motor McFadden?
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        onApplyOptimalPrice(Number(synthesis.optimal_price_point_brl));
                        toast.success(
                          `Preço atualizado para R$ ${Number(synthesis.optimal_price_point_brl).toFixed(2)}`,
                        );
                      }}
                      className="h-11 min-h-11 rounded-lg text-xs font-bold"
                    >
                      Aplicar R$ {Number(synthesis.optimal_price_point_brl).toFixed(2)}
                    </Button>
                  </div>
                )}

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {responses.slice(0, 8).map((r, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg border border-border/60 bg-background text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-foreground">
                          {r.archetype?.display_name} ({r.archetype?.abep_social_class})
                        </span>
                        <Badge variant="outline" className="font-mono text-xs">
                          P(Compra): {r.choice_probability_percent ?? r.purchase_intent_percent ?? 0}% · WTP R${" "}
                          {Number(r.reservation_price_brl || 0).toFixed(0)}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">“{r.verbatim_reaction}”</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
