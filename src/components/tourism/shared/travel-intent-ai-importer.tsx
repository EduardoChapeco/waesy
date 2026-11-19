import * as React from "react";
import { Check, Loader2, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  parseTravelIntentDeterministically,
  type ParsedTravelIntentResult,
} from "@/lib/travel/travel-intent-parser";
import { parseTravelIntentFromTextAI } from "@/services/travel-intent-ai.functions";

interface TravelIntentAiImporterProps {
  mode?: "lead_intent" | "offer_quote";
  defaultOriginCity?: string | null;
  onApply: (parsed: ParsedTravelIntentResult) => void;
  defaultOpen?: boolean;
}

export function TravelIntentAiImporter({
  mode = "lead_intent",
  defaultOriginCity,
  onApply,
  defaultOpen = false,
}: TravelIntentAiImporterProps) {
  const textareaId = React.useId();
  const [open, setOpen] = React.useState(defaultOpen);
  const [rawText, setRawText] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [preview, setPreview] = React.useState<ParsedTravelIntentResult | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleAnalyze = async () => {
    const trimmed = rawText.trim();
    if (trimmed.length < 4) {
      setErrorMsg("Cole pelo menos uma linha com destino, datas ou grupo para extrair.");
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await parseTravelIntentFromTextAI({
        data: {
          rawText: trimmed,
          mode,
          defaultOriginCity: defaultOriginCity || null,
        },
      });
      setPreview(res);
    } catch {
      const fallback = parseTravelIntentDeterministically(trimmed, {
        defaultOriginCity: defaultOriginCity || null,
      });
      setPreview(fallback);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!preview) return;
    onApply(preview);
    setOpen(false);
  };

  return (
    <div className="rounded-xl border border-border bg-muted/20">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-4 py-2 text-left text-xs font-semibold text-foreground transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex items-center gap-2">
          <FileText className="size-4 text-primary" />
          <span>Importar Texto Livre</span>
        </span>
        {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="space-y-3 border-t border-border px-4 pb-4 pt-3">
          <Label htmlFor={textareaId} className="sr-only">
            Texto livre ou Markdown da viagem
          </Label>
          <Textarea
            id={textareaId}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={4}
            placeholder="Cole o resumo em Markdown, mensagem do WhatsApp ou ficha livre do cliente (destinos, datas, quartos, idades das crianças, orçamento)..."
            className="text-base md:text-sm"
          />

          {errorMsg && <p className="text-xs font-medium text-destructive">{errorMsg}</p>}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              O texto original é preservado no histórico do lead.
            </span>
            <Button
              type="button"
              variant="secondary"
              disabled={loading}
              onClick={handleAnalyze}
              className="h-11 min-h-11 gap-2 px-4 text-xs font-semibold"
            >
              {loading ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <FileText className="size-4" />}
              <span>Analisar e Estruturar</span>
            </Button>
          </div>

          {preview && (
            <div className="space-y-3 rounded-lg border border-border bg-background p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-foreground">
                  Campos estruturados prontos para aplicar
                </span>
                <Badge variant={preview.usedAiProvider ? "success" : "secondary"} className="text-xs">
                  Confiança {Math.round(preview.confidenceScore)}%
                </Badge>
              </div>

              <div className="space-y-2 text-xs text-muted-foreground">
                <div>
                  <strong className="text-foreground">Destinos:</strong>{" "}
                  {preview.destinations.length > 0
                    ? preview.destinations.map((d) => d.label).join(", ")
                    : "Nenhum detectado"}
                </div>
                <div>
                  <strong className="text-foreground">Período:</strong>{" "}
                  {preview.period.displayLabel || "Não informado"}
                </div>
                <div>
                  <strong className="text-foreground">Hóspedes:</strong> {preview.rooms.length} quarto(s),{" "}
                  {preview.adultsCount} adulto(s)
                  {preview.childrenAges.length > 0
                    ? `, ${preview.childrenAges.length} criança(s) (${preview.childrenAges.join("a, ")}a)`
                    : ""}
                </div>
                {preview.budget.maxTotalBudgetCents && (
                  <div>
                    <strong className="text-foreground">Orçamento:</strong>{" "}
                    {(preview.budget.maxTotalBudgetCents / 100).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </div>
                )}
              </div>

              {preview.reviewFlags.length > 0 && (
                <div className="space-y-1 rounded-lg bg-warning/15 px-3 py-2 text-xs text-warning-strong">
                  {preview.reviewFlags.map((flag, i) => (
                    <div key={i}>{flag}</div>
                  ))}
                </div>
              )}

              <Button
                type="button"
                variant="default"
                onClick={handleApply}
                className="h-11 min-h-11 w-full gap-2 text-xs font-semibold"
              >
                <Check className="size-4" />
                <span>Aplicar ao Formulário</span>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
