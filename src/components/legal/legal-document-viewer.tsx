import { Link } from "@tanstack/react-router";
import { ShieldCheck, Calendar, FileText, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeMobileHeader } from "@/components/navigation";

export interface LegalDocumentProps {
 document: {
 title: string;
 slug: string;
 version?: string;
 summary?: string | null;
 content_markdown?: string;
 published_at?: string;
 updated_at?: string;
 };
}

export function LegalDocumentViewer({ document }: LegalDocumentProps) {
 const formattedDate = document.updated_at
 ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(document.updated_at))
 : "Agosto de 2026";

 const lines = (document.content_markdown || "").split("\n");

 return (
 <div className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12 space-y-8">
 <NativeMobileHeader
 title={document.title}
 fallbackHref="/"
 rightActions={
 <div className="flex items-center gap-2">
 <Badge variant="outline" className="text-[10px] font-mono font-bold bg-primary/10 text-primary border-primary/20">
 <ShieldCheck className="size-3 mr-1 inline" /> v{document.version || "2.0"}
 </Badge>
 </div>
 }
 />

 {/* Header Documento */}
 <div className="space-y-3">
 <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted/60 text-muted-foreground text-xs font-semibold ">
 <FileText className="size-3.5 text-primary" />
 <span>Documento Legal Oficial & Conformidade LGPD</span>
 </div>
 <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground">
 {document.title}
 </h1>
 {document.summary && (
 <p className="text-sm sm:text-base text-muted-foreground leading-relaxed bg-card p-4 rounded-2xl ">
 {document.summary}
 </p>
 )}
 </div>

 {/* Links Rápidos de Outras Políticas */}
 <div className="flex flex-wrap gap-2 pt-2 pb-4 ">
 <span className="text-xs font-bold text-muted-foreground self-center mr-1">Políticas Relacionadas:</span>
 <Button asChild variant="outline" size="sm" className="rounded-xl text-xs h-7">
 <Link to="/termos">Termos de Uso</Link>
 </Button>
 <Button asChild variant="outline" size="sm" className="rounded-xl text-xs h-7">
 <Link to="/privacidade">Privacidade (LGPD)</Link>
 </Button>
 <Button asChild variant="outline" size="sm" className="rounded-xl text-xs h-7">
 <Link to="/politicas/$slug" params={{ slug: "cookies" }}>Cookies</Link>
 </Button>
 <Button asChild variant="outline" size="sm" className="rounded-xl text-xs h-7">
 <Link to="/politicas/$slug" params={{ slug: "isencao" }}>Isenção de Negociações</Link>
 </Button>
 <Button asChild variant="outline" size="sm" className="rounded-xl text-xs h-7">
 <Link to="/politicas/$slug" params={{ slug: "lojistas" }}>Lojistas</Link>
 </Button>
 <Button asChild variant="outline" size="sm" className="rounded-xl text-xs h-7">
 <Link to="/trocas-e-devolucoes">Trocas & Devoluções</Link>
 </Button>
 </div>

 {/* Conteúdo Renderizado */}
 <article className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-p:leading-relaxed prose-li:my-1 space-y-4">
 {lines.map((line, idx) => {
 const trimmed = line.trim();
 if (!trimmed) return <div key={idx} className="h-2" />;

 if (trimmed.startsWith("### ")) {
 return (
 <h3 key={idx} className="text-lg font-bold text-foreground mt-6 mb-2 flex items-center gap-2">
 <CheckCircle2 className="size-4 text-primary shrink-0" />
 <span>{trimmed.replace("### ", "")}</span>
 </h3>
 );
 }

 if (trimmed.startsWith("## ")) {
 return (
 <h2 key={idx} className="text-xl font-black text-foreground mt-8 mb-3 pb-2">
 {trimmed.replace("## ", "")}
 </h2>
 );
 }

 if (trimmed.startsWith("# ")) {
 return null; // Título principal já renderizado no header
 }

 if (trimmed.startsWith("- ")) {
 return (
 <li key={idx} className="text-sm text-muted-foreground ml-4 list-disc">
 {trimmed.replace("- ", "")}
 </li>
 );
 }

 if (trimmed.startsWith("---")) {
 return <hr key={idx} className="border-border/60 my-6" />;
 }

 return (
 <p key={idx} className="text-sm text-muted-foreground leading-relaxed">
 {trimmed}
 </p>
 );
 })}
 </article>

 {/* Confirmação de Consentimento */}
 <div className="mt-12 p-4 sm:p-5 rounded-2xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
 <div className="flex items-center gap-3">
 <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
 <ShieldCheck className="size-4" />
 </div>
 <div>
 <p className="font-bold text-foreground">Seu Consentimento Está Registrado</p>
 <p className="text-muted-foreground">
 Suas preferências de privacidade foram salvas com segurança e podem ser alteradas a qualquer momento nas configurações da sua conta.
 </p>
 </div>
 </div>
 <Badge variant="outline" className="bg-background text-foreground font-mono text-[10px] shrink-0">
 Salvo com Segurança
 </Badge>
 </div>
 </div>
 );
}
