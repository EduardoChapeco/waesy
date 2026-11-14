import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Send, CheckCircle2, XCircle, Clock, MessageSquare, Package, Wrench, Box, Hash, Loader2, AlertCircle, FileSpreadsheet, Plane, Building2, FileCheck2, ExternalLink, Copy, Download, Share2, Calendar, User, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { getQuoteDetail, updateQuoteStatus, approveQuote, addQuoteMessage, type QuoteItemDTO } from "@/services/quotes.functions";
import { compileContractFromQuote } from "@/services/contract-compiler.functions";
import { ADVANCED_CONTRACT_TEMPLATES } from "@/lib/data/advanced-contract-templates";
import {
  formatDynamicFieldLabel,
  formatFieldPrimitiveValue,
  getNicheContractBlueprint,
  normalizeCustomFieldMap,
} from "@/lib/niches/unified-field-bridge";
import { formatMoney } from "@/lib/money";
import { formatRelativeTime } from "@/lib/datetime";
import { playCashRegisterSound } from "@/lib/audio-chimes";

export const Route = createFileRoute("/workspace/orcamentos/$id")({
 head: () => ({ meta: [{ title: "Detalhe do Orçamento | Workspace Waesy" }] }),
 loader: async ({ params }) => {
   try {
 const data = await getQuoteDetail({ data: { quote_id: params.id } });
 return { quote: data };
   } catch (err) {
     console.error("[loader:workspace.orcamentos.$id] Unhandled loader error:", err);
     return { quote: null };
   }
 },
 component: QuoteDetailPage,
});

