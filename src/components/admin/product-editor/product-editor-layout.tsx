import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Section {
 id: string;
 label: string;
 icon?: React.ReactNode;
}

interface ProductEditorLayoutProps {
 sections: Section[];
 children: React.ReactNode;
 preview?: React.ReactNode;
}

export function ProductEditorLayout({ sections, children, preview }: ProductEditorLayoutProps) {
 const [activeSection, setActiveSection] = useState<string>(sections[0]?.id || "");

 useEffect(() => {
 const observers = new Map<string, IntersectionObserver>();

 const callback = (entries: IntersectionObserverEntry[]) => {
 // Find the most visible intersecting entry
 let maxRatio = 0;
 let visibleId = "";

 entries.forEach((entry) => {
 if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
 maxRatio = entry.intersectionRatio;
 visibleId = entry.target.id;
 }
 });

 if (visibleId) {
 setActiveSection(visibleId);
 }
 };

 const observer = new IntersectionObserver(callback, {
 root: null,
 rootMargin: "-20% 0px -60% 0px", // triggers when element is roughly in top third
 threshold: [0, 0.25, 0.5, 0.75, 1],
 });

 sections.forEach((section) => {
 const element = document.getElementById(section.id);
 if (element) {
 observer.observe(element);
 }
 });

 return () => {
 observer.disconnect();
 };
 }, [sections]);

 const mobileNavRef = React.useRef<HTMLDivElement>(null);
 const activePillRef = React.useRef<HTMLButtonElement | null>(null);

 // Auto-centraliza a pílula ativa no eixo HORIZONTAL sem afetar o scroll vertical
 useEffect(() => {
 if (activeSection && activePillRef.current && mobileNavRef.current) {
 const container = mobileNavRef.current;
 const pill = activePillRef.current;
 const left = pill.offsetLeft - container.clientWidth / 2 + pill.clientWidth / 2;
 container.scrollTo({ left, behavior: "smooth" });
 }
 }, [activeSection]);

 const scrollTo = (id: string) => {
 const el = document.getElementById(id);
 if (el) {
 const scrollParent = el.closest(".overflow-y-auto no-scrollbar") as HTMLElement | null;
 if (!scrollParent || scrollParent === document.documentElement || scrollParent === document.body) {
 const y = el.getBoundingClientRect().top + window.scrollY - 100;
 window.scrollTo({ top: y, behavior: "smooth" });
 } else {
 const parentRect = scrollParent.getBoundingClientRect();
 const elRect = el.getBoundingClientRect();
 const top = elRect.top - parentRect.top + scrollParent.scrollTop - 20;
 scrollParent.scrollTo({ top, behavior: "smooth" });
 }
 }
 };

 return (
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative pb-24 mt-6">
 {/* Mobile Navigation Pills */}
 <div
 ref={mobileNavRef}
 className="flex lg:hidden overflow-x-auto no-scrollbar pb-4 gap-2 sticky top-18 bg-background/95 backdrop-blur z-40 border-b col-span-1 "
 >
 {sections.map((section) => {
 const isActive = activeSection === section.id;
 return (
 <button
 key={section.id}
 ref={isActive ? (el) => { activePillRef.current = el; } : undefined}
 type="button"
 onClick={() => scrollTo(section.id)}
 className={cn(
 "flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full whitespace-nowrap border transition-colors",
 isActive
 ? "bg-primary text-primary-foreground border-primary"
 : "bg-card border-border text-muted-foreground",
 )}
 >
 {section.icon && <span className="size-3.5">{section.icon}</span>}
 {section.label}
 </button>
 );
 })}
 </div>

 {/* Main Content Form Areas (Left Column - 60%) */}
 <div className="lg:col-span-7 space-y-8 order-2 lg:order-1">
 {children}
 </div>

 {/* Sidebar Anchor Navigation & Truthful Preview (Right Column - 40%) */}
 <div className="lg:col-span-5 lg:sticky lg:top-20 flex flex-col gap-6 order-1 lg:order-2">
 <nav className="flex flex-col space-y-1 bg-card rounded-lg p-3 ">
 <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground px-3 py-1">
 Seções do Produto
 </p>
 {sections.map((section) => (
 <button
 key={section.id}
 type="button"
 onClick={() => scrollTo(section.id)}
 className={cn(
 "flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors text-left",
 activeSection === section.id
 ? "bg-primary/10 text-primary"
 : "text-muted-foreground hover:bg-muted hover:text-foreground",
 )}
 >
 {section.icon && (
 <span
 className={cn(
 "size-4 shrink-0",
 activeSection === section.id ? "text-primary" : "text-muted-foreground",
 )}
 >
 {section.icon}
 </span>
 )}
 <span>{section.label}</span>
 </button>
 ))}
 </nav>

 {preview && (
 <div className="space-y-2">
 <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground px-1">
 Preview Real da Vitrine
 </p>
 {preview}
 </div>
 )}
 </div>
 </div>
 );
}
