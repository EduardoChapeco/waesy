import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DesignSystemStateMode } from "./design-system-types";

interface DesignSystemHeaderProps {
  currentMode: DesignSystemStateMode;
  onSelectMode: (mode: DesignSystemStateMode) => void;
}

const MODES: Array<{ id: DesignSystemStateMode; label: string }> = [
  { id: "all", label: "Todos os Estados" },
  { id: "ready", label: "Dados" },
  { id: "loading", label: "Carregamento" },
  { id: "empty", label: "Vazio" },
  { id: "error", label: "Erro" },
];

export function DesignSystemHeader({ currentMode, onSelectMode }: DesignSystemHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Design System Canônico
          </h1>
          <p className="text-sm text-muted-foreground">
            Catálogo de primitivas de interface e matriz completa de quatro estados.
          </p>
        </div>
        <div className="flex items-center gap-2 pt-2 sm:pt-0">
          <Badge variant="outline" className="text-xs">
            133 Tokens W3C
          </Badge>
          <Badge variant="secondary" className="text-xs">
            11 Famílias
          </Badge>
          <Badge variant="default" className="text-xs">
            4 Estados
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground mr-1">
          Filtro de Estado:
        </span>
        {MODES.map((mode) => {
          const isActive = currentMode === mode.id;
          return (
            <Button
              key={mode.id}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => onSelectMode(mode.id)}
              className="h-11 sm:h-9 text-xs px-3 focus-visible:ring-2"
            >
              {mode.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