function QuoteDetailPage() {
 const { quote: initial } = ((Route.useLoaderData?.() as any) || {});
 const params = Route.useParams();
 const navigate = useNavigate();
 const qc = useQueryClient();

 const { data: quote, isLoading } = useQuery({
 queryKey: ["quote-detail", params.id],
 queryFn: () => getQuoteDetail({ data: { quote_id: params.id } }),
 initialData: initial,
 staleTime: 30_000,
 });

 const [messageText, setMessageText] = useState("");
 const [isInternal, setIsInternal] = useState(false);
 const [isCreatingContract, setIsCreatingContract] = useState(false);
 const [isContractDialogOpen, setIsContractDialogOpen] = useState(false);

 // Parse conditions JSON for Travel / Niche / Custom data if present
 const travelMeta = (() => {
 if (!quote?.conditions) return null;
 try {
 if (typeof quote.conditions === "string" && quote.conditions.startsWith("{")) {
 return JSON.parse(quote.conditions);
 }
 if (typeof quote.conditions === "object") {
 return quote.conditions;
 }
 } catch {
 return null;
 }
 return null;
 })();

 const nicheBlueprint = useMemo(() => {
 const hint =
 quote?.niche_id ||
 travelMeta?.niche_id ||
 (travelMeta?.destination_city ||
 (Array.isArray(travelMeta?.flights) && travelMeta.flights.length > 0) ||
 (Array.isArray(travelMeta?.hotels) && travelMeta.hotels.length > 0)
 ? "tourism"
 : "general_deal");
 return getNicheContractBlueprint(hint);
 }, [quote?.niche_id, travelMeta]);

 const isTourismProposalView =
 nicheBlueprint.isTourism || Boolean(travelMeta?.public_token || travelMeta?.destination_city);

 const normalizedCustomFields = useMemo(
 () =>
 normalizeCustomFieldMap({
 ...(typeof quote?.custom_fields === "object" && quote?.custom_fields ? quote.custom_fields : {}),
 ...(typeof travelMeta?.custom_fields === "object" && travelMeta?.custom_fields ? travelMeta.custom_fields : {}),
 }),
 [quote?.custom_fields, travelMeta],
 );

 const [selectedTemplateId, setSelectedTemplateId] = useState<string>(nicheBlueprint.defaultTemplateId);
 const [customContractTitle, setCustomContractTitle] = useState<string>("");
 const [sectionConfig, setSectionConfig] = useState({
 showItemsTable: true,
 showSpecsTable: true,
 showItineraryTable: true,
 showPassengersTable: true,
 showFinancialTable: true,
 showCustomFieldsTable: true,
 includeLegalClauses: true,
 });

 useEffect(() => {
 setSelectedTemplateId(nicheBlueprint.defaultTemplateId);
 }, [nicheBlueprint.defaultTemplateId]);

 const sendMessage = useMutation({
 mutationFn: () =>
 addQuoteMessage({
 data: { quote_id: params.id, body: messageText, is_internal: isInternal },
 }),
 onSuccess: () => {
 setMessageText("");
 qc.invalidateQueries({ queryKey: ["quote-detail", params.id] });
 toast.success("Mensagem enviada.");
 },
 onError: () => toast.error("Erro ao enviar mensagem."),
 });

 const changeStatus = useMutation({
 mutationFn: (status: "sent" | "negotiating" | "rejected") =>
 updateQuoteStatus({ data: { quote_id: params.id, status } }),
 onSuccess: () => {
 qc.invalidateQueries({ queryKey: ["quote-detail", params.id] });
 qc.invalidateQueries({ queryKey: ["quotes"] });
 toast.success("Status atualizado.");
 },
 onError: () => toast.error("Erro ao atualizar status."),
 });

 const handleApprove = useMutation({
 mutationFn: () => approveQuote({ data: { quote_id: params.id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quote-detail", params.id] });
      qc.invalidateQueries({ queryKey: ["quotes"] });
      playCashRegisterSound();
      toast.success("Orçamento aprovado com sucesso!");
    },
 onError: (e: any) => toast.error(e?.message ?? "Erro ao aprovar orçamento."),
 });

 const handleGenerateContract = async () => {
 if (!quote?.id) return;
 setIsCreatingContract(true);
 try {
 const res = await compileContractFromQuote({
 data: {
 quoteId: quote.id,
 templateId: selectedTemplateId || undefined,
 customTitle: customContractTitle.trim() || undefined,
 sectionConfig,
 },
 });
 if (res?.success) {
 setIsContractDialogOpen(false);
 toast.success(`Contrato emitido (${res.templateTitle})! Abrindo editor...`);
 navigate({ to: "/workspace/contratos/$id/editor", params: { id: res.contractId } });
 }
 } catch (err: any) {
 toast.error(err?.message || "Erro ao emitir contrato.");
 } finally {
 setIsCreatingContract(false);
 }
 };

 const handleCopyPublicLink = () => {
 const token = travelMeta?.public_token || quote?.id;
 const url = `${window.location.origin}/proposta/${token}`;
 navigator.clipboard.writeText(url);
 toast.success("Link da proposta copiado para a área de transferência!");
 };

 if (isLoading || !quote) {
 return (
 <div className="flex justify-center py-16">
 <Loader2 className="size-6 animate-spin motion-reduce:animate-none text-muted-foreground" />
 </div>
 );
 }

 const isDraft = quote.status === "draft";
 const isSent = quote.status === "sent" || quote.status === "negotiating";
 const isTerminal = ["approved", "rejected", "expired", "converted"].includes(quote.status);

 return (
 <div className="flex flex-col gap-6 w-full">
 {/* Breadcrumb & Ações Superiores */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div className="flex items-center gap-2">
 <Button asChild variant="ghost" size="icon" className="rounded-lg size-9 min-h-11 sm:min-h-0 min-w-11 sm:min-w-0">
 <Link to="/workspace/orcamentos">
 <ChevronLeft className="size-4" />
 </Link>
 </Button>
 <div>
 <div className="flex items-center gap-2">
 <span className="text-xs font-mono font-bold text-muted-foreground">{quote.quote_number}</span>
 <Badge
 variant={isTerminal ? "default" : "secondary"}
 className="text-xs font-semibold px-2 py-1 rounded-lg"
 >
 {quote.status}
 </Badge>
 </div>
 <h1 className="text-xl font-bold text-foreground">
 {travelMeta?.title || quote.internal_notes || "Orçamento"}
 </h1>
 </div>
 </div>

 <div className="flex items-center gap-2">
 {isTourismProposalView && (
 <>
 <Button
 asChild
 variant="outline"
 className="h-10 rounded-lg text-xs font-bold gap-2 cursor-pointer shadow-xs min-h-11 sm:min-h-0"
 >
 <Link to="/workspace/turismo/propostas/$id" params={{ id: quote.id }}>
 <FileSpreadsheet className="size-3.5 text-primary" />
 <span>Studio Visual de Propostas</span>
 </Link>
 </Button>

 <Button
 onClick={handleCopyPublicLink}
 variant="outline"
 className="h-10 rounded-lg text-xs font-bold gap-2 cursor-pointer min-h-11 sm:min-h-0"
 >
 <Copy className="size-3.5" />
 <span>Copiar Link do Cliente</span>
 </Button>
 </>
 )}

 <Button
 onClick={() => setIsContractDialogOpen(true)}
 disabled={isCreatingContract}
 className="h-10 rounded-lg text-xs font-bold gap-2 bg-primary text-primary-foreground cursor-pointer min-h-11 sm:min-h-0"
 >
 <FileCheck2 className="size-3.5" />
 <span>{isCreatingContract ? "Emitindo..." : "Gerar Contrato Tabular"}</span>
 </Button>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
 {/* Coluna Principal (8 Cols) */}
 <div className="lg:col-span-8 space-y-6">
 {/* Cabeçalho de Dados do Cliente e Viagem */}
 <div className="p-6 rounded-lg bg-card border border-border/80 space-y-4">
 <div className="flex items-start justify-between">
 <div>
 <p className="text-xs font-semibold text-muted-foreground uppercase">Cliente Contratante</p>
 <h3 className="text-lg font-bold text-foreground mt-1">
 {quote.customer_name ?? quote.customer_email ?? "Cliente não identificado"}
 </h3>
 <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
 {quote.customer_phone && <span className="font-mono">{quote.customer_phone}</span>}
 {quote.customer_email && <span>{quote.customer_email}</span>}
 </div>
 </div>

 {quote.valid_until && (
 <div className="text-right">
 <p className="text-xs font-semibold text-muted-foreground uppercase">Validade</p>
 <p className="text-xs font-bold text-foreground font-mono mt-1">
 {new Date(quote.valid_until).toLocaleDateString("pt-BR")}
 </p>
 </div>
 )}
 </div>

 {travelMeta?.destination_city && (
 <div className="p-4 rounded-lg bg-muted/50 border border-border/50 flex items-center justify-between text-xs">
 <div className="flex items-center gap-2">
 <Plane className="size-4 text-primary" />
 <span className="font-bold text-foreground">{travelMeta.destination_city}</span>
 </div>
 <div className="text-muted-foreground">
 {travelMeta.adults_count || 1} adulto(s) · {travelMeta.children_count || 0} criança(s)
 </div>
 </div>
 )}
 </div>

 {/* Seção de Trechos Aéreos (se houver) */}
 {Array.isArray(travelMeta?.flights) && travelMeta.flights.length > 0 && (
 <div className="p-6 rounded-lg bg-card border border-border/80 space-y-4">
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <Plane className="size-4 text-primary" />
 <span>Malha Aérea Selecionada ({travelMeta.flights.length} trecho(s))</span>
 </h3>

 <div className="space-y-3">
 {travelMeta.flights.map((f: any, i: number) => (
 <div key={i} className="p-4 rounded-lg bg-background/70 border border-border/60 space-y-2 text-xs">
 <div className="flex items-center justify-between font-bold">
 <span className="text-foreground">{f.airline_name} ({f.flight_number || "Voo Regular"})</span>
 <Badge variant="secondary" className="text-xs">{f.cabin_class || "Econômica"}</Badge>
 </div>
 <div className="flex items-center justify-between text-muted-foreground">
 <span>{f.origin_iata} ({f.origin_city})  {f.destination_iata} ({f.destination_city})</span>
 <span className="font-mono font-bold text-foreground">{f.departure_time} - {f.arrival_time}</span>
 </div>
 {f.baggage_included && (
 <p className="text-xs text-muted-foreground">Bagagem: {f.baggage_included}</p>
 )}
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Seção de Hotéis (se houver) */}
 {Array.isArray(travelMeta?.hotels) && travelMeta.hotels.length > 0 && (
 <div className="p-6 rounded-lg bg-card border border-border/80 space-y-4">
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <Building2 className="size-4 text-primary" />
 <span>Acomodação e Hospedagem</span>
 </h3>

 <div className="space-y-3">
 {travelMeta.hotels.map((h: any, i: number) => (
 <div key={i} className="p-4 rounded-lg bg-background/70 border border-border/60 space-y-2 text-xs">
 <div className="flex items-center justify-between font-bold">
 <span className="text-foreground">{h.hotel_name}</span>
 <span className="text-warning-strong">{"".repeat(h.stars || 5)}</span>
 </div>
 <div className="flex items-center justify-between text-muted-foreground">
 <span>Quarto: {h.room_type}</span>
 <Badge variant="outline" className="text-xs font-semibold capitalize">
 {h.board_basis?.replace("_", " ") || "Regime a definir"}
 </Badge>
 </div>
 <p className="text-xs text-muted-foreground">{h.nights_count} noites de hospedagem</p>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Itens e Especificações Multi-Nicho do Orçamento */}
 {(Array.isArray(quote.items) && quote.items.length > 0) || Object.keys(normalizedCustomFields).length > 0 ? (
 <div className="p-6 rounded-lg bg-card border border-border/80 space-y-4">
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <Package className="size-4 text-primary" />
 <span>Itens e Campos Dinâmicos do Orçamento</span>
 </h3>

 {Array.isArray(quote.items) && quote.items.length > 0 && (
 <div className="overflow-x-auto scroll-area rounded-lg border border-border/60">
 <table className="w-full border-collapse text-left text-xs">
 <thead className="bg-muted/60 text-foreground">
 <tr>
 <th className="px-3 py-2 font-bold border-b border-border/60">Item / Serviço</th>
 <th className="px-3 py-2 font-bold border-b border-border/60 text-right">Qtd</th>
 <th className="px-3 py-2 font-bold border-b border-border/60 text-right">Unitário</th>
 <th className="px-3 py-2 font-bold border-b border-border/60 text-right">Total</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border/50">
 {quote.items.map((item: QuoteItemDTO) => (
 <tr key={item.id}>
 <td className="px-3 py-2 font-medium text-foreground">
 <span>{item.name}</span>
 {item.description && (
 <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
 )}
 </td>
 <td className="px-3 py-2 text-right font-mono text-muted-foreground">
 {item.quantity} un
 </td>
 <td className="px-3 py-2 text-right font-mono text-muted-foreground">
 {formatMoney(item.unit_price_cents)}
 </td>
 <td className="px-3 py-2 text-right font-mono font-bold text-foreground">
 {formatMoney(item.total_cents)}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}

 {Object.keys(normalizedCustomFields).length > 0 && (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/60">
 {Object.entries(normalizedCustomFields).map(([fieldKey, fieldValue]) => (
 <div key={fieldKey} className="space-y-1 text-xs">
 <span className="text-muted-foreground block">
 {formatDynamicFieldLabel(fieldKey)}
 </span>
 <strong className="text-foreground break-words">
 {formatFieldPrimitiveValue(fieldValue)}
 </strong>
 </div>
 ))}
 </div>
 )}
 </div>
 ) : null}

 {/* Mensagens e Histórico de Negociação */}
 <div className="p-6 rounded-lg bg-card border border-border/80 space-y-4">
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <MessageSquare className="size-4 text-primary" />
 <span>Histórico e Mensagens da Negociação</span>
 </h3>

 <div className="space-y-3">
 {quote.messages?.length === 0 ? (
 <p className="text-xs text-muted-foreground">Nenhuma mensagem registrada nesta negociação.</p>
 ) : (
 quote.messages?.map((msg: any) => (
 <div
 key={msg.id}
 className={`p-4 rounded-lg text-xs space-y-1 ${
 msg.is_internal ? "bg-warning/10 border border-warning/20 text-warning-strong " : "bg-muted/60"
 }`}
 >
 <div className="flex items-center justify-between font-semibold">
 <span>{msg.is_internal ? "Nota Interna" : "Comunicação"}</span>
 <span className="text-xs text-muted-foreground">{formatRelativeTime(msg.created_at)}</span>
 </div>
 <p>{msg.body}</p>
 </div>
 ))
 )}

 <div className="flex items-center gap-2 pt-2">
 <input
 value={messageText}
 onChange={(e) => setMessageText(e.target.value)}
 placeholder="Adicionar nota interna ou mensagem..."
 className="flex-1 h-10 px-4 rounded-lg border border-border bg-background text-xs"
 />
 <Button
 onClick={() => sendMessage.mutate()}
 disabled={!messageText.trim() || sendMessage.isPending}
 size="sm"
 className="h-10 px-4 rounded-lg text-xs font-bold min-h-11 sm:min-h-0"
 >
 <Send className="size-3.5" />
 </Button>
 </div>
 </div>
 </div>
 </div>

 {/* Coluna Lateral Financeira & Ações (4 Cols) */}
 <div className="lg:col-span-4 space-y-6">
 <div className="p-6 rounded-lg bg-card border border-border/80 space-y-4">
 <h3 className="text-sm font-bold text-foreground">Resumo Financeiro</h3>

 <div className="space-y-3 text-xs">
 <div className="flex justify-between">
 <span className="text-muted-foreground">Subtotal:</span>
 <span className="font-mono font-semibold">{formatMoney(quote.subtotal_cents || quote.total_cents)}</span>
 </div>
 {quote.discount_cents > 0 && (
 <div className="flex justify-between text-emerald-600">
 <span>Desconto:</span>
 <span className="font-mono font-semibold">- {formatMoney(quote.discount_cents)}</span>
 </div>
 )}
 <div className="flex justify-between text-base font-black pt-3 border-t border-border/60 text-foreground">
 <span>Total:</span>
 <span className="text-primary font-mono">{formatMoney(quote.total_cents)}</span>
 </div>
 </div>

 {/* Ações de Fechamento de Venda */}
 <div className="space-y-2 pt-4 border-t border-border/60">
 {isDraft && (
 <Button
 onClick={() => changeStatus.mutate("sent")}
 disabled={changeStatus.isPending}
 className="w-full h-10 rounded-lg text-xs font-bold bg-primary text-primary-foreground gap-2 cursor-pointer  min-h-11 sm:min-h-0"
 >
 <Send className="size-3.5" />
 <span>Marcar como Enviado</span>
 </Button>
 )}

 {isSent && (
 <div className="space-y-2">
 <Button
 onClick={() => handleApprove.mutate()}
 disabled={handleApprove.isPending}
 className="w-full h-10 rounded-lg text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-2 cursor-pointer min-h-11 sm:min-h-0"
 >
 <CheckCircle2 className="size-3.5" />
 <span>Aprovar e Fechar Venda</span>
 </Button>
 <Button
 onClick={() => changeStatus.mutate("rejected")}
 disabled={changeStatus.isPending}
 variant="outline"
 className="w-full h-10 rounded-lg text-xs font-bold text-destructive hover:bg-destructive/10 cursor-pointer min-h-11 sm:min-h-0"
 >
 <XCircle className="size-3.5" />
 <span>Marcar como Recusado</span>
 </Button>
 </div>
 )}
 </div>
 </div>

 <div className="p-5 rounded-lg bg-muted/40 border border-border/60 space-y-3 text-xs">
 <h4 className="font-bold text-foreground">Ações de Conversão Rápida</h4>
 <div className="space-y-2">
 <Button asChild variant="outline" className="w-full h-9 rounded-lg text-xs font-semibold justify-start gap-2 min-h-11 sm:min-h-0">
 <Link to="/workspace/turismo/propostas/$id" params={{ id: quote.id }}>
 <Download className="size-3.5 text-primary" />
 <span>Exportar Lâmina (PDF/PNG)</span>
 </Link>
 </Button>
 <Button onClick={handleCopyPublicLink} variant="outline" className="w-full h-9 rounded-lg text-xs font-semibold justify-start gap-2 min-h-11 sm:min-h-0">
 <Share2 className="size-3.5 text-primary" />
 <span>Link Direto para o WhatsApp</span>
 </Button>
 </div>
 </div>
 </div>
 </div>

 <Dialog open={isContractDialogOpen} onOpenChange={setIsContractDialogOpen}>
 <DialogContent size="lg">
 <DialogHeader>
 <DialogTitle>Configurar Contrato Tabular</DialogTitle>
 <DialogDescription>
 Escolha a minuta jurídica e selecione quais tabelas de dados do orçamento entram no documento.
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-4 py-2">
 <div className="space-y-2">
 <Label htmlFor="quote-contract-template">Modelo de Minuta</Label>
 <select
 id="quote-contract-template"
 value={selectedTemplateId}
 onChange={(e) => setSelectedTemplateId(e.target.value)}
 className="w-full h-11 min-h-11 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 {ADVANCED_CONTRACT_TEMPLATES.map((tpl) => (
 <option key={tpl.id} value={tpl.id}>
 {tpl.title}
 </option>
 ))}
 </select>
 </div>

 <div className="space-y-2">
 <Label htmlFor="quote-contract-title">Título do Contrato (opcional)</Label>
 <Input
 id="quote-contract-title"
 value={customContractTitle}
 onChange={(e) => setCustomContractTitle(e.target.value)}
 placeholder={travelMeta?.title || `Contrato — ${quote.quote_number}`}
 className="h-11 min-h-11"
 />
 </div>

 <div className="space-y-2 pt-2 border-t border-border/60">
 <span className="text-xs font-semibold text-foreground block">
 Tabelas e Seções Incluídas
 </span>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {[
 { key: "showItemsTable", label: "Tabela de Itens e Serviços" },
 { key: "showSpecsTable", label: "Ficha Técnica / Especificações" },
 { key: "showCustomFieldsTable", label: "Campos Personalizados do Nicho" },
 { key: "showItineraryTable", label: "Roteiro Dia a Dia" },
 { key: "showPassengersTable", label: "Manifesto de Passageiros" },
 { key: "showFinancialTable", label: "Cronograma Financeiro" },
 { key: "includeLegalClauses", label: "Cláusulas Jurídicas Completas" },
 ].map((item) => {
 const k = item.key as keyof typeof sectionConfig;
 return (
 <div key={item.key} className="flex items-center justify-between gap-2 py-2">
 <Label htmlFor={`quote-sec-${item.key}`} className="text-xs font-medium cursor-pointer">
 {item.label}
 </Label>
 <Switch
 id={`quote-sec-${item.key}`}
 checked={sectionConfig[k]}
 onCheckedChange={(checked) =>
 setSectionConfig((prev) => ({ ...prev, [k]: checked }))
 }
 />
 </div>
 );
 })}
 </div>
 </div>
 </div>

 <DialogFooter className="gap-2">
 <Button
 type="button"
 variant="outline"
 onClick={() => setIsContractDialogOpen(false)}
 className="h-11 min-h-11"
 >
 Cancelar
 </Button>
 <Button
 type="button"
 disabled={isCreatingContract}
 onClick={handleGenerateContract}
 className="h-11 min-h-11 gap-2"
 >
 {isCreatingContract && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />}
 <span>Emitir Contrato Tabular</span>
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
