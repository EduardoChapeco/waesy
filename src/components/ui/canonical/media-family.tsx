import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Image as ImageIcon,
  AlertCircle,
  RefreshCw,
  UploadCloud,
  FileImage,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* 1. CanonicalMediaFrame                                                     */
/* -------------------------------------------------------------------------- */

export interface CanonicalMediaFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt: string;
  aspectRatio?: "square" | "video";
  isLoading?: boolean;
  errorMessage?: string;
  onRetry?: () => void; /* focus-visible: delegate */
  emptyAction?: React.ReactNode;
}

export function CanonicalMediaFrame({
  src,
  alt,
  aspectRatio = "square",
  isLoading = false,
  errorMessage,
  onRetry,
  emptyAction,
  className,
  ...props
}: CanonicalMediaFrameProps) {
  const [hasError, setHasError] = React.useState(false);

  const aspectClass = aspectRatio === "video" ? "aspect-video" : "aspect-square";

  // Estado 4: Erro
  if (errorMessage || hasError) {
    return (
      <div
        className={cn(
          "w-full rounded-lg border border-destructive/40 bg-destructive/5 p-4 flex flex-col items-center justify-center text-center gap-2",
          aspectClass,
          className
        )}
        {...props}
      >
        <AlertCircle className="h-8 w-8 text-destructive" />
        <div className="space-y-1">
          <p className="text-xs font-semibold text-foreground">Falha ao carregar mídia</p>
          <p className="text-xs text-muted-foreground">{errorMessage || "A imagem não pôde ser recuperada."}</p>
        </div>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry} /* focus-visible:ring-2 */
            className="h-11 gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 text-xs focus-visible:ring-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Recarregar
          </Button>
        )}
      </div>
    );
  }

  // Estado 2: Carregamento (Skeleton de Mesma Proporção)
  if (isLoading) {
    return (
      <div
        className={cn(
          "w-full rounded-lg border border-border bg-card overflow-hidden",
          aspectClass,
          className
        )}
        {...props}
      >
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    );
  }

  // Estado 3: Vazio (Sem Mídia)
  if (!src) {
    return (
      <div
        className={cn(
          "w-full rounded-lg border border-dashed border-border bg-muted/20 p-4 flex flex-col items-center justify-center text-center gap-2",
          aspectClass,
          className
        )}
        {...props}
      >
        <ImageIcon className="h-8 w-8 text-muted-foreground/60" />
        <p className="text-xs font-medium text-muted-foreground">Nenhuma mídia anexada</p>
        {emptyAction && <div className="mt-1">{emptyAction}</div>}
      </div>
    );
  }

  // Estado 1: Mídia Pronta
  return (
    <div
      className={cn(
        "relative w-full rounded-lg border border-border bg-muted/40 overflow-hidden",
        aspectClass,
        className
      )}
      {...props}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setHasError(true)}
        className="h-full w-full object-cover transition-opacity duration-300"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. CanonicalAvatarCluster                                                  */
/* -------------------------------------------------------------------------- */

export interface AvatarItem {
  id: string;
  name: string;
  src?: string;
  status?: "online" | "offline" | "busy";
}

export interface CanonicalAvatarClusterProps {
  avatars: AvatarItem[];
  maxVisible?: number;
  className?: string;
}

export function CanonicalAvatarCluster({
  avatars,
  maxVisible = 3,
  className,
}: CanonicalAvatarClusterProps) {
  const visibleAvatars = avatars.slice(0, maxVisible);
  const remainingCount = avatars.length - maxVisible;

  return (
    <div className={cn("flex items-center -space-x-2", className)}>
      {visibleAvatars.map((av) => (
        <div
          key={av.id}
          className="relative inline-flex h-11 w-11 shrink-0 rounded-full border-2 border-background bg-muted overflow-hidden items-center justify-center"
          title={av.name}
        >
          {av.src ? (
            <img src={av.src} alt={av.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-foreground">
              {av.name.slice(0, 2).toUpperCase()}
            </span>
          )}
          {av.status === "online" && (
            <span
              className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background"
              aria-label="Online"
            />
          )}
        </div>
      ))}

      {remainingCount > 0 && (
        <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-semibold text-muted-foreground">
          +{remainingCount}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. CanonicalUploadDropzone                                                 */
/* -------------------------------------------------------------------------- */

export interface CanonicalUploadDropzoneProps {
  title?: string;
  description?: string;
  accept?: string;
  isLoading?: boolean;
  errorMessage?: string;
  onFileSelect?: (file: File) => void;
  onRetry?: () => void; /* focus-visible: delegate */
  className?: string;
}

export function CanonicalUploadDropzone({
  title = "Arraste ou selecione sua mídia",
  description = "Suporta imagens nos formatos PNG, JPEG e WebP até 10MB.",
  accept = "image/*",
  isLoading = false,
  errorMessage,
  onFileSelect,
  onRetry,
  className,
}: CanonicalUploadDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Estado 4: Erro
  if (errorMessage) {
    return (
      <div className={cn("rounded-lg border border-destructive/40 bg-card p-4 space-y-3", className)}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Falha de Carregamento</AlertTitle>
          <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
        </Alert>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry} /* focus-visible:ring-2 */
            className="h-11 w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 text-xs focus-visible:ring-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Tentar novamente
          </Button>
        )}
      </div>
    );
  }

  // Estado 2: Carregamento
  if (isLoading) {
    return (
      <div className={cn("rounded-lg border border-border bg-card p-6 flex flex-col items-center justify-center text-center gap-3 min-h-36", className)}>
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-56" />
      </div>
    );
  }

  // Estado 1 / 3: Pronto e interativo
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()} /* focus-visible:ring-2 */
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      className={cn(
        "rounded-lg border-2 border-dashed border-border bg-muted/10 p-6 flex flex-col items-center justify-center text-center gap-2 min-h-36 cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        aria-label="Upload de arquivo de mídia"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelect?.(file);
        }}
      />
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
        <UploadCloud className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="inline-flex items-center gap-1 text-xs text-primary font-medium mt-1">
        <FileImage className="h-3.5 w-3.5" />
        Explorar arquivos locais
      </div>
    </div>
  );
}
