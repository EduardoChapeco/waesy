/**
 * workspace.financeiro.faturas.tsx — Gestão de Faturas da Loja com a Plataforma Waesy
 * Padrão BigTech Clean UI | Zero Mocks | Upload Real de Comprovantes Bancários & Pix
 */

import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Receipt,
  QrCode,
  UploadCloud,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Copy,
  ExternalLink,
  ShieldCheck,
  DollarSign,
  Building2,
  HelpCircle,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getStoreInvoicesList,
  submitStoreInvoicePaymentProof,
  getStoreInvoicePixDetails,
  type StoreInvoiceDTO,
} from "@/services/invoices.functions";
import { uploadMediaUniversal } from "@/services/storage.functions";

export const Route = createFileRoute("/workspace/financeiro/faturas")({
  head: () => ({
    meta: [{ title: "Faturas da Plataforma & Mensalidades | Workspace Waesy" }],
  }),
  loader: async (): Promise<StoreInvoiceDTO[]> => {
    try {
      const res = await getStoreInvoicesList();
      return Array.isArray(res) ? res : [];
    } catch (err) {
      console.error("[loader:workspace.financeiro.faturas] Erro ao carregar faturas:", err);
      return [];
    }
  },
  component: WorkspaceFaturasPage,
});

function WorkspaceFaturasPage() {
  const initialInvoices = (Route.useLoaderData?.() as StoreInvoiceDTO[]) || [];
  const router = useRouter();

  const [invoices, setInvoices] = useState<StoreInvoiceDTO[]>(initialInvoices);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Estado dos modais
  const [pixModalInvoice, setPixModalInvoice] = useState<StoreInvoiceDTO | null>(null);
  const [pixDetails, setPixDetails] = useState<any | null>(null);
  const [loadingPix, setLoadingPix] = useState(false);

  const [proofModalInvoice, setProofModalInvoice] = useState<StoreInvoiceDTO | null>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [proofNotes, setProofNotes] = useState("");
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);

  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  // KPIs
  const kpis = useMemo(() => {
    let pendingCount = 0;
    let pendingCents = 0;
    let overdueCount = 0;
    let paidCount = 0;

    invoices.forEach((inv) => {
      if (inv.status === "paid") {
        paidCount++;
      } else {
        pendingCount++;
        pendingCents += inv.total_payable_cents || inv.amount_cents;
        if (inv.is_overdue) {
          overdueCount++;
        }
      }
    });

    return {
      pendingCount,
      pendingCents,
      overdueCount,
      paidCount,
    };
  }, [invoices]);

  // Filtro
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        !searchTerm.trim() ||
        inv.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "pending" && inv.status === "pending" && !inv.is_overdue) ||
        (statusFilter === "overdue" && inv.is_overdue) ||
        (statusFilter === "paid" && inv.status === "paid");

      return matchSearch && matchStatus;
    });
  }, [invoices, searchTerm, statusFilter]);

  // Abrir PIX
  const handleOpenPix = async (inv: StoreInvoiceDTO) => {
    setPixModalInvoice(inv);
    setLoadingPix(true);
    try {
      const details = await getStoreInvoicePixDetails({ data: { invoiceId: inv.id } });
      setPixDetails(details);
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar cobrança PIX.");
    } finally {
      setLoadingPix(false);
    }
  };

  const handleCopyPix = () => {
    if (pixDetails?.pixCopyPaste) {
      navigator.clipboard.writeText(pixDetails.pixCopyPaste);
      toast.success("Código PIX Copia e Cola copiado para a área de transferência!");
    }
  };

  // Upload de arquivo de comprovante
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingProof(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const res = await uploadMediaUniversal({
            data: {
              fileName: file.name,
              fileType: file.type,
              base64Data,
              bucket: "order-receipts",
              folder: "store-invoices",
            },
          });
          setProofUrl(res.url);
          toast.success("Comprovante anexado! Clique em 'Confirmar Envio'.");
        } catch (err: any) {
          toast.error(err.message || "Erro ao fazer upload do arquivo.");
        } finally {
          setIsUploadingProof(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      toast.error("Falha ao ler arquivo local.");
      setIsUploadingProof(false);
    }
  };

  // Submissão do comprovante
  const handleSubmitProof = async () => {
    if (!proofModalInvoice) return;
    if (!proofUrl) {
      toast.error("Faça o upload do arquivo de comprovante antes de enviar.");
      return;
    }

    setIsSubmittingProof(true);
    try {
      const res = await submitStoreInvoicePaymentProof({
        data: {
          invoiceId: proofModalInvoice.id,
          receiptUrl: proofUrl,
          notes: proofNotes || undefined,
        },
      });

      toast.success(res.message);
      setProofModalInvoice(null);
      setProofUrl("");
      setProofNotes("");
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Erro ao registrar comprovante.");
    } finally {
      setIsSubmittingProof(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-4 space-y-6 pb-20">
      {/* ── 1. Cabeçalho Clean ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-muted text-foreground">
              <Receipt className="size-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Faturas da Plataforma & Planos
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Acompanhe suas mensalidades, faturas de serviços e envie comprovantes de pagamento bancário.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 font-mono text-xs gap-1.5 rounded-xl border-border/60">
            <ShieldCheck className="size-3.5 text-emerald-500" />
            <span>Ambiente Seguro Waesy</span>
          </Badge>
        </div>
      </div>

      {/* ── 2. Grid de KPIs (Paradigma Clean) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-border/60 bg-card shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block font-mono">
            Total em Aberto
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-foreground font-mono">
              {formatMoney(kpis.pendingCents)}
            </span>
            <Badge variant="secondary" className="font-mono text-xs rounded-lg">
              {kpis.pendingCount} fatura(s)
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground pt-1">
            Valores consolidados aguardando liquidação ou conferência.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-border/60 bg-card shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block font-mono">
            Faturas Atrasadas
          </span>
          <div className="flex items-baseline justify-between">
            <span className={`text-2xl font-black font-mono ${kpis.overdueCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>
              {kpis.overdueCount}
            </span>
            {kpis.overdueCount > 0 && (
              <Badge variant="destructive" className="font-mono text-xs rounded-lg">
                Mora 1% + Multa 2%
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground pt-1">
            {kpis.overdueCount > 0
              ? "Regularize para evitar suspensão de recursos da loja."
              : "Sua conta está em dia. Nenhuma fatura em atraso."}
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-border/60 bg-card shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block font-mono">
            Faturas Liquidadas
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {kpis.paidCount}
            </span>
            <Badge variant="outline" className="font-mono text-xs rounded-lg text-emerald-600 border-emerald-500/30">
              Histórico Ativo
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground pt-1">
            Faturas com pagamento conferido e baixado pela administração.
          </p>
        </div>
      </div>

      {/* ── 3. Barra de Filtro e Busca ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-muted/20 border border-border/60 rounded-2xl">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Buscar por descrição ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 text-xs rounded-xl bg-background"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {[
            { id: "all", label: "Todas" },
            { id: "pending", label: "Em Aberto" },
            { id: "overdue", label: "Atrasadas" },
            { id: "paid", label: "Pagas" },
          ].map((f) => (
            <Button
              key={f.id}
              variant={statusFilter === f.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter(f.id)}
              className="h-8 text-xs font-semibold rounded-xl"
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* ── 4. Tabela de Faturas ── */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-2xs">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="text-xs font-bold font-mono">Descrição & Referência</TableHead>
              <TableHead className="text-xs font-bold font-mono">Vencimento</TableHead>
              <TableHead className="text-xs font-bold font-mono">Valor Original</TableHead>
              <TableHead className="text-xs font-bold font-mono">Total a Pagar</TableHead>
              <TableHead className="text-xs font-bold font-mono">Status</TableHead>
              <TableHead className="text-xs font-bold font-mono">Comprovante</TableHead>
              <TableHead className="text-xs font-bold font-mono text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-44 text-center text-muted-foreground text-xs">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Receipt className="size-8 stroke-[1.5] text-muted-foreground/50" />
                    <p className="font-semibold text-foreground">Nenhuma fatura encontrada</p>
                    <p className="text-[11px]">As faturas emitidas pela administração aparecerão listadas aqui.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((inv) => {
                const isPaid = inv.status === "paid";
                return (
                  <TableRow key={inv.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="font-medium text-xs">
                      <div>
                        <span className="font-bold text-foreground block">{inv.description}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ID: {inv.id.slice(0, 8)} · Emissão: {formatDate(inv.created_at)}
                        </span>
                        {inv.notes && (
                          <span className="text-[10px] text-muted-foreground/80 block italic mt-0.5">
                            Nota: {inv.notes}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-xs font-mono">
                      {inv.due_date ? formatDate(inv.due_date) : "—"}
                    </TableCell>

                    <TableCell className="text-xs font-mono font-semibold">
                      {formatMoney(inv.amount_cents)}
                    </TableCell>

                    <TableCell className="text-xs font-mono font-bold">
                      <span className={inv.is_overdue ? "text-rose-600 dark:text-rose-400" : "text-foreground"}>
                        {formatMoney(inv.total_payable_cents || inv.amount_cents)}
                      </span>
                      {inv.is_overdue && (
                        <span className="text-[9px] text-rose-500 block font-mono">
                          +{formatMoney((inv.fine_cents || 0) + (inv.interest_cents || 0))} (mora)
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      {isPaid ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold rounded-md gap-1">
                          <CheckCircle2 className="size-3" />
                          Quitada
                        </Badge>
                      ) : inv.is_overdue ? (
                        <Badge variant="destructive" className="text-[10px] font-bold rounded-md gap-1">
                          <AlertTriangle className="size-3" />
                          Atrasada ({inv.days_overdue}d)
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] font-bold rounded-md gap-1">
                          <Clock className="size-3" />
                          Em Aberto
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      {inv.receipt_url ? (
                        <button
                          type="button"
                          onClick={() => setPreviewReceiptUrl(inv.receipt_url)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                        >
                          <FileText className="size-3" />
                          <span>Ver Anexo</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">Não anexado</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!isPaid && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenPix(inv)}
                              className="h-7 text-[11px] font-bold rounded-lg gap-1 border-primary/30 text-primary hover:bg-primary/10"
                            >
                              <QrCode className="size-3.5" />
                              <span>PIX</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => {
                                setProofModalInvoice(inv);
                                setProofUrl(inv.receipt_url || "");
                                setProofNotes("");
                              }}
                              className="h-7 text-[11px] font-bold rounded-lg gap-1"
                            >
                              <UploadCloud className="size-3.5" />
                              <span>Comprovante</span>
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── MODAL DE PAGAMENTO PIX ── */}
      <Dialog open={Boolean(pixModalInvoice)} onOpenChange={(open) => !open && setPixModalInvoice(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <QrCode className="size-5 text-primary" />
              <span>Pagamento via PIX</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Liquide sua fatura instantaneamente sem taxas adicionais.
            </DialogDescription>
          </DialogHeader>

          {loadingPix ? (
            <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">
              Gerando chave PIX oficial...
            </div>
          ) : pixDetails ? (
            <div className="space-y-4 py-2">
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fatura:</span>
                  <span className="font-bold text-foreground">{pixModalInvoice?.description}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor a Pagar:</span>
                  <span className="font-bold text-foreground font-mono text-sm">
                    {formatMoney(pixModalInvoice?.total_payable_cents || pixModalInvoice?.amount_cents || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Favorecido:</span>
                  <span className="font-medium text-foreground">{pixDetails.beneficiaryName}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Chave PIX Oficial (E-mail)</Label>
                <div className="flex gap-2">
                  <Input readOnly value={pixDetails.pixKey} className="h-9 font-mono text-xs bg-muted/20" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(pixDetails.pixKey);
                      toast.success("Chave PIX copiada!");
                    }}
                    className="h-9 rounded-xl font-bold"
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Código PIX Copia e Cola</Label>
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 text-[10px] font-mono break-all max-h-20 overflow-y-auto">
                  {pixDetails.pixCopyPaste}
                </div>
                <Button
                  onClick={handleCopyPix}
                  className="w-full rounded-xl font-bold h-10 text-xs bg-foreground text-background gap-1.5 mt-2"
                >
                  <Copy className="size-3.5" />
                  <span>Copiar Código PIX Copia e Cola</span>
                </Button>
              </div>

              <p className="text-[11px] text-muted-foreground text-center">
                Após efetuar a transferência no app do seu banco, anexe o comprovante na tabela para agilizar a conferência.
              </p>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPixModalInvoice(null)} className="w-full text-xs font-semibold rounded-xl">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL DE ENVIO DE COMPROVANTE BANCÁRIO ── */}
      <Dialog open={Boolean(proofModalInvoice)} onOpenChange={(open) => !open && setProofModalInvoice(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UploadCloud className="size-5 text-primary" />
              <span>Anexar Comprovante Bancário</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Envie o comprovante de transferência ou liquidação da fat "{proofModalInvoice?.description}".
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Arquivo do Comprovante (Imagem ou PDF)</Label>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileUpload}
                disabled={isUploadingProof}
                className="h-10 text-xs cursor-pointer rounded-xl file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground"
              />
              {isUploadingProof && (
                <span className="text-[11px] text-primary flex items-center gap-1.5 animate-pulse">
                  <UploadCloud className="size-3.5 animate-spin" />
                  Fazendo upload seguro para o storage...
                </span>
              )}
              {proofUrl && (
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
                  <span className="font-semibold flex items-center gap-1">
                    <CheckCircle2 className="size-3.5" />
                    Arquivo anexado com sucesso!
                  </span>
                  <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="underline font-bold text-[10px]">
                    Ver arquivo
                  </a>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Observações (Opcional)</Label>
              <Textarea
                placeholder="Ex: Transferido da conta PJ Santander em nome de..."
                value={proofNotes}
                onChange={(e) => setProofNotes(e.target.value)}
                className="text-xs rounded-xl h-20"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setProofModalInvoice(null)}
              className="text-xs font-semibold rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitProof}
              disabled={!proofUrl || isSubmittingProof}
              className="text-xs font-bold rounded-xl bg-foreground text-background"
            >
              {isSubmittingProof ? "Salvando..." : "Confirmar Envio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL DE PRÉ-VISUALIZAÇÃO DE COMPROVANTE ── */}
      <Dialog open={Boolean(previewReceiptUrl)} onOpenChange={(open) => !open && setPreviewReceiptUrl(null)}>
        <DialogContent className="sm:max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              <span>Visualização do Comprovante Bancário</span>
            </DialogTitle>
          </DialogHeader>

          {previewReceiptUrl && (
            <div className="py-2">
              {previewReceiptUrl.endsWith(".pdf") ? (
                <iframe
                  src={previewReceiptUrl}
                  title="Comprovante Bancário"
                  className="w-full h-96 rounded-xl border border-border/60"
                />
              ) : (
                <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-border/60 bg-muted/20 flex items-center justify-center p-2">
                  <img
                    src={previewReceiptUrl}
                    alt="Comprovante Bancário"
                    className="max-h-full max-w-full object-contain rounded-lg"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex justify-between sm:justify-between items-center">
            {previewReceiptUrl && (
              <Button asChild variant="outline" size="sm" className="text-xs font-semibold rounded-xl">
                <a href={previewReceiptUrl} target="_blank" rel="noopener noreferrer" className="gap-1.5">
                  <ExternalLink className="size-3.5" />
                  <span>Abrir Original</span>
                </a>
              </Button>
            )}
            <Button variant="default" size="sm" onClick={() => setPreviewReceiptUrl(null)} className="text-xs font-bold rounded-xl">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
