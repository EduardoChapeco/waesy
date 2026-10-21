import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/commerce/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SheetPage } from "@/components/ui/sheet-page";
import { EmptyState } from "@/components/state/states";
import {
  listMerchantGiftCards,
  createGiftCardOrder,
  confirmGiftCardPayment,
  cancelGiftCard,
  createMerchantGiftCardProduct,
} from "@/services/giftcard.functions";
import { formatWz, brlCentsToWz, wzToBrlCentsReference } from "@/lib/wz-quote-engine";
import { Search, Plus, Gift, CheckCircle, XCircle, Copy, ExternalLink, ShieldCheck, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/workspace/marketing/gift-cards")({
  head: () => ({ meta: [{ title: "Vale-Presentes | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const data = await listMerchantGiftCards();
      return { data };
    } catch (err) {
      console.error("[loader:workspace.marketing.gift-cards] Unhandled error:", err);
      return { data: { cards: [], stats: { totalSoldWz: 0, totalRedeemedWz: 0, activeCount: 0 } } };
    }
  },
  component: GiftCardsDashboardPage,
});

function NewGiftCardDrawer({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wzAmount, setWzAmount] = useState<number>(500000);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [fundingMode, setFundingMode] = useState<"PURCHASED" | "MERCHANT_FUNDED">("MERCHANT_FUNDED");

  const handleCreate = async () => {
    if (wzAmount < 10000) {
      toast.error("O valor mínimo é 10.000 $WZ");
      return;
    }
    if (!recipientName.trim()) {
      toast.error("Informe o nome do destinatário");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Criar ordem do vale
      const res = await createGiftCardOrder({
        data: {
          amountWz: wzAmount,
          recipientName: recipientName.trim(),
          recipientEmail: recipientEmail.trim() || undefined,
          senderName: "Administração da Loja",
          personalMessage: personalMessage.trim() || undefined,
          recipientBindingType: "BEARER",
          cardDesignId: "classic_gold",
        },
      });

      // 2. Se for cortesia da loja ou emissão direta aprovada, confirma ativação
      await confirmGiftCardPayment({
        data: {
          giftCardId: res.gift_card_id,
          paymentId: `admin_issuance_${Date.now()}`,
        },
      });

      toast.success(`Vale-Presente de ${formatWz(wzAmount)} ativado com sucesso!`, { duration: 6000 });
      onCreated();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Erro ao emitir vale-presente");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SheetPage
      open={isOpen}
      onOpenChange={(val) => !val && onClose()}
      title="Emitir Vale-Presente em $WZ"
      description="Crie um cartão presente para campanhas de fidelidade, incentivo ou cortesia comercial."
      size="wide"
      footer={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="rounded-lg text-xs font-semibold h-11 min-h-11 px-4 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
            Cancelar
          </Button>
          <Button
            className="rounded-lg text-xs font-bold bg-primary text-primary-foreground h-11 min-h-11 px-5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            onClick={handleCreate}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Emitindo no Ledger..." : "Emitir e Ativar Vale"}
          </Button>
        </div>
      }
    >
      <div className="py-2 space-y-4 text-xs">
        {/* Aviso de Isolamento Econômico Obrigatório */}
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="size-4 shrink-0 mt-1" />
          <p className="leading-tight">
            <strong>Invariante de Financiamento:</strong> Este vale é restrito a compras nesta loja. Vales de cortesia não geram recebíveis em dinheiro nem obrigações de repasse por parte da Waesy.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold">Valor do Vale ($WZ)</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[100000, 250000, 500000, 1000000].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setWzAmount(val)}
                className={`h-11 min-h-11 rounded-lg border text-xs font-mono font-bold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                  wzAmount === val ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted"
                }`}
              >
                {formatWz(val)}
              </button>
            ))}
          </div>
          <Input
            type="number"
            value={wzAmount}
            onChange={(e) => setWzAmount(Number(e.target.value))}
            min={10000}
            step={10000}
            className="h-11 font-mono font-bold text-sm rounded-lg"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold">Nome do Destinatário</Label>
          <Input
            placeholder="Nome do cliente ou parceiro"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            className="h-11 rounded-lg text-xs"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold">E-mail do Destinatário (Opcional)</Label>
          <Input
            type="email"
            placeholder="cliente@exemplo.com"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            className="h-11 rounded-lg text-xs"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold">Mensagem Afetuosa Personalizada</Label>
          <Input
            placeholder="Ex: Um presente especial para você aproveitar em nossa loja!"
            value={personalMessage}
            onChange={(e) => setPersonalMessage(e.target.value)}
            className="h-11 rounded-lg text-xs"
          />
        </div>
      </div>
    </SheetPage>
  );
}

