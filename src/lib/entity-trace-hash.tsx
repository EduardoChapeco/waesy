import * as React from "react";
import { cn } from "@/lib/utils";

export type TraceableEntityType =
  | "customer"
  | "trip"
  | "group_tour"
  | "order"
  | "booking"
  | "contract"
  | "ticket"
  | "incident"
  | "task"
  | "lead"
  | "service"
  | "general";

export type OnboardingStepKey =
  | "docs_received"
  | "contract_signed"
  | "payment_verified"
  | "issuance_completed"
  | "vouchers_sent"
  | "onboarding_ready"
  | "cs_completed";

export interface OnboardingStepDefinition {
  key: OnboardingStepKey;
  shortLabel: string;
  fullLabel: string;
  description: string;
}

export const ONBOARDING_CS_STEPS: OnboardingStepDefinition[] = [
  {
    key: "docs_received",
    shortLabel: "Docs / Cadastro",
    fullLabel: "Recebimento de Documentos & Dados",
    description: "RG, CPF, passaporte ou ficha cadastral conferidos",
  },
  {
    key: "contract_signed",
    shortLabel: "Assinatura",
    fullLabel: "Assinatura de Contrato / Termo",
    description: "Contrato ou termo comercial assinado pelas partes",
  },
  {
    key: "payment_verified",
    shortLabel: "Financeiro OK",
    fullLabel: "Pagamento / Entrada Conciliada",
    description: "PIX, boleto ou parcelamento confirmado no financeiro",
  },
  {
    key: "issuance_completed",
    shortLabel: "Emissão / PNR",
    fullLabel: "Emissão na Operadora / Cia / Pedido",
    description: "Bilhete aéreo, localizador PNR, hotel ou pedido emitido",
  },
  {
    key: "vouchers_sent",
    shortLabel: "Envio Docs/Voucher",
    fullLabel: "Vouchers & Documentos Enviados",
    description: "Vouchers, bilhetes e recibos enviados ao cliente",
  },
  {
    key: "onboarding_ready",
    shortLabel: "Pré-Embarque CS",
    fullLabel: "Alinhamento Pré-Embarque / Entrega",
    description: "Check-in, orientações finais e confirmação com o cliente",
  },
  {
    key: "cs_completed",
    shortLabel: "Pós-Venda CS",
    fullLabel: "Customer Success & Pós-Venda",
    description: "Acompanhamento de conclusão e pesquisa de satisfação",
  },
];

export type SacFunctionRoleKey =
  | "sac_pepinos"
  | "customer_success"
  | "operadora_cia"
  | "reembolso_financeiro"
  | "documentacao"
  | "comercial";

