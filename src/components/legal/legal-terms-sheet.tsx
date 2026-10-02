import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, FileText, Lock, Layers, AlertTriangle, ExternalLink, CheckCircle2, Calendar } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { getLegalBundle } from "@/services/legal.functions";

interface LegalTermsSheetProps {
 isOpen: boolean;
 onOpenChange: (open: boolean) => void;
 initialSlug?: string;
 onAccept?: () => void;
}

export function LegalTermsSheet({
 isOpen,
 onOpenChange,
 initialSlug = "termos",
 onAccept,
}: LegalTermsSheetProps) {
 const [docs, setDocs] = useState<any[]>([]);
 const [selectedSlug, setSelectedSlug] = useState(initialSlug);
 const [isLoading, setIsLoading] = useState(false);
 const [scrollProgress, setScrollProgress] = useState(0);
 const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
 const scrollContainerRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
 if (isOpen && docs.length === 0) {
 setIsLoading(true);
 getLegalBundle()
 .then((res) => {
 if (Array.isArray(res) && res.length > 0) {
 setDocs(res);
 }
 })
 .finally(() => setIsLoading(false));
 }
 }, [isOpen, docs.length]);

 useEffect(() => {
 setSelectedSlug(initialSlug);
 setScrollProgress(0);
 setHasScrolledToBottom(false);
 }, [initialSlug, isOpen]);

 const currentDoc = useMemo(() => {
 const found = docs.find((d) => d.slug === selectedSlug);
 if (found) return found;
 return docs.find((d) => d.slug === "termos") || docs[0] || null;
 }, [docs, selectedSlug]);

 const handleScroll = () => {
 if (!scrollContainerRef.current) return;
 const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
 const maxScroll = scrollHeight - clientHeight;
 if (maxScroll <= 0) {
 setScrollProgress(100);
 setHasScrolledToBottom(true);
 return;
 }
 const pct = Math.round((scrollTop / maxScroll) * 100);
 setScrollProgress(pct);
 if (pct >= 90) {
 setHasScrolledToBottom(true);
 }
 };

 const lines = (currentDoc?.content_markdown || "").split("\n");

 return (
 <Sheet open={isOpen} onOpenChange={onOpenChange}>
 <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] flex flex-col justify-between overflow-hidden p-0">
 {/* Header Fixo */}
 <div className="p-5 pb-3 border-b border-border/40 space-y-3 bg-card">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
 <FileText className="size-4" />
 </div>
 <div>
 <SheetTitle className="text-base font-bold text-foreground">
 Termos Legais
 </SheetTitle>
 <SheetDescription className="text-xs text-muted-foreground">
 Termos contratuais, privacidade e proteção aos seus dados pessoais
 </SheetDescription>
 </div>
 </div>

 {currentDoc?.version && (
 <Badge variant="outline" className="text-[10px] font-mono font-bold bg-primary/5 text-primary border-primary/20">
 v{currentDoc.version}
 </Badge>
 )}
 </div>

 {/* Seletor de Documentos (Tabs) */}
 <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
 {[
 { slug: "termos", label: "Termos Gerais de Uso" },
 { slug: "privacidade", label: "Privacidade e LGPD" },
 { slug: "uso-de-ia", label: "IA e Biometria" },
 { slug: "isencao", label: "Isenção de Negociações" },
 { slug: "cookies", label: "Cookies" },
 { slug: "lojistas", label: "Lojistas" },
 { slug: "entregadores", label: "Entregadores" },
 ].map((tab) => {
 const isSelected = (currentDoc?.slug || selectedSlug) === tab.slug;
 return (
 <button
 key={tab.slug}
 type="button"
 onClick={() => {
 setSelectedSlug(tab.slug);
 setScrollProgress(0);
 setHasScrolledToBottom(false);
 if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
 }}
 className={`px-3 py-2 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer text-xs ${
 isSelected
 ? "bg-primary text-primary-foreground shadow-xs"
 : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
 }`}
 >
 {tab.label}
 </button>
 );
 })}
 </div>

 {/* Barra de Progresso de Leitura */}
 <div className="space-y-1 pt-1">
 <div className="flex items-center justify-between text-[10px] font-mono">
 <span className="text-muted-foreground">Progresso de leitura deste documento:</span>
 <span className={hasScrolledToBottom ? "text-emerald-500 font-bold" : "text-primary font-bold"}>
 {hasScrolledToBottom ? "100% (Leitura Concluída)" : `${scrollProgress}%`}
 </span>
 </div>
 <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
 <div
 className="h-full bg-primary transition-all duration-150"
 style={{ width: `${hasScrolledToBottom ? 100 : scrollProgress}%` }}
 />
 </div>
 </div>
 </div>

 {/* Conteúdo com Scroll do Documento Real */}
 <div
 ref={scrollContainerRef}
 onScroll={handleScroll}
 className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4 text-xs text-foreground/90 leading-relaxed select-text"
 >
 {isLoading ? (
 <div className="py-16 text-center space-y-3">
 <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
 <p className="text-xs text-muted-foreground">Carregando termos oficiais da plataforma...</p>
 </div>
 ) : currentDoc ? (
 <div className="space-y-4">
 {/* Card Resumo */}
 {currentDoc.summary && (
 <div className="p-4 rounded-lg bg-muted/40 border border-border/60 text-xs space-y-1">
 <p className="font-bold flex items-center gap-2 text-foreground">
 <ShieldCheck className="size-4 text-primary shrink-0" />
 Resumo do Documento
 </p>
 <p className="text-muted-foreground text-[11px] leading-relaxed">
 {currentDoc.summary}
 </p>
 </div>
 )}

 {/* Renderização do Markdown Jurídico */}
 <div className="space-y-3 pt-2">
 {lines.map((line: string, idx: number) => {
 const trimmed = line.trim();
 if (!trimmed) return <div key={idx} className="h-1.5" />;

 if (trimmed.startsWith("# ")) {
 return (
 <h2 key={idx} className="text-lg font-black text-foreground pt-3 pb-1 border-b border-border/40">
 {trimmed.replace("# ", "")}
 </h2>
 );
 }

 if (trimmed.startsWith("## ")) {
 return (
 <h3 key={idx} className="text-sm font-bold text-foreground mt-4 mb-1 flex items-center gap-2">
 <CheckCircle2 className="size-3.5 text-primary shrink-0" />
 <span>{trimmed.replace("## ", "")}</span>
 </h3>
 );
 }

 if (trimmed.startsWith("### ")) {
 return (
 <h4 key={idx} className="text-xs font-bold text-foreground mt-3 mb-1">
 {trimmed.replace("### ", "")}
 </h4>
 );
 }

 if (trimmed.startsWith("- ")) {
 return (
 <li key={idx} className="ml-4 list-disc text-muted-foreground text-xs my-1">
 {trimmed.replace("- ", "")}
 </li>
 );
 }

 return (
 <p key={idx} className="text-xs text-muted-foreground leading-relaxed">
 {trimmed}
 </p>
 );
 })}
 </div>

 {/* Box de Encerramento */}
 <div className="p-4 rounded-lg bg-muted/30 border border-border/40 text-center space-y-1 mt-6">
 <p className="font-bold text-foreground text-xs">Fim do Documento Oficial</p>
 <p className="text-[11px] text-muted-foreground">
 Registrado e auditado sob a legislação brasileira (LGPD Lei nº 13.709/2018 e Marco Civil Lei nº 12.965/2014).
 </p>
 </div>
 </div>
 ) : (
 <div className="py-12 text-center text-muted-foreground">
 Documento não disponível no momento.
 </div>
 )}
 </div>

 {/* Footer Fixo */}
 <SheetFooter className="p-4 border-t border-border/40 bg-card flex flex-row items-center justify-between gap-3">
 <Button
 asChild
 variant="ghost"
 size="sm"
 className="text-xs text-muted-foreground hover:text-foreground h-9"
 >
 <Link to={selectedSlug === "privacidade" ? "/privacidade" : "/termos"} target="_blank">
 <ExternalLink className="size-3.5 mr-1" />
 Ver Página Completa
 </Link>
 </Button>

 <Button
 type="button"
 onClick={() => {
 if (onAccept) onAccept();
 onOpenChange(false);
 }}
 className="text-xs font-bold h-9 px-6 bg-primary text-primary-foreground rounded-lg"
 >
 Fechar e Continuar
 </Button>
 </SheetFooter>
 </SheetContent>
 </Sheet>
 );
}
