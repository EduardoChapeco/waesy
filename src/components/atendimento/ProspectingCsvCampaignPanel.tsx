import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, FileSpreadsheet, Loader2, Send, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  launchCsvProspectingCampaignFn,
  previewCsvProspectingListFn,
  type CsvProspectPreviewResult,
} from "@/services/whatsapp-prospecting-csv.functions";
import { TURIS_PROSPECTING_DEFAULT_TEMPLATE } from "@/lib/presets/turis";

export function ProspectingCsvCampaignPanel() {
  const [campaignName, setCampaignName] = useState("Prospecção Viajantes 24 Meses");
  const [csvText, setCsvText] = useState("");
  const [messageTemplate, setMessageTemplate] = useState(TURIS_PROSPECTING_DEFAULT_TEMPLATE);
  const [preview, setPreview] = useState<CsvProspectPreviewResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePreview = async () => {
    if (!csvText.trim()) {
      toast.error("Cole a lista CSV (nome, telefone, interesse) antes de validar.");
      return;
    }
    setPreviewing(true);
    setErrorMsg(null);
    try {
      const res = await previewCsvProspectingListFn({ data: { csvText } });
      setPreview(res);
      toast.success(`${res.validContacts.length} contatos válidos prontos para prospecção.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao validar CSV.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setPreviewing(false);
    }
  };

  const handleLaunch = async () => {
    if (!csvText.trim() || !campaignName.trim()) {
      toast.error("Preencha o nome da campanha e a lista CSV.");
      return;
    }
    setLaunching(true);
    setErrorMsg(null);
    try {
      const res = await launchCsvProspectingCampaignFn({
        data: {
          campaignName,
          csvText,
          messageTemplate,
          minIntervalSec: 50,
          maxIntervalSec: 95,
        },
      });
      toast.success(`Campanha agendada com pacing anti-banimento: ${res.scheduledCount} contatos.`);
      setCsvText("");
      setPreview(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao agendar prospecção.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLaunching(false);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="size-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Prospecção Ativa CSV</h2>
            <Badge variant="outline" className="text-xs">Pacing Anti-Ban + App Link</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Importe listas de possíveis viajantes com filtro automático de Opt-Out e cadência humanizada
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground" htmlFor="csv-campaign-name">
              Nome da Campanha
            </label>
            <Input
              id="csv-campaign-name"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground" htmlFor="csv-contacts-input">
              Lista CSV (Nome, Telefone, Interesse, Cidade)
            </label>
            <Textarea
              id="csv-contacts-input"
              rows={5}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={"Maria Silva, 5549999112233, Gramado em Família, Chapecó\nJoão Souza, 49988776655, Cruzeiro Nordeste, Xanxerê"}
              className="font-mono text-xs"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground" htmlFor="csv-template-input">
              Mensagem Consultiva (variáveis: {"{{nome}}"}, {"{{agencia}}"}, {"{{app_link}}"})
            </label>
            <Textarea
              id="csv-template-input"
              rows={7}
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              className="text-xs leading-relaxed"
            />
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 flex items-center gap-2 text-xs text-foreground">
          <ShieldAlert className="size-4 text-destructive shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {preview && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default" className="text-xs">
              {preview.validContacts.length} elegíveis
            </Badge>
            <Badge variant="outline" className="text-xs">
              {preview.optedOutExcludedCount} bloqueados por Opt-Out
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {preview.invalidOrDuplicateCount} duplicados/inválidos
            </Badge>
          </div>
          <span className="text-muted-foreground font-mono">{preview.brandedAppUrl}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={handlePreview}
          disabled={previewing || !csvText.trim()}
          className="h-11 min-h-11 px-4 rounded-lg gap-2 focus-visible:ring-2 focus-visible:ring-ring"
        >
          {previewing ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <CheckCircle2 className="size-4" />}
          <span>Validar Lista e Opt-Out</span>
        </Button>
        <Button
          type="button"
          onClick={handleLaunch}
          disabled={launching || !csvText.trim()}
          className="h-11 min-h-11 px-5 rounded-lg font-semibold gap-2 focus-visible:ring-2 focus-visible:ring-ring"
        >
          {launching ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <Send className="size-4" />}
          <span>{launching ? "Agendando..." : "Iniciar Disparo Escalonado"}</span>
        </Button>
      </div>
    </section>
  );
}
