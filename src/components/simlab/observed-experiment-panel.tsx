import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  planTwoArmSampleSize,
  predictPriceResponse,
} from "@/lib/simlab/experiment-statistics";
import {
  listObservedCampaignExperimentHistory,
  recordObservedCampaignExperiment,
  type ObservedCampaignExperimentHistoryEntry,
  type ObservedCampaignExperimentResult,
} from "@/services/simlab-observed-experiments.functions";

type ArmForm = { key: string; label: string; assigned: string; conversions: string; price: string };

const INITIAL_ARMS: ArmForm[] = [
  { key: "control", label: "Controle", assigned: "", conversions: "", price: "" },
  { key: "variant_a", label: "Variante A", assigned: "", conversions: "", price: "" },
];

export function ObservedExperimentPanel({
  storeId,
  experimentId,
}: {
  storeId: string;
  experimentId: string | null;
}) {
  const [assignmentMethod, setAssignmentMethod] = useState<"" | "randomized" | "observational">("");
  const [randomizationUnit, setRandomizationUnit] = useState<"" | "customer" | "session" | "cluster">("");
  const [arms, setArms] = useState<ArmForm[]>(INITIAL_ARMS);
  const [measurementStart, setMeasurementStart] = useState("");
  const [measurementEnd, setMeasurementEnd] = useState("");
  const [sourceReference, setSourceReference] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<ObservedCampaignExperimentResult | null>(null);
  const [history, setHistory] = useState<ObservedCampaignExperimentHistoryEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [baselinePercent, setBaselinePercent] = useState("");
  const [targetPercent, setTargetPercent] = useState("");
  const [samplePlan, setSamplePlan] = useState<ReturnType<typeof planTwoArmSampleSize> | null>(null);
  const [forecastPrice, setForecastPrice] = useState("");
  const [forecastAudience, setForecastAudience] = useState("");

  useEffect(() => {
    if (!storeId || !experimentId) {
      setHistory([]);
      setResult(null);
      return;
    }
    let cancelled = false;
    setErrorMessage(null);
    void listObservedCampaignExperimentHistory({ data: { storeId, experimentId } })
      .then((entries) => {
        if (cancelled) return;
        setHistory(entries);
        setResult(entries[0] || null);
      })
      .catch((error) => {
        if (!cancelled) setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar o histórico observado.");
      });
    return () => { cancelled = true; };
  }, [storeId, experimentId]);

  const priceProjection = useMemo(() => {
    if (!result?.priceResponse || !forecastPrice || !forecastAudience) return null;
    const price = Number(forecastPrice);
    const audience = Number(forecastAudience);
    if (!(price > 0) || !(audience > 0)) return null;
    try {
      const predicted = predictPriceResponse(result.priceResponse, price);
      return {
        ...predicted,
        expectedUnits: predicted.conversionProbability * audience,
        expectedUnitsInterval: predicted.interval95.map((rate) => rate * audience) as [number, number],
        audience,
      };
    } catch {
      return null;
    }
  }, [result, forecastPrice, forecastAudience]);

  const addArm = () => {
    if (arms.length >= 12) return;
    const number = arms.length;
    setArms((current) => [...current, {
      key: `variant_${number}`,
      label: `Variante ${String.fromCharCode(65 + number - 1)}`,
      assigned: "",
      conversions: "",
      price: "",
    }]);
    setResult(null);
  };

  const updateArm = (key: string, field: keyof ArmForm, value: string) => {
    setArms((current) => current.map((arm) => arm.key === key ? { ...arm, [field]: value } : arm));
    setResult(null);
  };

  const removeArm = (key: string) => {
    if (arms.length <= 2 || key === "control") return;
    setArms((current) => current.filter((arm) => arm.key !== key));
    setResult(null);
  };

  const handlePlan = () => {
    try {
      const plan = planTwoArmSampleSize({
        baselineRate: Number(baselinePercent) / 100,
        targetRate: Number(targetPercent) / 100,
      });
      setSamplePlan(plan);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível planejar a amostra.");
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    setResult(null);
    if (!experimentId || !storeId) {
      setErrorMessage("Crie primeiro um experimento SimLab vinculado a este workspace.");
      return;
    }
    if (!assignmentMethod) {
      setErrorMessage("Informe se a atribuição foi randomizada ou observacional.");
      return;
    }
    if (assignmentMethod === "randomized" && !randomizationUnit) {
      setErrorMessage("Informe a unidade de randomização.");
      return;
    }
    if (!measurementStart || !measurementEnd) {
      setErrorMessage("Informe as datas reais da janela de medição.");
      return;
    }

    const parsedArms = arms.map((arm) => ({
      key: arm.key,
      label: arm.label.trim(),
      assigned: Number(arm.assigned),
      conversions: Number(arm.conversions),
      priceBrl: arm.price.trim() ? Number(arm.price) : null,
    }));
    if (parsedArms.some((arm) => !Number.isInteger(arm.assigned) || !Number.isInteger(arm.conversions))) {
      setErrorMessage("Informe contagens inteiras válidas para cada braço.");
      return;
    }
    if (parsedArms.some((arm) => !arm.label || arm.assigned < 1 || arm.conversions < 0 || arm.conversions > arm.assigned)) {
      setErrorMessage("Revise nomes e contagens: conversões devem estar entre zero e unidades atribuídas.");
      return;
    }
    if (new Date(measurementEnd) < new Date(measurementStart)) {
      setErrorMessage("A data final precisa ser igual ou posterior à data inicial.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await recordObservedCampaignExperiment({
        data: {
          storeId,
          experimentId,
          controlKey: "control",
          assignmentMethod,
          randomizationUnit: assignmentMethod === "randomized" ? randomizationUnit as "customer" | "session" | "cluster" : "not_applicable",
          measurementStart: new Date(`${measurementStart}T00:00:00`).toISOString(),
          measurementEnd: new Date(`${measurementEnd}T23:59:59.999`).toISOString(),
          arms: parsedArms,
          confidenceLevel: 0.95,
          sourceReference: sourceReference.trim() || null,
        },
      });
      setResult(res);
      const updatedHistory = await listObservedCampaignExperimentHistory({ data: { storeId, experimentId } });
      setHistory(updatedHistory);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao analisar os resultados observados.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-lg border border-border/80 bg-card p-5 space-y-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary"><BarChart3 className="size-4" /></div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-foreground">Resultados observados de campanha</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Insira totais agregados do seu canal/CRM. Esta tela não lê nem valida automaticamente os dados; não inclua nomes, e-mails ou identificadores de clientes.
          </p>
        </div>
      </div>

      {!experimentId && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-300">
          Execute uma exploração para criar um registro de experimento antes de anexar resultados reais.
        </div>
      )}

      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="simlab-assignment">Desenho do teste</Label>
            <select id="simlab-assignment" value={assignmentMethod} onChange={(event) => {
              setAssignmentMethod(event.target.value as typeof assignmentMethod);
              setRandomizationUnit("");
              setResult(null);
            }} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-xs" required>
              <option value="">Selecione…</option>
              <option value="randomized">Atribuição randomizada</option>
              <option value="observational">Observacional / histórico</option>
            </select>
          </div>
          {assignmentMethod === "randomized" && (
            <div className="space-y-2">
              <Label htmlFor="simlab-randomization-unit">Unidade randomizada</Label>
              <select id="simlab-randomization-unit" value={randomizationUnit} onChange={(event) => setRandomizationUnit(event.target.value as typeof randomizationUnit)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-xs" required>
                <option value="">Selecione…</option>
                <option value="customer">Cliente/conta única</option>
                <option value="session">Sessão</option>
                <option value="cluster">Loja/região (cluster)</option>
              </select>
              <p className="text-[10px] text-muted-foreground">Inferência causal liberada somente para cliente/conta única. Sessão/cluster exige estimador específico.</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="simlab-start">Início da medição</Label>
            <Input id="simlab-start" type="date" value={measurementStart} onChange={(event) => setMeasurementStart(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="simlab-end">Fim da medição</Label>
            <Input id="simlab-end" type="date" value={measurementEnd} onChange={(event) => setMeasurementEnd(event.target.value)} required />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-foreground">Braços do experimento</h4>
              <p className="text-[10px] text-muted-foreground">Denominador = unidades únicas atribuídas; conte conversões na mesma janela e com a mesma regra.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addArm} disabled={arms.length >= 12} className="h-8 gap-1 text-[10px]"><Plus className="size-3" /> Variante</Button>
          </div>
          {arms.map((arm, index) => (
            <div key={arm.key} className="grid grid-cols-1 gap-2 rounded-lg border border-border/70 bg-background p-3 sm:grid-cols-12">
              <div className="space-y-1 sm:col-span-3">
                <Label className="text-[10px]">{index === 0 ? "Controle" : "Variante"}</Label>
                <Input value={arm.label} onChange={(event) => updateArm(arm.key, "label", event.target.value)} maxLength={160} required />
              </div>
              <div className="space-y-1 sm:col-span-3">
                <Label className="text-[10px]">Unidades atribuídas</Label>
                <Input type="number" min="1" step="1" value={arm.assigned} onChange={(event) => updateArm(arm.key, "assigned", event.target.value)} placeholder="Únicas" required />
              </div>
              <div className="space-y-1 sm:col-span-3">
                <Label className="text-[10px]">Conversões</Label>
                <Input type="number" min="0" step="1" value={arm.conversions} onChange={(event) => updateArm(arm.key, "conversions", event.target.value)} placeholder="Pedidos/leads" required />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[10px]">Preço (R$; opcional)</Label>
                <Input type="number" min="0.01" step="0.01" value={arm.price} onChange={(event) => updateArm(arm.key, "price", event.target.value)} placeholder="Para curva de preço" />
              </div>
              <div className="flex items-end sm:col-span-1">
                {index > 1 && <Button type="button" variant="ghost" size="icon" aria-label="Remover variante" onClick={() => removeArm(arm.key)}><Trash2 className="size-4" /></Button>}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Label htmlFor="simlab-source">Referência da fonte (opcional, sem dados pessoais)</Label>
          <Input id="simlab-source" value={sourceReference} onChange={(event) => setSourceReference(event.target.value)} placeholder="Ex.: relatório semanal do canal / nome da integração" maxLength={500} />
        </div>

        {errorMessage && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">{errorMessage}</div>}
        <Button type="submit" disabled={isSaving || !experimentId || !storeId} className="w-full gap-2">
          {isSaving ? "Calculando e salvando…" : "Analisar resultados observados"}
        </Button>
      </form>

      {result && (
        <div className="space-y-4 border-t border-border/60 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Fonte informada pelo usuário; não verificada</Badge>
            <Badge variant={result.assignmentMethod === "randomized" && result.randomizationUnit === "customer" ? "default" : "secondary"}>
              {result.assignmentMethod === "randomized" && result.randomizationUnit === "customer" ? "Desenho causal declarado · não verificado" : "Diferença descritiva"}
            </Badge>
            <span className="text-[10px] text-muted-foreground">{result.analysis.intervalMethod === "newcombe_wilson_score"
              ? "Intenção de tratar · intervalo score Newcombe-Wilson · Holm quando há p-values estimáveis"
              : "Taxas e diferenças observadas · sem intervalo/p-value para esta unidade de randomização"}</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {result.analysis.comparisons.map((comparison) => (
              <div key={comparison.treatmentKey} className="rounded-lg border border-border/70 bg-background p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-foreground">{result.analysis.armRates.find((arm) => arm.key === comparison.treatmentKey)?.label || comparison.treatmentKey}</span>
                  <Badge variant={comparison.causalInterpretation === "randomized_individual_assignment" ? "default" : "outline"}>
                    {comparison.causalInterpretation === "randomized_individual_assignment" ? "Causal condicional" : "Descritivo"}
                  </Badge>
                </div>
                <p className="text-sm font-bold text-foreground">{(comparison.absoluteDifference * 100).toFixed(2)} p.p.</p>
                <p className="text-[10px] text-muted-foreground">{comparison.interval
                  ? `95% IC: ${(comparison.interval[0] * 100).toFixed(2)} a ${(comparison.interval[1] * 100).toFixed(2)} p.p.`
                  : "IC não estimado para esta unidade de randomização."}</p>
                <p className="text-[10px] text-muted-foreground">Controle {(comparison.controlRate * 100).toFixed(2)}% · variante {(comparison.treatmentRate * 100).toFixed(2)}%</p>
                <p className="text-[10px] text-muted-foreground">p bruto: {comparison.pValue == null
                  ? comparison.pValueMethod === "not_identifiable_design" ? "não estimável para este desenho" : "não estimável (contagens esparsas)"
                  : comparison.pValue.toFixed(4)} · p Holm: {comparison.adjustedPValue == null ? "—" : comparison.adjustedPValue.toFixed(4)}</p>
                <p className="text-[10px] font-medium text-muted-foreground">{comparison.statisticallySignificant == null ? "Sem inferência de significância" : comparison.statisticallySignificant ? "Diferença compatível com efeito estatístico no nível definido" : "Evidência insuficiente para rejeitar igualdade"}</p>
              </div>
            ))}
          </div>
          {result.priceResponse ? (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div>
                <h4 className="text-xs font-bold text-foreground">Curva logística de preço — ajuste em dados randomizados</h4>
                <p className="text-[10px] text-muted-foreground">Elasticidade local no preço de referência R$ {result.priceResponse.referencePriceBrl.toFixed(2)}: {result.priceResponse.elasticityAtReference.toFixed(2)} (95% IC {result.priceResponse.elasticityInterval95[0].toFixed(2)} a {result.priceResponse.elasticityInterval95[1].toFixed(2)}). Ajuste exige validação holdout prospectiva.</p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="space-y-1"><Label htmlFor="forecast-price" className="text-[10px]">Preço a avaliar (R$)</Label><Input id="forecast-price" type="number" min="0.01" step="0.01" value={forecastPrice} onChange={(event) => setForecastPrice(event.target.value)} placeholder="Ex.: 89,90" /></div>
                <div className="space-y-1"><Label htmlFor="forecast-audience" className="text-[10px]">Audiência elegível planejada</Label><Input id="forecast-audience" type="number" min="1" step="1" value={forecastAudience} onChange={(event) => setForecastAudience(event.target.value)} placeholder="Pessoas/contas únicas" /></div>
              </div>
              {priceProjection && <p className="text-xs text-foreground">Projeção condicional: {(priceProjection.conversionProbability * 100).toFixed(2)}% de conversão; cerca de {priceProjection.expectedUnits.toFixed(0)} conversões em {priceProjection.audience.toLocaleString("pt-BR")} unidades (95% IC aproximado: {priceProjection.expectedUnitsInterval[0].toFixed(0)}–{priceProjection.expectedUnitsInterval[1].toFixed(0)}). Não validada em holdout.</p>}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground">Curva de preço não estimada: {result.priceResponseStatus === "need_three_randomized_price_arms" ? "exige ao menos três níveis de preço distintos, randomizados por cliente." : result.priceResponseStatus === "not_randomized" ? "preços observacionais não identificam elasticidade causal." : result.priceResponseStatus === "unsupported_randomization_unit" ? "randomização por sessão/cluster exige outro estimador." : "faltam preços observados ou suporte estatístico."}</p>
          )}
          <ul className="list-disc space-y-1 pl-4 text-[10px] text-muted-foreground">
            {result.limitations.slice(0, 4).map((item, index) => <li key={index}>{item}</li>)}
          </ul>
        </div>
      )}

      {history.length > 0 && (
        <details className="rounded-lg border border-border/70 p-3">
          <summary className="cursor-pointer text-xs font-semibold text-foreground">Histórico persistido ({history.length} janela{history.length === 1 ? "" : "s"})</summary>
          <div className="mt-3 space-y-3">
            {history.map((entry) => (
              <div key={`${entry.measurementStart}|${entry.measurementEnd}`} className="rounded-md border border-border/60 p-3">
                <p className="text-[10px] font-semibold text-foreground">
                  {new Date(entry.measurementStart).toLocaleDateString("pt-BR")}–{new Date(entry.measurementEnd).toLocaleDateString("pt-BR")}
                  {entry.sourceReference ? ` · ${entry.sourceReference}` : ""}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">{entry.assignmentMethod === "randomized" ? `Randomizado por ${entry.randomizationUnit}` : "Observacional"} · informado pelo usuário, não verificado</p>
                <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                  {entry.analysis.armRates.map((arm) => (
                    <li key={arm.key} className="text-[10px] text-muted-foreground">{arm.label}: {arm.conversions}/{arm.assigned} ({(arm.conversionRate * 100).toFixed(2)}%)</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      )}

      <details className="rounded-lg border border-border/70 p-3">
        <summary className="cursor-pointer text-xs font-semibold text-foreground">Planejar tamanho amostral antes do próximo A/B</summary>
        <div className="mt-3 grid grid-cols-1 items-end gap-3 sm:grid-cols-3">
          <div className="space-y-1"><Label htmlFor="baseline-conv" className="text-[10px]">Baseline observado (%)</Label><Input id="baseline-conv" type="number" min="0.01" max="99.99" step="0.01" value={baselinePercent} onChange={(event) => setBaselinePercent(event.target.value)} placeholder="Ex.: 5" /></div>
          <div className="space-y-1"><Label htmlFor="target-conv" className="text-[10px]">Taxa-alvo/MDE (%)</Label><Input id="target-conv" type="number" min="0.01" max="99.99" step="0.01" value={targetPercent} onChange={(event) => setTargetPercent(event.target.value)} placeholder="Ex.: 6" /></div>
          <Button type="button" variant="outline" onClick={handlePlan}>Calcular amostra</Button>
        </div>
        {samplePlan && <p className="mt-3 text-xs text-foreground">Com α=5%, poder=80% e alocação 1:1: aproximadamente {samplePlan.requiredPerArm.toLocaleString("pt-BR")} unidades por braço ({samplePlan.totalRequired.toLocaleString("pt-BR")} no total). Use baseline de dados observados; o método não considera clusters nem perdas.</p>}
        {errorMessage && !isSaving && <p className="mt-2 text-[10px] text-destructive">{errorMessage}</p>}
      </details>
      <p className="flex gap-2 text-[10px] text-muted-foreground"><AlertTriangle className="size-3 shrink-0" /> A resposta qualitativa de personas sintéticas não alimenta as taxas nem a curva de preço acima.</p>
    </section>
  );
}
