import { useState, useTransition } from "react";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Utensils, Beer, Plus, Minus, CheckCircle2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { createSubpanelOrder } from "@/services/events.functions";

interface EventPublicConcessionsProps {
  eventId: string;
  concessions: any[];
  products: any[];
}

export function EventPublicConcessions({
  eventId,
  concessions = [],
  products = [],
}: EventPublicConcessionsProps) {
  const [selectedSubpanel, setSelectedSubpanel] = useState<any | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);
  const [isPending, startTransition] = useTransition();

  if (concessions.length === 0 && products.length === 0) {
    return null;
  }

  const subpanelProducts = selectedSubpanel
    ? products.filter((p) => p.subpanel_id === selectedSubpanel.id)
    : [];

  const handleOpenSubpanelMenu = (subpanel: any) => {
    setSelectedSubpanel(subpanel);
    setCart({});
    setCompletedOrder(null);
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setCart((prev) => {
      const current = prev[productId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  const cartItems = Object.entries(cart).map(([productId, qty]) => {
    const p = subpanelProducts.find((item) => item.id === productId);
    return {
      product: p,
      quantity: qty,
      unitPriceCents: p?.price_cents || 0,
    };
  }).filter((item) => item.product != null);

  const totalCents = cartItems.reduce(
    (acc, i) => acc + i.quantity * i.unitPriceCents,
    0
  );

  const handleFinishMobileOrder = () => {
    if (cartItems.length === 0) {
      toast.error("Adicione itens à comanda.");
      return;
    }
    if (!customerName.trim()) {
      toast.error("Informe seu nome para retirada no balcão.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await createSubpanelOrder({
          data: {
            subpanelId: selectedSubpanel.id,
            orderType: "mobile_attendee",
            paymentMethod: "pix",
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim() || undefined,
            items: cartItems.map((i) => ({
              productId: i.product.id,
              productName: i.product.nome,
              quantity: i.quantity,
              unitPriceCents: i.unitPriceCents,
            })),
          },
        });

        setCompletedOrder(res.order);
        setCart({});
        toast.success(`Pedido #${res.order.order_number} enviado com sucesso!`);
      } catch (err: any) {
        toast.error("Erro ao enviar pedido: " + (err?.message || "Tente novamente"));
      }
    });
  };

  return (
    <div className="pt-4 border-t border-border/40 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Utensils className="size-4 text-primary" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Praça de Alimentação & Bares
          </h2>
        </div>
        <Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-600 bg-emerald-500/10">
          Atendimento no Evento
        </Badge>
      </div>

      {/* Cards dos Parceiros / Pontos de Venda */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {concessions.map((sp) => {
          const itemsCount = products.filter((p) => p.subpanel_id === sp.id).length;
          const isBar = sp.panel_type === "bar";

          return (
            <div
              key={sp.id}
              className="p-4 rounded-lg border border-border/70 bg-card hover:border-primary/50 transition-colors flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="size-11 min-h-11 min-w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      {isBar ? <Beer className="size-5" /> : <Utensils className="size-5" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground break-words">{sp.name}</h4>
                      <span className="text-xs text-muted-foreground">
                        {isBar ? "Chopp & Bebidas" : "Alimentação & Lanches"}
                      </span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {itemsCount} {itemsCount === 1 ? "item" : "itens"}
                  </Badge>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenSubpanelMenu(sp)}
                className="w-full h-11 min-h-11 rounded-lg text-xs font-bold gap-2 focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
              >
                <Smartphone className="size-4 text-primary" />
                <span>Ver Cardápio & Pedir</span>
              </Button>
            </div>
          );
        })}
      </div>

      {/* Modal / Dialog do Cardápio para Pedido Mobile */}
      {selectedSubpanel && (
        <Dialog open={Boolean(selectedSubpanel)} onOpenChange={() => setSelectedSubpanel(null)}>
          <DialogContent className="sm:max-w-md p-6 max-h-full overflow-y-auto rounded-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Utensils className="size-4 text-primary" />
                {selectedSubpanel.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Faça seu pedido online para retirada expressa no balcão sem enfrentar filas.
              </DialogDescription>
            </DialogHeader>

            {completedOrder ? (
              <div className="py-6 text-center space-y-4">
                <div className="size-14 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="size-8" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground block uppercase font-mono">Número do Pedido</span>
                  <span className="text-2xl font-black font-mono text-foreground tracking-wider">
                    {completedOrder.order_number}
                  </span>
                  <p className="text-xs text-muted-foreground mt-2">
                    Apresente este código no balcão de <strong>{selectedSubpanel.name}</strong> para efetuar o pagamento via Pix e retirar seu pedido.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border/60 bg-muted/20 text-xs text-left space-y-1">
                  <span className="font-bold text-foreground">Itens do Pedido:</span>
                  {completedOrder.items?.map((i: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-muted-foreground">
                      <span>{i.quantity}x {i.product_name}</span>
                      <span className="font-mono">{formatMoney(i.total_price_cents)}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-border/40 flex justify-between font-bold text-foreground">
                    <span>Total:</span>
                    <span className="font-mono">{formatMoney(completedOrder.total_cents)}</span>
                  </div>
                </div>
                <Button
                  onClick={() => setSelectedSubpanel(null)}
                  className="w-full h-11 min-h-11 rounded-lg font-bold text-xs focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Concluir
                </Button>
              </div>
            ) : (
              <div className="space-y-4 mt-2">
                <div className="divide-y divide-border/40 max-h-60 overflow-y-auto pr-1">
                  {subpanelProducts.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-6 text-center">
                      Nenhum produto cadastrado no momento para este ponto.
                    </p>
                  ) : (
                    subpanelProducts.map((p) => {
                      const qty = cart[p.id] || 0;
                      return (
                        <div key={p.id} className="py-3 flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-foreground block truncate">{p.nome}</span>
                            {p.descricao && (
                              <span className="text-xs text-muted-foreground block line-clamp-1">{p.descricao}</span>
                            )}
                            <span className="text-xs font-mono font-bold text-primary">
                              {formatMoney(p.price_cents)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {qty > 0 && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQty(p.id, -1)}
                                  className="size-11 min-h-11 min-w-11 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                                  aria-label={`Diminuir ${p.nome}`}
                                >
                                  <Minus className="size-4" />
                                </button>
                                <span className="text-xs font-bold font-mono w-4 text-center">{qty}</span>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(p.id, 1)}
                              className="size-11 min-h-11 min-w-11 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary"
                              aria-label={`Adicionar ${p.nome}`}
                            >
                              <Plus className="size-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {cartItems.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-border/50">
                    <div className="space-y-2">
                      <Input
                        required
                        placeholder="Seu Nome Completo (para retirada) *"
                        className="h-11 min-h-11 rounded-lg text-xs"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                      <Input
                        placeholder="Seu WhatsApp (Opcional)"
                        className="h-11 min-h-11 rounded-lg text-xs"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-semibold text-muted-foreground">Total da Comanda:</span>
                      <span className="text-base font-black font-mono text-foreground">
                        {formatMoney(totalCents)}
                      </span>
                    </div>

                    <Button
                      onClick={handleFinishMobileOrder}
                      disabled={isPending}
                      className="w-full h-11 min-h-11 rounded-lg text-xs font-bold focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                    >
                      <CheckCircle2 className="size-4 mr-2" />
                      <span>{isPending ? "Enviando Pedido..." : "Confirmar Pedido no Balcão"}</span>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
