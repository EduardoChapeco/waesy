import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, FileSearch, Plane, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  applyReviewedTravelDocumentToTrip,
  applyTravelOcrToDraft,
  listTravelDocumentIngestions,
} from "@/services/travel-canonical-pipeline.functions";
import { listStoreTrips } from "@/services/travel-lifecycle.functions";
import {
  analyzeTravelDocumentConflicts,
  listTravelDocumentConflicts,
  resolveTravelDocumentConflict,
} from "@/services/travel-document-conflicts.functions";

export const Route = createFileRoute("/workspace/turismo/documentos-ocr")({
  head: () => ({ meta: [{ title: "Revisão OCR | Turismo | Waesy" }] }),
  component: TravelDocumentReviewPage,
});

function statusLabel(status: string) {
  return status === "needs_review" ? "Aguardando revisão" : status === "applied" ? "Aplicado" : status;
}

export default function TravelDocumentReviewPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("needs_review");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tripId, setTripId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  const documentsQuery = useQuery({
    queryKey: ["travel-document-ingestions", status],
    queryFn: () => listTravelDocumentIngestions({ data: { status } }),
  });
  const tripsQuery = useQuery({
    queryKey: ["travel-trips-for-document-review"],
    queryFn: () => listStoreTrips({ data: { status: "all" } }),
  });
  const conflictsQuery = useQuery({
    queryKey: ["travel-document-conflicts", tripId],
    queryFn: () => listTravelDocumentConflicts({ data: { tripId: tripId || null, status: "all" } }),
    enabled: Boolean(tripId),
  });

  const documents = documentsQuery.data || [];
  const selected = useMemo(
    () => documents.find((document: any) => document.id === selectedId) || documents[0],
    [documents, selectedId],
  );

  const applyDraftMutation = useMutation({
    mutationFn: () => applyTravelOcrToDraft({
      data: {
        ingestionId: selected.id,
        clientName: clientName || undefined,
        clientEmail: clientEmail || undefined,
        clientPhone: clientPhone || undefined,
      },
    }),
    onSuccess: (result) => {
      toast.success(`Draft criado com orçamento ${result.budget_id.slice(0, 8)}.`);
      queryClient.invalidateQueries({ queryKey: ["travel-document-ingestions"] });
    },
    onError: (error: any) => toast.error(error?.message || "Não foi possível criar o draft."),
  });

  const applyTripMutation = useMutation({
    mutationFn: () => applyReviewedTravelDocumentToTrip({ data: { ingestionId: selected.id, tripId } }),
    onSuccess: () => {
      toast.success("Confirmação aplicada à viagem, voucher e itens operacionais.");
      queryClient.invalidateQueries({ queryKey: ["travel-document-ingestions"] });
      queryClient.invalidateQueries({ queryKey: ["travel-trips-for-document-review"] });
    },
    onError: (error: any) => toast.error(error?.message || "Não foi possível aplicar o documento na viagem."),
  });

  const analyzeConflictsMutation = useMutation({
    mutationFn: () => analyzeTravelDocumentConflicts({
      data: { ingestionIds: documents.map((document: any) => document.id), tripId, operationKey: selected?.file_name || undefined },
    }),
    onSuccess: (result: { conflictCount: number }) => {
      toast.success(`${result.conflictCount} divergência(s) identificada(s).`);
      queryClient.invalidateQueries({ queryKey: ["travel-document-conflicts", tripId] });
    },
    onError: (error: any) => toast.error(error?.message || "Não foi possível analisar os conflitos."),
  });

  const resolveConflictMutation = useMutation({
    mutationFn: (input: { conflictId: string; sourceIngestionId: string }) => resolveTravelDocumentConflict({
      data: { conflictId: input.conflictId, resolutionType: "source", sourceIngestionId: input.sourceIngestionId, note: "Fonte escolhida na revisão documental." },
    }),
    onSuccess: () => {
      toast.success("Fonte vencedora registrada.");
      queryClient.invalidateQueries({ queryKey: ["travel-document-conflicts", tripId] });
    },
    onError: (error: any) => toast.error(error?.message || "Não foi possível resolver a divergência."),
  });

  const isPending = applyDraftMutation.isPending || applyTripMutation.isPending || analyzeConflictsMutation.isPending || resolveConflictMutation.isPending;
  const isQuote = selected?.source_kind === "operator_quote";

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Turismo · Governança documental</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">Revisão de ingestões OCR</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Nenhum documento da operadora vira reserva automaticamente. Revise a evidência, escolha o destino e aplique com trilha de auditoria.
          </p>
        </div>
        <Button variant="outline" className="focus-visible:ring-2 focus-visible:ring-ring" onClick={() => documentsQuery.refetch()} disabled={documentsQuery.isFetching}>
          <RefreshCw className={documentsQuery.isFetching ? "mr-2 size-4 animate-spin motion-reduce:animate-none" : "mr-2 size-4"} /> Atualizar fila
        </Button>
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <h2 className="font-bold">Fila de documentos</h2>
              <p className="text-xs text-muted-foreground">{documents.length} registro(s)</p>
            </div>
            <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="needs_review">Em revisão</SelectItem>
                <SelectItem value="applied">Aplicados</SelectItem>
                <SelectItem value="failed">Falhos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="max-h-160 divide-y overflow-y-auto">
            {documents.map((document: any) => (
              <button
                key={document.id}
                type="button"
                onClick={() => setSelectedId(document.id)}
                className={`w-full p-4 text-left transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring ${selected?.id === document.id ? "bg-primary/5 ring-1 ring-inset ring-primary/30" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileSearch className="size-4 shrink-0 text-primary" />
                    <span className="truncate text-sm font-semibold">{document.file_name || "Documento sem nome"}</span>
                  </div>
                  <Badge variant={document.extraction_status === "needs_review" ? "secondary" : "outline"} className="shrink-0 text-xs">
                    {statusLabel(document.extraction_status)}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{document.source_kind} · {new Date(document.created_at).toLocaleString("pt-BR")}</p>
                <p className="mt-1 truncate font-mono text-xs text-muted-foreground">SHA {document.content_sha256 || "não disponível"}</p>
              </button>
            ))}
            {documents.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">A fila está vazia.</div>}
          </div>
        </Card>

        <Card className="min-h-160 p-5 lg:col-span-2">
          {!selected ? (
            <div className="flex h-full min-h-128 flex-col items-center justify-center text-center text-muted-foreground">
              <FileSearch className="mb-3 size-10" />
              <p className="font-semibold">Selecione um documento para revisar</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
                <div>
                  <div className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /><h2 className="text-lg font-bold">{selected.file_name || "Documento OCR"}</h2></div>
                  <p className="mt-1 text-xs text-muted-foreground">Hash de conteúdo: {selected.content_sha256 || "não disponível"}</p>
                </div>
                <Badge className="bg-amber-500/10 text-amber-700 hover:bg-amber-500/10">Revisão humana obrigatória</Badge>
              </div>

              <div className="grid gap-5 xl:grid-cols-3">
                <div className="space-y-4">
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <div className="mb-3 flex items-center justify-between"><h3 className="font-bold">Extração estruturada</h3><span className="text-xs text-muted-foreground">somente leitura</span></div>
                    <pre className="max-h-128 overflow-auto whitespace-pre-wrap break-words text-xs leading-5">{JSON.stringify(selected.extraction || {}, null, 2)}</pre>
                  </div>
                    <div className="rounded-lg border border-border bg-muted/20 p-4 text-xs leading-5 text-foreground">
                    <strong>Regra de segurança:</strong> valores, localizadores, datas e nomes extraídos pela IA são evidência de trabalho. A aplicação somente grava dados operacionais depois desta ação explícita.
                  </div>
                </div>

                <div className="space-y-4">
                  {isQuote ? (
                    <div className="space-y-3 rounded-lg border p-4">
                      <div><h3 className="font-bold">Aplicar como orçamento/proposta</h3><p className="text-xs text-muted-foreground">Cria um draft no Studio, nunca uma reserva confirmada.</p></div>
                      <div><Label>Cliente</Label><Input value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="Nome completo" /></div>
                      <div><Label>E-mail</Label><Input value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} placeholder="cliente@email.com" /></div>
                      <div><Label>WhatsApp</Label><Input value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} placeholder="(49) 99999-9999" /></div>
                      <Button className="w-full" onClick={() => applyDraftMutation.mutate()} disabled={isPending}>
                        <CheckCircle2 className="mr-2 size-4" /> Aplicar OCR ao draft
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 rounded-lg border p-4">
                      <div><h3 className="font-bold">Aplicar confirmação na viagem</h3><p className="text-xs text-muted-foreground">Atualiza viagem, passageiros, localizadores, voucher e timeline.</p></div>
                      <div><Label>Viagem de destino</Label><Select value={tripId} onValueChange={setTripId}><SelectTrigger><SelectValue placeholder="Selecione a viagem" /></SelectTrigger><SelectContent>{(tripsQuery.data || []).map((trip: any) => <SelectItem key={trip.id} value={trip.id}>{trip.trip_number} · {trip.destination_city} · {trip.client_name}</SelectItem>)}</SelectContent></Select></div>
                      <Button variant="outline" className="w-full focus-visible:ring-2 focus-visible:ring-ring" onClick={() => analyzeConflictsMutation.mutate()} disabled={isPending || !tripId || documents.length < 2}><AlertTriangle className="mr-2 size-4" /> Analisar conflitos documentais</Button>
                      <Button className="w-full focus-visible:ring-2 focus-visible:ring-ring" onClick={() => applyTripMutation.mutate()} disabled={isPending || !tripId}><Plane className="mr-2 size-4" /> Aplicar na viagem selecionada</Button>
                      <p className="text-xs text-muted-foreground">A operação é idempotente por documento + viagem e gera evento de auditoria.</p>
                    </div>
                  )}
                  {tripId && (conflictsQuery.data || []).length > 0 && (
                    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
                      <div><h3 className="font-bold">Divergências detectadas</h3><p className="text-xs text-muted-foreground">Nenhum valor crítico é alterado sem decisão registrada.</p></div>
                      {(conflictsQuery.data || []).map((conflict: any) => (
                        <div key={conflict.id} className="space-y-2 rounded-lg border bg-background p-3">
                          <div className="flex items-center justify-between gap-2"><span className="font-mono text-xs">{conflict.field_path}</span><Badge variant="outline">{conflict.severity}</Badge></div>
                          <p className="text-xs text-muted-foreground">Fonte sugerida: {conflict.suggested_source_id || "revisão manual"}</p>
                            <div className="flex flex-wrap gap-2">{(conflict.candidates || []).map((candidate: any) => <Button key={`${conflict.id}-${candidate.sourceId}`} variant="outline" className="h-11 text-xs focus-visible:ring-2 focus-visible:ring-ring" disabled={conflict.status === "resolved" || resolveConflictMutation.isPending} onClick={() => resolveConflictMutation.mutate({ conflictId: conflict.id, sourceIngestionId: candidate.sourceId })}>Usar {candidate.sourceKind}</Button>)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="rounded-lg border p-4"><h3 className="mb-2 font-bold">Resultado esperado</h3><ul className="space-y-2 text-xs text-muted-foreground"><li>• Snapshot original preservado</li><li>• Documento marcado como aplicado</li><li>• Relação com lead/proposta/viagem atualizada</li><li>• Evento operacional gravado na timeline</li></ul></div>
                  {selected.extraction_status === "failed" && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-xs text-destructive"><XCircle className="mb-1 size-4" />{selected.error_message || "Falha sem detalhes"}</div>}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
