import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Gift,
  QrCode,
  Copy,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { NativeBackButton } from "@/components/ui/native-back-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { WzCardMockup, type CardThemeId } from "@/components/wz/WzCardMockup";
import {
  createGiftCardOrder,
  confirmGiftCardPayment,
  listGiftCardProducts,
} from "@/services/giftcard.functions";
import { formatWz, wzToBrlCentsReference } from "@/lib/wz-quote-engine";

export const Route = createFileRoute("/_store/gift-cards/")({
  head: () => ({
    meta: [
      { title: "Vales-Presente $WZ | Loja Oficial Waesy" },
      { name: "description", content: "Presenteie com créditos $WZ válidos em milhares de estabelecimentos e produtos." },
    ],
  }),
  loader: async () => {
    try {
      const res = await listGiftCardProducts({ data: {} }).catch(() => []);
      const products = Array.isArray(res) ? res : (res as any)?.products || [];
      return { products };
    } catch {
      return { products: [] };
    }
  },
  component: GiftCardPurchaseStudioPage,
});

const PRESET_AMOUNTS = [
  { wz: 100000, label: "100.000 $WZ", brl: "R$ 7,00" },
  { wz: 250000, label: "250.000 $WZ", brl: "R$ 17,50" },
  { wz: 500000, label: "500.000 $WZ", brl: "R$ 35,00" },
  { wz: 1000000, label: "1.000.000 $WZ", brl: "R$ 70,00" },
  { wz: 2000000, label: "2.000.000 $WZ", brl: "R$ 140,00" },
];

const THEME_OPTIONS: Array<{ id: CardThemeId; label: string }> = [
  { id: "classic_gold", label: "Classic Gold" },
  { id: "aniversario", label: "Aniversário" },
  { id: "natal", label: "Festas" },
  { id: "minimal_dark", label: "Dark Titanium" },
  { id: "neon_pulse", label: "Neon Pulse" },
];

