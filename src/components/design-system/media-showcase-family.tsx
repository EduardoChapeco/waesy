import {
  CanonicalMediaFrame,
  CanonicalAvatarCluster,
  CanonicalUploadDropzone,
} from "@/components/ui/canonical";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StateCard } from "./state-card";
import type { ComponentStateProps } from "./design-system-types";
import { Upload } from "lucide-react";

export function MediaShowcaseFamily({ mode }: ComponentStateProps) {
  const showReady = mode === "all" || mode === "ready";
  const showLoading = mode === "all" || mode === "loading";
  const showEmpty = mode === "all" || mode === "empty";
  const showError = mode === "all" || mode === "error";

  const sampleAvatars = [
    { id: "1", name: "Ana Silva", status: "online" as const },
    { id: "2", name: "Carlos Souza", status: "online" as const },
    { id: "3", name: "Beatriz Lima", status: "offline" as const },
    { id: "4", name: "Eduardo Rocha" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Família Mídia e Ativos</h2>
        <p className="text-xs text-muted-foreground">
          CanonicalMediaFrame (anti-CLS), CanonicalAvatarCluster e CanonicalUploadDropzone nas 4 matrizes de estado.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* ESTADO 1: PRONTO */}
        {showReady && (
          <StateCard title="Mídia Ativa" state="ready">
            <div className="flex flex-col gap-3">
              <CanonicalMediaFrame
                src="/brand-logo.png"
                alt="Destino Turístico Canela"
                aspectRatio="video"
              />

              <div className="rounded-lg border border-border p-3 bg-card flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Operadores Ativos</span>
                <CanonicalAvatarCluster avatars={sampleAvatars} maxVisible={3} />
              </div>

              <CanonicalUploadDropzone
                title="Novo anexo"
                description="Selecione arquivos até 10MB."
              />
            </div>
          </StateCard>
        )}

        {/* ESTADO 2: CARREGAMENTO (SKELETON ESPELHADO) */}
        {showLoading && (
          <StateCard title="Mídia em Carga" state="loading">
            <div className="flex flex-col gap-3">
              <CanonicalMediaFrame
                alt="Carregando mídia"
                aspectRatio="video"
                isLoading={true}
              />

              <div className="rounded-lg border border-border p-3 bg-card flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <div className="flex -space-x-2">
                  <Skeleton className="h-11 w-11 rounded-full border-2 border-background" />
                  <Skeleton className="h-11 w-11 rounded-full border-2 border-background" />
                </div>
              </div>

              <CanonicalUploadDropzone isLoading={true} />
            </div>
          </StateCard>
        )}

        {/* ESTADO 3: VAZIO */}
        {showEmpty && (
          <StateCard title="Sem Mídia" state="empty">
            <div className="flex flex-col gap-3">
              <CanonicalMediaFrame
                alt="Sem mídia"
                aspectRatio="video"
                emptyAction={
                  <Button type="button" size="sm" className="h-11 gap-1 text-xs focus-visible:ring-2" onClick={() => {}}>
                    <Upload className="h-3.5 w-3.5" />
                    Enviar Foto
                  </Button>
                }
              />

              <div className="rounded-lg border border-border p-4 bg-card text-center">
                <p className="text-xs text-muted-foreground">Nenhum membro vinculado</p>
              </div>

              <CanonicalUploadDropzone
                title="Zona liberada"
                description="Nenhum arquivo na fila de transferência."
              />
            </div>
          </StateCard>
        )}

        {/* ESTADO 4: ERRO */}
        {showError && (
          <StateCard title="Falha de Mídia" state="error">
            <div className="flex flex-col gap-3">
              <CanonicalMediaFrame
                alt="Erro de carregamento"
                aspectRatio="video"
                errorMessage="Arquivo inacessível no bucket CDN."
                onRetry={() => {}}
              />

              <CanonicalUploadDropzone
                errorMessage="Extensão de arquivo não permitida (apenas PNG/WebP)."
                onRetry={() => {}}
              />
            </div>
          </StateCard>
        )}
      </div>
    </div>
  );
}
