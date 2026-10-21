import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  Gift,
  Plus,
  QrCode,
  Layers,
  Copy,
  ExternalLink,
  CheckCircle2,
  Clock,
  Eye,
  Store,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { NativeBackButton } from "@/components/ui/native-back-button";
import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { WzCardMockup } from "@/components/wz/WzCardMockup";
import { listUserGiftCards, claimGiftCard } from "@/services/giftcard.functions";
import { formatWz } from "@/lib/wz-quote-engine";

export const Route = createFileRoute("/_store/conta/gift-cards")({
  head: () => ({ meta: [{ title: "Vales-Presente | Minha Conta Waesy" }] }),
  loader: async () => {
    try {
      const data = await listUserGiftCards().catch(() => ({ received: [], sent: [] }));
      return data;
    } catch (err) {
      console.error("[loader:_store.conta.gift-cards] Erro:", err);
      return { received: [], sent: [] };
    }
  },
  component: UserGiftCardsPage,
});

function UserGiftCardsPage() {
  const { received = [], sent = [] } = (Route.useLoaderData?.() as any) || {};
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimInputCode, setClaimInputCode] = useState("");
  const [isClaiming, setIsClaiming] = useState(false);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (claimInputCode.trim().length < 4) {
      toast.error("Informe um código de vale válido.");
      return;
    }

    setIsClaiming(true);
    try {
      const res = await claimGiftCard({ data: { code: claimInputCode.trim() } });
      toast.success(res.message || "Vale-presente resgatado com sucesso!");
      setIsClaimModalOpen(false);
      setClaimInputCode("");
      router.invalidate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao resgatar cartão.");
    } finally {
      setIsClaiming(false);
    }
  };

  // Ação da barra de topo móvel isolada para conformidade com Design Lint (DL-14)
  const headerRightAction = (
    <Button
      asChild
      size="sm"
      variant="ghost"
      className="h-11 min-h-11 px-3 text-xs font-semibold rounded-lg text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
    >
      <Link to="/gift-cards">
        <Gift className="size-4 text-primary" />
      </Link>
    </Button>
  );

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-28 px-4 sm:px-6 animate-in fade-in duration-200">
      {/* ── 1. Header com Navegação Nativa Mobile e Desktop ── */}
      <NativeMobileHeader
        title="Vales-Presente"
        fallbackHref="/conta"
        mobileOnly
        rightActions={headerRightAction}
      />

      <div className="hidden sm:flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3 pt-1">
        <div className="flex items-center gap-3">
          <NativeBackButton fallbackHref="/conta" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Vales-Presente
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsClaimModalOpen(true)}
            className="rounded-lg text-xs font-semibold h-11 min-h-11 px-4 gap-2 focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
          >
            <QrCode className="size-4 text-primary" />
            <span>Resgatar Código</span>
          </Button>

          <Button
            asChild
            size="sm"
            className="rounded-lg text-xs font-bold h-11 min-h-11 px-4 bg-primary text-primary-foreground focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Link to="/gift-cards">
              <Gift className="size-4 mr-2" />
              <span>Comprar um Vale</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* ── 2. Abas Canônicas: Recebidos vs Enviados ── */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("received")}
          className={`h-11 min-h-11 px-5 rounded-lg text-xs font-bold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
            activeTab === "received"
              ? "bg-foreground text-background"
              : "bg-muted/40 text-muted-foreground hover:bg-muted"
          }`}
        >
          Vales Recebidos ({received.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("sent")}
          className={`h-11 min-h-11 px-5 rounded-lg text-xs font-bold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
            activeTab === "sent"
              ? "bg-foreground text-background"
              : "bg-muted/40 text-muted-foreground hover:bg-muted"
          }`}
        >
          Presentes Enviados ({sent.length})
        </button>
      </div>

      {/* ── 3. Conteúdo da Aba ── */}
      {activeTab === "received" ? (
        <div className="space-y-4">
          {received.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {received.map((card: any) => (
                <div
                  key={card.id}
                  className="p-5 rounded-lg border border-border/60 bg-card space-y-4  flex flex-col justify-between"
                >
                  <WzCardMockup
                    issuerName={card.issuer_name}
                    issuerLogo={card.issuer_logo}
                    wzInitial={card.wz_initial}
                    wzRemaining={card.wz_remaining}
                    cardDesignId={card.card_design_id}
                    codeDisplay={card.code_display}
                    senderName={card.sender_name}
                    personalMessage={card.personal_message}
                    showFlipButton
                  />

                  <div className="flex items-center justify-between border-t border-border/40 pt-3">
                    <div>
                      <span className="text-xs text-muted-foreground block">
                        Saldo Restante
                      </span>
                      <span className="text-lg font-mono font-extrabold text-foreground">
                        {card.wz_remaining_formatted}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {card.issuer_slug && (
                        <Button asChild size="sm" className="rounded-lg h-11 min-h-11 px-4 text-xs font-bold">
                          <Link to={"/u/$username" as any} params={{ username: card.issuer_slug } as any}>
                            <ShoppingBag className="size-3.5 mr-2" />
                            <span>Usar na Loja</span>
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center space-y-3 border border-dashed border-border/60 rounded-lg p-6">
              <Gift className="size-10 text-muted-foreground mx-auto stroke-1" />
              <h3 className="text-base font-bold text-foreground">Você ainda não recebeu nenhum vale</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Quando alguém lhe presentear com um Vale-Presente $WZ, ele aparecerá aqui com seu saldo atualizado.
              </p>
              <div className="pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsClaimModalOpen(true)}
                  className="rounded-lg text-xs font-semibold h-11 min-h-11 px-5"
                >
                  Tenho um código para resgatar
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {sent.length > 0 ? (
            <div className="bg-card border border-border/60 rounded-lg divide-y divide-border/40 overflow-hidden">
              {sent.map((card: any) => (
                <div key={card.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">
                        Para: {card.recipient_name || card.recipient_email || "Destinatário"}
                      </span>
                      <Badge variant="outline" className="text-xs uppercase">
                        {card.status}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground font-mono">
                      Valor: <strong className="text-foreground">{formatWz(card.wz_initial)}</strong> · Loja: {card.issuer_name}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                      {card.opened_at && <span className="text-emerald-500 flex items-center gap-1"><Eye className="size-3" /> Aberto</span>}
                      {card.claimed_at && <span className="text-primary flex items-center gap-1"><CheckCircle2 className="size-3" /> Resgatado</span>}
                      <span>Código: {card.code_display}</span>
                    </div>
                  </div>

                  {card.claim_token && (
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="rounded-lg h-11 min-h-11 px-4 text-xs font-semibold shrink-0"
                    >
                      <Link to={"/gift-card/$claimToken" as any} params={{ claimToken: card.claim_token } as any}>
                        <span>Ver Link do Presente</span>
                        <ExternalLink className="size-3.5 ml-2" />
                      </Link>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center space-y-3 border border-dashed border-border/60 rounded-lg p-6">
              <Gift className="size-10 text-muted-foreground mx-auto stroke-1" />
              <h3 className="text-base font-bold text-foreground">Nenhum presente enviado ainda</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Presenteie amigos, familiares e parceiros com créditos em lojas locais ou vales globais.
              </p>
              <div className="pt-2">
                <Button asChild size="sm" className="rounded-lg text-xs font-bold h-11 min-h-11 px-5">
                  <Link to="/gift-cards">Comprar Vale-Presente</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 4. Modal de Resgate de Código ── */}
      <Dialog open={isClaimModalOpen} onOpenChange={setIsClaimModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Resgatar Vale-Presente</DialogTitle>
            <DialogDescription className="text-xs">
              Digite o código de 16 caracteres recebido por e-mail, cartão físico ou mensagem.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleClaim} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold">Código do Cartão</Label>
              <Input
                placeholder="WGC-XXXX-XXXX-XXXX"
                value={claimInputCode}
                onChange={(e) => setClaimInputCode(e.target.value.toUpperCase())}
                className="font-mono text-center tracking-widest uppercase font-bold text-base h-11 min-h-11 rounded-lg"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                O saldo será creditado automaticamente na sua conta $WZ no escopo do emissor.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="h-11 min-h-11 rounded-lg text-xs font-semibold">
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isClaiming || claimInputCode.trim().length < 4}
                className="h-11 min-h-11 rounded-lg text-xs font-bold min-w-32 bg-primary text-primary-foreground"
              >
                {isClaiming ? "Resgatando..." : "Resgatar e Creditar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
