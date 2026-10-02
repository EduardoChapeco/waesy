import * as React from "react";
import { useState } from "react";
import { CheckCircle2, Copy, Check, ExternalLink, QrCode, Instagram, MessageSquare, Globe, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface BiolinkProfileProps {
 avatarUrl?: string;
 name?: string;
 handle?: string;
 bio?: string;
 isVerified?: boolean;
}

export function BiolinkProfileSection({
 avatarUrl = "",
 name = "Studio Maria & Co.",
 handle = "@studiomaria",
 bio = "Arquitetura de interiores, consultoria e projetos autorais. Transformando espaços em refúgios.",
 isVerified = true,
}: BiolinkProfileProps) {
 return (
 <section className="py-6 flex flex-col items-center text-center max-w-md mx-auto px-4 space-y-3 select-none">
 <div className="relative">
 <div className="size-24 rounded-full overflow-hidden border-2 border-primary/20 bg-muted shadow-md">
 <img src={avatarUrl} alt={name} className="size-full object-cover" />
 </div>
 {isVerified && (
 <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-1 rounded-full shadow-md">
 <CheckCircle2 className="size-3.5 fill-current" />
 </div>
 )}
 </div>

 <div className="space-y-1">
 <h1 className="text-lg font-bold text-foreground flex items-center justify-center gap-2">
 <span>{name}</span>
 </h1>
 <span className="text-xs font-mono text-muted-foreground block">{handle}</span>
 <p className="text-xs text-muted-foreground leading-relaxed pt-1 max-w-xs mx-auto">
 {bio}
 </p>
 </div>
 </section>
 );
}

export interface BiolinkLinkItem {
 id: string;
 title: string;
 url: string;
 icon?: string;
 badge?: string;
 isHighlight?: boolean;
}

export interface BiolinkActionButtonsProps {
 links?: BiolinkLinkItem[];
 storeData?: any;
}

export function BiolinkActionButtonsSection({
 links,
 storeData,
}: BiolinkActionButtonsProps) {
 const cleanStorePhone = (storeData?.phone || "").replace(/\D/g, "");
 const intlStorePhone = cleanStorePhone.length <= 11 && cleanStorePhone.length > 0 ? `55${cleanStorePhone}` : cleanStorePhone;

 const resolvedLinks = React.useMemo(() => {
 const defaultList: BiolinkLinkItem[] = [
 { id: "l1", title: "Conheça Nosso Catálogo", url: "/catalogo", badge: "Destaque", isHighlight: true },
 { id: "l2", title: "Sobre Nossa Empresa", url: "/sobre" },
 ...(intlStorePhone ? [{ id: "l3", title: "Fale Diretamente no WhatsApp", url: `https://wa.me/${intlStorePhone}` }] : []),
 ];

 const targetList = links && links.length > 0 ? links : defaultList;

 return targetList.map((l) => {
 if (l.url && l.url.includes("5549999999999")) {
 return {
 ...l,
 url: intlStorePhone ? `https://wa.me/${intlStorePhone}` : "#",
 };
 }
 return l;
 });
 }, [links, intlStorePhone]);

 return (
 <section className="py-2 max-w-md mx-auto px-4 w-full space-y-3">
 {resolvedLinks.map((link) => (
 <a
 key={link.id}
 href={link.url}
 target="_blank"
 rel="noreferrer"
 className={cn(
 "w-full h-12 px-5 rounded-lg flex items-center justify-between text-xs font-bold transition-all shadow-2xs group cursor-pointer border",
 link.isHighlight
 ? "bg-primary text-primary-foreground border-primary hover:opacity-90"
 : "bg-card text-foreground border-border/80 hover:bg-muted/60 hover:border-primary/40"
 )}
 >
 <span className="truncate">{link.title}</span>
 <div className="flex items-center gap-2 shrink-0">
 {link.badge && (
 <Badge
 variant="secondary"
 className={cn(
 "text-[10px] px-2 py-0",
 link.isHighlight && "bg-white/20 text-white border-0"
 )}
 >
 {link.badge}
 </Badge>
 )}
 <ExternalLink className="size-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
 </div>
 </a>
 ))}
 </section>
 );
}

export interface BiolinkPixCardProps {
 pixKey?: string;
 pixKeyType?: string; // CPF, CNPJ, E-mail, Telefone, Aleatória
 beneficiaryName?: string;
 bankName?: string;
}

export function BiolinkPixCardSection({
 pixKey = "contato@studiomaria.com.br",
 pixKeyType = "Chave E-mail",
 beneficiaryName = "Studio Maria Arquitetura LTDA",
 bankName = "Banco Inter / Waesy Pay",
}: BiolinkPixCardProps) {
 const [copied, setCopied] = useState(false);

 const handleCopy = () => {
 navigator.clipboard.writeText(pixKey);
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 };

 return (
 <section className="py-4 max-w-md mx-auto px-4 w-full">
 <div className="p-5 rounded-lg border border-border/80 bg-card space-y-4 shadow-2xs text-center">
 <div className="flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
 <QrCode className="size-4 text-primary" />
 <span>Pagamento Instantâneo Pix</span>
 </div>

 <div className="space-y-1">
 <p className="text-sm font-bold text-foreground">{beneficiaryName}</p>
 <span className="text-[11px] text-muted-foreground">{bankName}</span>
 </div>

 <div className="p-3 rounded-lg bg-muted/50 border border-border/60 flex items-center justify-between gap-2">
 <div className="text-left min-w-0 flex-1">
 <span className="text-[10px] text-muted-foreground block font-mono">{pixKeyType}</span>
 <span className="text-xs font-mono font-bold text-foreground truncate block">{pixKey}</span>
 </div>

 <Button
 type="button"
 size="sm"
 onClick={handleCopy}
 className="h-8 rounded-lg font-bold text-[11px] gap-2 bg-primary text-primary-foreground cursor-pointer shrink-0"
 >
 {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
 <span>{copied ? "Copiado!" : "Copiar"}</span>
 </Button>
 </div>
 </div>
 </section>
 );
}
