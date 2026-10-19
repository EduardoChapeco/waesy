import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Store, ChevronsUpDown, Search, Check, Plus, Settings, User, Building2, ExternalLink } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface WorkspaceAccountSwitcherProps {
  memberships: any[];
  activeStoreId?: string;
  activeStore?: any;
  userDisplayName: string;
  userEmail?: string;
  isSwitching: boolean;
  onSwitchStore: (storeId: string) => void;
  onSwitchToPersonal?: () => void;
}

export function WorkspaceAccountSwitcher({
  memberships,
  activeStoreId,
  activeStore,
  userDisplayName,
  userEmail,
  isSwitching,
  onSwitchStore,
  onSwitchToPersonal,
}: WorkspaceAccountSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredStores = useMemo(() => {
    if (!searchQuery.trim()) return memberships;
    const q = searchQuery.toLowerCase();
    return memberships.filter(
      (m) =>
        m.name?.toLowerCase().includes(q) ||
        (m.slug || m.store_slug)?.toLowerCase().includes(q) ||
        m.city?.toLowerCase().includes(q) ||
        m.segment?.toLowerCase().includes(q)
    );
  }, [memberships, searchQuery]);

  const userInitial = (userDisplayName || "U").charAt(0).toUpperCase();

  const handlePersonalClick = () => {
    setOpen(false);
    if (onSwitchToPersonal) {
      onSwitchToPersonal();
    } else {
      window.location.href = "/conta";
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={isSwitching}
          className="flex w-full items-center justify-between h-11 min-h-11 px-3 rounded-lg border border-border/60 bg-card hover:bg-muted/70 hover:border-foreground/20 transition-all text-left group cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title={`Espaço de Trabalho: ${activeStore?.name || "Meu Negócio"}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {activeStore?.logo_url ? (
              <img
                src={activeStore.logo_url}
                alt={activeStore.name}
                className="size-8 rounded-lg object-cover shrink-0 border border-border/60 bg-muted"
              />
            ) : (
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                <Store className="size-4" />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-foreground truncate leading-tight group-hover:text-primary transition-colors">
                {activeStore?.name || "Meu Negócio"}
              </h2>
              <p className="text-2xs text-muted-foreground truncate leading-tight mt-0.5">
                {activeStore?.city ? `${activeStore.city} • ` : ""}
                {activeStore?.segment || "Empresa"}
              </p>
            </div>
          </div>
          <ChevronsUpDown className="size-3.5 text-muted-foreground shrink-0 ml-1.5 group-hover:text-foreground transition-colors" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-80 sm:w-88 p-2 rounded-xl border border-border/80 bg-background/98 backdrop-blur-xl shadow-2xl overflow-hidden space-y-2"
      >
        {/* ── 1. Topo: Empresa Ativa em Destaque ── */}
        <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {activeStore?.logo_url ? (
              <img
                src={activeStore.logo_url}
                alt=""
                className="size-9 rounded-lg object-cover shrink-0 border border-border/60 bg-muted"
              />
            ) : (
              <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                {activeStore?.name ? activeStore.name.slice(0, 2).toUpperCase() : "LJ"}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-foreground truncate">
                  {activeStore?.name || "Loja Ativa"}
                </h3>
                <Badge
                  variant="outline"
                  className="text-[9px] font-mono font-bold uppercase px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/30 shrink-0"
                >
                  Ativa
                </Badge>
              </div>
              <p className="text-2xs text-muted-foreground truncate mt-0.5">
                {activeStore?.city ? `${activeStore.city} • ` : ""}
                {activeStore?.segment || "Em Operação"}
              </p>
            </div>
          </div>
          <Link
            to="/workspace/configuracoes"
            onClick={() => setOpen(false)}
            className="size-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Configurações da Empresa"
          >
            <Settings className="size-4" />
          </Link>
        </div>

        {/* ── 2. Busca de Empresas (se houver mais de 2 negócios) ── */}
        {memberships.length > 2 && (
          <div className="relative px-1">
            <Search className="size-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar empresa..."
              className="h-9 pl-8 pr-3 text-xs rounded-lg bg-muted/30 border-border/60 focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>
        )}

        {/* ── 3. Lista de Negócios / Empresas do Usuário ── */}
        <div className="space-y-1 max-h-56 overflow-y-auto no-scrollbar px-1">
          <div className="flex items-center justify-between px-1 py-1">
            <span className="text-2xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
              Minhas Empresas ({memberships.length})
            </span>
            <Link
              to="/workspace/lojas"
              onClick={() => setOpen(false)}
              className="text-2xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              <span>Gerenciar</span>
              <ExternalLink className="size-2.5" />
            </Link>
          </div>

          {filteredStores.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">
              Nenhuma empresa encontrada para &quot;{searchQuery}&quot;.
            </div>
          ) : (
            filteredStores.map((m) => {
              const isCurrent = m.store_id === activeStoreId;
              return (
                <button
                  key={m.store_id}
                  type="button"
                  onClick={() => {
                    if (!isCurrent) {
                      onSwitchStore(m.store_id);
                      setOpen(false);
                    }
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer text-left h-11 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isCurrent
                      ? "bg-primary/10 border border-primary/25 text-foreground"
                      : "hover:bg-muted/60 text-muted-foreground hover:text-foreground border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {m.logo_url ? (
                      <img
                        src={m.logo_url}
                        alt=""
                        className="size-7 rounded-lg object-cover shrink-0 border border-border/50 bg-muted"
                      />
                    ) : (
                      <div className="size-7 rounded-lg bg-muted text-muted-foreground flex items-center justify-center font-bold text-xs shrink-0 border border-border/50">
                        {m.name ? m.name.slice(0, 2).toUpperCase() : "LJ"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className={cn("text-xs font-bold truncate", isCurrent ? "text-primary" : "text-foreground")}>
                        {m.name || "Empresa"}
                      </p>
                      <p className="text-2xs text-muted-foreground truncate">
                        {m.city ? `${m.city} • ` : ""}
                        {m.segment || "Comércio"}
                      </p>
                    </div>
                  </div>
                  {isCurrent && (
                    <div className="size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                      <Check className="size-3" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* ── 4. Alternância para Conta Pessoal Civil ── */}
        <div className="pt-2 border-t border-border/40 px-1 space-y-1">
          <span className="text-2xs font-mono font-bold uppercase tracking-wider text-muted-foreground px-1 block">
            Conta Pessoal
          </span>
          <button
            type="button"
            onClick={handlePersonalClick}
            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/60 transition-colors cursor-pointer text-left h-11 min-h-11 border border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                <User className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                  {userDisplayName}
                </p>
                <p className="text-2xs text-muted-foreground truncate">
                  Acessar conta civil, pedidos e favoritos
                </p>
              </div>
            </div>
            <ExternalLink className="size-3 text-muted-foreground group-hover:text-foreground shrink-0" />
          </button>
        </div>

        {/* ── 5. Rodapé Operacional: Criar Novo Negócio ── */}
        <div className="pt-2 border-t border-border/40 px-1">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="w-full text-xs font-bold rounded-lg h-11 min-h-11 gap-2 justify-center border-border/60 bg-card hover:bg-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Link
              to="/criar-negocio"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 size-full"
            >
              <Plus className="size-3.5" />
              <span>Cadastrar Novo Negócio</span>
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
