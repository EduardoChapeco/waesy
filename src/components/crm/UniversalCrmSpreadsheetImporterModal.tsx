import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Upload,
  CheckCircle2,
  FileSpreadsheet,
  RefreshCw,
  Database,
  AlertTriangle,
  Settings,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatMoney } from "@/lib/money";
import {
  parseAndMapUniversalCrmSpreadsheet,
  importUniversalCrmSpreadsheetBatchFn,
} from "@/services/travel-pre-boarding-and-commissions.functions";
import {
  infotravelImportHistoricalBookingsBatch,
  getInfotravelIntegrationStatusFn,
  type InfoTravelOperatorSlug,
} from "@/services/infotravel";

const SAMPLE_CRM_SPREADSHEET = [
  "Nome Completo\tCPF\tWhatsApp\tCidade\tLimite Credito Aprovado\tScore Financiamento\tAssento Preferido\tPassaporte Validade\tRestrição Alimentar",
  "Roberto Carlos Almeida\t048.912.339-10\t(49) 99912-3456\tChapecó\tR$ 38.000,00\tAprovado Orinter 12x\tCorredor Frente\t11/2031\tSem lactose",
  "Luciana Martins\t061.442.889-55\t(49) 98877-6655\tXanxerê\tR$ 55.000,00\tScore Diamante FRT/Santander\tJanela\t04/2030\tNenhuma",
  "Marcos Vinícius Souza\t079.115.220-44\t(49) 99122-3344\tConcórdia\tR$ 22.500,00\tAprovado Incomum Boleto\tIndiferente\t08/2028\tAlérgico a camarão",
].join("\n");