function GiftCardsDashboardPage() {
  const loaderData = (Route.useLoaderData?.() as any) || {};
  const data = loaderData.data || { cards: [], stats: { totalSoldWz: 0, totalRedeemedWz: 0, activeCount: 0 } };
  const cards = data.cards || [];
  const stats = data.stats || {};
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterSource, setFilterSource] = useState<"ALL" | "PURCHASED" | "MERCHANT_FUNDED">("ALL");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const filteredCards = cards.filter((card: any) => {
    if (filterSource !== "ALL" && card.funding_source !== filterSource) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      card.code_display?.toLowerCase().includes(q) ||
      card.recipient_name?.toLowerCase().includes(q) ||
      card.purchaser_name?.toLowerCase().includes(q)
    );
  });

  const handleCopyClaimLink = (tokenOrId: string) => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/gift-card/${tokenOrId}`;
      navigator.clipboard.writeText(url);
      toast.success("Link público do presente copiado!");
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelGiftCard({ data: { id } });
      toast.success("Vale-presente cancelado.");
      router.invalidate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao cancelar.");
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 space-y-6 pb-24 animate-in fade-in duration-200">
      {/* ── 1. Top Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader title="Vales-Presente & Gifting $WZ" />
        <Button
          onClick={() => setIsDrawerOpen(true)}
          className="rounded-lg font-bold text-xs gap-2 bg-primary text-primary-foreground h-11 min-h-11 px-5"
        >
          <Plus className="h-4 w-4" /> Emitir Vale-Presente
        </Button>
      </div>

      {/* ── 2. Cards de Métricas e Passivo Circulante ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-lg border border-border/60 bg-card space-y-1">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Vales Vendidos (Comprados)
          </span>
          <span className="text-2xl font-black font-mono text-foreground block">
            {stats.totalSoldWz_formatted || formatWz(stats.totalSoldWz || 0)}
          </span>
          <span className="text-xs text-muted-foreground">
            Receita comercial retida pela empresa
          </span>
        </div>

        <div className="p-5 rounded-lg border border-border/60 bg-card space-y-1">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Vales Resgatados em Compras
          </span>
          <span className="text-2xl font-black font-mono text-emerald-500 block">
            {stats.totalRedeemedWz_formatted || formatWz(stats.totalRedeemedWz || 0)}
          </span>
          <span className="text-xs text-muted-foreground">
            Total convertido em vendas e serviços
          </span>
        </div>

        <div className="p-5 rounded-lg border border-border/60 bg-card space-y-1">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Vales Ativos em Circulação
          </span>
          <span className="text-2xl font-black font-mono text-foreground block">
            {stats.activeCount || 0}
          </span>
          <span className="text-xs text-muted-foreground">
            Aguardando utilização pelos clientes
          </span>
        </div>
      </div>

      {/* ── 3. Barra de Busca e Filtros de Fonte ── */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="relative flex-1 sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por código ou destinatário..."
            className="pl-9 bg-card rounded-lg text-xs h-11 min-h-11"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterSource("ALL")}
            className={`h-11 min-h-11 px-4 rounded-lg text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
              filterSource === "ALL" ? "bg-foreground text-background" : "bg-muted/50 text-muted-foreground"
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setFilterSource("PURCHASED")}
            className={`h-11 min-h-11 px-4 rounded-lg text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
              filterSource === "PURCHASED" ? "bg-foreground text-background" : "bg-muted/50 text-muted-foreground"
            }`}
          >
            Vendidos (Comprados)
          </button>
          <button
            type="button"
            onClick={() => setFilterSource("MERCHANT_FUNDED")}
            className={`h-11 min-h-11 px-4 rounded-lg text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
              filterSource === "MERCHANT_FUNDED" ? "bg-foreground text-background" : "bg-muted/50 text-muted-foreground"
            }`}
          >
            Cortesias da Loja
          </button>
        </div>
      </div>

      {/* ── 4. Tabela de Vales ── */}
      {filteredCards.length === 0 ? (
        <EmptyState title="Nenhum Vale-Presente encontrado" />
      ) : (
        <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Código</TableHead>
                <TableHead className="text-xs">Tipo / Financiamento</TableHead>
                <TableHead className="text-xs">Destinatário</TableHead>
                <TableHead className="text-xs">Valor $WZ</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Data</TableHead>
                <TableHead className="text-xs text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCards.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs font-bold text-foreground">
                    {c.code_display}
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge variant={c.funding_source === "PURCHASED" ? "default" : "outline"} className="text-xs">
                      {c.funding_source === "PURCHASED" ? "Vendido" : "Cortesia Loja"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-foreground font-medium">
                    {c.recipient_name}
                  </TableCell>
                  <TableCell className="text-xs font-mono font-bold text-foreground">
                    {c.wz_formatted}
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge variant={c.status === "active" || c.status === "delivered" ? "default" : "secondary"} className="text-xs uppercase">
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopyClaimLink(c.claim_token || c.id)}
                        className="h-11 min-h-11 px-3 text-xs focus-visible:ring-2 focus-visible:ring-primary"
                        title="Copiar Link"
                      >
                        <ExternalLink className="size-4" />
                      </Button>
                      {c.status === "active" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCancel(c.id)}
                          className="h-11 min-h-11 px-3 text-xs text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive"
                        >
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Drawer de Emissão */}
      <NewGiftCardDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onCreated={() => router.invalidate()}
      />
    </div>
  );
}
