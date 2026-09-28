import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Share2, MessageCircle, Mail, Send, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export interface ShareModalProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 title: string;
 text?: string;
 url: string;
 imageUrl?: string;
}

export function ShareModal({
 open,
 onOpenChange,
 title,
 text = "",
 url,
 imageUrl,
}: ShareModalProps) {
 const [copied, setCopied] = useState(false);

 // Normaliza para URL canônica pública
 const canonicalUrl =
 typeof window !== "undefined"
 ? url.startsWith("http")
 ? url
 : `${window.location.origin}${url}`
 : url;

 const handleCopyLink = async () => {
 try {
 if (navigator.clipboard && navigator.clipboard.writeText) {
 await navigator.clipboard.writeText(canonicalUrl);
 setCopied(true);
 toast.success("Link copiado para a área de transferência!");
 setTimeout(() => setCopied(false), 2500);
 } else {
 // Fallback legado para browsers antigos
 const textArea = document.createElement("textarea");
 textArea.value = canonicalUrl;
 document.body.appendChild(textArea);
 textArea.select();
 document.execCommand("copy");
 document.body.removeChild(textArea);
 setCopied(true);
 toast.success("Link copiado para a área de transferência!");
 setTimeout(() => setCopied(false), 2500);
 }
 } catch (err) {
 console.error("Falha ao copiar link:", err);
 toast.error("Não foi possível copiar o link automaticamente.");
 }
 };

 const shareWhatsApp = () => {
 const message = encodeURIComponent(`${title}\n${canonicalUrl}`);
 window.open(`https://api.whatsapp.com/send?text=${message}`, "_blank", "noopener,noreferrer");
 };

 const shareTelegram = () => {
 const encodedUrl = encodeURIComponent(canonicalUrl);
 const encodedText = encodeURIComponent(title);
 window.open(
 `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
 "_blank",
 "noopener,noreferrer",
 );
 };

 const shareTwitter = () => {
 const encodedUrl = encodeURIComponent(canonicalUrl);
 const encodedText = encodeURIComponent(title);
 window.open(
 `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
 "_blank",
 "noopener,noreferrer",
 );
 };

 const shareEmail = () => {
 const subject = encodeURIComponent(title);
 const body = encodeURIComponent(`${text ? `${text}\n\n` : ""}Acesse: ${canonicalUrl}`);
 window.location.href = `mailto:?subject=${subject}&body=${body}`;
 };

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="sm:max-w-md sm:rounded-2xl sm:p-6 p-5">
 <DialogHeader className="space-y-1">
 <DialogTitle className="text-lg font-bold flex items-center gap-2">
 <Share2 className="size-5 text-primary" />
 <span>Compartilhar Conteúdo</span>
 </DialogTitle>
 <DialogDescription className="text-xs text-muted-foreground">
 Envie este link para amigos, redes sociais ou copie para sua área de transferência.
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-5 py-2">
 {/* Card de Preview */}
 <div className=" rounded-xl p-3.5 bg-muted/20 flex gap-3 items-center">
 {imageUrl && (
 <img
 src={imageUrl}
 alt={title}
 className="size-12 rounded-lg object-cover shrink-0"
 />
 )}
 <div className="min-w-0 flex-1">
 <h4 className="text-xs font-bold text-foreground truncate">{title}</h4>
 <p className="text-[11px] text-muted-foreground truncate font-mono mt-0.5">
 {canonicalUrl}
 </p>
 </div>
 </div>

 {/* Botões Rápidos de Compartilhamento Social */}
 <div className="grid grid-cols-4 gap-2 text-center">
 <button
 type="button"
 onClick={shareWhatsApp}
 className="flex flex-col items-center justify-center p-3 rounded-xl bg-card hover:bg-muted/40 transition-colors gap-1.5 group cursor-pointer"
 >
 <div className="size-9 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
 <MessageCircle className="size-5" />
 </div>
 <span className="text-[11px] font-semibold text-foreground">WhatsApp</span>
 </button>

 <button
 type="button"
 onClick={shareTelegram}
 className="flex flex-col items-center justify-center p-3 rounded-xl bg-card hover:bg-muted/40 transition-colors gap-1.5 group cursor-pointer"
 >
 <div className="size-9 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
 <Send className="size-4" />
 </div>
 <span className="text-[11px] font-semibold text-foreground">Telegram</span>
 </button>

 <button
 type="button"
 onClick={shareTwitter}
 className="flex flex-col items-center justify-center p-3 rounded-xl bg-card hover:bg-muted/40 transition-colors gap-1.5 group cursor-pointer"
 >
 <div className="size-9 rounded-full bg-foreground/10 text-foreground flex items-center justify-center group-hover:scale-105 transition-transform">
 <span className="font-bold text-xs font-mono">X</span>
 </div>
 <span className="text-[11px] font-semibold text-foreground">Twitter / X</span>
 </button>

 <button
 type="button"
 onClick={shareEmail}
 className="flex flex-col items-center justify-center p-3 rounded-xl bg-card hover:bg-muted/40 transition-colors gap-1.5 group cursor-pointer"
 >
 <div className="size-9 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
 <Mail className="size-4" />
 </div>
 <span className="text-[11px] font-semibold text-foreground">Email</span>
 </button>
 </div>

 {/* Campo Copiar Link */}
 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-foreground">Link Direto</label>
 <div className="flex items-center gap-2">
 <Input
 readOnly
 value={canonicalUrl}
 className="h-10 rounded-xl text-xs bg-background font-mono text-muted-foreground selection:bg-primary/20"
 />
 <Button
 type="button"
 onClick={handleCopyLink}
 size="sm"
 className="h-10 px-4 rounded-xl text-xs font-bold gap-1.5 shrink-0"
 >
 {copied ? (
 <Check className="size-4 text-emerald-400" />
 ) : (
 <Copy className="size-4" />
 )}
 <span>{copied ? "Copiado!" : "Copiar"}</span>
 </Button>
 </div>
 </div>
 </div>
 </DialogContent>
 </Dialog>
 );
}

/**
 * Função utilitária canônica para acionar compartilhamento nativo ou abrir modal
 */
export async function triggerShare({
 title,
 text,
 url,
 onOpenModal,
}: {
 title: string;
 text?: string;
 url: string;
 onOpenModal?: () => void;
}) {
 const canonicalUrl =
 typeof window !== "undefined"
 ? url.startsWith("http")
 ? url
 : `${window.location.origin}${url}`
 : url;

 if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
 try {
 await navigator.share({
 title,
 text: text || title,
 url: canonicalUrl,
 });
 return;
 } catch (err) {
 // Usuário cancelou ou navegador não suportou o payload
 if ((err as Error)?.name !== "AbortError") {
 if (onOpenModal) onOpenModal();
 }
 return;
 }
 }

 if (onOpenModal) {
 onOpenModal();
 }
}
