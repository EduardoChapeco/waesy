import { useState, useMemo } from "react";
import { QrCode, Copy, Check, Share2, Download, Printer, ExternalLink, Store } from "lucide-react";
import { WhatsappLogo } from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getNicheSemantics } from "@/lib/niche-semantics";

interface StoreShareQrModalProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 store: {
 id: string;
 name: string;
 slug?: string | null;
 logo_url?: string | null;
 segment?: string | null;
 type?: string | null;
 category?: string | null;
 settings?: any;
 } | null;
}

export function StoreShareQrModal({
 open,
 onOpenChange,
 store,
}: StoreShareQrModalProps) {
 const [copied, setCopied] = useState(false);

 const semantics = useMemo(() => (store ? getNicheSemantics(store) : null), [store]);

 if (!store || !semantics) return null;

 const origin = typeof window !== "undefined" ? window.location.origin : "https://usewaesy.pages.dev";
 const storeUrl = store.slug
 ? `${origin}/@${store.slug}`
 : `${origin}/perfil-da-loja?storeId=${store.id}`;

 const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=15&data=${encodeURIComponent(storeUrl)}`;

 const defaultShareText = semantics.shareMessageTemplate
 ? semantics.shareMessageTemplate(store.name, storeUrl)
 : `Olá! Conheça ${store.name}:\n${storeUrl}`;

 const handleCopyLink = async () => {
 try {
 if (typeof navigator !== "undefined" && navigator.clipboard) {
 await navigator.clipboard.writeText(storeUrl);
 setCopied(true);
 toast.success("Link copiado com sucesso!");
 setTimeout(() => setCopied(false), 2000);
 }
 } catch {
 toast.error("Não foi possível copiar o link automaticamente.");
 }
 };

 const handleShareNative = async () => {
 if (typeof navigator !== "undefined" && navigator.share) {
 try {
 await navigator.share({
 title: store.name,
 text: defaultShareText,
 url: storeUrl,
 });
 toast.success("Compartilhamento concluído!");
 } catch (err: any) {
 if (err.name !== "AbortError") {
 handleCopyLink();
 }
 }
 } else {
 handleCopyLink();
 }
 };

 const handleShareWhatsApp = () => {
 const text = encodeURIComponent(defaultShareText);
 window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
 };

 const handleDownloadQr = () => {
 const link = document.createElement("a");
 link.href = qrImageUrl;
 link.download = `qrcode-${store.slug || semantics.qrDownloadFilename || "loja"}.png`;
 link.target = "_blank";
 link.click();
 toast.success("Download do QR Code em alta resolução iniciado!");
 };

 const handlePrint = () => {
 window.print();
 };

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-lg border-border/70">
 <DialogHeader className="p-6 pb-2 text-left space-y-1">
 <div className="flex items-center gap-2">
 <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary uppercase">
 Divulgação & Vendas • {semantics.name}
 </Badge>
 </div>
 <DialogTitle className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
 <QrCode className="size-5 text-primary" />
 <span>{semantics.shareTitle}</span>
 </DialogTitle>
 <DialogDescription className="text-xs text-muted-foreground">
 {semantics.shareSubtitle}
 </DialogDescription>
 </DialogHeader>

 <div className="px-6 py-2 space-y-5">
 {/* Card Visual de Display para Impressão */}
 <div className="p-5 rounded-lg bg-muted/20 border border-border/60 flex flex-col items-center justify-center text-center space-y-3 shadow-2xs print:border-none print:shadow-none">
 <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary overflow-hidden">
 {store.logo_url ? (
 <img src={store.logo_url} alt={store.name} className="size-full object-cover" />
 ) : (
 <Store className="size-5" />
 )}
 </div>
 <div>
 <h4 className="text-sm font-bold text-foreground">{store.name}</h4>
 <p className="text-[11px] text-muted-foreground">{semantics.qrCardCallout}</p>
 </div>

 {/* Imagem do QR Code em Alta Resolução */}
 <div className="p-3 rounded-lg bg-white border border-border/80 shadow-xs">
 <img
 src={qrImageUrl}
 alt={`QR Code de ${store.name}`}
 className="size-48 object-contain"
 />
 </div>
 </div>

 {/* Link Copiável */}
 <div className="space-y-2">
 <span className="text-xs font-semibold text-foreground">{semantics.directLinkLabel}</span>
 <div className="flex items-center gap-2">
 <Input
 readOnly
 value={storeUrl}
 className="h-10 text-xs font-mono bg-muted/40 rounded-lg"
 />
 <Button
 type="button"
 onClick={handleCopyLink}
 size="sm"
 variant="outline"
 className="h-10 px-3 rounded-lg text-xs font-bold shrink-0 gap-2 cursor-pointer"
 >
 {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
 <span>{copied ? "Copiado" : "Copiar"}</span>
 </Button>
 </div>
 </div>

 {/* Botões de Compartilhamento Rápido */}
 <div className="grid grid-cols-2 gap-2">
 <Button
 type="button"
 onClick={handleShareWhatsApp}
 size="sm"
 className="h-10 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2 cursor-pointer"
 >
 <WhatsappLogo className="size-4" weight="bold" />
 <span>Enviar WhatsApp</span>
 </Button>
 <Button
 type="button"
 onClick={handleShareNative}
 size="sm"
 variant="outline"
 className="h-10 rounded-lg text-xs font-bold gap-2 cursor-pointer border-border/80"
 >
 <Share2 className="size-3.5" />
 <span>Compartilhar</span>
 </Button>
 </div>
 </div>

 <DialogFooter className="p-4 px-6 border-t border-border/70 bg-muted/10 flex flex-row items-center justify-between gap-2">
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={handlePrint}
 className="rounded-lg text-xs font-bold gap-2 cursor-pointer"
 >
 <Printer className="size-3.5" />
 <span>Imprimir</span>
 </Button>

 <Button
 type="button"
 onClick={handleDownloadQr}
 size="sm"
 className="rounded-lg text-xs font-bold bg-primary text-primary-foreground gap-2 cursor-pointer"
 >
 <Download className="size-3.5" />
 <span>Baixar PNG</span>
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
}
