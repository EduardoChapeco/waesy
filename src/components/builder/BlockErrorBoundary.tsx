import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  blockId: string;
  blockType?: string;
  onRemoveBlock?: (blockId: string) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * BlockErrorBoundary — Barreira defensiva contra telas brancas no OmniBuilder.
 * Isola exceções de renderização de blocos individuais, permitindo que o
 * restante da página e os controles do editor continuem funcionando 100%.
 */
export class BlockErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `[OmniBuilder:BlockErrorBoundary] Falha isolada no bloco "${this.props.blockType || "desconhecido"}" (ID: ${this.props.blockId}):`,
      error,
      errorInfo
    );
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleRemove = () => {
    if (this.props.onRemoveBlock) {
      this.props.onRemoveBlock(this.props.blockId);
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="w-full my-4 p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-destructive/10 text-destructive shrink-0 mt-0.5 sm:mt-0">
              <AlertTriangle className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold tracking-tight text-foreground">
                Falha na renderização deste bloco (
                <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                  {this.props.blockType || "bloco"}
                </code>
                )
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Os dados deste elemento estão incompletos ou incompatíveis. O restante do seu site continua seguro.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={this.handleRetry}
              className="h-11 min-h-11 px-4 gap-2 text-xs font-medium focus-visible:ring-2"
            >
              <RefreshCw className="size-3.5" />
              Recarregar
            </Button>
            {this.props.onRemoveBlock && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={this.handleRemove}
                className="h-11 min-h-11 px-3 text-xs text-destructive hover:bg-destructive/10 focus-visible:ring-2"
              >
                <Trash2 className="size-3.5" />
                <span className="sr-only">Remover bloco com erro</span>
              </Button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
