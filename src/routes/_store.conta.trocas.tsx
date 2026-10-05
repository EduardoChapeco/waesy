import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/state/states";
import { listCustomerRmas, requestCustomerRma } from "@/services/rma.functions";
import { listCustomerOrders } from "@/services/order.functions";
import { RefreshCw, Package, Truck, FileText, Plus, ArrowRight, CheckCircle2, Clock, AlertCircle, X, Loader2, HelpCircle, ShieldCheck, ShieldAlert, Camera, ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/datetime";
import { toast } from "sonner";
import { extractMediaFromClipboard } from "@/lib/clipboard-media";

export const Route = createFileRoute("/_store/conta/trocas")({
  head: () => ({ meta: [{ title: "Trocas | Waesy" }] }),
  loader: async () => {
    try {
      const [rmas, orders] = await Promise.all([
        listCustomerRmas().catch(() => []),
        listCustomerOrders().catch(() => []),
      ]);
      return {
        rmas: rmas || [],
        orders: orders || [],
      };
    } catch (err) {
      console.error("[loader:_store.conta.trocas] Unhandled error:", err);
      return { rmas: [], orders: [] };
    }
  },
  component: CustomerRmaPage,
});

const STATUS_LABELS: Record<string, string> = {
  pending: "Aguardando Análise",
  authorized: "Aguardando Envio",
  shipped_back: "Em Trânsito",
  received: "Recebido pela Loja",
  inspected: "Em Inspeção",
  resolved: "Resolvido",
  rejected: "Recusado",
};

const STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  authorized: "default",
  shipped_back: "outline",
  received: "default",
  inspected: "secondary",
  resolved: "default",
  rejected: "destructive",
};

const TYPE_LABELS: Record<string, string> = {
  return: "Devolução",
  exchange: "Troca",
  warranty: "Garantia",
};

