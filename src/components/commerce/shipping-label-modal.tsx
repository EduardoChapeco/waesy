import { useState, useEffect, useRef } from "react";
import {
  Printer,
  FileText,
  Download,
  Copy,
  Check,
  Truck,
  ExternalLink,
  ShieldCheck,
  Package,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { formatMoney } from "@/lib/money";
import {
  getOrderShippingLabelData,
  generateZplShippingLabel,
  updateOrderShippingDispatch,
  type ShippingLabelPayload,
} from "@/services/shipping.functions";

interface ShippingLabelModalProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
  onDispatchSuccess?: () => void;
}

export function ShippingLabelModal({
  orderId,
  isOpen,
  onClose,
  onDispatchSuccess,
}: ShippingLabelModalProps) {
  const [loading, setLoading] = useState(true);
  const [savingDispatch, setSavingDispatch] = useState(false);
  const [labelData, setLabelData] = useState<ShippingLabelPayload | null>(null);
  const [activeTab, setActiveTab] = useState<"thermal" | "declaration" | "zpl">("thermal");

  // Form states
  const [carrier, setCarrier] = useState("Correios");
  const [shippingService, setShippingService] = useState("SEDEX");
  const [trackingCode, setTrackingCode] = useState("");
  const [copiedZpl, setCopiedZpl] = useState(false);
  const [zplScript, setZplScript] = useState<string>("");

  const printableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !orderId) return;

    let mounted = true;
    setLoading(true);

    getOrderShippingLabelData({ data: { orderId } })
      .then((data) => {
        if (!mounted) return;
        setLabelData(data);
        setCarrier(data.order.carrier || "Correios");
        setShippingService(data.order.shipping_service || "SEDEX");
        setTrackingCode(data.order.tracking_code || data.barcode_data || "");
      })
      .catch((err) => {
        if (!mounted) return;
        toast.error(err instanceof Error ? err.message : "Erro ao carregar dados da etiqueta.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, orderId]);

  // Carrega ZPL sob demanda quando seleciona a aba ZPL
  useEffect(() => {
    if (activeTab === "zpl" && !zplScript && orderId) {
      generateZplShippingLabel({ data: { orderId } })
        .then((res) => setZplScript(res.zpl))
        .catch(() => {});
    }
  }, [activeTab, orderId, zplScript]);

  const handlePrint = () => {
    if (typeof window === "undefined") return;
    window.print();
  };

  const handleCopyZpl = () => {
    if (!zplScript) return;
    navigator.clipboard.writeText(zplScript);
    setCopiedZpl(true);
    toast.success("Script ZPL copiado para a área de transferência!");
    setTimeout(() => setCopiedZpl(false), 2000);
  };

  const handleDownloadZpl = () => {
    if (!zplScript || !labelData) return;
    const blob = new Blob([zplScript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `etiqueta_${labelData.order.order_number}.zpl`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Arquivo .zpl baixado com sucesso!");
  };

  const handleSaveDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingCode.trim()) {
      toast.error("Informe o código de rastreamento.");
      return;
    }

    setSavingDispatch(true);
    try {
      await updateOrderShippingDispatch({
        data: {
          orderId,
          carrier,
          trackingCode: trackingCode.trim().toUpperCase(),
          serviceName: shippingService,
          notifyCustomer: true,
        },
      });
      toast.success("Despacho registrado e pedido marcado como Enviado!");
      onDispatchSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar despacho.");
    } finally {
      setSavingDispatch(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0 border-border/70 rounded-2xl">
        <DialogHeader className="p-5 border-b border-border/40 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Truck className="size-4 text-primary" />
                <span>Despacho & Etiquetas de Envio</span>
                {labelData && (
                  <Badge variant="outline" className="text-xs font-mono">
                    #{labelData.order.order_number}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Emissão nos padrões Correios/Transportadoras em PDF 100x150mm, ZPL II Térmico e Declaração de Conteúdo.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handlePrint}
                className="h-8 rounded-xl text-xs font-semibold gap-1.5"
              >
                <Printer className="size-3.5" />
                <span>Imprimir</span>
              </Button>
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as any)}
            className="w-full mt-3"
          >
            <TabsList className="grid grid-cols-3 h-8 p-0.5 bg-background border border-border/50 rounded-xl">
              <TabsTrigger value="thermal" className="text-xs font-medium rounded-lg">
                Etiqueta Térmica (100x150mm)
              </TabsTrigger>
              <TabsTrigger value="declaration" className="text-xs font-medium rounded-lg">
                Declaração de Conteúdo (A4)
              </TabsTrigger>
              <TabsTrigger value="zpl" className="text-xs font-medium rounded-lg">
                Script ZPL II (Zebra)
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </DialogHeader>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">Carregando dados logísticos do pedido...</p>
          </div>
        ) : !labelData ? (
          <div className="py-16 text-center text-xs text-muted-foreground">
            Não foi possível carregar os dados de despacho.
          </div>
        ) : (
          <div className="p-5 space-y-6">
            {/* ── ABA 1: ETIQUETA TÉRMICA 100x150mm (PDF / CSS) ── */}
            {activeTab === "thermal" && (
              <div className="flex flex-col items-center justify-center">
                <div
                  ref={printableRef}
                  id="print-shipping-label"
                  className="w-[100mm] min-h-[150mm] max-w-full bg-white text-black p-4 border-2 border-black rounded-sm shadow-md font-sans text-xs flex flex-col justify-between"
                  style={{ boxSizing: "border-box" }}
                >
                  {/* Topo / Chancelas */}
                  <div className="border-b-2 border-black pb-2 flex items-center justify-between">
                    <div className="font-black text-base tracking-wider uppercase">
                      {carrier}
                    </div>
                    <div className="border border-black px-2 py-0.5 text-[11px] font-bold uppercase rounded">
                      {shippingService}
                    </div>
                  </div>

                  {/* Código de Rastreio com Barcode Simulado Code 128 */}
                  <div className="py-3 text-center border-b-2 border-black">
                    <div className="font-mono text-xs font-bold tracking-widest mb-1">
                      {labelData.order.tracking_code || labelData.barcode_data}
                    </div>
                    {/* SVG Barcode Code 128 estilizado */}
                    <div className="flex justify-center items-center h-12 overflow-hidden px-4">
                      <svg viewBox="0 0 200 40" className="w-full h-full">
                        {Array.from({ length: 45 }).map((_, i) => (
                          <rect
                            key={i}
                            x={i * 4.4 + (i % 3 === 0 ? 1 : 0)}
                            y="0"
                            width={i % 4 === 0 ? 3 : i % 2 === 0 ? 1.5 : 2}
                            height="40"
                            fill="black"
                          />
                        ))}
                      </svg>
                    </div>
                    <span className="text-[9px] text-gray-600 block mt-0.5">
                      Código de Rastreamento Postal
                    </span>
                  </div>

                  {/* Bloco DESTINATÁRIO */}
                  <div className="py-2.5 border-b-2 border-black space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-gray-700">
                        Destinatário
                      </span>
                      {labelData.recipient.document && (
                        <span className="text-[9px] text-gray-600">
                          CPF/CNPJ: {labelData.recipient.document}
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-sm leading-tight text-black">
                      {labelData.recipient.name}
                    </div>
                    <div className="text-xs leading-snug">
                      {labelData.recipient.street}, {labelData.recipient.number}
                      {labelData.recipient.complement ? ` - ${labelData.recipient.complement}` : ""}
                    </div>
                    <div className="text-xs leading-snug">
                      Bairro: {labelData.recipient.neighborhood}
                    </div>
                    <div className="text-xs font-semibold leading-snug">
                      {labelData.recipient.city} - {labelData.recipient.state}
                    </div>

                    <div className="flex items-center justify-between pt-1 mt-1 border-t border-dashed border-gray-400">
                      <div>
                        <span className="text-[9px] text-gray-500 uppercase block">CEP</span>
                        <span className="text-base font-black tracking-wider">
                          {labelData.recipient.zip_code.slice(0, 5)}-{labelData.recipient.zip_code.slice(5)}
                        </span>
                      </div>
                      {/* Barcode menor para CEP */}
                      <div className="w-24 h-7">
                        <svg viewBox="0 0 100 25" className="w-full h-full">
                          {Array.from({ length: 28 }).map((_, i) => (
                            <rect
                              key={i}
                              x={i * 3.5}
                              y="0"
                              width={i % 3 === 0 ? 2 : 1}
                              height="25"
                              fill="black"
                            />
                          ))}
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Bloco REMETENTE */}
                  <div className="py-2 border-b border-gray-300 text-[11px] leading-tight space-y-0.5">
                    <span className="text-[9px] uppercase font-bold text-gray-600 block">
                      Remetente
                    </span>
                    <div className="font-bold text-gray-900">{labelData.sender.name}</div>
                    <div>
                      {labelData.sender.street}, {labelData.sender.number} - {labelData.sender.neighborhood}
                    </div>
                    <div>
                      {labelData.sender.city}/{labelData.sender.state} - CEP: {labelData.sender.zip_code}
                    </div>
                  </div>

                  {/* Rodapé: Peso e Pedido */}
                  <div className="pt-2 flex items-center justify-between text-[10px] text-gray-600 font-mono">
                    <span>Pedido #{labelData.order.order_number}</span>
                    <span>Peso: {labelData.total_weight_kg} kg</span>
                    <span>Volumes: 1/1</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── ABA 2: DECLARAÇÃO DE CONTEÚDO (A4 OFICIAL) ── */}
            {activeTab === "declaration" && (
              <div className="bg-white text-black p-6 border border-gray-300 rounded-lg shadow-sm font-sans text-xs space-y-4 max-w-2xl mx-auto">
                <div className="text-center border-b pb-3">
                  <h3 className="text-sm font-black uppercase tracking-wider">
                    DECLARAÇÃO DE CONTEÚDO
                  </h3>
                  <p className="text-[10px] text-gray-600">
                    Em conformidade com a legislação tributária vigente e normas dos Correios / Transportadoras
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 border p-3 rounded">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-gray-500 block">
                      REMETENTE
                    </span>
                    <div className="font-bold">{labelData.sender.name}</div>
                    <div>Doc: {labelData.sender.document || "Não informado"}</div>
                    <div>
                      {labelData.sender.street}, {labelData.sender.number}
                    </div>
                    <div>
                      {labelData.sender.neighborhood} - {labelData.sender.city}/{labelData.sender.state}
                    </div>
                    <div>CEP: {labelData.sender.zip_code}</div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-gray-500 block">
                      DESTINATÁRIO
                    </span>
                    <div className="font-bold">{labelData.recipient.name}</div>
                    <div>Doc: {labelData.recipient.document || "Não informado"}</div>
                    <div>
                      {labelData.recipient.street}, {labelData.recipient.number}
                    </div>
                    <div>
                      {labelData.recipient.neighborhood} - {labelData.recipient.city}/{labelData.recipient.state}
                    </div>
                    <div>CEP: {labelData.recipient.zip_code}</div>
                  </div>
                </div>

                {/* Itens */}
                <div className="border rounded overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-100 border-b font-semibold text-[10px] uppercase">
                      <tr>
                        <th className="p-2">Item</th>
                        <th className="p-2">Descrição do Conteúdo</th>
                        <th className="p-2 text-center">Qtd</th>
                        <th className="p-2 text-right">Valor (R$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {labelData.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2">{idx + 1}</td>
                          <td className="p-2">{item.description}</td>
                          <td className="p-2 text-center">{item.quantity}</td>
                          <td className="p-2 text-right">{formatMoney(item.value_cents)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-bold border-t">
                      <tr>
                        <td colSpan={2} className="p-2">
                          Total de Itens: {labelData.items.length}
                        </td>
                        <td className="p-2 text-center">
                          {labelData.items.reduce((acc, it) => acc + it.quantity, 0)}
                        </td>
                        <td className="p-2 text-right">
                          {formatMoney(labelData.order.total_cents)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="text-[10px] text-gray-600 border p-2.5 rounded leading-tight">
                  Declaro que não me enquadro no conceito de contribuinte do ICMS e que a mercadoria acima não tem finalidade comercial, responsabilizando-me perante a lei pela veracidade desta declaração.
                </div>

                <div className="pt-4 flex justify-between items-end text-xs">
                  <div>Data: {new Date().toLocaleDateString("pt-BR")}</div>
                  <div className="border-t border-black w-48 text-center pt-1 text-[10px]">
                    Assinatura do Remetente
                  </div>
                </div>
              </div>
            )}

            {/* ── ABA 3: SCRIPT ZPL II TÉRMICO ── */}
            {activeTab === "zpl" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Código ZPL II padrão para impressoras térmicas industriais (Zebra, Elgin, Argox, Godex).
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyZpl}
                      className="h-8 text-xs font-semibold gap-1.5"
                    >
                      {copiedZpl ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                      <span>{copiedZpl ? "Copiado" : "Copiar ZPL"}</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleDownloadZpl}
                      className="h-8 text-xs font-semibold gap-1.5"
                    >
                      <Download className="size-3.5" />
                      <span>Baixar .zpl</span>
                    </Button>
                  </div>
                </div>

                <pre className="p-4 rounded-xl bg-muted/60 border border-border text-[11px] font-mono overflow-x-auto max-h-80 text-foreground">
                  {zplScript || "Gerando script ZPL..."}
                </pre>
              </div>
            )}

            {/* ── SEÇÃO INFERIOR: REGISTRO DE DESPACHO & RASTREAMENTO ── */}
            <div className="border-t border-border/60 pt-4 bg-muted/10 p-4 rounded-xl space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="size-3.5 text-primary" />
                <span>Atualizar Rastreamento e Confirmar Despacho</span>
              </h4>

              <form onSubmit={handleSaveDispatch} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Transportadora</Label>
                  <Input
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    placeholder="Ex: Correios, Jadlog, Loggi"
                    className="h-8 rounded-lg bg-background text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Código de Rastreamento</Label>
                  <Input
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    placeholder="Ex: QB123456789BR"
                    className="h-8 rounded-lg bg-background font-mono text-xs font-bold uppercase"
                  />
                </div>

                <Button
                  type="submit"
                  size="sm"
                  disabled={savingDispatch}
                  className="h-8 rounded-lg text-xs font-semibold"
                >
                  {savingDispatch ? "Salvando..." : "Confirmar Despacho"}
                </Button>
              </form>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
