import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
 Flame,
 Plus,
 Percent,
 RefreshCw,
 Tag,
 Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { SheetPage } from "@/components/ui/sheet-page";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import {
 listStorePromotions,
 createPromotion,
 togglePromotionStatus,
 type PromotionDTO,
} from "@/services/promotions.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/workspace/marketing/promocoes")({
 head: () => ({
 meta: [{ title: "Promoções & Ofertas | Workspace Waesy" }],
 }),
 loader: async () => {
   try {
 const promotions = await listStorePromotions();
 return { promotions };
   } catch (err) {
     console.error("[loader:workspace.marketing.promocoes] Unhandled loader error:", err);
     return { promotions: null };
   }
 },
 component: WorkspacePromotionsPage,
});

function WorkspacePromotionsPage() {
 const { promotions: initialPromos } = ((Route.useLoaderData?.() as any) || {});
 const [promos, setPromos] = useState<PromotionDTO[]>(initialPromos);
 const [isDialogOpen, setIsDialogOpen] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);

 // Form State
 const [title, setTitle] = useState("");
 const [description, setDescription] = useState("");
 const [type, setType] = useState<PromotionDTO["type"]>("flash_offer");
 const [discountPercent, setDiscountPercent] = useState<number>(20);
 const [buyQty, setBuyQty] = useState<number>(2);
 const [getQty, setGetQty] = useState<number>(1);
 const [durationHours, setDurationHours] = useState<number>(24);

 const handleToggle = async (promoId: string, currentStatus: boolean) => {
 const nextStatus = !currentStatus;
 setPromos((prev) => prev.map((p) => (p.id === promoId ? { ...p, is_active: nextStatus } : p)));

 try {
 await togglePromotionStatus({
 data: { id: promoId, is_active: nextStatus },
 });
 toast.success(nextStatus ? "Promoção ativada!" : "Promoção pausada.");
 } catch {
 toast.error("Erro ao alterar status.");
 setPromos((prev) =>
 prev.map((p) => (p.id === promoId ? { ...p, is_active: currentStatus } : p)),
 );
 }
 };

 const handleCreate = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!title) {
 toast.error("Informe o título da promoção.");
 return;
 }

 setIsSubmitting(true);
 try {
 const endsAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();

 await createPromotion({
 data: {
 title,
 description,
 type,
 discount_percent: discountPercent,
 buy_qty: buyQty,
 get_qty: getQty,
 ends_at: endsAt,
 },
 });

 toast.success("Promoção criada com sucesso!");
 setIsDialogOpen(false);
 const updated = await listStorePromotions();
 setPromos(updated);

 setTitle("");
 setDescription("");
 } catch (err: unknown) {
 toast.error("Erro ao salvar promoção.");
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
 {/* ── PageHeader Canônico ── */}
 <PageHeader
 eyebrow="Marketing"
 title="Promoções"
 actions={
 <Button
 onClick={() => setIsDialogOpen(true)}
 size="sm"
 className="rounded-xl font-bold bg-primary text-primary-foreground text-xs gap-1.5 h-9 px-4 cursor-pointer"
 >
 <Plus className="size-3.5" />
 <span>Nova Promoção</span>
 </Button>
 }
 />

 {/* ── Side Sheet: Nova Oferta ── */}
 <SheetPage
 open={isDialogOpen}
 onOpenChange={setIsDialogOpen}
 title="Nova Promoção ou Oferta"
 size="lg"
 footer={
 <>
 <Button
 type="button"
 variant="outline"
 onClick={() => setIsDialogOpen(false)}
 className="h-10 px-4 rounded-xl text-xs font-bold"
 >
 Cancelar
 </Button>
 <Button
 onClick={handleCreate}
 disabled={isSubmitting}
 className="h-10 px-5 rounded-xl font-bold text-xs bg-primary text-primary-foreground gap-1.5"
 >
 {isSubmitting ? (
 <>
 <Loader2 className="size-3.5 animate-spin" />
 <span>Criando...</span>
 </>
 ) : (
 "Criar Promoção"
 )}
 </Button>
 </>
 }
 >
 <form onSubmit={handleCreate} className="space-y-6 py-4">
 <div className="space-y-4">
 <div className="space-y-1.5">
 <label className="font-semibold text-xs text-foreground">Título da Promoção *</label>
 <Input
 placeholder="Ex: Terça do Burger 20% OFF, Combo Família..."
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 className="rounded-xl text-xs h-10"
 />
 </div>

 <div className="space-y-1.5">
 <label className="font-semibold text-xs text-foreground">Mecânica Promocional</label>
 <Select value={type} onValueChange={(val: any) => setType(val)}>
 <SelectTrigger className="rounded-xl text-xs h-10">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-xl text-xs">
 <SelectItem value="flash_offer">
 Oferta Relâmpago (Contagem Regressiva)
 </SelectItem>
 <SelectItem value="percentage_discount">
 Desconto Percentual Direto (%)
 </SelectItem>
 <SelectItem value="buy_x_get_y">Compre X e Leve Y (Combo)</SelectItem>
 <SelectItem value="progressive_quantity">
 Desconto Progressivo por Quantidade
 </SelectItem>
 </SelectContent>
 </Select>
 </div>

 {(type === "flash_offer" || type === "percentage_discount") && (
 <div className="space-y-4">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <label className="font-semibold text-xs text-foreground">Desconto (%)</label>
 <Input
 type="number"
 min={1}
 max={90}
 value={discountPercent}
 onChange={(e) => setDiscountPercent(Number(e.target.value))}
 className="rounded-xl text-xs h-10"
 />
 </div>
 <div className="space-y-1.5">
 <label className="font-semibold text-xs text-foreground">Duração (Horas)</label>
 <Input
 type="number"
 min={1}
 max={168}
 value={durationHours}
 onChange={(e) => setDurationHours(Number(e.target.value))}
 className="rounded-xl text-xs h-10"
 />
 </div>
 </div>

 <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-2">
 <label className="font-bold text-xs text-foreground flex items-center gap-1.5">
 <RefreshCw className="size-3.5 text-primary" />
 <span>Auto-Renovação de Estoque Promocional</span>
 </label>
 <p className="text-[11px] text-muted-foreground">
 Ao esgotar o lote inicial, reativa automaticamente uma nova cota de itens em oferta.
 </p>
 </div>
 </div>
 )}

 {type === "buy_x_get_y" && (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <label className="font-semibold text-xs text-foreground">Compre Quantidade</label>
 <Input
 type="number"
 min={1}
 value={buyQty}
 onChange={(e) => setBuyQty(Number(e.target.value))}
 className="rounded-xl text-xs h-10"
 />
 </div>
 <div className="space-y-1.5">
 <label className="font-semibold text-xs text-foreground">Pague Quantidade</label>
 <Input
 type="number"
 min={1}
 value={getQty}
 onChange={(e) => setGetQty(Number(e.target.value))}
 className="rounded-xl text-xs h-10"
 />
 </div>
 </div>
 )}

 <div className="space-y-1.5">
 <label className="font-semibold text-xs text-foreground">
 Regulamento / Descrição Curta
 </label>
 <Textarea
 placeholder="Válido enquanto durarem os estoques. Limite de 2 por cliente."
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 rows={2}
 className="rounded-xl text-xs"
 />
 </div>
 </div>
 </form>
 </SheetPage>

 {/* ── Métricas Resumidas ── */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
 <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
 Promoções Ativas
 </span>
 <div className="text-2xl font-mono font-bold text-foreground">
 {promos.filter((p) => p.is_active).length}
 </div>
 </div>

 <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
 <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
 Total de Ofertas Criadas
 </span>
 <div className="text-2xl font-mono font-bold text-foreground">{promos.length}</div>
 </div>

 <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
 <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
 Desconto Médio Aplicado
 </span>
 <div className="text-2xl font-mono font-bold text-primary">
 {promos.length > 0
 ? `${Math.round(
 promos.reduce((acc, p) => acc + (p.discount_percent || 0), 0) /
 Math.max(1, promos.length),
 )}%`
 : "0%"}
 </div>
 </div>
 </div>

 {/* ── Lista de Promoções ou Empty State ── */}
 <div className="space-y-3">
 {promos.length === 0 ? (
 <div className="py-12 text-center space-y-4 border border-dashed border-border/70 rounded-2xl bg-card/40">
 <div className="size-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
 <Tag className="size-6" />
 </div>
 <div className="space-y-1">
 <h3 className="text-sm font-bold text-foreground">Nenhuma promoção ativa</h3>
 <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 Crie sua primeira oferta relâmpago para aparecer em destaque na vitrine e atrair mais pedidos.
 </p>
 </div>
 <Button onClick={() => setIsDialogOpen(true)} size="sm" variant="outline" className="rounded-xl text-xs font-bold h-9">
 <Plus className="size-3.5 mr-1" />
 Criar Primeira Promoção
 </Button>
 </div>
 ) : (
 promos.map((promo) => (
 <div
 key={promo.id}
 className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-card border border-border/70 gap-4 hover:border-border transition-all shadow-2xs"
 >
 <div className="flex items-center gap-3.5 min-w-0">
 <div
 className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
 promo.type === "flash_offer"
 ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
 : "bg-primary/10 text-primary border border-primary/20"
 }`}
 >
 {promo.type === "flash_offer" ? (
 <Flame className="size-5" />
 ) : (
 <Percent className="size-5" />
 )}
 </div>

 <div className="space-y-0.5 min-w-0">
 <div className="flex items-center gap-2">
 <h3 className="text-sm font-bold text-foreground truncate">{promo.title}</h3>
 <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase font-mono bg-primary/10 text-primary">
 {promo.discount_percent ? `${promo.discount_percent}% OFF` : "COMBO"}
 </span>
 </div>
 {promo.description && (
 <p className="text-xs text-muted-foreground line-clamp-1">
 {promo.description}
 </p>
 )}
 </div>
 </div>

 <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-border/40">
 <div className="text-left sm:text-right">
 <span className="text-[11px] text-muted-foreground block font-mono">
 {promo.ends_at
 ? `Até ${new Date(promo.ends_at).toLocaleDateString("pt-BR")}`
 : "Sem data limite"}
 </span>
 </div>

 <div className="flex items-center gap-2 shrink-0">
 <span className="text-xs font-semibold text-muted-foreground">
 {promo.is_active ? "Ativa" : "Pausada"}
 </span>
 <Switch
 checked={promo.is_active}
 onCheckedChange={() => handleToggle(promo.id, promo.is_active)}
 />
 </div>
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 );
}
