import { useState } from "react";
import {
  CanonicalAppHeader,
  CanonicalBreadcrumbsBar,
} from "@/components/ui/canonical";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { StateCard } from "./state-card";
import type { ComponentStateProps } from "./design-system-types";
import {
  Home,
  ShoppingBag,
  Settings,
  Navigation,
  AlertCircle,
  RefreshCw,
  Plus,
} from "lucide-react";

export function NavigationFamily({ mode }: ComponentStateProps) {
  const [activeTab, setActiveTab] = useState("home");

  const showReady = mode === "all" || mode === "ready";
  const showLoading = mode === "all" || mode === "loading";
  const showEmpty = mode === "all" || mode === "empty";
  const showError = mode === "all" || mode === "error";

  const railItems = [
    { id: "home", label: "Início", icon: <Home className="h-6 w-6" />, active: activeTab === "home", onSelect: () => setActiveTab("home") },
    { id: "catalog", label: "Catálogo", icon: <ShoppingBag className="h-6 w-6" />, active: activeTab === "catalog", onSelect: () => setActiveTab("catalog") },
    { id: "settings", label: "Ajustes", icon: <Settings className="h-6 w-6" />, active: activeTab === "settings", onSelect: () => setActiveTab("settings") },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Família Shell e Navegação</h2>
        <p className="text-xs text-muted-foreground">
          AppHeader, BottomBar móvel, GlobalRail e Breadcrumbs nas 4 matrizes de estado.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* ESTADO 1: PRONTO */}
        {showReady && (
          <StateCard title="Shell Ativo e Responsivo" state="ready">
            <div className="flex flex-col gap-3">
              <div className="rounded-lg border border-border overflow-hidden bg-card">
                <CanonicalAppHeader
                  title="Gestão Comercial"
                  badge={<Badge variant="secondary">Pro</Badge>}
                  actions={
                    <Button size="sm" className="h-11 gap-1 text-xs">
                      <Plus className="h-3.5 w-3.5" />
                      Novo
                    </Button>
                  }
                />
              </div>

              <div className="rounded-lg border border-border p-2 bg-card">
                <CanonicalBreadcrumbsBar
                  crumbs={[
                    { label: "Workspace" },
                    { label: "Catálogo" },
                    { label: "Produtos", current: true },
                  ]}
                />
              </div>

              <div className="rounded-lg border border-border p-2 bg-card flex justify-center">
                <div className="flex gap-2">
                  {railItems.map((item) => (
                    <Button
                      key={item.id}
                      variant={item.active ? "default" : "outline"}
                      size="sm"
                      onClick={item.onSelect} /* focus-visible:ring-2 */
                      className="h-11 w-11 p-0 rounded-lg focus-visible:ring-2"
                    >
                      {item.icon}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </StateCard>
        )}

        {/* ESTADO 2: CARREGAMENTO (SKELETON ESPELHADO) */}
        {showLoading && (
          <StateCard title="Navegação em Carga" state="loading">
            <div className="flex flex-col gap-3">
              <div className="rounded-lg border border-border p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-10 rounded-full" />
                </div>
                <Skeleton className="h-11 w-16 rounded-md" />
              </div>

              <div className="rounded-lg border border-border p-2 flex items-center gap-2">
                <Skeleton className="h-3 w-4" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>

              <div className="rounded-lg border border-border p-2 flex justify-center gap-2">
                <Skeleton className="h-11 w-11 rounded-lg" />
                <Skeleton className="h-11 w-11 rounded-lg" />
                <Skeleton className="h-11 w-11 rounded-lg" />
              </div>
            </div>
          </StateCard>
        )}

        {/* ESTADO 3: VAZIO */}
        {showEmpty && (
          <StateCard title="Navegação Desabilitada" state="empty">
            <EmptyState
              icon={Navigation}
              title="Sem rotas atribuídas"
              description="O operador não possui módulos atribuídos ao seu nível de acesso."
              className="py-4 min-h-44"
            />
          </StateCard>
        )}

        {/* ESTADO 4: ERRO */}
        {showError && (
          <StateCard title="Falha de Roteamento" state="error">
            <div className="flex flex-col gap-3">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Rota Inacessível</AlertTitle>
                <AlertDescription className="text-xs">
                  O módulo solicitado requer contexto de tenant ativo.
                </AlertDescription>
              </Alert>

              <Button
                variant="outline"
                size="sm"
                className="h-11 w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Recarregar contexto
              </Button>
            </div>
          </StateCard>
        )}
      </div>
    </div>
  );
}
