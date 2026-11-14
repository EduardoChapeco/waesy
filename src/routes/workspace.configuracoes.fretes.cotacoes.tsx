import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  Search,
  Package,
  Phone,
  Calendar,
  MapPin,
  User,
  Check,
  Loader2,
  Zap,
  Plus,
  Bike,
  Truck,
  Store,
  Trash2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Navigation,
} from "lucide-react";

import { PageHeader } from "@/components/commerce/page-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/state/states";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  listShippingZones,
  calculateShipping,
  upsertShippingZone,
  upsertShippingRate,
  deleteShippingZone,
} from "@/services/shipping.functions";
import {
  listOrdersAwaitingShippingQuote,
  updateOrderShippingQuote,
} from "@/services/order.functions";
import { DispatchDeliveryModal } from "@/components/delivery/dispatch-delivery-modal";
import { formatMoney } from "@/lib/money";
import { formatCep } from "@/lib/document-validator";
import { toast } from "sonner";
import { formatDate } from "@/lib/datetime";

export const Route = createFileRoute("/workspace/configuracoes/fretes/cotacoes")({
  head: () => ({ meta: [{ title: "Cotações de Frete | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const { getServerIdentity } = await import("@/lib/server-access");
      const identity = await getServerIdentity().catch(() => null);
      const storeId = identity?.store_id || identity?.memberships?.[0]?.store_id || null;

      const [zonesRes, pendingRes] = await Promise.all([
        listShippingZones().catch((err) => {
          console.warn("[loader:fretes.cotacoes] listShippingZones fallback:", err);
          return [];
        }),
        listOrdersAwaitingShippingQuote().catch((err) => {
          console.warn("[loader:fretes.cotacoes] listOrdersAwaitingShippingQuote fallback:", err);
          return [];
        }),
      ]);

      return {
        storeId,
        zones: Array.isArray(zonesRes) ? zonesRes : [],
        pendingOrders: Array.isArray(pendingRes) ? pendingRes : [],
      };
    } catch (err) {
      console.warn("[loader:workspace.configuracoes.fretes.cotacoes] Handled loader error:", err);
      return { storeId: null, zones: [], pendingOrders: [] };
    }
  },
  component: FretesCotacoesPage,
});

function FretesCotacoesPage() {
  const loaderData = (Route.useLoaderData?.() as any) || {};
  const storeId: string = loaderData?.storeId || "";
  const zones: any[] = Array.isArray(loaderData?.zones) ? loaderData.zones : [];
  const pendingOrders: any[] = Array.isArray(loaderData?.pendingOrders)
    ? loaderData.pendingOrders
    : [];
  const router = useRouter();

  // Simulating states
  const [zipcode, setZipcode] = useState("");
  const [results, setResults] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  // Manual quotes inputs
  const [quoteValues, setQuoteValues] = useState<Record<string, string>>({});
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);

  // Cotação Rápida por pedido
  const [quickQuotes, setQuickQuotes] = useState<
    Record<string, { loading: boolean; options: any[] }>
  >({});

  // Despacho Rápido Modal
  const [dispatchLead, setDispatchLead] = useState<any | null>(null);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);

  // Nova Zona / Tabela Própria Modal
  const [isCreateZoneOpen, setIsCreateZoneOpen] = useState(false);
  const [zoneName, setZoneName] = useState("");
  const [zoneRegions, setZoneRegions] = useState("");
  const [rateName, setRateName] = useState("Entrega Local");
  const [ratePrice, setRatePrice] = useState("10,00");
  const [rateDays, setRateDays] = useState("1");
  const [isSavingZone, setIsSavingZone] = useState(false);
  const [deletingZoneId, setDeletingZoneId] = useState<string | null>(null);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (zipcode.replace(/\D/g, "").length < 8) {
      toast.error("Informe um CEP de 8 dígitos");
      return;
    }
    setLoading(true);
    try {
      const res = await calculateShipping({ data: { zipcode } });
      setResults(Array.isArray(res) ? res : []);
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || "Erro ao calcular");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyQuote = async (orderId: string) => {
    const rawVal = quoteValues[orderId];
    if (
      !rawVal ||
      isNaN(Number(rawVal.replace(",", "."))) ||
      Number(rawVal.replace(",", ".")) < 0
    ) {
      toast.error("Por favor, digite um valor de frete válido (R$) maior ou igual a zero.");
      return;
    }

    const shippingCents = Math.round(parseFloat(rawVal.replace(",", ".")) * 100);
    setSavingOrderId(orderId);
    try {
      await updateOrderShippingQuote({
        data: {
          orderId,
          shippingCents,
        },
      });

      toast.success("Frete adicionado! Pedido liberado para pagamento.");
      router.invalidate();
    } catch {
      toast.error("Erro inesperado ao liberar pedido.");
    } finally {
      setSavingOrderId(null);
    }
  };

  const handleQuickQuote = async (orderId: string, cep: string) => {
    const cleanCep = (cep || "").replace(/\D/g, "");
    if (cleanCep.length < 8) {
      toast.error("O pedido não possui um CEP de entrega válido.");
      return;
    }

    setQuickQuotes((prev) => ({
      ...prev,
      [orderId]: { loading: true, options: [] },
    }));

    try {
      const res = await calculateShipping({ data: { zipcode: cleanCep } });
      const options = Array.isArray(res) ? res : [];
      setQuickQuotes((prev) => ({
        ...prev,
        [orderId]: { loading: false, options },
      }));
      if (options.length === 0) {
        toast.info("Nenhuma opção automática disponível para este CEP. Insira o valor manual.");
      }
    } catch {
      toast.error("Erro ao calcular opções de frete.");
      setQuickQuotes((prev) => ({
        ...prev,
        [orderId]: { loading: false, options: [] },
      }));
    }
  };

  const handleSelectQuoteOption = (orderId: string, priceCents: number) => {
    const formatted = (priceCents / 100).toFixed(2).replace(".", ",");
    setQuoteValues((prev) => ({
      ...prev,
      [orderId]: formatted,
    }));
  };

  const handleOpenDispatch = (order: any) => {
    const client = order.customer_snapshot || {};
    const addr = order.shipping_address || {};
    const fullAddress = [
      addr.street && `${addr.street}, ${addr.number || "s/n"}`,
      addr.neighborhood,
      addr.city && addr.state && `${addr.city} - ${addr.state}`,
      addr.zipcode && `CEP: ${addr.zipcode}`,
    ]
      .filter(Boolean)
      .join(" • ");

    const currentFee = quoteValues[order.id] ? quoteValues[order.id].replace(".", ",") : "0,00";

    setDispatchLead({
      id: order.id,
      customer_name: client.name || "Cliente",
      customer_phone: client.phone || "",
      customer_address: fullAddress,
      amount_cents: order.subtotal_cents - (order.discount_cents || 0),
      delivery_fee_reais: currentFee,
    });
    setIsDispatchModalOpen(true);
  };

  const handleSaveNewZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneName.trim()) {
      toast.error("Informe o nome da zona de entrega.");
      return;
    }
    const cleanRegions = zoneRegions
      .split(/[,;\n]/)
      .map((r) => r.trim())
      .filter(Boolean);

    if (cleanRegions.length === 0) {
      toast.error("Informe ao menos um prefixo de CEP ou '*' para toda a cidade.");
      return;
    }

    const priceCents = Math.round(parseFloat(ratePrice.replace(",", ".")) * 100);
    if (isNaN(priceCents) || priceCents < 0) {
      toast.error("Informe um valor de frete válido (R$).");
      return;
    }

    setIsSavingZone(true);
    try {
      const newZone = await upsertShippingZone({
        data: {
          name: zoneName.trim(),
          regions: cleanRegions,
          is_active: true,
        },
      });

      if (newZone && newZone.id) {
        await upsertShippingRate({
          data: {
            zone_id: newZone.id,
            name: rateName.trim() || "Entrega Local",
            price_cents: priceCents,
            estimated_days: Number(rateDays) || 1,
            is_active: true,
          },
        });
      }

      toast.success("Zona e taxa de frete criadas com sucesso!");
      setIsCreateZoneOpen(false);
      setZoneName("");
      setZoneRegions("");
      setRateName("Entrega Local");
      setRatePrice("10,00");
      setRateDays("1");
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar zona.");
    } finally {
      setIsSavingZone(false);
    }
  };

  const handleDeleteZone = async (zoneId: string) => {
    setDeletingZoneId(zoneId);
    try {
      await deleteShippingZone({ data: { id: zoneId } });
      toast.success("Zona de frete removida.");
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir zona.");
    } finally {
      setDeletingZoneId(null);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Cotações & Despacho"
        description="Hub de gestão logística: despacho sob demanda para entregadores autônomos (MotoLink), tabela própria por bairros e gateways integrados."
      />

      {/* Hub de Despacho & Modalidades Ativas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Bike className="size-5" />
            </div>
            <Badge variant="outline" className="text-xs">
              0% comissão • R$ 0,99 fixo
            </Badge>
          </div>
          <div>
            <h4 className="font-semibold text-sm">MotoLink / Waesy Go</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Despacho rápido conectado à frota urbana de motoboys e entregadores autônomos.
            </p>
          </div>
          <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-2 text-primary font-medium">
              <Zap className="size-3.5" />
              Despacho Imediato
            </span>
            <span>Tarifa por KM do condutor</span>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Store className="size-5" />
            </div>
            <Badge variant="secondary" className="text-xs">
              {zones.length} Zonas Ativas
            </Badge>
          </div>
          <div>
            <h4 className="font-semibold text-sm">Tabela Própria da Loja</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Preços fixos ou por faixa definidos pela loja para bairros, cidades e faixas de CEP.
            </p>
          </div>
          <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateZoneOpen(true)}
              className="h-11 min-h-11 sm:h-9 sm:min-h-9 text-xs gap-2 w-full"
            >
              <Plus className="size-3.5" />
              Configurar Nova Zona
            </Button>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Truck className="size-5" />
            </div>
            <Badge variant="outline" className="text-xs">
              Correios & Transportadoras
            </Badge>
          </div>
          <div>
            <h4 className="font-semibold text-sm">Gateways Nacionais</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Integração com Melhor Envio para cotação automatizada de SEDEX, PAC e Jadlog.
            </p>
          </div>
          <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-2 text-foreground font-medium">
              <ShieldCheck className="size-3.5" />
              Cálculo Automático
            </span>
            <span>Etiquetas com desconto</span>
          </div>
        </div>
      </div>

      {/* Solicitações Pendentes */}
      <div className="bg-surface-paper rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            Solicitações Pendentes
            <Badge variant="destructive" className="ml-1 text-xs">
              {pendingOrders.length}
            </Badge>
          </h3>
        </div>

        {pendingOrders.length === 0 ? (
          <div className="py-8 text-center border border-dashed bg-muted/10">
            <p className="text-sm text-muted-foreground">
              Nenhum pedido aguardando cotação de frete no momento.
            </p>
          </div>
        ) : (
          <div className="rounded-lg bg-surface-paper overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Endereço de Entrega</TableHead>
                  <TableHead>Subtotal</TableHead>
                  <TableHead className="w-80">Opções & Cotação (R$)</TableHead>
                  <TableHead className="w-48 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingOrders.map((order: any) => {
                  const client = order.customer_snapshot || {};
                  const addr = order.shipping_address || {};
                  const quoteState = quickQuotes[order.id];
                  const isLoadingQuotes = quoteState?.loading || false;
                  const quoteOptions = quoteState?.options || [];

                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium align-top">
                        <div className="flex flex-col">
                          <span>#{order.public_token}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1 font-normal">
                            <Calendar className="size-3" />
                            {formatDate(order.created_at)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex flex-col text-sm">
                          <span className="font-medium flex items-center gap-1">
                            <User className="size-3 text-muted-foreground" />
                            {client.name || "Cliente"}
                          </span>
                          {client.phone && (
                            <a
                              href={`https://wa.me/55${client.phone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                            >
                              <Phone className="size-3" />
                              {client.phone}
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-72 align-top">
                        <div className="flex flex-col text-xs font-normal text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {addr.neighborhood || "-"}, {addr.city || "-"} - {addr.state || "-"}
                          </span>
                          <span>
                            {addr.street || "-"}, {addr.number || "-"}
                            {addr.complement && ` (${addr.complement})`}
                          </span>
                          <span>CEP: {addr.zipcode || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-sm align-top">
                        {formatMoney(order.subtotal_cents - order.discount_cents)}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="R$ 0,00"
                              value={quoteValues[order.id] || ""}
                              onChange={(e) =>
                                setQuoteValues({
                                  ...quoteValues,
                                  [order.id]: e.target.value,
                                })
                              }
                              disabled={savingOrderId === order.id}
                              className="h-11 sm:h-9 text-xs"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              title="Calcular cotações sugeridas via tabela e motoboy"
                              onClick={() => handleQuickQuote(order.id, addr.zipcode)}
                              disabled={isLoadingQuotes || !addr.zipcode}
                              className="h-11 min-h-11 px-3 sm:h-9 sm:min-h-9 text-xs shrink-0"
                            >
                              {isLoadingQuotes ? (
                                <Loader2 className="animate-spin motion-reduce:animate-none size-3.5" />
                              ) : (
                                <Zap className="size-3.5 text-primary" />
                              )}
                              <span className="ml-1 hidden sm:inline">Opções</span>
                            </Button>
                          </div>

                          {/* Pílulas de Cotação Rápida */}
                          {quoteOptions.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {quoteOptions.map((q: any) => (
                                <button
                                  key={q.id}
                                  type="button"
                                  onClick={() => handleSelectQuoteOption(order.id, q.price_cents)}
                                  className="text-xs rounded border bg-muted/20 hover:bg-muted/40 px-2 py-1 flex items-center gap-1 transition-colors focus-visible:ring-2"
                                  title={`Selecionar ${q.name}`}
                                >
                                  <span className="font-medium text-foreground">{q.name}:</span>
                                  <span className="text-primary font-semibold">
                                    {formatMoney(q.price_cents)}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right align-top">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDispatch(order)}
                            title="Despachar direto para entregador / motoboy"
                            className="h-11 min-h-11 px-3 sm:h-9 sm:min-h-9 sm:px-3 text-xs gap-1"
                          >
                            <Bike className="size-3.5 text-primary" />
                            <span className="hidden md:inline">Despachar</span>
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApplyQuote(order.id)}
                            disabled={savingOrderId === order.id || !quoteValues[order.id]}
                            className="h-11 min-h-11 px-4 sm:h-9 sm:min-h-9 sm:px-3 text-xs"
                          >
                            {savingOrderId === order.id ? (
                              <Loader2 className="animate-spin motion-reduce:animate-none size-4" />
                            ) : (
                              <>
                                <Check className="mr-1 size-3.5" />
                                Liberar
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Simulador de Cotações */}
      <div className="bg-surface-paper rounded-lg p-6">
        <h3 className="font-semibold mb-4 text-lg">Simular Frete por CEP</h3>
        <form onSubmit={handleSimulate} className="flex gap-3 max-w-sm">
          <Input
            type="text"
            inputMode="numeric"
            placeholder="00000-000"
            value={zipcode}
            onChange={(e) => setZipcode(formatCep(e.target.value))}
            maxLength={9}
            className="h-11 min-h-11 text-xs"
          />
          <Button
            type="submit"
            disabled={loading}
            className="h-11 min-h-11 px-5 text-xs font-semibold"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin motion-reduce:animate-none size-4" />
                Calculando...
              </span>
            ) : (
              "Simular"
            )}
          </Button>
        </form>

        {results !== null && (
          <div className="mt-6">
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground font-normal">
                Nenhuma opção de frete encontrada para o CEP informado. Verifique as zonas
                configuradas.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground mb-3 font-normal">
                  {results.length} opção(ões) disponível(is) para {zipcode}:
                </p>
                {results.map((r: any) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between border px-4 py-3 bg-muted/10 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        {r.service_code === "motolink_express" ? (
                          <Bike className="size-4" />
                        ) : r.service_code?.startsWith("correios") ? (
                          <Truck className="size-4" />
                        ) : (
                          <Package className="size-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{r.name}</p>
                          {r.service_code === "motolink_express" && (
                            <Badge variant="outline" className="text-xs">
                              MotoLink
                            </Badge>
                          )}
                          {r.service_code === "store_table" && (
                            <Badge variant="secondary" className="text-xs">
                              Tabela Própria
                            </Badge>
                          )}
                        </div>
                        {r.estimated_days && (
                          <p className="text-xs text-muted-foreground font-normal">
                            Prazo estimado: {r.estimated_days} dia(s)
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {r.price_cents === 0 ? (
                        <Badge variant="secondary">Grátis</Badge>
                      ) : (
                        <p className="font-semibold text-sm">{formatMoney(r.price_cents)}</p>
                      )}
                      {r.min_order_cents && (
                        <p className="text-xs text-muted-foreground font-normal">
                          Mín: {formatMoney(r.min_order_cents)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabela Própria de Zonas */}
      <div className="bg-surface-paper rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg">Tabela Própria de Zonas ({zones.length})</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Zonas de entrega locais para bairros, cidades ou faixas de CEP com preços fixos
              configurados.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setIsCreateZoneOpen(true)}
            className="h-11 min-h-11 sm:h-9 sm:min-h-9 text-xs gap-2"
          >
            <Plus className="size-3.5" />
            Nova Zona
          </Button>
        </div>

        {zones.length === 0 ? (
          <EmptyState
            title="Nenhuma zona configurada"
            description="Cadastre zonas de entrega para oferecer frete fixo ou personalizado por bairro ou CEP."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {zones.map((z: any) => (
              <div
                key={z.id}
                className="flex items-start justify-between rounded-lg border p-4 bg-muted/10 space-y-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{z.name}</span>
                    <Badge
                      variant={z.is_active ? "secondary" : "outline"}
                      className="text-xs font-normal"
                    >
                      {z.is_active ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Regiões / CEPs: {(z.regions || []).join(", ") || "Todos"}
                  </p>
                  {z.rates && z.rates.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-2">
                      {z.rates.map((rate: any) => (
                        <span
                          key={rate.id}
                          className="text-xs rounded bg-background border px-2 py-1 text-foreground"
                        >
                          {rate.name}: <strong>{formatMoney(rate.price_cents)}</strong> (
                          {rate.estimated_days}d)
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Excluir zona"
                  onClick={() => handleDeleteZone(z.id)}
                  disabled={deletingZoneId === z.id}
                  className="size-11 min-h-11 min-w-11 sm:size-9 sm:min-h-9 sm:min-w-9 text-muted-foreground hover:text-destructive flex items-center justify-center rounded-md shrink-0 focus-visible:ring-2"
                >
                  {deletingZoneId === z.id ? (
                    <Loader2 className="animate-spin motion-reduce:animate-none size-4" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para Criação de Zona */}
      <Dialog open={isCreateZoneOpen} onOpenChange={setIsCreateZoneOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Zona de Entrega</DialogTitle>
            <DialogDescription>
              Cadastre uma região com tarifas para entregas locais.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="zone-name" className="text-xs font-medium">
                Nome da Zona
              </Label>
              <Input
                id="zone-name"
                placeholder="Ex: Centro & Bairros Próximos"
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                className="h-11 sm:h-9 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zone-regions" className="text-xs font-medium">
                Prefixos de CEP ou Nomes de Regiões (separados por vírgula)
              </Label>
              <Input
                id="zone-regions"
                placeholder="Ex: 89800, 89801, 89802"
                value={zoneRegions}
                onChange={(e) => setZoneRegions(e.target.value)}
                className="h-11 sm:h-9 text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco para aplicar a todos os CEPs da sua cidade.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <div className="space-y-2">
                <Label htmlFor="rate-name" className="text-xs font-medium">
                  Nome da Taxa
                </Label>
                <Input
                  id="rate-name"
                  placeholder="Ex: Entrega Expressa"
                  value={rateName}
                  onChange={(e) => setRateName(e.target.value)}
                  className="h-11 sm:h-9 text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rate-price" className="text-xs font-medium">
                  Valor da Taxa (R$)
                </Label>
                <Input
                  id="rate-price"
                  inputMode="decimal"
                  placeholder="10,00"
                  value={ratePrice}
                  onChange={(e) => setRatePrice(e.target.value)}
                  className="h-11 sm:h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate-days" className="text-xs font-medium">
                Prazo Estimado (Dias Úteis)
              </Label>
              <Input
                id="rate-days"
                type="number"
                min="0"
                placeholder="1"
                value={rateDays}
                onChange={(e) => setRateDays(e.target.value)}
                className="h-11 sm:h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateZoneOpen(false)}
              className="h-11 sm:h-9 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveNewZone}
              disabled={isSavingZone || !zoneName.trim()}
              className="h-11 sm:h-9 text-xs font-medium"
            >
              {isSavingZone ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin motion-reduce:animate-none size-3.5" />
                  Salvando...
                </span>
              ) : (
                "Salvar Zona"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Despacho Rápido MotoLink */}
      {dispatchLead && (
        <DispatchDeliveryModal
          isOpen={!!dispatchLead}
          onClose={() => setDispatchLead(null)}
          lead={dispatchLead}
          storeId={storeId}
        />
      )}
    </div>
  );
}
