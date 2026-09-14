import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox, AlertTriangle, Lock, PlugZap, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Canonical UI states Commerce (see DESIGN.md §5).
 * Every data/action surface must be able to render these honestly.
 * None of these perform commercial calculation or fabricate data.
 */

interface StateShellProps {
 icon: LucideIcon;
 title: string;
 description?: ReactNode;
 action?: ReactNode;
 className?: string;
 tone?: "neutral" | "brand" | "destructive" | "info" | "warning";
 minimal?: boolean;
}

const toneClasses: Record<NonNullable<StateShellProps["tone"]>, string> = {
 neutral: "bg-muted text-muted-foreground",
 brand: "bg-accent text-accent-foreground",
 destructive: "bg-destructive/10 text-destructive",
 info: "bg-info/10 text-info",
 warning: "bg-warning/15 text-warning-foreground",
};

function StateShell({
 icon: Icon,
 title,
 description,
 action,
 className,
 tone = "neutral",
 minimal = false,
}: StateShellProps) {
 return (
 <div
 className={cn(
 "flex flex-col items-center justify-center text-center",
 minimal ? "bg-transparent py-8 px-4" : "rounded-xl bg-card px-6 py-12",
 className,
 )}
 role="status"
 >
 <span className={cn("mb-4 grid size-12 place-items-center rounded-full", toneClasses[tone])}>
 <Icon className="size-6" aria-hidden />
 </span>
 <h3 className="text-lg font-semibold text-foreground">{title}</h3>
 {description ? (
 <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{description}</p>
 ) : null}
 {action ? <div className="mt-5">{action}</div> : null}
 </div>
 );
}

export function EmptyState(props: Omit<StateShellProps, "icon" | "tone"> & { minimal?: boolean }) {
 return <StateShell icon={Inbox} tone="neutral" minimal={props.minimal ?? true} {...props} />;
}

export function ErrorState({
 onRetry,
 title = "Algo deu errado",
 description = "Não foi possível carregar este conteúdo. Tente novamente.",
 ...props
}: Omit<StateShellProps, "icon" | "tone" | "action" | "title" | "description"> & {
 title?: string;
 description?: ReactNode;
 onRetry?: () => void;
}) {
 return (
 <StateShell
 icon={AlertTriangle}
 tone="destructive"
 title={title}
 description={description}
 action={
 onRetry ? (
 <Button variant="outline" onClick={onRetry}>
 <RefreshCw className="size-4" aria-hidden />
 Tentar novamente
 </Button>
 ) : undefined
 }
 {...props}
 />
 );
}

export function PermissionDenied({
 title = "Acesso restrito",
 description = "Você não tem permissão para ver esta área. Fale com um administrador da loja.",
 ...props
}: Omit<StateShellProps, "icon" | "tone" | "title" | "description"> & {
 title?: string;
 description?: ReactNode;
}) {
 return (
 <StateShell icon={Lock} tone="warning" title={title} description={description} {...props} />
 );
}

export function UnconfiguredState({
 title = "Vitrine em Atualização",
 description = "Estamos preparando e atualizando nossa vitrine de produtos. Por favor, volte em alguns instantes para conferir as novidades.",
 ...props
}: Omit<StateShellProps, "icon" | "tone" | "title" | "description"> & {
 title?: string;
 description?: ReactNode;
}) {
 return (
 <StateShell icon={PlugZap} tone="info" title={title} description={description} {...props} />
 );
}

/** Canonical alias for PermissionDenied (see COMPONENT_CATALOG.md). */
export const PermissionState = PermissionDenied;

/**
 * StatusBadge — canonical status pill for integrations/entities.
 * Maps a semantic status to a token-based tone; never hardcodes color.
 */
export type EntityStatus = "unconfigured" | "testing" | "active" | "error" | "planned";

const STATUS_MAP: Record<EntityStatus, { label: string; className: string }> = {
 unconfigured: { label: "Em ativação", className: "bg-muted text-muted-foreground" },
 testing: { label: "Em homologação", className: "bg-warning/15 text-warning-foreground" },
 active: { label: "Conectado", className: "bg-success/15 text-success" },
 error: { label: "Instabilidade", className: "bg-destructive/10 text-destructive" },
 planned: { label: "Fases futuras", className: "bg-accent text-accent-foreground" },
};

export function StatusBadge({
 status,
 label,
 className,
}: {
 status: EntityStatus;
 label?: string;
 className?: string;
}) {
 const cfg = STATUS_MAP[status];
 return (
 <span
 className={cn(
 "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
 cfg.className,
 className,
 )}
 >
 {label ?? cfg.label}
 </span>
 );
}

/**
 * SectionFrame — canonical wrapper for a titled content section with
 * consistent spacing. Presentation only.
 */
export function SectionFrame({
 eyebrow,
 title,
 action,
 children,
 className,
}: {
 eyebrow?: string;
 title?: ReactNode;
 action?: ReactNode;
 children: ReactNode;
 className?: string;
}) {
 return (
 <section className={cn("mx-auto max-w-screen-xl px-4 md:px-6", className)}>
 {(title || action) && (
 <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
 <div>
 {eyebrow ? <p className="eyebrow text-primary">{eyebrow}</p> : null}
 {title ? (
 <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
 {title}
 </h2>
 ) : null}
 </div>
 {action ? <div>{action}</div> : null}
 </div>
 )}
 {children}
 </section>
 );
}
