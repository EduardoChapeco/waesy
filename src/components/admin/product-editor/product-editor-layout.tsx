import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const [isWideMode, setIsWideMode] = useState(false);

  useEffect(() => {
    const callback = (entries: IntersectionObserverEntry[]) => {
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
      rootMargin: "-20% 0px -60% 0px",
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
      const scrollParent = el.closest(".overflow-y-auto") as HTMLElement | null;
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
      {/* Navigation Pills (Mobile always, Desktop in Wide Mode) */}
      <div
        ref={mobileNavRef}
        className={cn(
          "tab-list overflow-x-auto no-scrollbar pb-3 gap-2 sticky top-18 bg-background/95 backdrop-blur z-40 border-b",
          isWideMode ? "flex lg:flex lg:col-span-12 items-center justify-between" : "flex lg:hidden col-span-1",
        )}
      >
        <div className="flex items-center gap-2 py-1">
          {sections.map((section) => {
            const isActive = activeSection === section.id;
            return (
              <button /* focus-visible: */
                key={section.id}
                ref={isActive ? (el) => { activePillRef.current = el; } : undefined}
                type="button"
                onClick={() => scrollTo(section.id)} /* focus-visible: */
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-full whitespace-nowrap border transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {section.icon && <span className="size-3.5">{section.icon}</span>}
                {section.label}
              </button>
            );
          })}
        </div>

        {isWideMode && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsWideMode(false)} /* focus-visible: */
            className="h-8 px-3 text-xs font-semibold rounded-full gap-2 shrink-0 bg-card border-border hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring cursor-pointer hidden lg:inline-flex"
            title="Restaurar visualização dividida com preview ao vivo"
          >
            <Minimize2 className="size-3.5 text-primary" />
            <span>Ver Preview</span>
          </Button>
        )}
      </div>

      {/* Main Content Form Areas */}
      <div
        className={cn(
          "space-y-8 order-2 lg:order-1 transition-colors duration-200",
          isWideMode ? "lg:col-span-12" : "lg:col-span-7",
        )}
      >
        {children}
      </div>

      {/* Sidebar Anchor Navigation & Live Preview (Hidden in Wide Mode) */}
      {!isWideMode && (
        <div className="lg:col-span-5 lg:sticky lg:top-20 flex flex-col gap-6 order-1 lg:order-2">
          <nav className="flex flex-col space-y-1 bg-card rounded-lg p-3 border border-border">
            <div className="flex items-center justify-between pb-2 mb-1 border-b border-border/40">
              <p className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground px-1">
                Seções do Produto
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsWideMode(true)} /* focus-visible: */
                className="h-7 px-2 text-xs font-semibold gap-1 text-primary hover:bg-primary/10 rounded-md focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                title="Expandir área para modo foco amplo (tabela cheia)"
              >
                <Maximize2 className="size-3" />
                <span>Modo Amplo</span>
              </Button>
            </div>
            {sections.map((section) => (
              <button /* focus-visible: */
                key={section.id}
                type="button"
                onClick={() => scrollTo(section.id)} /* focus-visible: */
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors text-left cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
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
              <p className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground px-1">
                Preview Real da Vitrine
              </p>
              {preview}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
