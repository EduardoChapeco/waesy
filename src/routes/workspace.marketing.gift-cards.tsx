import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/commerce/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CrudActionsMenu } from "@/components/ui/crud-actions-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyField } from "@/components/ui/currency-field";
import { SheetPage } from "@/components/ui/sheet-page";
import { EmptyState } from "@/components/state/states";
import { listGiftCards, createGiftCard, cancelGiftCard } from "@/services/giftcard.functions";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import { Search, Plus, Gift, CheckCircle, XCircle, Copy, ExternalLink, QrCode } from "lucide-react";

export const Route = createFileRoute("/workspace/marketing/gift-cards")({
  head: () => ({ meta: [{ title: "Vale-Presentes | Workspace Waesy" }] }),
  loader: async () => {
    try {
      return { giftCards: await listGiftCards() };
    } catch (err) {
      console.error("[loader:workspace.marketing.gift-cards] Unhandled loader error:", err);
      return { giftCards: null };
    }
  },
  component: GiftCardsDashboardPage,
});

function translateStatus(status: string) {
  if (status === "active") return "Ativo";
  if (status === "exhausted") return "Exaurido";
  if (status === "cancelled") return "Cancelado";
  return status;
}

function getStatusBadge(status: string): "success" | "secondary" | "destructive" {
  if (status === "active") return "success";
  if (status === "exhausted") return "secondary";
  if (status === "cancelled") return "destructive";
  return "secondary";
}

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
  const [balanceCents, setBalanceCents] = useState<number | undefined>(10000);
  const [email, setEmail] = useState("");

  const handleCreate = async () => {
    const valCents = balanceCents || 0;
    if (valCents < 100) {
      toast.error("O valor mínimo é R$ 1,00");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createGiftCard({
        data: {
          initialBalanceCents: valCents,
          recipientEmail: email || undefined,
        },
      });
      toast.success(`Vale-Presente gerado com sucesso! Código: ${res.code}`, { duration: 8000 });
      onCreated();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar vale-presente");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SheetPage
      open={isOpen}
      onOpenChange={(val) => !val && onClose()}
      title="Gerar Vale-Presente (Avulso)"
      description="Crie um cartão presente para campanhas promocionais, cortesias ou vendas corporativas."
      size="wide"
      footer={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="rounded-xl text-xs font-semibold">
            Cancelar
          </Button>
          <Button
            className="rounded-xl text-xs font-bold bg-primary text-primary-foreground"
            onClick={handleCreate}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Gerando..." : "Gerar e Ativar Código"}
          </Button>
        </div>
      }
    >
      <div className="py-2 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Valor do Cartão (R$)</Label>
          <CurrencyField
            value={balanceCents}
            onChange={setBalanceCents}
            placeholder="0,00"
            className="font-mono font-bold text-lg h-11 rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold">E-mail do Destinatário (Opcional)</Label>
          <Input
            type="email"
            placeholder="cliente@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 rounded-xl text-xs"
          />
          <p className="text-[11px] text-muted-foreground">
            Se preenchido, o código e link de resgate serão enviados automaticamente.
          </p>
        </div>
      </div>
    </SheetPage>
  );
}

function GiftCardsDashboardPage() {
  const loaderData = Route.useLoaderData();
  const giftCards = loaderData?.giftCards || [];
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const filteredCards = giftCards.filter((card: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return card.code?.toLowerCase().includes(q) || card.purchaserName?.toLowerCase().includes(q);
  });

  const handleCopyCode = (code: string) => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(code);
      toast.success(`Código ${code} copiado para a área de transferência!`);
    }
  };

  const handleCopyClaimLink = (code: string) => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/gift-card/${code}`;
      navigator.clipboard.writeText(url);
      toast.success("Link público de resgate copiado!");
    }
  };

  const handleCancel = async (id: string) => {
    setProcessingId(id);
    try {
      await cancelGiftCard({ data: { id } });
      toast.success("Vale-Presente cancelado com sucesso.");
      router.invalidate();
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || "Erro ao cancelar.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader title="Vales-Presente" />
        <Button onClick={() => setIsDrawerOpen(true)} className="rounded-xl font-bold text-xs gap-1.5 bg-primary text-primary-foreground h-10">
          <Plus className="h-4 w-4" /> Gerar Vale-Presente
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative flex-1 sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por código ou gerador..."
            className="pl-9 bg-card rounded-xl text-xs h-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {filteredCards.length === 0 ? (
        <EmptyState title="Nenhum Vale-Presente encontrado" />
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-2xs">
          <Table>
            <TableHeader>
              <TableRow className="border-border/40">
                <TableHead className="text-xs font-bold">Data</TableHead>
                <TableHead className="text-xs font-bold">Código do Cartão</TableHead>
                <TableHead className="text-xs font-bold">Gerado Por</TableHead>
                <TableHead className="text-xs font-bold">Valor Inicial</TableHead>
                <TableHead className="text-xs font-bold">Saldo Atual</TableHead>
                <TableHead className="text-xs font-bold">Status</TableHead>
                <TableHead className="text-right text-xs font-bold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCards.map((card: any) => (
                <TableRow key={card.id} className="border-border/40 hover:bg-muted/20">
                  <TableCell className="whitespace-nowrap text-xs font-medium text-muted-foreground">{formatDate(card.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className="font-mono text-xs font-bold tracking-widest bg-muted/40 border-border/60"
                      >
                        {card.code}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleCopyCode(card.code)}
                        className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
                        title="Copiar Código"
                      >
                        <Copy className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleCopyClaimLink(card.code)}
                        className="size-7 rounded-lg text-primary hover:bg-primary/10"
                        title="Copiar Link de Resgate"
                      >
                        <ExternalLink className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-medium text-foreground">{card.purchaserName}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {formatMoney(card.initialBalance)}
                  </TableCell>
                  <TableCell className="text-xs font-bold text-foreground font-mono">
                    {formatMoney(card.currentBalance)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadge(card.status)} className="text-[10px] font-bold uppercase">
                      {translateStatus(card.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {card.status === "active" ? (
                      <CrudActionsMenu
                        entityName="Vale-Presente"
                        onDelete={() => handleCancel(card.id)}
                        deleteConfirmTitle={`Cancelar Vale-Presente ${card.code}?`}
                        deleteConfirmDescription="Esta ação cancelará permanentemente o saldo restante do vale-presente e invalidará o código de resgate."
                        customActions={[
                          {
                            id: "copy-link",
                            label: "Copiar Link de Resgate",
                            icon: Copy,
                            onClick: () => handleCopyLink(card.code),
                          },
                        ]}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground italic">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <NewGiftCardDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onCreated={() => {
          router.invalidate();
        }}
      />
    </div>
  );
}