function CustomerRmaPage() {
  const { rmas, orders } = Route.useLoaderData() as { rmas: any[]; orders: any[] };
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [rmaType, setRmaType] = useState<string>("return");
  const [reason, setReason] = useState<string>("Arrependimento de compra (Art. 49 CDC)");
  const [notes, setNotes] = useState<string>("");
  const [claimPhotoUrl, setClaimPhotoUrl] = useState<string>("");
  const [claimPhotoBase64, setClaimPhotoBase64] = useState<string>("");
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione apenas arquivos de imagem (PNG, JPG, WebP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result as string;
      setClaimPhotoBase64(base64);
      setPreviewPhoto(base64);
      setClaimPhotoUrl("");
      toast.success("Foto da avaria anexada com sucesso!");
    };
    reader.onerror = () => toast.error("Falha ao ler arquivo de imagem.");
  };

  const handleDropzonePaste = async (e: React.ClipboardEvent) => {
    const items = await extractMediaFromClipboard(e);
    if (items && items.length > 0) {
      e.preventDefault();
      const item = items[0];
      const reader = new FileReader();
      reader.readAsDataURL(item.file);
      reader.onload = () => {
        const base64 = reader.result as string;
        setClaimPhotoBase64(base64);
        setPreviewPhoto(base64);
        setClaimPhotoUrl("");
        toast.success("Foto colada da área de transferência (Ctrl+V)!");
      };
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        setClaimPhotoBase64(base64);
        setPreviewPhoto(base64);
        setClaimPhotoUrl("");
        toast.success("Foto da avaria anexada via arrastar e soltar!");
      };
    }
  };

  const handleUrlChange = (url: string) => {
    setClaimPhotoUrl(url);
    if (url.trim().startsWith("http")) {
      setPreviewPhoto(url.trim());
      setClaimPhotoBase64("");
    } else if (!url.trim() && !claimPhotoBase64) {
      setPreviewPhoto(null);
    }
  };

  const handleClearPhoto = () => {
    setPreviewPhoto(null);
    setClaimPhotoUrl("");
    setClaimPhotoBase64("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmitRma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) {
      toast.error("Selecione um pedido para solicitar a devolução ou troca.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Itens do pedido selecionado
      const items = (selectedOrder?.items || []).map((it: any) => ({
        order_item_id: it.id || it.product_id,
        qty: it.quantity || 1,
        reason: reason,
      }));

      // Se o pedido não tiver itens detalhados no schema simplificado, enviamos um item base
      const finalItems = items.length > 0 ? items : [
        {
          order_item_id: selectedOrderId,
          qty: 1,
          reason: reason,
        }
      ];

      await requestCustomerRma({
        data: {
          orderId: selectedOrderId,
          type: rmaType,
          items: finalItems,
          notes: notes.trim() || undefined,
          claimPhotoUrl: claimPhotoUrl.trim() || undefined,
          claimPhotoBase64: claimPhotoBase64 || undefined,
        },
      });

      toast.success("Solicitação de RMA aberta com sucesso! Acompanhe o status aqui.");
      setIsModalOpen(false);
      setSelectedOrderId("");
      setNotes("");
      handleClearPhoto();
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível abrir a solicitação de RMA.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-24 px-0 sm:px-4 md:px-0">
      {/* ── 1. Header Apple HIG Minimalista ── */}
      <NativeMobileHeader title="Trocas" fallbackHref="/conta" mobileOnly />
      <div className="hidden md:flex items-center justify-between gap-4 border-b border-border/40 pb-5 pt-2">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Trocas
            </h1>
            {rmas && rmas.length > 0 && (
              <Badge variant="secondary" className="text-xs font-mono font-bold px-3 py-1 rounded-full">
                {rmas.length}
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Acompanhe a logística reversa, estornos e solicitações de garantia dos seus pedidos.
          </p>
        </div>

        <Button
          size="default"
          onClick={() => setIsModalOpen(true)} /* focus-visible:ring-2 */
          className="rounded-lg h-11 px-5 text-sm font-semibold gap-2 bg-foreground text-background hover:bg-foreground/90 shrink-0 shadow-xs cursor-pointer"
        >
          <Plus className="size-4" />
          <span>Solicitar</span>
        </Button>
      </div>

      {/* ── 2. Lista de Solicitações no padrão Apple HIG Grouped Cards ── */}
      {rmas.length === 0 ? (
        <div className="rounded-lg border border-border/70 bg-card p-10 sm:p-14 text-center space-y-4 shadow-xs">
          <div className="size-14 rounded-lg bg-muted text-muted-foreground flex items-center justify-center mx-auto">
            <RefreshCw className="size-7" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-lg font-bold text-foreground">Nenhuma troca ativa</h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Você não possui nenhum processo de RMA ativo. Se você recebeu um produto e precisa trocar de tamanho, se arrependeu ou notou alguma avaria, solicite abaixo.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={() => setIsModalOpen(true)} /* focus-visible:ring-2 */
              className="h-11 rounded-lg px-6 text-sm font-semibold cursor-pointer"
            >
              <Plus className="size-4 mr-2" />
              Solicitar Troca
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-lg px-5 text-sm font-semibold cursor-pointer">
              <Link to="/conta/pedidos">Pedidos</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {rmas.map((rma: any) => (
            <div
              key={rma.id}
              className="bg-card rounded-lg border border-border/70 shadow-xs overflow-hidden transition-colors motion-reduce:transition-none hover:border-foreground/20"
            >
              {/* Header do Card Agrupado */}
              <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 bg-muted/30 border-b border-border/50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Package className="size-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground flex items-center gap-2">
                      <span>{TYPE_LABELS[rma.type] ?? "Devolução"}</span>
                      {rma.orderToken && (
                        <span className="font-mono text-xs text-muted-foreground">
                          #{rma.orderToken}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                      <Clock className="size-3" />
                      Solicitado em {formatDate(rma.requestedAt || rma.createdAt)}
                    </p>
                  </div>
                </div>

                <Badge
                  variant={STATUS_VARIANTS[rma.status] ?? "secondary"}
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                >
                  {STATUS_LABELS[rma.status] ?? rma.status}
                </Badge>
              </div>

              {/* Corpo do Card */}
              <div className="p-4 sm:p-5 space-y-4">
                {rma.notes && (
                  <div className="bg-muted/40 p-4 rounded-lg border border-border/40 space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Motivo / Observação do Cliente
                    </p>
                    <p className="text-xs sm:text-sm text-foreground leading-relaxed">
                      "{rma.notes}"
                    </p>
                  </div>
                )}

                {rma.claimPhotoUrl && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/50">
                    <img
                      src={rma.claimPhotoUrl}
                      alt="Foto da avaria anexada"
                      className="size-12 rounded-lg object-cover border border-border/70 shrink-0"
                    />
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-2">
                        <Camera className="size-4 text-muted-foreground" />
                        <span>Evidência Fotográfica Anexada</span>
                      </p>
                      {rma.forensicStatus === "verified" ? (
                        <Badge variant="default" className="text-xs font-semibold bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                          <ShieldCheck className="size-3 mr-1 text-emerald-600" />
                          Foto Autêntica Verificada
                        </Badge>
                      ) : rma.forensicStatus === "flagged" ? (
                        <Badge variant="destructive" className="text-xs font-semibold">
                          <ShieldAlert className="size-3 mr-1" />
                          Alerta: Imagem Sintética Suspeita
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs font-semibold">
                          <Clock className="size-3 mr-1" />
                          Em Auditoria Pericial
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {rma.orderTotal != null && (
                  <div className="flex items-baseline justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Valor em Análise:</span>
                    <span className="font-mono font-bold text-base text-foreground">
                      {formatMoney(rma.orderTotal)}
                    </span>
                  </div>
                )}

                {/* Bloco de Logística Reversa (se autorizado pela loja) */}
                {rma.trackingCode && (
                  <div className="p-4 rounded-lg bg-muted/20 border border-border/60 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
                        <Truck className="size-4 text-primary" />
                        <span>Código de Postagem Reversa ({rma.carrier || "Correios"})</span>
                      </div>
                      <Badge variant="outline" className="text-xs uppercase font-mono">
                        Válido por 7 dias
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Leve o produto devidamente embalado a uma agência e informe o código abaixo:
                    </p>

                    <div className="bg-background p-4 rounded-lg text-center border border-border/70 select-all font-mono text-base sm:text-lg font-bold tracking-widest text-primary">
                      {rma.trackingCode}
                    </div>

                    {rma.labelUrl && (
                      <Button
                        asChild
                        variant="outline"
                        className="w-full h-11 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        <a href={rma.labelUrl} target="_blank" rel="noopener noreferrer">
                          <FileText className="size-4 mr-2" />
                          Baixar Declaração de Conteúdo / Etiqueta
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 3. Apple HIG Modal: Abertura Direta de Solicitação de RMA ── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-lg p-0 overflow-hidden border border-border/80 shadow-xs">
          <DialogHeader className="p-5 pb-4 bg-muted/30 border-b border-border/50">
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <RefreshCw className="size-5 text-primary" />
              Solicitar Troca ou Devolução
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Conforme o Código de Defesa do Consumidor (Art. 49), você tem até 7 dias corridos após a entrega para solicitar arrependimento ou troca.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitRma} className="p-5 sm:p-6 space-y-4">
            {/* Seleção do Pedido */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                Selecione o Pedido *
              </label>
              {orders.length === 0 ? (
                <div className="p-4 bg-muted/40 rounded-lg text-xs text-muted-foreground border border-border/50">
                  Nenhum pedido elegível encontrado na sua conta.
                </div>
              ) : (
                <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                  <SelectTrigger className="h-11 rounded-lg bg-background border-border/70 text-sm">
                    <SelectValue placeholder="Escolha um pedido recente..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    {orders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        Pedido #{order.public_token || order.id.slice(0, 8)} — {formatMoney(order.total_cents || 0)} ({order.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Tipo de Solicitação */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                Tipo de Atendimento *
              </label>
              <Select value={rmaType} onValueChange={setRmaType}>
                <SelectTrigger className="h-11 rounded-lg bg-background border-border/70 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="return">Devolução e Estorno do Valor</SelectItem>
                  <SelectItem value="exchange">Troca por Outro Tamanho ou Item</SelectItem>
                  <SelectItem value="warranty">Garantia / Produto com Avaria</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Motivo Principal */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                Motivo Principal *
              </label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="h-11 rounded-lg bg-background border-border/70 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="Arrependimento de compra (Art. 49 CDC)">Arrependimento de compra (Art. 49 CDC)</SelectItem>
                  <SelectItem value="Produto com defeito ou avaria">Produto com defeito ou avaria</SelectItem>
                  <SelectItem value="Tamanho ou modelo incompatível">Tamanho ou modelo incompatível</SelectItem>
                  <SelectItem value="Recebi produto diferente do anunciado">Recebi produto diferente do anunciado</SelectItem>
                  <SelectItem value="Outro motivo">Outro motivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Observações / Detalhes Adicionais */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                Observações Adicionais (Opcional)
              </label>
              <Textarea
                placeholder="Descreva detalhadamente o estado do item ou motivo para agilizar o processo..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="rounded-lg bg-background border-border/70 text-xs sm:text-sm resize-none focus-visible:ring-primary/20"
              />
            </div>

            {/* Foto da Avaria / Produto com Upload Local e Suporte a Ctrl+V */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <Camera className="size-4 text-primary" />
                  <span>Foto da Avaria / Produto (Opcional, agiliza a análise)</span>
                </label>
                {previewPhoto && (
                  <button /* focus-visible:ring-2 */
                    type="button"
                    onClick={handleClearPhoto} /* focus-visible:ring-2 */
                    className="text-xs text-destructive hover:underline flex items-center gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/20 rounded"
                  >
                    <X className="size-3" />
                    <span>Remover foto</span>
                  </button>
                )}
              </div>

              {previewPhoto ? (
                <div className="relative rounded-lg border border-border/80 overflow-hidden bg-muted/20 p-3 flex items-center gap-3">
                  <img
                    src={previewPhoto}
                    alt="Pré-visualização da avaria"
                    className="size-16 rounded-lg object-cover border border-border/60 shrink-0"
                  />
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground truncate">Foto Anexada para Perícia</p>
                    <p className="text-xs text-muted-foreground leading-tight">
                      A imagem será submetida à auditoria forense digital da loja para validação do estorno.
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  onPaste={handleDropzonePaste}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  tabIndex={0}
                  className="rounded-lg border border-dashed border-border/80 bg-background/50 hover:bg-muted/20 p-4 text-center space-y-2 transition-colors focus-visible:ring-2 focus-visible:ring-primary/20 outline-none cursor-pointer"
                  onClick={() => fileInputRef.current?.click()} /* focus-visible:ring-2 */
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <Camera className="size-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-foreground">
                      Clique para selecionar ou arraste o arquivo aqui
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Suporta PNG, JPG, WebP ou cole com área de transferência (Ctrl+V)
                    </p>
                  </div>
                </div>
              )}

              {/* Opção alternativa de colar link direto de imagem */}
              <div className="pt-1">
                <Input
                  type="url"
                  placeholder="Ou cole a URL direta de uma foto (https://...)"
                  value={claimPhotoUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  className="h-10 rounded-lg bg-background border-border/70 text-xs focus-visible:ring-primary/20"
                />
              </div>
            </div>

            {/* Ações do Modal */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)} /* focus-visible:ring-2 */
                className="h-11 rounded-lg px-5 text-sm font-semibold cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || orders.length === 0}
                className="h-11 rounded-lg px-6 text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 shadow-xs cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none mr-2" />
                    Enviando...
                  </>
                ) : (
                  "Enviar Solicitação"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
