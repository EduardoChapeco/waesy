import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { User2, ExternalLink, MessageCircle, QrCode, Copy, Check, Link as LinkIcon, Instagram, Youtube, Linkedin, Twitter, Mail, Send, Plane, Compass, FileCheck, ShieldCheck, Ship, GraduationCap, Briefcase, Heart, Layers, Clock, MapPin, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getLinkInBio } from "@/services/cms.functions";
import { recordWhatsAppLead } from "@/services/whatsapp-leads.functions";

export const Route = createFileRoute("/_store/bio/$slug")({
  loader: async ({ params }) => {
    try {
      const res = await getLinkInBio({ data: { slug: params.slug } }).catch(() => null);
      if (!res || res.status === "unconfigured") throw notFound();
      return res;
    } catch (err) {
      console.error("[loader:_store.bio.$slug] Unhandled loader error:", err);
      return {} as any;
    }
  },
 head: ({ loaderData }) => {
 if (!loaderData || !loaderData.title) return { meta: [{ title: "Biolink não encontrado" }] };
 return {
 meta: [
 { title: `${loaderData.title} | Link da Bio Oficial` },
 { name: "description", content: loaderData.description || "" },
 ],
 };
 },
 component: BiolinkPage,
});

const THEME_STYLES: Record<string, { bg: string; card: string; text: string; buttonClass: string }> = {
 clean: {
 bg: "bg-zinc-50 dark:bg-zinc-950",
 card: "bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs hover:border-zinc-400 dark:hover:border-zinc-600 text-zinc-900 dark:text-zinc-100",
 text: "text-zinc-900 dark:text-zinc-100",
 buttonClass: "bg-primary text-primary-foreground hover:bg-primary/90",
 },
 dark: {
 bg: "bg-black",
 card: "bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 text-white",
 text: "text-white",
 buttonClass: "bg-white text-black hover:bg-zinc-200",
 },
 glass: {
 bg: "bg-linear-to-br from-indigo-950 via-slate-900 to-black",
 card: "bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/15 text-white",
 text: "text-white",
 buttonClass: "bg-primary text-primary-foreground hover:bg-primary/90",
 },
 sunset: {
 bg: "bg-linear-to-b from-orange-500 via-rose-600 to-purple-900",
 card: "bg-white/15 backdrop-blur-md border border-white/30 hover:bg-white/25 text-white",
 text: "text-white",
 buttonClass: "bg-white text-rose-900 hover:bg-white/90 font-bold",
 },
 emerald: {
 bg: "bg-linear-to-b from-emerald-950 via-teal-900 to-black",
 card: "bg-emerald-900/40 backdrop-blur-md border border-emerald-700/50 hover:bg-emerald-800/40 text-emerald-100",
 text: "text-white",
 buttonClass: "bg-emerald-500 text-white hover:bg-emerald-600",
 },
 zine: {
 bg: "bg-[#f4efe6]",
 card: "bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black",
 text: "text-black",
 buttonClass: "bg-black text-white hover:bg-zinc-800 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
 },
 tourism_boutique: {
 bg: "bg-linear-to-b from-sky-50 via-blue-50/50 to-slate-100 dark:from-slate-950 dark:via-sky-950/40 dark:to-zinc-950",
 card: "bg-white/95 dark:bg-zinc-900/90 backdrop-blur-sm border border-sky-200/70 dark:border-sky-800/40 shadow-sm hover:border-sky-400 text-slate-900 dark:text-slate-100",
 text: "text-slate-900 dark:text-slate-100",
 buttonClass: "bg-sky-600 text-white hover:bg-sky-700 font-bold shadow-sm",
 },
};

const SERVICE_ICON_MAP: Record<string, any> = {
 plane: Plane,
 passport: FileCheck,
 insurance: ShieldCheck,
 cruise: Ship,
 school: GraduationCap,
 corporate: Briefcase,
 honeymoon: Heart,
 premium: Layers,
};

