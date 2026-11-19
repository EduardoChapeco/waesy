import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Store, ChevronsUpDown, Check, Settings, ExternalLink } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getNicheSemantics } from "@/lib/niches/niche-semantics";

interface WorkspaceAccountSwitcherProps {
  memberships: any[];
  activeStoreId?: string;
  activeStore?: any;
  userDisplayName: string;
  userEmail?: string;
  userAvatarUrl?: string | null;
  isSwitching: boolean;
  onSwitchStore?: (storeId: string) => void;
}

export function WorkspaceAccountSwitcher({
  memberships,
  activeStoreId,
  activeStore,
  userDisplayName,
  userEmail,
  userAvatarUrl,
  isSwitching,
}: WorkspaceAccountSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const userInitial = (userDisplayName || "U").charAt(0).toUpperCase();
  const activeMembership = memberships.find((m) => m.store_id === activeStoreId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={isSwitching}
          className="flex w-full items-center justify-between h-11 min-h-11 px-2 rounded-xl bg-transparent hover:bg-rail-hover transition-colors text-left group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title={`Espaço de Trabalho: ${activeStore?.name || "Meu Negócio"}`}
        >
          <div className="flex flex-1 items-center gap-2 min-w-0">
            {activeStore?.logo_url ? (
              <img
                src={activeStore.logo_url}
                alt={activeStore.name}
                className="size-8 rounded-lg object-cover shrink-0 bg-muted"
              />
            ) : (
              <div className="size-8 rounded-lg bg-foreground text-background flex items-center justify-center font-bold text-xs shrink-0">
                <Store className="size-4" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-xs font-bold text-foreground truncate leading-tight">
                {activeStore?.name || "Meu Negócio"}
              </h2>
              <p className="text-2xs text-muted-foreground truncate leading-tight mt-1">
                {activeStore?.city ? `${activeStore.city} • ` : ""}
                {activeStore ? getNicheSemantics(activeStore).name : "Empresa"}
              </p>
            </div>
          </div>
          <ChevronsUpDown className="size-3.5 text-muted-foreground shrink-0 ml-1 group-hover:text-foreground transition-colors" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-80 sm:w-88 p-2 rounded-2xl border border-border bg-popover overflow-hidden space-y-2"
      >
        {/* ── 1. Topo: Empresa Ativa em Destaque ── */}
        <div className="p-3 rounded-xl bg-muted/50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            {activeStore?.logo_url ? (
              <img
                src={activeStore.logo_url}
                alt=""
                className="size-9 rounded-lg object-cover shrink-0 bg-muted"
              />
            ) : (
              <div className="size-9 rounded-lg bg-foreground text-background flex items-center justify-center font-bold text-xs shrink-0">
                {activeStore?.name ? activeStore.name.slice(0, 2).toUpperCase() : "LJ"}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-foreground truncate">
                  {activeStore?.name || "Loja Ativa"}
                </h3>
                <Badge
                  variant="secondary"
                  className="text-3xs font-mono font-bold uppercase px-2 py-0 h-4 shrink-0"
                >
                  Ativa
                </Badge>
              </div>
              <p className="text-2xs text-muted-foreground truncate mt-1">
                {activeStore?.city ? `${activeStore.city} • ` : ""}
                {activeStore ? getNicheSemantics(activeStore).name : "Em Operação"}
              </p>
            </div>
          </div>
          <Link
            to="/workspace/configuracoes"
            onClick={() => setOpen(false)}
            className="size-9 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-11 sm:min-h-0 min-w-11 sm:min-w-0"
            title="Configurações da Empresa"
          >
            <Settings className="size-4" />
          </Link>
        </div>

        {/* ── 2. Identidade Operacional do Tenant Isolado ── */}
        <div className="space-y-2 px-1">
          <div className="flex items-center justify-between px-1 py-1">
            <span className="text-2xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
              Empresa Conectada
            </span>
            {memberships.length > 1 && (
              <Link
                to="/auth/portal-selector"
                onClick={() => setOpen(false)}
                className="text-2xs font-bold text-foreground hover:underline flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span>Trocar Empresa</span>
                <ExternalLink className="size-2.5" />
              </Link>
            )}
          </div>

          <div
            className={cn(
              "w-full flex items-center justify-between p-2 rounded-xl bg-muted text-foreground text-left min-h-11",
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              {userAvatarUrl && !avatarFailed ? (
                <img
                  src={userAvatarUrl}
                  alt={userDisplayName}
                  onError={() => setAvatarFailed(true)}
                  className="size-7 rounded-full object-cover shrink-0 bg-muted"
                />
              ) : (
                <div className="size-7 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-xs shrink-0">
                  {userInitial}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold truncate text-foreground">
                  {userDisplayName}
                </p>
                <p className="text-2xs text-muted-foreground truncate">
                  {activeMembership?.role || "Operador"}
                  {userEmail ? ` • ${userEmail}` : ""}
                </p>
              </div>
            </div>
            <div className="size-5 rounded-full bg-foreground text-background flex items-center justify-center shrink-0">
              <Check className="size-3" />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
