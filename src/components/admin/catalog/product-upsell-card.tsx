import React, { useState, useEffect } from "react";
import { Zap, Plus, Trash2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/formatters";
import {
  listUpsellRules,
  createUpsellRule,
  updateUpsellRule,
  deleteUpsellRule,
} from "@/services/upsell.functions";
import { listAdminProducts } from "@/services/admin-catalog.functions";

interface ProductUpsellCardProps {
  productId: string;
  productTitle: string;
}

export function ProductUpsellCard({ productId, productTitle }: ProductUpsellCardProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [currentRule, setCurrentRule] = useState<any | null>(null);

  // Form states
  const [isEnabled, setIsEnabled] = useState(false);
  const [selectedOfferProductId, setSelectedOfferProductId] = useState<string>("");
  const [discountPercentage, setDiscountPercentage] = useState<number>(15);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setErrorMsg(null);

        const [rulesRes, productsRes] = await Promise.all([
          listUpsellRules().catch(() => []),
          listAdminProducts().catch(() => []),
        ]);

        if (!isMounted) return;

        // Filtra os produtos da loja excluindo o produto atual
        const filteredProducts = (productsRes || []).filter(
          (p: any) => p.id !== productId
        );
        setAvailableProducts(filteredProducts);

        // Localiza se já existe regra vinculada a este produto gatilho
        const matchingRule = (rulesRes || []).find(
          (r: any) => r.trigger_product_id === productId
        );

        if (matchingRule) {
          setCurrentRule(matchingRule);
          setIsEnabled(matchingRule.active);
          setSelectedOfferProductId(matchingRule.offer_product_id);
          setDiscountPercentage(matchingRule.discount_percentage ?? 15);
        } else {
          setCurrentRule(null);
          setIsEnabled(false);
          if (filteredProducts.length > 0) {
            setSelectedOfferProductId(filteredProducts[0].id);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg("Erro ao carregar dados de ofertas.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [productId]);

  const selectedProduct = availableProducts.find(
    (p) => p.id === selectedOfferProductId
  );

  const originalPriceCents = selectedProduct?.price_cents ?? 0;
  const discountedPriceCents = Math.max(
    0,
    Math.round(originalPriceCents * (1 - discountPercentage / 100))
  );

  const handleSave = async () => {
    if (!isEnabled && !currentRule) return;

    try {
      setSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      if (!isEnabled && currentRule) {
        // Se desativou e tem regra salva, remove ou desativa
        await updateUpsellRule({
          data: {
            id: currentRule.id,
            trigger_product_id: productId,
            offer_product_id: selectedOfferProductId,
            discount_percentage: discountPercentage,
            active: false,
          },
        });
        setCurrentRule({ ...currentRule, active: false });
        setSuccessMsg("Oferta desativada com sucesso.");
        return;
      }

      if (!selectedOfferProductId) {
        setErrorMsg("Selecione um produto para a oferta.");
        return;
      }

      if (currentRule) {
        const updated = await updateUpsellRule({
          data: {
            id: currentRule.id,
            trigger_product_id: productId,
            offer_product_id: selectedOfferProductId,
            discount_percentage: discountPercentage,
            active: isEnabled,
          },
        });
        setCurrentRule(updated);
        setSuccessMsg("Regra de oferta atualizada com sucesso.");
      } else {
        const created = await createUpsellRule({
          data: {
            trigger_product_id: productId,
            offer_product_id: selectedOfferProductId,
            discount_percentage: discountPercentage,
            active: isEnabled,
          },
        });
        setCurrentRule(created);
        setSuccessMsg("Regra de oferta criada com sucesso.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao salvar regra de oferta.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentRule?.id) return;
    try {
      setSaving(true);
      setErrorMsg(null);
      await deleteUpsellRule({ data: { id: currentRule.id } });
      setCurrentRule(null);
      setIsEnabled(false);
      setSuccessMsg("Oferta removida com sucesso.");
    } catch (err: any) {
      setErrorMsg("Erro ao remover regra de oferta.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6 rounded-lg border-border bg-card">
        <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
          <Loader2 className="size-4 animate-spin text-primary" />
          <span className="text-xs">Carregando configurações de oferta...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 rounded-lg border-border bg-card space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Zap className="size-4 text-primary" />
            <span>Oferta Relâmpago de Checkout (Order Bump)</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Apresente uma oferta irresistível de 1-clique quando o cliente comprar este item.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">
            {isEnabled ? "Ativado" : "Desativado"}
          </span>
          <Switch
            checked={isEnabled}
            onCheckedChange={(checked) => {
              setIsEnabled(checked);
              setSuccessMsg(null);
            }}
          />
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {availableProducts.length === 0 ? (
        <div className="p-6 text-center rounded-lg bg-muted/20 border border-border/40 space-y-2">
          <p className="text-xs text-muted-foreground">
            Você precisa ter pelo menos mais um produto cadastrado no catálogo para criar uma oferta de Order Bump.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Seletor de Produto Ofertado */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Produto Oferecido no Checkout
              </Label>
              <select
                disabled={!isEnabled}
                value={selectedOfferProductId}
                onChange={(e) => {
                  setSelectedOfferProductId(e.target.value);
                  setSuccessMsg(null);
                }}
                className="w-full h-11 px-3 text-xs rounded-lg border border-border bg-background text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
              >
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({formatBRL(p.price_cents ?? 0)})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                Item complementar sugerido no resumo do pedido antes do pagamento.
              </p>
            </div>

            {/* Desconto Percentual */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Desconto Promocional de 1-Clique (%)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  disabled={!isEnabled}
                  value={discountPercentage}
                  onChange={(e) => {
                    setDiscountPercentage(
                      Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0))
                    );
                    setSuccessMsg(null);
                  }}
                  className="h-11 w-24 text-xs rounded-lg"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  {[10, 15, 20, 30].map((pct) => (
                    <Button
                      key={pct}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!isEnabled}
                      onClick={() => {
                        setDiscountPercentage(pct);
                        setSuccessMsg(null);
                      }}
                      className="h-11 px-3 text-xs rounded-lg focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {pct}%
                    </Button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Aplique uma condição especial para maximizar o ticket médio do pedido.
              </p>
            </div>
          </div>

          {/* Preview Visual em Tempo Real */}
          {selectedProduct && isEnabled && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-foreground">
                Prévia da Oferta no Checkout
              </span>
              <div className="p-4 rounded-lg border-2 border-primary/30 bg-primary/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="size-3.5 text-primary animate-pulse" />
                    <span className="text-xs font-bold text-foreground">
                      Oferta Especial de 1-Clique
                    </span>
                  </div>
                  {discountPercentage > 0 && (
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {discountPercentage}% OFF
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {selectedProduct.images?.[0] ? (
                    <img
                      src={selectedProduct.images[0]}
                      alt={selectedProduct.title}
                      className="size-12 rounded-lg object-cover border border-border/50 shrink-0"
                    />
                  ) : (
                    <div className="size-12 rounded-lg bg-muted border border-border/50 flex items-center justify-center shrink-0 text-muted-foreground text-xs font-bold">
                      {selectedProduct.title?.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground line-clamp-1">
                      {selectedProduct.title}
                    </p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-xs font-extrabold text-primary">
                        {formatBRL(discountedPriceCents)}
                      </span>
                      {discountPercentage > 0 && (
                        <span className="text-[11px] text-muted-foreground line-through">
                          {formatBRL(originalPriceCents)}
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    className="h-11 px-4 text-xs font-bold rounded-lg shrink-0 pointer-events-none opacity-90"
                  >
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex items-center justify-between pt-4 border-t border-border/40">
            {currentRule ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={saving}
                className="h-11 px-3 text-xs text-destructive hover:bg-destructive/10 rounded-lg focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Trash2 className="size-4 mr-2" />
                Excluir Oferta
              </Button>
            ) : (
              <div />
            )}

            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="h-11 px-6 text-xs font-bold rounded-lg focus-visible:ring-2 focus-visible:ring-ring"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Regra de Oferta"
              )}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
