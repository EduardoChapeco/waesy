import { useCallback, useEffect, useState } from "react";
import { SquaresFour, ArrowSquareOut, ArrowsClockwise } from "@phosphor-icons/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  getPublicEcosystemSubsystemsFn,
  type PublicEcosystemConfigDTO,
} from "@/services/vertical-subsystems.functions";
import {
  CANONICAL_VERTICAL_SUBSYSTEMS,
  resolveSubsystemHref,
} from "@/lib/vertical-subsystems";

interface WaesyHubLauncherProps {
  compact?: boolean;
}

export function WaesyHubLauncher({ compact = false }: WaesyHubLauncherProps) {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<PublicEcosystemConfigDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const next = await getPublicEcosystemSubsystemsFn();
      setConfig(next);
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !config && !isLoading) {
      void loadConfig();
    }
  }, [open, config, isLoading, loadConfig]);

  const subsystems = (config?.subsystems || CANONICAL_VERTICAL_SUBSYSTEMS).filter(
    (s) => s.isActive && s.showInHub,
  );
  const currentHost = typeof window !== "undefined" ? window.location.hostname : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Abrir Hub Waesy de Aplicativos"
          title="Hub Waesy"
          className="inline-flex h-11 min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-border bg-muted/50 px-3 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
        >
          <SquaresFour className="size-4 text-primary shrink-0" weight="bold" />
          {!compact && <span className="hidden md:inline">Hub Waesy</span>}
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-80 sm:w-96 p-3 rounded-xl border border-border bg-popover">
        <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-3">
          <div>
            <p className="text-xs font-semibold text-foreground">Hub Waesy</p>
            <p className="text-xs text-muted-foreground">Alterne entre sistemas e vitrines</p>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {subsystems.length} apps
          </Badge>
        </div>

        {isLoading && !config ? (
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
          </div>
        ) : isError && !config ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-center space-y-2">
            <p className="text-xs text-destructive">Falha ao carregar aplicativos do Hub.</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadConfig()}
              className="h-11 min-h-11 text-xs gap-2"
            >
              <ArrowsClockwise className="size-3.5" />
              <span>Tentar novamente</span>
            </Button>
          </div>
        ) : subsystems.length === 0 ? (
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-center">
            <p className="text-xs text-muted-foreground">Nenhum aplicativo ativo no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
            {subsystems.map((sub) => {
              const target = resolveSubsystemHref(sub, currentHost);
              return (
                <a
                  key={sub.id}
                  href={target.href}
                  target={target.external ? "_blank" : undefined}
                  rel={target.external ? "noopener noreferrer" : undefined}
                  onClick={() => setOpen(false)}
                  className="flex flex-col justify-between gap-1 rounded-lg border border-border/70 bg-card p-3 hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-11"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-foreground truncate">{sub.shortName}</span>
                    {target.external && <ArrowSquareOut className="size-3 text-muted-foreground shrink-0" />}
                  </div>
                  <span className="text-xs font-mono text-primary truncate">{sub.canonicalDomain}</span>
                </a>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