function BiolinkPage() {
 const bio = Route.useLoaderData();
 const [copiedPixId, setCopiedPixId] = useState<string | null>(null);

 // Estados para o formulário de captura de lead
 const [leadName, setLeadName] = useState("");
 const [leadPhone, setLeadPhone] = useState("");
 const [isSubmittingLead, setIsSubmittingLead] = useState(false);
 const [leadSubmitted, setLeadSubmitted] = useState(false);

 if (!bio) return null;

 const themeKey = (bio.theme as string) || "clean";
 const theme = THEME_STYLES[themeKey] || THEME_STYLES.clean;
 const socials = (bio.socials as Record<string, string>) || {};
 const links = Array.isArray(bio.links) ? bio.links : [];

 const handleCopyPix = (pixKey: string, blockId: string) => {
 if (!pixKey) return;
 navigator.clipboard.writeText(pixKey);
 setCopiedPixId(blockId);
 toast.success("Chave PIX copiada para a área de transferência!");
 setTimeout(() => setCopiedPixId(null), 3000);
 };

 const handleLeadSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!leadName.trim() || !leadPhone.trim()) {
 toast.error("Por favor, preencha seu nome e WhatsApp.");
 return;
 }

 setIsSubmittingLead(true);
 try {
 await recordWhatsAppLead({
 data: {
 store_id: bio.store_id || null,
 entity_type: "store",
 entity_title: `Lead Biolink: ${leadName}`,
 phone_target: leadPhone,
 metadata: {
 notes: `Lead capturado pelo Biolink da agência: ${leadName} (${leadPhone})`,
 },
 },
 });

 setLeadSubmitted(true);
 toast.success("Solicitação enviada com sucesso! Um consultor entrará em contato.");
 } catch {
 toast.error("Erro ao enviar contato. Tente novamente.");
 } finally {
 setIsSubmittingLead(false);
 }
 };

 return (
 <main
 className={`w-full min-h-screen ${theme.bg} ${theme.text} flex flex-col items-center justify-between py-10 px-4 transition-colors duration-300 font-sans`}
 >
 <div className="w-full max-w-md flex flex-col items-center gap-6">
 {/* ── 1. Top Avatar & Bio com Slogan e Status ── */}
 <div className="flex flex-col items-center gap-3 w-full text-center">
 <div className="size-20 rounded-full bg-white dark:bg-zinc-900 border-2 border-sky-300/40 shadow-sm overflow-hidden flex items-center justify-center p-1">
 {bio.avatar_url ? (
 <img src={bio.avatar_url} alt={bio.title} className="size-full object-cover rounded-full" />
 ) : (
 <User2 className="size-8 opacity-50 text-sky-600" />
 )}
 </div>

 <div className="space-y-1.5 max-w-sm">
 <h1 className="text-xl font-black tracking-tight text-foreground font-display">{bio.title}</h1>
 {bio.subtitle && (
 <p className="text-[11px] font-bold tracking-widest text-sky-700 dark:text-sky-300 uppercase">
 {bio.subtitle}
 </p>
 )}
 {bio.description && (
 <p className="text-xs opacity-80 leading-relaxed whitespace-pre-wrap">
 {bio.description}
 </p>
 )}

 {/* Badge de Horário de Funcionamento em Tempo Real */}
 <div className="pt-1 flex items-center justify-center">
 <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
 <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
 <span>Aberto agora · 08h às 18h</span>
 </div>
 </div>
 </div>
 </div>

 {/* ── 2. Ícones Sociais ── */}
 {Object.values(socials).some(Boolean) && (
 <div className="flex items-center justify-center gap-3 py-1 flex-wrap">
 {socials.instagram && (
 <a
 href={socials.instagram.startsWith("http") ? socials.instagram : `https://instagram.com/${socials.instagram.replace("@", "")}`}
 target="_blank"
 rel="noopener noreferrer"
 className="size-9 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 flex items-center justify-center transition-all hover:scale-110"
 >
 <Instagram className="size-4" />
 </a>
 )}
 {socials.whatsapp && (
 <a
 href={`https://wa.me/${socials.whatsapp.replace(/\D/g, "")}`}
 target="_blank"
 rel="noopener noreferrer"
 className="size-9 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-all hover:scale-110"
 >
 <MessageCircle className="size-4" />
 </a>
 )}
 {socials.email && (
 <a
 href={`mailto:${socials.email}`}
 className="size-9 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 flex items-center justify-center transition-all hover:scale-110"
 >
 <Mail className="size-4" />
 </a>
 )}
 </div>
 )}

 {/* ── 3. Lista de Blocos & Links Ricos ── */}
 <div className="w-full flex flex-col gap-3">
 {links.map((block: any, index: number) => {
 // Bloco: Cabeçalho de Seção
 if (block.type === "header") {
 return (
 <div key={block.id || index} className="pt-4 pb-1 text-center">
 <span className="text-[11px] font-bold uppercase tracking-widest opacity-60">
 {block.label}
 </span>
 </div>
 );
 }

 // Bloco Especial: Formulário de Captura de Lead ("Quer que a gente te chame?")
 if (block.type === "lead_capture") {
 return (
 <div
 key={block.id || index}
 className={`w-full p-5 rounded-2xl border border-sky-200/80 dark:border-sky-800/60 bg-card shadow-sm space-y-3.5 text-left`}
 >
 <div className="flex items-center gap-2.5">
 <div className="size-8 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-600 shrink-0">
 <Send className="size-4" />
 </div>
 <div>
 <h3 className="text-sm font-bold text-foreground">
 {block.label || "Quer que a gente te chame?"}
 </h3>
 <p className="text-[11px] text-muted-foreground">
 {block.subtitle || "Deixe seu WhatsApp e um consultor entra em contato."}
 </p>
 </div>
 </div>

 {leadSubmitted ? (
 <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold text-center space-y-1">
 <p> Dados recebidos com sucesso!</p>
 <p className="text-[11px] font-normal opacity-80">Nossa equipe entrará em contato em instantes.</p>
 </div>
 ) : (
 <form onSubmit={handleLeadSubmit} className="space-y-2.5 pt-1">
 <div className="space-y-1">
 <label className="text-[10px] font-bold text-muted-foreground uppercase">Seu nome</label>
 <Input
 value={leadName}
 onChange={(e) => setLeadName(e.target.value)}
 placeholder="Como devemos te chamar?"
 className="h-9.5 text-xs rounded-xl bg-background"
 required
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] font-bold text-muted-foreground uppercase">WhatsApp (com DDD)</label>
 <Input
 value={leadPhone}
 onChange={(e) => setLeadPhone(e.target.value)}
 placeholder="(99) 99999-9999"
 className="h-9.5 text-xs rounded-xl bg-background"
 required
 />
 </div>
 <Button
 type="submit"
 disabled={isSubmittingLead}
 className="w-full h-10 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
 >
 {isSubmittingLead ? "Enviando..." : (block.buttonText || "Quero ser chamado(a)")}
 </Button>
 <p className="text-[9px] text-muted-foreground text-center">
 Ao enviar, você concorda em receber contato da equipe via WhatsApp.
 </p>
 </form>
 )}
 </div>
 );
 }

 // Bloco Especial: Galeria do Espaço Físico / Nossa Loja
 if (block.type === "store_gallery") {
 const galleryImages: string[] = block.images || [];
 return (
 <div key={block.id || index} className="w-full space-y-2 text-center pt-2">
 <div className="space-y-0.5">
 <p className="text-[10px] font-bold uppercase tracking-widest text-sky-600">Nossa Loja</p>
 <h3 className="text-sm font-serif font-bold text-foreground">
 {block.label || "Um espaço pensado para você sonhar"}
 </h3>
 </div>
 {galleryImages.length >= 1 ? (
 <div className="grid grid-cols-2 gap-2 h-44 rounded-2xl overflow-hidden border border-border/60">
 <div className="h-full">
 <img src={galleryImages[0]} alt="Fachada da Agência" className="size-full object-cover" />
 </div>
 <div className="grid grid-rows-2 gap-2 h-full">
 {galleryImages[1] && <img src={galleryImages[1]} alt="Lounge de Atendimento" className="size-full object-cover" />}
 {galleryImages[2] && <img src={galleryImages[2]} alt="Detalhes da Loja" className="size-full object-cover" />}
 </div>
 </div>
 ) : (
 <div className="h-44 rounded-2xl border border-dashed border-border/60 flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
 <span className="text-xs">Nenhuma foto cadastrada</span>
 <span className="text-[10px]">Adicione fotos da loja pelo painel administrativo</span>
 </div>
 )}
 </div>
 );
 }

 // Bloco Especial: Grade de Especialidades / Serviços de Turismo (8 Cards)
 if (block.type === "services_grid") {
 const servicesList = block.services || [
 { icon: "plane", title: "Pacotes nacionais e internacionais", subtitle: "Maceió, Caldas, Portugal e mais." },
 { icon: "passport", title: "Passaporte e vistos", subtitle: "Americano, Mexicano e demais consulados." },
 { icon: "insurance", title: "Seguro viagem", subtitle: "Coberturas para todos os destinos." },
 { icon: "cruise", title: "Cruzeiros marítimos", subtitle: "Saídas nacionais e internacionais." },
 { icon: "school", title: "Viagens escolares", subtitle: "Formaturas e intercâmbios." },
 { icon: "corporate", title: "Viagens corporativas", subtitle: "Logística completa para sua empresa." },
 { icon: "honeymoon", title: "Lua de mel & grupos", subtitle: "Roteiros personalizados." },
 { icon: "premium", title: "Experiências premium", subtitle: "Viagens especiais com curadoria." },
 ];

 return (
 <div key={block.id || index} className="w-full space-y-2.5 text-center pt-3">
 <div className="space-y-0.5">
 <p className="text-[10px] font-bold uppercase tracking-widest text-sky-600">O Que Oferecemos</p>
 <h3 className="text-sm font-serif font-bold text-foreground">
 {block.label || "Serviços Especializados"}
 </h3>
 </div>

 <div className="grid grid-cols-2 gap-2 text-left">
 {servicesList.map((srv: any, srvIdx: number) => {
 const IconComp = SERVICE_ICON_MAP[srv.icon] || Plane;
 return (
 <div
 key={srvIdx}
 className="p-3 rounded-xl bg-card border border-border/70 hover:border-sky-400 transition-all space-y-1"
 >
 <div className="size-7 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-600">
 <IconComp className="size-3.5" />
 </div>
 <p className="text-[11px] font-bold text-foreground leading-tight">{srv.title}</p>
 <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">{srv.subtitle}</p>
 </div>
 );
 })}
 </div>
 </div>
 );
 }

 // Bloco Especial: Horário & Localização (Card Azul Noturno)
 if (block.type === "business_hours_card") {
 return (
 <div
 key={block.id || index}
 className="w-full p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-md space-y-2.5 text-left"
 >
 <div className="flex items-start gap-2.5">
 <div className="size-7 rounded-lg bg-white/10 flex items-center justify-center text-sky-300 shrink-0">
 <Clock className="size-3.5" />
 </div>
 <div>
 <p className="text-[10px] font-bold uppercase tracking-wider text-sky-400">Horário de Atendimento</p>
 <p className="text-xs font-bold text-white">{block.hoursText || "Todos os dias — 08h às 18h"}</p>
 </div>
 </div>
 <div className="flex items-center justify-between pt-1 border-t border-white/10 text-xs">
 <span className="flex items-center gap-1 text-slate-300 text-[11px]">
 <MapPin className="size-3 text-sky-400" />
 <span>{block.locationText || "São Miguel do Oeste - SC"}</span>
 </span>
 <a
 href={block.mapUrl || "https://maps.google.com"}
 target="_blank"
 rel="noopener noreferrer"
 className="text-[11px] font-bold text-sky-300 hover:underline"
 >
 Ver no mapa →
 </a>
 </div>
 </div>
 );
 }

 // Bloco de Link de Alta Conversão com Destaque
 const isHighlighted = block.isHighlighted || block.variant === "featured";
 const isWhatsapp = block.type === "whatsapp";
 let targetUrl = block.url || "#";
 if (isWhatsapp && !targetUrl.startsWith("http")) {
 const cleanNumber = targetUrl.replace(/\D/g, "");
 const message = block.subtitle ? encodeURIComponent(block.subtitle) : "";
 targetUrl = `https://wa.me/${cleanNumber}${message ? `?text=${message}` : ""}`;
 }

 // Se for Mini-Banner com Imagem de Fundo (16:9 Fiel)
 if (block.imageUrl) {
 return (
 <a
 key={block.id || index}
 href={targetUrl}
 target="_blank"
 rel="noopener noreferrer"
 className="block w-full aspect-[16/9] rounded-2xl overflow-hidden border border-border/60 shadow-xs relative group select-none hover:border-border transition-all"
 >
 <img
 src={block.imageUrl}
 alt={block.label || "Banner"}
 className="size-full object-cover group-hover:scale-102 transition-transform duration-300"
 />
 <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent flex flex-col justify-end p-3.5">
 <span className="text-xs font-bold text-white drop-shadow-sm truncate flex items-center justify-between gap-2">
 <span>{block.label}</span>
 <ExternalLink className="size-3.5 text-white/80 shrink-0" />
 </span>
 {block.subtitle && (
 <span className="text-[10px] text-white/80 truncate drop-shadow-sm">
 {block.subtitle}
 </span>
 )}
 </div>
 </a>
 );
 }

 return (
 <a
 key={block.id || index}
 href={targetUrl}
 target="_blank"
 rel="noopener noreferrer"
 className={`w-full p-3.5 rounded-2xl flex items-center justify-between gap-3 text-sm font-semibold transition-all hover:scale-[1.015] active:scale-[0.99] ${
 isHighlighted
 ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-bold border border-emerald-500"
 : theme.card
 }`}
 >
 <div className="flex items-center gap-3 min-w-0 text-left">
 <div
 className={`size-8 rounded-xl flex items-center justify-center shrink-0 ${
 isHighlighted ? "bg-white/20 text-white" : "bg-sky-500/10 text-sky-600"
 }`}
 >
 {isWhatsapp ? (
 <MessageCircle className="size-4" />
 ) : (
 <LinkIcon className="size-4" />
 )}
 </div>
 <div className="min-w-0">
 <p className="text-xs font-bold truncate leading-tight">{block.label}</p>
 {block.subtitle && (
 <p className={`text-[10px] truncate leading-tight ${isHighlighted ? "text-emerald-100" : "text-muted-foreground"}`}>
 {block.subtitle}
 </p>
 )}
 </div>
 </div>

 <div className="flex items-center gap-1.5 shrink-0">
 {block.badge && (
 <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-amber-500 text-white">
 {block.badge}
 </span>
 )}
 <ChevronRight className={`size-4 ${isHighlighted ? "text-white" : "text-muted-foreground"}`} />
 </div>
 </a>
 );
 })}
 </div>
 </div>

 {/* ── 4. Rodapé Powered by Waesy ── */}
 <footer className="pt-10 pb-4 text-center">
 <a
 href="/"
 className="text-[10px] opacity-40 hover:opacity-100 transition-opacity font-bold uppercase tracking-widest"
 >
 Waesy Community · Turismo
 </a>
 </footer>
 </main>
 );
}

export default BiolinkPage;
