import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Layers, Link as LinkIcon, FileText, Loader2, CheckCircle2, AlertCircle, PackageCheck, Utensils, ChevronRight } from 'lucide-react';
import { importFullCatalogMenu, type ImportedCatalogDTO } from "@/services/api-orchestrator.functions";
import { batchCreateCatalogMenu } from "@/services/admin-catalog.functions";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";

interface ImportCatalogModalProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 onSuccess?: () => void;
}

export function ImportCatalogModal({
 open,
 onOpenChange,
 onSuccess,
}: ImportCatalogModalProps) {
 const queryClient = useQueryClient();
 const [activeTab, setActiveTab] = useState<"url" | "text">("url");
 const [urlInput, setUrlInput] = useState("");
 const [rawTextInput, setRawTextInput] = useState("");
 const [previewData, setPreviewData] = useState<ImportedCatalogDTO | null>(null);

 // Mutação para extrair com IA
 const parseMutation = useMutation({
 mutationFn: async () => {
 if (activeTab === "url") {
 if (!urlInput.trim()) throw new Error("Informe a URL do cardápio.");
 return await importFullCatalogMenu({ data: { url: urlInput.trim() } });
 } else {
 if (!rawTextInput.trim()) throw new Error("Cole o conteúdo do cardápio.");
 return await importFullCatalogMenu({ data: { rawText: rawTextInput.trim() } });
 }
 },
 onSuccess: (data) => {
 setPreviewData(data);
 toast.success("Cardápio analisado com sucesso! Confira a prévia abaixo.");
 },
 onError: (err: any) => {
 toast.error(err.message || "Erro ao analisar cardápio.");
 },
 });

 // Mutação para salvar no banco
 const commitMutation = useMutation({
 mutationFn: async () => {
 if (!previewData || !previewData.categories || previewData.categories.length === 0) {
 throw new Error("Nenhuma categoria para importar.");
 }
 return await batchCreateCatalogMenu({
 data: {
 categories: previewData.categories.map((c) => ({
 name: c.name,
 description: c.description,
 products: c.products.map((p) => ({
 title: p.title,
 description: p.description,
 price_cents: p.price_cents,
 image_url: p.image_url,
 selling_unit: p.selling_unit || "un",
 })),
 })),
 },
 });
 },
 onSuccess: (res) => {
 toast.success(
 `Sucesso! ${res.productsCount} produto(s) e ${res.categoriesCount} categoria(s) adicionados ao catálogo.`,
 );
 queryClient.invalidateQueries({ queryKey: ["admin_products"] });
 queryClient.invalidateQueries({ queryKey: ["admin-products-catalog"] });
 queryClient.invalidateQueries({ queryKey: ["catalog_categories"] });
 onOpenChange(false);
 setPreviewData(null);
 setUrlInput("");
 setRawTextInput("");
 onSuccess?.();
 },
 onError: (err: any) => {
 toast.error(err.message || "Erro ao salvar itens no catálogo.");
 },
 });

 const totalProductsCount =
 previewData?.categories?.reduce((acc, cat) => acc + (cat.products?.length || 0), 0) || 0;

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="sm:max-w-2xl w-full p-0 gap-0 overflow-hidden rounded-2xl bg-card border border-border max-h-[90vh] flex flex-col">
 <DialogHeader className="p-5 border-b border-border/80 bg-muted/20">
 <div className="flex items-center gap-2.5">
 <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
 <Layers className="size-4" />
 </div>
 <div>
 <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
 <span>Importador de Cardápio e Catálogo (IA)</span>
 <Badge variant="outline" className="text-[10px] font-mono border-primary/40 text-primary">
 iFood / Link / Texto
 </Badge>
 </DialogTitle>
 <DialogDescription className="text-xs text-muted-foreground mt-0.5">
 Importe categorias, descrições e preços em lote sem digitação manual
 </DialogDescription>
 </div>
 </div>
 </DialogHeader>

 <div className="p-5 space-y-4 flex-1 overflow-y-auto no-scrollbar">
 {!previewData ? (
 <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
 <TabsList className="grid grid-cols-2 h-9 p-1 bg-muted/50 rounded-xl mb-4">
 <TabsTrigger value="url" className="text-xs font-bold gap-1.5 rounded-lg">
 <LinkIcon className="size-3.5" />
 <span>Link da Loja / iFood</span>
 </TabsTrigger>
 <TabsTrigger value="text" className="text-xs font-bold gap-1.5 rounded-lg">
 <FileText className="size-3.5" />
 <span>Colar Texto / PDF</span>
 </TabsTrigger>
 </TabsList>

 <TabsContent value="url" className="space-y-3 mt-0">
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-foreground">
 Link do cardápio digital ou loja
 </label>
 <Input
 value={urlInput}
 onChange={(e) => setUrlInput(e.target.value)}
 placeholder="https://www.ifood.com.br/delivery/cidade-uf/sua-loja/..."
 className="text-xs rounded-xl h-10 font-mono"
 />
 <p className="text-[11px] text-muted-foreground">
 Suporta links de cardápios públicos do iFood, Anota AI, Goomer, InstaDelivery ou sites próprios.
 </p>
 </div>
 </TabsContent>

 <TabsContent value="text" className="space-y-3 mt-0">
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-foreground">
 Texto ou lista de produtos
 </label>
 <Textarea
 value={rawTextInput}
 onChange={(e) => setRawTextInput(e.target.value)}
 placeholder={`Hambúrgueres Artesanais:\n- Smash Burger: Pão brioche, blend 100g, cheddar - R$ 24,90\n- Bacon Cheddar: Blend 180g, bacon crocante - R$ 34,90\n\nBebidas:\n- Coca-Cola 350ml - R$ 6,50\n- Suco Natural Laranja 400ml - R$ 9,00`}
 rows={7}
 className="text-xs rounded-xl font-mono"
 />
 <p className="text-[11px] text-muted-foreground">
 Cole o cardápio em formato de texto, tabela ou tópicos. A IA organizará automaticamente.
 </p>
 </div>
 </TabsContent>
 </Tabs>
 ) : (
 /* Visualização da Prévia da Extração */
 <div className="space-y-4">
 <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
 <div className="flex items-center gap-2">
 <PackageCheck className="size-5 text-primary" />
 <div>
 <h4 className="text-xs font-bold text-foreground">
 {previewData.store_name || "Cardápio Analisado"}
 </h4>
 <p className="text-[11px] text-muted-foreground">
 {previewData.categories?.length || 0} categoria(s) • {totalProductsCount} produto(s)
 </p>
 </div>
 </div>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => setPreviewData(null)}
 className="text-xs h-7 rounded-lg"
 >
 Alterar Link / Dados
 </Button>
 </div>

 <ScrollArea className="max-h-[40vh] pr-2">
 <div className="space-y-3">
 {previewData.categories?.map((cat, cIdx) => (
 <div
 key={cIdx}
 className="p-3 rounded-xl border border-border/70 bg-card space-y-2 text-xs"
 >
 <div className="flex items-center justify-between">
 <span className="font-bold text-foreground uppercase tracking-wider text-[11px]">
 {cat.name}
 </span>
 <Badge variant="secondary" className="text-[10px] font-mono">
 {cat.products?.length || 0} itens
 </Badge>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
 {cat.products?.map((prod, pIdx) => (
 <div
 key={pIdx}
 className="p-2 rounded-lg bg-muted/30 border border-border/40 flex items-center justify-between gap-2"
 >
 <div className="truncate">
 <p className="font-semibold text-foreground truncate text-[11px]">
 {prod.title}
 </p>
 {prod.description && (
 <p className="text-[10px] text-muted-foreground truncate">
 {prod.description}
 </p>
 )}
 </div>
 <span className="font-mono font-bold text-primary shrink-0 text-xs">
 {formatMoney(prod.price_cents)}
 </span>
 </div>
 ))}
 </div>
 </div>
 ))}
 </div>
 </ScrollArea>
 </div>
 )}
 </div>

 <DialogFooter className="p-4 border-t border-border/80 bg-muted/10 flex items-center justify-between gap-2 sm:justify-between">
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => onOpenChange(false)}
 className="rounded-xl text-xs font-semibold"
 >
 Cancelar
 </Button>

 {!previewData ? (
 <Button
 type="button"
 size="sm"
 disabled={parseMutation.isPending}
 onClick={() => parseMutation.mutate()}
 className="h-10 px-4 rounded-xl font-bold text-xs bg-primary text-primary-foreground gap-2 cursor-pointer shadow-xs"
 >
 {parseMutation.isPending ? (
 <Loader2 className="size-4 animate-spin" />
 ) : (
 <Layers className="size-4" />
 )}
 <span>Analisar Cardápio com IA</span>
 </Button>
 ) : (
 <Button
 type="button"
 size="sm"
 disabled={commitMutation.isPending || totalProductsCount === 0}
 onClick={() => commitMutation.mutate()}
 className="h-10 px-5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-2 cursor-pointer shadow-xs"
 >
 {commitMutation.isPending ? (
 <Loader2 className="size-4 animate-spin" />
 ) : (
 <CheckCircle2 className="size-4" />
 )}
 <span>Importar {totalProductsCount} Itens para Meu Catálogo</span>
 </Button>
 )}
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
}
