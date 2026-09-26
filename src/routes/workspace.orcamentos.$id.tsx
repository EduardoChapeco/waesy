import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
 ChevronLeft,
 Send,
 CheckCircle2,
 XCircle,
 Clock,
 MessageSquare,
 Package,
 Wrench,
 Box,
 Hash,
 Loader2,
 AlertCircle,
 FileSpreadsheet,
 Plane,
 Building2,
 FileCheck2,
 ExternalLink,
 Copy,
 Download,
 Share2,
 Calendar,
 User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
 getQuoteDetail,
 updateQuoteStatus,
 approveQuote,
 addQuoteMessage,
 type QuoteItemDTO,
} from "@/services/quotes.functions";
import { createContractFromProposal } from "@/services/travel-contract.functions";
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

 // Parse conditions JSON for Travelos data if present
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
 setIsCreatingContract(true);
 try {
 const res = await createContractFromProposal({
 data: { proposalId: quote.id },
 });
 if (res?.success) {
 toast.success("Contrato oficial emitido com sucesso!");
 navigate({ to: "/workspace/turismo/contratos" });
 }
 } catch (err: any) {
 toast.error(err.message || "Erro ao emitir contrato.");
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
 <Loader2 className="size-6 animate-spin text-muted-foreground" />
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
 <Button asChild variant="ghost" size="icon" className="rounded-xl size-9">
 <Link to="/workspace/orcamentos">
 <ChevronLeft className="size-4" />
 </Link>
 </Button>
 <div>
 <div className="flex items-center gap-2">
 <span className="text-xs font-mono font-bold text-muted-foreground">{quote.quote_number}</span>
 <Badge
 variant={isTerminal ? "default" : "secondary"}
 className="text-[10px] font-semibold px-2 py-0.5 rounded-lg"
 >
 {quote.status}
 </Badge>
 </div>
 <h1 className="text-xl font-bold text-foreground">
 {travelMeta?.title || quote.internal_notes || "Orçamento & Proposta"}
 </h1>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <Button
 asChild
 variant="outline"
 className="h-10 rounded-xl text-xs font-bold gap-1.5 cursor-pointer shadow-xs"
 >
 <Link to="/workspace/turismo/propostas/$id" params={{ id: quote.id }}>
 <FileSpreadsheet className="size-3.5 text-primary" />
 <span>Studio Visual de Propostas</span>
 </Link>
 </Button>

 <Button
 onClick={handleCopyPublicLink}
 variant="outline"
 className="h-10 rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
 >
 <Copy className="size-3.5" />
 <span>Copiar Link do Cliente</span>
 </Button>

 <Button
 onClick={handleGenerateContract}
 disabled={isCreatingContract}
 className="h-10 rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground cursor-pointer shadow-sm"
 >
 <FileCheck2 className="size-3.5" />
 <span>{isCreatingContract ? "Emitindo..." : "Gerar Contrato (SHA-256)"}</span>
 </Button>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
 {/* Coluna Principal (8 Cols) */}
 <div className="lg:col-span-8 space-y-6">
 {/* Cabeçalho de Dados do Cliente e Viagem */}
 <div className="p-6 rounded-2xl bg-card border border-border/80 space-y-4">
 <div className="flex items-start justify-between">
 <div>
 <p className="text-xs font-semibold text-muted-foreground uppercase">Cliente Contratante</p>
 <h3 className="text-lg font-bold text-foreground mt-0.5">
 {quote.customer_name ?? quote.customer_email ?? "Cliente não identificado"}
 </h3>
 <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
 {quote.customer_phone && <span className="font-mono">📱 {quote.customer_phone}</span>}
 {quote.customer_email && <span>✉️ {quote.customer_email}</span>}
 </div>
 </div>

 {quote.valid_until && (
 <div className="text-right">
 <p className="text-[11px] font-semibold text-muted-foreground uppercase">Validade</p>
 <p className="text-xs font-bold text-foreground font-mono mt-0.5">
 {new Date(quote.valid_until).toLocaleDateString("pt-BR")}
 </p>
 </div>
 )}
 </div>

 {travelMeta?.destination_city && (
 <div className="p-3.5 rounded-2xl bg-muted/50 border border-border/50 flex items-center justify-between text-xs">
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
 <div className="p-6 rounded-2xl bg-card border border-border/80 space-y-4">
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <Plane className="size-4 text-primary" />
 <span>Malha Aérea Selecionada ({travelMeta.flights.length} trecho(s))</span>
 </h3>

 <div className="space-y-3">
 {travelMeta.flights.map((f: any, i: number) => (
 <div key={i} className="p-4 rounded-2xl bg-background/70 border border-border/60 space-y-2 text-xs">
 <div className="flex items-center justify-between font-bold">
 <span className="text-foreground">{f.airline_name} ({f.flight_number || "Voo Regular"})</span>
 <Badge variant="secondary" className="text-[10px]">{f.cabin_class || "Econômica"}</Badge>
 </div>
 <div className="flex items-center justify-between text-muted-foreground">
 <span>{f.origin_iata} ({f.origin_city}) ➔ {f.destination_iata} ({f.destination_city})</span>
 <span className="font-mono font-bold text-foreground">{f.departure_time} - {f.arrival_time}</span>
 </div>
 {f.baggage_included && (
 <p className="text-[11px] text-muted-foreground">🧳 {f.baggage_included}</p>
 )}
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Seção de Hotéis (se houver) */}
 {Array.isArray(travelMeta?.hotels) && travelMeta.hotels.length > 0 && (
 <div className="p-6 rounded-2xl bg-card border border-border/80 space-y-4">
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <Building2 className="size-4 text-primary" />
 <span>Acomodação & Hospedagem</span>
 </h3>

 <div className="space-y-3">
 {travelMeta.hotels.map((h: any, i: number) => (
 <div key={i} className="p-4 rounded-2xl bg-background/70 border border-border/60 space-y-2 text-xs">
 <div className="flex items-center justify-between font-bold">
 <span className="text-foreground">{h.hotel_name}</span>
 <span className="text-amber-500">{"★".repeat(h.stars || 5)}</span>
 </div>
 <div className="flex items-center justify-between text-muted-foreground">
 <span>Quarto: {h.room_type}</span>
 <Badge variant="outline" className="text-[10px] font-semibold capitalize">
 {h.board_basis?.replace("_", " ") || "Regime a definir"}
 </Badge>
 </div>
 <p className="text-[11px] text-muted-foreground">🌙 {h.nights_count} noites de hospedagem</p>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Mensagens e Histórico de Negociação */}
 <div className="p-6 rounded-2xl bg-card border border-border/80 space-y-4">
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <MessageSquare className="size-4 text-primary" />
 <span>Histórico & Mensagens da Negociação</span>
 </h3>

 <div className="space-y-3">
 {quote.messages?.length === 0 ? (
 <p className="text-xs text-muted-foreground">Nenhuma mensagem registrada nesta negociação.</p>
 ) : (
 quote.messages?.map((msg: any) => (
 <div
 key={msg.id}
 className={`p-3.5 rounded-2xl text-xs space-y-1 ${
 msg.is_internal ? "bg-amber-500/10 border border-amber-500/20 text-amber-950 dark:text-amber-200" : "bg-muted/60"
 }`}
 >
 <div className="flex items-center justify-between font-semibold">
 <span>{msg.is_internal ? "🔒 Nota Interna" : "Comunicação"}</span>
 <span className="text-[10px] text-muted-foreground">{formatRelativeTime(msg.created_at)}</span>
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
 className="flex-1 h-10 px-3.5 rounded-xl border border-border bg-background text-xs"
 />
 <Button
 onClick={() => sendMessage.mutate()}
 disabled={!messageText.trim() || sendMessage.isPending}
 size="sm"
 className="h-10 px-4 rounded-xl text-xs font-bold"
 >
 <Send className="size-3.5" />
 </Button>
 </div>
 </div>
 </div>
 </div>

 {/* Coluna Lateral Financeira & Ações (4 Cols) */}
 <div className="lg:col-span-4 space-y-6">
 <div className="p-6 rounded-2xl bg-card border border-border/80 space-y-4">
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
 className="w-full h-10 rounded-xl text-xs font-bold bg-primary text-primary-foreground gap-2 cursor-pointer shadow-sm"
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
 className="w-full h-10 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2 cursor-pointer"
 >
 <CheckCircle2 className="size-3.5" />
 <span>Aprovar & Fechar Venda</span>
 </Button>
 <Button
 onClick={() => changeStatus.mutate("rejected")}
 disabled={changeStatus.isPending}
 variant="outline"
 className="w-full h-10 rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10 cursor-pointer"
 >
 <XCircle className="size-3.5" />
 <span>Marcar como Recusado</span>
 </Button>
 </div>
 )}
 </div>
 </div>

 <div className="p-5 rounded-2xl bg-muted/40 border border-border/60 space-y-3 text-xs">
 <h4 className="font-bold text-foreground">Ações de Conversão Rápida</h4>
 <div className="space-y-2">
 <Button asChild variant="outline" className="w-full h-9 rounded-xl text-xs font-semibold justify-start gap-2">
 <Link to="/workspace/turismo/propostas/$id" params={{ id: quote.id }}>
 <Download className="size-3.5 text-primary" />
 <span>Exportar Lâmina (PDF/PNG)</span>
 </Link>
 </Button>
 <Button onClick={handleCopyPublicLink} variant="outline" className="w-full h-9 rounded-xl text-xs font-semibold justify-start gap-2">
 <Share2 className="size-3.5 text-primary" />
 <span>Link Direto para o WhatsApp</span>
 </Button>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}