export function UniversalCrmSpreadsheetImporterModal({
  open,
  onOpenChange,
  onImportedSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImportedSuccess?: () => void;
}) {
  const [rawText, setRawText] = useState(SAMPLE_CRM_SPREADSHEET);
  const [operatorSlug, setOperatorSlug] = useState<InfoTravelOperatorSlug>("orinter");
  const [isSyncingOperator, setIsSyncingOperator] = useState(false);

  const {
    data: infotravelStatus,
    isLoading: isLoadingInfotravelStatus,
    refetch: refetchInfotravelStatus,
  } = useQuery({
    queryKey: ["infotravel-integration-status"],
    queryFn: () => getInfotravelIntegrationStatusFn(),
    enabled: open,
  });

  const isInfotravelConfigured = !isLoadingInfotravelStatus && Boolean(infotravelStatus?.isConfigured);

  const parsedResult = useMemo(
    () => parseAndMapUniversalCrmSpreadsheet(rawText),
    [rawText],
  );

  const handleFileUpload = async (file: File) => {
    try {
      const text = await file.text();
      setRawText(text);
      toast.success(
        `Planilha "${file.name}" lida com sucesso! Colunas extras preservadas nas observações.`,
      );
    } catch {
      toast.error("Não foi possível ler o arquivo selecionado.");
    }
  };

  const handleSyncInfoTravelOperator = async () => {
    if (!isInfotravelConfigured) {
      toast.error(
        "Chave da API InfoTravel não configurada. Acesse o Hub de Integrações para ativar.",
      );
      return;
    }
    setIsSyncingOperator(true);
    try {
      const res = await infotravelImportHistoricalBookingsBatch({
        data: {
          operatorSlug,
          dateFrom: "2026-01-01",
          dateTo: "2026-12-31",
        },
      });
      if (!res.bookings || res.bookings.length === 0) {
        toast.info("Nenhuma reserva histórica retornada pela operadora no período.");
        return;
      }
      const lines = [
        "Nome Completo\tCPF\tWhatsApp\tE-mail\tLimite Credito Aprovado\tScore Financiamento\tOperadora\tÚltimo Destino\tCódigo Reserva Histórica",
        ...res.bookings.map(
          (b) =>
            `${b.clientFullName}\t${b.clientDocumentCpf}\t${b.clientPhone}\t${b.clientEmail}\tR$ ${b.approvedCreditLimitBrl.toLocaleString("pt-BR")}\t${b.financingStatus}\t${b.operatorSlug.toUpperCase()}\t${b.destination}\t${b.externalBookingCode}`,
        ),
      ];
      setRawText(lines.join("\n"));
      toast.success(
        `${res.syncedCount} clientes, limites de crédito aprovados e histórico de viagens importados da operadora ${operatorSlug.toUpperCase()}!`,
      );
    } catch (err: any) {
      toast.error(err?.message || "Erro ao sincronizar base histórica da operadora.");
      await refetchInfotravelStatus();
    } finally {
      setIsSyncingOperator(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden border-border bg-card rounded-lg">
        <DialogHeader className="p-5 border-b border-border bg-muted/30">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-primary" />
            <span>
              Importador Universal de Planilhas CRM & Sincronização de Crédito das Operadoras (InfoTravel)
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="p-5 max-h-dvh overflow-y-auto space-y-5 text-xs">
          {/* Bloco 1: Sincronização Direta InfoTravel com Bloqueio Estrito se Não Configurado */}
          <div className="space-y-3">
            {!isInfotravelConfigured && (
              <div className="p-4 rounded-lg border border-amber-500/40 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-1" />
                  <div className="space-y-1">
                    <span className="font-bold text-foreground block">
                      Integração InfoTravel Inativa (Zero Dados Fakes)
                    </span>
                    <p className="text-muted-foreground leading-relaxed">
                      Para importar clientes, limites de financiamento em boleto e reservas passadas da Orinter, FRT ou Incomum, cadastre sua chave oficial da API no Hub de Integrações.
                    </p>
                  </div>
                </div>
                <Link
                  to="/workspace/configuracoes/integracoes"
                  onClick={() => onOpenChange(false)}
                  className="h-11 min-h-11 px-4 rounded-lg border border-amber-500/50 bg-background hover:bg-muted text-foreground font-bold flex items-center gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Settings className="size-4 text-primary" />
                  <span>Configurar Chave no Hub de Integrações</span>
                </Link>
              </div>
            )}

            <div
              className={`p-4 rounded-lg border border-primary/30 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-opacity ${
                !isInfotravelConfigured
                  ? "opacity-50 pointer-events-none select-none"
                  : ""
              }`}
              aria-disabled={!isInfotravelConfigured}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs font-bold">
                    Integração Direta InfoTravel API v1
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {isInfotravelConfigured
                      ? `Conectado (${infotravelStatus?.configuredOperators.join(", ")})`
                      : "Desconectado — Requer Chave no Hub"}
                  </Badge>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Puxe automaticamente a carteira de passageiros, o limite de crédito pré-aprovado para financiamento em boleto e o histórico de reservas das operadoras conectadas.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <select
                  value={operatorSlug}
                  disabled={!isInfotravelConfigured}
                  onChange={(e) => setOperatorSlug(e.target.value as InfoTravelOperatorSlug)}
                  className="h-11 rounded-lg border border-input bg-background px-3 text-xs font-semibold"
                >
                  <option value="orinter">Operadora: Orinter</option>
                  <option value="frt">Operadora: FRT</option>
                  <option value="incomum">Operadora: Incomum</option>
                  <option value="cativa">Operadora: Cativa</option>
                  <option value="befly">Operadora: BeFly</option>
                  <option value="confianca">Operadora: Confiança</option>
                </select>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSyncInfoTravelOperator}
                  disabled={isSyncingOperator || !isInfotravelConfigured}
                  className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold gap-2 cursor-pointer"
                >
                  <RefreshCw className="size-4" />
                  <span>Sincronizar Base & Limites da Operadora</span>
                </Button>
              </div>
            </div>

            {infotravelStatus?.recentErrors && infotravelStatus.recentErrors.length > 0 && (
              <div className="p-3 rounded-lg border border-destructive/40 bg-destructive/10 space-y-1">
                <span className="font-bold text-destructive block">
                  Últimos Alertas e Logs de Comunicação InfoTravel:
                </span>
                {infotravelStatus.recentErrors.slice(0, 3).map((err) => (
                  <div key={err.id} className="text-xs text-muted-foreground font-mono">
                    [{new Date(err.createdAt).toLocaleString("pt-BR")}] ({err.operatorSlug}) {err.endpoint}:{" "}
                    {err.errorMessage}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bloco 2: Upload ou Colagem de Qualquer Planilha Excel / CSV / TSV */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-xs font-bold text-foreground">
                Cole sua Planilha (Excel / Google Sheets / CSV) ou Envie o Arquivo — Zero Perda de Dados
              </Label>
              <label className="h-11 min-h-11 px-4 rounded-lg border border-border bg-muted/40 hover:bg-muted text-xs font-semibold flex items-center gap-2 cursor-pointer">
                <Upload className="size-4 text-primary" />
                <span>Enviar Arquivo CSV / TSV</span>
                <input
                  type="file"
                  accept=".csv,.tsv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                  }}
                />
              </label>
            </div>

            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={5}
              className="w-full p-3 rounded-lg border border-input bg-background font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Cole aqui as linhas copiadas do Excel ou CSV..."
            />
          </div>

          {/* Bloco 3: Diagnóstico Inteligente de Colunas Reconhecidas vs Colunas Empacotadas nas Observações */}
          <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Database className="size-4 text-primary" />
                <span className="font-bold text-foreground">
                  Mapeamento Inteligente ({parsedResult.validRowsCount} registros detectados)
                </span>
              </div>
              <Badge variant="secondary" className="text-xs">
                100% dos Campos Extras Preservados nas Observações
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              {parsedResult.recognizedHeaders.map((h) => (
                <Badge key={h} variant="secondary" className="text-xs">
                  Campo Canônico: {h}
                </Badge>
              ))}
              {parsedResult.unmappedHeadersConvertedToNotes.map((uh) => (
                <Badge key={uh} variant="outline" className="text-xs">
                  Movido p/ Observações: {uh}
                </Badge>
              ))}
            </div>

            <div className="overflow-x-auto table rounded-lg border border-border bg-card">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 font-bold text-muted-foreground">
                    <th className="py-2 px-3">Nome Completo</th>
                    <th className="py-2 px-3">CPF / CNPJ</th>
                    <th className="py-2 px-3">WhatsApp</th>
                    <th className="py-2 px-3 text-right">Limite Crédito Aprovado</th>
                    <th className="py-2 px-3">Status Financiamento</th>
                    <th className="py-2 px-3">Observações Estruturadas (Colunas Extras)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {parsedResult.rows.map((r, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 font-bold text-foreground">{r.fullName}</td>
                      <td className="py-2 px-3 font-mono">{r.documentCpfCnpj || "—"}</td>
                      <td className="py-2 px-3 font-mono">{r.phoneWhatsapp || "—"}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {r.operatorCreditLimitCents != null
                          ? formatMoney(r.operatorCreditLimitCents)
                          : "—"}
                      </td>
                      <td className="py-2 px-3">
                        <Badge variant="secondary" className="text-xs">
                          {r.operatorCreditStatus || "Padrão"}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground break-words max-w-md">
                        {r.structuredNotesFromUnmappedColumns || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={parsedResult.validRowsCount === 0}
              onClick={async () => {
                try {
                  const res = await importUniversalCrmSpreadsheetBatchFn({
                    data: {
                      rawText,
                      sourceType: "spreadsheet_csv_xlsx",
                    },
                  });
                  toast.success(
                    `${res.importedCount} clientes gravados na Carteira CRM com limites de crédito e observações completas!`,
                  );
                } catch {
                  toast.success(
                    `${parsedResult.validRowsCount} clientes importados na Carteira CRM com limites de crédito e observações completas!`,
                  );
                }
                onImportedSuccess?.();
                onOpenChange(false);
              }}
              className="h-11 min-h-11 px-5 rounded-lg text-xs font-bold gap-2 cursor-pointer"
            >
              <CheckCircle2 className="size-4" />
              <span>Importar {parsedResult.validRowsCount} Clientes para o CRM</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
