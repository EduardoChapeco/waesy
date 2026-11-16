import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { ArrowRight, ExternalLink, Layers, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/state/states";
import { listPublicVerticalSystemsCatalogFn } from "@/services/vertical-landings.functions";
import { resolveSubsystemHref } from "@/lib/vertical-subsystems";

export const Route = createFileRoute("/_store/sistemas/")({
  head: () => ({
    meta: [
      { title: "Sistemas Verticais & Apps — Waesy" },
      { name: "description", content: "Explore cada sistema isolado por nicho, seus módulos exclusivos e pacotes dedicados no ecossistema Waesy." },
    ],
  }),
  loader: async () => {
    try {
      const systems = await listPublicVerticalSystemsCatalogFn();
      return { systems: systems || [] };
    } catch {
      return { systems: [] };
    }
  },
  component: SistemasCatalogPage,
});

function SistemasCatalogPage() {
  const { systems = [] } = ((Route.useLoaderData?.() as any) || {});
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | "saas_brand" | "vertical_workspace" | "public_app">("all");
  const currentHost = typeof window !== "undefined" ? window.location.hostname : "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (systems as any[]).filter((s) => {
      if (category !== "all" && s.category !== category) return false;
      if (!q) return true;
      return (
        String(s.name).toLowerCase().includes(q) ||
        String(s.description).toLowerCase().includes(q) ||
        String(s.canonicalDomain).toLowerCase().includes(q)
      );
    });
  }, [systems, query, category]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      <section className="rounded-2xl border border-border bg-card p-6 sm:p-10 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono gap-2">
            <ShieldCheck className="size-3.5 text-primary" />
            <span>Sistemas Verticais Waesy</span>
          </Badge>
        </div>

        <div className="space-y-2 max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Sistemas Isolados por Nicho
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Cada vertical entrega exclusivamente os módulos, nomenclatura e planos do seu mercado com login unificado e subdomínio próprio.
          </p>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
          <div className="relative flex-1 max-w-md">
            <Search className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar sistema ou nicho..."
              className="pl-10 h-11 min-h-11 rounded-xl"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: "all", label: "Todos" },
                { id: "saas_brand", label: "Verticais SaaS" },
                { id: "vertical_workspace", label: "Gestão Pro" },
                { id: "public_app", label: "Apps Públicos" },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setCategory(f.id)}
                className={`h-11 min-h-11 px-4 rounded-xl text-xs font-semibold border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  category === f.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Nenhum sistema encontrado"
          description="Ajuste sua busca ou filtro de categoria para visualizar outros sistemas verticais."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((sub: any) => {
            const href = resolveSubsystemHref(sub, currentHost);
            return (
              <div
                key={sub.id}
                className="rounded-2xl border border-border bg-card p-5 flex flex-col justify-between gap-5"
              >
                <div className="space-y-3">
                  {sub.heroImageUrl && (
                    <div className="rounded-xl overflow-hidden border border-border/60 aspect-video bg-muted">
                      <img src={sub.heroImageUrl} alt={sub.name} className="size-full object-cover" />
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary" className="text-2xs font-mono">
                      {sub.canonicalDomain}
                    </Badge>
                    <span className="text-2xs font-mono text-muted-foreground">
                      {sub.modulesCount} módulos
                    </span>
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-base font-bold text-foreground">{sub.name}</h2>
                    <p className="text-xs text-muted-foreground leading-relaxed">{sub.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/50">
                  <Button asChild variant="outline" className="flex-1 h-11 min-h-11 text-xs font-semibold gap-2">
                    <Link to="/sistemas/$slug" params={{ slug: sub.id }}>
                      <span>Conhecer Sistema</span>
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                  <a
                    href={href.href}
                    target={href.external ? "_blank" : undefined}
                    rel={href.external ? "noopener noreferrer" : undefined}
                    aria-label={`Acessar ${sub.shortName}`}
                    className="size-11 min-h-11 min-w-11 rounded-xl border border-border bg-background flex items-center justify-center text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                  >
                    <ExternalLink className="size-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