function GiftCardPurchaseStudioPage() {
  const navigate = useNavigate();

  // Form State
  const [selectedWz, setSelectedWz] = useState<number>(500000);
  const [customWz, setCustomWz] = useState<string>("");
  const [isCustomAmount, setIsCustomAmount] = useState<boolean>(false);
  const [selectedTheme, setSelectedTheme] = useState<CardThemeId>("classic_gold");

  // Scope: Global Waesy vs Merchant
  const [scopeType] = useState<"GLOBAL" | "MERCHANT">("GLOBAL");

  // Recipient info
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [senderName, setSenderName] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [mediaUrl] = useState("");

  // Security options
  const [lockByCpf, setLockByCpf] = useState(false);
  const [recipientCpf, setRecipientCpf] = useState("");
  const [scheduleDelivery, setScheduleDelivery] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");

  // Order & Payment state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderCreated, setOrderCreated] = useState<{
    giftCardId: string;
    claimToken: string;
    amountWz: number;
    priceCents: number;
    priceFormatted: string;
  } | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);

  const activeAmountWz = isCustomAmount ? Math.max(10000, Number(customWz) || 10000) : selectedWz;
  const activeBrlCents = wzToBrlCentsReference(activeAmountWz);
  const activeBrlFormatted = (activeBrlCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const handleSelectPreset = (wz: number) => {
    setIsCustomAmount(false);
    setSelectedWz(wz);
  };

  const handleToggleCustom = () => {
    setIsCustomAmount(true);
    if (!customWz) setCustomWz(String(selectedWz));
  };

  const handleCreateOrder = async () => {
    if (!recipientName.trim()) {
      toast.error("Informe o nome do destinatário");
      return;
    }
    if (lockByCpf && !recipientCpf.trim()) {
      toast.error("Informe o CPF do destinatário para vincular o resgate");
      return;
    }
    if (activeAmountWz < 10000) {
      toast.error("O valor mínimo do vale é 10.000 $WZ");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createGiftCardOrder({
        data: {
          amountWz: activeAmountWz,
          cardDesignId: selectedTheme,
          recipientName: recipientName.trim(),
          recipientEmail: recipientEmail.trim() || undefined,
          recipientPhone: recipientPhone.trim() || undefined,
          senderName: senderName.trim() || "Amigo Secreto",
          personalMessage: personalMessage.trim() || undefined,
          recipientBindingType: lockByCpf ? "VERIFIED_CPF" : "BEARER",
          recipientCpf: lockByCpf ? recipientCpf.trim() : undefined,
          scheduledDeliveryAt: scheduleDelivery && scheduledDate ? new Date(scheduledDate).toISOString() : undefined,
          mediaUrl: mediaUrl.trim() || undefined,
          mediaType: mediaUrl.trim() ? "IMAGE" : undefined,
        },
      });

      setOrderCreated({
        giftCardId: res.gift_card_id,
        claimToken: res.claim_token,
        amountWz: res.amount_wz,
        priceCents: res.price_cents,
        priceFormatted: res.price_formatted,
      });
      setIsPaymentModalOpen(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar vale-presente");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmInstantPayment = async () => {
    if (!orderCreated) return;
    setIsSimulatingPayment(true);
    try {
      await confirmGiftCardPayment({
        data: {
          giftCardId: orderCreated.giftCardId,
          paymentId: `instant_pix_${Date.now()}`,
        },
      });
      toast.success("Pagamento confirmado! O Vale-Presente foi emitido e ativado no Ledger.");
      setIsPaymentModalOpen(false);
      navigate({
        to: "/gift-card/$claimToken" as any,
        params: { claimToken: orderCreated.claimToken } as any,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao confirmar pagamento.");
    } finally {
      setIsSimulatingPayment(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background text-foreground w-full max-w-5xl mx-auto space-y-6 pb-28 px-4 sm:px-6 animate-in fade-in duration-200">
      {/* ── 1. Top Header ── */}
      <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-3 pt-2">
        <div className="flex items-center gap-3">
          <NativeBackButton fallbackHref="/conta/gift-cards" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Estúdio de Vales-Presente $WZ
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-lg text-xs font-semibold h-11 min-h-11 px-4 gap-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <Link to="/conta/gift-cards">
              <Gift className="size-4 text-primary" />
              <span>Meus Vales</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* ── 2. Grid Bifurcada: Visualização 3D vs Painel de Configuração ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA: Live Preview do Cartão 3D */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
          <div className="p-4 rounded-lg border border-border/60 bg-card space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Pré-Visualização em Tempo Real
              </span>
              <Badge variant="outline" className="text-xs font-mono">
                {formatWz(activeAmountWz)}
              </Badge>
            </div>

            {/* Componente 3D com Giro e Flip */}
            <div className="py-2">
              <WzCardMockup
                issuerName={scopeType === "GLOBAL" ? "Waesy Global" : "Empresa Parceira"}
                wzInitial={activeAmountWz}
                wzRemaining={activeAmountWz}
                recipientName={recipientName.trim() || "Nome do Destinatário"}
                senderName={senderName.trim() || "Seu Nome"}
                personalMessage={personalMessage.trim() || "Mensagem afetuosa de presente"}
                cardDesignId={selectedTheme}
                scopeType={scopeType}
                showFlipButton
              />
            </div>

            <div className="p-4 rounded-lg bg-muted/30 border border-border/40 text-xs text-muted-foreground space-y-1">
              <div className="flex items-center justify-between font-medium">
                <span>Valor facial do vale:</span>
                <span className="font-mono font-bold text-foreground">{formatWz(activeAmountWz)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Referência oficial em moeda:</span>
                <span className="font-mono font-bold text-foreground">{activeBrlFormatted}</span>
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: Formulário e Configuração */}
        <div className="lg:col-span-7 space-y-6">
          {/* Seção 1: Valor em $WZ */}
          <div className="p-4 rounded-lg border border-border/60 bg-card space-y-4">
            <h2 className="text-sm font-bold text-foreground tracking-tight">
              1. Escolha o valor do presente
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESET_AMOUNTS.map((item) => (
                <button
                  key={item.wz}
                  type="button"
                  onClick={() => handleSelectPreset(item.wz)}
                  className={`h-14 min-h-14 rounded-lg border p-2 flex flex-col justify-center items-center transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                    !isCustomAmount && selectedWz === item.wz
                      ? "bg-primary text-primary-foreground border-primary font-bold"
                      : "bg-muted/30 border-border hover:bg-muted/60 text-foreground"
                  }`}
                >
                  <span className="text-xs font-mono font-extrabold">{item.label}</span>
                  <span className="text-xs opacity-80">{item.brl}</span>
                </button>
              ))}

              <button
                type="button"
                onClick={handleToggleCustom}
                className={`h-14 min-h-14 rounded-lg border p-2 flex flex-col justify-center items-center transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                  isCustomAmount
                    ? "bg-primary text-primary-foreground border-primary font-bold"
                    : "bg-muted/30 border-border hover:bg-muted/60 text-foreground"
                }`}
              >
                <span className="text-xs font-bold">Outro Valor</span>
                <span className="text-xs opacity-80">Personalizado</span>
              </button>
            </div>

            {isCustomAmount && (
              <div className="pt-2 space-y-2">
                <Label className="text-xs font-bold">Quantidade personalizada em $WZ</Label>
                <Input
                  type="number"
                  min={10000}
                  step={10000}
                  value={customWz}
                  onChange={(e) => setCustomWz(e.target.value)}
                  placeholder="Ex: 750000"
                  className="h-11 font-mono font-bold text-sm rounded-lg"
                />
                <span className="text-xs text-muted-foreground block">
                  Valor mínimo: 10.000 $WZ (Equivalente a R$ 0,70).
                </span>
              </div>
            )}
          </div>

          {/* Seção 2: Tema Visual */}
          <div className="p-4 rounded-lg border border-border/60 bg-card space-y-4">
            <h2 className="text-sm font-bold text-foreground tracking-tight">
              2. Escolha o tema visual do cartão
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {THEME_OPTIONS.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setSelectedTheme(theme.id)}
                  className={`h-11 min-h-11 rounded-lg border text-xs font-bold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                    selectedTheme === theme.id
                      ? "bg-foreground text-background border-foreground"
                      : "bg-muted/30 border-border hover:bg-muted/60 text-foreground"
                  }`}
                >
                  {theme.label}
                </button>
              ))}
            </div>
          </div>

          {/* Seção 3: Destinatário e Mensagem Afetuosa */}
          <div className="p-4 rounded-lg border border-border/60 bg-card space-y-4">
            <h2 className="text-sm font-bold text-foreground tracking-tight">
              3. Dados do destinatário e mensagem
            </h2>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs font-bold">Nome de quem vai receber</Label>
                <Input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Ex: Maria Silva"
                  className="h-11 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">E-mail (opcional)</Label>
                  <Input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="destinatario@email.com"
                    className="h-11 rounded-lg text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold">WhatsApp / Telefone (opcional)</Label>
                  <Input
                    type="tel"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="h-11 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Seu Nome (Remetente)</Label>
                <Input
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Ex: Eduardo"
                  className="h-11 rounded-lg text-xs"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold">Mensagem afetuosa</Label>
                  <span className="text-xs text-muted-foreground">{personalMessage.length}/300</span>
                </div>
                <Textarea
                  value={personalMessage}
                  onChange={(e) => setPersonalMessage(e.target.value.slice(0, 300))}
                  placeholder="Escreva uma mensagem especial para quem vai receber o presente..."
                  rows={3}
                  className="rounded-lg text-xs resize-none"
                />
              </div>
            </div>
          </div>

          {/* Seção 4: Segurança e Agendamento */}
          <div className="p-4 rounded-lg border border-border/60 bg-card space-y-4">
            <h2 className="text-sm font-bold text-foreground tracking-tight">
              4. Opções avançadas de entrega e segurança
            </h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/40">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-foreground">Trava de Segurança por CPF</p>
                  <p className="text-xs text-muted-foreground">
                    Exige confirmação de CPF verificado para resgatar os créditos no saldo.
                  </p>
                </div>
                <Switch checked={lockByCpf} onCheckedChange={setLockByCpf} />
              </div>

              {lockByCpf && (
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-2 animate-in fade-in duration-150">
                  <Label className="text-xs font-bold">CPF Obrigatório do Destinatário</Label>
                  <Input
                    value={recipientCpf}
                    onChange={(e) => setRecipientCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="h-11 rounded-lg text-xs font-mono"
                  />
                </div>
              )}

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/40">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-foreground">Agendar Envio</p>
                  <p className="text-xs text-muted-foreground">
                    Liberar o presente exatamente na data de aniversário ou comemoração.
                  </p>
                </div>
                <Switch checked={scheduleDelivery} onCheckedChange={setScheduleDelivery} />
              </div>

              {scheduleDelivery && (
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-2 animate-in fade-in duration-150">
                  <Label className="text-xs font-bold">Data de Envio Programado</Label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="h-11 rounded-lg text-xs"
                  />
                </div>
              )}
            </div>
          </div>

          {/* CTA de Compra */}
          <div className="pt-2">
            <Button
              size="lg"
              onClick={handleCreateOrder}
              disabled={isSubmitting}
              className="w-full h-14 min-h-14 rounded-lg font-bold text-base bg-primary text-primary-foreground transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="size-5 animate-spin motion-reduce:animate-none" />
                  <span>Gerando Pedido do Vale...</span>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full px-2">
                  <span>Comprar Vale-Presente</span>
                  <span className="font-mono font-extrabold">{activeBrlFormatted}</span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Modal de Pagamento Instantâneo Pix / Conclusão ── */}
      {orderCreated && (
        <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
          <DialogContent className="max-w-md rounded-lg p-6 space-y-4">
            <DialogHeader className="text-left space-y-1">
              <DialogTitle className="text-lg font-bold text-foreground">
                Pagamento do Vale-Presente
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Conclua o pagamento de {orderCreated.priceFormatted} para emitir o vale de {formatWz(orderCreated.amountWz)}.
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 rounded-lg bg-muted/30 border border-border/60 text-center space-y-3">
              <div className="size-16 rounded-lg bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <QrCode className="size-8" />
              </div>
              <div>
                <span className="text-xs font-bold text-foreground block">Pix Instantâneo</span>
                <span className="text-xs text-muted-foreground font-mono">
                  Chave segura atrelada ao pedido
                </span>
              </div>
              <div className="p-3 rounded-lg bg-background border border-border/40 font-mono text-xs text-foreground select-all break-all">
                00020126360014BR.GOV.BCB.PIX0114+551199999999520400005303986540{orderCreated.priceCents}5802BR
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                className="h-11 min-h-11 rounded-lg text-xs font-semibold w-full sm:w-auto focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                onClick={() => {
                  navigator.clipboard.writeText(`00020126360014BR.GOV.BCB.PIX...`);
                  toast.success("Código Pix copiado!");
                }}
              >
                <Copy className="size-4 mr-2" />
                Copiar Chave Pix
              </Button>

              <Button
                className="h-11 min-h-11 rounded-lg text-xs font-bold bg-primary text-primary-foreground w-full sm:w-auto focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                disabled={isSimulatingPayment}
                onClick={handleConfirmInstantPayment}
              >
                {isSimulatingPayment ? (
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <span>Simular Pagamento Aprovado</span>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