export const SAC_FUNCTION_ROLES: Array<{
  key: SacFunctionRoleKey;
  label: string;
  shortLabel: string;
  badgeClass: string;
}> = [
  {
    key: "sac_pepinos",
    label: "Resolução de Pepinos / Incidentes Críticos",
    shortLabel: "Pepinos / Crítico",
    badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  },
  {
    key: "customer_success",
    label: "Customer Success & Onboarding",
    shortLabel: "Customer Success",
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
  {
    key: "operadora_cia",
    label: "Operadora, Aéreo & PNR",
    shortLabel: "Operadora / PNR",
    badgeClass: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  },
  {
    key: "reembolso_financeiro",
    label: "Financeiro, Reembolsos & Boletos",
    shortLabel: "Financeiro / SAC",
    badgeClass: "bg-warning/15 text-warning-strong border-warning/30",
  },
  {
    key: "documentacao",
    label: "Documentação, Contratos & Vouchers",
    shortLabel: "Documentação",
    badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
  },
  {
    key: "comercial",
    label: "Consultor / Agente da Viagem",
    shortLabel: "Consultor Viagem",
    badgeClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
  },
];

const ENTITY_PREFIX_MAP: Record<TraceableEntityType, string> = {
  customer: "CLI",
  trip: "TRP",
  group_tour: "TRP",
  order: "PED",
  booking: "AGD",
  contract: "CTR",
  ticket: "SAC",
  incident: "INC",
  task: "TSK",
  lead: "OPR",
  service: "SRV",
  general: "WZY",
};

/**
 * Gera um hash curto determinístico de 4 caracteres alfanuméricos a partir de qualquer ID, telefone ou código.
 */
export function computeDeterministicShortCode(seed?: string | null): string {
  const raw = String(seed || "").trim();
  if (!raw) return "0000";
  const cleaned = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (cleaned.length >= 4 && !/^[0-9A-F]{8,}$/i.test(cleaned)) {
    return cleaned.slice(-4);
  }
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let out = "";
  let unsigned = hash >>> 0;
  for (let i = 0; i < 4; i++) {
    out += alphabet[unsigned % alphabet.length];
    unsigned = Math.floor(unsigned / alphabet.length);
  }
  return out;
}

/**
 * Gera o código de rastreabilidade canônico (#CLI-XXXX, #TRP-XXXX, #PED-XXXX, #SAC-XXXX, #TSK-XXXX).
 */
export function buildEntityTraceHash(
  entityType: TraceableEntityType,
  idOrCode?: string | null
): string {
  const prefix = ENTITY_PREFIX_MAP[entityType] || "WZY";
  const raw = String(idOrCode || "").trim();
  if (!raw) return `#${prefix}-0000`;

  if (raw.startsWith("#")) return raw.toUpperCase();

  // Se já vier no formato TRP-1234, TKT-ABCD, TSK-1234, preserva com #
  if (/^(CLI|TRP|PED|AGD|CTR|SAC|TKT|INC|TSK|OPR|SRV)-[A-Z0-9]{3,10}$/i.test(raw)) {
    return `#${raw.toUpperCase()}`;
  }

  return `#${prefix}-${computeDeterministicShortCode(raw)}`;
}

/**
 * Gera o código composto de vínculo Cliente + Entidade (ex: #CLI-8F2A·#TRP-4910).
 */
export function buildCompositeTraceHash(params: {
  customerId?: string | null;
  customerPhone?: string | null;
  entityType?: TraceableEntityType | null;
  entityIdOrCode?: string | null;
  pnrLocator?: string | null;
}): string {
  const parts: string[] = [];
  const custSeed = params.customerId || params.customerPhone;
  if (custSeed) {
    parts.push(buildEntityTraceHash("customer", custSeed));
  }
  if (params.entityType && params.entityType !== "general" && params.entityType !== "customer" && params.entityIdOrCode) {
    parts.push(buildEntityTraceHash(params.entityType, params.entityIdOrCode));
  }
  if (params.pnrLocator && params.pnrLocator.trim()) {
    parts.push(`#PNR-${params.pnrLocator.trim().toUpperCase()}`);
  }
  return parts.join(" · ") || "#WZY-SYNC";
}

export interface CustomerIdentityTagPillProps {
  name?: string | null;
  avatarUrl?: string | null;
  traceHash?: string | null;
  subtitle?: string | null;
  roleLabel?: string | null;
  size?: "sm" | "md";
  className?: string;
  onClick?: () => void;
}

/**
 * Pílula squircle minimalista que exibe a foto real do cliente/usuário (ou inicial de fallback) + Nome + Hash de rastreio.
 */
export function CustomerIdentityTagPill({
  name,
  avatarUrl,
  traceHash,
  subtitle,
  roleLabel,
  size = "sm",
  className,
  onClick,
}: CustomerIdentityTagPillProps) {
  const [imgFailed, setImgFailed] = React.useState(false);

  React.useEffect(() => {
    setImgFailed(false);
  }, [avatarUrl]);

  const displayName = String(name || "Cliente").trim();
  const initial = displayName.charAt(0).toUpperCase() || "C";
  const showImage = Boolean(avatarUrl && !imgFailed);

  const content = (
    <>
      <span
        className={cn(
          "rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center shrink-0 overflow-hidden border border-primary/20",
          size === "sm" ? "size-4 text-xs" : "size-5 text-xs"
        )}
      >
        {showImage ? (
          <img
            src={avatarUrl!}
            alt={displayName}
            className="size-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span>{initial}</span>
        )}
      </span>
      <span className="font-medium text-foreground truncate max-w-36">{displayName}</span>
      {traceHash && (
        <span className="font-mono text-xs text-primary font-semibold shrink-0">
          {traceHash}
        </span>
      )}
      {subtitle && (
        <span className="text-xs text-muted-foreground truncate max-w-28">
          · {subtitle}
        </span>
      )}
      {roleLabel && (
        <span className="px-2 py-1 rounded bg-muted text-muted-foreground text-xs font-medium shrink-0">
          {roleLabel}
        </span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={cn(
          "px-2 py-1 rounded-md border border-border/70 bg-muted/30 hover:bg-muted/60 text-xs inline-flex items-center gap-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          className
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      className={cn(
        "px-2 py-1 rounded-md border border-border/70 bg-muted/30 text-xs inline-flex items-center gap-1",
        className
      )}
    >
      {content}
    </span>
  );
}
